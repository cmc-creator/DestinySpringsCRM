import { prisma } from "@/lib/prisma";
import Link from "next/link";

const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const CADENCE_DAYS = 7; // Tier 1: contact every 7 days

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number | null): string {
  if (days === null) return "#f87171"; // never contacted
  if (days >= 14) return "#f87171";   // red — overdue 2+ weeks
  if (days >= 7)  return "#fbbf24";   // yellow — just past cadence
  return "#34d399";                    // green — within cadence
}

function urgencyLabel(days: number | null): string {
  if (days === null) return "Never contacted";
  if (days === 0)    return "Today";
  if (days === 1)    return "1 day ago";
  return `${days} days ago`;
}

export default async function CadenceAlertWidget({ repId }: { repId: string }) {
  let overdueCount = 0;

  const sources = await prisma.referralSource.findMany({
    where: { assignedRepId: repId, tier: "TIER_1", active: true },
    select: {
      id: true,
      name: true,
      type: true,
      contactName: true,
      phone: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, type: true },
      },
    },
    orderBy: { name: "asc" },
  }).catch(() => []);

  if (sources.length === 0) return null;

  const annotated = sources.map(s => {
    const lastAct = s.activities[0] ?? null;
    const days = lastAct ? daysSince(lastAct.createdAt) : null;
    const overdue = days === null || days >= CADENCE_DAYS;
    if (overdue) overdueCount++;
    return { ...s, days, overdue };
  });

  const overdueSources = annotated.filter(s => s.overdue);
  if (overdueSources.length === 0) return null;

  return (
    <div style={{
      background: "rgba(251,191,36,0.04)",
      border: "1px solid rgba(251,191,36,0.2)",
      borderRadius: 14,
      padding: "18px 22px",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
            ⚡ TIER 1 CADENCE ALERTS
          </p>
          <p style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>
            {overdueCount} priority source{overdueCount !== 1 ? "s" : ""} need{overdueCount === 1 ? "s" : ""} a touchpoint
          </p>
        </div>
        <Link href="/rep/territory" style={{ fontSize: "0.72rem", color: "var(--nyx-accent)", textDecoration: "none", fontWeight: 600 }}>
          View all →
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {overdueSources.slice(0, 6).map(s => {
          const color = urgencyColor(s.days);
          return (
            <div key={s.id} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
              flexWrap: "wrap",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.83rem", fontWeight: 600, color: TEXT, marginBottom: 2 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>
                  {s.type.replace(/_/g, " ")}
                  {s.contactName ? ` · ${s.contactName}` : ""}
                  {s.phone ? ` · ${s.phone}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color }}>
                    {urgencyLabel(s.days)}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>
                    Last contact{s.activities[0] ? ` · ${s.activities[0].type.replace(/_/g, " ")}` : ""}
                  </div>
                </div>
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                }} />
              </div>
            </div>
          );
        })}

        {overdueSources.length > 6 && (
          <p style={{ fontSize: "0.72rem", color: TEXT_MUTED, paddingTop: 4, paddingLeft: 2 }}>
            +{overdueSources.length - 6} more — <Link href="/rep/territory" style={{ color: "var(--nyx-accent)", textDecoration: "none" }}>view all</Link>
          </p>
        )}
      </div>
    </div>
  );
}
