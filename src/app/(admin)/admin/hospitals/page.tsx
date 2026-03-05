import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const statusColor: Record<string, string> = {
  ACTIVE: "#34d399", INACTIVE: "#94a3b8", PROSPECT: "var(--nyx-accent)", CHURNED: "#f87171",
};

export default async function HospitalsPage() {
  const hospitals = await prisma.hospital.findMany({
    include: { user: { select: { email: true } }, _count: { select: { opportunities: true, contacts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>ACCOUNTS</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Hospitals</h1>
          <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>{hospitals.length} hospital accounts</p>
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Hospital", "System", "Type", "Status", "Opportunities", "Contacts", "Added"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hospitals.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: TEXT_MUTED, fontSize: "0.9rem" }}>No hospitals yet. Add your first hospital account.</td></tr>
            )}
            {hospitals.map((h) => (
              <tr key={h.id} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: TEXT }}>{h.hospitalName}</div>
                  <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{h.city}{h.city && h.state ? ", " : ""}{h.state}</div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: TEXT_MUTED }}>{h.systemName ?? "-"}</td>
                <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{h.hospitalType.replace(/_/g, " ")}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: statusColor[h.status] ?? CYAN, background: "rgba(0,0,0,0.3)", padding: "3px 9px", borderRadius: 4 }}>{h.status}</span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: TEXT_MUTED, textAlign: "center" }}>{h._count.opportunities}</td>
                <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: TEXT_MUTED, textAlign: "center" }}>{h._count.contacts}</td>
                <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{formatDate(h.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
