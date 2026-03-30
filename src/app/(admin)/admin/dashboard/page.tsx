import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { Prisma } from "@prisma/client";

const REP_COLORS = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];

export default async function AdminDashboard() {
  let repCount = 0;
  let hospitalCount = 0;
  let leadCount = 0;
  let openOpps = 0;
  let closedAdmissions = 0;
  let stalledOpps = 0;
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
    [
      repCount, hospitalCount, leadCount, openOpps, closedAdmissions,
      stalledOpps, recentActivities, recentOpps, mapReps, mapHospitalsRaw
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
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expiringDocs = await prisma.complianceDoc.findMany({
      where: { expiresAt: { lte: in30 } },
      include: { rep: { include: { user: { select: { name: true } } } } },
      orderBy: { expiresAt: "asc" },
      take: 20,
    });
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

  const stats = [
    { id: "reps",          label: "Active Reps",        value: repCount,        icon: "reps",          href: "/admin/reps" },
    { id: "hospitals",     label: "Active Clients",      value: hospitalCount,   icon: "hospitals",     href: "/admin/hospitals" },
    { id: "leads",         label: "Open Leads",         value: leadCount,       icon: "leads",         href: "/admin/leads" },
    { id: "opportunities", label: "Open Opportunities", value: openOpps,        icon: "opportunities", href: "/admin/opportunities" },
    { id: "won",           label: "Admissions Closed",  value: closedAdmissions, icon: "won",          href: "/admin/opportunities" },
    { id: "invoices",      label: "Stalled Opps (10d)", value: stalledOpps,      icon: "invoices",     href: "/admin/opportunities" },
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
    <DashboardClient
      stats={stats}
      recentActivities={serializedActivities}
      recentOpps={serializedOpps}
      mapHospitals={mapHospitals}
      repTerritories={repTerritories}
      expiredDocs={serializedExpired}
      soonDocs={serializedSoon}
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
  );
}