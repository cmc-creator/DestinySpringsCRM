import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type PaymentBody = {
  amount?: number;
  description?: string;
  status?: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as PaymentBody | null;
  if (!body || typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }

  const validStatuses = new Set(["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"]);
  const status = body.status && validStatuses.has(body.status) ? body.status : "PENDING";

  const payment = await prisma.repPayment.create({
    data: {
      repId: id,
      amount: body.amount,
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 240) : null,
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
    select: {
      id: true,
      repId: true,
      amount: true,
      description: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}