export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simple RFC-4180 CSV parser (same pattern as MedWorxs)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim()); current = "";
      } else { current += ch; }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

function col(row: string[], headers: string[], name: string): string {
  const idx = headers.findIndex((h) => h.toLowerCase() === name?.toLowerCase() || h === name);
  return idx >= 0 ? (row[idx] ?? "").trim() : "";
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[$,\s]/g, "")) || 0;
}

// POST /api/integrations/paycom
// mode: "reps" | "payments"
// mapping: JSON string of column names
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const mode = (formData.get("mode") as string) || "reps";
  const mappingRaw = formData.get("mapping") as string | null;
  const mapping: Record<string, string> = mappingRaw ? JSON.parse(mappingRaw) : {};

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  let imported = 0, updated = 0, skipped = 0, errors = 0;
  const errorLog: string[] = [];
  const importId = `paycom-${mode}-${Date.now()}`;

  // ── REP ROSTER MODE ──────────────────────────────────────────────────────
  if (mode === "reps") {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const name  = col(row, headers, mapping.employeeName  || "Employee Name");
      const email = col(row, headers, mapping.email         || "Work Email");
      const phone = col(row, headers, mapping.phone         || "Work Phone");
      const title = col(row, headers, mapping.title         || "Job Title");

      if (!name && !email) { skipped++; continue; }

      try {
        // Find an existing rep by email (linked via User)
        const existingUser = email
          ? await prisma.user.findUnique({ where: { email }, include: { rep: true } })
          : null;

        if (existingUser?.rep) {
          await prisma.rep.update({
            where: { id: existingUser.rep.id },
            data: {
              ...(phone ? { phone } : {}),
              ...(title ? { title } : {}),
            },
          });
          updated++;
        } else {
          // No matching rep found — log as informational skip
          skipped++;
          errorLog.push(`Row ${i + 2}: Rep not found for email "${email}" (${name}) — skipped. Create the rep in NyxAegis first.`);
        }
      } catch (err) {
        errors++;
        errorLog.push(`Row ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ── COMMISSION PAYMENTS MODE ─────────────────────────────────────────────
  if (mode === "payments") {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const name    = col(row, headers, mapping.employeeName  || "Employee Name");
      const email   = col(row, headers, mapping.email         || "Work Email");
      const payDateRaw = col(row, headers, mapping.payDate    || "Check Date");
      const grossRaw   = col(row, headers, mapping.grossPay   || "Gross Pay");
      const netRaw     = col(row, headers, mapping.netPay     || "Net Pay");
      const commRaw    = col(row, headers, mapping.commissionAmt || "Commission Amount");

      if ((!name && !email) || !payDateRaw) { skipped++; continue; }

      const payDate = new Date(payDateRaw);
      if (isNaN(payDate.getTime())) {
        errors++;
        errorLog.push(`Row ${i + 2}: Invalid pay date "${payDateRaw}"`);
        continue;
      }

      const amount = parseAmount(commRaw) || parseAmount(netRaw) || parseAmount(grossRaw);

      try {
        const existingUser = email
          ? await prisma.user.findUnique({ where: { email }, include: { rep: true } })
          : null;

        if (!existingUser?.rep) {
          skipped++;
          errorLog.push(`Row ${i + 2}: Rep not found for "${email || name}" — skipped.`);
          continue;
        }

        // Upsert — deduplicate by repId + paidAt date
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = await (prisma as any).repPayment.findFirst({
          where: { repId: existingUser.rep.id, paidAt: payDate },
        });

        if (existing) { skipped++; continue; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).repPayment.create({
          data: {
            repId: existingUser.rep.id,
            amount,
            paidAt: payDate,
            notes: `Paycom import — ${name || email}`,
            status: "PAID",
          },
        });
        imported++;
      } catch (err) {
        errors++;
        errorLog.push(`Row ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    imported = mode === "payments" ? imported : updated;
  }

  return NextResponse.json({
    importId,
    totalRows: dataRows.length,
    imported: mode === "reps" ? 0 : imported,
    updated: mode === "reps" ? updated : 0,
    skipped,
    errors,
    errorLog: errorLog.slice(0, 50),
  });
}
