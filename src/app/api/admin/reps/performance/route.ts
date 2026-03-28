import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type RepPaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reps = await prisma.rep.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { opportunities: true, activities: true } },
      activities: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      payments: {
        select: { amount: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const userIds = reps.map((rep) => rep.user.id);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const loginEvents = userIds.length
    ? await prisma.auditLog.findMany({
        where: {
          action: "LOGIN_SUCCESS",
          resource: "User",
          userId: { in: userIds },
        },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const lastLoginByUser = new Map<string, string>();
  const logins30dByUser = new Map<string, number>();
  for (const event of loginEvents) {
    if (!lastLoginByUser.has(event.userId)) {
      lastLoginByUser.set(event.userId, event.createdAt.toISOString());
    }
    if (event.createdAt >= since30d) {
      logins30dByUser.set(event.userId, (logins30dByUser.get(event.userId) ?? 0) + 1);
    }
  }

  const data = reps.map((rep) => {
    const paidStatuses = new Set<RepPaymentStatus>(["PAID"]);
    const pendingStatuses = new Set<RepPaymentStatus>(["PENDING", "PROCESSING"]);

    const totalPaid = rep.payments
      .filter((payment) => paidStatuses.has(payment.status as RepPaymentStatus))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const totalPending = rep.payments
      .filter((payment) => pendingStatuses.has(payment.status as RepPaymentStatus))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      repId: rep.id,
      userId: rep.user.id,
      name: rep.user.name ?? rep.user.email,
      email: rep.user.email,
      status: rep.status,
      title: rep.title,
      opportunities: rep._count.opportunities,
      activities: rep._count.activities,
      lastActivityAt: rep.activities[0]?.createdAt?.toISOString() ?? null,
      lastLoginAt: lastLoginByUser.get(rep.user.id) ?? null,
      loginCount30d: logins30dByUser.get(rep.user.id) ?? 0,
      totalPaid,
      totalPending,
    };
  });

  return NextResponse.json({ reps: data });
}