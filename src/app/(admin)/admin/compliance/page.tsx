import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function CompliancePage() {
  const docs = await prisma.complianceDoc.findMany({
    include: { rep: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const reps = await prisma.rep.findMany({
    include: { user: { select: { name: true } }, complianceDocs: true },
    where: { status: "ACTIVE" },
  });

  const verifiedCount = docs.filter(d => d.verified).length;
  const pendingCount = docs.filter(d => !d.verified).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>INTELLIGENCE</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Compliance Center</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>HIPAA training, licenses, and compliance document management</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Verified Docs", value: verifiedCount, color: "#34d399" },
          { label: "Pending Review", value: pendingCount, color: "#fbbf24" },
          { label: "Active Reps", value: reps.length, color: CYAN },
        ].map((s) => (
          <div key={s.label} className="gold-card" style={{ borderRadius: 10, padding: "14px 20px" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rep compliance status */}
      <div className="gold-card" style={{ borderRadius: 12, padding: "20px", marginBottom: 24 }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>REP COMPLIANCE STATUS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reps.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: "0.85rem" }}>No active reps.</p>}
          {reps.map((rep) => {
            const hasHipaa = rep.hipaaTrainedAt !== null;
            const docCount = rep.complianceDocs.length;
            const verifiedDocs = rep.complianceDocs.filter(d => d.verified).length;
            return (
              <div key={rep.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: TEXT }}>{rep.user.name}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: hasHipaa ? "#34d399" : "#f87171", fontWeight: 600 }}>{hasHipaa ? "✓ HIPAA" : "✗ HIPAA"}</span>
                  <span style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{verifiedDocs}/{docCount} docs verified</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Docs table */}
      <div className="gold-card" style={{ borderRadius: 12 }}>
        <div style={{ background: CARD, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Rep", "Document Type", "Title", "Status", "Expires", "Added"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: TEXT_MUTED }}>No compliance documents yet.</td></tr>
            )}
            {docs.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: TEXT }}>{doc.rep.user.name}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.78rem", color: TEXT_MUTED }}>{doc.type.replace(/_/g, " ")}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: TEXT }}>{doc.title}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: doc.verified ? "#34d399" : "#fbbf24", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>
                    {doc.verified ? "VERIFIED" : "PENDING"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{formatDate(doc.expiresAt)}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{formatDate(doc.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
