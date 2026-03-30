import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// DELETE /api/legal/signatures/:id — admin only: void a recorded signature
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.legalDocSignature.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Signature not found" }, { status: 404 });
  }

  await prisma.legalDocSignature.delete({ where: { id } });

  return NextResponse.json({ ok: true, voided: { id, docType: existing.docType, signerRole: existing.signerRole } });
}
