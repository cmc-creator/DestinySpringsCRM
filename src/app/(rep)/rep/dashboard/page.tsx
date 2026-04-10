import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget";
import CadenceAlertWidget from "@/components/dashboard/CadenceAlertWidget";
import TurnaroundWidget from "@/components/dashboard/TurnaroundWidget";
import BedboardAndDischargesWidget from "@/components/dashboard/BedboardAndDischargesWidget";

export const dynamic = "force-dynamic";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function RepDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  let rep: null | {
    id: string; title: string | null; territory: string | null; userId: string;
    user: { name: string | null };
    opportunities: { id: string; title: string; stage: string; value: Prisma.Decimal | null; updatedAt: Date; hospital: { hospitalName: string } }[];
    activities: {
      id: string;
      title: string;
      type: string;
      notes: string | null;
      createdAt: Date;
      hospital: { hospitalName: string; city: string | null; state: string | null } | null;
      lead: { hospitalName: string; city: string | null; state: string | null } | null;
      opportunity: { title: string; hospital: { hospitalName: string; city: string | null; state: string | null } } | null;
      createdByUser: { name: string | null; email: string } | null;
    }[];
    territories: { id: string }[];
    _count: { opportunities: number; leads: number; territories: number };
  } = null;
  let overdueLeads: { id: string; hospitalName: string; nextFollowUp: Date | null }[] = [];
  let overdueOpps: { id: string; title: string; nextFollowUp: Date | null; hospital: { hospitalName: string } }[] = [];
  let weeklyActivityCount = 0;
  let openOppsCount = 0;
  let closedWonCount = 0;
  let closedThisMonth = 0;
  let closedLastMonth = 0;
  let oppsThisMonth = 0;
  let oppsLastMonth = 0;
  let totalPipelineValue = 0;

  try {
    rep = await prisma.rep.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true } },
        opportunities: {
          include: { hospital: { select: { hospitalName: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 6,
          include: {
            hospital: { select: { hospitalName: true, city: true, state: true } },
            lead: { select: { hospitalName: true, city: true, state: true } },
            opportunity: { select: { title: true, hospital: { select: { hospitalName: true, city: true, state: true } } } },
            createdByUser: { select: { name: true, email: true } },
          },
        },
        territories: true,
        _count: { select: { opportunities: true, leads: true, territories: true } },
      },
    });
  } catch {
    rep = null;
  }

  if (!rep) redirect("/login");

  try {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    [
      overdueLeads,
      overdueOpps,
      weeklyActivityCount,
      openOppsCount,
      closedWonCount,
      closedThisMonth,
      closedLastMonth,
      oppsThisMonth,
      oppsLastMonth,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: { assignedRepId: rep.id, nextFollowUp: { lte: weekAhead } },
        select: { id: true, hospitalName: true, nextFollowUp: true },
        orderBy: { nextFollowUp: "asc" },
        take: 10,
      }),
      prisma.opportunity.findMany({
        where: {
          assignedRepId: rep.id,
          nextFollowUp: { lte: weekAhead },
          stage: { notIn: ["DISCHARGED", "DECLINED"] },
        },
        select: { id: true, title: true, nextFollowUp: true, hospital: { select: { hospitalName: true } } },
        orderBy: { nextFollowUp: "asc" },
        take: 10,
      }),
      prisma.activity.count({
        where: { repId: rep.id, createdAt: { gte: weekStart } },
      }),
      prisma.opportunity.count({
        where: { assignedRepId: rep.id, stage: { notIn: ["DISCHARGED", "DECLINED"] } },
      }),
      prisma.opportunity.count({
        where: { assignedRepId: rep.id, stage: "DISCHARGED" },
      }),
      prisma.opportunity.count({
        where: { assignedRepId: rep.id, stage: "DISCHARGED", updatedAt: { gte: startOfThisMonth, lt: startOfNextMonth } },
      }),
      prisma.opportunity.count({
        where: { assignedRepId: rep.id, stage: "DISCHARGED", updatedAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      }),
      prisma.opportunity.count({
        where: { assignedRepId: rep.id, createdAt: { gte: startOfThisMonth, lt: startOfNextMonth } },
      }),
      prisma.opportunity.count({
        where: { assignedRepId: rep.id, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      }),
    ]);
    const pipelineSum = await prisma.opportunity.aggregate({
      where: { assignedRepId: rep.id, stage: { notIn: ["DISCHARGED", "DECLINED"] } },
      _sum: { value: true },
    });
    totalPipelineValue = Number(pipelineSum._sum.value ?? 0);
  } catch {
    // non-fatal — follow-ups just won't show
  }

  // Referral source health: sources going cold (no contact 20+ days)
  const coldSources: { id: string; name: string; lastActivityAt: Date | null; daysIdle: number }[] = [];
  try {
    const sources = await prisma.referralSource.findMany({
      where: { assignedRepId: rep.id },
      select: {
        id: true,
        name: true,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    const now3 = new Date();
    for (const s of sources) {
      const lastAct = s.activities[0]?.createdAt ?? null;
      const daysIdle = lastAct
        ? Math.floor((now3.getTime() - lastAct.getTime()) / 86400000)
        : 9999;
      if (daysIdle >= 20) {
        coldSources.push({ id: s.id, name: s.name, lastActivityAt: lastAct, daysIdle });
      }
    }
    coldSources.sort((a, b) => b.daysIdle - a.daysIdle);
  } catch { /* non-fatal */ }

  // Activity breakdown by type this week vs last week
  let activityByType: { type: string; thisWeek: number; lastWeek: number }[] = [];
  try {
    const now2 = new Date();
    const weekStart2 = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now2.getTime() - 14 * 24 * 60 * 60 * 1000);
    const [thisWeekActs, lastWeekActs] = await Promise.all([
      prisma.activity.groupBy({ by: ["type"], where: { repId: rep.id, createdAt: { gte: weekStart2 } }, _count: { id: true } }),
      prisma.activity.groupBy({ by: ["type"], where: { repId: rep.id, createdAt: { gte: twoWeeksAgo, lt: weekStart2 } }, _count: { id: true } }),
    ]);
    const lastWeekMap = new Map(lastWeekActs.map(a => [a.type, a._count.id]));
    const allTypes = [...new Set([...thisWeekActs.map(a => a.type), ...lastWeekActs.map(a => a.type)])];
    activityByType = allTypes
      .map(type => ({
        type,
        thisWeek: thisWeekActs.find(a => a.type === type)?._count.id ?? 0,
        lastWeek: lastWeekMap.get(type) ?? 0,
      }))
      .sort((a, b) => b.thisWeek - a.thisWeek)
      .slice(0, 6);
  } catch { /* non-fatal */ }

  const now = new Date();
  const overdueFollowUps = [
    ...overdueLeads.map(l => ({ id: l.id, label: l.hospitalName, date: l.nextFollowUp, type: "LEAD" as const })),
    ...overdueOpps.map(o => ({ id: o.id, label: `${o.title} — ${o.hospital.hospitalName}`, date: o.nextFollowUp, type: "OPP" as const })),
  ]
    .filter(f => f.date !== null)
    .sort((a, b) => (a.date!.getTime()) - (b.date!.getTime()));

  const pastDue = overdueFollowUps.filter(f => f.date! < now);
  const upcoming = overdueFollowUps.filter(f => f.date! >= now);

  if (!rep) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: TEXT_MUTED }}>
        <div style={{ fontSize: "2rem", marginBottom: 10 }}>Dashboard unavailable</div>
        <p>We could not load your dashboard right now. Please refresh in a moment.</p>
      </div>
    );
  }

  const openOpps = rep.opportunities.filter(o => !["DISCHARGED", "DECLINED"].includes(o.stage));

  const activityScore = Math.min(100, weeklyActivityCount * 10);
  const ringColor = activityScore >= 70 ? "#34d399" : activityScore >= 40 ? "#fbbf24" : "#f87171";
  const CIRC = 276; // 2π × r44

  return (
    <>
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Welcome, {rep.user.name?.split(" ")[0]}</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>{rep.title} · {rep.territory ?? "No territory set"}</p>
      </div>

      {/* Bedboard & Discharges */}
      <BedboardAndDischargesWidget repId={rep.id} />

      {/* Tier 1 Cadence Alerts */}
      <CadenceAlertWidget repId={rep.id} />

      {/* Referral Turnaround Time */}
      <TurnaroundWidget repId={rep.id} />

      {/* Follow-up alerts */}
      {pastDue.length > 0 && (
        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              ⚠ {pastDue.length} OVERDUE FOLLOW-UP{pastDue.length > 1 ? "S" : ""}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pastDue.map(f => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontSize: "0.83rem", color: TEXT }}>{f.label}</span>
                <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }}>
                  Was due {f.date!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {f.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            UPCOMING FOLLOW-UPS — NEXT 7 DAYS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {upcoming.map(f => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontSize: "0.83rem", color: TEXT }}>{f.label}</span>
                <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 600 }}>
                  {f.date!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {f.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          {
            label: "Open Opportunities", value: openOppsCount, color: CYAN, icon: "📊",
            delta: oppsThisMonth - oppsLastMonth,
            sub: pastDue.length > 0 ? `${pastDue.length} overdue follow-up${pastDue.length > 1 ? "s" : ""}` : "No overdue follow-ups",
          },
          {
            label: "Closed Won", value: closedWonCount, color: "#34d399", icon: "✅",
            delta: closedThisMonth - closedLastMonth,
            sub: `${closedThisMonth} this month`,
          },
          {
            label: "Pipeline Value", value: formatCurrency(totalPipelineValue), color: CYAN, icon: "💰",
            sub: `across ${openOppsCount} opp${openOppsCount !== 1 ? "s" : ""}`,
          },
          {
            label: "Territories", value: rep._count.territories, color: "#60a5fa", icon: "🗺️",
            sub: `${rep._count.leads} lead${rep._count.leads !== 1 ? "s" : ""} assigned`,
          },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 18px", minHeight: 130, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: "1.3rem" }}>{s.icon}</div>
              {"delta" in s && s.delta !== 0 && (() => {
                const d = s.delta!;
                return (
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: d > 0 ? "#34d399" : "#f87171", background: d > 0 ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", borderRadius: 6, padding: "2px 6px" }}>
                    {d > 0 ? "+" : ""}{d}
                  </span>
                );
              })()}
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: s.color, textShadow: "0 0 20px var(--nyx-accent-str)", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED, marginBottom: "sub" in s && s.sub ? 4 : 0 }}>{s.label}</div>
            {"sub" in s && s.sub && (
              <div style={{ fontSize: "0.68rem", color: "var(--nyx-accent)", fontWeight: 600 }}>{s.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div style={{ marginBottom: 28 }}>
        <AIInsightsPanel role="rep" />
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget role="REP" />

      {/* Activity Score Widget */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 28px", marginBottom: 28, display: "flex", alignItems: "center", gap: 28 }}>
        {/* SVG Ring Gauge — circles rotated via SVG transform attr; text stays upright */}
        <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          <circle cx={60} cy={60} r={44} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
          <circle
            cx={60} cy={60} r={44} fill="none"
            stroke={ringColor}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={`${(activityScore / 100) * CIRC} ${CIRC}`}
            transform="rotate(-90 60 60)"
            style={{ filter: `drop-shadow(0 0 6px ${ringColor}99)`, transition: "stroke-dasharray 0.8s ease" }}
          />
          <text
            x={60} y={66} textAnchor="middle"
            fill={ringColor}
            fontSize="22"
            fontWeight="900"
            fontFamily="inherit"
          >
            {activityScore}
          </text>
        </svg>
        {/* Score Text */}
        <div>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>ACTIVITY SCORE</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 900, color: ringColor, textShadow: `0 0 20px ${ringColor}66`, lineHeight: 1 }}>{activityScore}</span>
            <span style={{ fontSize: "1rem", color: TEXT_MUTED, fontWeight: 500 }}>/100</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: TEXT, marginBottom: 3 }}>
            {weeklyActivityCount} {weeklyActivityCount === 1 ? "activity" : "activities"} logged this week
          </p>
          <p style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>Each activity = 10 pts · goal: 70+</p>
          {/* Mini progress bar */}
          <div style={{ marginTop: 10, height: 5, width: 200, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${activityScore}%`, background: ringColor, borderRadius: 3, boxShadow: `0 0 8px ${ringColor}66` }} />
          </div>
        </div>
      </div>

      {/* Activity Breakdown by Type */}
      {activityByType.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 22px", marginBottom: 28 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>THIS WEEK BY TYPE</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {activityByType.map(a => {
              const ACT_LABELS: Record<string, string> = {
                CALL: "Call", EMAIL: "Email", NOTE: "Note", MEETING: "Meeting", LUNCH: "Lunch",
                SITE_VISIT: "Site Visit", IN_SERVICE: "In-Service", FOLLOW_UP: "Follow-Up",
                CE_PRESENTATION: "CE Pres.", LUNCH_AND_LEARN: "L&L", REFERRAL_RECEIVED: "Referral",
                TASK: "Task", PROPOSAL_SENT: "Proposal", DEMO_COMPLETED: "Demo", CONFERENCE: "Conference",
              };
              const delta = a.thisWeek - a.lastWeek;
              return (
                <div key={a.type} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 14px", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: "0.68rem", color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    {ACT_LABELS[a.type] ?? a.type}
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: CYAN, lineHeight: 1 }}>{a.thisWeek}</div>
                  {delta !== 0 && (
                    <div style={{ fontSize: "0.65rem", color: delta > 0 ? "#34d399" : "#f87171", marginTop: 3 }}>
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} vs last week
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="nyx-page-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Referral Source Health */}
        {coldSources.length > 0 && (
          <div style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 14, padding: "18px 22px", gridColumn: "1 / -1" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              ⚠ REFERRAL SOURCES GOING COLD
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {coldSources.slice(0, 8).map(s => {
                const isVeryOld = s.daysIdle >= 45;
                const badgeColor = isVeryOld ? "#f87171" : "#fbbf24";
                return (
                  <a key={s.id} href={`/rep/contacts/${s.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 14px", border: `1px solid ${isVeryOld ? "rgba(248,113,113,0.2)" : "rgba(251,191,36,0.18)"}`, cursor: "pointer" }}>
                      <div style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                      <div style={{ display: "inline-block", fontSize: "0.65rem", fontWeight: 700, color: badgeColor, background: `${badgeColor}18`, borderRadius: 6, padding: "2px 7px" }}>
                        {s.daysIdle === 9999 ? "No contact yet" : `${s.daysIdle}d idle`}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>MY OPPORTUNITIES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {openOpps.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No open opportunities.</p>}
            {openOpps.map((opp) => (
              <div key={opp.id} style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: TEXT, marginBottom: 2 }}>{opp.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{opp.hospital.hospitalName}</span>
                  {opp.value && <span style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 600 }}>{formatCurrency(Number(opp.value))}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>RECENT ACTIVITY</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rep.activities.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No activity logged yet.</p>}
            {rep.activities.map((act) => (
              <div key={act.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: CYAN, marginTop: 6, flexShrink: 0, opacity: 0.6 }} />
                <div>
                  <div style={{ fontSize: "0.82rem", color: TEXT }}>{act.title}</div>
                  <div style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>
                    {(act.createdByUser?.name ?? act.createdByUser?.email ?? rep.user.name ?? "You")} · {act.type.replace(/_/g, " ")} · {formatRelativeTime(act.createdAt)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 2 }}>
                    {(act.hospital?.hospitalName ?? act.lead?.hospitalName ?? act.opportunity?.hospital.hospitalName ?? "No facility")}
                    {(act.hospital?.city || act.hospital?.state || act.lead?.city || act.lead?.state || act.opportunity?.hospital.city || act.opportunity?.hospital.state)
                      ? ` · ${[act.hospital?.city ?? act.lead?.city ?? act.opportunity?.hospital.city ?? null, act.hospital?.state ?? act.lead?.state ?? act.opportunity?.hospital.state ?? null].filter(Boolean).join(", ")}`
                      : ""}
                    {act.opportunity?.title ? ` · ${act.opportunity.title}` : ""}
                  </div>
                  {act.notes && <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 2, opacity: 0.85 }}>{act.notes.slice(0, 110)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <style>{`
      @media (max-width: 900px) {
        .nyx-page-grid-2col {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 560px) {
        h1 { font-size: 1.4rem !important; }
      }
    `}</style>
    </>
  );
}
