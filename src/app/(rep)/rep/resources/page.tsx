import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CYAN  = "var(--nyx-accent)";
const CARD  = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT  = "var(--nyx-text)";
const MUTED = "var(--nyx-text-muted)";
const LBL   = "var(--nyx-accent-label)";

const CAT_LABEL: Record<string, string> = {
  BROCHURE:          "📄 Brochure",
  CLINICAL_PROTOCOL: "🏥 Clinical Protocol",
  INSURANCE_GUIDE:   "💳 Insurance Guide",
  VISITATION_POLICY: "🚪 Visitation Policy",
  BED_AVAILABILITY:  "🛏️ Bed Availability",
  REFERRAL_FORM:     "📋 Referral Form",
  TRAINING_MATERIAL: "🎓 Training Material",
  MARKETING_ASSET:   "📢 Marketing Asset",
  OTHER:             "📁 Other",
};

export const dynamic = "force-dynamic";

export default async function RepResourcesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const resources = await prisma.resource.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  // Group by category
  const grouped: Record<string, typeof resources> = {};
  for (const r of resources) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: LBL, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>FIELD PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Resource Library</h1>
        <p style={{ color: MUTED, fontSize: "0.875rem", marginTop: 4 }}>Brochures, referral forms, insurance guides, and training materials</p>
      </div>

      {resources.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 48, textAlign: "center", color: MUTED }}>
          No resources have been published yet. Check back soon.
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: LBL, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
              {CAT_LABEL[cat] ?? cat}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {items.map(r => (
                <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, marginBottom: 6 }}>{r.title}</div>
                  {r.description && <div style={{ fontSize: "0.78rem", color: MUTED, marginBottom: 10 }}>{r.description}</div>}
                  {r.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {r.tags.map(t => (
                        <span key={t} style={{ fontSize: "0.62rem", background: "rgba(0,0,0,0.3)", color: MUTED, padding: "1px 7px", borderRadius: 4 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    {r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "0.78rem", fontWeight: 700, color: CYAN, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "5px 12px", textDecoration: "none" }}>
                        📥 Download
                      </a>
                    )}
                    {r.externalUrl && (
                      <a href={r.externalUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "0.78rem", fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 6, padding: "5px 12px", textDecoration: "none" }}>
                        🔗 Open
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
