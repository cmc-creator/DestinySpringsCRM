"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

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
  lastContactDate: string | null; // ISO string or null
  referralCount: number;
  active: boolean;
};

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

const TIER_COLOR: Record<string, string> = {
  TIER_1: "#22d3ee",
  TIER_2: "#a3a3a3",
  TIER_3: "#6b7280",
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

function ContactBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>Never contacted</span>;
  if (days === 0) return <span style={{ fontSize: "0.7rem", color: "#22d3ee" }}>Today</span>;
  const color = days <= 7 ? "#22d3ee" : days <= 14 ? "#fbbf24" : "#f87171";
  return <span style={{ fontSize: "0.7rem", color }}>{days}d ago</span>;
}

export default function MyContactsClient({ sources }: { sources: Source[] }) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return sources.filter((s) => {
      if (tierFilter !== "ALL" && s.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactName ?? "").toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        (s.specialty ?? "").toLowerCase().includes(q) ||
        (s.practiceName ?? "").toLowerCase().includes(q)
      );
    });
  }, [sources, query, tierFilter]);

  const tier1 = filtered.filter((s) => s.tier === "TIER_1");
  const other = filtered.filter((s) => s.tier !== "TIER_1");

  function renderCard(s: Source) {
    const days = daysSince(s.lastContactDate);
    const isOpen = expanded === s.id;
    const tierColor = TIER_COLOR[s.tier ?? "TIER_2"] ?? "#a3a3a3";

    return (
      <div
        key={s.id}
        style={{
          background: "var(--nyx-card)",
          border: `1px solid ${isOpen ? tierColor : "var(--nyx-border)"}`,
          borderRadius: 12,
          marginBottom: 10,
          overflow: "hidden",
          transition: "border-color 0.2s",
        }}
      >
        {/* Summary row — always visible */}
        <button
          onClick={() => setExpanded(isOpen ? null : s.id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {/* Tier dot */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: tierColor, flexShrink: 0,
            boxShadow: `0 0 6px ${tierColor}`,
          }} />

          {/* Name + type */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--nyx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", marginTop: 1 }}>
              {TYPE_LABELS[s.type] ?? s.type}
              {s.specialty ? ` · ${s.specialty}` : ""}
              {s.city ? ` · ${s.city}, ${s.state}` : ""}
            </div>
          </div>

          {/* Last contact */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <ContactBadge days={days} />
            <div style={{ fontSize: "0.65rem", color: "#4b5563", marginTop: 1 }}>
              {s.referralCount} referral{s.referralCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Chevron */}
          <div style={{ color: "var(--nyx-text-muted)", fontSize: "0.75rem" }}>{isOpen ? "▲" : "▼"}</div>
        </button>

        {/* Expanded contact card */}
        {isOpen && (
          <div style={{
            borderTop: `1px solid var(--nyx-border)`,
            padding: "14px 16px 18px",
          }}>
            {/* Contact person */}
            {s.contactName && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Primary Contact</div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--nyx-text)" }}>{s.contactName}</div>
              </div>
            )}

            {/* One-tap actions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {s.phone && (
                <a
                  href={`tel:${s.phone.replace(/\D/g, "")}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)",
                    borderRadius: 8, padding: "7px 14px",
                    fontWeight: 700, fontSize: "0.8rem", color: "var(--nyx-accent)",
                    textDecoration: "none",
                  }}
                >
                  📞 {formatPhone(s.phone)}
                </a>
              )}
              {s.email && (
                <a
                  href={`mailto:${s.email}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)",
                    borderRadius: 8, padding: "7px 14px",
                    fontWeight: 700, fontSize: "0.8rem", color: "#a78bfa",
                    textDecoration: "none",
                  }}
                >
                  ✉️ Email
                </a>
              )}
              {s.phone && (
                <a
                  href={`sms:${s.phone.replace(/\D/g, "")}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                    borderRadius: 8, padding: "7px 14px",
                    fontWeight: 700, fontSize: "0.8rem", color: "#34d399",
                    textDecoration: "none",
                  }}
                >
                  💬 Text
                </a>
              )}
              {s.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${s.address} ${s.city} ${s.state} ${s.zip ?? ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
                    borderRadius: 8, padding: "7px 14px",
                    fontWeight: 700, fontSize: "0.8rem", color: "#fbbf24",
                    textDecoration: "none",
                  }}
                >
                  📍 Directions
                </a>
              )}
              <Link
                href={`/rep/contacts/${s.id}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
                  borderRadius: 8, padding: "7px 14px",
                  fontWeight: 700, fontSize: "0.8rem", color: "#a855f7",
                  textDecoration: "none",
                }}
              >
                📋 Visit Prep
              </Link>
            </div>

            {/* Details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: "0.78rem" }}>
              {s.practiceName && (
                <div>
                  <div style={{ fontSize: "0.63rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>Practice</div>
                  <div style={{ color: "var(--nyx-text)" }}>{s.practiceName}</div>
                </div>
              )}
              {(s.address || s.city) && (
                <div>
                  <div style={{ fontSize: "0.63rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>Address</div>
                  <div style={{ color: "var(--nyx-text)" }}>
                    {s.address ? `${s.address}, ` : ""}{s.city}, {s.state} {s.zip ?? ""}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: "0.63rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tier</div>
                <div style={{ color: tierColor, fontWeight: 700 }}>{s.tier?.replace("_", " ") ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.63rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>Referrals Sent</div>
                <div style={{ color: "var(--nyx-text)" }}>{s.referralCount}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--nyx-text)" }}>My Contacts</h1>
        <p style={{ color: "var(--nyx-text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          {sources.length} assigned referral source{sources.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search name, contact, city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: "1 1 200px",
            background: "var(--nyx-card)",
            border: "1px solid var(--nyx-border)",
            borderRadius: 8,
            padding: "9px 14px",
            fontSize: "0.85rem",
            color: "var(--nyx-text)",
            outline: "none",
          }}
        />
        {(["ALL", "TIER_1", "TIER_2", "TIER_3"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: tierFilter === t ? "1px solid var(--nyx-accent)" : "1px solid var(--nyx-border)",
              background: tierFilter === t ? "var(--nyx-accent-dim)" : "var(--nyx-card)",
              color: tierFilter === t ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
              fontWeight: 700,
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            {t === "ALL" ? "All" : t.replace("_", " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--nyx-text-muted)", padding: "48px 0", fontSize: "0.875rem" }}>
          No contacts match your search.
        </div>
      )}

      {tier1.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#22d3ee", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            ◆ Tier 1 — Priority Accounts
          </div>
          {tier1.map(renderCard)}
        </div>
      )}

      {other.length > 0 && (
        <div>
          {tier1.length > 0 && (
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--nyx-text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Other Sources
            </div>
          )}
          {other.map(renderCard)}
        </div>
      )}
    </div>
  );
}
