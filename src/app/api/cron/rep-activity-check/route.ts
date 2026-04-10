import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendRepInactiveEmail } from "@/lib/email";

export const maxDuration = 30;

const INACTIVE_DAYS = 3;

function safeCompare(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) {
      timingSafeEqual(ab, ab);
      return false;
    }
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (!safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  // Active reps with their most recent activity in the past 3 days (if any)
  const reps = await prisma.rep.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      user: { select: { id: true, email: true, name: true } },
      activities: {
        where: { createdAt: { gte: cutoff } },
        take: 1,
        select: { id: true },
      },
    },
  });

  // Only flag reps with zero recent activities
  const inactiveReps = reps.filter((r) => r.activities.length === 0);

  let notificationsCreated = 0;

  for (const rep of inactiveReps) {
    const user = rep.user;
    if (!user) continue;

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Activity Reminder",
        body: `You haven't logged any activity in the past ${INACTIVE_DAYS} days. Keep your pipeline moving!`,
        type: "WARNING",
        link: "/rep/activities",
      },
    });
    notificationsCreated++;

    // Email
    if (user.email) {
      await sendRepInactiveEmail({
        to: user.email,
        name: user.name ?? "",
        daysSinceActivity: INACTIVE_DAYS,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    activeRepsChecked: reps.length,
    inactiveReps: inactiveReps.length,
    notificationsCreated,
  });
}
