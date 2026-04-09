import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyContactsClient from "./MyContactsClient";

export const dynamic = "force-dynamic";

export default async function MyContactsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!rep) redirect("/login");

  // Fetch sources assigned to this rep, including referral count
  const rawSources = await prisma.referralSource.findMany({
    where: { assignedRepId: rep.id },
    include: {
      _count: { select: { referrals: true } },
    },
    orderBy: [
      { tier: "asc" },
      { name: "asc" },
    ],
  });

  // For each source, find the most recent activity date
  const sourceIds = rawSources.map((s) => s.id);
  const lastActivities = await prisma.activity.findMany({
    where: { referralSourceId: { in: sourceIds } },
    orderBy: { completedAt: "desc" },
    select: { referralSourceId: true, completedAt: true, createdAt: true },
  });

  // Build a map: sourceId → most recent activity date
  const lastContactMap = new Map<string, Date>();
  for (const act of lastActivities) {
    const sourceId = act.referralSourceId;
    if (!sourceId) continue;
    const date = act.completedAt ?? act.createdAt;
    if (!lastContactMap.has(sourceId) || date > lastContactMap.get(sourceId)!) {
      lastContactMap.set(sourceId, date);
    }
  }

  const sources = rawSources.map((s) => ({
    id:              s.id,
    name:            s.name,
    type:            s.type,
    specialty:       s.specialty,
    practiceName:    s.practiceName,
    contactName:     s.contactName,
    email:           s.email,
    phone:           s.phone,
    address:         s.address,
    city:            s.city,
    state:           s.state,
    zip:             s.zip,
    tier:            s.tier,
    lastContactDate: lastContactMap.get(s.id)?.toISOString() ?? null,
    referralCount:   s._count.referrals,
    active:          s.active,
  }));

  return <MyContactsClient sources={sources} />;
}
