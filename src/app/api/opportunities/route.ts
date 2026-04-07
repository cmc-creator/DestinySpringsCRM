import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");

  const opportunities = await prisma.opportunity.findMany({
    where: stage ? { stage: stage as never } : {},
    include: {
      hospital: { select: { hospitalName: true, systemName: true } },
      assignedRep: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(opportunities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  if (data.stage === "DECLINED" && !String(data.lostReason ?? "").trim()) {
    return NextResponse.json({ error: "lostReason is required when an opportunity is declined" }, { status: 400 });
  }
  const opp = await prisma.opportunity.create({ data });
  // Audit log
  await prisma.auditLog.create({
    data: { userId: session.user.id, userEmail: session.user.email ?? undefined, userName: session.user.name ?? undefined, action: "CREATE", resource: "Opportunity", resourceId: opp.id },
  });

  if (opp.assignedRepId && opp.stage === "ADMITTED") {
    await prisma.notification.create({
      data: {
        userId: opp.assignedRepId,
        title: "Referral Admitted",
        body: `${data.title ?? "Opportunity"} was marked admitted.`,
        type: "ADMISSION",
        link: "/rep/opportunities",
        read: false,
      },
    }).catch(() => {});
  }

  return NextResponse.json(opp, { status: 201 });
}
