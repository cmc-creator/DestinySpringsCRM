import React from "react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import TerritoryMapWrapper from "@/components/maps/TerritoryMapWrapper";
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import { Prisma } from "@prisma/client";

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

  let repCount = 0;
  let hospitalCount = 0;
  let leadCount = 0;
  let openOpps = 0;
  let closedWon = 0;
  let pendingInvoices = 0;
  let recentActivities: { id: string; title: string; notes: string | null; createdAt: Date; updatedAt: Date; hospital: { hospitalName: string } | null; rep: { user: { name: string | null } } | null }[] = [];
  let recentOpps: { id: string; title: string; stage: string; value: Prisma.Decimal | null; metadata: unknown; notes: string | null; hospitalId: string; createdAt: Date; updatedAt: Date; assignedRepId: string | null; priority: string; hospital: { hospitalName: string }; assignedRep: { user: { name: string | null } } | null }[] = [];
  let mapReps: { id: string; licensedStates: string[] | null; user: { name: string | null; email: string }; territories: { state: string }[] }[] = [];
  let mapHospitalsRaw: { id: string; hospitalName: string; city: string | null; state: string | null; status: string; assignedRepId: string | null }[] = [];
  let expiringDocs: { id: string; type: string; title: string; notes: string | null; repId: string; createdAt: Date; updatedAt: Date; expiresAt: Date | null; fileUrl: string | null; verified: boolean; rep: { user: { name: string | null } } }[] = [];
  let executiveMetrics: {
    payerMix: { label: string; count: number }[];
    sourceConversion: { name: string; ratio: number; leads: number; admissions: number }[];
    repEfficiency: { name: string; admissions: number; activitiesPerAdmission: number | null }[];
    leadForecast: number;
  } = { payerMix: [], sourceConversion: [], repEfficiency: [], leadForecast: 0 };

  try {
    [
      repCount, hospitalCount, leadCount, openOpps, closedWon,
      pendingInvoices, recentActivities, recentOpps, mapReps, mapHospitalsRaw
    ] = await Promise.all([
      prisma.rep.count({ where: { status: "ACTIVE" } }),
      prisma.hospital.count({ where: { status: { not: "CHURNED" } } }),
      prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
      prisma.opportunity.count({ where: { stage: { notIn: ["DISCHARGED", "DECLINED"] } } }),
      prisma.opportunity.count({ where: { stage: "DISCHARGED" } }),
      prisma.invoice.count({ where: { status: { in: ["SENT", "OVERDUE"] } } }),
      prisma.activity.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, rep: { include: { user: { select: { name: true } } } } } }),
      prisma.opportunity.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, assignedRep: { include: { user: { select: { name: true } } } } } }),
      prisma.rep.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true, email: true } }, territories: true } }),
      prisma.hospital.findMany({ select: { id: true, hospitalName: true, city: true, state: true, status: true, assignedRepId: true }, orderBy: { hospitalName: "asc" } }),
    ]);
  } catch {
    expiringDocs = [];
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: TEXT_MUTED }}>
        <div style={{ fontSize: "2rem", marginBottom: 10 }}>Dashboard unavailable</div>
        <p>We could not load dashboard data right now. Please refresh in a moment.</p>
      </div>
    );
  }

  try {
    const [payors, referralSources, repsWithMetrics, activeLeads] = await Promise.all([
      prisma.payor.findMany({
        where: { active: true },
        include: { opportunities: { where: { stage: { notIn: ["DISCHARGED", "DECLINED"] } }, select: { id: true } } },
      }),
      prisma.referralSource.findMany({
        include: { _count: { select: { referrals: true } } },
      }),
      prisma.rep.findMany({
        where: { status: "ACTIVE" },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { activities: true, opportunities: true } },
          opportunities: { where: { stage: "ADMITTED" }, select: { id: true } },
        },
      }),
      prisma.lead.findMany({
        where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATING"] } },
        select: { estimatedValue: true },
      }),
    ]);

    const payerMix = payors
      .map((payor) => ({ label: payor.type.replace(/_/g, " "), count: payor.opportunities.length }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sourceConversion = referralSources
      .map((source) => {
        const leads = source.monthlyGoal ?? 0;
        const admissions = source._count.referrals;
        return {
          name: source.name,
          leads,
          admissions,
          ratio: leads > 0 ? Math.round((admissions / leads) * 100) : 0,
        };
      })
      .filter((row) => row.leads > 0 || row.admissions > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);

    const repEfficiency = repsWithMetrics
      .map((rep) => ({
        name: rep.user.name ?? rep.user.email ?? "Unknown",
        admissions: rep.opportunities.length,
        activitiesPerAdmission: rep.opportunities.length > 0 ? Number((rep._count.activities / rep.opportunities.length).toFixed(1)) : null,
      }))
      .sort((a, b) => {
        if (a.activitiesPerAdmission == null) return 1;
        if (b.activitiesPerAdmission == null) return -1;
        return a.activitiesPerAdmission - b.activitiesPerAdmission;
      })
      .slice(0, 5);

    const leadForecast = Math.round(activeLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0) * 0.35);

    executiveMetrics = { payerMix, sourceConversion, repEfficiency, leadForecast };
  } catch {
    // non-fatal
  }

  try {
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expiringDocs = await prisma.complianceDoc.findMany({
      where: { expiresAt: { lte: in30 } },
      include: { rep: { include: { user: { select: { name: true } } } } },
      orderBy: { expiresAt: "asc" },
      take: 20,
    });
  } catch {
    // non-fatal
  }

  const now = new Date();
  const expiredDocs = expiringDocs.filter(d => d.expiresAt && d.expiresAt < now);
  const soonDocs    = expiringDocs.filter(d => d.expiresAt && d.expiresAt >= now);

  const repTerritories = mapReps.map((rep, i) => ({
    id: rep.id,
    name: rep.user.name ?? rep.user.email ?? "Unknown",
    color: REP_COLORS[i % REP_COLORS.length],
    states: [...new Set([
      ...(rep.licensedStates ?? []),
      ...rep.territories.map((t: { state: string }) => t.state),
    ])],
  }));

  const mapReferralSources = await prisma.referralSource.findMany({
    where: { state: { not: null } },
    select: { id: true, name: true, city: true, state: true, assignedRepId: true, active: true, mapLabel: true, mapColor: true },
    orderBy: { name: "asc" },
  });

  const mapHospitals = [
    ...mapHospitalsRaw.map(h => ({
      id: h.id,
      hospitalName: h.hospitalName,
      city: h.city,
      state: h.state,
      status: h.status,
      assignedRepName: h.assignedRepId ? (mapReps.find(r => r.id === h.assignedRepId)?.user.name ?? null) : null,
      referralMapLabel: null,
      referralMapColor: null,
    })),
    ...mapReferralSources.map(source => ({
      id: source.id,
      hospitalName: source.name,
      city: source.city,
      state: source.state,
      status: source.active ? "ACTIVE" : "INACTIVE",
      assignedRepName: source.assignedRepId ? (mapReps.find(r => r.id === source.assignedRepId)?.user.name ?? null) : null,
      referralMapLabel: source.mapLabel,
      referralMapColor: source.mapColor,
    })),
  ];

  const stats = [
    { label: "Active Reps",         value: repCount,        icon: "reps",          href: "/admin/reps" },
    { label: "Active Clients",       value: hospitalCount,   icon: "hospitals",     href: "/admin/hospitals" },
    { label: "Open Leads",          value: leadCount,       icon: "leads",         href: "/admin/leads" },
    { label: "Open Opportunities",  value: openOpps,        icon: "opportunities", href: "/admin/opportunities" },
    { label: "Discharged",           value: closedWon,       icon: "won",        href: "/admin/opportunities" },
    { label: "Pending Invoices",    value: pendingInvoices, icon: "invoices",      href: "/admin/invoices" },
  ];

  const stageColor: Record<string, string> = {
    INQUIRY: "#94a3b8", CLINICAL_REVIEW: "#fbbf24", INSURANCE_AUTH: "#f59e0b",
    ADMITTED: "var(--nyx-accent)", ACTIVE: "#60a5fa", DISCHARGED: "#34d399", DECLINED: "#f87171", ON_HOLD: "#94a3b8",
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

      {/* Compliance Alerts */}
      {expiringDocs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>COMPLIANCE ALERTS</p>
            <Link href="/admin/compliance" style={{ fontSize: "0.75rem", color: CYAN, textDecoration: "none", opacity: 0.7 }}>Manage →</Link>
          </div>
          <div style={{ background: expiredDocs.length ? "rgba(248,113,113,0.06)" : "rgba(251,191,36,0.05)", border: `1px solid ${expiredDocs.length ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.2)"}`, borderRadius: 12, padding: "16px 18px" }}>
            {expiredDocs.length > 0 && (
              <div style={{ marginBottom: soonDocs.length ? 12 : 0 }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  ⚠ {expiredDocs.length} EXPIRED DOCUMENT{expiredDocs.length > 1 ? "S" : ""}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {expiredDocs.slice(0, 5).map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 12px" }}>
                      <span style={{ fontSize: "0.82rem", color: TEXT }}>{d.rep.user.name ?? "Unknown Rep"} — {d.type.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }}>Expired {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {soonDocs.length > 0 && (
              <div>
                <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  EXPIRING WITHIN 30 DAYS
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {soonDocs.slice(0, 5).map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 12px" }}>
                      <span style={{ fontSize: "0.82rem", color: TEXT }}>{d.rep.user.name ?? "Unknown Rep"} — {d.type.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 600 }}>Expires {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div style={{ marginBottom: 32 }}>
        <AIInsightsPanel role="admin" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 32 }}>
        <div className="gold-card" style={{ borderRadius: 12, padding: "18px 16px" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Payer Mix</div>
          {executiveMetrics.payerMix.length === 0 ? <div style={{ fontSize: "0.8rem", color: TEXT_MUTED }}>No linked payor mix yet.</div> : executiveMetrics.payerMix.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: TEXT, marginBottom: 6 }}>
              <span>{row.label}</span><span style={{ color: CYAN, fontWeight: 700 }}>{row.count}</span>
            </div>
          ))}
        </div>

        <div className="gold-card" style={{ borderRadius: 12, padding: "18px 16px" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Source Conversion</div>
          {executiveMetrics.sourceConversion.length === 0 ? <div style={{ fontSize: "0.8rem", color: TEXT_MUTED }}>No source conversion data yet.</div> : executiveMetrics.sourceConversion.map((row) => (
            <div key={row.name} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: TEXT }}>
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                <span style={{ color: "#34d399", fontWeight: 700 }}>{row.ratio}%</span>
              </div>
              <div style={{ fontSize: "0.66rem", color: TEXT_MUTED }}>{row.admissions} admissions / {row.leads} target</div>
            </div>
          ))}
        </div>

        <div className="gold-card" style={{ borderRadius: 12, padding: "18px 16px" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Activities Per Admission</div>
          {executiveMetrics.repEfficiency.length === 0 ? <div style={{ fontSize: "0.8rem", color: TEXT_MUTED }}>No rep efficiency data yet.</div> : executiveMetrics.repEfficiency.map((row) => (
            <div key={row.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: TEXT, marginBottom: 6 }}>
              <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
              <span style={{ color: row.activitiesPerAdmission == null ? TEXT_MUTED : "#fbbf24", fontWeight: 700 }}>{row.activitiesPerAdmission == null ? "-" : row.activitiesPerAdmission}</span>
            </div>
          ))}
        </div>

        <div className="gold-card" style={{ borderRadius: 12, padding: "18px 16px" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Lead Forecast</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: CYAN, marginBottom: 6 }}>{formatCurrency(executiveMetrics.leadForecast)}</div>
          <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>Estimated revenue from active leads at a 35% realization rate.</div>
        </div>
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
