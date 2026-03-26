import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

  let whereFilter: { assignedRepId?: string } = {};
  if (session.user.role === "REP") {
    const rep = await prisma.rep.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!rep) return NextResponse.json([]);
    whereFilter = { assignedRepId: rep.id };
  } else if (session.user.role !== "ADMIN") {
    // ACCOUNT users get an empty list — not an error (needed for AI insights panel)
    return NextResponse.json([]);
  }

  const leads = await prisma.lead.findMany({
    where: whereFilter,
    include: { assignedRep: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    // Bulk action support: { bulk: true, ids: string[], action: "status"|"assign"|"delete", value?: string }
    if (body.bulk && Array.isArray(body.ids)) {
      if (body.action === "delete") {
        await prisma.lead.deleteMany({ where: { id: { in: body.ids } } });
        return NextResponse.json({ ok: true, count: body.ids.length });
      }
      if (body.action === "status") {
        await prisma.lead.updateMany({ where: { id: { in: body.ids } }, data: { status: body.value } });
        return NextResponse.json({ ok: true, count: body.ids.length });
      }
      if (body.action === "assign") {
        await prisma.lead.updateMany({ where: { id: { in: body.ids } }, data: { assignedRepId: body.value || null } });
        return NextResponse.json({ ok: true, count: body.ids.length });
      }
      if (body.action === "followup") {
        await prisma.lead.updateMany({ where: { id: { in: body.ids } }, data: { nextFollowUp: body.value ? new Date(body.value) : null } });
        return NextResponse.json({ ok: true, count: body.ids.length });
      }
      return NextResponse.json({ error: "Unknown bulk action" }, { status: 400 });
    }

    // Whitelist only scalar Lead fields to prevent Prisma relation errors
    const data = {
      hospitalName: body.hospitalName,
      systemName: body.systemName ?? null,
      hospitalType: body.hospitalType ?? null,
      bedCount: body.bedCount ? Number(body.bedCount) : null,
      state: body.state ?? null,
      city: body.city ?? null,
      contactName: body.contactName ?? null,
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      contactTitle: body.contactTitle ?? null,
      serviceInterest: body.serviceInterest ?? null,
      estimatedValue: body.estimatedValue != null ? body.estimatedValue : null,
      notes: body.notes ?? null,
      status: body.status ?? "NEW",
      source: body.source ?? "OTHER",
      priority: body.priority ?? "MEDIUM",
      nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
      ...(body.assignedRepId ? { assignedRepId: body.assignedRepId } : {}),
    };
    const lead = await prisma.lead.create({ data });
    // Audit log
    await prisma.auditLog.create({
      data: { userId: session.user.id, userEmail: session.user.email ?? undefined, userName: session.user.name ?? undefined, action: "CREATE", resource: "Lead", resourceId: lead.id },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    console.error("Lead create error:", e);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

