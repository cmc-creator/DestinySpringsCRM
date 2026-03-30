import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;
const MAX_AUTO_DISCOUNT_PERCENT = 20;

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

  const discountPercent = data.discountPercent != null ? Number(data.discountPercent) : null;
  if (discountPercent != null && Number.isFinite(discountPercent)) {
    data.discountPercent = Math.max(0, Math.min(100, Math.round(discountPercent)));
  }

  if ((data.discountPercent ?? 0) > MAX_AUTO_DISCOUNT_PERCENT && !data.discountApprovedBy) {
    return NextResponse.json(
      { error: `Discounts above ${MAX_AUTO_DISCOUNT_PERCENT}% require discountApprovedBy.` },
      { status: 400 }
    );
  }

  if (data.discountApprovedBy && !data.discountApprovedAt) {
    data.discountApprovedAt = new Date().toISOString();
  }

  const contract = await prisma.contract.create({ data, include: { hospital: { select: { hospitalName: true } }, assignedRep: { include: { user: { select: { name: true } } } } } });
  return NextResponse.json(contract, { status: 201 });
}
