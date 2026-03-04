import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

function safeCompare(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [newLeads, newOpportunities, newHospitals] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.opportunity.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.hospital.count({ where: { createdAt: { gte: oneWeekAgo } } }),
  ]);

  return NextResponse.json({
    ok: true,
    digest: {
      period: "weekly",
      newLeads,
      newOpportunities,
      newHospitals,
    },
  });
}
