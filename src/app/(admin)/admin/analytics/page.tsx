import { prisma } from "@/lib/prisma";
import AnalyticsCharts from "@/components/charts/AnalyticsCharts";
import type { OppStageRow, LeadRow, RepRow, MonthRow, HospTypeRow, VelocityRow } from "@/components/charts/AnalyticsCharts";
import ActivityHeatmap from "@/components/charts/ActivityHeatmap";
import type { HeatmapDay } from "@/components/charts/ActivityHeatmap";
import InvoiceContractPanel from "@/components/invoices/InvoiceContractPanel";

const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function AnalyticsPage() {
const [oppsByStageRaw, leadsByStatusRaw, repStatsRaw, hospitalStatsRaw, paidInvoices, totalRepsCount, totalHospitalsCount, recentActivitiesRaw, oppsForVelocity] = await Promise.all([
    prisma.opportunity.groupBy({ by: ["stage"], _count: { id: true }, _sum: { value: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.rep.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: { select: { opportunities: true, leads: true } },
        user: { select: { name: true } },
        opportunities: { select: { value: true } },
      },
      take: 10,
    }),
    prisma.hospital.groupBy({ by: ["hospitalType"], _count: { id: true } }),
    prisma.invoice.findMany({
      where: { status: "PAID" },
      select: { paidAt: true, totalAmount: true },
      orderBy: { paidAt: "asc" },
    }),
    prisma.rep.count({ where: { status: "ACTIVE" } }),
    prisma.hospital.count({ where: { status: { not: "CHURNED" } } }),
    prisma.activity.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    }),
    prisma.opportunity.findMany({
      select: { stage: true, createdAt: true, updatedAt: true },
    }),
  ]);

  const oppsByStage: OppStageRow[] = oppsByStageRaw.map(o => ({
    stage: o.stage,
    count: o._count.id,
    value: Number(o._sum.value ?? 0),
  }));

  const leadsByStatus: LeadRow[] = leadsByStatusRaw.map(l => ({
    status: l.status,
    count: l._count.id,
  }));

  const topReps: RepRow[] = repStatsRaw
    .map(r => ({
      id: r.id,
      name: r.user.name ?? "Unknown",
      opps: r._count.opportunities,
      leads: r._count.leads,
      value: r.opportunities.reduce((s, o) => s + Number(o.value ?? 0), 0),
    }))
    .sort((a, b) => b.value - a.value);

  const hospitalMix: HospTypeRow[] = hospitalStatsRaw.map(h => ({
    type: h.hospitalType ?? "UNKNOWN",
    count: h._count.id,
  }));

  const monthMap = new Map<string, number>();
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const d = new Date(inv.paidAt);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthMap.set(key, (monthMap.get(key) ?? 0) + Number(inv.totalAmount));
  }
  const now = new Date();
  const monthLabels: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
  }
  const monthlyRevenue: MonthRow[] = monthLabels.map(m => ({ month: m.split(" ")[0], value: monthMap.get(m) ?? 0 }));

  const totalPipeline = oppsByStage.filter(o => !["DISCHARGED","DECLINED"].includes(o.stage)).reduce((s, o) => s + o.value, 0);
  const closedWonValue = oppsByStage.find(o => o.stage === "DISCHARGED")?.value ?? 0;
  const wonCount  = oppsByStage.find(o => o.stage === "DISCHARGED")?.count ?? 0;
  const lostCount = oppsByStage.find(o => o.stage === "DECLINED")?.count ?? 0;
  const winRate   = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const activeLeads = leadsByStatus.filter(l => ["NEW","CONTACTED","QUALIFIED"].includes(l.status)).reduce((s, l) => s + l.count, 0);

  // Build heatmap data: count activities per calendar day
  const heatmapMap = new Map<string, number>();
  for (const act of recentActivitiesRaw) {
    const iso = act.createdAt.toISOString().slice(0, 10);
    heatmapMap.set(iso, (heatmapMap.get(iso) ?? 0) + 1);
  }
  const heatmapData: HeatmapDay[] = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));

  const velocityMap: Record<string, number[]> = {};
  for (const o of oppsForVelocity) {
    const days = (o.updatedAt.getTime() - o.createdAt.getTime()) / 86_400_000;
    if (!velocityMap[o.stage]) velocityMap[o.stage] = [];
    velocityMap[o.stage].push(days);
  }
  const stageOrder = ["INQUIRY","CLINICAL_REVIEW","INSURANCE_AUTH","ADMITTED","ACTIVE","DISCHARGED","DECLINED","ON_HOLD"];
  const velocityData: VelocityRow[] = Object.entries(velocityMap)
    .map(([stage, days]) => ({
      stage,
      avgDays: Math.max(1, Math.round(days.reduce((a, b) => a + b, 0) / days.length)),
    }))
    .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>INTELLIGENCE</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>Analytics</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Pipeline performance, revenue trends, and team metrics</p>
      </div>
      <AnalyticsCharts
        oppsByStage={oppsByStage}
        leadsByStatus={leadsByStatus}
        topReps={topReps}
        monthlyRevenue={monthlyRevenue}
        hospitalMix={hospitalMix}
        totalPipeline={totalPipeline}
        closedWonValue={closedWonValue}
        winRate={winRate}
        activeLeads={activeLeads}
        totalReps={totalRepsCount}
        totalHospitals={totalHospitalsCount}
        velocityData={velocityData}
      />
      <div style={{ marginTop: 20 }}>
        <ActivityHeatmap data={heatmapData} weeks={13} />
      </div>
      <div style={{ marginTop: 32 }}>
        <InvoiceContractPanel />
      </div>
    </div>
  );
}
