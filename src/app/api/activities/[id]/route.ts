import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership before allowing edit
  const existing = await prisma.activity.findUnique({
    where: { id },
    select: { createdByUserId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && existing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();

  // Build update payload — only allow certain fields
  const {
    type, title, notes,
    scheduledAt, completedAt,
    latitude, longitude, arrivedAt, departedAt, durationMinutes,
    hospitalId, repId, leadId, opportunityId,
  } = data;

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      ...(type         !== undefined && { type }),
      ...(title        !== undefined && { title }),
      ...(notes        !== undefined && { notes }),
      ...(latitude     !== undefined && { latitude: latitude != null ? Number(latitude) : null }),
      ...(longitude    !== undefined && { longitude: longitude != null ? Number(longitude) : null }),
      ...(arrivedAt    !== undefined && { arrivedAt: arrivedAt ? new Date(arrivedAt) : null }),
      ...(departedAt   !== undefined && { departedAt: departedAt ? new Date(departedAt) : null }),
      ...(durationMinutes !== undefined && { durationMinutes: durationMinutes != null ? Number(durationMinutes) : null }),
      ...(scheduledAt  !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(completedAt  !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
      ...(hospitalId   !== undefined && { hospitalId }),
      ...(repId        !== undefined && { repId }),
      ...(leadId       !== undefined && { leadId }),
      ...(opportunityId !== undefined && { opportunityId }),
    },
    include: {
      hospital:      { select: { hospitalName: true } },
      rep:           { include: { user: { select: { name: true } } } },
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(activity);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { createdByUserId: true },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Admins can delete any activity; others can only delete their own
  if (session.user.role !== "ADMIN" && activity.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
