export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId") ?? undefined;
  const status   = searchParams.get("status") ?? undefined;
  const from     = searchParams.get("from");
  const to       = searchParams.get("to");

  const referrals = await prisma.referral.findMany({
    where: {
      ...(sourceId ? { referralSourceId: sourceId } : {}),
      ...(status   ? { status: status as never } : {}),
      ...(from || to ? {
        admissionDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    },
    include: {
      referralSource: {
        select: { id: true, name: true, type: true, specialty: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(referrals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    referralSourceId, patientInitials, admissionDate,
    dischargeDate, serviceLine, externalId, status, notes,
  } = body;

  if (!referralSourceId) {
    return NextResponse.json({ error: "referralSourceId is required" }, { status: 400 });
  }

  // Check for duplicate by externalId
  if (externalId) {
    const existing = await prisma.referral.findUnique({
      where: { referralSourceId_externalId: { referralSourceId, externalId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Duplicate: referral already exists", id: existing.id }, { status: 409 });
    }
  }

  const referral = await prisma.referral.create({
    data: {
      referralSourceId,
      patientInitials,
      admissionDate: admissionDate ? new Date(admissionDate) : null,
      dischargeDate: dischargeDate ? new Date(dischargeDate) : null,
      serviceLine,
      externalId,
      status: status ?? "RECEIVED",
      notes,
    },
    include: { referralSource: true },
  });

  return NextResponse.json(referral, { status: 201 });
}
