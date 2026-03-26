import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const maxDuration = 60;

// ─── column alias maps ─────────────────────────────────────────────────────────

function col(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

function parseSheet(data: Uint8Array): Record<string, unknown>[] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return (XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[]);
}

// ─── individual importers ──────────────────────────────────────────────────────

async function importAccounts(rows: Record<string, unknown>[]) {
  let created = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = col(row, "Account Name", "Name", "Organization", "Company", "Hospital Name", "Facility Name", "Account");
    if (!name) { skipped++; continue; }

    const type = col(row, "Account Type", "Type", "Facility Type");
    const city  = col(row, "Billing City", "City");
    const state = col(row, "Billing State", "State", "Billing State/Province");
    const zip   = col(row, "Billing Zip", "Zip", "Billing Postal Code", "Postal Code");
    const phone = col(row, "Phone", "Main Phone", "Billing Phone");
    const npi   = col(row, "NPI", "NPI Number");
    const beds  = col(row, "Bed Count", "Beds", "Number of Beds", "NumberOfEmployees");
    const notes = col(row, "Description", "Notes", "Comments");
    const contactName  = col(row, "Primary Contact", "Contact Name", "Main Contact");
    const contactTitle = col(row, "Contact Title", "Primary Contact Title");
    const contactEmail = col(row, "Contact Email", "Primary Email");
    const contactPhone = col(row, "Contact Phone", "Primary Phone");

    try {
      const existing = await prisma.hospital.findFirst({
        where: { hospitalName: { equals: name, mode: "insensitive" } },
      });
      if (existing) { skipped++; continue; }

      await prisma.hospital.create({
        data: {
          hospitalName: name,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          npi: npi || undefined,
          bedCount: beds ? parseInt(beds) || undefined : undefined,
          notes: notes || undefined,
          primaryContactName: contactName || undefined,
          primaryContactTitle: contactTitle || undefined,
          primaryContactEmail: contactEmail || undefined,
          primaryContactPhone: contactPhone || phone || undefined,
          hospitalType: mapFacilityType(type),
          status: "PROSPECT",
          // Each account needs a unique placeholder user
          user: {
            create: {
              email: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@noreply.import`,
              name: contactName || name,
              role: "ACCOUNT",
            },
          },
        },
      });
      created++;
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, skipped, errors };
}

async function importContacts(rows: Record<string, unknown>[]) {
  let created = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const first = col(row, "First Name", "First", "FirstName");
    const last  = col(row, "Last Name", "Last", "LastName");
    const name  = col(row, "Name", "Full Name", "Contact Name") || `${first} ${last}`.trim();
    if (!name || name === " ") { skipped++; continue; }

    const accountName = col(row, "Account Name", "Organization", "Company", "Hospital", "Facility");
    const title       = col(row, "Title", "Job Title", "Role");
    const email       = col(row, "Email", "Work Email");
    const phone       = col(row, "Phone", "Work Phone", "Mobile");
    const department  = col(row, "Department", "Dept");
    const notes       = col(row, "Description", "Notes");
    const typeStr     = col(row, "Contact Type", "Type", "Role");

    // Find matching hospital
    let hospitalId: string | undefined;
    if (accountName) {
      const hospital = await prisma.hospital.findFirst({
        where: { hospitalName: { contains: accountName, mode: "insensitive" } },
      });
      hospitalId = hospital?.id;
    }

    if (!hospitalId) { skipped++; continue; }

    try {
      await prisma.contact.create({
        data: {
          hospitalId,
          name,
          title: title || undefined,
          email: email || undefined,
          phone: phone || undefined,
          department: department || undefined,
          notes: notes || undefined,
          type: mapContactType(typeStr),
        },
      });
      created++;
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, skipped, errors };
}

async function importActivities(rows: Record<string, unknown>[]) {
  let created = 0, skipped = 0;
  const errors: string[] = [];

  const reps = await prisma.rep.findMany({ include: { user: true } });

  for (const row of rows) {
    const subject     = col(row, "Subject", "Activity", "Title", "Name", "Description");
    if (!subject) { skipped++; continue; }

    const typeStr     = col(row, "Type", "Activity Type", "Call Type");
    const dateStr     = col(row, "Date", "Due Date", "Completed Date", "ActivityDate", "Close Date");
    const accountName = col(row, "Account Name", "Organization", "Hospital", "Facility");
    const repName     = col(row, "Owner", "Assigned To", "Rep", "Rep Name", "Created By");
    const notes       = col(row, "Description", "Comments", "Notes", "Body");

    // Match hospital
    let hospitalId: string | undefined;
    if (accountName) {
      const hosp = await prisma.hospital.findFirst({
        where: { hospitalName: { contains: accountName, mode: "insensitive" } },
      });
      hospitalId = hosp?.id;
    }

    // Match rep by name
    let repId: string | undefined;
    if (repName) {
      const needle = repName.toLowerCase();
      const matched = reps.find((r) => r.user.name?.toLowerCase().includes(needle) || needle.includes(r.user.name?.toLowerCase() ?? "____"));
      repId = matched?.id;
    }

    let completedAt: Date | undefined;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) completedAt = d;
    }

    try {
      await prisma.activity.create({
        data: {
          type: mapActivityType(typeStr),
          title: subject.slice(0, 255),
          notes: notes || undefined,
          hospitalId: hospitalId ?? undefined,
          repId: repId ?? undefined,
          completedAt: completedAt ?? new Date(),
        },
      });
      created++;
    } catch (e) {
      errors.push(`${subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, skipped, errors };
}

// ─── enum mappers ──────────────────────────────────────────────────────────────

function mapFacilityType(s: string) {
  const v = s.toLowerCase();
  if (v.includes("emergency") || v.includes("ed ") || v.includes(" ed")) return "EMERGENCY_DEPARTMENT" as const;
  if (v.includes("inpatient") || v.includes("psychiatric")) return "INPATIENT_MEDICAL" as const;
  if (v.includes("primary care") || v.includes("pcp")) return "PRIMARY_CARE" as const;
  if (v.includes("outpatient") || v.includes("therapy")) return "OUTPATIENT_PSYCHIATRY" as const;
  if (v.includes("iop") || v.includes("php")) return "IOP_PHP" as const;
  if (v.includes("crisis")) return "CRISIS_STABILIZATION_UNIT" as const;
  if (v.includes("court") || v.includes("legal") || v.includes("probation")) return "COURT_LEGAL" as const;
  if (v.includes("community") || v.includes("fqhc")) return "COMMUNITY_MENTAL_HEALTH" as const;
  if (v.includes("school")) return "SCHOOL_COUNSELOR" as const;
  if (v.includes("peer")) return "PEER_SUPPORT" as const;
  if (v.includes("snf") || v.includes("skilled")) return "SNF_LTACH" as const;
  return "OTHER" as const;
}

function mapContactType(s: string) {
  const v = s.toLowerCase();
  if (v.includes("social worker")) return "SOCIAL_WORKER" as const;
  if (v.includes("case manager")) return "CASE_MANAGER" as const;
  if (v.includes("discharge")) return "DISCHARGE_PLANNER" as const;
  if (v.includes("ed physician") || v.includes("emergency physician")) return "ED_PHYSICIAN" as const;
  if (v.includes("primary care") || v.includes("pcp")) return "PRIMARY_CARE_PHYSICIAN" as const;
  if (v.includes("psychiatrist") || v.includes("psychiatry")) return "PSYCHIATRIST" as const;
  if (v.includes("therapist") || v.includes("counselor")) return "THERAPIST" as const;
  if (v.includes("crisis")) return "CRISIS_COUNSELOR" as const;
  if (v.includes("director")) return "DIRECTOR" as const;
  if (v.includes("coordinator")) return "COORDINATOR" as const;
  if (v.includes("cmo") || v.includes("chief medical")) return "CMO" as const;
  if (v.includes("cfo") || v.includes("chief financial")) return "CFO" as const;
  if (v.includes("ceo") || v.includes("chief executive")) return "CEO" as const;
  if (v.includes("coo") || v.includes("chief operating")) return "COO" as const;
  if (v.includes("vp")) return "VP_BUSINESS_DEVELOPMENT" as const;
  return "OTHER" as const;
}

function mapActivityType(s: string) {
  const v = s.toLowerCase();
  if (v.includes("call") || v.includes("phone")) return "CALL" as const;
  if (v.includes("email")) return "EMAIL" as const;
  if (v.includes("meeting") || v.includes("inservice") || v.includes("in-service")) return "MEETING" as const;
  if (v.includes("site") || v.includes("visit")) return "SITE_VISIT" as const;
  if (v.includes("proposal")) return "PROPOSAL_SENT" as const;
  if (v.includes("contract")) return "CONTRACT_SENT" as const;
  if (v.includes("referral")) return "REFERRAL_RECEIVED" as const;
  if (v.includes("follow")) return "FOLLOW_UP" as const;
  return "NOTE" as const;
}

// ─── route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const type     = (formData.get("type") as string ?? "").toLowerCase(); // accounts | contacts | activities

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!["accounts", "contacts", "activities"].includes(type)) {
      return NextResponse.json({ error: "type must be accounts, contacts, or activities" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data        = new Uint8Array(arrayBuffer);
    const rows        = parseSheet(data);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found in spreadsheet" }, { status: 400 });
    }

    let result;
    if (type === "accounts")    result = await importAccounts(rows);
    else if (type === "contacts") result = await importContacts(rows);
    else                         result = await importActivities(rows);

    return NextResponse.json({ ok: true, type, totalRows: rows.length, ...result });
  } catch (err) {
    console.error("[admin/import]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}
