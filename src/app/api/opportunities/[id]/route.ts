import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOpportunityAssignedEmail, sendAdmissionEmail } from "@/lib/email";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  const before = await prisma.opportunity.findUnique({ where: { id }, select: { id: true, stage: true, assignedRepId: true, title: true } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.stage === "DECLINED" && !String(data.lostReason ?? "").trim() && before.stage !== "DECLINED") {
    return NextResponse.json({ error: "lostReason is required when an opportunity is declined" }, { status: 400 });
  }

  const opp = await prisma.opportunity.update({
    where: { id },
    data,
    include: {
      hospital: { select: { hospitalName: true } },
      assignedRep: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  // Email: rep newly assigned to this opportunity
  if (
    data.assignedRepId &&
    data.assignedRepId !== before.assignedRepId &&
    opp.assignedRep?.user?.email
  ) {
    await sendOpportunityAssignedEmail({
      to: opp.assignedRep.user.email,
      name: opp.assignedRep.user.name ?? "",
      oppTitle: opp.title,
      hospitalName: opp.hospital?.hospitalName ?? "",
      stage: opp.stage,
    });
  }

  // Bell notification + email: stage moved to ADMITTED
  if (opp.assignedRepId && before.stage !== "ADMITTED" && opp.stage === "ADMITTED") {
    await prisma.notification.create({
      data: {
        userId: opp.assignedRepId,
        title: "Referral Admitted",
        body: `${opp.title} was officially admitted from ${opp.hospital?.hospitalName ?? "the pipeline"}.`,
        type: "ADMISSION",
        link: "/rep/opportunities",
        read: false,
      },
    }).catch(() => {});

    if (opp.assignedRep?.user?.email) {
      await sendAdmissionEmail({
        to: opp.assignedRep.user.email,
        name: opp.assignedRep.user.name ?? "",
        oppTitle: opp.title,
        hospitalName: opp.hospital?.hospitalName ?? "",
      });
    }
  }

  return NextResponse.json(opp);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.opportunity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
