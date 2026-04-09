"use client";
import { useState } from "react";

const CYAN   = "var(--nyx-accent)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const LBL    = "var(--nyx-accent-label)";

const CAT_LABEL: Record<string, string> = {
  BROCHURE:          "📄 Brochures",
  CLINICAL_PROTOCOL: "🏥 Clinical Protocols",
  INSURANCE_GUIDE:   "💳 Insurance Guides",
  VISITATION_POLICY: "🚪 Visitation Policies",
  BED_AVAILABILITY:  "🛏️ Bed Availability",
  REFERRAL_FORM:     "📋 Referral Forms",
  TRAINING_MATERIAL: "🎓 Training Materials",
  MARKETING_ASSET:   "📢 Marketing Assets",
  OTHER:             "📁 Other",
};

export interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  fileUrl: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  fileSizeKb: number | null;
}

// ── Share button (handles Web Share API + clipboard fallback) ─────────────────
function ShareButton({ resource }: { resource: ResourceItem }) {
  const [copied, setCopied] = useState(false);
  const url = resource.fileUrl ?? resource.externalUrl;
  if (!url) return null;

  async function handleShare() {
    // Web Share API (native share sheet on mobile)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: resource.title,
          text: resource.description ?? `Check out this resource: ${resource.title}`,
          url: url!,
        });
        return;
      } catch {
        // User cancelled — fall through to clipboard
      }
    }
    // Desktop fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — do nothing
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        fontSize: "0.78rem",
        fontWeight: 700,
        color: copied ? "#34d399" : "#a78bfa",
        background: copied ? "rgba(52,211,153,0.08)" : "rgba(167,139,250,0.08)",
        border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(167,139,250,0.25)"}`,
        borderRadius: 6,
        padding: "5px 12px",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? "✓ Copied!" : "📤 Share"}
    </button>
  );
}

// ── Share-via-email button ─────────────────────────────────────────────────────
function EmailShareButton({ resource }: { resource: ResourceItem }) {
  const url = resource.fileUrl ?? resource.externalUrl;
  if (!url) return null;

  const subject = encodeURIComponent(`Resource from Destiny Springs: ${resource.title}`);
  const body = encodeURIComponent(
    `Hi,\n\nI wanted to share this resource with you from Destiny Springs Healthcare:\n\n${resource.title}\n${resource.description ? resource.description + "\n" : ""}\n${url}\n\nLet me know if you have any questions!\n`
  );
  const mailto = `mailto:?subject=${subject}&body=${body}`;

  return (
    <a
      href={mailto}
      style={{
        fontSize: "0.78rem",
        fontWeight: 700,
        color: "#60a5fa",
        background: "rgba(96,165,250,0.08)",
        border: "1px solid rgba(96,165,250,0.2)",
        borderRadius: 6,
        padding: "5px 12px",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      ✉️ Email
    </a>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RepResourcesClient({ resources }: { resources: ResourceItem[] }) {
  const grouped: Record<string, ResourceItem[]> = {};
  for (const r of resources) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: LBL, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
          FIELD PORTAL
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Resource Library</h1>
        <p style={{ color: MUTED, fontSize: "0.875rem", marginTop: 4 }}>
          Brochures, referral forms, insurance guides, and training materials
        </p>
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
              {items.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, marginBottom: 6 }}>{r.title}</div>
                  {r.description && (
                    <div style={{ fontSize: "0.78rem", color: MUTED, marginBottom: 10, flex: 1 }}>{r.description}</div>
                  )}
                  {r.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {r.tags.map((t) => (
                        <span key={t} style={{ fontSize: "0.62rem", background: "rgba(0,0,0,0.3)", color: MUTED, padding: "1px 7px", borderRadius: 4 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.fileSizeKb && (
                    <div style={{ fontSize: "0.65rem", color: "#6b7280", marginBottom: 8 }}>
                      {r.fileSizeKb >= 1024
                        ? `${(r.fileSizeKb / 1024).toFixed(1)} MB`
                        : `${r.fileSizeKb} KB`}
                    </div>
                  )}
                  {/* Action buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto", paddingTop: 6 }}>
                    {r.fileUrl && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.78rem", fontWeight: 700, color: CYAN, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "5px 12px", textDecoration: "none", whiteSpace: "nowrap" }}
                      >
                        📥 Download
                      </a>
                    )}
                    {r.externalUrl && !r.fileUrl && (
                      <a
                        href={r.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.78rem", fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 6, padding: "5px 12px", textDecoration: "none", whiteSpace: "nowrap" }}
                      >
                        🔗 Open
                      </a>
                    )}
                    {/* One-tap share */}
                    <ShareButton resource={r} />
                    {/* Email share */}
                    <EmailShareButton resource={r} />
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
