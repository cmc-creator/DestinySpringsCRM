import Link from "next/link";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const integrations = [
  { name: "Stripe",     desc: "Payment processing for invoices and rep commissions", icon: "💳", status: "connected", href: null },
  { name: "Resend",     desc: "Transactional email for notifications and digests",   icon: "📧", status: "connected", href: null },
  { name: "Salesforce", desc: "Sync opportunities and accounts with Salesforce CRM", icon: "☁️", status: "available", href: null },
  { name: "Epic EHR",   desc: "Integrate with Epic for clinical data context",        icon: "🏥", status: "available", href: null },
  { name: "DocuSign",   desc: "E-signature for contracts and compliance docs",        icon: "✍️", status: "available", href: null },
  { name: "Slack",      desc: "Team notifications and pipeline alerts in Slack",      icon: "💬", status: "available", href: null },
  { name: "Zapier",     desc: "Connect NyxAegis to 5000+ apps via Zapier",           icon: "⚡", status: "available", href: null },
];

export default function IntegrationsPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>SETTINGS</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Integrations</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Connect NyxAegis with your existing healthcare tech stack</p>
      </div>

      {/* ── MedWorxs Featured Integration ── */}
      <Link href="/admin/integrations/medworxs" style={{ textDecoration: "none", display: "block", marginBottom: 24 }}>
        <div style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 14, padding: "24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `var(--nyx-accent)` }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 900, fontSize: "1rem", color: TEXT }}>MedWorxs EHR</span>
                <span style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "2px 10px", fontSize: "0.62rem", fontWeight: 800, color: "#f59e0b", letterSpacing: "0.1em" }}>SETUP REQUIRED</span>
                <span style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 999, padding: "2px 10px", fontSize: "0.62rem", fontWeight: 800, color: CYAN, letterSpacing: "0.1em" }}>REFERRAL TRACKING</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: TEXT_MUTED, lineHeight: 1.6, maxWidth: 580 }}>
                Import patient referrals directly from MedWorxs admissions data. Supports CSV upload and real-time HL7 ADT^A01 feed. Automatically matches referring providers to your referral source directory.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: CYAN, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", alignSelf: "center" }}>
              Configure
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </div>
        </div>
      </Link>

      {/* ── Other integrations ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {integrations.map((int) => (
          <div key={int.name} style={{ background: CARD, border: `1px solid ${int.status === "connected" ? "var(--nyx-accent-str)" : BORDER}`, borderRadius: 12, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: "1.8rem" }}>{int.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: TEXT }}>{int.name}</div>
                  {int.status === "connected" && <div style={{ fontSize: "0.65rem", color: "#34d399", fontWeight: 600, letterSpacing: "0.08em" }}>● CONNECTED</div>}
                  {int.status === "available" && <div style={{ fontSize: "0.65rem", color: TEXT_MUTED, letterSpacing: "0.08em" }}>NOT CONNECTED</div>}
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.82rem", color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 14 }}>{int.desc}</p>
            <button style={{ width: "100%", background: int.status === "connected" ? "rgba(239,68,68,0.06)" : "var(--nyx-accent-dim)", border: `1px solid ${int.status === "connected" ? "rgba(239,68,68,0.15)" : "var(--nyx-accent-mid)"}`, borderRadius: 6, padding: "8px", fontSize: "0.78rem", color: int.status === "connected" ? "#f87171" : CYAN, cursor: "pointer", fontWeight: 600 }}>
              {int.status === "connected" ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
