export const maxDuration = 60; // allow time for large CSV files

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Simple RFC-4180-compliant CSV parser
// ---------------------------------------------------------------------------
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// POST /api/integrations/medworxs/csv
//
// Body: multipart/form-data
//   file     – CSV file
//   mapping  – JSON string describing column indices or header names:
//     {
//       "referringProvider" : "Referring Physician",   // column header
//       "referringNpi"      : "Referring NPI",
//       "admissionDate"     : "Admit Date",
//       "dischargeDate"     : "Discharge Date",
//       "serviceLine"       : "Department",
//       "patientInitials"   : "Patient",
//       "externalId"        : "Encounter #"
//     }
//   If a mapping key is omitted the field is skipped.
// ---------------------------------------------------------------------------

type ColMapping = {
  referringProvider?: string;
  referringNpi?:      string;
  admissionDate?:     string;
  dischargeDate?:     string;
  serviceLine?:       string;
  patientInitials?:   string;
  externalId?:        string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const mappingRaw = formData.get("mapping") as string | null;
  let mapping: ColMapping = {
    referringProvider : "Referring Physician",
    referringNpi      : "Referring NPI",
    admissionDate     : "Admit Date",
    dischargeDate     : "Discharge Date",
    serviceLine       : "Department",
    patientInitials   : "Patient",
    externalId        : "Encounter #",
  };
  if (mappingRaw) {
    try { mapping = { ...mapping, ...JSON.parse(mappingRaw) }; } catch { /* use defaults */ }
  }

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
  }

  // Build header → index map
  const headers = rows[0].map((h) => h.trim());
  const idx = (key: string | undefined) =>
    key !== undefined ? headers.findIndex((h) => h.toLowerCase() === key.toLowerCase()) : -1;

  const colIdx = {
    referringProvider : idx(mapping.referringProvider),
    referringNpi      : idx(mapping.referringNpi),
    admissionDate     : idx(mapping.admissionDate),
    dischargeDate     : idx(mapping.dischargeDate),
    serviceLine       : idx(mapping.serviceLine),
    patientInitials   : idx(mapping.patientInitials),
    externalId        : idx(mapping.externalId),
  };

  if (colIdx.referringProvider === -1) {
    return NextResponse.json({
      error: `Column "${mapping.referringProvider ?? "Referring Physician"}" not found in CSV headers.`,
      availableHeaders: headers,
    }, { status: 422 });
  }

  // Ensure IntegrationConfig exists
  const integration = await prisma.integrationConfig.upsert({
    where: { name_method: { name: "medworxs", method: "CSV" } },
    create: { name: "medworxs", method: "CSV", enabled: true },
    update: { enabled: true },
  });

  const importLog = await prisma.medworxsImport.create({
    data: {
      integrationId: integration.id,
      method: "CSV",
      filename: file.name,
      totalRows: rows.length - 1, // exclude header
      importedBy: session.user.id,
    },
  });

  const dataRows = rows.slice(1);
  const errors: string[] = [];
  let imported = 0;
  let skipped  = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // 1-based + skip header

    const get = (colI: number) =>
      colI >= 0 && row[colI] ? row[colI].trim() : undefined;

    const providerName = get(colIdx.referringProvider);
    if (!providerName) {
      errors.push(`Row ${rowNum}: missing referring provider name - skipped`);
      skipped++;
      continue;
    }

    const npi         = get(colIdx.referringNpi);
    const externalId  = get(colIdx.externalId);
    const admitRaw    = get(colIdx.admissionDate);
    const dischargeRaw= get(colIdx.dischargeDate);
    const serviceLine = get(colIdx.serviceLine);
    const patientInit = get(colIdx.patientInitials);

    let admissionDate: Date | undefined;
    let dischargeDate: Date | undefined;
    try { if (admitRaw) admissionDate = new Date(admitRaw); } catch { errors.push(`Row ${rowNum}: invalid admission date "${admitRaw}"`); }
    try { if (dischargeRaw) dischargeDate = new Date(dischargeRaw); } catch { errors.push(`Row ${rowNum}: invalid discharge date "${dischargeRaw}"`); }

    try {
      // Find or create referral source by name (+ NPI if available)
      let source = await prisma.referralSource.findFirst({
        where: npi
          ? { OR: [{ npi }, { name: { equals: providerName, mode: "insensitive" } }] }
          : { name: { equals: providerName, mode: "insensitive" } },
      });

      if (!source) {
        source = await prisma.referralSource.create({
          data: {
            name: providerName,
            npi,
            type: "PHYSICIAN",
          },
        });
      }

      // Check for duplicate by externalId
      if (externalId) {
        const dup = await prisma.referral.findUnique({
          where: { referralSourceId_externalId: { referralSourceId: source.id, externalId } },
        });
        if (dup) { skipped++; continue; }
      }

      await prisma.referral.create({
        data: {
          referralSourceId: source.id,
          patientInitials: patientInit,
          admissionDate,
          dischargeDate,
          serviceLine,
          externalId,
          importId: importLog.id,
          status: "RECEIVED",
        },
      });
      imported++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${(err as Error).message}`);
    }
  }

  // Update import log with final counts
  await prisma.medworxsImport.update({
    where: { id: importLog.id },
    data: {
      imported,
      skipped,
      errors: errors.length,
      errorLog: errors.length > 0 ? errors : undefined,
    },
  });

  return NextResponse.json({
    importId: importLog.id,
    totalRows: dataRows.length,
    imported,
    skipped,
    errors: errors.length,
    errorLog: errors,
  });
}
