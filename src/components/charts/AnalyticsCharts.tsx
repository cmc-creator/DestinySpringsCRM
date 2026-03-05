"use client";

const CYAN = "var(--nyx-accent)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";

const stageColors: Record<string, string> = {
  DISCOVERY:    "#94a3b8",
  QUALIFICATION:"#fbbf24",
  DEMO:         "#f59e0b",
  PROPOSAL:     "var(--nyx-accent)",
  NEGOTIATION:  "#60a5fa",
  CLOSED_WON:   "#34d399",
  CLOSED_LOST:  "#f87171",
  ON_HOLD:      "#64748b",
};

const statusColors: Record<string, string> = {
  NEW:           "var(--nyx-accent)",
  CONTACTED:     "#fbbf24",
  QUALIFIED:     "#f59e0b",
  PROPOSAL_SENT: "#60a5fa",
  NEGOTIATING:   "#a78bfa",
  WON:           "#34d399",
  LOST:          "#f87171",
  UNQUALIFIED:   "#64748b",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function HBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.75rem", color: color, fontWeight: 700 }}>{sub ?? value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease", boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  );
}



export type OppStageRow  = { stage: string; count: number; value: number };
export type LeadRow      = { status: string; count: number };
export type RepRow       = { id: string; name: string; opps: number; leads: number; value: number };
export type MonthRow     = { month: string; value: number };
export type HospTypeRow  = { type: string; count: number };

interface Props {
  oppsByStage:  OppStageRow[];
  leadsByStatus:LeadRow[];
  topReps:      RepRow[];
  monthlyRevenue: MonthRow[];
  hospitalMix:  HospTypeRow[];
  totalPipeline: number;
  closedWonValue: number;
  winRate: number;
  activeLeads: number;
  totalReps: number;
  totalHospitals: number;
}

export default function AnalyticsCharts({
  oppsByStage, leadsByStatus, topReps, monthlyRevenue,
  hospitalMix, totalPipeline, closedWonValue, winRate,
  activeLeads, totalReps, totalHospitals,
}: Props) {
  const maxOppValue  = Math.max(...oppsByStage.map(o => o.value), 1);
  const maxLeadCount = Math.max(...leadsByStatus.map(l => l.count), 1);
  const maxMonthRev  = Math.max(...monthlyRevenue.map(m => m.value), 1);
  const maxHospCount = Math.max(...hospitalMix.map(h => h.count), 1);

  const kpis = [
    { label: "Pipeline Value",   value: fmt(totalPipeline),         color: CYAN,      icon: "📊" },
    { label: "Closed Won",       value: fmt(closedWonValue),        color: "#34d399", icon: "✅" },
    { label: "Win Rate",         value: `${winRate}%`,              color: "#fbbf24", icon: "🎯" },
    { label: "Active Leads",     value: String(activeLeads),        color: "#a78bfa", icon: "🔍" },
    { label: "Active Reps",      value: String(totalReps),          color: "#60a5fa", icon: "🤝" },
    { label: "Total Accounts",   value: String(totalHospitals),     color: "#f59e0b", icon: "🏥" },
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
        {kpis.map(k => (
          <div key={k.label} className="gold-card" style={{ borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: "1.7rem", fontWeight: 900, color: k.color, textShadow: `0 0 20px ${k.color}55`, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Pipeline funnel + Monthly revenue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Pipeline by Stage — horizontal bars */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>PIPELINE FUNNEL</p>
          {oppsByStage.length === 0
            ? <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No opportunity data yet.</p>
            : oppsByStage.map(o => (
              <HBar
                key={o.stage}
                label={o.stage.replace(/_/g, " ")}
                value={o.value}
                max={maxOppValue}
                color={stageColors[o.stage] ?? CYAN}
                sub={`${o.count} opp${o.count !== 1 ? "s" : ""} · ${fmt(o.value)}`}
              />
            ))
          }
        </div>

        {/* Monthly Revenue — vertical bars */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>REVENUE TREND</p>
          {monthlyRevenue.length === 0
            ? <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No invoice data yet.</p>
            : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
                {monthlyRevenue.map((m) => {
                  const pct = maxMonthRev > 0 ? Math.max(4, (m.value / maxMonthRev) * 100) : 4;
                  const isHighest = m.value === maxMonthRev;
                  const barColor = isHighest ? "#34d399" : CYAN;
                  return (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "0.6rem", color: barColor, fontWeight: 700 }}>{fmt(m.value)}</span>
                      <div style={{ width: "100%", height: 115, display: "flex", alignItems: "flex-end" }}>
                        <div
                          title={`${m.month}: ${fmt(m.value)}`}
                          style={{
                            width: "100%",
                            height: `${pct}%`,
                            background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}55 100%)`,
                            borderRadius: "3px 3px 0 0",
                            boxShadow: isHighest ? `0 0 14px ${barColor}66` : "none",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.56rem", color: TEXT_MUTED }}>{m.month}</span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Row 2: Lead funnel + Rep leaderboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Lead Conversion Funnel */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>LEAD PIPELINE</p>
          {leadsByStatus.length === 0
            ? <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No lead data yet.</p>
            : leadsByStatus.map(l => (
              <HBar
                key={l.status}
                label={l.status.replace(/_/g, " ")}
                value={l.count}
                max={maxLeadCount}
                color={statusColors[l.status] ?? CYAN}
                sub={`${l.count} lead${l.count !== 1 ? "s" : ""}`}
              />
            ))
          }
        </div>

        {/* Rep Leaderboard */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>REP LEADERBOARD</p>
          {topReps.length === 0
            ? <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No rep data yet.</p>
            : topReps.map((rep, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                return (
                  <div key={rep.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 12px", background: i === 0 ? "var(--nyx-accent-dim)" : "transparent", borderRadius: 8, border: i === 0 ? `1px solid var(--nyx-accent-mid)` : "1px solid transparent" }}>
                    <span style={{ fontSize: "1rem", minWidth: 24 }}>{medal}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT }}>{rep.name}</div>
                      <div style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>{rep.opps} opps · {rep.leads} leads</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: CYAN }}>{fmt(rep.value)}</div>
                      <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>pipeline</div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* Row 3: Hospital mix + Win/Loss summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Hospital Mix */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>ACCOUNT MIX BY TYPE</p>
          {hospitalMix.length === 0
            ? <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No account data yet.</p>
            : hospitalMix.map((h, i) => {
                const colors = [CYAN, "#34d399", "#fbbf24", "#a78bfa", "#f59e0b", "#60a5fa"];
                return (
                  <HBar
                    key={h.type}
                    label={h.type.replace(/_/g, " ")}
                    value={h.count}
                    max={maxHospCount}
                    color={colors[i % colors.length]}
                    sub={`${h.count} account${h.count !== 1 ? "s" : ""}`}
                  />
                );
              })
          }
        </div>

        {/* Outcome Summary */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>WIN / LOSS SUMMARY</p>
          {(() => {
            const won  = oppsByStage.find(o => o.stage === "CLOSED_WON");
            const lost = oppsByStage.find(o => o.stage === "CLOSED_LOST");
            const open = oppsByStage.filter(o => !["CLOSED_WON","CLOSED_LOST"].includes(o.stage));
            const openCount = open.reduce((s, o) => s + o.count, 0);
            const openValue = open.reduce((s, o) => s + o.value, 0);
            const total = (won?.count ?? 0) + (lost?.count ?? 0);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: "#34d399" }}>{won?.count ?? 0}</div>
                    <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 2 }}>WON</div>
                    <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: 4 }}>{fmt(won?.value ?? 0)}</div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f87171" }}>{lost?.count ?? 0}</div>
                    <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 2 }}>LOST</div>
                    <div style={{ fontSize: "0.75rem", color: "#f87171", marginTop: 4 }}>{fmt(lost?.value ?? 0)}</div>
                  </div>
                  <div style={{ flex: 1, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: CYAN }}>{openCount}</div>
                    <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 2 }}>OPEN</div>
                    <div style={{ fontSize: "0.75rem", color: CYAN, marginTop: 4 }}>{fmt(openValue)}</div>
                  </div>
                </div>
                {total > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>Close rate</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fbbf24" }}>{winRate}%</span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                      <div style={{ height: "100%", width: `${winRate}%`, background: "#34d399", boxShadow: "0 0 8px #34d39966" }} />
                      <div style={{ height: "100%", width: `${100 - winRate}%`, background: "#f8717133" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
