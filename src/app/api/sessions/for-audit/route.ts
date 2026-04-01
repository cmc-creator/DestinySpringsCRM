import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 15;

/**
 * GET /api/sessions/for-audit?userId=X&loginAt=ISO
 * Returns the UserSession closest in time to the loginAt timestamp for a given user.
 * Admin-only. Used to enrich LOGIN_SUCCESS audit log rows.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const loginAt = searchParams.get("loginAt");

  if (!userId || !loginAt) {
    return NextResponse.json({ error: "userId and loginAt required" }, { status: 400 });
  }

  const anchor = new Date(loginAt);
  // Look within a 5-minute window around the audit log event
  const windowMs = 5 * 60 * 1000;

  const userSession = await prisma.userSession.findFirst({
    where: {
      userId,
      loginAt: {
        gte: new Date(anchor.getTime() - windowMs),
        lte: new Date(anchor.getTime() + windowMs),
      },
    },
    orderBy: { loginAt: "desc" },
    select: {
      id: true,
      loginAt: true,
      logoutAt: true,
      durationSecs: true,
      deviceType: true,
      ipAddress: true,
      userAgent: true,
      pageViews: {
        select: { path: true },
        orderBy: { visitedAt: "asc" },
      },
    },
  });

  if (!userSession) return NextResponse.json({ session: null });

  // Condense page views into ordered path list with counts
  const pathCounts: Record<string, number> = {};
  for (const pv of userSession.pageViews) {
    pathCounts[pv.path] = (pathCounts[pv.path] ?? 0) + 1;
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  return NextResponse.json({
    session: {
      id: userSession.id,
      loginAt: userSession.loginAt.toISOString(),
      logoutAt: userSession.logoutAt?.toISOString() ?? null,
      durationSecs: userSession.durationSecs,
      deviceType: userSession.deviceType,
      ipAddress: userSession.ipAddress,
      userAgent: userSession.userAgent,
      topPaths,
    },
  });
}
