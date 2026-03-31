import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendContractExpiringEmail, sendContractExpiredEmail } from "@/lib/email";

export const maxDuration = 30;

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

  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "unknown";

  // ── Fetch all admin users for notifications / emails ──────────────────────
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
  });

  // ── Contracts expiring within the next 60 days (still ACTIVE) ─────────────
  const expiringSoon = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: now, lte: in60Days },
    },
    include: {
      hospital: { select: { hospitalName: true } },
    },
  });

  // ── Contracts that expired in the last 24 hours (still marked ACTIVE) ──────
  const justExpired = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: ago24h, lt: now },
    },
    include: {
      hospital: { select: { hospitalName: true } },
    },
  });

  let notificationsCreated = 0;
  let emailsSent = 0;
  let statusUpdated = 0;

  // ── Expiring Soon — bell + email to all admins ────────────────────────────
  for (const contract of expiringSoon) {
    const daysLeft = Math.ceil((new Date(contract.endDate!).getTime() - now.getTime()) / 86_400_000);
    const urgency = daysLeft <= 14 ? "WARNING" : "INFO";
    const hospitalName = contract.hospital?.hospitalName ?? "Unknown Hospital";

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: daysLeft <= 14 ? "Contract Expiring This Week" : "Contract Expiring Soon",
          body: `"${contract.title}" (${hospitalName}) ends ${fmt(contract.endDate ?? null)} — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`,
          type: urgency,
          link: "/admin/contracts",
        },
      });
      notificationsCreated++;

      if (admin.email) {
        await sendContractExpiringEmail({
          to: admin.email,
          contractTitle: contract.title,
          hospitalName,
          endsOn: fmt(contract.endDate ?? null),
          daysLeft,
        });
        emailsSent++;
      }
    }
  }

  // ── Just Expired — auto-update status, bell + email to all admins ──────────
  for (const contract of justExpired) {
    const hospitalName = contract.hospital?.hospitalName ?? "Unknown Hospital";

    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: "EXPIRED" },
    });
    statusUpdated++;

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Contract Expired",
          body: `"${contract.title}" (${hospitalName}) expired ${fmt(contract.endDate ?? null)} and has been marked Expired.`,
          type: "WARNING",
          link: "/admin/contracts",
        },
      });
      notificationsCreated++;

      if (admin.email) {
        await sendContractExpiredEmail({
          to: admin.email,
          contractTitle: contract.title,
          hospitalName,
          expiredOn: fmt(contract.endDate ?? null),
        });
        emailsSent++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    expiringSoon: expiringSoon.length,
    expiredToday: justExpired.length,
    statusUpdated,
    notificationsCreated,
    emailsSent,
  });
}
