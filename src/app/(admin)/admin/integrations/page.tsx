import Link from "next/link";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const integrations = [
  { name: "Stripe",             desc: "Payment processing for invoices and rep commissions",              icon: "💳", status: "connected", href: null },
  { name: "Resend",             desc: "Transactional email for notifications and digests",                icon: "📧", status: "connected", href: null },
  { name: "Microsoft Outlook",  desc: "Send emails and manage calendar via Microsoft Graph API",          icon: "📮", status: "available", href: "/admin/communications" },
  { name: "Microsoft Teams",    desc: "Post channel messages and alerts via Teams Incoming Webhooks",      icon: "💬", status: "available", href: "/admin/communications" },
  { name: "Google Gmail",       desc: "Send emails directly from your Gmail account via Gmail API",       icon: "📬", status: "available", href: "/admin/communications" },
  { name: "Google Calendar",    desc: "Create follow-up events and meeting invites via Google Calendar",   icon: "📅", status: "available", href: "/admin/communications" },
  { name: "Salesforce",         desc: "Sync opportunities and accounts with Salesforce CRM",              icon: "☁️", status: "available", href: null },
  { name: "Epic EHR",           desc: "Integrate with Epic for clinical data context",                    icon: "🏥", status: "available", href: null },
  { name: "DocuSign",           desc: "E-signature for contracts and compliance docs",                    icon: "✍️", status: "available", href: null },
  { name: "Slack",              desc: "Team notifications and pipeline alerts in Slack",                  icon: "🔔", status: "available", href: null },
  { name: "Zapier",     desc: "Connect NyxAegis to 5000+ apps via Zapier",           icon: "⚡", status: "available", href: null },
];

const featuredIntegrations = [
  {
    name: "MedWorxs EHR",
    badges: [{ label: "SETUP REQUIRED", color: "#f59e0b" }, { label: "REFERRAL TRACKING", color: CYAN }],
    desc: "Import patient referrals directly from MedWorxs admissions data. Supports CSV upload and real-time HL7 ADT^A01 feed. Automatically matches referring providers to your referral source directory.",
    href: "/admin/integrations/medworxs",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    name: "ICANotes EHR",
    badges: [{ label: "SETUP REQUIRED", color: "#f59e0b" }, { label: "REFERRAL TRACKING", color: "#34d399" }],
    desc: "Import behavioral health referrals from ICANotes. Supports CSV export upload and webhook for real-time admission events. Matches referring clinicians to your referral source directory.",
    href: "/admin/integrations/icanotes",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/>
      </svg>
    ),
  },
  {
    name: "Paycom",
    badges: [{ label: "SETUP REQUIRED", color: "#f59e0b" }, { label: "HR / PAYROLL", color: "#a78bfa" }],
    desc: "Sync rep employee records and commission payouts from Paycom. Import your BD team roster, update title and contact info, and log commission payments — all from your Paycom payroll exports.",
    href: "/admin/integrations/paycom",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        <line x1="6" y1="15" x2="10" y2="15"/>
      </svg>
    ),
  },
  {
    name: "Monday.com",
    badges: [{ label: "SETUP REQUIRED", color: "#f59e0b" }, { label: "CRM IMPORT", color: "#fb923c" }],
    desc: "Connect your Monday.com workspace and import board items as leads, hospital accounts, or opportunities. Map your columns to NyxAegis fields with a visual column mapper.",
    href: "/admin/integrations/monday",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    name: "CRM Migration",
    badges: [{ label: "IMPORT TOOL", color: "#60a5fa" }],
    desc: "Switching from Salesforce, HubSpot, Zoho, or Pipedrive? Use the migration wizard to import your accounts, contacts, leads, and opportunities into NyxAegis with smart column detection.",
    href: "/admin/integrations/migrate",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
];

export default function IntegrationsPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>SETTINGS</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Integrations</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Connect NyxAegis with your existing healthcare tech stack</p>
      </div>

      {/* ── Featured Integrations ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {featuredIntegrations.map((int) => (
          <Link key={int.name} href={int.href} style={{ textDecoration: "none", display: "block" }}>
            <div style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 14, padding: "24px", position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `var(--nyx-accent)` }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {int.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 900, fontSize: "1rem", color: TEXT }}>{int.name}</span>
                    {int.badges.map((b) => (
                      <span key={b.label} style={{ background: `${b.color}18`, border: `1px solid ${b.color}40`, borderRadius: 999, padding: "2px 10px", fontSize: "0.62rem", fontWeight: 800, color: b.color, letterSpacing: "0.1em" }}>{b.label}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.875rem", color: TEXT_MUTED, lineHeight: 1.6, maxWidth: 580 }}>{int.desc}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: CYAN, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", alignSelf: "center" }}>
                  Configure
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Other integrations ── */}
      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>OTHER CONNECTIONS</p>
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
