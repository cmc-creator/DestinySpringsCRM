import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from         = searchParams.get("from");
  const to           = searchParams.get("to");
  const leadId          = searchParams.get("leadId");
  const repId           = searchParams.get("repId");
  const hospitalId      = searchParams.get("hospitalId");
  const opportunityId   = searchParams.get("opportunityId");
  const referralSourceId = searchParams.get("referralSourceId");

  // When filtering by entity, return most-recent-first and skip the date filter
  const entityFilter = leadId || repId || hospitalId || opportunityId || referralSourceId;

  const activities = await prisma.activity.findMany({
    where: {
      ...(leadId           ? { leadId }           : {}),
      ...(repId            ? { repId }            : {}),
      ...(hospitalId       ? { hospitalId }       : {}),
      ...(opportunityId    ? { opportunityId }    : {}),
      ...(referralSourceId ? { referralSourceId } : {}),
      ...(!entityFilter && (from || to) ? {
        scheduledAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    },
    orderBy: entityFilter
      ? { createdAt: "desc" }
      : { scheduledAt: { sort: "asc", nulls: "last" } },
    take: 500,
    include: {
      hospital: { select: { id: true, hospitalName: true } },
      lead:     { select: { hospitalName: true } },
      rep:      { include: { user: { select: { name: true } } } },
    },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const activity = await prisma.activity.create({ data });
  return NextResponse.json(activity, { status: 201 });
}
