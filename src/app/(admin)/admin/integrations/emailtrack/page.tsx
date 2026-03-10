import Link from "next/link";

const CYAN = "var(--nyx-accent)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const BORDER_STR = "var(--nyx-accent-str)";

const steps = [
  {
    step: "1",
    title: "Configure your outbound email provider",
    desc: "NyxAegis uses Resend for transactional email. Email open tracking is built into Resend's API — no additional setup needed for basic opens/clicks.",
  },
  {
    step: "2",
    title: "Enable open-tracking webhooks",
    desc: "In your Resend dashboard, go to Webhooks and add your NyxAegis webhook endpoint: https://yourdomain.com/api/webhooks/email. Select the email.opened and email.clicked event types.",
  },
  {
    step: "3",
    title: "Add webhook secret to environment",
    desc: "Copy your webhook signing secret from Resend and add it to your .env file as RESEND_WEBHOOK_SECRET. This verifies that webhook payloads come from Resend.",
  },
  {
    step: "4",
    title: "View engagement in Communications",
    desc: "Once configured, email opens and clicks are logged as Activity events against each lead or hospital. View them in the Communications Hub or Activity Feed.",
  },
];

export default function EmailTrackIntegrationPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/integrations" style={{ fontSize: "0.8rem", color: TEXT_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          ← Back to Integrations
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(167,139,250,0.08)", border: `1px solid ${BORDER_STR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
            📬
          </div>
          <div>
            <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>INTEGRATION</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Email Open Tracking</h1>
          </div>
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: "0.9rem", maxWidth: 640, lineHeight: 1.6 }}>
          Know when a hospital contact opens your outreach email. Track email opens, link clicks, and bounces and log them automatically as activity events against the associated lead record.
        </p>
      </div>

      {/* Status banner */}
      <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 10, padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.1rem" }}>⚠️</span>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24", marginBottom: 2 }}>Setup Required</div>
          <div style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>Email tracking webhooks have not been configured. Follow the steps below to enable open tracking.</div>
        </div>
      </div>

      {/* Setup steps */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT, marginBottom: 20 }}>Setup Guide</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {steps.map((s) => (
            <div key={s.step} style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--nyx-accent-dim)", border: `1px solid ${BORDER_STR}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900, fontSize: "0.85rem", color: CYAN }}>
                {s.step}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: TEXT, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: "0.82rem", color: TEXT_MUTED, lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Environment variables */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT, marginBottom: 16 }}>Required Environment Variables</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["RESEND_WEBHOOK_SECRET"].map(key => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
              <code style={{ fontSize: "0.82rem", color: CYAN, fontFamily: "monospace" }}>{key}</code>
              <span style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 600 }}>NOT SET</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracked events */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT, marginBottom: 16 }}>Tracked Email Events</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "👁️", event: "Opened", desc: "Contact opened the email", color: "#34d399" },
            { icon: "🖱️", event: "Link Clicked", desc: "Contact clicked a link in the email", color: "#60a5fa" },
            { icon: "↩️", event: "Bounced", desc: "Email could not be delivered", color: "#f87171" },
            { icon: "🚫", event: "Unsubscribed", desc: "Contact opted out of future emails", color: "#fbbf24" },
          ].map(item => (
            <div key={item.event} style={{ display: "flex", gap: 14, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, alignItems: "center" }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: item.color }}>{item.event}</span>
                <span style={{ fontSize: "0.78rem", color: TEXT_MUTED, marginLeft: 10 }}>{item.desc}</span>
              </div>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 4, padding: "2px 8px" }}>AUTO-LOGGED</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
