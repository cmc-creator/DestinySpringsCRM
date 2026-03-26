import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "REP")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const hospitals = await prisma.hospital.findMany({
    where: search ? {
      OR: [
        { hospitalName: { contains: search, mode: "insensitive" } },
        { systemName: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
      ],
    } : {},
    include: { user: { select: { name: true, email: true } }, _count: { select: { opportunities: true, contacts: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(hospitals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { portalEmail, ...rest } = body;

    if (!portalEmail) return NextResponse.json({ error: "Portal email is required" }, { status: 400 });
    if (!rest.hospitalName) return NextResponse.json({ error: "Hospital name is required" }, { status: 400 });

    // Check email isn't already taken
    const existing = await prisma.user.findUnique({ where: { email: portalEmail } });
    if (existing) return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });

    // Auto-create a portal User for the hospital, then create the Hospital linked to it
    const hospital = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: portalEmail,
          name: rest.primaryContactName ?? rest.hospitalName,
          role: "ACCOUNT",
        },
      });
      return tx.hospital.create({
        data: {
          userId: user.id,
          hospitalName: rest.hospitalName,
          systemName: rest.systemName ?? null,
          hospitalType: rest.hospitalType ?? "ACUTE_CARE",
          status: rest.status ?? "PROSPECT",
          bedCount: rest.bedCount ? Number(rest.bedCount) : null,
          address: rest.address ?? null,
          city: rest.city ?? null,
          state: rest.state ?? null,
          zip: rest.zip ?? null,
          primaryContactName: rest.primaryContactName ?? null,
          primaryContactTitle: rest.primaryContactTitle ?? null,
          primaryContactEmail: rest.primaryContactEmail ?? null,
          primaryContactPhone: rest.primaryContactPhone ?? null,
          notes: rest.notes ?? null,
          source: rest.source ?? null,
        },
        include: { user: { select: { name: true, email: true } }, _count: { select: { opportunities: true, contacts: true } } },
      });
    });

    return NextResponse.json(hospital, { status: 201 });
  } catch (e) {
    console.error("Hospital create error:", e);
    return NextResponse.json({ error: "Failed to create hospital" }, { status: 500 });
  }
}
