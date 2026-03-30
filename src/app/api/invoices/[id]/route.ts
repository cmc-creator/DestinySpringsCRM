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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
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

  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  const invoice = await prisma.$transaction(async (tx) => {
    const current = await tx.invoice.findUnique({
      where: { id },
      include: { hospital: { include: { user: { select: { organizationId: true } } } } },
    });

    const updated = await tx.invoice.update({
      where: { id },
      data,
      include: { hospital: { select: { hospitalName: true } } },
    });

    const statusBefore = current?.status;
    const statusAfter = updated.status;
    if (statusBefore !== "PAID" && statusAfter === "PAID") {
      const seatQty = parseSeatQty(updated.lineItems);
      const organizationId = current?.hospital?.user?.organizationId;
      if (seatQty > 0 && organizationId) {
        await tx.$executeRaw`
          UPDATE "organizations"
          SET "seatLimit" = COALESCE("seatLimit", 0) + ${seatQty}
          WHERE "id" = ${organizationId}
            AND COALESCE("subscriptionStatus", '') <> 'trialing'
        `;
      }
    }

    return updated;
  });

  return NextResponse.json(invoice);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
