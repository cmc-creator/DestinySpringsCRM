import Link from "next/link";

const CYAN = "var(--nyx-accent)";
const BG = "var(--nyx-bg)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";

const tiers = [
  {
    name: "Solo Rep",
    price: "$49",
    period: "/mo",
    desc: "For independent BD reps managing their own book of business.",
    features: [
      "Up to 50 accounts",
      "Opportunity pipeline (up to 100 opps)",
      "Activity logging (calls, emails, notes)",
      "Document storage (1 GB)",
      "Mobile-friendly rep portal",
      "Basic analytics",
      "Email support",
    ],
    notIncluded: ["Team collaboration", "Territory management", "Custom branding"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "BD Team",
    price: "$199",
    period: "/mo",
    desc: "For BD teams of 2–10 reps with shared pipeline and reporting.",
    features: [
      "Unlimited accounts",
      "Unlimited opportunities",
      "Full team pipeline & analytics",
      "Territory management & maps",
      "Rep performance dashboards",
      "Contract management",
      "HIPAA compliance document vault",
      "Lead pipeline with source tracking",
      "Contact management (unlimited)",
      "Invoicing & payment tracking",
      "Priority email + chat support",
      "10 GB document storage",
    ],
    notIncluded: ["White-label branding", "SSO / SAML", "Dedicated CSM"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Health System",
    price: "Custom",
    period: "",
    desc: "For enterprise health systems and large BD organizations (10+ reps).",
    features: [
      "Everything in BD Team",
      "White-label branding (custom domain)",
      "SSO / SAML authentication",
      "Custom integrations (Salesforce, Epic, etc.)",
      "Dedicated Customer Success Manager",
      "SLA guarantee (99.9% uptime)",
      "Custom reporting & BI exports",
      "Unlimited document storage",
      "Multi-organization support",
      "Audit logs & compliance reports",
      "24/7 priority support",
      "On-site onboarding available",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    highlight: false,
  },
];

const faqs = [
  { q: "Is the platform HIPAA compliant?", a: "Yes. The platform is designed with HIPAA requirements in mind. We provide BAA (Business Associate Agreement) templates, HIPAA training doc storage, and encrypt data at rest and in transit. Contact us for a BAA for your organization." },
  { q: "Can I try it before committing?", a: "Yes - all plans include a 14-day free trial with no credit card required. You'll have full access to all features in your chosen plan." },
  { q: "What counts as an 'account'?", a: "Each distinct facility or health system entity counts as one account. A 10-facility IDN would count as 10 accounts on Solo Liaison, or unlimited on Team and above." },
  { q: "Can I add more liaisons to my team?", a: "Yes. Team plans support up to 10 liaisons. Additional liaison seats are $25/seat/mo. Enterprise plans include unlimited liaisons." },
  { q: "Do you offer nonprofit or community health discounts?", a: "Yes - contact us at ops@destinyspringshealthcare.com for nonprofit, FQHC, or government healthcare pricing." },
  { q: "What integrations do you support?", a: "Enterprise plans include custom integration development. We currently support Stripe for payments, Resend for email, and have open APIs for CRM, EHR (HL7/FHIR), and BI tool integrations." },
];

export default function PricingPage() {
  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh" }}>
      {/* NAV */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, background: "var(--nyx-bg)", backdropFilter: "blur(12px)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--nyx-bg)"/>
            <path d="M16 6 L26 12 L26 20 L16 26 L6 20 L6 12 Z" stroke={CYAN} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
            <circle cx="16" cy="16" r="4" fill={CYAN} fillOpacity="0.8"/>
          </svg>
          <span style={{ fontWeight: 900, color: TEXT }}>NyxAegis</span>
        </Link>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/login" style={{ color: "rgba(216,232,244,0.5)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>Sign In</Link>
          <Link href="/signup" style={{ background: CYAN, color: BG, padding: "7px 18px", borderRadius: 7, fontWeight: 700, textDecoration: "none", fontSize: "0.875rem" }}>Get Started</Link>
        </div>
      </nav>

      {/* HEADER */}
      <section style={{ padding: "64px 2rem 48px", textAlign: "center" }}>
        <p style={{ color: CYAN, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>PRICING</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em", marginBottom: 16 }}>Simple, transparent pricing</h1>
        <p style={{ color: "rgba(216,232,244,0.55)", maxWidth: 480, margin: "0 auto", fontSize: "1rem", lineHeight: 1.7 }}>No hidden fees. No per-account charges. Just straightforward pricing for BD teams.</p>
      </section>

      {/* TIERS */}
      <section style={{ maxWidth: 1060, margin: "0 auto", padding: "0 2rem 72px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ background: t.highlight ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.02)", border: `1px solid ${t.highlight ? "var(--nyx-accent-str)" : BORDER}`, borderRadius: 14, padding: "32px 28px", display: "flex", flexDirection: "column", position: "relative" }}>
            {t.highlight && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: CYAN, color: BG, padding: "3px 14px", borderRadius: "0 0 8px 8px", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>MOST POPULAR</div>}
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: CYAN, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{t.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: "2.8rem", fontWeight: 900, color: TEXT, lineHeight: 1 }}>{t.price}</span>
                {t.period && <span style={{ color: "rgba(216,232,244,0.45)", fontSize: "0.9rem" }}>{t.period}</span>}
              </div>
              <p style={{ fontSize: "0.85rem", color: "rgba(216,232,244,0.5)", marginBottom: 24, lineHeight: 1.5 }}>{t.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: "0.85rem", color: "rgba(216,232,244,0.7)" }}>
                    <span style={{ color: CYAN, flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                  </li>
                ))}
                {t.notIncluded.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: "0.85rem", color: "rgba(216,232,244,0.25)", textDecoration: "line-through" }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>✗</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup" style={{ display: "block", textAlign: "center", background: t.highlight ? CYAN : "rgba(255,255,255,0.05)", color: t.highlight ? BG : TEXT, padding: "12px", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem", border: t.highlight ? "none" : `1px solid ${BORDER}`, marginTop: "auto" }}>
              {t.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 2rem 80px" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: TEXT, marginBottom: 32, textAlign: "center" }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {faqs.map((faq) => (
            <div key={faq.q} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 24px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: TEXT, marginBottom: 8 }}>{faq.q}</h3>
              <p style={{ fontSize: "0.875rem", color: "rgba(216,232,244,0.55)", lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 2rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "rgba(216,232,244,0.25)" }}>
          © 2026 Destiny Springs Healthcare ·{" "}
          <Link href="/terms" style={{ color: "inherit" }}>Terms</Link> ·{" "}
          <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
        </p>
      </footer>
    </div>
  );
}
