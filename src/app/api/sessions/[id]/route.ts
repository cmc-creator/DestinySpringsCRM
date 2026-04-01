import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 15;

async function endSession(req: NextRequest, id: string) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userSession = await prisma.userSession.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, loginAt: true, logoutAt: true },
  });

  if (!userSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (userSession.logoutAt) return NextResponse.json({ ok: true }); // already ended

  const now = new Date();
  const durationSecs = Math.round((now.getTime() - userSession.loginAt.getTime()) / 1000);

  await prisma.userSession.update({
    where: { id },
    data: { logoutAt: now, durationSecs },
  });

  return NextResponse.json({ ok: true });
}

/** PATCH — end a session (normal page close / explicit logout) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return endSession(req, id);
}

/** POST — end a session via sendBeacon (sendBeacon only supports POST) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return endSession(req, id);
}
