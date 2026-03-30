import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTaskDueSoonEmail, sendTaskOverdueEmail } from "@/lib/email";

export const maxDuration = 30;

function safeCompare(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) {
      timingSafeEqual(ab, ab); // consume constant time
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

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Tasks due within the next 24 hours
  const dueSoon = await prisma.task.findMany({
    where: {
      dueAt: { gte: now, lte: tomorrow },
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [{ repId: { not: null } }, { createdByUserId: { not: null } }],
    },
    include: {
      rep: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  // Tasks already overdue and still open
  const overdue = await prisma.task.findMany({
    where: {
      dueAt: { lt: now },
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [{ repId: { not: null } }, { createdByUserId: { not: null } }],
    },
    include: {
      rep: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  // Batch-fetch users for tasks that only have createdByUserId (no rep)
  const creatorIds = [
    ...dueSoon.filter(t => !t.rep).map(t => t.createdByUserId),
    ...overdue.filter(t => !t.rep).map(t => t.createdByUserId),
  ].filter(Boolean) as string[];
  const creators = creatorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const creatorMap = Object.fromEntries(creators.map(u => [u.id, u]));

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "today";

  let created = 0;

  for (const task of dueSoon) {
    const notifyUserId = task.rep?.user?.id ?? task.createdByUserId;
    if (!notifyUserId) continue;
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        title: "Task Due Soon",
        body: `"${task.title}" is due ${fmt(task.dueAt)}.`,
        type: "WARNING",
        link: "/rep/tasks",
      },
    });
    created++;

    // Also email the user
    const userEmail = task.rep?.user?.email ?? creatorMap[task.createdByUserId ?? ""]?.email;
    const userName = task.rep?.user?.name ?? creatorMap[task.createdByUserId ?? ""]?.name ?? "";
    if (userEmail) {
      await sendTaskDueSoonEmail({
        to: userEmail,
        name: userName,
        taskTitle: task.title,
        dueDate: fmt(task.dueAt),
      });
    }
  }

  for (const task of overdue) {
    const notifyUserId = task.rep?.user?.id ?? task.createdByUserId;
    if (!notifyUserId) continue;
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        title: "Task Overdue",
        body: `"${task.title}" was due ${fmt(task.dueAt)} and is still open.`,
        type: "WARNING",
        link: "/rep/tasks",
      },
    });
    created++;

    // Also email the user
    const userEmail = task.rep?.user?.email ?? creatorMap[task.createdByUserId ?? ""]?.email;
    const userName = task.rep?.user?.name ?? creatorMap[task.createdByUserId ?? ""]?.name ?? "";
    if (userEmail) {
      await sendTaskOverdueEmail({
        to: userEmail,
        name: userName,
        taskTitle: task.title,
        dueDate: fmt(task.dueAt),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dueSoon: dueSoon.length,
    overdue: overdue.length,
    notificationsCreated: created,
  });
}
