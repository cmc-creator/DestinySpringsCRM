export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Minimal RFC-4180 CSV parser (handles quoted fields with commas/newlines)
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

// Safely parse a date string — returns undefined if invalid
function safeDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// Convert "John Doe" → "J.D."
function toInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() + ".").join("") || name;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  let mappingRaw = "{}";
  try {
    const fd = await req.formData();
    file = fd.get("file") as File | null;
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

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  // Build column index map from user's mapping
  const col = (key: string): number => {
    const colName = mapping[key];
    if (!colName) return -1;
    return headers.findIndex((h) => h.toLowerCase() === colName.toLowerCase());
  };

  const get = (row: string[], key: string): string => {
    const i = col(key);
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };

  const importId = `ic-${Date.now()}`;
  let imported = 0, skipped = 0, errors = 0;
  const errorLog: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const lineNum = i + 2;

    const referringProvider  = get(row, "referringProvider");
    const referralDate       = get(row, "referralDate");
    const serviceRequested   = get(row, "serviceRequested");
    const diagnosis          = get(row, "diagnosis");
    const patientRaw         = get(row, "patientInitials");
    const authNumber         = get(row, "authNumber");
    const externalId         = get(row, "externalId");
    const referringNpi       = get(row, "referringNpi");

    if (!referringProvider) {
      errors++;
      errorLog.push(`Row ${lineNum}: missing Referring Provider — skipped`);
      continue;
    }

    const patientInitials = patientRaw ? toInitials(patientRaw) : "";

    // Dedup: if externalId is present, check if a lead with that referral ID already exists
    if (externalId) {
      const existing = await prisma.lead.findFirst({
        where: { notes: { contains: `ICANotes-ID:${externalId}` } },
        select: { id: true },
      });
      if (existing) { skipped++; continue; }
    }

    const notesParts: string[] = [`ICANotes import`];
    if (externalId)      notesParts.push(`ICANotes-ID:${externalId}`);
    if (referringNpi)    notesParts.push(`NPI:${referringNpi}`);
    if (authNumber)      notesParts.push(`Auth:${authNumber}`);
    if (diagnosis)       notesParts.push(`ICD-10:${diagnosis}`);
    if (patientInitials) notesParts.push(`Pt:${patientInitials}`);
    const notes = notesParts.join(" | ");

    const parsedDate = safeDate(referralDate);

    try {
      await prisma.lead.create({
        data: {
          hospitalName:    referringProvider,
          contactName:     referringProvider,
          source:          "REFERRAL",
          status:          "NEW",
          hospitalType:    "OUTPATIENT_PSYCHIATRY",
          serviceInterest: serviceRequested || undefined,
          notes,
          createdAt:       parsedDate,
        },
      });
      imported++;
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      errorLog.push(`Row ${lineNum} (${referringProvider}): ${msg}`);
    }
  }

  return NextResponse.json({
    importId,
    totalRows: dataRows.length,
    imported,
    skipped,
    errors,
    errorLog,
  });
}
