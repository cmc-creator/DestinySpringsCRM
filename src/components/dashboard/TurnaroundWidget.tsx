import { prisma } from "@/lib/prisma";

const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

function daysBetween(a: Date, b: Date) {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function turnaroundColor(days: number): string {
  if (days <= 1) return "#34d399";  // same/next day — excellent
  if (days <= 3) return "#60a5fa";  // 2-3 days — good
  if (days <= 7) return "#fbbf24";  // up to a week — fair
  return "#f87171";                 // over a week — slow
}

function turnaroundLabel(days: number): string {
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default async function TurnaroundWidget({ repId }: { repId?: string }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Fetch admitted referrals with an admissionDate, optionally filtered by rep
  const referrals = await prisma.referral.findMany({
    where: {
      admissionDate: { not: null },
      status: { in: ["ADMITTED"] },
      ...(repId
        ? { referralSource: { assignedRepId: repId } }
        : {}),
      createdAt: { gte: sixtyDaysAgo },
    },
    select: {
      id: true,
      createdAt: true,
      admissionDate: true,
      referralSource: { select: { id: true, name: true, type: true } },
    },
    orderBy: { admissionDate: "desc" },
  }).catch(() => []);

  if (referrals.length === 0) return null;

  // Split into current 30 days vs previous 30 days
  const current  = referrals.filter(r => r.createdAt >= thirtyDaysAgo);
  const previous = referrals.filter(r => r.createdAt < thirtyDaysAgo && r.createdAt >= sixtyDaysAgo);

  function avg(refs: typeof referrals) {
    if (refs.length === 0) return null;
    const total = refs.reduce((s, r) => s + daysBetween(r.createdAt, r.admissionDate!), 0);
    return Math.round(total / refs.length);
  }

  const avgCurrent  = avg(current);
  const avgPrevious = avg(previous);
  const trend = avgCurrent !== null && avgPrevious !== null
    ? avgCurrent - avgPrevious  // negative = faster (better)
    : null;

  // Per-source breakdown (current 30 days only)
  const bySource = new Map<string, { name: string; type: string; count: number; totalDays: number }>();
  for (const r of current) {
    const key = r.referralSource.id;
    const existing = bySource.get(key) ?? { name: r.referralSource.name, type: r.referralSource.type, count: 0, totalDays: 0 };
    existing.count++;
    existing.totalDays += daysBetween(r.createdAt, r.admissionDate!);
    bySource.set(key, existing);
  }
  const topSources = [...bySource.values()]
    .map(s => ({ ...s, avg: Math.round(s.totalDays / s.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const trendColor = trend === null ? TEXT_MUTED : trend < 0 ? "#34d399" : trend > 0 ? "#f87171" : "#fbbf24";
  const trendLabel = trend === null ? "—" : trend < 0 ? `↓ ${Math.abs(trend)}d faster` : trend > 0 ? `↑ ${trend}d slower` : "No change";

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: "20px 22px",
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            REFERRAL TURNAROUND TIME
          </p>
          <p style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>Referral received → patient admitted · last 30 days</p>
        </div>
        {trend !== null && (
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: trendColor, background: `${trendColor}18`, padding: "4px 10px", borderRadius: 6, border: `1px solid ${trendColor}44` }}>
            {trendLabel} vs prior 30 days
          </span>
        )}
      </div>

      {/* Big average stat */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 20 }}>
        <span style={{
          fontSize: "3rem",
          fontWeight: 900,
          lineHeight: 1,
          color: avgCurrent !== null ? turnaroundColor(avgCurrent) : TEXT_MUTED,
          textShadow: avgCurrent !== null ? `0 0 20px ${turnaroundColor(avgCurrent)}55` : "none",
        }}>
          {avgCurrent ?? "—"}
        </span>
        {avgCurrent !== null && (
          <span style={{ fontSize: "1rem", color: TEXT_MUTED, fontWeight: 500 }}>day avg</span>
        )}
        <span style={{ fontSize: "0.75rem", color: TEXT_MUTED, marginLeft: 4 }}>
          ({current.length} admission{current.length !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Per-source breakdown */}
      {topSources.length > 0 && (
        <>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            BY REFERRAL SOURCE
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topSources.map(s => {
              const color = turnaroundColor(s.avg);
              const maxAvg = Math.max(...topSources.map(x => x.avg), 1);
              const barWidth = Math.max(8, Math.round((s.avg / maxAvg) * 100));
              return (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Source name */}
                  <div style={{ width: 160, flexShrink: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                    <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>{s.type.replace(/_/g, " ")} · {s.count} referral{s.count !== 1 ? "s" : ""}</div>
                  </div>
                  {/* Bar */}
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barWidth}%`, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}66`, transition: "width 0.5s ease" }} />
                  </div>
                  {/* Value */}
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color, minWidth: 52, textAlign: "right" }}>
                    {turnaroundLabel(s.avg)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p style={{ marginTop: 14, fontSize: "0.65rem", color: TEXT_MUTED }}>
        Shorter is better · <span style={{ color: "#34d399" }}>■</span> same/next day &nbsp;
        <span style={{ color: "#60a5fa" }}>■</span> 2–3 days &nbsp;
        <span style={{ color: "#fbbf24" }}>■</span> up to 7 days &nbsp;
        <span style={{ color: "#f87171" }}>■</span> 7+ days
      </p>
    </div>
  );
}
