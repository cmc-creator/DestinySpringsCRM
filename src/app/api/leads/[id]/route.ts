import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  // Strip undefined keys
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  // Snapshot previous assignedRepId to detect assignment changes
  const prev = await prisma.lead.findUnique({ where: { id }, select: { assignedRepId: true, hospitalName: true } });

  const lead = await prisma.lead.update({ where: { id }, data, include: { assignedRep: { include: { user: { select: { name: true, id: true } } } } } });

  // Fire notification when a rep is newly assigned
  if (
    data.assignedRepId &&
    data.assignedRepId !== prev?.assignedRepId &&
    lead.assignedRep?.user?.id
  ) {
    await prisma.notification.create({
      data: {
        userId: lead.assignedRep.user.id,
        title: "New Lead Assigned",
        body: prev?.hospitalName ?? "A lead has been assigned to you.",
        type: "INFO",
        link: "/rep/leads",
      },
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
