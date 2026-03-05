import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  const opp = await prisma.opportunity.update({
    where: { id },
    data,
    include: {
      hospital: { select: { hospitalName: true } },
      assignedRep: { include: { user: { select: { name: true } } } },
    },
  });
  return NextResponse.json(opp);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.opportunity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
