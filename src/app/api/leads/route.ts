import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const leads = await prisma.lead.findMany({
    include: { assignedRep: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
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
      ...(body.assignedRepId ? { assignedRepId: body.assignedRepId } : {}),
    };
    const lead = await prisma.lead.create({ data });
    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    console.error("Lead create error:", e);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
