import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;
const MAX_AUTO_DISCOUNT_PERCENT = 20;

type InvoiceLineItem = { description?: unknown; qty?: unknown };

function parseSeatQty(lineItems: unknown): number {
  if (!Array.isArray(lineItems)) return 0;
  return (lineItems as InvoiceLineItem[]).reduce((sum, line) => {
    const description = String(line?.description ?? "").toLowerCase();
    const qty = Number(line?.qty ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    return description.includes("seat") ? sum + qty : sum;
  }, 0);
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const invoices = await prisma.invoice.findMany({
    include: { hospital: { select: { hospitalName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({ data });

    if (created.status === "PAID") {
      const seatQty = parseSeatQty(created.lineItems);
      if (seatQty > 0) {
        const hospital = await tx.hospital.findUnique({
          where: { id: created.hospitalId },
          include: { user: { select: { organizationId: true } } },
        });
        const organizationId = hospital?.user?.organizationId;
        if (organizationId) {
          await tx.organization.update({
            where: { id: organizationId },
            data: { seatLimit: { increment: seatQty } },
          });
        }
      }
    }
    return created;
  });
  return NextResponse.json(invoice, { status: 201 });
}
