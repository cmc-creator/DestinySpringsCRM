import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// GET /api/tasks — list tasks for the current user (rep) or all tasks (admin)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repId        = searchParams.get("repId");
  const hospitalId   = searchParams.get("hospitalId");
  const leadId       = searchParams.get("leadId");
  const opportunityId = searchParams.get("opportunityId");
  const status       = searchParams.get("status");

  const where = {
    ...(repId         ? { repId }         : {}),
    ...(hospitalId    ? { hospitalId }    : {}),
    ...(leadId        ? { leadId }        : {}),
    ...(opportunityId ? { opportunityId } : {}),
    ...(status        ? { status }        : {}),
    // Reps can only see their own tasks
    ...(session.user.role === "REP"
      ? { createdByUserId: session.user.id }
      : {}),
  };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    include: {
      rep:         { include: { user: { select: { name: true } } } },
      hospital:    { select: { id: true, hospitalName: true } },
      lead:        { select: { id: true, hospitalName: true } },
      opportunity: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(tasks);
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title:          body.title.trim(),
      notes:          body.notes ?? null,
      status:         body.status ?? "OPEN",
      priority:       body.priority ?? "MEDIUM",
      dueAt:          body.dueAt ? new Date(body.dueAt) : null,
      repId:          body.repId ?? null,
      hospitalId:     body.hospitalId ?? null,
      leadId:         body.leadId ?? null,
      opportunityId:  body.opportunityId ?? null,
      createdByUserId: session.user.id,
    },
    include: {
      hospital:    { select: { id: true, hospitalName: true } },
      rep:         { include: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
