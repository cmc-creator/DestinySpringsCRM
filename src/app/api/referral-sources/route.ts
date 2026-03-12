export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repId   = searchParams.get("repId") ?? undefined;
  const active  = searchParams.get("active");
  const type    = searchParams.get("type") ?? undefined;
  const search  = searchParams.get("q") ?? undefined;

  const sources = await prisma.referralSource.findMany({
    where: {
      ...(repId  ? { assignedRepId: repId } : {}),
      ...(active !== null ? { active: active !== "false" } : {}),
      ...(type   ? { type: type as never } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      assignedRep: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { referrals: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, type, specialty, practiceName, npi,
    contactName, email, phone,
    address, city, state, zip,
    assignedRepId, monthlyGoal, notes,
  } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const source = await prisma.referralSource.create({
    data: {
      name,
      type: type ?? "PHYSICIAN",
      specialty,
      practiceName,
      npi,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      assignedRepId: assignedRepId || null,
      monthlyGoal: monthlyGoal ? Number(monthlyGoal) : null,
      notes,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
