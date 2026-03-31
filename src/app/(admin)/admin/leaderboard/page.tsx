import { prisma } from "@/lib/prisma";
import Link from "next/link";

const GOLD   = "var(--nyx-accent)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 3;
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, boxShadow: `0 0 8px ${color}88`, transition: "width 0.6s ease" }} />
    </div>
  );
}

export default async function LeaderboardPage() {
  const now      = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const reps = await prisma.rep.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: { select: { name: true, email: true } },
      opportunities: {
        select: { stage: true, value: true, updatedAt: true },
      },
      activities: {
        where: { createdAt: { gte: monthStart } },
        select: { id: true },
      },
    },
  });

  interface RepRow {
    id: string;
    name: string;
    admissionsThisMonth: number;
    admissionsLastMonth: number;
    pipelineValue: number;
    activitiesThisMonth: number;
    score: number;
  }

  const rows: RepRow[] = reps.map((rep) => {
    const admissionsThisMonth = rep.opportunities.filter(
      (o) => o.stage === "DISCHARGED" && o.updatedAt >= monthStart
    ).length;
    const admissionsLastMonth = rep.opportunities.filter(
      (o) => o.stage === "DISCHARGED" && o.updatedAt >= lastMonthStart && o.updatedAt <= lastMonthEnd
    ).length;
    const pipelineValue = rep.opportunities
      .filter((o) => !["DISCHARGED", "DECLINED"].includes(o.stage))
      .reduce((s, o) => s + Number(o.value ?? 0), 0);
    const activitiesThisMonth = rep.activities.length;

    // Score: admissions×40 + pipeline_value/1000 (capped 30) + activities×2 (capped 30)
    const score = Math.min(100,
      admissionsThisMonth * 40 +
      Math.min(30, pipelineValue / 1_000) +
      Math.min(30, activitiesThisMonth * 2)
    );

    return {
      id: rep.id,
      name: rep.user.name ?? rep.user.email ?? "Unknown",
      admissionsThisMonth,
      admissionsLastMonth,
      pipelineValue,
      activitiesThisMonth,
      score,
    };
  });

  // Sort: admissions desc, then pipeline value
  rows.sort((a, b) => b.admissionsThisMonth - a.admissionsThisMonth || b.pipelineValue - a.pipelineValue);

  // Rank change vs last month (same sort on last-month data)
  const lastMonthRows = [...rows].sort(
    (a, b) => b.admissionsLastMonth - a.admissionsLastMonth || b.pipelineValue - a.pipelineValue
  );
  const lastMonthRank = Object.fromEntries(lastMonthRows.map((r, i) => [r.id, i + 1]));

  const maxAdmissions = Math.max(...rows.map((r) => r.admissionsThisMonth), 1);
  const maxPipeline   = Math.max(...rows.map((r) => r.pipelineValue), 1);
  const maxActivities = Math.max(...rows.map((r) => r.activitiesThisMonth), 1);

  const MEDALS = ["🥇", "🥈", "🥉"];
  const PODIUM_BORDER = ["var(--nyx-accent-str)", "rgba(148,163,184,0.5)", "rgba(180,120,60,0.5)"];
  const PODIUM_BG    = ["var(--nyx-accent-dim)", "rgba(148,163,184,0.07)", "rgba(180,120,60,0.07)"];

  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>PERFORMANCE</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, marginBottom: 4 }}>Rep Leaderboard</h1>
        <p style={{ color: MUTED, fontSize: "0.875rem" }}>{monthLabel} · Ranked by admissions closed this month</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: MUTED }}>No active reps found.</div>
      ) : (
        <>
          {/* ── Podium top 3 ──────────────────────────────────────────── */}
          {rows.length >= 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
              {rows.slice(0, 3).map((rep, i) => {
                const currentRank = i + 1;
                const prevRank    = lastMonthRank[rep.id] ?? currentRank;
                const rankDelta   = prevRank - currentRank;
                return (
                  <div key={rep.id} style={{ background: PODIUM_BG[i], border: `1px solid ${PODIUM_BORDER[i]}`, borderRadius: 14, padding: "22px 20px", position: "relative" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>{MEDALS[i]}</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: TEXT, marginBottom: 2 }}>{rep.name}</div>
                    <div style={{ fontSize: "2.2rem", fontWeight: 900, color: i === 0 ? GOLD : TEXT, lineHeight: 1, marginBottom: 4, textShadow: i === 0 ? "0 0 24px var(--nyx-accent-str)" : "none" }}>
                      {rep.admissionsThisMonth}
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: MUTED, marginLeft: 4 }}>admissions</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: MUTED, marginBottom: 6 }}>
                      {fmt(rep.pipelineValue)} pipeline · {rep.activitiesThisMonth} activities
                    </div>
                    {rankDelta !== 0 && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: rankDelta > 0 ? "#34d399" : "#f87171", background: rankDelta > 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: 20 }}>
                        {rankDelta > 0 ? `▲ +${rankDelta}` : `▼ ${rankDelta}`} vs last month
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Full table ────────────────────────────────────────────── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>ALL REPS — {monthLabel.toUpperCase()}</p>
            </div>

            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 130px 90px 80px", gap: 0, padding: "10px 20px", borderBottom: `1px solid ${BORDER}` }}>
              {["#", "REP", "ADMISSIONS", "PIPELINE", "ACTIVITIES", "TREND"].map((h) => (
                <span key={h} style={{ fontSize: "0.62rem", fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {rows.map((rep, i) => {
              const currentRank = i + 1;
              const prevRank    = lastMonthRank[rep.id] ?? currentRank;
              const rankDelta   = prevRank - currentRank;
              const isTop3      = i < 3;
              return (
                <div
                  key={rep.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 120px 130px 90px 80px",
                    gap: 0,
                    padding: "14px 20px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : "none",
                    background: isTop3 ? "rgba(255,255,255,0.01)" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{i < 3 ? MEDALS[i] : <span style={{ fontSize: "0.82rem", color: MUTED, fontWeight: 700 }}>{currentRank}</span>}</span>

                  <div>
                    <Link href={`/admin/reps`} style={{ fontSize: "0.88rem", fontWeight: 700, color: TEXT, textDecoration: "none" }}>{rep.name}</Link>
                    <ScoreBar value={rep.score} max={100} color={isTop3 ? GOLD : "rgba(255,255,255,0.25)"} />
                  </div>

                  <div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: isTop3 ? GOLD : TEXT }}>{rep.admissionsThisMonth}</span>
                    <ScoreBar value={rep.admissionsThisMonth} max={maxAdmissions} color="#34d399" />
                  </div>

                  <div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: GOLD }}>{fmt(rep.pipelineValue)}</span>
                    <ScoreBar value={rep.pipelineValue} max={maxPipeline} color={GOLD} />
                  </div>

                  <div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#60a5fa" }}>{rep.activitiesThisMonth}</span>
                    <ScoreBar value={rep.activitiesThisMonth} max={maxActivities} color="#60a5fa" />
                  </div>

                  <div>
                    {rankDelta === 0 ? (
                      <span style={{ fontSize: "0.72rem", color: MUTED }}>—</span>
                    ) : (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: rankDelta > 0 ? "#34d399" : "#f87171" }}>
                        {rankDelta > 0 ? `▲ +${rankDelta}` : `▼ ${rankDelta}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
