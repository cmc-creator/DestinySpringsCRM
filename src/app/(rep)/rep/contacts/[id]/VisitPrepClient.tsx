"use client";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = {
  id: string;
  name: string;
  type: string;
  specialty: string | null;
  practiceName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tier: string | null;
  notes: string | null;
  competitorIntel: string | null;
  monthlyGoal: number | null;
  influenceRole: string | null;
  influenceLevel: string | null;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

type MonthData = { month: string; count: number };

interface VisitPrepProps {
  source: Source;
  lastActivities: Activity[];
  referralsThis90: number;
  referralsPrev90: number;
  monthlyReferrals: MonthData[];
  talkingPoints: string[];
  daysSinceContact: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  EMERGENCY_DEPARTMENT:      "ED",
  PRIMARY_CARE_PHYSICIAN:    "PCP",
  PSYCHIATRIST:              "Psychiatrist",
  OUTPATIENT_THERAPIST:      "Therapist",
  IOP_PHP_PROGRAM:           "IOP / PHP",
  CRISIS_STABILIZATION_UNIT: "CSU",
  CRISIS_LINE:               "Crisis Line",
  COURT_LEGAL_SYSTEM:        "Court / Legal",
  COMMUNITY_MENTAL_HEALTH:   "CMHC",
  SNF_LTACH:                 "SNF / LTACH",
  SCHOOL_COUNSELOR:          "School",
  PEER_SUPPORT:              "Peer Support",
  SELF_REFERRAL:             "Self-Referral",
  OTHER:                     "Other",
};

const ACT_COLORS: Record<string, string> = {
  CALL:              "#60a5fa",
  EMAIL:             "#c084fc",
  NOTE:              "#94a3b8",
  MEETING:           "#34d399",
  LUNCH:             "#fb923c",
  TASK:              "#86efac",
  PROPOSAL_SENT:     "#fcd34d",
  DEMO_COMPLETED:    "#22d3ee",
  SITE_VISIT:        "#fbbf24",
  CONFERENCE:        "#a78bfa",
  FOLLOW_UP:         "#f87171",
  IN_SERVICE:        "#f59e0b",
  FACILITY_TOUR:     "#38bdf8",
  CE_PRESENTATION:   "#e879f9",
  CRISIS_CONSULT:    "#ef4444",
  LUNCH_AND_LEARN:   "#fb923c",
  COMMUNITY_EVENT:   "#4ade80",
  REFERRAL_RECEIVED: "#fbbf24",
  DISCHARGE_PLANNING:"#34d399",
};

const ACT_LABELS: Record<string, string> = {
  CALL:              "Call",
  EMAIL:             "Email",
  NOTE:              "Note",
  MEETING:           "Meeting",
  LUNCH:             "Lunch",
  TASK:              "Task",
  PROPOSAL_SENT:     "Proposal Sent",
  DEMO_COMPLETED:    "Demo",
  SITE_VISIT:        "Site Visit",
  CONFERENCE:        "Conference",
  FOLLOW_UP:         "Follow-Up",
  IN_SERVICE:        "In-Service",
  FACILITY_TOUR:     "Facility Tour",
  CE_PRESENTATION:   "CE Presentation",
  CRISIS_CONSULT:    "Crisis Consult",
  LUNCH_AND_LEARN:   "Lunch & Learn",
  COMMUNITY_EVENT:   "Community Event",
  REFERRAL_RECEIVED: "Referral Received",
  DISCHARGE_PLANNING:"Discharge Planning",
};

const TIER_COLOR: Record<string, string> = {
  TIER_1: "#22d3ee",
  TIER_2: "#a3a3a3",
  TIER_3: "#6b7280",
};

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function truncate(s: string | null, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, icon, children, accentColor = "var(--nyx-accent)" }: {
  title: string;
  icon: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div style={{
      background: "var(--nyx-card)",
      border: "1px solid var(--nyx-border)",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        borderBottom: "1px solid var(--nyx-border)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{ fontSize: "0.95rem" }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: "0.78rem", color: accentColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Mini bar chart (CSS-only) ────────────────────────────────────────────────
function MiniBarChart({ data }: { data: MonthData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginTop: 6 }}>
      {data.map(({ month, count }) => {
        const pct = (count / maxCount) * 100;
        return (
          <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: "0.6rem", color: "#6b7280" }}>{count}</div>
            <div style={{
              width: "100%",
              height: `${Math.max(pct, 4)}%`,
              background: count > 0 ? "var(--nyx-accent)" : "rgba(255,255,255,0.06)",
              borderRadius: "3px 3px 0 0",
              opacity: 0.85,
              minHeight: 4,
              transition: "height 0.3s",
            }} />
            <div style={{ fontSize: "0.58rem", color: "#6b7280", textAlign: "center", lineHeight: 1.1 }}>{month}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VisitPrepClient({
  source,
  lastActivities,
  referralsThis90,
  referralsPrev90,
  monthlyReferrals,
  talkingPoints,
  daysSinceContact,
}: VisitPrepProps) {
  const tierColor = TIER_COLOR[source.tier ?? "TIER_2"] ?? "#a3a3a3";
  const delta = referralsThis90 - referralsPrev90;

  // Trend label + color
  let trendLabel = "Steady";
  let trendColor = "#a3a3a3";
  let trendIcon = "→";
  if (delta >= 2) {
    trendLabel = `+${delta} from last qtr`;
    trendColor = "#34d399";
    trendIcon = "↑";
  } else if (delta <= -2) {
    trendLabel = `${delta} from last qtr`;
    trendColor = "#f87171";
    trendIcon = "↓";
  }

  // Recency badge
  let recencyLabel = "Never contacted";
  let recencyColor = "#6b7280";
  if (daysSinceContact !== null) {
    if (daysSinceContact === 0) { recencyLabel = "Contacted today"; recencyColor = "#22d3ee"; }
    else if (daysSinceContact <= 7) { recencyLabel = `${daysSinceContact}d ago`; recencyColor = "#22d3ee"; }
    else if (daysSinceContact <= 14) { recencyLabel = `${daysSinceContact}d ago`; recencyColor = "#fbbf24"; }
    else { recencyLabel = `${daysSinceContact}d ago`; recencyColor = "#f87171"; }
  }

  const mapsUrl = source.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${source.address} ${source.city ?? ""} ${source.state ?? ""} ${source.zip ?? ""}`)}`
    : null;

  return (
    <div>
      {/* ── Back link ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/rep/contacts"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.78rem", color: "var(--nyx-text-muted)", textDecoration: "none",
          }}
        >
          ← My Contacts
        </Link>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        background: "var(--nyx-card)",
        border: `1px solid ${tierColor}40`,
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 20,
      }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: tierColor, boxShadow: `0 0 8px ${tierColor}`,
            marginTop: 5, flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--nyx-text)", margin: 0 }}>
              {source.name}
            </h1>
            <div style={{ fontSize: "0.8rem", color: "var(--nyx-text-muted)", marginTop: 3 }}>
              {TYPE_LABELS[source.type] ?? source.type}
              {source.specialty ? ` · ${source.specialty}` : ""}
              {source.practiceName ? ` · ${source.practiceName}` : ""}
              {source.city ? ` · ${source.city}, ${source.state}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: "0.7rem", fontWeight: 800, padding: "3px 10px",
              borderRadius: 999, color: tierColor, border: `1px solid ${tierColor}60`,
              background: `${tierColor}15`,
            }}>
              {source.tier?.replace("_", " ") ?? "Untiered"}
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: recencyColor }}>
              {recencyLabel}
            </span>
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {source.phone && (
            <a
              href={`tel:${source.phone.replace(/\D/g, "")}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)",
                borderRadius: 8, padding: "8px 16px",
                fontWeight: 700, fontSize: "0.82rem", color: "var(--nyx-accent)", textDecoration: "none",
              }}
            >
              📞 {formatPhone(source.phone)}
            </a>
          )}
          {source.email && (
            <a
              href={`mailto:${source.email}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: 8, padding: "8px 16px",
                fontWeight: 700, fontSize: "0.82rem", color: "#a78bfa", textDecoration: "none",
              }}
            >
              ✉️ Email
            </a>
          )}
          {source.phone && (
            <a
              href={`sms:${source.phone.replace(/\D/g, "")}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                borderRadius: 8, padding: "8px 16px",
                fontWeight: 700, fontSize: "0.82rem", color: "#34d399", textDecoration: "none",
              }}
            >
              💬 Text
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: 8, padding: "8px 16px",
                fontWeight: 700, fontSize: "0.82rem", color: "#fbbf24", textDecoration: "none",
              }}
            >
              📍 Directions
            </a>
          )}
          <Link
            href="/rep/activities"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--nyx-border)",
              borderRadius: 8, padding: "8px 16px",
              fontWeight: 700, fontSize: "0.82rem", color: "var(--nyx-text-muted)", textDecoration: "none",
            }}
          >
            + Log Activity
          </Link>
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 0,
      }}>
        {/* ── Talking Points ────────────────────────────────────── */}
        <Card title="Pre-Call Brief" icon="💡" accentColor="#fbbf24">
          {talkingPoints.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--nyx-text-muted)" }}>No talking points available.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {talkingPoints.map((pt, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i < talkingPoints.length - 1 ? "1px solid var(--nyx-border)" : "none",
                    fontSize: "0.84rem",
                    lineHeight: 1.55,
                    color: "var(--nyx-text)",
                  }}
                >
                  <span style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }}>◆</span>
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Pipeline (90-day) ─────────────────────────────────── */}
        <Card title="90-Day Pipeline" icon="📊" accentColor="#22d3ee">
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            {/* This period */}
            <div style={{
              flex: 1, background: "rgba(34,211,238,0.06)",
              borderRadius: 10, padding: "12px 16px", textAlign: "center",
              border: "1px solid rgba(34,211,238,0.15)",
            }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#22d3ee", lineHeight: 1 }}>
                {referralsThis90}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--nyx-text-muted)", marginTop: 4 }}>
                Last 90 days
              </div>
            </div>
            {/* Trend arrow */}
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2, flexShrink: 0,
            }}>
              <span style={{ fontSize: "1.4rem", color: trendColor }}>{trendIcon}</span>
              <span style={{ fontSize: "0.65rem", color: trendColor, fontWeight: 700 }}>{trendLabel}</span>
            </div>
            {/* Previous period */}
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.03)",
              borderRadius: 10, padding: "12px 16px", textAlign: "center",
              border: "1px solid var(--nyx-border)",
            }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--nyx-text-muted)", lineHeight: 1 }}>
                {referralsPrev90}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--nyx-text-muted)", marginTop: 4 }}>
                Prior 90 days
              </div>
            </div>
          </div>
          <MiniBarChart data={monthlyReferrals} />
          {source.monthlyGoal && (
            <div style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", marginTop: 8 }}>
              Monthly goal: <strong style={{ color: "var(--nyx-text)" }}>{source.monthlyGoal}</strong>
            </div>
          )}
        </Card>

        {/* ── Recent Activity ───────────────────────────────────── */}
        <Card title="Recent Activity" icon="🕐">
          {lastActivities.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--nyx-text-muted)" }}>
              No activities logged for this source yet.
            </p>
          ) : (
            <div>
              {lastActivities.map((act, i) => {
                const color = ACT_COLORS[act.type] ?? "#94a3b8";
                const date = formatDate(act.completedAt ?? act.createdAt);
                return (
                  <div
                    key={act.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: i < lastActivities.length - 1 ? "1px solid var(--nyx-border)" : "none",
                    }}
                  >
                    {/* Type pill */}
                    <div style={{
                      flexShrink: 0,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      color,
                      border: `1px solid ${color}50`,
                      background: `${color}12`,
                      height: "fit-content",
                      marginTop: 1,
                      whiteSpace: "nowrap",
                    }}>
                      {ACT_LABELS[act.type] ?? act.type}
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--nyx-text)" }}>
                        {act.title}
                      </div>
                      {act.notes && (
                        <div style={{ fontSize: "0.74rem", color: "var(--nyx-text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                          {truncate(act.notes, 100)}
                        </div>
                      )}
                    </div>
                    {/* Date */}
                    <div style={{ flexShrink: 0, fontSize: "0.68rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                      {date}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Notes & Intel ─────────────────────────────────────── */}
        {(source.notes || source.competitorIntel) && (
          <Card title="Notes & Intel" icon="📝">
            {source.notes && (
              <div style={{ marginBottom: source.competitorIntel ? 12 : 0 }}>
                <div style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Notes
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--nyx-text)", lineHeight: 1.55 }}>
                  {source.notes}
                </div>
              </div>
            )}
            {source.competitorIntel && (
              <div>
                <div style={{ fontSize: "0.65rem", color: "#f87171", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Competitor Intel
                </div>
                <div style={{
                  fontSize: "0.82rem", color: "#fca5a5", lineHeight: 1.55,
                  background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)",
                  borderRadius: 8, padding: "8px 12px",
                }}>
                  {source.competitorIntel}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Contact Details ───────────────────────────────────── */}
        <Card title="Contact Details" icon="👤">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {source.contactName && (
              <Detail label="Primary Contact" value={source.contactName} />
            )}
            {source.practiceName && (
              <Detail label="Practice" value={source.practiceName} />
            )}
            {source.phone && (
              <Detail label="Phone" value={formatPhone(source.phone)} />
            )}
            {source.email && (
              <Detail label="Email" value={source.email} />
            )}
            {(source.address || source.city) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Detail
                  label="Address"
                  value={`${source.address ? source.address + ", " : ""}${source.city ?? ""}, ${source.state ?? ""} ${source.zip ?? ""}`.trim()}
                />
              </div>
            )}
            {source.influenceRole && (
              <Detail label="Influence Role" value={source.influenceRole} />
            )}
            {source.influenceLevel && (
              <Detail label="Influence Level" value={source.influenceLevel} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.63rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: "0.82rem", color: "var(--nyx-text)", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}
