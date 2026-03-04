import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

const CYAN = "#00d4ff";
const CARD = "rgba(255,255,255,0.03)";
const BORDER = "rgba(0,212,255,0.08)";
const TEXT = "#d8e8f4";
const TEXT_MUTED = "rgba(216,232,244,0.55)";

export default async function AccountDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const hospital = await prisma.hospital.findUnique({
    where: { userId: session.user.id },
    include: {
      opportunities: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 4,
        where: { status: { not: "VOID" } },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        where: { status: { in: ["ACTIVE", "SIGNED", "SENT"] } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!hospital) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: TEXT_MUTED }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏥</div>
        <h2 style={{ color: TEXT, fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>No hospital profile found</h2>
        <p>Contact your NyxAegis representative to set up your hospital account.</p>
      </div>
    );
  }

  const activeOpps = hospital.opportunities.filter(o => !["CLOSED_WON", "CLOSED_LOST"].includes(o.stage));
  const unpaidInvoices = hospital.invoices.filter(i => i.status !== "PAID");
  const totalOwed = unpaidInvoices.reduce((s, i) => s + Number(i.totalAmount), 0);

  const stageColors: Record<string, string> = {
    DISCOVERY: "#94a3b8", QUALIFICATION: "#fbbf24", DEMO: "#f59e0b",
    PROPOSAL: "#00d4ff", NEGOTIATION: "#60a5fa", CLOSED_WON: "#34d399", CLOSED_LOST: "#f87171",
  };

  const invoiceStatusColors: Record<string, string> = {
    DRAFT: "#94a3b8", SENT: "#fbbf24", PAID: "#34d399", OVERDUE: "#f87171",
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "rgba(0,212,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>ACCOUNT PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>{hospital.hospitalName}</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>
          {hospital.systemName && `${hospital.systemName} · `}
          {hospital.city}{hospital.city && hospital.state ? ", " : ""}{hospital.state}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Active Engagements", value: activeOpps.length, icon: "🤝", color: CYAN },
          { label: "Open Invoices", value: unpaidInvoices.length, icon: "💳", color: "#fbbf24" },
          { label: "Amount Due", value: formatCurrency(totalOwed), icon: "💰", color: "#f87171" },
          { label: "Active Contracts", value: hospital.contracts.length, icon: "📝", color: "#34d399" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Active Engagements */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(0,212,255,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>ACTIVE ENGAGEMENTS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeOpps.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No active engagements.</p>}
            {activeOpps.map((opp) => (
              <div key={opp.id} style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT, marginBottom: 4 }}>{opp.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: stageColors[opp.stage] ?? CYAN, background: "rgba(0,0,0,0.3)", padding: "1px 7px", borderRadius: 3 }}>{opp.stage.replace("_", " ")}</span>
                  {opp.value && <span style={{ fontSize: "0.78rem", color: CYAN }}>{formatCurrency(Number(opp.value))}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(0,212,255,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>RECENT INVOICES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hospital.invoices.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No invoices yet.</p>}
            {hospital.invoices.map((inv) => (
              <div key={inv.id} style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: TEXT }}>{inv.invoiceNumber}</div>
                  <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>Due {formatDate(inv.dueDate)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: CYAN }}>{formatCurrency(Number(inv.totalAmount))}</div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: invoiceStatusColors[inv.status] ?? CYAN }}>{inv.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
