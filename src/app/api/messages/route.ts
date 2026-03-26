import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// GET /api/messages — inbox or specific thread, always includes display names
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const thread = searchParams.get("thread");

  const where = thread
    ? {
        OR: [
          { fromUserId: session.user.id, toUserId: thread },
          { fromUserId: thread, toUserId: session.user.id },
        ],
      }
    : {
        OR: [
          { toUserId: session.user.id },
          { fromUserId: session.user.id },
        ],
      };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: thread ? "asc" : "desc" },
    take: 200,
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });

  const userIds = [...new Set(messages.flatMap((message) => [message.fromUserId, message.toUserId]))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((user) => [user.id, user.name ?? user.email ?? user.id]));

  return NextResponse.json(
    messages.map((message) => ({
      ...message,
      fromName: userMap[message.fromUserId] ?? message.fromUserId,
      toName: userMap[message.toUserId] ?? message.toUserId,
    }))
  );
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { toUserId, body } = await req.json() as { toUserId?: string; body?: string };
    if (!toUserId || !body?.trim()) {
      return NextResponse.json({ error: "toUserId and body are required" }, { status: 400 });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

    const message = await prisma.message.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        body: body.trim(),
      },
      select: { id: true, fromUserId: true, toUserId: true, body: true, readAt: true, createdAt: true },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    console.error("Message send error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
