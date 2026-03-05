import { prisma } from "@/lib/prisma";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function AdminDashboard() {
  const [
    repCount, hospitalCount, leadCount, openOpps, closedWon,
    pendingInvoices, recentActivities, recentOpps
  ] = await Promise.all([
    prisma.rep.count({ where: { status: "ACTIVE" } }),
    prisma.hospital.count({ where: { status: { not: "CHURNED" } } }),
    prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
    prisma.opportunity.count({ where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    prisma.opportunity.count({ where: { stage: "CLOSED_WON" } }),
    prisma.invoice.count({ where: { status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.activity.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, rep: { include: { user: { select: { name: true } } } } } }),
    prisma.opportunity.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, assignedRep: { include: { user: { select: { name: true } } } } } }),
  ]);

  const stats = [
    { label: "Active Reps", value: repCount, icon: "🤝", href: "/admin/reps" },
    { label: "Active Hospitals", value: hospitalCount, icon: "🏥", href: "/admin/hospitals" },
    { label: "Open Leads", value: leadCount, icon: "🎯", href: "/admin/leads" },
    { label: "Open Opportunities", value: openOpps, icon: "📊", href: "/admin/opportunities" },
    { label: "Closed Won", value: closedWon, icon: "✅", href: "/admin/opportunities" },
    { label: "Pending Invoices", value: pendingInvoices, icon: "💳", href: "/admin/invoices" },
  ];

  const quickActions = [
    { label: "Add Hospital", href: "/admin/hospitals", icon: "🏥" },
    { label: "Add Lead", href: "/admin/leads", icon: "🎯" },
    { label: "New Opportunity", href: "/admin/opportunities", icon: "📊" },
    { label: "Add Rep", href: "/admin/reps", icon: "🤝" },
  ];

  const stageColor: Record<string, string> = {
    DISCOVERY: "#94a3b8", QUALIFICATION: "#fbbf24", DEMO: "#f59e0b",
    PROPOSAL: "var(--nyx-accent)", NEGOTIATION: "#60a5fa", CLOSED_WON: "#34d399", CLOSED_LOST: "#f87171", ON_HOLD: "#94a3b8",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>NYXAEGIS</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>Command Center</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Hospital Business Development Overview</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div className="gold-card" style={{ borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "box-shadow 0.2s" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: CYAN, textShadow: "0 0 20px var(--nyx-accent-label)", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontWeight: 500 }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>QUICK ACTIONS</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--nyx-accent-dim)", border: `1px solid var(--nyx-accent-mid)`, borderRadius: 8, padding: "8px 14px", textDecoration: "none", color: CYAN, fontSize: "0.8rem", fontWeight: 600 }}>
              <span>{a.icon}</span> {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Recent Opportunities */}
        <div className="gold-card" style={{ borderRadius: 12, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>RECENT OPPORTUNITIES</p>
            <Link href="/admin/opportunities" style={{ fontSize: "0.75rem", color: CYAN, textDecoration: "none", opacity: 0.7 }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentOpps.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No opportunities yet.</p>}
            {recentOpps.map((opp) => (
              <div key={opp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, marginBottom: 2 }}>{opp.title}</div>
                  <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{opp.hospital.hospitalName}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: stageColor[opp.stage] ?? CYAN, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{opp.stage.replace("_", " ")}</div>
                  {opp.value && <div style={{ fontSize: "0.75rem", color: CYAN, marginTop: 4 }}>{formatCurrency(Number(opp.value))}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="gold-card" style={{ borderRadius: 12, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>RECENT ACTIVITY</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentActivities.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No activity yet.</p>}
            {recentActivities.map((act) => (
              <div key={act.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: CYAN, marginTop: 6, flexShrink: 0, opacity: 0.6 }} />
                <div>
                  <div style={{ fontSize: "0.82rem", color: TEXT, marginBottom: 1 }}>{act.title}</div>
                  <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{act.hospital?.hospitalName ?? "-"} · {formatRelativeTime(act.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
