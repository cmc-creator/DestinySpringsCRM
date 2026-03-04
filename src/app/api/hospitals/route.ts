import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
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
  const data = await req.json();
  const hospital = await prisma.hospital.create({ data });
  return NextResponse.json(hospital, { status: 201 });
}
