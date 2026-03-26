import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const data = await req.json();
  const { status, reviewNotes, opportunityId } = data;

  const assessment = await prisma.preAssessment.update({
    where: { id },
    data: {
      ...(status       ? { status: status as never }                  : {}),
      ...(reviewNotes  !== undefined ? { reviewNotes: reviewNotes ? String(reviewNotes) : null } : {}),
      ...(opportunityId !== undefined ? { opportunityId: opportunityId ? String(opportunityId) : null } : {}),
      reviewedById: session.user.id,
      reviewedAt:   new Date(),
    },
  });

  // Notify submitter of decision
  if (status && ["CONVERTED", "DECLINED", "ON_HOLD"].includes(status)) {
    const label = status === "CONVERTED" ? "✅ converted to an admission" : status === "DECLINED" ? "❌ declined" : "⏸️ placed on hold";
    try {
      await prisma.notification.create({
        data: {
          userId: assessment.submittedById,
          title: `Pre-Assessment Update`,
          body: `Your pre-assessment for ${assessment.patientInitials ?? "Unknown"} has been ${label}.`,
          type: status === "CONVERTED" ? "SUCCESS" : status === "DECLINED" ? "WARNING" : "INFO",
          link: `/rep/inquiry`,
        },
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json(assessment);
}
