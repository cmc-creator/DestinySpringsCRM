import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 10;

/** POST — record a page view within a session */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sessionId?: string; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const path = body.path?.trim();

  if (!sessionId || !path) {
    return NextResponse.json({ error: "sessionId and path required" }, { status: 400 });
  }

  // Verify the session belongs to this user (prevent spoofing other users' sessions)
  const parentSession = await prisma.userSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  });

  if (!parentSession) {
    return NextResponse.json({ error: "Invalid session" }, { status: 403 });
  }

  // Deduplicate: skip if the same path was visited in this session in the last 5s
  const recent = await prisma.pageView.findFirst({
    where: {
      sessionId,
      path,
      visitedAt: { gte: new Date(Date.now() - 5000) },
    },
    select: { id: true },
  });

  if (recent) return NextResponse.json({ ok: true, deduped: true });

  await prisma.pageView.create({
    data: { sessionId, userId: session.user.id, path },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
