import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget";

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
    [overdueLeads, overdueOpps, weeklyActivityCount] = await Promise.all([
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
    ]);
  } catch {
    // non-fatal — follow-ups just won't show
  }

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
  const closedWon = rep.opportunities.filter(o => o.stage === "DISCHARGED");
  const pipelineValue = openOpps.reduce((s, o) => s + (o.value ? Number(o.value) : 0), 0);

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
          { label: "Open Opportunities", value: openOpps.length, color: CYAN, icon: "📊" },
          { label: "Closed Won", value: closedWon.length, color: "#34d399", icon: "✅" },
          { label: "Pipeline Value", value: formatCurrency(pipelineValue), color: CYAN, icon: "💰" },
          { label: "Territories", value: rep._count.territories, color: "#60a5fa", icon: "🗺️" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: s.color, textShadow: "0 0 20px var(--nyx-accent-str)", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
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

      <div className="nyx-page-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
