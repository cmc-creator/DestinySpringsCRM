import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendLowCensusEmail } from "@/lib/email";

export const maxDuration = 30;

// Alert when available beds fall to 8 or fewer, OR below 15% of total
const BED_COUNT_THRESHOLD = 8;
const BED_PCT_THRESHOLD = 0.15;

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

  // Fetch today's snapshot (must be from today to avoid re-alerting on stale data)
  const snapshot = await prisma.censusSnapshot.findFirst({
    orderBy: { date: "desc" },
  });

  if (!snapshot) {
    return NextResponse.json({ ok: true, skipped: "no snapshot found" });
  }

  // Only process if the snapshot date is today (UTC)
  const snapshotDateStr = snapshot.date.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (snapshotDateStr !== todayStr) {
    return NextResponse.json({ ok: true, skipped: "snapshot is not from today", snapshotDate: snapshotDateStr });
  }

  const totalAvailable =
    snapshot.adultAvailable +
    snapshot.adolescentAvailable +
    snapshot.geriatricAvailable +
    snapshot.dualDxAvailable;

  const totalBeds =
    snapshot.adultTotal +
    snapshot.adolescentTotal +
    snapshot.geriatricTotal +
    snapshot.dualDxTotal;

  const pct = totalBeds > 0 ? totalAvailable / totalBeds : 0;
  const isLow = totalAvailable <= BED_COUNT_THRESHOLD || pct < BED_PCT_THRESHOLD;

  if (!isLow) {
    return NextResponse.json({ ok: true, skipped: "census is not low", totalAvailable, totalBeds });
  }

  const dateLabel = snapshot.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Collect all ADMIN users + active rep users to notify
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true },
  });

  const activeReps = await prisma.rep.findMany({
    where: { status: "ACTIVE" },
    select: { user: { select: { id: true, email: true, name: true } } },
  });

  const repUsers = activeReps.map((r) => r.user).filter(Boolean) as { id: string; email: string; name: string | null }[];

  // De-duplicate in case an admin is also a rep
  const seen = new Set<string>();
  const recipients: { id: string; email: string; name: string | null }[] = [];
  for (const u of [...adminUsers, ...repUsers]) {
    if (!seen.has(u.id)) {
      seen.add(u.id);
      recipients.push(u);
    }
  }

  let notificationsCreated = 0;

  for (const user of recipients) {
    // In-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Low Census Alert",
        body: `Only ${totalAvailable} bed${totalAvailable === 1 ? "" : "s"} available (${Math.round(pct * 100)}% capacity). Push referrals now.`,
        type: "WARNING",
        link: "/rep/bedboard",
      },
    });
    notificationsCreated++;

    // Email
    if (user.email) {
      await sendLowCensusEmail({
        to: user.email,
        name: user.name ?? "",
        totalAvailable,
        totalBeds,
        date: dateLabel,
      });
    }
  }

  return NextResponse.json({ ok: true, totalAvailable, totalBeds, notificationsCreated });
}
