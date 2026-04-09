"use client";

import { useState, useMemo } from "react";

type SourceItem = {
  id: string;
  name: string;
  type: string;
  specialty: string | null;
  practiceName: string | null;
  contactName: string | null;
  city: string | null;
  state: string | null;
  tier: string | null;
  influenceLevel: string | null;
  competitorIntel: string | null;
  monthlyGoal: number | null;
  active: boolean;
  refs30: number;
  refs90: number;
};

type Filter = "all" | "intel" | "active" | "opportunity";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const ORANGE = "var(--nyx-orange, #f97316)";
const GREEN = "var(--nyx-green, #22c55e)";
const RED = "var(--nyx-red, #ef4444)";
const YELLOW = "var(--nyx-yellow, #eab308)";

function statusOf(s: SourceItem): "active" | "inactive" | "opportunity" {
  if (s.refs30 > 0) return "active";
  if (s.refs90 > 0) return "inactive";
  return "opportunity";
}

function TierBadge({ tier }: { tier: string | null }) {
  const t = tier ?? "?";
  const colors: Record<string, string> = {
    TIER_1: CYAN,
    TIER_2: ORANGE,
    TIER_3: TEXT_MUTED,
  };
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
      color: colors[t] ?? TEXT_MUTED, background: "var(--nyx-accent-dim)",
      borderRadius: 4, padding: "2px 7px",
    }}>
      {t.replace("_", " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" | "opportunity" }) {
  const map = {
    active: { label: "Active Partner", color: GREEN, bg: "rgba(34,197,94,0.12)" },
    inactive: { label: "Needs Attention", color: YELLOW, bg: "rgba(234,179,8,0.12)" },
    opportunity: { label: "Opportunity", color: ORANGE, bg: "rgba(249,115,22,0.12)" },
  };
  const { label, color, bg } = map[status];
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 700,
      color, background: bg,
      borderRadius: 4, padding: "2px 8px",
    }}>{label}</span>
  );
}

function IntelCard({ source }: { source: SourceItem }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusOf(source);
  const hasIntel = !!source.competitorIntel;

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${hasIntel ? "var(--nyx-orange, #f97316)" : BORDER}`,
      borderRadius: 12,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: TEXT }}>{source.name}</div>
          {source.practiceName && (
            <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, marginTop: 2 }}>{source.practiceName}</div>
          )}
          {(source.city || source.state) && (
            <div style={{ fontSize: "0.73rem", color: TEXT_MUTED }}>
              {[source.city, source.state].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <TierBadge tier={source.tier} />
          <StatusBadge status={status} />
          {hasIntel && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: ORANGE, background: "rgba(249,115,22,0.12)", borderRadius: 4, padding: "2px 8px" }}>
              ⚠ Competitor Intel
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: source.refs30 > 0 ? GREEN : TEXT_MUTED }}>{source.refs30}</span>
          <span style={{ fontSize: "0.68rem", color: TEXT_MUTED, marginLeft: 4 }}>refs last 30d</span>
        </div>
        <div>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: source.refs90 > 0 ? CYAN : TEXT_MUTED }}>{source.refs90}</span>
          <span style={{ fontSize: "0.68rem", color: TEXT_MUTED, marginLeft: 4 }}>refs last 90d</span>
        </div>
        {source.monthlyGoal && (
          <div>
            <span style={{ fontSize: "1.1rem", fontWeight: 900, color: TEXT_MUTED }}>{source.monthlyGoal}</span>
            <span style={{ fontSize: "0.68rem", color: TEXT_MUTED, marginLeft: 4 }}>mo. goal</span>
          </div>
        )}
        {source.influenceLevel && (
          <div>
            <span style={{ fontSize: "0.68rem", color: TEXT_MUTED }}>Influence: </span>
            <span style={{ fontSize: "0.73rem", fontWeight: 700, color: CYAN }}>{source.influenceLevel}</span>
          </div>
        )}
      </div>

      {/* Competitor intel */}
      {hasIntel && (
        <div style={{
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.3)",
          borderRadius: 8,
          padding: "10px 14px",
        }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: ORANGE, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Competitor Intelligence
          </div>
          <p style={{
            fontSize: "0.82rem", color: TEXT, margin: 0, lineHeight: 1.55,
            display: expanded || source.competitorIntel!.length <= 160 ? "block" : "-webkit-box",
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: "vertical" as const,
            overflow: expanded || source.competitorIntel!.length <= 160 ? "visible" : "hidden",
          }}>
            {source.competitorIntel}
          </p>
          {source.competitorIntel!.length > 160 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{ marginTop: 6, fontSize: "0.72rem", color: CYAN, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {expanded ? "Show less ▲" : "Read more ▼"}
            </button>
          )}
        </div>
      )}

      {!hasIntel && (
        <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontStyle: "italic" }}>
          No competitor intel on file for this source.
        </div>
      )}
    </div>
  );
}

export default function CompetitorIntelClient({ sources }: { sources: SourceItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const withIntel = sources.filter((s) => !!s.competitorIntel);
  const activePartners = sources.filter((s) => s.refs30 > 0);
  const opportunities = sources.filter((s) => s.refs90 === 0);

  const visible = useMemo(() => {
    let result = sources;
    if (filter === "intel") result = result.filter((s) => !!s.competitorIntel);
    else if (filter === "active") result = result.filter((s) => s.refs30 > 0);
    else if (filter === "opportunity") result = result.filter((s) => s.refs90 === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.practiceName?.toLowerCase().includes(q) ?? false) ||
          (s.competitorIntel?.toLowerCase().includes(q) ?? false) ||
          (s.contactName?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [sources, filter, search]);

  const filterButtons: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All Sources", count: sources.length },
    { key: "intel", label: "⚠ Has Competitor Intel", count: withIntel.length },
    { key: "active", label: "Active Partners", count: activePartners.length },
    { key: "opportunity", label: "Opportunities", count: opportunities.length },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
          REP PORTAL
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Competitive Intel</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>
          Landscape view of your assigned referral sources — competitor activity, engagement status, and referral momentum.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Total Sources", value: sources.length, color: CYAN },
          { label: "With Competitor Intel", value: withIntel.length, color: ORANGE },
          { label: "Active Partners (30d)", value: activePartners.length, color: GREEN },
          { label: "Not Yet Sending (90d)", value: opportunities.length, color: RED },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 22px", minWidth: 140 }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {filterButtons.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${filter === key ? CYAN : BORDER}`,
              background: filter === key ? "var(--nyx-accent-dim)" : "transparent",
              color: filter === key ? CYAN : TEXT_MUTED,
              transition: "all 0.15s",
            }}
          >
            {label} <span style={{ opacity: 0.65 }}>({count})</span>
          </button>
        ))}
        <input
          type="search"
          placeholder="Search sources or intel notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: "auto",
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: "0.82rem",
            color: TEXT,
            outline: "none",
            minWidth: 220,
          }}
        />
      </div>

      {/* Source cards grid */}
      {visible.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", color: TEXT_MUTED }}>
          No sources match this filter.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {visible.map((s) => (
            <IntelCard key={s.id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
