export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const source = await prisma.referralSource.findUnique({
    where: { id },
    include: {
      assignedRep: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { referrals: true } },
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(source);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const source = await prisma.referralSource.update({
      where: { id },
      data: {
        ...(body.name        !== undefined ? { name:         body.name }                    : {}),
        ...(body.type        !== undefined ? { type:         body.type }                    : {}),
        ...(body.specialty   !== undefined ? { specialty:    body.specialty   || null }     : {}),
        ...(body.practiceName !== undefined ? { practiceName: body.practiceName || null }   : {}),
        ...(body.npi         !== undefined ? { npi:          body.npi         || null }     : {}),
        ...(body.mapLabel    !== undefined ? { mapLabel:     body.mapLabel    || null }     : {}),
        ...(body.mapColor    !== undefined ? { mapColor:     body.mapColor    || null }     : {}),
        ...(body.tier        !== undefined ? { tier:         body.tier        || "TIER_2" } : {}),
        ...(body.influenceRole !== undefined ? { influenceRole: body.influenceRole || null } : {}),
        ...(body.influenceLevel !== undefined ? { influenceLevel: body.influenceLevel || null } : {}),
        ...(body.competitorIntel !== undefined ? { competitorIntel: body.competitorIntel || null } : {}),
        ...(body.contactName !== undefined ? { contactName:  body.contactName || null }     : {}),
        ...(body.email       !== undefined ? { email:        body.email       || null }     : {}),
        ...(body.phone       !== undefined ? { phone:        body.phone       || null }     : {}),
        ...(body.address     !== undefined ? { address:      body.address     || null }     : {}),
        ...(body.city        !== undefined ? { city:         body.city        || null }     : {}),
        ...(body.state       !== undefined ? { state:        body.state       || null }     : {}),
        ...(body.zip         !== undefined ? { zip:          body.zip         || null }     : {}),
        ...(body.notes       !== undefined ? { notes:        body.notes       || null }     : {}),
        ...(body.active      !== undefined ? { active:       Boolean(body.active) }         : {}),
        ...(body.monthlyGoal !== undefined ? { monthlyGoal:  body.monthlyGoal != null ? Number(body.monthlyGoal) : null } : {}),
        ...(body.assignedRepId !== undefined ? { assignedRepId: body.assignedRepId || null } : {}),
      },
    });
    return NextResponse.json(source);
  } catch (e) {
    console.error("ReferralSource update error:", e);
    return NextResponse.json({ error: "Failed to update referral source" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.referralSource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ReferralSource delete error:", e);
    return NextResponse.json({ error: "Failed to delete referral source" }, { status: 500 });
  }
}
