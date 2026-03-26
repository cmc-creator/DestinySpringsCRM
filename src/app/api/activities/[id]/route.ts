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
  const data = await req.json();

  // Build update payload — only allow certain fields
  const {
    type, title, notes,
    scheduledAt, completedAt,
    hospitalId, repId, leadId, opportunityId,
  } = data;

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      ...(type         !== undefined && { type }),
      ...(title        !== undefined && { title }),
      ...(notes        !== undefined && { notes }),
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
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
