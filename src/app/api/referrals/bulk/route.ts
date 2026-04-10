import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReferralStatus } from "@prisma/client";

const VALID_STATUSES = new Set(["RECEIVED", "ADMITTED", "DECLINED", "PENDING", "DUPLICATE"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json() as { ids?: unknown; status?: unknown };
    const { ids, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: "Batch too large (max 200)" }, { status: 400 });
    }
    if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    // Validate all IDs are strings
    if (!ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "All ids must be strings" }, { status: 400 });
    }

    const result = await prisma.referral.updateMany({
      where: { id: { in: ids as string[] } },
      data: { status: status as ReferralStatus },
    });

    // Auto-create follow-up tasks when marking referrals as ADMITTED
    if (status === "ADMITTED") {
      const admitted = await prisma.referral.findMany({
        where: { id: { in: ids as string[] } },
        select: {
          id: true,
          patientInitials: true,
          referralSource: { select: { name: true, assignedRepId: true } },
        },
      });
      for (const ref of admitted) {
        const repId = ref.referralSource?.assignedRepId;
        if (repId) {
          await prisma.task.create({
            data: {
              title: `Follow-up: ${ref.patientInitials ?? "Patient"} from ${ref.referralSource?.name ?? "referral source"}`,
              notes: "Auto-created on admission. Coordinate discharge planning and thank the referral source.",
              priority: "HIGH",
              status: "OPEN",
              dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              repId,
            },
          });
        }
      }
    }

    return NextResponse.json({ updated: result.count });
  } catch (e) {
    console.error("Bulk referral update error:", e);
    return NextResponse.json({ error: "Failed to update referrals" }, { status: 500 });
  }
}
