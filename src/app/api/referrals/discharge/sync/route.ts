import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 90;

// ── SharePoint file configuration ────────────────────────────────────────────
const SP_HOST    = process.env.SHAREPOINT_DISCHARGE_HOST      ?? "destinyspringshpt.sharepoint.com";
const SP_SITE    = process.env.SHAREPOINT_DISCHARGE_SITE_PATH ?? "sites/Discharge";
const SP_FILE_ID = process.env.SHAREPOINT_DISCHARGE_FILE_ID   ?? "154A42D6-CC08-45B6-8AF5-EBCB1029E635";

// ── Column header → field mapping ─────────────────────────────────────────────
type DischargeRow = {
  patientInitials?: string;
  admissionDate?:  string;
  dischargeDate?:  string;
  sourceName?:     string;
  sourceNpi?:      string;
  serviceLine?:    string;
  externalId?:     string;
  notes?:          string;
  status?:         string;
};

const HEADER_MAP: Record<string, keyof DischargeRow> = {
  // Patient
  "patient":             "patientInitials",
  "patient initials":    "patientInitials",
  "patient name":        "patientInitials",
  "initials":            "patientInitials",
  "pt initials":         "patientInitials",
  "pt":                  "patientInitials",
  // Discharge date
  "discharge":           "dischargeDate",
  "discharge date":      "dischargeDate",
  "d/c date":            "dischargeDate",
  "dc date":             "dischargeDate",
  "date of discharge":   "dischargeDate",
  "dod":                 "dischargeDate",
  "discharged":          "dischargeDate",
  // Admission date
  "admit date":          "admissionDate",
  "admission date":      "admissionDate",
  "doa":                 "admissionDate",
  "date admitted":       "admissionDate",
  "date of admission":   "admissionDate",
  "admitted":            "admissionDate",
  // Source
  "facility":            "sourceName",
  "facility name":       "sourceName",
  "source":              "sourceName",
  "source name":         "sourceName",
  "referring facility":  "sourceName",
  "referral source":     "sourceName",
  "sending facility":    "sourceName",
  "npi":                 "sourceNpi",
  "facility npi":        "sourceNpi",
  // Service line
  "program":             "serviceLine",
  "service line":        "serviceLine",
  "level of care":       "serviceLine",
  "loc":                 "serviceLine",
  // IDs and misc
  "id":                  "externalId",
  "record id":           "externalId",
  "external id":         "externalId",
  "patient id":          "externalId",
  "mrn":                 "externalId",
  "notes":               "notes",
  "comments":            "notes",
  "status":              "status",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toIsoDay(input?: string): string {
  if (!input) return "";
  const str = String(input).trim();
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const d = new Date(Date.UTC(1899, 11, 30 + serial));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

async function resolveSource(row: DischargeRow): Promise<string | null> {
  if (row.sourceNpi) {
    const byNpi = await prisma.referralSource.findFirst({
      where: { npi: row.sourceNpi }, select: { id: true },
    });
    if (byNpi) return byNpi.id;
  }
  if (row.sourceName) {
    const byName = await prisma.referralSource.findFirst({
      where: { name: { equals: row.sourceName, mode: "insensitive" } }, select: { id: true },
    });
    if (byName) return byName.id;
  }
  if (!row.sourceName) return null;
  const created = await prisma.referralSource.create({
    data: {
      name:     row.sourceName,
      npi:      row.sourceNpi ?? null,
      type:     "OTHER",
      notes:    "Auto-created from Microsoft 365 discharge sync",
    },
    select: { id: true },
  });
  return created.id;
}

// ── Microsoft token ───────────────────────────────────────────────────────────
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

// ── Row mapping ───────────────────────────────────────────────────────────────
function buildFieldMap(headerRow: (string | number | boolean | null)[]): (keyof DischargeRow | null)[] {
  return headerRow.map((h) => HEADER_MAP[String(h ?? "").toLowerCase().trim()] ?? null);
}

function mapRow(
  fieldMap: (keyof DischargeRow | null)[],
  values:   (string | number | boolean | null)[],
): DischargeRow {
  const row: DischargeRow = {};
  fieldMap.forEach((field, i) => {
    if (!field) return;
    const val = values[i];
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      (row as Record<string, string>)[field] = String(val).trim();
    }
  });
  return row;
}

// ── POST /api/referrals/discharge/sync ────────────────────────────────────────
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let token: string | null;
  try { token = await getSharePointToken(); } catch { token = null; }

  if (!token) {
    return NextResponse.json(
      { error: "No Microsoft 365 connection found. Go to Admin → Integrations → Microsoft 365 and connect your account." },
      { status: 424 },
    );
  }

  // 1. Resolve site
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

  // 2. Get first worksheet
  let worksheetName: string;
  try {
    const sheetsData = await graphGet(
      token,
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${SP_FILE_ID}/workbook/worksheets`,
    );
    const sheets = sheetsData.value as Array<{ name: string }>;
    if (!sheets?.length) return NextResponse.json({ error: "No worksheets found" }, { status: 422 });
    worksheetName = sheets[0].name;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not open workbook: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  // 3. Read used range
  let values: (string | number | boolean | null)[][];
  try {
    const rangeData = await graphGet(
      token,
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${SP_FILE_ID}/workbook/worksheets/${encodeURIComponent(worksheetName)}/usedRange`,
    );
    values = (rangeData.values ?? []) as (string | number | boolean | null)[][];
  } catch (e) {
    return NextResponse.json(
      { error: `Could not read worksheet: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  if (values.length < 2) {
    return NextResponse.json({ worksheet: worksheetName, totalRows: 0, updated: 0, created: 0, skipped: 0, errors: 0 });
  }

  const fieldMap = buildFieldMap(values[0]);
  const dataRows = values.slice(1);

  let updated = 0;
  let created = 0;
  let skipped = 0;
  let errors  = 0;
  const errorLog: { row: number; error: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowValues = dataRows[i];
    if (rowValues.every((v) => v === null || String(v ?? "").trim() === "")) continue;

    const row = mapRow(fieldMap, rowValues);
    const dischargeDateStr = toIsoDay(row.dischargeDate);

    // At minimum we need a discharge date to do anything useful
    if (!dischargeDateStr) {
      skipped++;
      continue;
    }

    try {
      const dischargeDate = new Date(`${dischargeDateStr}T12:00:00.000Z`);

      // ── Try to find an existing referral to update ──
      let existingId: string | null = null;

      // Match by externalId first (most reliable)
      if (row.externalId) {
        const sourceId = await resolveSource(row);
        if (sourceId) {
          const match = await prisma.referral.findUnique({
            where: { referralSourceId_externalId: { referralSourceId: sourceId, externalId: row.externalId } },
            select: { id: true, dischargeDate: true },
          });
          if (match) existingId = match.id;
        }
      }

      // Match by initials + admission date if no externalId match
      if (!existingId && row.patientInitials) {
        const admitDay = toIsoDay(row.admissionDate);
        const whereClause: Record<string, unknown> = {
          patientInitials: row.patientInitials,
        };
        if (admitDay) {
          whereClause.admissionDate = {
            gte: new Date(`${admitDay}T00:00:00.000Z`),
            lt:  new Date(`${admitDay}T23:59:59.999Z`),
          };
        }
        const match = await prisma.referral.findFirst({
          where: whereClause as Parameters<typeof prisma.referral.findFirst>[0]["where"],
          select: { id: true, dischargeDate: true },
          orderBy: { createdAt: "desc" },
        });
        if (match) existingId = match.id;
      }

      if (existingId) {
        // Update discharge date on the existing record
        await prisma.referral.update({
          where: { id: existingId },
          data:  { dischargeDate, notes: row.notes ?? undefined },
        });
        updated++;
      } else {
        // No match — create a referral record from the discharge row
        const referralSourceId = await resolveSource(row);
        if (!referralSourceId) {
          skipped++;
          continue;
        }

        const admitDay = toIsoDay(row.admissionDate);
        // Dedupe: same source + initials + discharge day
        const dupe = await prisma.referral.findFirst({
          where: {
            referralSourceId,
            patientInitials: row.patientInitials ?? null,
            dischargeDate: {
              gte: new Date(`${dischargeDateStr}T00:00:00.000Z`),
              lt:  new Date(`${dischargeDateStr}T23:59:59.999Z`),
            },
          },
          select: { id: true },
        });
        if (dupe) { skipped++; continue; }

        await prisma.referral.create({
          data: {
            referralSourceId,
            patientInitials: row.patientInitials ?? null,
            admissionDate:   admitDay ? new Date(`${admitDay}T12:00:00.000Z`) : null,
            dischargeDate,
            serviceLine:     row.serviceLine ?? null,
            externalId:      row.externalId ?? null,
            status:          "ADMITTED" as never,
            notes:           row.notes ?? null,
          },
        });
        created++;
      }
    } catch (e) {
      errors++;
      errorLog.push({ row: i + 2, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  return NextResponse.json({
    worksheet: worksheetName,
    totalRows: dataRows.length,
    updated,
    created,
    skipped,
    errors,
    errorLog,
  });
}

export async function GET() {
  return NextResponse.json({
    service:  "m365-sharepoint-discharge-sync",
    site:     `https://${SP_HOST}/${SP_SITE}`,
    fileId:   SP_FILE_ID,
    fileUrl:  `https://${SP_HOST}/sites/Discharge/_layouts/15/Doc.aspx?sourcedoc={${SP_FILE_ID}}`,
    ok:       true,
  });
}
