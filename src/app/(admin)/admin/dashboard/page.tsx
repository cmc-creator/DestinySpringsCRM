import React from "react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import TerritoryMapWrapper from "@/components/maps/TerritoryMapWrapper";
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";

const CYAN = "var(--nyx-accent)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

function Icon({ id, color }: { id: string; color: string }) {
  const s = { stroke: color, fill: "none", strokeWidth: "1.6", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const f = { fill: color, stroke: "none" };
  const icons: Record<string, React.JSX.Element | null> = {
    reps: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" {...s}/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...s}/>
      </svg>
    ),
    hospitals: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="14" rx="1" {...s}/>
        <path d="M9 21V11h6v10M3 11l9-7 9 7" {...s}/>
        <path d="M11 14h2M12 13v2" {...s}/>
      </svg>
    ),
    leads: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" {...s}/>
        <circle cx="12" cy="12" r="5" {...s}/>
        <circle cx="12" cy="12" r="1.5" style={f}/>
        <line x1="12" y1="3" x2="12" y2="5" {...s}/>
        <line x1="12" y1="19" x2="12" y2="21" {...s}/>
        <line x1="3" y1="12" x2="5" y2="12" {...s}/>
        <line x1="19" y1="12" x2="21" y2="12" {...s}/>
      </svg>
    ),
    opportunities: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="13" width="4" height="8" rx="1" {...s}/>
        <rect x="10" y="8" width="4" height="13" rx="1" {...s}/>
        <rect x="17" y="3" width="4" height="18" rx="1" {...s}/>
        <path d="M5 13l5-5 4 3 5-6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    won: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" {...s}/>
        <path d="M8 12l3 3 5-5" {...s}/>
      </svg>
    ),
    invoices: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="16" height="20" rx="2" {...s}/>
        <path d="M8 8h8M8 12h5" {...s}/>
        <path d="M12 16v4m-2-2h4" {...s}/>
      </svg>
    ),
    hospital_q: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="14" rx="1" {...s}/>
        <path d="M9 21V11h6v10M3 11l9-7 9 7" {...s}/>
      </svg>
    ),
    target: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" {...s}/>
        <circle cx="12" cy="12" r="5" {...s}/>
        <circle cx="12" cy="12" r="1.5" style={f}/>
      </svg>
    ),
    chart: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="13" width="4" height="8" rx="1" {...s}/>
        <rect x="10" y="8" width="4" height="13" rx="1" {...s}/>
        <rect x="17" y="3" width="4" height="18" rx="1" {...s}/>
      </svg>
    ),
    user: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" {...s}/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...s}/>
      </svg>
    ),
    referral: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s}/>
        <circle cx="9" cy="7" r="4" {...s}/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s}/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" {...s}/>
      </svg>
    ),
  };
  return <>{icons[id] ?? null}</>;
}

export default async function AdminDashboard() {
  const REP_COLORS = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];

  const [
    repCount, hospitalCount, leadCount, openOpps, closedWon,
    pendingInvoices, recentActivities, recentOpps, mapReps, mapHospitalsRaw
  ] = await Promise.all([
    prisma.rep.count({ where: { status: "ACTIVE" } }),
    prisma.hospital.count({ where: { status: { not: "CHURNED" } } }),
    prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
    prisma.opportunity.count({ where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    prisma.opportunity.count({ where: { stage: "CLOSED_WON" } }),
    prisma.invoice.count({ where: { status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.activity.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, rep: { include: { user: { select: { name: true } } } } } }),
    prisma.opportunity.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, assignedRep: { include: { user: { select: { name: true } } } } } }),
    prisma.rep.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true, email: true } }, territories: true } }),
    prisma.hospital.findMany({ select: { id: true, hospitalName: true, city: true, state: true, status: true, assignedRepId: true }, orderBy: { hospitalName: "asc" } }),
  ]);

  const repTerritories = mapReps.map((rep, i) => ({
    id: rep.id,
    name: rep.user.name ?? rep.user.email ?? "Unknown",
    color: REP_COLORS[i % REP_COLORS.length],
    states: [...new Set([
      ...(rep.licensedStates ?? []),
      ...rep.territories.map((t: { state: string }) => t.state),
    ])],
  }));

  const mapHospitals = mapHospitalsRaw.map(h => ({
    id: h.id,
    hospitalName: h.hospitalName,
    city: h.city,
    state: h.state,
    status: h.status,
    assignedRepName: h.assignedRepId ? (mapReps.find(r => r.id === h.assignedRepId)?.user.name ?? null) : null,
  }));

  const stats = [
    { label: "Active Reps",         value: repCount,        icon: "reps",          href: "/admin/reps" },
    { label: "Active Clients",       value: hospitalCount,   icon: "hospitals",     href: "/admin/hospitals" },
    { label: "Open Leads",          value: leadCount,       icon: "leads",         href: "/admin/leads" },
    { label: "Open Opportunities",  value: openOpps,        icon: "opportunities", href: "/admin/opportunities" },
    { label: "Closed Won",          value: closedWon,       icon: "won",           href: "/admin/opportunities" },
    { label: "Pending Invoices",    value: pendingInvoices, icon: "invoices",      href: "/admin/invoices" },
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
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Business Development Overview</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div className="gold-card" style={{ borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "box-shadow 0.2s" }}>
              <div style={{ marginBottom: 10, opacity: 0.85 }}><Icon id={s.icon} color={"var(--nyx-accent)"} /></div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontWeight: 500 }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget />

      {/* AI Insights */}
      <div style={{ marginBottom: 32 }}>
        <AIInsightsPanel role="admin" />
      </div>

      {/* Territory Overview */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>TERRITORY OVERVIEW</p>
          <Link href="/admin/territory" style={{ fontSize: "0.75rem", color: CYAN, textDecoration: "none", opacity: 0.7 }}>Full view →</Link>
        </div>
        <div className="gold-card" style={{ borderRadius: 12 }}>
          <div style={{ background: "var(--nyx-card)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ width: "100%", minHeight: 260, borderRadius: 10, overflow: "hidden" }}>
              <TerritoryMapWrapper hospitals={mapHospitals} repTerritories={repTerritories} />
            </div>
          </div>
        </div>
      </div>

      <div className="nyx-page-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Recent Opportunities */}
        <div className="gold-card" style={{ borderRadius: 12, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>RECENT OPPORTUNITIES</p>
            <Link href="/admin/opportunities" style={{ fontSize: "0.75rem", color: CYAN, textDecoration: "none", opacity: 0.7 }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentOpps.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No opportunities yet.</p>}
            {recentOpps.map((opp) => (
              <div key={opp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px 12px", padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
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
