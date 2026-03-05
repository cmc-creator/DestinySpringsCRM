import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function RepDocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    include: { complianceDocs: { orderBy: { createdAt: "desc" } }, w9Form: true },
  });
  if (!rep) redirect("/login");

  const docTypes = [
    { type: "HIPAA_TRAINING", label: "HIPAA Training Certificate", icon: "🛡️" },
    { type: "STATE_LICENSE", label: "State License(s)", icon: "📜" },
    { type: "BAA", label: "Business Associate Agreement", icon: "🤝" },
    { type: "NDA", label: "Non-Disclosure Agreement", icon: "🔒" },
    { type: "W9", label: "W-9 Tax Form", icon: "💼" },
    { type: "INSURANCE", label: "Insurance Certificate", icon: "🏦" },
    { type: "BACKGROUND_CHECK", label: "Background Check", icon: "✅" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Compliance Documents</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Your healthcare credentials and compliance files</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Docs", value: rep.complianceDocs.length, color: CYAN },
          { label: "Verified", value: rep.complianceDocs.filter(d => d.verified).length, color: "#34d399" },
          { label: "Pending", value: rep.complianceDocs.filter(d => !d.verified).length, color: "#fbbf24" },
          { label: "HIPAA Status", value: rep.hipaaTrainedAt ? "✓ Trained" : "⚠ Needed", color: rep.hipaaTrainedAt ? "#34d399" : "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 20px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
        {docTypes.map((dt) => {
          const hasDoc = rep.complianceDocs.some(d => d.type === dt.type);
          return (
            <div key={dt.type} style={{ background: CARD, border: `1px solid ${hasDoc ? "rgba(52,211,153,0.2)" : BORDER}`, borderRadius: 10, padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "1.4rem" }}>{dt.icon}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: hasDoc ? "#34d399" : TEXT_MUTED }}>{hasDoc ? "✓ ON FILE" : "MISSING"}</span>
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: TEXT }}>{dt.label}</div>
            </div>
          );
        })}
      </div>

      {rep.complianceDocs.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Type", "Title", "Status", "Expires", "Added"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rep.complianceDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                  <td style={{ padding: "12px 16px", fontSize: "0.78rem", color: TEXT_MUTED }}>{doc.type.replace(/_/g, " ")}</td>
                  <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: TEXT }}>{doc.title}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: doc.verified ? "#34d399" : "#fbbf24", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{doc.verified ? "VERIFIED" : "PENDING"}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{formatDate(doc.expiresAt)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{formatDate(doc.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
