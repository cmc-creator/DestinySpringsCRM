import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export const maxDuration = 120;

// ── Auth helpers ──────────────────────────────────────────────────────────────
function safeCompare(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}

function isCronRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  return safeCompare(authHeader, `Bearer ${cronSecret}`);
}

// ── SharePoint file configuration ────────────────────────────────────────────
const SP_HOST    = process.env.SHAREPOINT_BEDBOARD_HOST      ?? "destinyspringshpt.sharepoint.com";
const SP_SITE    = process.env.SHAREPOINT_BEDBOARD_SITE_PATH ?? "sites/Intake";
const SP_FILE_ID = process.env.SHAREPOINT_BEDBOARD_FILE_ID   ?? "0dec3106-c845-4eb7-b01c-c64a86da0796";

// ── Microsoft token with auto-refresh ────────────────────────────────────────
async function getSharePointToken(): Promise<string | null> {
  const record = await prisma.integrationToken.findFirst({
    where:   { provider: "microsoft" },
    orderBy: { updatedAt: "desc" },
    select:  { userId: true, accessToken: true, refreshToken: true, expiresAt: true },
  });
  if (!record) return null;

  const stillValid = record.expiresAt && record.expiresAt.getTime() - Date.now() > 5 * 60 * 1000;
  if (stillValid) return record.accessToken;
  if (!record.refreshToken) return null;

  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    refresh_token: record.refreshToken,
    grant_type:    "refresh_token",
    scope: [
      "https://graph.microsoft.com/Files.Read",
      "https://graph.microsoft.com/Sites.Read.All",
      "offline_access",
    ].join(" "),
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; expires_in: number };
  await prisma.integrationToken.update({
    where: { userId_provider: { userId: record.userId, provider: "microsoft" } },
    data:  { accessToken: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) },
  });
  return data.access_token;
}

async function graphGet(token: string, url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

// ── Gemini AI bedboard parser ─────────────────────────────────────────────────
type BedCounts = {
  total:     number;
  available: number;
};

type ParsedBedboard = {
  adult?:        BedCounts;
  adolescent?:   BedCounts;
  geriatric?:    BedCounts;
  dualDiagnosis?: BedCounts;
};

async function parseBedboardWithAI(
  sheetData: (string | number | boolean | null)[][],
): Promise<ParsedBedboard | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Build a compact text representation of the spreadsheet (cap at 100 rows to stay within token limits)
  const maxRows = Math.min(sheetData.length, 100);
  const rows = sheetData.slice(0, maxRows);
  const tableText = rows
    .map((row) => row.map((c) => (c === null || c === undefined ? "" : String(c))).join("\t"))
    .join("\n");

  const prompt = `You are analyzing a hospital inpatient psychiatric bed board spreadsheet. The data below is from an Excel file used by a psychiatric facility (Destiny Springs Healthcare) to track their bed availability across 4 units.

The spreadsheet may use different column names, layouts, or formats. Your job is to extract the **total beds** and **available (open) beds** for each unit. The 4 units are:
- Adult Inpatient Psychiatry (may appear as "Adult", "Adult Psych", "Adult Unit", etc.)
- Adolescent Psychiatry (may appear as "Adolescent", "Adolescent Psych", "Teen", "Youth", etc.)
- Geriatric Psychiatry (may appear as "Geriatric", "Geri", "Older Adult", "GER", etc.)
- Dual Diagnosis / Co-occurring (may appear as "Dual Dx", "Dual Diagnosis", "DD", "Co-occurring", "Substance", etc.)

The spreadsheet might show:
- A summary row listing beds per unit (Total, Available, Occupied)
- A census count where you need to count available vs occupied beds
- Column headers like "Unit", "Total Beds", "Available", "Open", "Census", "Occupied", "Beds Available"

SPREADSHEET DATA:
${tableText}

Respond ONLY with valid JSON in exactly this format (no explanation, no markdown, no code block):
{"adult":{"total":0,"available":0},"adolescent":{"total":0,"available":0},"geriatric":{"total":0,"available":0},"dualDiagnosis":{"total":0,"available":0}}

If a unit is not found in the data, use 0 for both total and available. Never guess — only extract values that are clearly present in the data.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0 },
      }),
    },
  );

  if (!res.ok) return null;

  const data = await res.json() as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = raw.trim().replace(/^```(?:json)?|```$/g, "").trim();

  try {
    return JSON.parse(cleaned) as ParsedBedboard;
  } catch {
    return null;
  }
}

// ── POST /api/integrations/sharepoint/bedboard-sync ──────────────────────────
export async function POST(req: NextRequest) {
  const cron = isCronRequest(req);
  const session = await auth();
  if (!cron && (!session || session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const actorRaw = session?.user ?? await prisma.user.findFirst({
    where:  { role: "ADMIN" },
    select: { id: true, email: true, name: true },
  });
  if (!actorRaw) {
    return NextResponse.json({ error: "No admin user available" }, { status: 500 });
  }
  const actor = actorRaw as { id: string; email?: string | null; name?: string | null };

  // 1. Get Microsoft token
  let token: string | null;
  try { token = await getSharePointToken(); } catch { token = null; }

  if (!token) {
    return NextResponse.json(
      { error: "No Microsoft 365 connection found. Go to Admin → Communications → Connect Microsoft to authorize." },
      { status: 424 },
    );
  }

  // 2. Resolve SharePoint site
  let siteId: string;
  try {
    const siteData = await graphGet(token, `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:/${SP_SITE}`);
    siteId = siteData.id as string;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach SharePoint site: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  // 3. List worksheets; use the first one
  let worksheetName: string;
  try {
    const sheetsData = await graphGet(
      token,
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${SP_FILE_ID}/workbook/worksheets`,
    );
    const sheets = sheetsData.value as Array<{ id: string; name: string }>;
    if (!sheets || sheets.length === 0) {
      return NextResponse.json({ error: "No worksheets found in workbook" }, { status: 422 });
    }
    worksheetName = sheets[0].name;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not open workbook: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  // 4. Read the used range
  let values: (string | number | boolean | null)[][];
  try {
    const rangeData = await graphGet(
      token,
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${SP_FILE_ID}/workbook/worksheets/${encodeURIComponent(worksheetName)}/usedRange`,
    );
    values = (rangeData.values ?? []) as (string | number | boolean | null)[][];
  } catch (e) {
    return NextResponse.json(
      { error: `Could not read worksheet data: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  if (values.length < 2) {
    return NextResponse.json({ message: "Spreadsheet has no data rows", updated: false });
  }

  // 5. Use Gemini to parse bed counts
  const parsed = await parseBedboardWithAI(values);
  if (!parsed) {
    return NextResponse.json(
      { error: "AI parsing failed — check GEMINI_API_KEY or spreadsheet format" },
      { status: 422 },
    );
  }

  // 6. Upsert CensusSnapshot for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const snapshot = await prisma.censusSnapshot.upsert({
    where: { date: today },
    create: {
      date:               today,
      adultTotal:         parsed.adult?.total         ?? 0,
      adultAvailable:     parsed.adult?.available     ?? 0,
      adolescentTotal:    parsed.adolescent?.total    ?? 0,
      adolescentAvailable: parsed.adolescent?.available ?? 0,
      geriatricTotal:     parsed.geriatric?.total     ?? 0,
      geriatricAvailable: parsed.geriatric?.available ?? 0,
      dualDxTotal:        parsed.dualDiagnosis?.total    ?? 0,
      dualDxAvailable:    parsed.dualDiagnosis?.available ?? 0,
      note:               `Auto-synced from SharePoint bedboard via AI (${new Date().toLocaleTimeString()})`,
    },
    update: {
      adultTotal:         parsed.adult?.total         ?? 0,
      adultAvailable:     parsed.adult?.available     ?? 0,
      adolescentTotal:    parsed.adolescent?.total    ?? 0,
      adolescentAvailable: parsed.adolescent?.available ?? 0,
      geriatricTotal:     parsed.geriatric?.total     ?? 0,
      geriatricAvailable: parsed.geriatric?.available ?? 0,
      dualDxTotal:        parsed.dualDiagnosis?.total    ?? 0,
      dualDxAvailable:    parsed.dualDiagnosis?.available ?? 0,
      note:               `Auto-synced from SharePoint bedboard via AI (${new Date().toLocaleTimeString()})`,
    },
  });

  // 7. Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId:    actor.id,
        userEmail: actor.email ?? null,
        userName:  actor.name  ?? null,
        action:    "SYNC",
        resource:  "CensusSnapshot",
        diff: {
          syncType:  "BEDBOARD_AI",
          status:    "SUCCESS",
          snapshotId: snapshot.id,
          parsed,
          worksheet: worksheetName,
          rows:      values.length,
        },
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    updated:   true,
    date:      today.toISOString().slice(0, 10),
    worksheet: worksheetName,
    parsed,
    snapshotId: snapshot.id,
  });
}
