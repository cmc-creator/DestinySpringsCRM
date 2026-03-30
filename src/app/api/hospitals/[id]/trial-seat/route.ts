import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type OrganizationRow = {
  id: string;
  seatLimit: number | null;
  subscriptionStatus: string | null;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    const hospital = await prisma.hospital.findUnique({
      where: { id },
      select: {
        id: true,
        hospitalName: true,
        user: { select: { organizationId: true } },
      },
    });

    if (!hospital?.user?.organizationId) {
      return NextResponse.json({ error: "Hospital organization not found" }, { status: 404 });
    }

    const organizationId = hospital.user.organizationId;
    const orgRows = await prisma.$queryRaw<OrganizationRow[]>`
      SELECT id, "seatLimit", "subscriptionStatus"
      FROM "organizations"
      WHERE id = ${organizationId}
      LIMIT 1
    `;
    const before = orgRows[0];

    if (!before) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (before.subscriptionStatus !== "trialing") {
      return NextResponse.json({ error: "Trial seat override is only available for trialing organizations" }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "organizations"
      SET "seatLimit" = COALESCE("seatLimit", 0) + 1
      WHERE id = ${organizationId}
        AND COALESCE("subscriptionStatus", '') = 'trialing'
    `;

    const afterRows = await prisma.$queryRaw<OrganizationRow[]>`
      SELECT id, "seatLimit", "subscriptionStatus"
      FROM "organizations"
      WHERE id = ${organizationId}
      LIMIT 1
    `;
    const after = afterRows[0];

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? undefined,
        userName: session.user.name ?? undefined,
        action: "UPDATE",
        resource: "OrganizationTrialSeat",
        resourceId: organizationId,
        diff: {
          before: {
            seatLimit: before.seatLimit,
            subscriptionStatus: before.subscriptionStatus,
          },
          after: {
            seatLimit: after?.seatLimit ?? before.seatLimit,
            subscriptionStatus: after?.subscriptionStatus ?? before.subscriptionStatus,
          },
          hospitalId: hospital.id,
          hospitalName: hospital.hospitalName,
          reason: reason || "Manual admin trial seat override",
          _meta: { source: "manual-trial-seat-override" },
        },
        ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      organizationId,
      seatLimit: after?.seatLimit ?? before.seatLimit,
      subscriptionStatus: after?.subscriptionStatus ?? before.subscriptionStatus,
    });
  } catch (error) {
    console.error("[hospitals/trial-seat] Error:", error);
    return NextResponse.json({ error: "Failed to grant trial seat" }, { status: 500 });
  }
}