import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ hospitals: [], leads: [], opportunities: [], reps: [] });

  const lq = q.toLowerCase();
  const contains = (field: string) => ({ contains: field, mode: "insensitive" as const });

  const [hospitals, leads, opportunities, reps, referralSources] = await Promise.all([
    prisma.hospital.findMany({
      where: { OR: [{ hospitalName: contains(q) }, { city: contains(q) }, { state: contains(q) }, { primaryContactName: contains(q) }] },
      select: { id: true, hospitalName: true, city: true, state: true, status: true },
      take: 8,
    }),
    prisma.lead.findMany({
      where: { OR: [{ hospitalName: contains(q) }, { contactName: contains(q) }, { city: contains(q) }, { state: contains(q) }] },
      select: { id: true, hospitalName: true, contactName: true, status: true, city: true, state: true },
      take: 8,
    }),
    prisma.opportunity.findMany({
      where: { OR: [{ title: contains(q) }, { hospital: { hospitalName: contains(q) } }] },
      select: { id: true, title: true, stage: true, hospital: { select: { hospitalName: true } } },
      take: 8,
    }),
    session.user.role === "ADMIN"
      ? prisma.rep.findMany({
          where: { OR: [{ user: { name: contains(q) } }, { user: { email: contains(q) } }, { territory: contains(q) }] },
          select: { id: true, user: { select: { name: true, email: true } }, title: true, territory: true },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.referralSource.findMany({
      where: {
        OR: [
          { name: contains(q) },
          { contactName: contains(q) },
          { specialty: contains(q) },
          { city: contains(q) },
          { state: contains(q) },
        ],
      },
      select: { id: true, name: true, contactName: true, type: true, city: true, state: true, assignedRepId: true },
      take: 6,
    }),
  ]);

  return NextResponse.json({ hospitals, leads, opportunities, reps, referralSources, query: lq });
}
