import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      assignedRep: { include: { user: { select: { name: true } } } },
    },
  });

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
