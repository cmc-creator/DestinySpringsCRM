import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigestEmail } from "@/lib/email";

export const maxDuration = 60;

function safeCompare(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Format "Month D, YYYY" for subject line
  const weekOf = oneWeekAgo.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

  // Fetch all active reps with their email/name
  const reps = await prisma.rep.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      user: { select: { email: true, name: true } },
    },
  });

  // Per-rep stats + email dispatch
  let emailsSent = 0;
  await Promise.all(
    reps.map(async (rep) => {
      if (!rep.user.email) return;

      const [activitiesLogged, leadsWorked, oppsUpdated, tasksCompleted, tasksPending] =
        await Promise.all([
          prisma.activity.count({
            where: { repId: rep.id, createdAt: { gte: oneWeekAgo } },
          }),
          prisma.lead.count({
            where: { assignedRepId: rep.id, updatedAt: { gte: oneWeekAgo } },
          }),
          prisma.opportunity.count({
            where: { assignedRepId: rep.id, updatedAt: { gte: oneWeekAgo } },
          }),
          prisma.task.count({
            where: { repId: rep.id, completedAt: { gte: oneWeekAgo } },
          }),
          prisma.task.count({
            where: { repId: rep.id, status: "OPEN" },
          }),
        ]);

      await sendWeeklyDigestEmail({
        to: rep.user.email,
        name: rep.user.name ?? "",
        weekOf,
        activitiesLogged,
        leadsWorked,
        oppsUpdated,
        tasksCompleted,
        tasksPending,
      });

      emailsSent++;
    })
  );

  return NextResponse.json({ ok: true, emailsSent, weekOf });
}

