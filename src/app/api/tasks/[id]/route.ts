import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// PATCH /api/tasks/[id] — update a task
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // If marking done, auto-set completedAt
  const completedAt =
    body.status === "DONE" ? (body.completedAt ? new Date(body.completedAt) : new Date()) :
    body.status === "OPEN" || body.status === "IN_PROGRESS" ? null :
    body.completedAt ? new Date(body.completedAt) : undefined;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title     !== undefined ? { title: body.title.trim() } : {}),
      ...(body.notes     !== undefined ? { notes: body.notes } : {}),
      ...(body.status    !== undefined ? { status: body.status } : {}),
      ...(body.priority  !== undefined ? { priority: body.priority } : {}),
      ...(body.dueAt     !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
      ...(body.repId     !== undefined ? { repId: body.repId } : {}),
      ...(body.hospitalId !== undefined ? { hospitalId: body.hospitalId } : {}),
      ...(completedAt    !== undefined ? { completedAt } : {}),
    },
  });

  return NextResponse.json(task);
}

// DELETE /api/tasks/[id] — delete a task
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "ACCOUNT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
