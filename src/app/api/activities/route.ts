import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activities = await prisma.activity.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      hospital: { select: { hospitalName: true } },
      lead: { select: { hospitalName: true } },
      rep: { include: { user: { select: { name: true } } } },
    },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const activity = await prisma.activity.create({ data });
  return NextResponse.json(activity, { status: 201 });
}
