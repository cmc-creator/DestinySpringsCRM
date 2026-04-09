import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LegalDocumentsSection from "@/components/contracts/LegalDocumentsSection";

// ── DSH Partner Plan configuration ──────────────────────────────────────────
// Adjust PER_SEAT_PRICE and INCLUDED_SEATS to match your agreed contract terms
const PER_SEAT_PRICE = 50;        // $ / seat / month
const INCLUDED_SEATS = 4;         // seats included in base contract
const CONTRACT_TERM = "Annual";   // display only
const MARKET_RATE_PER_SEAT = 150; // reference retail seat price
// ────────────────────────────────────────────────────────────────────────────

const BG    = "var(--nyx-bg)";
const TEXT  = "var(--nyx-text)";
const GOLD  = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.15)";
const BORDER = "rgba(201,168,76,0.25)";

const PLATFORM_FEATURES = [
  { cat: "Admissions & Pipeline",  items: ["Full admissions pipeline (Inquiry → Discharged)", "Title 36 / ARS §36-520 workflow", "Insurance authorization tracking", "Denial tracking & lock enforcement", "Pre-assessment intake inbox"] },
  { cat: "Referral Development",   items: ["Unlimited referral sources", "Referral source tiering (A/B/C) & influence scoring", "Competitor intel tracking", "Referral trend analytics", "Source ROI reports"] },
  { cat: "Territory & Field Ops",  items: ["Interactive Leaflet territory maps", "GPS field check-in / check-out", "Voice dictation for visit notes", "Quick Log Widget (⚡ floating logger)", "Progressive Web App (home screen install)"] },
  { cat: "Aegis AI Copilot",       items: ["Context-aware AI assistant on every page", "Voice input (mic) + text-to-speech replies", "Proactive insights panel (sourced from live data)", "AI-executable actions (log activity, create lead, etc.)", "Suggestion chips for rep & admin workflows"] },
  { cat: "Analytics & Reporting",  items: ["Executive dashboard with census + revenue KPIs", "Funnel analytics & conversion rates", "Rep performance leaderboards", "Payor mix reporting", "CSV & printable reports"] },
  { cat: "Team & Compliance",      items: ["Unlimited user seats", "Role-based access (Admin / Rep / Account)", "Rep compliance document vault (HIPAA certs, licenses)", "Audit log (immutable, exportable)", "Document library for rep collateral"] },
  { cat: "Communications",         items: ["Internal messaging system", "In-app notification center", "Google Calendar bi-directional sync", "Email tracking integration", "Bulk outreach communications hub"] },
  { cat: "Integrations",           items: ["iCANotes EHR census sync", "MedWorxs clinical data sync", "Paycom HR/payroll integration", "Monday.com project management sync", "E-signature (DocuSign / SignNow)"] },
  { cat: "Enterprise Support",     items: ["Dedicated account manager (Connie Michelle Consulting)", "Priority email + phone support", "Custom onboarding & training sessions", "White-label branding (custom domain available)", "SLA guarantee: 99.9% uptime"] },
];

const monthlyTotal = PER_SEAT_PRICE * INCLUDED_SEATS;
const annualTotal  = monthlyTotal * 12;
const marketMonthlyBaseline = MARKET_RATE_PER_SEAT * INCLUDED_SEATS;

export default async function DSHPartnerPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, background: BG }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/Aegislogo.png" alt="NyxAegis" width={36} height={36} style={{ objectFit: "contain" }} />
          <span style={{ fontWeight: 900, color: TEXT, fontSize: "0.95rem" }}>Destiny Springs CRM</span>
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: GOLD, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Preferred Partner</span>
          <Link href="/login" style={{ background: GOLD, color: "#0a0e14", padding: "7px 18px", borderRadius: 7, fontWeight: 800, textDecoration: "none", fontSize: "0.85rem" }}>Sign In</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "80px 2rem 60px", textAlign: "center", borderBottom: `1px solid ${BORDER}`, background: `radial-gradient(ellipse 800px 400px at 50% 0%, rgba(201,168,76,0.07), transparent)` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GOLD_DIM, border: `1px solid ${BORDER}`, borderRadius: 100, padding: "5px 16px", marginBottom: 24, fontSize: "0.72rem", fontWeight: 800, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          ★ Preferred Partner Program ★
        </div>
        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 3.6rem)", fontWeight: 900, color: TEXT, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
          Destiny Springs&nbsp;
          <span style={{ color: GOLD }}>Partner Plan</span>
        </h1>
        <p style={{ color: "rgba(216,232,244,0.6)", maxWidth: 540, margin: "0 auto 36px", fontSize: "1.05rem", lineHeight: 1.75 }}>
          The complete NyxAegis platform, every feature and unlimited data, at a small-team partner rate designed for Destiny Springs.
        </p>

        {/* Pricing Callout */}
        <div style={{ display: "inline-flex", gap: 0, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "28px 40px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Your Rate</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "center" }}>
              <span style={{ fontSize: "3.2rem", fontWeight: 900, color: TEXT, lineHeight: 1 }}>${PER_SEAT_PRICE}</span>
              <span style={{ color: "rgba(216,232,244,0.4)", fontSize: "0.9rem" }}>/seat/mo</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(216,232,244,0.4)", marginTop: 4 }}>{INCLUDED_SEATS} seats | {CONTRACT_TERM}</div>
          </div>
          <div style={{ padding: "28px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "rgba(216,232,244,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Market Rate</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "center" }}>
              <span style={{ fontSize: "3.2rem", fontWeight: 900, color: "rgba(216,232,244,0.28)", lineHeight: 1 }}>${MARKET_RATE_PER_SEAT}+</span>
              <span style={{ color: "rgba(216,232,244,0.35)", fontSize: "0.9rem" }}>/seat/mo</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(216,232,244,0.4)", marginTop: 4 }}>Typical market starting point</div>
          </div>
        </div>

        {/* Savings Banner */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "inline-block", background: GOLD_DIM, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 20px", fontSize: "0.85rem", color: GOLD, fontWeight: 700 }}>
            You save ${(marketMonthlyBaseline - monthlyTotal).toLocaleString()}/mo | ${((marketMonthlyBaseline - monthlyTotal) * 12).toLocaleString()}/yr vs. $150/seat baseline
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{ background: GOLD, color: "#0a0e14", padding: "14px 32px", borderRadius: 10, fontWeight: 800, textDecoration: "none", fontSize: "0.95rem" }}>
            Access Your Platform
          </Link>
          <a href="mailto:info@nyxcollectivellc.com" style={{ background: "rgba(201,168,76,0.08)", border: `1px solid ${BORDER}`, color: TEXT, padding: "14px 32px", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.95rem" }}>
            Contact Your Account Manager
          </a>
        </div>
      </section>

      {/* WHAT'S INCLUDED: feature grid */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>EVERYTHING INCLUDED</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em", marginBottom: 12 }}>The complete platform. No feature gating.</h2>
          <p style={{ color: "rgba(216,232,244,0.5)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>Your team has access to every feature, including capabilities that are enterprise-only for standard customers.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {PLATFORM_FEATURES.map((group) => (
            <div key={group.cat} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid rgba(201,168,76,0.12)`, borderRadius: 12, padding: "22px 24px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>{group.cat}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {group.items.map((item) => (
                  <li key={item} style={{ display: "flex", gap: 8, fontSize: "0.825rem", color: "rgba(216,232,244,0.75)", alignItems: "flex-start" }}>
                    <span style={{ color: GOLD, flexShrink: 0, marginTop: 2 }}>✦</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* VALUE COMPARISON */}
      <section style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: GOLD_DIM, padding: "64px 2rem" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>PARTNER VALUE BREAKDOWN</p>
          <h2 style={{ fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 900, color: TEXT, marginBottom: 36 }}>Your investment vs. what you get</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, background: BORDER, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
            {[
              { label: "Monthly Investment", value: `$${monthlyTotal.toLocaleString()}`, sub: `${INCLUDED_SEATS} seats × $${PER_SEAT_PRICE}` },
              { label: "Annual Investment", value: `$${annualTotal.toLocaleString()}`, sub: "billed annually" },
              { label: "Annual Savings vs. Market", value: `$${((marketMonthlyBaseline - monthlyTotal) * 12).toLocaleString()}`, sub: "using $150/seat baseline", highlight: true },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label} style={{ background: highlight ? "rgba(201,168,76,0.12)" : "rgba(10,14,20,0.95)", padding: "24px 18px", textAlign: "center" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: highlight ? GOLD : "rgba(216,232,244,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: highlight ? GOLD : TEXT }}>{value}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(216,232,244,0.35)", marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          <p style={{ color: "rgba(216,232,244,0.4)", fontSize: "0.82rem", lineHeight: 1.7 }}>
            Additional seats available at ${PER_SEAT_PRICE}/seat/mo. Volume pricing for 30+ seats is available, contact your account manager.
          </p>
        </div>
      </section>

      {/* LEGAL DOCUMENTS & E-SIGNATURE */}
      <LegalDocumentsSection />

      {/* HELP */}
      <section style={{ borderTop: `1px solid ${BORDER}`, padding: "56px 2rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>NEED HELP?</p>
          <h2 style={{ fontSize: "clamp(1.35rem, 3.2vw, 1.9rem)", fontWeight: 900, color: TEXT, marginBottom: 12 }}>Quick onboarding support is built in.</h2>
          <p style={{ color: "rgba(216,232,244,0.5)", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>
            We can walk your team through setup and daily workflows. If you want a guided start, contact us and we will schedule a live walkthrough.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:info@nyxcollectivellc.com?subject=Destiny Springs Onboarding Help" style={{ background: GOLD, color: "#0a0e14", padding: "12px 24px", borderRadius: 9, fontWeight: 800, textDecoration: "none", fontSize: "0.9rem" }}>
              Request Onboarding Help
            </a>
            <Link href="/login" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT, padding: "12px 24px", borderRadius: 9, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
              Open Platform
            </Link>
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "72px 2rem", textAlign: "center" }}>
        <p style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>DEDICATED SUPPORT</p>
        <h2 style={{ fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 900, color: TEXT, marginBottom: 16 }}>You have a dedicated point of contact, always.</h2>
        <p style={{ color: "rgba(216,232,244,0.5)", maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.75 }}>
          As NyxAegis&apos;s highest-priority partner, Destiny Springs has a named account manager available for training, feature requests, integrations, and anything else you need.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 44 }}>
          {[
            { icon: "🎯", label: "Dedicated Account Manager", sub: "Named contact, not a support queue" },
            { icon: "⚡", label: "Priority Response", sub: "Same-day for all tickets" },
            { icon: "🎓", label: "Training Sessions", sub: "On-demand team onboarding" },
            { icon: "🛠ï¸", label: "Custom Feature Requests", sub: "Your needs shape the roadmap" },
          ].map(({ icon, label, sub }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid rgba(201,168,76,0.12)`, borderRadius: 12, padding: "20px 18px" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>{label}</div>
              <div style={{ color: "rgba(216,232,244,0.4)", fontSize: "0.78rem" }}>{sub}</div>
            </div>
          ))}
        </div>

        <a href="mailto:info@nyxcollectivellc.com?subject=Destiny Springs Platform Support" style={{ display: "inline-block", background: GOLD, color: "#0a0e14", padding: "13px 28px", borderRadius: 9, fontWeight: 800, textDecoration: "none", fontSize: "0.9rem", marginRight: 12 }}>
          Contact Account Manager
        </a>
        <Link href="/login" style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT, padding: "13px 28px", borderRadius: 9, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
          Sign In to Platform
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 2rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.78rem", color: "rgba(216,232,244,0.22)" }}>
          © 2026 NyxCollective LLC | <a href="https://nycollectivellc.com" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>nycollectivellc.com</a> |{" "}
          <Link href="/terms" style={{ color: "inherit" }}>Terms</Link> | <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
        </p>
        <p style={{ fontSize: "0.72rem", color: "rgba(216,232,244,0.15)", marginTop: 6 }}>
          This page is specific to the Destiny Springs Healthcare Preferred Partner Program and is not a public offer.
        </p>
      </footer>
    </div>
  );
}
