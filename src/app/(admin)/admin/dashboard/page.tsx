import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";
import TurnaroundWidget from "@/components/dashboard/TurnaroundWidget";
import DischargeDestinationWidget from "@/components/dashboard/DischargeDestinationWidget";
import { Prisma } from "@prisma/client";

const REP_COLORS = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];

export default async function AdminDashboard() {
  let repCount = 0;
  let hospitalCount = 0;
  let leadCount = 0;
  let openOpps = 0;
  let closedAdmissions = 0;
  let stalledOpps = 0;
  // Extra context for enriched stat cards
  let unassignedLeads = 0;
  let pipelineValue = 0;
  let closedThisMonth = 0;
  let closedLastMonth = 0;
  let leadsThisMonth = 0;
  let leadsLastMonth = 0;
  let oppsThisMonth = 0;
  let oppsLastMonth = 0;
  let overdueFollowUps = 0;
  let recentActivities: {
    id: string;
    title: string;
    type: string;
    notes: string | null;
    createdAt: Date;
    hospital: { hospitalName: string; city: string | null; state: string | null } | null;
    lead: { hospitalName: string; city: string | null; state: string | null } | null;
    opportunity: { title: string; hospital: { hospitalName: string; city: string | null; state: string | null } } | null;
    rep: { user: { name: string | null } } | null;
    createdByUser: { name: string | null; email: string } | null;
  }[] = [];
  let recentOpps: { id: string; title: string; stage: string; value: Prisma.Decimal | null; hospital: { hospitalName: string }; assignedRep: { user: { name: string | null } } | null }[] = [];
  let mapReps: { id: string; licensedStates: string[] | null; user: { name: string | null; email: string }; territories: { state: string }[] }[] = [];
  let mapHospitalsRaw: { id: string; hospitalName: string; city: string | null; state: string | null; status: string; assignedRepId: string | null }[] = [];
  let expiringDocs: { id: string; type: string; repId: string; expiresAt: Date | null; rep: { user: { name: string | null } } }[] = [];

  try {
    const now2 = new Date();
    const monthStart = new Date(now2.getFullYear(), now2.getMonth(), 1);
    const prevMonthStart = new Date(now2.getFullYear(), now2.getMonth() - 1, 1);

    [
      repCount, hospitalCount, leadCount, openOpps, closedAdmissions,
      stalledOpps, recentActivities, recentOpps, mapReps, mapHospitalsRaw,
      unassignedLeads,
      closedThisMonth, closedLastMonth,
      leadsThisMonth, leadsLastMonth,
      oppsThisMonth, oppsLastMonth,
      overdueFollowUps,
    ] = await Promise.all([
      prisma.rep.count({ where: { status: "ACTIVE" } }),
      prisma.hospital.count({ where: { status: { not: "CHURNED" } } }),
      prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
      prisma.opportunity.count({ where: { stage: { notIn: ["DISCHARGED", "DECLINED"] } } }),
      prisma.opportunity.count({ where: { stage: "DISCHARGED" } }),
      prisma.opportunity.count({
        where: {
          stage: { notIn: ["DISCHARGED", "DECLINED"] },
          updatedAt: { lte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.activity.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        where: {
          OR: [
            { repId: { not: null } },
            { hospitalId: { not: null } },
            { createdByUserId: { not: null } },
            { leadId: { not: null } },
            { opportunityId: { not: null } },
            { notes: { not: null } },
          ],
        },
        include: {
          hospital: { select: { hospitalName: true, city: true, state: true } },
          lead: { select: { hospitalName: true, city: true, state: true } },
          opportunity: { select: { title: true, hospital: { select: { hospitalName: true, city: true, state: true } } } },
          rep: { include: { user: { select: { name: true } } } },
          createdByUser: { select: { name: true, email: true } },
        },
      }),
      prisma.opportunity.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { hospital: { select: { hospitalName: true } }, assignedRep: { include: { user: { select: { name: true } } } } } }),
      prisma.rep.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true, email: true } }, territories: true } }),
      prisma.hospital.findMany({ select: { id: true, hospitalName: true, city: true, state: true, status: true, assignedRepId: true }, orderBy: { hospitalName: "asc" } }),
      // Enrichment queries for stat card sub/delta
      prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] }, assignedRepId: null } }),
      prisma.opportunity.count({ where: { stage: "DISCHARGED", updatedAt: { gte: monthStart } } }),
      prisma.opportunity.count({ where: { stage: "DISCHARGED", updatedAt: { gte: prevMonthStart, lt: monthStart } } }),
      prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] }, createdAt: { gte: monthStart } } }),
      prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] }, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
      prisma.opportunity.count({ where: { stage: { notIn: ["DISCHARGED", "DECLINED"] }, createdAt: { gte: monthStart } } }),
      prisma.opportunity.count({ where: { stage: { notIn: ["DISCHARGED", "DECLINED"] }, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
      prisma.opportunity.count({ where: { stage: { notIn: ["DISCHARGED", "DECLINED"] }, nextFollowUp: { lt: new Date() } } }),
    ]);
  } catch {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--nyx-text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 10 }}>Dashboard unavailable</div>
        <p>Could not load dashboard data. Please refresh in a moment.</p>
      </div>
    );
  }

  try {
    const pvAgg = await prisma.opportunity.aggregate({
      _sum: { value: true },
      where: { stage: { notIn: ["DISCHARGED", "DECLINED"] } },
    });
    pipelineValue = pvAgg._sum.value ? Number(pvAgg._sum.value) : 0;
  } catch { /* non-fatal */ }

  try {
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expiringDocs = await prisma.complianceDoc.findMany({
      where: { expiresAt: { lte: in30 } },
      include: { rep: { include: { user: { select: { name: true } } } } },
      orderBy: { expiresAt: "asc" },
      take: 20,
    });
  } catch { /* non-fatal */ }

  // Census — most recent snapshot
  let censusToday: {
    date: Date; adultTotal: number; adultAvailable: number;
    adolescentTotal: number; adolescentAvailable: number;
    geriatricTotal: number; geriatricAvailable: number;
    dualDxTotal: number; dualDxAvailable: number; note: string | null;
  } | null = null;
  try {
    censusToday = await prisma.censusSnapshot.findFirst({ orderBy: { date: "desc" } });
  } catch { /* non-fatal */ }

  const now = new Date();

  const repTerritories = mapReps.map((rep, i) => ({
    id: rep.id,
    name: rep.user.name ?? rep.user.email ?? "Unknown",
    color: REP_COLORS[i % REP_COLORS.length],
    states: [...new Set([
      ...(rep.licensedStates ?? []),
      ...rep.territories.map((t: { state: string }) => t.state),
    ])],
  }));

  const mapHospitals = mapHospitalsRaw.map((h) => ({
    id: h.id,
    hospitalName: h.hospitalName,
    city: h.city,
    state: h.state,
    status: h.status,
    assignedRepName: h.assignedRepId
      ? (mapReps.find((r) => r.id === h.assignedRepId)?.user.name ?? null)
      : null,
  }));

  function fmtVal(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  }

  const stats = [
    { id: "reps",          label: "Active Reps",        value: repCount,         icon: "reps",          href: "/admin/reps" },
    { id: "hospitals",     label: "Active Clients",      value: hospitalCount,    icon: "hospitals",     href: "/admin/hospitals" },
    { id: "leads",         label: "Open Leads",          value: leadCount,        icon: "leads",         href: "/admin/leads",          delta: leadsThisMonth - leadsLastMonth,    sub: unassignedLeads > 0 ? `${unassignedLeads} unassigned` : "All assigned" },
    { id: "opportunities", label: "Open Opportunities",  value: openOpps,         icon: "opportunities", href: "/admin/opportunities",   delta: oppsThisMonth - oppsLastMonth,      sub: pipelineValue > 0 ? `${fmtVal(pipelineValue)} pipeline` : undefined },
    { id: "won",           label: "Admissions Closed",   value: closedAdmissions, icon: "won",           href: "/admin/opportunities",   delta: closedThisMonth - closedLastMonth,  sub: `${closedThisMonth} this month` },
    { id: "invoices",      label: "Stalled Opps (10d)",  value: stalledOpps,      icon: "invoices",      href: "/admin/opportunities",   delta: undefined,                          sub: overdueFollowUps > 0 ? `${overdueFollowUps} overdue follow-up${overdueFollowUps !== 1 ? "s" : ""}` : "No overdue follow-ups" },
  ];

  const serializedActivities = recentActivities.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    hospitalName: a.hospital?.hospitalName ?? a.lead?.hospitalName ?? a.opportunity?.hospital.hospitalName ?? null,
    locationCity: a.hospital?.city ?? a.lead?.city ?? a.opportunity?.hospital.city ?? null,
    locationState: a.hospital?.state ?? a.lead?.state ?? a.opportunity?.hospital.state ?? null,
    whoName: a.createdByUser?.name ?? a.createdByUser?.email ?? null,
    opportunityTitle: a.opportunity?.title ?? null,
    repName: a.rep?.user.name ?? null,
  }));

  const serializedOpps = recentOpps.map((o) => ({
    id: o.id,
    title: o.title,
    stage: o.stage,
    value: o.value != null ? Number(o.value) : null,
    hospitalName: o.hospital.hospitalName,
    repName: o.assignedRep?.user.name ?? null,
  }));

  const serializedExpired = expiringDocs
    .filter((d) => d.expiresAt && d.expiresAt < now)
    .map((d) => ({
      id: d.id,
      type: d.type,
      repName: d.rep.user.name ?? "Unknown Rep",
      expiresAt: d.expiresAt!.toISOString(),
    }));

  const serializedSoon = expiringDocs
    .filter((d) => d.expiresAt && d.expiresAt >= now)
    .map((d) => ({
      id: d.id,
      type: d.type,
      repName: d.rep.user.name ?? "Unknown Rep",
      expiresAt: d.expiresAt!.toISOString(),
    }));

  return (
    <>
    <TurnaroundWidget />
    <DischargeDestinationWidget />
    <DashboardClient
      stats={stats}
      recentActivities={serializedActivities}
      recentOpps={serializedOpps}
      mapHospitals={mapHospitals}
      repTerritories={repTerritories}
      expiredDocs={serializedExpired}
      soonDocs={serializedSoon}
      censusToday={censusToday ? {
        date: censusToday.date.toISOString(),
        adultTotal: censusToday.adultTotal,
        adultAvailable: censusToday.adultAvailable,
        adolescentTotal: censusToday.adolescentTotal,
        adolescentAvailable: censusToday.adolescentAvailable,
        geriatricTotal: censusToday.geriatricTotal,
        geriatricAvailable: censusToday.geriatricAvailable,
        dualDxTotal: censusToday.dualDxTotal,
        dualDxAvailable: censusToday.dualDxAvailable,
        note: censusToday.note,
      } : null}
      aegisSummary={{
        windowLabel: "Last 7 days",
        replies: 0,
        proposals: 0,
        applied: 0,
        dismissed: 0,
        helpful: 0,
        notHelpful: 0,
        topIntent: null,
        lastActivityAt: null,
      }}
    />
    </>
  );
}