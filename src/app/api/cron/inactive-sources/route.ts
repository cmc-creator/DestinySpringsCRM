import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendInactiveSourceEmail } from "@/lib/email";

export const maxDuration = 30;

const INACTIVE_DAYS = 30;

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

  // Active referral sources with an assigned rep where the most recent referral is older than 30 days (or none exist)
  const sources = await prisma.referralSource.findMany({
    where: {
      active: true,
      assignedRepId: { not: null },
    },
    select: {
      id: true,
      name: true,
      assignedRepId: true,
      assignedRep: {
        select: { id: true, user: { select: { id: true, email: true, name: true } } },
      },
      referrals: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const inactiveSources = sources.filter((s) => {
    const lastReferral = s.referrals[0]?.createdAt ?? null;
    return !lastReferral || lastReferral < cutoff;
  });

  let notificationsCreated = 0;

  for (const source of inactiveSources) {
    const repUser = source.assignedRep?.user;
    if (!repUser) continue;

    const lastReferral = source.referrals[0]?.createdAt;
    const daysSince = lastReferral
      ? Math.floor((Date.now() - lastReferral.getTime()) / (1000 * 60 * 60 * 24))
      : INACTIVE_DAYS;

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: repUser.id,
        title: "Referral Source Going Cold",
        body: `${source.name} hasn't sent a referral in ${daysSince}+ days. Time to reconnect.`,
        type: "WARNING",
        link: "/rep/territory",
      },
    });
    notificationsCreated++;

    // Email
    if (repUser.email) {
      await sendInactiveSourceEmail({
        to: repUser.email,
        name: repUser.name ?? "",
        sourceName: source.name,
        daysSinceLastReferral: daysSince,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    inactiveSources: inactiveSources.length,
    notificationsCreated,
  });
}
