import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import VisitPrepClient from "./VisitPrepClient";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based talking points — no LLM call; computed instantly from rep data
// ─────────────────────────────────────────────────────────────────────────────
function buildTalkingPoints(opts: {
  daysSinceContact: number | null;
  referralsThis90: number;
  referralsPrev90: number;
  tier: string | null;
  competitorIntel: string | null;
  monthlyGoal: number | null;
}): string[] {
  const { daysSinceContact, referralsThis90, referralsPrev90, tier, competitorIntel, monthlyGoal } = opts;
  const pts: string[] = [];

  // — Recency
  if (daysSinceContact === null) {
    pts.push("First visit — introduce yourself, leave materials, and ask about their most complex ongoing cases.");
  } else if (daysSinceContact > 30) {
    pts.push("It's been over a month. Open with a warm check-in and ask if anything has changed in their caseload.");
  } else if (daysSinceContact > 14) {
    pts.push("2+ weeks since last contact. Follow up on anything discussed last time and share a recent outcome story.");
  } else if (daysSinceContact <= 7) {
    pts.push("Recent contact — keep it brief. A quick check-in reinforces the relationship without over-visiting.");
  }

  // — Volume trend
  const delta = referralsThis90 - referralsPrev90;
  if (referralsThis90 === 0 && referralsPrev90 === 0) {
    pts.push("No referrals yet. Discuss ideal patient profiles, admission criteria, and how to reach the on-call team.");
  } else if (delta <= -3) {
    pts.push(`Volume dropped ${Math.abs(delta)} referrals vs last quarter. Ask if there are access or process barriers — address them directly.`);
  } else if (delta >= 3) {
    pts.push(`Strong momentum — up ${delta} referrals vs last quarter. Thank them and discuss what's working so you can sustain it.`);
  } else if (referralsThis90 > 0) {
    pts.push("Volume is holding steady. Share a positive patient outcome or a recent program enhancement to stay top of mind.");
  }

  // — Monthly goal gap
  if (monthlyGoal && referralsThis90 > 0) {
    const monthlyAvg = Math.round(referralsThis90 / 3);
    if (monthlyAvg < monthlyGoal * 0.6) {
      pts.push(`Currently averaging ~${monthlyAvg}/mo vs a goal of ${monthlyGoal}. Explore what would help increase volume — education, access, or trust-building.`);
    }
  }

  // — Tier-specific angle
  if (tier === "TIER_1") {
    pts.push("Tier 1 account. Prioritize relationship depth — ask about staff changes, continuing education needs, or co-marketing opportunities.");
  } else if (tier === "TIER_3") {
    pts.push("Tier 3 account. Identify a champion. One strong referral can shift their confidence and unlock more volume.");
  }

  // — Competitor intel
  if (competitorIntel) {
    pts.push(`Intel: ${competitorIntel}`);
  }

  return pts;
}

export default async function VisitPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!rep) redirect("/login");

  // Security: only show sources assigned to this rep
  const source = await prisma.referralSource.findFirst({
    where: { id, assignedRepId: rep.id },
    select: {
      id: true,
      name: true,
      type: true,
      specialty: true,
      practiceName: true,
      contactName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      tier: true,
      notes: true,
      competitorIntel: true,
      monthlyGoal: true,
      influenceRole: true,
      influenceLevel: true,
    },
  });
  if (!source) notFound();

  // Last 5 activities for this source
  const lastActivities = await prisma.activity.findMany({
    where: { referralSourceId: id },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: {
      id: true,
      type: true,
      title: true,
      notes: true,
      completedAt: true,
      createdAt: true,
    },
  });

  // 90-day referral counts (this period vs previous)
  const now = new Date();
  const d90 = new Date(now);
  d90.setDate(now.getDate() - 90);
  const d180 = new Date(now);
  d180.setDate(now.getDate() - 180);

  const [referralsThis90, referralsPrev90] = await Promise.all([
    prisma.referral.count({ where: { referralSourceId: id, createdAt: { gte: d90 } } }),
    prisma.referral.count({ where: { referralSourceId: id, createdAt: { gte: d180, lt: d90 } } }),
  ]);

  // Monthly referrals for last 6 months (for mini bar chart)
  const d6m = new Date(now);
  d6m.setMonth(now.getMonth() - 6);
  const monthlyRaw = await prisma.referral.findMany({
    where: { referralSourceId: id, createdAt: { gte: d6m } },
    select: { createdAt: true },
  });

  const monthMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthMap.set(key, 0);
  }
  for (const r of monthlyRaw) {
    const key = new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const monthlyReferrals = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));

  // Days since last contact (for talking points + recency badge)
  const lastActDate = lastActivities[0]?.completedAt ?? lastActivities[0]?.createdAt ?? null;
  const daysSinceContact = lastActDate
    ? Math.floor((Date.now() - new Date(lastActDate).getTime()) / 86_400_000)
    : null;

  const talkingPoints = buildTalkingPoints({
    daysSinceContact,
    referralsThis90,
    referralsPrev90,
    tier: source.tier,
    competitorIntel: source.competitorIntel,
    monthlyGoal: source.monthlyGoal,
  });

  return (
    <VisitPrepClient
      source={source}
      lastActivities={lastActivities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        notes: a.notes,
        completedAt: a.completedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
      referralsThis90={referralsThis90}
      referralsPrev90={referralsPrev90}
      monthlyReferrals={monthlyReferrals}
      talkingPoints={talkingPoints}
      daysSinceContact={daysSinceContact}
    />
  );
}
