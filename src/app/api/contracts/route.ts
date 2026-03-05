import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contracts = await prisma.contract.findMany({
    include: {
      hospital: { select: { hospitalName: true } },
      assignedRep: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contracts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const contract = await prisma.contract.create({ data, include: { hospital: { select: { hospitalName: true } }, assignedRep: { include: { user: { select: { name: true } } } } } });
  return NextResponse.json(contract, { status: 201 });
}
