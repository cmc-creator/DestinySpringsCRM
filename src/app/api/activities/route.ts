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
  const rawRepId        = searchParams.get("repId");
  const hospitalId      = searchParams.get("hospitalId");
  const opportunityId   = searchParams.get("opportunityId");
  const referralSourceId = searchParams.get("referralSourceId");
  const contactId        = searchParams.get("contactId");

  // REP role: scope to own rep and prevent cross-rep data dumps
  let repId: string | null = rawRepId;
  if (session.user.role === "REP") {
    const repRecord = await prisma.rep.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!repRecord) return NextResponse.json({ error: "Rep not found" }, { status: 403 });
    // If no entity filter is provided, or caller passed an explicit repId, force to own rep
    const hasEntityFilter = !!(leadId || hospitalId || opportunityId || referralSourceId || contactId);
    if (!hasEntityFilter || rawRepId) {
      repId = repRecord.id;
    }
  }

  // When filtering by entity, return most-recent-first and skip the date filter
  const entityFilter = leadId || repId || hospitalId || opportunityId || referralSourceId || contactId;

  const activities = await prisma.activity.findMany({
    where: {
      ...(leadId           ? { leadId }           : {}),
      ...(repId            ? { repId }            : {}),
      ...(hospitalId       ? { hospitalId }       : {}),
      ...(opportunityId    ? { opportunityId }    : {}),
      ...(referralSourceId ? { referralSourceId } : {}),
      ...(contactId        ? { contactId }        : {}),
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
      hospital:      { select: { id: true, hospitalName: true } },
      lead:          { select: { hospitalName: true } },
      rep:           { include: { user: { select: { name: true } } } },
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(activities);
}

const VALID_ACTIVITY_TYPES = new Set([
  "CALL","EMAIL","NOTE","MEETING","LUNCH","TASK",
  "PROPOSAL_SENT","CONTRACT_SENT","DEMO_COMPLETED","SITE_VISIT",
  "CONFERENCE","FOLLOW_UP","IN_SERVICE","FACILITY_TOUR",
  "CE_PRESENTATION","CRISIS_CONSULT","LUNCH_AND_LEARN",
  "COMMUNITY_EVENT","REFERRAL_RECEIVED","DISCHARGE_PLANNING",
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.type || !VALID_ACTIVITY_TYPES.has(body.type)) {
      return NextResponse.json({ error: "Invalid or missing activity type" }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    // For REP role, always use their own rep record -- prevent logging as another rep
    let resolvedRepId: string | null = body.repId ?? null;
    if (session.user.role === "REP") {
      const repRecord = await prisma.rep.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      resolvedRepId = repRecord?.id ?? null;
    }

    const activity = await prisma.activity.create({
      data: {
        type: body.type,
        title: body.title.trim(),
        notes: body.notes ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        arrivedAt: body.arrivedAt ? new Date(body.arrivedAt) : null,
        departedAt: body.departedAt ? new Date(body.departedAt) : null,
        durationMinutes: body.durationMinutes ?? null,
        repId: resolvedRepId,
        leadId: body.leadId ?? null,
        hospitalId: body.hospitalId ?? null,
        opportunityId: body.opportunityId ?? null,
        contactId: body.contactId ?? null,
        referralSourceId: body.referralSourceId ?? null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        completedAt: body.completedAt ? new Date(body.completedAt) : null,
        createdByUserId: session.user.id,
      },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    console.error("Activity create error:", e);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
