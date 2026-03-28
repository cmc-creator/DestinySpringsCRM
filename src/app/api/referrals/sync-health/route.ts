import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type SyncKind = "BEDBOARD" | "DISCHARGE";

type SyncHealth = {
  syncType: SyncKind;
  status: "SUCCESS" | "FAILED";
  detail?: string;
  createdAt: string;
  ageHours: number;
  stale: boolean;
  totalRows?: number;
  imported?: number;
  updated?: number;
  created?: number;
  skipped?: number;
  errors?: number;
};

function parseSyncEntry(diff: unknown, createdAt: Date): SyncHealth | null {
  const payload = (diff ?? {}) as Record<string, unknown>;
  const syncType = payload.syncType;
  if (syncType !== "BEDBOARD" && syncType !== "DISCHARGE") return null;

  const status = payload.status === "FAILED" ? "FAILED" : "SUCCESS";
  const ageHours = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

  return {
    syncType,
    status,
    detail: typeof payload.detail === "string" ? payload.detail : undefined,
    createdAt: createdAt.toISOString(),
    ageHours,
    stale: ageHours >= 24,
    totalRows: typeof payload.totalRows === "number" ? payload.totalRows : undefined,
    imported: typeof payload.imported === "number" ? payload.imported : undefined,
    updated: typeof payload.updated === "number" ? payload.updated : undefined,
    created: typeof payload.created === "number" ? payload.created : undefined,
    skipped: typeof payload.skipped === "number" ? payload.skipped : undefined,
    errors: typeof payload.errors === "number" ? payload.errors : undefined,
  };
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      resource: "AdmissionsReferralsSync",
      action: "SYNC",
      createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      createdAt: true,
      diff: true,
    },
  });

  const parsed = logs
    .map((log) => parseSyncEntry(log.diff, log.createdAt))
    .filter((entry): entry is SyncHealth => !!entry);

  const latestBedboard = parsed.find((entry) => entry.syncType === "BEDBOARD") ?? null;
  const latestDischarge = parsed.find((entry) => entry.syncType === "DISCHARGE") ?? null;

  const recentFailures = parsed
    .filter((entry) => entry.status === "FAILED")
    .slice(0, 10);

  return NextResponse.json({
    bedboard: latestBedboard,
    discharge: latestDischarge,
    recentFailures,
  });
}
