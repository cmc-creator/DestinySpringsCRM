export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── RFC-4180 CSV parser ──────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field.trim()); field = ""; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim()); rows.push(row);
        row = []; field = "";
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

function safeDate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function safeInt(s: string): number | undefined {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? undefined : n;
}

function safeDecimal(s: string): number | undefined {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? undefined : n;
}

// Map user-supplied stage string → valid OpportunityStage enum value
const STAGE_MAP: Record<string, string> = {
  discovery: "DISCOVERY", qualification: "QUALIFICATION", demo: "DEMO",
  proposal: "PROPOSAL", negotiation: "NEGOTIATION",
  "closed won": "CLOSED_WON", won: "CLOSED_WON", closed_won: "CLOSED_WON",
  "closed lost": "CLOSED_LOST", lost: "CLOSED_LOST", closed_lost: "CLOSED_LOST",
  "on hold": "ON_HOLD", on_hold: "ON_HOLD",
};

const LEAD_STATUS_MAP: Record<string, string> = {
  new: "NEW", contacted: "CONTACTED", qualified: "QUALIFIED",
  "proposal sent": "PROPOSAL_SENT", negotiating: "NEGOTIATING",
  won: "WON", lost: "LOST", unqualified: "UNQUALIFIED",
};

const LEAD_SOURCE_MAP: Record<string, string> = {
  referral: "REFERRAL", "cold outreach": "COLD_OUTREACH", "cold call": "COLD_OUTREACH",
  conference: "CONFERENCE", inbound: "INBOUND", linkedin: "LINKEDIN",
  webinar: "WEBINAR", "existing relationship": "EXISTING_RELATIONSHIP", other: "OTHER",
};

const CONTACT_TYPE_MAP: Record<string, string> = {
  cmo: "CMO", cfo: "CFO", cno: "CNO", ceo: "CEO", coo: "COO",
  "department head": "DEPARTMENT_HEAD", "physician champion": "PHYSICIAN_CHAMPION",
  "vp business development": "VP_BUSINESS_DEVELOPMENT", director: "DIRECTOR",
  coordinator: "COORDINATOR", other: "OTHER",
};

const HOSPITAL_TYPE_MAP: Record<string, string> = {
  "acute care": "ACUTE_CARE", "critical access": "CRITICAL_ACCESS",
  specialty: "SPECIALTY", "health system": "HEALTH_SYSTEM",
  ambulatory: "AMBULATORY", outpatient: "OUTPATIENT",
  "long term care": "LONG_TERM_CARE", "behavioral health": "BEHAVIORAL_HEALTH",
  rehabilitation: "REHABILITATION", "children's": "CHILDRENS",
  "cancer center": "CANCER_CENTER", "urgent care": "URGENT_CARE",
  pcp: "PCP", "private practice": "PRIVATE_PRACTICE", other: "OTHER",
};

function mapEnum(value: string, map: Record<string, string>, fallback: string): string {
  return map[value.toLowerCase()] ?? fallback;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  let mode = "", mappingRaw = "{}";
  try {
    const fd = await req.formData();
    file       = fd.get("file") as File | null;
    mode       = (fd.get("mode") as string) ?? "";
    mappingRaw = (fd.get("mapping") as string) ?? "{}";
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  let mapping: Record<string, string>;
  try { mapping = JSON.parse(mappingRaw); }
  catch { return NextResponse.json({ error: "Invalid mapping JSON" }, { status: 400 }); }

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: "CSV appears empty" }, { status: 400 });

  const headers  = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const col = (key: string): number => {
    const colName = mapping[key];
    if (!colName) return -1;
    return headers.findIndex((h) => h.toLowerCase() === colName.toLowerCase());
  };

  const get = (row: string[], key: string): string => {
    const i = col(key);
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };

  const importId = `mig-${Date.now()}`;
  let imported = 0, updated = 0, skipped = 0, errors = 0;
  const errorLog: string[] = [];

  // ════════════════════════════════════════════════════════════════════════════
  // MODE: ACCOUNTS (→ Hospital)
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === "accounts") {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = i + 2;
      const hospitalName = get(row, "hospitalName");
      if (!hospitalName) { skipped++; continue; }

      const data = {
        systemName:           get(row, "systemName")          || undefined,
        city:                 get(row, "city")                || undefined,
        state:                get(row, "state")               || undefined,
        address:              get(row, "address")             || undefined,
        zip:                  get(row, "zip")                 || undefined,
        npi:                  get(row, "npi")                 || undefined,
        bedCount:             safeInt(get(row, "bedCount")),
        primaryContactName:   get(row, "primaryContactName")  || undefined,
        primaryContactEmail:  get(row, "primaryContactEmail") || undefined,
        primaryContactPhone:  get(row, "primaryContactPhone") || undefined,
        primaryContactTitle:  get(row, "primaryContactTitle") || undefined,
        notes:                get(row, "notes")               || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hospitalType:         mapEnum(get(row, "hospitalType"), HOSPITAL_TYPE_MAP, "OTHER") as any,
        status:               "PROSPECT" as const,
      };

      try {
        const existing = await prisma.hospital.findFirst({
          where: { hospitalName: { equals: hospitalName, mode: "insensitive" } },
          select: { id: true },
        });

        if (existing) {
          await prisma.hospital.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          // Need a User row — use contact email or generate placeholder
          const email = data.primaryContactEmail || `migrate-${Date.now()}-${i}@import.nyx`;
          let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
          if (!user) {
            user = await prisma.user.create({
              data: { email, name: hospitalName, role: "ACCOUNT" },
            });
          }
          const existingByUser = await prisma.hospital.findUnique({ where: { userId: user.id }, select: { id: true } });
          if (existingByUser) { skipped++; continue; }
          await prisma.hospital.create({ data: { userId: user.id, hospitalName, ...data } });
          imported++;
        }
      } catch (err) {
        errors++;
        errorLog.push(`Row ${lineNum} (${hospitalName}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE: LEADS
  // ════════════════════════════════════════════════════════════════════════════
  } else if (mode === "leads") {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = i + 2;
      const hospitalName = get(row, "hospitalName");
      if (!hospitalName) { skipped++; continue; }

      const contactEmail = get(row, "contactEmail") || undefined;
      const contactName  = get(row, "contactName")  || undefined;

      // Dedup by hospitalName + contactEmail
      const existing = await prisma.lead.findFirst({
        where: {
          hospitalName: { equals: hospitalName, mode: "insensitive" },
          ...(contactEmail ? { contactEmail: { equals: contactEmail, mode: "insensitive" } } : {}),
        },
        select: { id: true },
      });
      if (existing) { skipped++; continue; }

      const sourceRaw = get(row, "source");
      const statusRaw = get(row, "status");
      const valRaw    = get(row, "estimatedValue");

      try {
        await prisma.lead.create({
          data: {
            hospitalName,
            contactName,
            contactEmail,
            contactPhone:    get(row, "contactPhone")    || undefined,
            contactTitle:    get(row, "contactTitle")    || undefined,
            state:           get(row, "state")           || undefined,
            city:            get(row, "city")            || undefined,
            serviceInterest: get(row, "serviceInterest") || undefined,
            estimatedValue:  safeDecimal(valRaw) ?? undefined,
            notes:           get(row, "notes")           || undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            source:          mapEnum(sourceRaw, LEAD_SOURCE_MAP, "OTHER") as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status:          mapEnum(statusRaw, LEAD_STATUS_MAP, "NEW") as any,
          },
        });
        imported++;
      } catch (err) {
        errors++;
        errorLog.push(`Row ${lineNum} (${hospitalName}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE: OPPORTUNITIES
  // ════════════════════════════════════════════════════════════════════════════
  } else if (mode === "opportunities") {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = i + 2;
      const title        = get(row, "title");
      const hospitalName = get(row, "hospitalName");
      if (!title || !hospitalName) { skipped++; continue; }

      const hospital = await prisma.hospital.findFirst({
        where: { hospitalName: { equals: hospitalName, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hospital) {
        errors++;
        errorLog.push(`Row ${lineNum} "${title}": no matching hospital for "${hospitalName}" — import Hospital Accounts first`);
        continue;
      }

      // Dedup
      const existing = await prisma.opportunity.findFirst({
        where: { title: { equals: title, mode: "insensitive" }, hospitalId: hospital.id },
        select: { id: true },
      });
      if (existing) { skipped++; continue; }

      const stageRaw = get(row, "stage");
      const valRaw   = get(row, "value");

      try {
        await prisma.opportunity.create({
          data: {
            title,
            hospitalId:  hospital.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stage:       mapEnum(stageRaw, STAGE_MAP, "DISCOVERY") as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            serviceLine: "OTHER" as any,
            value:       safeDecimal(valRaw) ?? undefined,
            closeDate:   safeDate(get(row, "closeDate")),
            notes:       get(row, "notes") || undefined,
          },
        });
        imported++;
      } catch (err) {
        errors++;
        errorLog.push(`Row ${lineNum} "${title}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE: CONTACTS
  // ════════════════════════════════════════════════════════════════════════════
  } else if (mode === "contacts") {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = i + 2;
      const hospitalName = get(row, "hospitalName");
      const name         = get(row, "name");
      if (!hospitalName || !name) { skipped++; continue; }

      const hospital = await prisma.hospital.findFirst({
        where: { hospitalName: { equals: hospitalName, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hospital) {
        errors++;
        errorLog.push(`Row ${lineNum} "${name}": no matching hospital for "${hospitalName}" — import Hospital Accounts first`);
        continue;
      }

      const email = get(row, "email") || undefined;

      // Dedup by name + hospitalId
      const existing = await prisma.contact.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, hospitalId: hospital.id },
        select: { id: true },
      });
      if (existing) { skipped++; continue; }

      const typeRaw = get(row, "type");

      try {
        await prisma.contact.create({
          data: {
            hospitalId:  hospital.id,
            name,
            title:       get(row, "title")      || undefined,
            email,
            phone:       get(row, "phone")      || undefined,
            department:  get(row, "department") || undefined,
            notes:       get(row, "notes")      || undefined,
            type:        mapEnum(typeRaw, CONTACT_TYPE_MAP, "OTHER") as Parameters<typeof prisma.contact.create>[0]["data"]["type"],
          },
        });
        imported++;
      } catch (err) {
        errors++;
        errorLog.push(`Row ${lineNum} "${name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

  } else {
    return NextResponse.json({ error: `Unknown mode "${mode}"` }, { status: 400 });
  }

  return NextResponse.json({ importId, totalRows: dataRows.length, imported, updated, skipped, errors, errorLog });
}
