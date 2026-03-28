import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type M365Row = {
  sourceId?: string;
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

const ALLOWED_STATUS = new Set(["RECEIVED", "ADMITTED", "DECLINED", "PENDING", "DUPLICATE"]);

function toStatus(input?: string) {
  const status = (input ?? "RECEIVED").toUpperCase().trim();
  return ALLOWED_STATUS.has(status) ? status : "RECEIVED";
}

function toIsoDay(input?: string) {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

async function resolveOrCreateSource(row: M365Row) {
  if (row.sourceId) {
    const direct = await prisma.referralSource.findUnique({ where: { id: row.sourceId }, select: { id: true } });
    if (direct) return direct.id;
  }

  if (row.sourceNpi) {
    const byNpi = await prisma.referralSource.findFirst({ where: { npi: row.sourceNpi }, select: { id: true } });
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

export async function GET() {
  return NextResponse.json({
    service: "m365-referral-bedboard",
    ok: true,
    requiresHeader: "x-intake-key",
    requiresEnv: "M365_INTAKE_WEBHOOK_KEY",
  });
}

export async function POST(req: NextRequest) {
  const incomingKey = req.headers.get("x-intake-key") ?? "";
  const expectedKey = process.env.M365_INTAKE_WEBHOOK_KEY ?? "";

  if (!expectedKey) {
    return NextResponse.json({ error: "M365_INTAKE_WEBHOOK_KEY is not configured" }, { status: 500 });
  }

  if (!incomingKey || incomingKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { rows?: M365Row[]; dryRun?: boolean } | null;
  const rows = body?.rows;
  const dryRun = !!body?.dryRun;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorLog: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const referralSourceId = await resolveOrCreateSource(row);
      if (!referralSourceId) {
        errors++;
        errorLog.push({ row: i + 1, error: "Unable to resolve sourceId/sourceName/sourceNpi" });
        continue;
      }

      // Primary dedupe: source + externalId
      if (row.externalId) {
        const existing = await prisma.referral.findUnique({
          where: { referralSourceId_externalId: { referralSourceId, externalId: row.externalId } },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      // Secondary dedupe when externalId is missing
      if (!row.externalId) {
        const day = toIsoDay(row.admissionDate);
        const existingNoExt = await prisma.referral.findFirst({
          where: {
            referralSourceId,
            patientInitials: row.patientInitials ?? null,
            ...(day
              ? {
                  admissionDate: {
                    gte: new Date(`${day}T00:00:00.000Z`),
                    lt: new Date(`${day}T23:59:59.999Z`),
                  },
                }
              : {}),
          },
          select: { id: true },
        });
        if (existingNoExt) {
          skipped++;
          continue;
        }
      }

      if (!dryRun) {
        await prisma.referral.create({
          data: {
            referralSourceId,
            patientInitials: row.patientInitials ?? null,
            admissionDate: row.admissionDate ? new Date(row.admissionDate) : null,
            dischargeDate: row.dischargeDate ? new Date(row.dischargeDate) : null,
            serviceLine: row.serviceLine ?? null,
            externalId: row.externalId ?? null,
            status: toStatus(row.status) as never,
            notes: row.notes ?? null,
          },
        });
      }

      imported++;
    } catch (e) {
      errors++;
      errorLog.push({ row: i + 1, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  return NextResponse.json({
    dryRun,
    totalRows: rows.length,
    imported,
    skipped,
    errors,
    errorLog,
  });
}
