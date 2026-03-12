export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ImportRow {
  sourceId?:       string;
  sourceNpi?:      string;
  sourceName?:     string;
  patientInitials?: string;
  admissionDate?:  string;
  dischargeDate?:  string;
  serviceLine?:    string;
  externalId?:     string;
  status?:         string;
  notes?:          string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { rows: ImportRow[] };
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Cache source lookups to avoid repeated DB calls
  const sourceCache = new Map<string, string>(); // key → id

  let imported = 0;
  let skipped  = 0;
  let errors   = 0;
  const errorLog: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Resolve referral source
      let referralSourceId = row.sourceId ?? null;

      if (!referralSourceId) {
        const cacheKey = row.sourceNpi ?? row.sourceName ?? "";
        if (cacheKey && sourceCache.has(cacheKey)) {
          referralSourceId = sourceCache.get(cacheKey)!;
        } else if (row.sourceNpi) {
          const src = await prisma.referralSource.findFirst({ where: { npi: row.sourceNpi } });
          if (src) { referralSourceId = src.id; sourceCache.set(row.sourceNpi, src.id); }
        } else if (row.sourceName) {
          const src = await prisma.referralSource.findFirst({
            where: { name: { equals: row.sourceName, mode: "insensitive" } },
          });
          if (src) { referralSourceId = src.id; sourceCache.set(row.sourceName, src.id); }
        }
      }

      if (!referralSourceId) {
        errors++;
        errorLog.push({ row: i + 1, error: `Source not found: "${row.sourceNpi ?? row.sourceName ?? "unknown"}"` });
        continue;
      }

      // Skip duplicate by externalId
      if (row.externalId) {
        const existing = await prisma.referral.findUnique({
          where: { referralSourceId_externalId: { referralSourceId, externalId: row.externalId } },
        });
        if (existing) { skipped++; continue; }
      }

      await prisma.referral.create({
        data: {
          referralSourceId,
          patientInitials: row.patientInitials || null,
          admissionDate:   row.admissionDate ? new Date(row.admissionDate) : null,
          dischargeDate:   row.dischargeDate ? new Date(row.dischargeDate) : null,
          serviceLine:     row.serviceLine   || null,
          externalId:      row.externalId    || null,
          status:          (row.status as never) ?? "RECEIVED",
          notes:           row.notes         || null,
        },
      });
      imported++;
    } catch (err) {
      errors++;
      errorLog.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return NextResponse.json({ imported, skipped, errors, errorLog });
}
