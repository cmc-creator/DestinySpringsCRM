import { prisma } from "@/lib/prisma";
import Link from "next/link";

const GOLD = "#c9a84c";
const C = {
  border: "rgba(201,168,76,0.15)",
  text: "#ede4cf",
  muted: "rgba(237,228,207,0.45)",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8", SENT: "#fbbf24", PAID: "#34d399", OVERDUE: "#f87171", VOID: "#64748b",
};
const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8", SENT: "#fbbf24", SIGNED: "#60a5fa", ACTIVE: "#34d399",
  EXPIRED: "#f87171", TERMINATED: "#64748b",
};

export default async function InvoiceContractPanel() {
  const [invoiceStats, contractStats, recentInvoices, recentContracts] = await Promise.all([
    prisma.invoice.groupBy({ by: ["status"], _count: { id: true }, _sum: { totalAmount: true } }),
    prisma.contract.groupBy({ by: ["status"], _count: { id: true }, _sum: { value: true } }),
    prisma.invoice.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, invoiceNumber: true, status: true, totalAmount: true, dueDate: true,
        hospital: { select: { hospitalName: true } },
      },
    }),
    prisma.contract.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, title: true, status: true, value: true, endDate: true,
        hospital: { select: { hospitalName: true } },
      },
    }),
  ]);

  const totalInvoiced = invoiceStats.reduce((s, r) => s + Number(r._sum.totalAmount ?? 0), 0);
  const totalPaid = invoiceStats.find(r => r.status === "PAID")?._sum.totalAmount ?? 0;
  const overdueCount = invoiceStats.find(r => r.status === "OVERDUE")?._count.id ?? 0;
  const overdueValue = Number(invoiceStats.find(r => r.status === "OVERDUE")?._sum.totalAmount ?? 0);

  const activeContracts = contractStats.find(r => r.status === "ACTIVE")?._count.id ?? 0;
  const activeContractValue = Number(contractStats.find(r => r.status === "ACTIVE")?._sum.value ?? 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: "rgba(201,168,76,0.7)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
          BILLING
        </p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text, margin: "4px 0 0" }}>Invoices & Contracts</h2>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Invoiced", value: fmt(totalInvoiced), color: GOLD, icon: "📄" },
          { label: "Collected", value: fmt(Number(totalPaid)), color: "#34d399", icon: "✅" },
          { label: "Overdue", value: `${overdueCount} · ${fmt(overdueValue)}`, color: "#f87171", icon: "⚠️" },
          { label: "Active Contracts", value: `${activeContracts} · ${fmt(activeContractValue)}`, color: "#60a5fa", icon: "📋" },
        ].map(k => (
          <div key={k.label} className="gold-card" style={{ borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 900, color: k.color, lineHeight: 1.2, marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: "0.62rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Invoice status breakdown */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>INVOICES</p>
            <Link href="/admin/invoices" style={{ fontSize: "0.65rem", color: GOLD, textDecoration: "none", fontWeight: 600 }}>View all →</Link>
          </div>
          {invoiceStats.length === 0
            ? <p style={{ color: C.muted, fontSize: "0.85rem" }}>No invoices yet.</p>
            : (
              <>
                {invoiceStats.map(r => (
                  <div key={r.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: INVOICE_STATUS_COLORS[r.status] ?? GOLD }} />
                      <span style={{ fontSize: "0.78rem", color: C.text }}>{r.status}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INVOICE_STATUS_COLORS[r.status] ?? GOLD }}>{r._count.id}</span>
                      <span style={{ fontSize: "0.65rem", color: C.muted, marginLeft: 8 }}>{fmt(Number(r._sum.totalAmount ?? 0))}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: "0.65rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>RECENT</p>
                  {recentInvoices.map(inv => (
                    <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                      <span style={{ fontSize: "0.62rem", color: INVOICE_STATUS_COLORS[inv.status] ?? GOLD, fontWeight: 700, background: `${INVOICE_STATUS_COLORS[inv.status] ?? GOLD}18`, border: `1px solid ${INVOICE_STATUS_COLORS[inv.status] ?? GOLD}33`, borderRadius: 4, padding: "2px 6px" }}>{inv.status}</span>
                      <span style={{ flex: 1, fontSize: "0.75rem", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.hospital.hospitalName}</span>
                      <span style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(Number(inv.totalAmount))}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>

        {/* Contract status breakdown */}
        <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(201,168,76,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>CONTRACTS</p>
            <Link href="/admin/contracts" style={{ fontSize: "0.65rem", color: GOLD, textDecoration: "none", fontWeight: 600 }}>View all →</Link>
          </div>
          {contractStats.length === 0
            ? <p style={{ color: C.muted, fontSize: "0.85rem" }}>No contracts yet.</p>
            : (
              <>
                {contractStats.map(r => (
                  <div key={r.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: CONTRACT_STATUS_COLORS[r.status] ?? GOLD }} />
                      <span style={{ fontSize: "0.78rem", color: C.text }}>{r.status}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: CONTRACT_STATUS_COLORS[r.status] ?? GOLD }}>{r._count.id}</span>
                      {r._sum.value && <span style={{ fontSize: "0.65rem", color: C.muted, marginLeft: 8 }}>{fmt(Number(r._sum.value))}</span>}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: "0.65rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>RECENT</p>
                  {recentContracts.map(con => (
                    <div key={con.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                      <span style={{ fontSize: "0.62rem", color: CONTRACT_STATUS_COLORS[con.status] ?? GOLD, fontWeight: 700, background: `${CONTRACT_STATUS_COLORS[con.status] ?? GOLD}18`, border: `1px solid ${CONTRACT_STATUS_COLORS[con.status] ?? GOLD}33`, borderRadius: 4, padding: "2px 6px" }}>{con.status}</span>
                      <span style={{ flex: 1, fontSize: "0.75rem", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{con.title}</span>
                      {con.value && <span style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(Number(con.value))}</span>}
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}
