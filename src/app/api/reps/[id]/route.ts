import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  // Rep fields live on the rep record; user name/email handled separately
  const { name, email, ...repData } = data;
  const rep = await prisma.rep.update({
    where: { id },
    data: {
      ...repData,
      ...(name || email ? { user: { update: { ...(name && { name }), ...(email && { email }) } } } : {}),
    },
    include: { user: { select: { name: true, email: true } }, _count: { select: { opportunities: true, territories: true } } },
  });
  return NextResponse.json(rep);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const rep = await prisma.rep.findUnique({ where: { id } });
  if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.rep.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
