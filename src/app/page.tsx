import Link from "next/link";
import Image from "next/image";

const C = {
  bg:      "var(--nyx-bg)",
  navy:    "var(--nyx-bg)",
  cyan:    "var(--nyx-accent)",
  blue:    "var(--nyx-accent)",
  teal:    "var(--nyx-accent)",
  emerald: "var(--nyx-accent)",
  text:    "var(--nyx-text)",
  muted:   "var(--nyx-text-muted)",
  dim:     "var(--nyx-text-muted)",
  card:    "var(--nyx-card)",
  border:  "var(--nyx-border)",
};

const icons = {
  referral: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  chart: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  map: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>),
  activity: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
  shield: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  mobile: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>),
  check: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  arrow: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
};

const features = [
  { icon: icons.referral, color: "var(--nyx-accent)", title: "Referral Source Tracking",   desc: "Log every referring physician, specialist, SNF, and care facility. Track visit frequency, relationship strength, and referral volume per source - so you know exactly where to invest your time." },
  { icon: icons.chart,    color: "var(--nyx-accent)", title: "Referral Volume Analytics",  desc: "Count referrals actually received vs. expected by source. Spot trending sources, identify drop-offs, and give leadership real data on what your community outreach is producing." },
  { icon: icons.map,      color: "var(--nyx-accent)", title: "Territory Management",       desc: "Assign BD reps to geographic territories. Map referral source density and whitespace. Track which zip codes and facilities your team has touched this week." },
  { icon: icons.activity, color: "#a78bfa",   title: "Activity Logging",           desc: "Log physician office visits, lunches, calls, and events in seconds - right from the field. Auto-reminders for follow-ups so no relationship slips through the cracks." },
  { icon: icons.shield,   color: "var(--nyx-accent)", title: "HIPAA Compliance Docs",      desc: "Store and track BAAs, NDAs, licenses, and training certificates. Automated expiration alerts keep every rep compliant in the field." },
  { icon: icons.mobile,   color: "#f59e0b",   title: "Field-First Mobile Design",  desc: "Built for reps who are out in the community. Log a visit, update a referral count, or check your territory from any device between stops." },
];

const workflow = [
  { n: "01", title: "Add Referral Sources",      desc: "Build your directory of physicians, practices, SNFs, specialists, and care coordinators with contact details, relationship history, and referral volume goals." },
  { n: "02", title: "Track Outreach Activity",   desc: "Log every office visit, call, lunch, and event as you do it. The app captures time, location, and outcome so nothing is forgotten." },
  { n: "03", title: "Count Referrals Received",  desc: "When a patient arrives, log the referral back to the source. Watch your referral-per-source metrics update in real time." },
  { n: "04", title: "Report to Leadership",      desc: "Auto-generated dashboards show referral volume, source performance, rep activity, and territory coverage - ready for any C-suite meeting." },
];

const stats = [
  { value: "100%",      label: "Purpose-Built BD CRM",   sub: "Adaptable to any business type" },
  { value: "Real-Time", label: "Referral Counts",        sub: "Know your ROI from day one" },
  { value: "Mobile",    label: "Field-Ready",            sub: "Log visits between stops" },
  { value: "HIPAA",     label: "Compliance Tracking",    sub: "Docs, certs & alerts built-in" },
];

const pricing = [
  {
    name: "Solo Rep", price: "$49", period: "/mo",
    desc: "For a single BD rep managing their own referral territory.",
    features: ["Up to 100 referral sources", "Activity & visit logging", "Referral count tracking", "Document storage", "Mobile portal"],
    cta: "Start Free Trial", highlight: false,
  },
  {
    name: "BD Team", price: "$199", period: "/mo",
    desc: "For BD teams of 2–10 reps with shared analytics and territory management.",
    features: ["Unlimited referral sources", "Team referral dashboards", "Territory assignment & maps", "Rep performance KPIs", "Contract management", "HIPAA compliance docs", "Priority support"],
    cta: "Start Free Trial", highlight: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "For large BD organizations and multi-location operations.",
    features: ["Everything in BD Team", "White-label branding", "Custom integrations", "SSO / SAML", "Dedicated success manager", "SLA guarantee"],
    cta: "Contact Sales", highlight: false,
  },
];

function DashboardMock() {
  const rows = [
    { name: "Dr. Sarah Mitchell, MD",      type: "Cardiologist",    goal: 12, actual: 14, up: true  },
    { name: "Riverside Family Practice",   type: "Primary Care",    goal: 20, actual: 18, up: false },
    { name: "Oakwood Skilled Nursing",     type: "SNF",             goal: 8,  actual: 11, up: true  },
    { name: "Dr. James Okafor, DO",        type: "Neurologist",     goal: 6,  actual: 4,  up: false },
    { name: "Summit Rehab Center",         type: "Rehab Facility",  goal: 10, actual: 12, up: true  },
  ];
  return (
    <div style={{ background: "var(--nyx-bg)", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 60px var(--nyx-accent-dim)" }}>
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
        <span style={{ flex: 1, textAlign: "center", fontSize: "0.68rem", color: C.dim, letterSpacing: "0.05em" }}>Referral Source Dashboard - Q1 2026</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border, borderBottom: `1px solid ${C.border}` }}>
        {[{ label: "Referrals MTD", value: "59", color: "var(--nyx-accent)" }, { label: "Active Sources", value: "38", color: "#a78bfa" }, { label: "Goal Attainment", value: "103%", color: "var(--nyx-accent)" }].map((k) => (
          <div key={k.label} style={{ background: "var(--nyx-bg)", padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</div>
            <div style={{ fontSize: "0.62rem", color: C.dim, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ padding: "10px 16px 6px", display: "grid", gridTemplateColumns: "1fr 120px 55px 55px 32px", gap: 8, borderBottom: `1px solid ${C.border}` }}>
          {["Referral Source", "Type", "Goal", "Actual", ""].map((h) => (
            <div key={h} style={{ fontSize: "0.58rem", color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>{h}</div>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.name} style={{ padding: "9px 16px", display: "grid", gridTemplateColumns: "1fr 120px 55px 55px 32px", gap: 8, borderBottom: `1px solid var(--nyx-accent-dim)`, alignItems: "center" }}>
            <div style={{ fontSize: "0.72rem", color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>{r.type}</div>
            <div style={{ fontSize: "0.72rem", color: C.muted }}>{r.goal}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: r.up ? "var(--nyx-accent)" : "#f87171" }}>{r.actual}</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: r.up ? "var(--nyx-accent)" : "#f87171" }}>{r.up ? "↑" : "↓"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

      {/* AMBIENT ORBS */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div className="orb-1" style={{ position: "absolute", top: "10%", left: "15%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, var(--nyx-accent-dim) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="orb-2" style={{ position: "absolute", top: "50%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, var(--nyx-accent-dim) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="orb-3" style={{ position: "absolute", bottom: "15%", left: "35%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, var(--nyx-accent-dim) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, background: "color-mix(in srgb, var(--nyx-bg) 85%, transparent)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/Aegislogo.png" alt="NyxAegis" width={96} height={96} placeholder="empty" style={{ background: "transparent", filter: "drop-shadow(0 0 12px rgba(201,168,76,0.45))" }} />
          <div>
            <span style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "-0.03em", display: "block", lineHeight: 1.1 }}>NyxAegis<sup style={{ fontSize: "0.6em", verticalAlign: "super", marginLeft: 1, color: "var(--nyx-accent)" }}>™</sup></span>
            <span style={{ fontSize: "0.62rem", color: C.muted, letterSpacing: "0.06em", fontStyle: "italic" }}>Where Relationships Become Referrals.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Link href="#features" style={{ color: C.muted, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>Features</Link>
          <Link href="/pricing" style={{ color: C.muted, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>Pricing</Link>
          <Link href="/login" style={{ color: C.muted, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>Sign In</Link>
          <Link href="/signup" style={{ background: "var(--nyx-accent)", color: "#000", padding: "8px 22px", borderRadius: 8, fontWeight: 800, textDecoration: "none", fontSize: "0.85rem", boxShadow: "0 0 20px var(--nyx-accent-str)" }}>Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 2rem 0", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            {/* Logo + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <Image src="/Aegislogo.png" alt="NyxAegis" width={200} height={200} placeholder="empty" style={{ background: "transparent", filter: "drop-shadow(0 0 40px rgba(201,168,76,0.6))", flexShrink: 0 }} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 999, padding: "7px 18px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.cyan, display: "inline-block", boxShadow: `0 0 8px ${C.cyan}` }} />
                <span style={{ fontSize: "0.7rem", color: C.cyan, fontWeight: 700, letterSpacing: "0.1em" }}>BD &amp; REFERRAL TRACKING PLATFORM</span>
              </div>
            </div>
            {/* Tagline - prominent */}
            <p style={{ fontSize: "clamp(1.15rem, 2.5vw, 1.5rem)", fontWeight: 700, color: "var(--nyx-accent)", letterSpacing: "-0.01em", marginBottom: 20, fontStyle: "italic" }}>
              &ldquo;Where Relationships Become Referrals.&rdquo;
            </p>
            <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24 }}>
              Track every<br />
              <span style={{ color: "var(--nyx-accent)" }}>referral source.</span>
              <br />Count every<br />referral received.
            </h1>
            <p style={{ fontSize: "1.05rem", color: C.muted, maxWidth: 480, lineHeight: 1.75, marginBottom: 36 }}>
              Built for BD teams who build relationships in the field - log visits, track referral sources, and prove your outreach is turning into actual business.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <Link href="/signup" style={{ background: "var(--nyx-accent)", color: "#000", padding: "14px 32px", borderRadius: 10, fontWeight: 800, textDecoration: "none", fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 0 40px var(--nyx-accent-str)" }}>
                Start Free Trial <span>{icons.arrow}</span>
              </Link>
              <Link href="/login" style={{ background: "rgba(255,255,255,0.04)", color: C.text, padding: "14px 28px", borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: "0.95rem", border: `1px solid ${C.border}` }}>
                Sign In
              </Link>
            </div>
            <p style={{ fontSize: "0.75rem", color: C.dim }}>No credit card required · 14-day free trial · Cancel anytime</p>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -1, background: "linear-gradient(135deg, var(--nyx-accent-mid), var(--nyx-accent-dim), transparent)", borderRadius: 18, filter: "blur(1px)" }} />
            <DashboardMock />
          </div>
        </div>

        {/* STATS BAR */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginTop: 72 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "var(--nyx-bg)", padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: C.cyan, letterSpacing: "-0.03em", textShadow: "0 0 24px var(--nyx-accent-glow)" }}>{s.value}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.text, marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: "0.7rem", color: C.dim, marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PHOTOGRAPHY STRIP */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 2rem 80px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {[
            { src: "/Landing/desk.png",    label: "Built for the field",       sub: "Log visits and referrals on the go" },
            { src: "/Landing/table.png",   label: "Strategy at the table",     sub: "Territory planning made visual" },
            { src: "/Landing/console.png", label: "Data when it matters",      sub: "Real-time dashboards for leadership" },
          ].map((img) => (
            <div key={img.src} style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "16/10", border: `1px solid ${C.border}` }}>
              <Image src={img.src} alt={img.label} fill style={{ objectFit: "cover", objectPosition: "center" }} sizes="(max-width:768px) 100vw, 33vw" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 20px" }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.88rem", color: "#fff", marginBottom: 3 }}>{img.label}</p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}>{img.sub}</p>
              </div>
              <div style={{ position: "absolute", top: 14, left: 14, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 999, padding: "3px 10px" }}>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.1em" }}>NYXAEGIS</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: "relative", zIndex: 1, padding: "96px 2rem", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <p style={{ color: C.cyan, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>Platform Features</p>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: 14 }}>Built for how you actually work</h2>
          <p style={{ color: C.muted, fontSize: "1rem", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Every feature was designed for BD reps who are out in the field building relationships - not sitting at a desk.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="feature-card" style={{ position: "relative", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px", transition: "border-color 0.25s, box-shadow 0.25s", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${f.color}60, transparent)`, borderRadius: "14px 14px 0 0" }} />
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 10, background: `${f.color}10`, color: f.color, marginBottom: 16, border: `1px solid ${f.color}20` }}>{f.icon}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: C.text, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: "0.85rem", color: C.muted, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section style={{ position: "relative", zIndex: 1, padding: "96px 2rem", borderTop: `1px solid ${C.border}`, background: "var(--nyx-accent-dim)" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: C.cyan, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>How It Works</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, letterSpacing: "-0.025em" }}>From first visit to proven ROI</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 0, position: "relative" }}>
            {workflow.map((w, i) => (
              <div key={w.n} style={{ padding: "0 24px 0 0", position: "relative" }}>
                {i < workflow.length - 1 && <div style={{ position: "absolute", top: 22, right: 0, width: "100%", height: 1, background: `linear-gradient(90deg, ${C.cyan}30, transparent)`, zIndex: 0 }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--nyx-accent-mid), var(--nyx-accent-dim))", border: "1px solid var(--nyx-accent-str)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 900, color: C.cyan, letterSpacing: "0.05em", flexShrink: 0 }}>{w.n}</div>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: C.text, marginBottom: 10 }}>{w.title}</h3>
                <p style={{ fontSize: "0.85rem", color: C.muted, lineHeight: 1.7 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTALS */}
      <section style={{ position: "relative", zIndex: 1, padding: "96px 2rem" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.cyan, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>Role-Based Access</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: 12 }}>A portal for every stakeholder</h2>
            <p style={{ color: C.muted, fontSize: "1rem", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>Each user sees exactly what they need - nothing more, nothing less.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              {
                role: "ADMIN", color: C.cyan, title: "Operations Command Center",
                desc: "Full visibility over your entire BD organization - reps, sources, referral volume, territory coverage, and compliance status.",
                items: ["Team referral dashboards & KPIs", "Territory assignment & coverage maps", "Rep activity and performance metrics", "HIPAA compliance doc management"],
              },
              {
                role: "BD REP", color: "var(--nyx-accent)", title: "Field Rep Dashboard",
                desc: "Everything a BD rep needs out in the community - log visits, update referral counts, and review your territory between stops.",
                items: ["Referral source directory & history", "Quick visit & activity logging", "Personal referral count tracking", "Compliance doc uploads on mobile"],
              },
              {
                role: "ACCOUNT", color: "var(--nyx-accent)", title: "Partner Portal",
                desc: "A transparent view for your clinic, practice, and partner organizations to track engagement summaries and service activity.",
                items: ["Engagement & referral summaries", "Active proposals and invoices", "Contract and document access", "Branded white-label experience"],
              },
            ].map((portal) => (
              <div key={portal.role} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px 28px", transition: "border-color 0.25s" }}>
                <div style={{ display: "inline-block", background: `${portal.color}12`, border: `1px solid ${portal.color}25`, borderRadius: 999, padding: "4px 14px", fontSize: "0.65rem", fontWeight: 800, color: portal.color, letterSpacing: "0.12em", marginBottom: 16 }}>{portal.role}</div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: C.text, marginBottom: 10 }}>{portal.title}</h3>
                <p style={{ fontSize: "0.85rem", color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>{portal.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {portal.items.map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.82rem", color: C.muted }}>
                      <span style={{ color: portal.color, flexShrink: 0, marginTop: 1 }}>{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ position: "relative", zIndex: 1, padding: "96px 2rem", borderTop: `1px solid ${C.border}`, background: "var(--nyx-accent-dim)" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.cyan, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>Pricing</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, letterSpacing: "-0.025em" }}>Simple, transparent pricing</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {pricing.map((p) => (
              <div key={p.name} style={{ position: "relative", background: p.highlight ? "var(--nyx-accent-dim)" : C.card, border: `1px solid ${p.highlight ? "var(--nyx-border)" : C.border}`, borderRadius: 14, padding: "32px 28px", boxShadow: p.highlight ? "0 0 40px var(--nyx-accent-dim)" : "none" }}>
                {p.highlight && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "var(--nyx-accent)", color: "#000", padding: "4px 18px", borderRadius: "0 0 10px 10px", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.12em" }}>MOST POPULAR</div>}
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.cyan, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: "2.8rem", fontWeight: 900, color: C.text, letterSpacing: "-0.04em" }}>{p.price}</span>
                  <span style={{ color: C.muted, fontSize: "0.85rem" }}>{p.period}</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.83rem", color: C.muted }}>
                      <span style={{ color: C.cyan, flexShrink: 0, marginTop: 1 }}>{icons.check}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.name === "Enterprise" ? "/contact" : "/signup"} style={{ display: "block", textAlign: "center", background: p.highlight ? "var(--nyx-accent)" : "rgba(255,255,255,0.05)", color: p.highlight ? "#000" : C.text, padding: "13px", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.88rem", border: p.highlight ? "none" : `1px solid ${C.border}`, boxShadow: p.highlight ? "0 0 24px var(--nyx-accent-str)" : "none" }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 2rem", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 800px 400px at 50% 50%, var(--nyx-accent-dim) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.1 }}>
            Start tracking referrals<br />
            <span style={{ color: "var(--nyx-accent)" }}>that matter.</span>
          </h2>
          <p style={{ color: C.muted, marginBottom: 36, fontSize: "1rem", lineHeight: 1.75 }}>
            Give your BD team the tool they&apos;ve been asking for - purpose-built to log visits, count referrals, and prove the value of every relationship they build.
          </p>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--nyx-accent)", color: "#000", padding: "16px 42px", borderRadius: 12, fontWeight: 900, textDecoration: "none", fontSize: "1rem", boxShadow: "0 0 60px var(--nyx-accent-str)" }}>
            Get Started Free <span>{icons.arrow}</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${C.border}`, padding: "48px 2rem 32px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          {/* Footer top */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
            {/* Brand block */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <Image src="/Aegislogo.png" alt="NyxAegis" width={96} height={96} placeholder="empty" style={{ background: "transparent", filter: "drop-shadow(0 0 14px rgba(201,168,76,0.4))" }} />
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 900, fontSize: "1.1rem", color: C.text, letterSpacing: "-0.02em" }}>
                  NyxAegis<sup style={{ fontSize: "0.55em", verticalAlign: "super", marginLeft: 2, color: "var(--nyx-accent)" }}>™</sup>
                </p>
                <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "var(--nyx-accent)", fontStyle: "italic", fontWeight: 600 }}>Where Relationships Become Referrals.</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: C.dim, maxWidth: 280, lineHeight: 1.6 }}>Purpose-built CRM for BD teams tracking referral sources and proving outreach ROI in the field.</p>
              </div>
            </div>
            {/* Links */}
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 12px", fontSize: "0.65rem", fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>Product</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href="#features" style={{ color: C.dim, textDecoration: "none", fontSize: "0.82rem" }}>Features</Link>
                  <Link href="/pricing" style={{ color: C.dim, textDecoration: "none", fontSize: "0.82rem" }}>Pricing</Link>
                  <Link href="/signup" style={{ color: C.dim, textDecoration: "none", fontSize: "0.82rem" }}>Get Started</Link>
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 12px", fontSize: "0.65rem", fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>Company</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href="/login" style={{ color: C.dim, textDecoration: "none", fontSize: "0.82rem" }}>Sign In</Link>
                  <Link href="/terms" style={{ color: C.dim, textDecoration: "none", fontSize: "0.82rem" }}>Terms of Service</Link>
                  <Link href="/privacy" style={{ color: C.dim, textDecoration: "none", fontSize: "0.82rem" }}>Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>
          {/* Footer bottom */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: C.dim }}>
              &copy; 2026 NyxCollective LLC. All rights reserved. NyxAegis&#8482; is a trademark of NyxCollective LLC.
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: C.dim, fontStyle: "italic" }}>Where Relationships Become Referrals.&#8482;</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
