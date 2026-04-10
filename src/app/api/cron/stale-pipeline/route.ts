import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendStalePipelineEmail } from "@/lib/email";

export const maxDuration = 30;

const STALE_DAYS = 5;

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

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  // Opportunities that haven't been updated in 5+ days and aren't closed
  const staleOpps = await prisma.opportunity.findMany({
    where: {
      stage: { notIn: ["DISCHARGED", "DECLINED"] },
      updatedAt: { lte: cutoff },
      assignedRepId: { not: null },
    },
    select: {
      id: true,
      title: true,
      stage: true,
      updatedAt: true,
      assignedRepId: true,
      assignedRep: {
        select: { id: true, user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  let notificationsCreated = 0;

  for (const opp of staleOpps) {
    const repUser = opp.assignedRep?.user;
    if (!repUser) continue;

    const daysStale = Math.floor((Date.now() - opp.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: repUser.id,
        title: "Stale Pipeline Opportunity",
        body: `"${opp.title}" hasn't moved in ${daysStale} days. Consider updating the stage or logging a follow-up.`,
        type: "WARNING",
        link: "/rep/opportunities",
      },
    });
    notificationsCreated++;

    // Email
    if (repUser.email) {
      await sendStalePipelineEmail({
        to: repUser.email,
        name: repUser.name ?? "",
        oppTitle: opp.title,
        stage: opp.stage,
        daysStale,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    staleOpportunities: staleOpps.length,
    notificationsCreated,
  });
}
