import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export const dynamic = "force-dynamic";

const stageColors: Record<string, string> = {
  INQUIRY: "#94a3b8", CLINICAL_REVIEW: "#fbbf24", INSURANCE_AUTH: "#f59e0b",
  ADMITTED: "var(--nyx-accent)", ACTIVE: "#60a5fa", DISCHARGED: "#34d399", DECLINED: "#f87171", ON_HOLD: "#94a3b8",
};

export default async function RepOpportunitiesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const opportunities = await prisma.opportunity.findMany({
    include: {
      hospital: { select: { hospitalName: true, city: true, state: true } },
      assignedRep: { include: { user: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>All Opportunities</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>{opportunities.length} shared opportunities across your team</p>
      </div>

      <div className="nyx-table-scroll" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Opportunity", "Hospital", "Assigned Rep", "Stage", "Service Line", "Value", "Close Date"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: TEXT_MUTED }}>No opportunities yet.</td></tr>
            )}
            {opportunities.map((opp) => (
              <tr key={opp.id} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: TEXT }}>{opp.title}</div>
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ fontSize: "0.85rem", color: TEXT }}>{opp.hospital.hospitalName}</div>
                  <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{opp.hospital.city}{opp.hospital.city && opp.hospital.state ? ", " : ""}{opp.hospital.state}</div>
                </td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>{opp.assignedRep?.user.name ?? "Unassigned"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: stageColors[opp.stage] ?? CYAN, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{opp.stage.replace(/_/g, " ")}</span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>{opp.serviceLine.replace(/_/g, " ")}</td>
                <td style={{ padding: "13px 16px", fontSize: "0.9rem", fontWeight: 700, color: CYAN }}>{opp.value ? formatCurrency(Number(opp.value)) : "-"}</td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>{formatDate(opp.closeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
