import Link from "next/link";

const CARD = "rgba(255,255,255,0.03)";
const BORDER = "rgba(0,212,255,0.08)";
const TEXT = "#d8e8f4";
const TEXT_MUTED = "rgba(216,232,244,0.55)";

const REPORTS = [
  {
    id: "pipeline",
    title: "Pipeline Summary",
    desc: "Opportunity counts and values by stage, rep, and service line",
    icon: "",
    badge: "PIPELINE",
    color: "#00d4ff",
  },
  {
    id: "closed-won",
    title: "Closed Won Report",
    desc: "All closed won opportunities with value, close date, and winning rep",
    icon: "",
    badge: "REVENUE",
    color: "#34d399",
  },
  {
    id: "reps",
    title: "Rep Performance",
    desc: "Activity volume, pipeline value, and win rate per rep",
    icon: "",
    badge: "TEAM",
    color: "#fbbf24",
  },
  {
    id: "leads",
    title: "Lead Source Analysis",
    desc: "Lead volume and conversion rates by source channel",
    icon: "",
    badge: "LEADS",
    color: "#a78bfa",
  },
  {
    id: "hospitals",
    title: "Hospital Account Health",
    desc: "Account status, contract values, and last activity dates",
    icon: "",
    badge: "ACCOUNTS",
    color: "#f59e0b",
  },
  {
    id: "contracts",
    title: "Contract Renewal Forecast",
    desc: "Upcoming contract expirations and renewal pipeline",
    icon: "",
    badge: "CONTRACTS",
    color: "#60a5fa",
  },
  {
    id: "compliance",
    title: "Compliance Status",
    desc: "Rep compliance document statuses and upcoming expirations",
    icon: "",
    badge: "COMPLIANCE",
    color: "#34d399",
  },
  {
    id: "invoices",
    title: "Invoice & Revenue Report",
    desc: "All invoices with status, amounts, and payment dates",
    icon: "",
    badge: "FINANCE",
    color: "#f87171",
  },
];

export default function ReportsPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "rgba(0,212,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>INTELLIGENCE</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>Reports</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Download live CSV exports straight from your database</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {REPORTS.map((r) => (
          <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>{r.icon}</span>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, color: r.color,
                background: `${r.color}14`, border: `1px solid ${r.color}33`,
                padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em",
              }}>
                {r.badge}
              </span>
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: TEXT, marginBottom: 6 }}>{r.title}</h3>
            <p style={{ fontSize: "0.82rem", color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 16, flex: 1 }}>{r.desc}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/api/reports/${r.id}?format=csv`}
                style={{
                  flex: 1, background: `${r.color}12`, border: `1px solid ${r.color}33`,
                  borderRadius: 6, padding: "8px", fontSize: "0.75rem", color: r.color,
                  cursor: "pointer", fontWeight: 600, textAlign: "center", textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                 Export CSV
              </Link>
              <Link
                href={`/api/reports/${r.id}?format=json`}
                style={{
                  flex: 1, background: "rgba(0,0,0,0.2)", border: `1px solid rgba(0,212,255,0.1)`,
                  borderRadius: 6, padding: "8px", fontSize: "0.75rem", color: TEXT_MUTED,
                  cursor: "pointer", textAlign: "center", textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                { } JSON
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
