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
    title: "Create a DocuSign developer account",
    desc: "Sign up at developers.docusign.com and create an integration. Note your Integration Key and Account ID from the Admin panel.",
  },
  {
    step: "2",
    title: "Configure OAuth redirect",
    desc: "In DocuSign Admin > Apps & Keys, add your NyxAegis domain as an allowed redirect URI (e.g. https://yourdomain.com/api/auth/callback/docusign).",
  },
  {
    step: "3",
    title: "Add credentials to environment",
    desc: "Copy the Integration Key, Account ID, and Client Secret into your .env file as DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_ACCOUNT_ID, and DOCUSIGN_CLIENT_SECRET.",
  },
  {
    step: "4",
    title: "Send contracts for e-signature",
    desc: "Once configured, contracts and compliance documents can be sent directly from NyxAegis for e-signature. Rep and hospital signatories will receive DocuSign emails.",
  },
];

export default function ESignIntegrationPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/integrations" style={{ fontSize: "0.8rem", color: TEXT_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          ← Back to Integrations
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(96,165,250,0.08)", border: `1px solid ${BORDER_STR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
            ✍️
          </div>
          <div>
            <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>INTEGRATION</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>E-Signature (DocuSign)</h1>
          </div>
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: "0.9rem", maxWidth: 640, lineHeight: 1.6 }}>
          Send contracts, BAAs, NDAs, and compliance documents for electronic signature directly from NyxAegis. Signatories receive DocuSign emails and signed copies are stored against the contract record.
        </p>
      </div>

      {/* Status banner */}
      <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 10, padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.1rem" }}>⚠️</span>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24", marginBottom: 2 }}>Setup Required</div>
          <div style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>DocuSign credentials have not been configured. Follow the steps below to enable e-signature.</div>
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
          {["DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_CLIENT_SECRET"].map(key => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
              <code style={{ fontSize: "0.82rem", color: CYAN, fontFamily: "monospace" }}>{key}</code>
              <span style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 600 }}>NOT SET</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supported document types */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT, marginBottom: 16 }}>Supported Document Types</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["Service Agreements", "Business Associate Agreements (BAA)", "Non-Disclosure Agreements (NDA)", "Master Service Agreements (MSA)", "Rep Commission Contracts", "Compliance Documents"].map(doc => (
            <div key={doc} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              <span style={{ color: "#60a5fa", fontSize: "0.75rem" }}>✓</span>
              <span style={{ fontSize: "0.82rem", color: TEXT_MUTED }}>{doc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
