import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

const GOLD = "#c9a84c";
const C = {
  border: "rgba(201,168,76,0.15)",
  text: "#ede4cf",
  muted: "rgba(237,228,207,0.45)",
  card: "rgba(255,255,255,0.03)",
};

const ACT_COLORS: Record<string, string> = {
  CALL: "#60a5fa", EMAIL: "#c084fc", NOTE: "#94a3b8", MEETING: "#34d399",
  LUNCH: "#fb923c", TASK: "#86efac", PROPOSAL_SENT: "#fcd34d",
  CONTRACT_SENT: "#6ee7b7", DEMO_COMPLETED: "#22d3ee", SITE_VISIT: "#fbbf24",
  CONFERENCE: "#a78bfa", FOLLOW_UP: "#f87171", IN_SERVICE: "#f59e0b",
  FACILITY_TOUR: "#38bdf8", CE_PRESENTATION: "#e879f9", CRISIS_CONSULT: "#ef4444",
  LUNCH_AND_LEARN: "#fb923c", COMMUNITY_EVENT: "#4ade80",
  REFERRAL_RECEIVED: "#fbbf24", DISCHARGE_PLANNING: "#34d399",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default async function RepPerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rep = await prisma.rep.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      territories: { select: { state: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { type: true, createdAt: true, completedAt: true, title: true, hospital: { select: { hospitalName: true } } },
      },
      opportunities: {
        select: { id: true, title: true, stage: true, value: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      },
      leads: {
        select: { id: true, hospitalName: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!rep) notFound();

  // Activity breakdown by type
  const actByType = new Map<string, number>();
  for (const a of rep.activities) {
    actByType.set(a.type, (actByType.get(a.type) ?? 0) + 1);
  }
  const actBreakdown = Array.from(actByType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
  const maxAct = Math.max(...actBreakdown.map(a => a.count), 1);

  // Monthly activity trend (last 6 months)
  const monthlyAct = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyAct.set(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), 0);
  }
  for (const a of rep.activities) {
    const d = new Date(a.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (monthlyAct.has(key)) monthlyAct.set(key, (monthlyAct.get(key) ?? 0) + 1);
  }
  const monthlyActData = Array.from(monthlyAct.entries()).map(([k, v]) => ({ month: k.split(" ")[0], count: v }));
  const maxMonthlyAct = Math.max(...monthlyActData.map(m => m.count), 1);

  // Pipeline stats
  const pipeline = rep.opportunities.filter(o => !["DISCHARGED", "DECLINED"].includes(o.stage));
  const pipelineValue = pipeline.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const wonOpps = rep.opportunities.filter(o => o.stage === "DISCHARGED");
  const wonValue = wonOpps.reduce((s, o) => s + Number(o.value ?? 0), 0);

  // Lead stats
  const openLeads = rep.leads.filter(l => ["NEW", "CONTACTED", "QUALIFIED"].includes(l.status)).length;

  const stageColors: Record<string, string> = {
    INQUIRY: "#94a3b8", CLINICAL_REVIEW: "#fbbf24", INSURANCE_AUTH: "#f59e0b",
    ADMITTED: GOLD, ACTIVE: "#60a5fa", DISCHARGED: "#34d399", DECLINED: "#f87171", ON_HOLD: "#64748b",
  };

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "rgba(201,168,76,0.7)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
          <Link href="/admin/reps" style={{ color: "inherit", textDecoration: "none" }}>← REPS</Link>
          {" / PERFORMANCE"}
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
          {rep.user.name ?? rep.user.email}
        </h1>
        <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>
          {rep.title ?? "Sales Rep"}{rep.territories.length > 0 && ` · ${rep.territories.map(t => t.state).join(", ")}`}
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Activities", value: rep.activities.length, color: GOLD, icon: "⚡" },
          { label: "Pipeline Value", value: fmt(pipelineValue), color: "var(--nyx-accent)", icon: "📊" },
          { label: "Open Opps", value: pipeline.length, color: "#60a5fa", icon: "🔁" },
          { label: "Won Value", value: fmt(wonValue), color: "#34d399", icon: "✅" },
          { label: "Open Leads", value: openLeads, color: "#a78bfa", icon: "🔍" },
          { label: "Total Leads", value: rep.leads.length, color: "#fbbf24", icon: "📋" },
        ].map(k => (
          <div key={k.label} className="gold-card" style={{ borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Activity by type */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18, margin: "0 0 18px" }}>
            ACTIVITY BREAKDOWN
          </p>
          {actBreakdown.length === 0
            ? <p style={{ color: C.muted, fontSize: "0.85rem" }}>No activities yet.</p>
            : actBreakdown.map(({ type, count }) => {
              const pct = Math.max(2, (count / maxAct) * 100);
              const color = ACT_COLORS[type] ?? GOLD;
              return (
                <div key={type} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.75rem", color: C.text, fontWeight: 600 }}>{type.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: "0.72rem", color, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, boxShadow: `0 0 8px ${color}66` }} />
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Monthly activity trend */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 18px" }}>
            MONTHLY ACTIVITY TREND
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
            {monthlyActData.map(m => {
              const pct = maxMonthlyAct > 0 ? Math.max(4, (m.count / maxMonthlyAct) * 100) : 4;
              return (
                <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.65rem", color: GOLD, fontWeight: 700 }}>{m.count}</span>
                  <div style={{ width: "100%", height: 115, display: "flex", alignItems: "flex-end" }}>
                    <div
                      title={`${m.month}: ${m.count} activities`}
                      style={{ width: "100%", height: `${pct}%`, background: `linear-gradient(180deg, ${GOLD} 0%, ${GOLD}55 100%)`, borderRadius: "3px 3px 0 0" }}
                    />
                  </div>
                  <span style={{ fontSize: "0.6rem", color: C.muted }}>{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Recent opportunities */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 18px" }}>
            OPPORTUNITIES
          </p>
          {rep.opportunities.length === 0
            ? <p style={{ color: C.muted, fontSize: "0.85rem" }}>No opportunities.</p>
            : rep.opportunities.slice(0, 10).map(o => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ flex: 1, fontSize: "0.8rem", color: C.text }}>{o.title}</span>
                <span style={{ fontSize: "0.68rem", color: stageColors[o.stage] ?? GOLD, fontWeight: 700, whiteSpace: "nowrap" }}>{o.stage.replace(/_/g, " ")}</span>
                {o.value && <span style={{ fontSize: "0.78rem", color: "var(--nyx-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(Number(o.value))}</span>}
              </div>
            ))
          }
        </div>

        {/* Recent leads */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 18px" }}>
            LEADS
          </p>
          {rep.leads.length === 0
            ? <p style={{ color: C.muted, fontSize: "0.85rem" }}>No leads assigned.</p>
            : rep.leads.slice(0, 10).map(l => {
              const statusColors: Record<string, string> = {
                NEW: GOLD, CONTACTED: "#fbbf24", QUALIFIED: "#f59e0b",
                PROPOSAL_SENT: "#60a5fa", NEGOTIATING: "#a78bfa", WON: "#34d399",
                LOST: "#f87171", UNQUALIFIED: "#64748b",
              };
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ flex: 1, fontSize: "0.8rem", color: C.text }}>{l.hospitalName}</span>
                  <span style={{ fontSize: "0.68rem", color: statusColors[l.status] ?? GOLD, fontWeight: 700 }}>{l.status}</span>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Recent activities list */}
      <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 18px" }}>
          RECENT ACTIVITIES
        </p>
        {rep.activities.length === 0
          ? <p style={{ color: C.muted, fontSize: "0.85rem" }}>No activities logged yet.</p>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rep.activities.slice(0, 20).map((a, i) => {
                const color = ACT_COLORS[a.type] ?? GOLD;
                const d = new Date(a.completedAt ?? a.createdAt);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", marginTop: 2 }}>
                      {a.type.replace(/_/g, " ")}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>{a.title}</p>
                      {a.hospital && <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: C.muted }}>{a.hospital.hospitalName}</p>}
                    </div>
                    <span style={{ fontSize: "0.68rem", color: C.muted, whiteSpace: "nowrap" }}>{d.toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}
