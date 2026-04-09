import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CompetitorIntelClient from "./CompetitorIntelClient";

export const dynamic = "force-dynamic";

export default async function CompetitorIntelPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!rep) redirect("/login");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // All sources assigned to this rep
  const rawSources = await prisma.referralSource.findMany({
    where: { assignedRepId: rep.id },
    select: {
      id: true,
      name: true,
      type: true,
      specialty: true,
      practiceName: true,
      contactName: true,
      city: true,
      state: true,
      tier: true,
      influenceLevel: true,
      competitorIntel: true,
      monthlyGoal: true,
      active: true,
    },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  const sourceIds = rawSources.map((s) => s.id);

  // Referral counts per source — last 30d and last 90d
  const referrals30 = await prisma.referral.groupBy({
    by: ["referralSourceId"],
    where: {
      referralSourceId: { in: sourceIds },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  });
  const referrals90 = await prisma.referral.groupBy({
    by: ["referralSourceId"],
    where: {
      referralSourceId: { in: sourceIds },
      createdAt: { gte: ninetyDaysAgo },
    },
    _count: { id: true },
  });

  const map30 = new Map(referrals30.map((r) => [r.referralSourceId, r._count.id]));
  const map90 = new Map(referrals90.map((r) => [r.referralSourceId, r._count.id]));

  const sources = rawSources.map((s) => ({
    id:              s.id,
    name:            s.name,
    type:            s.type as string,
    specialty:       s.specialty,
    practiceName:    s.practiceName,
    contactName:     s.contactName,
    city:            s.city,
    state:           s.state,
    tier:            s.tier,
    influenceLevel:  s.influenceLevel,
    competitorIntel: s.competitorIntel,
    monthlyGoal:     s.monthlyGoal,
    active:          s.active,
    refs30:          map30.get(s.id) ?? 0,
    refs90:          map90.get(s.id) ?? 0,
  }));

  return <CompetitorIntelClient sources={sources} />;
}
