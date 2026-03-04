import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

const CYAN = "#00d4ff";
const CARD = "rgba(255,255,255,0.03)";
const BORDER = "rgba(0,212,255,0.08)";
const TEXT = "#d8e8f4";
const TEXT_MUTED = "rgba(216,232,244,0.55)";

const stageColors: Record<string, string> = {
  DISCOVERY: "#94a3b8", QUALIFICATION: "#fbbf24", DEMO: "#f59e0b",
  PROPOSAL: "#00d4ff", NEGOTIATION: "#60a5fa", CLOSED_WON: "#34d399", CLOSED_LOST: "#f87171", ON_HOLD: "#94a3b8",
};

export default async function AccountEngagementsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const hospital = await prisma.hospital.findUnique({
    where: { userId: session.user.id },
    include: {
      opportunities: {
        include: { assignedRep: { include: { user: { select: { name: true } } } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!hospital) redirect("/login");

  const activeCount = hospital.opportunities.filter(o => !["CLOSED_WON", "CLOSED_LOST"].includes(o.stage)).length;
  const wonCount = hospital.opportunities.filter(o => o.stage === "CLOSED_WON").length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "rgba(0,212,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>ACCOUNT PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>My Engagements</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>All engagement activities with your BD team</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Active", value: activeCount, color: CYAN },
          { label: "Won", value: wonCount, color: "#34d399" },
          { label: "Total", value: hospital.opportunities.length, color: TEXT },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 20px" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Engagement", "Stage", "Service Line", "BD Rep", "Value", "Close Date"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "rgba(0,212,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hospital.opportunities.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: TEXT_MUTED }}>No engagements yet.</td></tr>
            )}
            {hospital.opportunities.map((opp) => (
              <tr key={opp.id} style={{ borderBottom: `1px solid rgba(0,212,255,0.04)` }}>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: TEXT }}>{opp.title}</div>
                  {opp.description && <div style={{ fontSize: "0.72rem", color: TEXT_MUTED, marginTop: 2 }}>{opp.description.slice(0, 60)}{opp.description.length > 60 ? "…" : ""}</div>}
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: stageColors[opp.stage] ?? CYAN, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{opp.stage.replace("_", " ")}</span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>{opp.serviceLine.replace(/_/g, " ")}</td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>{opp.assignedRep?.user.name ?? "Unassigned"}</td>
                <td style={{ padding: "13px 16px", fontSize: "0.9rem", fontWeight: 700, color: CYAN }}>{opp.value ? formatCurrency(Number(opp.value)) : "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>{formatDate(opp.closeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
