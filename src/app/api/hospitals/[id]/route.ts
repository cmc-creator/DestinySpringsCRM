import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  if ("priorityDiscountPercent" in data) {
    const parsed = Number(data.priorityDiscountPercent);
    data.priorityDiscountPercent = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 20;
  }
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  const hospital = await prisma.hospital.update({ where: { id }, data });
  return NextResponse.json(hospital);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.hospital.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
