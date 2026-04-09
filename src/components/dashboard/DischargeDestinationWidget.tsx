import { prisma } from "@/lib/prisma";

type DestinationCount = {
  destination: string;
  count: number;
};

async function getDischargeDestinations(repId?: string): Promise<DestinationCount[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const referrals = await prisma.referral.findMany({
    where: {
      dischargeDate: { gte: since },
      notes: { contains: "Referred Out To:", mode: "insensitive" },
      ...(repId
        ? {
            referralSource: {
              assignedRepId: repId,
            },
          }
        : {}),
    },
    select: { notes: true, dischargeDate: true },
  });

  const counts = new Map<string, number>();
  const tagRe = /Referred Out To:\s*([^\n\r]+)/i;

  for (const ref of referrals) {
    const match = ref.notes?.match(tagRe);
    if (!match) continue;
    const dest = match[1].trim();
    if (!dest) continue;
    const key = dest.toLowerCase();
    // Group similar destinations (case-insensitive)
    const existing = [...counts.keys()].find((k) => k === key);
    counts.set(existing ?? key, (counts.get(existing ?? key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([destination, count]) => ({
      destination: destination.replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default async function DischargeDestinationWidget({ repId }: { repId?: string }) {
  const destinations = await getDischargeDestinations(repId);
  const total = destinations.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-widest">
            Discharge Destinations
          </h3>
          <p className="text-xs text-white/50 mt-0.5">Where patients go after discharge · last 30 days</p>
        </div>
        <span className="text-2xl">🏥</span>
      </div>

      {destinations.length === 0 ? (
        <p className="text-sm text-white/40 italic text-center py-4">
          No discharge destination data in the last 30 days
        </p>
      ) : (
        <div className="space-y-2">
          {destinations.map(({ destination, count }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={destination}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-white/80 truncate max-w-[70%]">{destination}</span>
                  <span className="text-xs text-white/50 tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400/70 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-white/30 pt-1">
            {total} total discharge{total !== 1 ? "s" : ""} · synced from SharePoint
          </p>
        </div>
      )}
    </div>
  );
}
