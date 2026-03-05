import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const statusColors: Record<string, string> = {
  PENDING: "#fbbf24", PROCESSING: "#60a5fa", PAID: "#34d399", FAILED: "#f87171", CANCELLED: "#94a3b8",
};

export default async function RepPaymentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    include: { payments: { orderBy: { createdAt: "desc" } }, w9Form: true },
  });
  if (!rep) redirect("/login");

  const totalPaid = rep.payments.filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = rep.payments.filter(p => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Payments & Compensation</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Your commission and payment history</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Earned", value: formatCurrency(totalPaid), color: "#34d399" },
          { label: "Pending", value: formatCurrency(totalPending), color: "#fbbf24" },
          { label: "W-9 Status", value: rep.w9OnFile ? "On File ✓" : "Not Filed", color: rep.w9OnFile ? "#34d399" : "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 22px" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      {!rep.w9OnFile && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#fbbf24", marginBottom: 4 }}>⚠ W-9 Required</div>
          <p style={{ fontSize: "0.82rem", color: "rgba(216,232,244,0.55)", margin: 0 }}>Please submit your W-9 form to receive payments. Contact your administrator.</p>
        </div>
      )}

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Description", "Amount", "Status", "Period", "Paid Date"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rep.payments.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: TEXT_MUTED }}>No payments yet.</td></tr>
            )}
            {rep.payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                <td style={{ padding: "13px 16px", fontSize: "0.85rem", color: TEXT }}>{p.description ?? "Commission payment"}</td>
                <td style={{ padding: "13px 16px", fontSize: "0.95rem", fontWeight: 700, color: CYAN }}>{formatCurrency(Number(p.amount))}</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: statusColors[p.status] ?? CYAN, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{p.status}</span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: "0.78rem", color: TEXT_MUTED }}>
                  {p.periodStart && p.periodEnd ? `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}` : "-"}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: p.paidAt ? "#34d399" : TEXT_MUTED }}>{formatDate(p.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
