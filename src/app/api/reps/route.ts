import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reps = await prisma.rep.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { opportunities: true, territories: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reps);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, email, password, title, phone, territory, licensedStates, status, hipaaTrainedAt } = await req.json();
  if (!email || !name) return NextResponse.json({ error: "name and email required" }, { status: 400 });
  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password || "rep123!", 12);
  const user = await prisma.user.create({ data: { name, email, password: hashed, role: "REP" } });
  const rep = await prisma.rep.create({
    data: { userId: user.id, title, phone, territory, licensedStates: licensedStates ?? [], status: status ?? "ACTIVE", hipaaTrainedAt: hipaaTrainedAt ? new Date(hipaaTrainedAt) : undefined },
    include: { user: { select: { name: true, email: true } }, _count: { select: { opportunities: true, territories: true } } },
  });
  return NextResponse.json(rep, { status: 201 });
}
