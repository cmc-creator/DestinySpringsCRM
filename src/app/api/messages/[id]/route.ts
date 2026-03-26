import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/messages/[id] — mark as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const message = await prisma.message.findUnique({ where: { id }, select: { toUserId: true, readAt: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.toUserId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!message.readAt) {
    await prisma.message.update({ where: { id }, data: { readAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/messages/[id] — sender can retract, recipient can dismiss
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const message = await prisma.message.findUnique({ where: { id }, select: { fromUserId: true, toUserId: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant = message.fromUserId === session.user.id || message.toUserId === session.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
