import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 90;

// ── SharePoint file configuration ────────────────────────────────────────────
// These default to the Destiny Springs intake workbook.
// Override via environment variables if the file ever moves.
const SP_HOST    = process.env.SHAREPOINT_INTAKE_HOST      ?? "destinyspringshpt.sharepoint.com";
const SP_SITE    = process.env.SHAREPOINT_INTAKE_SITE_PATH ?? "sites/Intake";
const SP_FILE_ID = process.env.SHAREPOINT_INTAKE_FILE_ID   ?? "0dec3106-c845-4eb7-b01c-c64a86da0796";

// ── Column header → M365Row field mapping ─────────────────────────────────────
type M365Row = {
  sourceNpi?: string;
  sourceName?: string;
  sourceType?: string;
  patientInitials?: string;
  admissionDate?: string;
  dischargeDate?: string;
  serviceLine?: string;
  externalId?: string;
  status?: string;
  notes?: string;
};

const HEADER_MAP: Record<string, keyof M365Row> = {
  "patient":           "patientInitials",
  "patient initials":  "patientInitials",
  "patient name":      "patientInitials",
  "initials":          "patientInitials",
  "pt initials":       "patientInitials",
  "facility":          "sourceName",
  "facility name":     "sourceName",
  "source":            "sourceName",
  "source name":       "sourceName",
  "referring facility":"sourceName",
  "referral source":   "sourceName",
  "npi":               "sourceNpi",
  "facility npi":      "sourceNpi",
  "source npi":        "sourceNpi",
  "admit date":        "admissionDate",
  "admission date":    "admissionDate",
  "doa":               "admissionDate",
  "date admitted":     "admissionDate",
  "date":              "admissionDate",
  "discharge":         "dischargeDate",
  "discharge date":    "dischargeDate",
  "d/c date":          "dischargeDate",
  "dc date":           "dischargeDate",
  "program":           "serviceLine",
  "service line":      "serviceLine",
  "level of care":     "serviceLine",
  "loc":               "serviceLine",
  "status":            "status",
  "admission status":  "status",
  "notes":             "notes",
  "comments":          "notes",
  "id":                "externalId",
  "record id":         "externalId",
  "external id":       "externalId",
  "patient id":        "externalId",
  "row id":            "externalId",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ALLOWED_STATUS = new Set(["RECEIVED", "ADMITTED", "DECLINED", "PENDING", "DUPLICATE"]);

function toStatus(input?: string) {
  const s = (input ?? "RECEIVED").toUpperCase().trim();
  return ALLOWED_STATUS.has(s) ? s : "RECEIVED";
}

function toIsoDay(input?: string): string {
  if (!input) return "";
  const str = String(input).trim();
  // Handle Excel serial date numbers (integer days since 1900-01-00)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const d = new Date(Date.UTC(1899, 11, 30 + serial));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

async function resolveOrCreateSource(row: M365Row): Promise<string | null> {
  if (row.sourceNpi) {
    const byNpi = await prisma.referralSource.findFirst({
      where: { npi: row.sourceNpi },
      select: { id: true },
    });
    if (byNpi) return byNpi.id;
  }

  if (row.sourceName) {
    const byName = await prisma.referralSource.findFirst({
      where: { name: { equals: row.sourceName, mode: "insensitive" } },
      select: { id: true },
    });
    if (byName) return byName.id;
  }

  if (!row.sourceName) return null;

  const created = await prisma.referralSource.create({
    data: {
      name: row.sourceName,
      npi: row.sourceNpi ?? null,
      type: "OTHER",
      specialty: row.sourceType ?? null,
      notes: "Auto-created from Microsoft 365 admissions referrals sync",
    },
    select: { id: true },
  });
  return created.id;
}

// ── Microsoft token ───────────────────────────────────────────────────────────
async function getSharePointToken(): Promise<string | null> {
  // Use the most recently updated Microsoft token in the system
  const record = await prisma.integrationToken.findFirst({
    where: { provider: "microsoft" },
    orderBy: { updatedAt: "desc" },
    select: { userId: true, accessToken: true, refreshToken: true, expiresAt: true },
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
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
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
function buildFieldMap(headerRow: (string | number | boolean | null)[]): (keyof M365Row | null)[] {
  return headerRow.map((h) => {
    const normalized = String(h ?? "").toLowerCase().trim();
    return HEADER_MAP[normalized] ?? null;
  });
}

function mapRow(
  fieldMap: (keyof M365Row | null)[],
  values: (string | number | boolean | null)[],
): M365Row {
  const row: M365Row = {};
  fieldMap.forEach((field, i) => {
    if (!field) return;
    const val = values[i];
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      (row as Record<string, string>)[field] = String(val).trim();
    }
  });
  return row;
}

// ── POST /api/referrals/intake/m365/sync ──────────────────────────────────────
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Get a valid Microsoft access token
  let token: string | null;
  try {
    token = await getSharePointToken();
  } catch {
    token = null;
  }

  if (!token) {
    return NextResponse.json(
      {
        error:
          "No Microsoft 365 connection found. Go to Admin → Communications → Connect Microsoft to authorize.",
      },
      { status: 424 },
    );
  }

  // 1. Resolve the SharePoint site ID
  let siteId: string;
  try {
    const siteData = await graphGet(
      token,
      `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:/${SP_SITE}`,
    );
    siteId = siteData.id as string;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach SharePoint site: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  // 2. List worksheets; use the first one
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
      {
        error: `Could not open workbook. If the file is open in Excel, close it and try again. Detail: ${e instanceof Error ? e.message : e}`,
      },
      { status: 502 },
    );
  }

  // 3. Read the used range
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
    return NextResponse.json({
      worksheet: worksheetName,
      totalRows: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      message: "Spreadsheet has no data rows",
    });
  }

  const fieldMap = buildFieldMap(values[0]);
  const dataRows = values.slice(1);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorLog: { row: number; error: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowValues = dataRows[i];

    // Skip blank rows
    if (rowValues.every((v) => v === null || String(v ?? "").trim() === "")) {
      continue;
    }

    const row = mapRow(fieldMap, rowValues);

    try {
      const referralSourceId = await resolveOrCreateSource(row);
      if (!referralSourceId) {
        errors++;
        errorLog.push({ row: i + 2, error: "No source name or NPI — cannot map to a Referral Source" });
        continue;
      }

      // Primary dedupe: source + externalId
      if (row.externalId) {
        const existing = await prisma.referral.findUnique({
          where: { referralSourceId_externalId: { referralSourceId, externalId: row.externalId } },
          select: { id: true },
        });
        if (existing) { skipped++; continue; }
      } else {
        // Fallback dedupe: source + initials + same calendar day
        const day = toIsoDay(row.admissionDate);
        const existingNoExt = await prisma.referral.findFirst({
          where: {
            referralSourceId,
            patientInitials: row.patientInitials ?? null,
            ...(day
              ? {
                  admissionDate: {
                    gte: new Date(`${day}T00:00:00.000Z`),
                    lt:  new Date(`${day}T23:59:59.999Z`),
                  },
                }
              : {}),
          },
          select: { id: true },
        });
        if (existingNoExt) { skipped++; continue; }
      }

      await prisma.referral.create({
        data: {
          referralSourceId,
          patientInitials: row.patientInitials ?? null,
          admissionDate:   row.admissionDate ? new Date(row.admissionDate) : null,
          dischargeDate:   row.dischargeDate ? new Date(row.dischargeDate) : null,
          serviceLine:     row.serviceLine ?? null,
          externalId:      row.externalId ?? null,
          status:          toStatus(row.status) as never,
          notes:           row.notes ?? null,
        },
      });

      imported++;
    } catch (e) {
      errors++;
      errorLog.push({ row: i + 2, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  return NextResponse.json({
    worksheet: worksheetName,
    totalRows: dataRows.length,
    imported,
    skipped,
    errors,
    errorLog,
  });
}

// GET returns config info (for admin page to confirm which file is targeted)
export async function GET() {
  return NextResponse.json({
    service:   "m365-bedboard-sharepoint-sync",
    site:      `https://${SP_HOST}/${SP_SITE}`,
    fileId:    SP_FILE_ID,
    fileUrl:   `https://${SP_HOST}/sites/Intake/_layouts/15/Doc2.aspx?action=edit&sourcedoc={${SP_FILE_ID}}`,
    ok:        true,
  });
}
