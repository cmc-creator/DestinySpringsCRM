import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reps = await prisma.rep.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { opportunities: true, territories: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reps);
}
