import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30")));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // ── 1. All sessions in the window ──────────────────────────────────────────
  const sessions = await prisma.userSession.findMany({
    where: { loginAt: { gte: since } },
    select: {
      id: true,
      userId: true,
      loginAt: true,
      logoutAt: true,
      durationSecs: true,
      deviceType: true,
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: { loginAt: "desc" },
  });

  // ── 2. All page views in the window ─────────────────────────────────────────
  const pageViews = await prisma.pageView.findMany({
    where: { visitedAt: { gte: since } },
    select: { userId: true, path: true, visitedAt: true, sessionId: true },
  });

  // ── 3. Login heatmap: [dayOfWeek 0-6][hour 0-23] = count ───────────────────
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of sessions) {
    const d = new Date(s.loginAt);
    heatmap[d.getDay()][d.getHours()]++;
  }

  // ── 4. Top pages ────────────────────────────────────────────────────────────
  const pathCounts: Record<string, number> = {};
  for (const pv of pageViews) {
    pathCounts[pv.path] = (pathCounts[pv.path] ?? 0) + 1;
  }
  const topPages = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, count]) => ({ path, count }));

  // ── 5. Device split ─────────────────────────────────────────────────────────
  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
  for (const s of sessions) {
    const dt = (s.deviceType ?? "desktop") as keyof typeof deviceCounts;
    if (dt in deviceCounts) deviceCounts[dt]++;
  }

  // ── 6. Per-user stats ───────────────────────────────────────────────────────
  const userMap: Record<
    string,
    {
      userId: string;
      name: string | null;
      email: string | null;
      role: string;
      sessionCount: number;
      lastLoginAt: string | null;
      totalDurationSecs: number;
      completedSessions: number;
      mobileCount: number;
      topPaths: Record<string, number>;
    }
  > = {};

  for (const s of sessions) {
    if (!userMap[s.userId]) {
      userMap[s.userId] = {
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        role: s.user.role,
        sessionCount: 0,
        lastLoginAt: null,
        totalDurationSecs: 0,
        completedSessions: 0,
        mobileCount: 0,
        topPaths: {},
      };
    }
    const u = userMap[s.userId];
    u.sessionCount++;
    if (!u.lastLoginAt || s.loginAt.toISOString() > u.lastLoginAt) {
      u.lastLoginAt = s.loginAt.toISOString();
    }
    if (s.durationSecs) {
      u.totalDurationSecs += s.durationSecs;
      u.completedSessions++;
    }
    if (s.deviceType === "mobile") u.mobileCount++;
  }

  // Attach top paths per user
  for (const pv of pageViews) {
    if (userMap[pv.userId]) {
      userMap[pv.userId].topPaths[pv.path] =
        (userMap[pv.userId].topPaths[pv.path] ?? 0) + 1;
    }
  }

  const perUser = Object.values(userMap).map((u) => ({
    userId: u.userId,
    name: u.name,
    email: u.email,
    role: u.role,
    sessionCount: u.sessionCount,
    lastLoginAt: u.lastLoginAt,
    avgDurationSecs:
      u.completedSessions > 0
        ? Math.round(u.totalDurationSecs / u.completedSessions)
        : null,
    mobilePercent:
      u.sessionCount > 0 ? Math.round((u.mobileCount / u.sessionCount) * 100) : 0,
    topPaths: Object.entries(u.topPaths)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count })),
  }));

  // Sort by most recent activity
  perUser.sort((a, b) =>
    (b.lastLoginAt ?? "").localeCompare(a.lastLoginAt ?? "")
  );

  // ── 7. Summary stats ────────────────────────────────────────────────────────
  const completedWithDuration = sessions.filter((s) => s.durationSecs !== null);
  const avgSessionSecs =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((sum, s) => sum + (s.durationSecs ?? 0), 0) /
            completedWithDuration.length
        )
      : null;

  return NextResponse.json({
    days,
    summary: {
      totalSessions: sessions.length,
      uniqueUsers: Object.keys(userMap).length,
      totalPageViews: pageViews.length,
      avgSessionSecs,
      deviceCounts,
    },
    heatmap,
    topPages,
    perUser,
  });
}
