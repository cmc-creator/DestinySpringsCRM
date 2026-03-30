import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  sendComplianceExpiringSoonEmail,
  sendComplianceExpiredAdminEmail,
} from "@/lib/email";

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
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "unknown";

  // Docs expiring within the next 30 days (still valid)
  const expiringSoon = await prisma.complianceDoc.findMany({
    where: {
      expiresAt: { gte: now, lte: in30Days },
    },
    include: {
      rep: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Docs already expired (expiresAt < now) — alert admin only, not rep repeatedly
  const expired = await prisma.complianceDoc.findMany({
    where: {
      expiresAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lt: now }, // expired in last 24h
    },
    include: {
      rep: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Fetch all admin users for expired-doc alerts
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
  });

  let notificationsCreated = 0;
  let emailsSent = 0;

  // ── Expiring Soon — notify & email the rep ──────────────────────────────────
  for (const doc of expiringSoon) {
    const userId = doc.rep.user.id;
    const daysLeft = Math.ceil((new Date(doc.expiresAt!).getTime() - now.getTime()) / 86400000);
    const urgency = daysLeft <= 7 ? "WARNING" : "INFO";

    await prisma.notification.create({
      data: {
        userId,
        title: daysLeft <= 7 ? "Compliance Doc Expiring This Week" : "Compliance Doc Expiring Soon",
        body: `"${doc.title}" expires ${fmt(doc.expiresAt)}.`,
        type: urgency,
        link: "/rep/documents",
      },
    });
    notificationsCreated++;

    if (doc.rep.user.email) {
      await sendComplianceExpiringSoonEmail({
        to: doc.rep.user.email,
        name: doc.rep.user.name ?? "",
        docTitle: doc.title,
        docType: doc.type,
        expiresOn: fmt(doc.expiresAt),
      });
      emailsSent++;
    }
  }

  // ── Just Expired — bell notification for rep + email for all admins ─────────
  for (const doc of expired) {
    const repUserId = doc.rep.user.id;

    // Rep: in-app notification
    await prisma.notification.create({
      data: {
        userId: repUserId,
        title: "Compliance Document Expired",
        body: `"${doc.title}" expired ${fmt(doc.expiresAt)}. Please renew immediately.`,
        type: "WARNING",
        link: "/rep/documents",
      },
    });
    notificationsCreated++;

    // Admins: in-app notification + email
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Rep Compliance Doc Expired",
          body: `${doc.rep.user.name ?? "A rep"}'s "${doc.title}" expired ${fmt(doc.expiresAt)}.`,
          type: "WARNING",
          link: "/admin/compliance",
        },
      });
      notificationsCreated++;

      if (admin.email) {
        await sendComplianceExpiredAdminEmail({
          to: admin.email,
          repName: doc.rep.user.name ?? doc.rep.user.email ?? "Unknown Rep",
          docTitle: doc.title,
          docType: doc.type,
          expiredOn: fmt(doc.expiresAt),
        });
        emailsSent++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    expiringSoon: expiringSoon.length,
    expiredToday: expired.length,
    notificationsCreated,
    emailsSent,
  });
}
