"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import TerritoryMapWrapper from "@/components/maps/TerritoryMapWrapper";
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";

// ─── Colours ──────────────────────────────────────────────────────────────────
const GOLD     = "var(--nyx-accent)";
const BORDER   = "var(--nyx-accent-dim)";
const TEXT     = "var(--nyx-text)";
const MUTED    = "var(--nyx-text-muted)";

const stageColor: Record<string, string> = {
  INQUIRY: "#94a3b8", CLINICAL_REVIEW: "#fbbf24", INSURANCE_AUTH: "#f59e0b",
  ADMITTED: "var(--nyx-accent)", ACTIVE: "#60a5fa", DISCHARGED: "#34d399",
  DECLINED: "#f87171", ON_HOLD: "#94a3b8",
};

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ─── Prop types ───────────────────────────────────────────────────────────────
export interface StatItem { id: string; label: string; value: number; icon: string; href: string }
export interface ActivityItem { id: string; title: string; notes: string | null; createdAt: string; hospitalName: string | null; repName: string | null }
export interface OppItem { id: string; title: string; stage: string; value: number | null; hospitalName: string; repName: string | null }
export interface MapHospital { id: string; hospitalName: string; city: string | null; state: string | null; status: string; assignedRepName: string | null }
export interface RepTerritory { id: string; name: string; color: string; states: string[] }
export interface ComplianceDocItem { id: string; type: string; repName: string; expiresAt: string }

export interface DashboardClientProps {
  stats: StatItem[];
  recentActivities: ActivityItem[];
  recentOpps: OppItem[];
  mapHospitals: MapHospital[];
  repTerritories: RepTerritory[];
  expiredDocs: ComplianceDocItem[];
  soonDocs: ComplianceDocItem[];
}

// ─── Section definitions ──────────────────────────────────────────────────────
type SectionId = "stats" | "quick-actions" | "compliance" | "ai-insights" | "territory" | "recent-opps" | "recent-activity";

const SECTION_LABELS: Record<SectionId, string> = {
  "stats":           "Key Metrics",
  "quick-actions":   "Quick Actions",
  "compliance":      "Compliance Alerts",
  "ai-insights":     "Ask Aegis AI",
  "territory":       "Territory Overview",
  "recent-opps":     "Recent Opportunities",
  "recent-activity": "Recent Activity",
};

const ALL_SECTIONS: SectionId[] = [
  "stats", "quick-actions", "compliance", "ai-insights",
  "territory", "recent-opps", "recent-activity",
];

const STORAGE_KEY = "nyx_dashboard_layout_v1";

// ─── Icon (reproduced here so page.tsx can be minimal) ───────────────────────
function Icon({ id, color }: { id: string; color: string }) {
  const s = { stroke: color, fill: "none", strokeWidth: "1.6", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const f = { fill: color, stroke: "none" };
  const icons: Record<string, React.ReactElement | null> = {
    reps: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" {...s}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...s}/></svg>,
    hospitals: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="14" rx="1" {...s}/><path d="M9 21V11h6v10M3 11l9-7 9 7" {...s}/><path d="M11 14h2M12 13v2" {...s}/></svg>,
    leads: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" {...s}/><circle cx="12" cy="12" r="5" {...s}/><circle cx="12" cy="12" r="1.5" style={f}/></svg>,
    opportunities: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="4" height="8" rx="1" {...s}/><rect x="10" y="8" width="4" height="13" rx="1" {...s}/><rect x="17" y="3" width="4" height="18" rx="1" {...s}/></svg>,
    won: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" {...s}/><path d="M8 12l3 3 5-5" {...s}/></svg>,
    invoices: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" {...s}/><path d="M8 8h8M8 12h5" {...s}/><path d="M12 16v4m-2-2h4" {...s}/></svg>,
  };
  return <>{icons[id] ?? null}</>;
}

// ─── Section components ───────────────────────────────────────────────────────
function StatsSection({ stats, hiddenStats, customizing, onToggleStat }: {
  stats: StatItem[];
  hiddenStats: Set<string>;
  customizing: boolean;
  onToggleStat: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
      {stats.map((s) => {
        const hidden = hiddenStats.has(s.id);
        if (!customizing && hidden) return null;
        return (
          <div key={s.id} style={{ position: "relative", opacity: hidden ? 0.3 : 1, transition: "opacity 0.2s" }}>
            <Link href={s.href} style={{ textDecoration: "none" }}>
              <div className="gold-card" style={{ borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "box-shadow 0.2s" }}>
                <div style={{ marginBottom: 10, opacity: 0.85 }}><Icon id={s.icon} color="var(--nyx-accent)" /></div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: "0.75rem", color: MUTED, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Link>
            {customizing && (
              <button
                onClick={() => onToggleStat(s.id)}
                title={hidden ? "Show card" : "Hide card"}
                style={{
                  position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%",
                  background: hidden ? "rgba(201,168,76,0.2)" : "rgba(255,80,80,0.15)",
                  border: `1px solid ${hidden ? "rgba(201,168,76,0.5)" : "rgba(255,80,80,0.4)"}`,
                  color: hidden ? GOLD : "rgba(255,80,80,0.8)", cursor: "pointer",
                  fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {hidden ? "+" : "×"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComplianceSection({ expiredDocs, soonDocs }: { expiredDocs: ComplianceDocItem[]; soonDocs: ComplianceDocItem[] }) {
  if (expiredDocs.length === 0 && soonDocs.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>COMPLIANCE ALERTS</p>
        <Link href="/admin/compliance" style={{ fontSize: "0.75rem", color: GOLD, textDecoration: "none", opacity: 0.7 }}>Manage →</Link>
      </div>
      <div style={{ background: expiredDocs.length ? "rgba(248,113,113,0.06)" : "rgba(251,191,36,0.05)", border: `1px solid ${expiredDocs.length ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.2)"}`, borderRadius: 12, padding: "16px 18px" }}>
        {expiredDocs.length > 0 && (
          <div style={{ marginBottom: soonDocs.length ? 12 : 0 }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              ⚠ {expiredDocs.length} EXPIRED{expiredDocs.length > 1 ? " DOCUMENTS" : " DOCUMENT"}
            </p>
            {expiredDocs.slice(0, 5).map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 12px", marginBottom: 4 }}>
                <span style={{ fontSize: "0.82rem", color: TEXT }}>{d.repName} — {d.type.replace(/_/g, " ")}</span>
                <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }}>Expired {new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
        {soonDocs.length > 0 && (
          <div>
            <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>EXPIRING WITHIN 30 DAYS</p>
            {soonDocs.slice(0, 5).map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 12px", marginBottom: 4 }}>
                <span style={{ fontSize: "0.82rem", color: TEXT }}>{d.repName} — {d.type.replace(/_/g, " ")}</span>
                <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 600 }}>Expires {new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TerritorySection({ mapHospitals, repTerritories }: { mapHospitals: MapHospital[]; repTerritories: RepTerritory[] }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>TERRITORY OVERVIEW</p>
        <Link href="/admin/territory" style={{ fontSize: "0.75rem", color: GOLD, textDecoration: "none", opacity: 0.7 }}>Full view →</Link>
      </div>
      <div className="gold-card" style={{ borderRadius: 12 }}>
        <div style={{ background: "var(--nyx-card)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ width: "100%", minHeight: 260, borderRadius: 10, overflow: "hidden" }}>
            <TerritoryMapWrapper hospitals={mapHospitals} repTerritories={repTerritories} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentOppsSection({ opps }: { opps: OppItem[] }) {
  return (
    <div className="gold-card" style={{ borderRadius: 12, padding: "20px", marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>RECENT OPPORTUNITIES</p>
        <Link href="/admin/opportunities" style={{ fontSize: "0.75rem", color: GOLD, textDecoration: "none", opacity: 0.7 }}>View all →</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opps.length === 0 && <p style={{ color: MUTED, fontSize: "0.85rem" }}>No opportunities yet.</p>}
        {opps.map((opp) => (
          <div key={opp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px 12px", padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, marginBottom: 2 }}>{opp.title}</div>
              <div style={{ fontSize: "0.75rem", color: MUTED }}>{opp.hospitalName}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: stageColor[opp.stage] ?? GOLD, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{opp.stage.replace("_", " ")}</div>
              {opp.value != null && <div style={{ fontSize: "0.75rem", color: GOLD, marginTop: 4 }}>{fmtCurrency(opp.value)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivitySection({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="gold-card" style={{ borderRadius: 12, padding: "20px", marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>RECENT ACTIVITY</p>
        <Link href="/admin/activities" style={{ fontSize: "0.75rem", color: GOLD, textDecoration: "none", opacity: 0.7 }}>View all →</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activities.length === 0 && <p style={{ color: MUTED, fontSize: "0.85rem" }}>No activity yet.</p>}
        {activities.map((act) => (
          <div key={act.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 6, flexShrink: 0, opacity: 0.6 }} />
            <div>
              <div style={{ fontSize: "0.82rem", color: TEXT, marginBottom: 1 }}>{act.title}</div>
              <div style={{ fontSize: "0.72rem", color: MUTED }}>{act.hospitalName ?? "-"} · {relTime(act.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Customize controls ───────────────────────────────────────────────────────
function SectionHandle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <circle cx="5" cy="5"  r="1.4" fill="rgba(201,168,76,0.55)"/>
      <circle cx="11" cy="5"  r="1.4" fill="rgba(201,168,76,0.55)"/>
      <circle cx="5" cy="11" r="1.4" fill="rgba(201,168,76,0.55)"/>
      <circle cx="11" cy="11" r="1.4" fill="rgba(201,168,76,0.55)"/>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardClient({
  stats,
  recentActivities,
  recentOpps,
  mapHospitals,
  repTerritories,
  expiredDocs,
  soonDocs,
}: DashboardClientProps) {
  const [order, setOrder]           = useState<SectionId[]>(ALL_SECTIONS);
  const [hidden, setHidden]         = useState<Set<SectionId>>(new Set());
  const [hiddenStats, setHiddenStats] = useState<Set<string>>(new Set());
  const [customizing, setCustomizing] = useState(false);
  const [dragging, setDragging]     = useState<SectionId | null>(null);
  const [dragOver, setDragOver]     = useState<SectionId | null>(null);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { order?: SectionId[]; hidden?: SectionId[]; hiddenStats?: string[] };
      if (Array.isArray(parsed.order) && parsed.order.length) setOrder(parsed.order);
      if (Array.isArray(parsed.hidden)) setHidden(new Set(parsed.hidden));
      if (Array.isArray(parsed.hiddenStats)) setHiddenStats(new Set(parsed.hiddenStats));
    } catch { /* ignore */ }
  }, []);

  const persist = (o: SectionId[], h: Set<SectionId>, hs: Set<string>) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: o, hidden: [...h], hiddenStats: [...hs] })); } catch { /* ignore */ }
  };

  const toggleSection = (id: SectionId) => {
    const next = new Set(hidden);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setHidden(next);
    persist(order, next, hiddenStats);
  };

  const toggleStat = (id: string) => {
    const next = new Set(hiddenStats);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setHiddenStats(next);
    persist(order, hidden, next);
  };

  const onDragStart = (id: SectionId) => setDragging(id);
  const onDragOver  = (e: React.DragEvent, id: SectionId) => { e.preventDefault(); setDragOver(id); };
  const onDrop      = (e: React.DragEvent, targetId: SectionId) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const from = order.indexOf(dragging);
    const to   = order.indexOf(targetId);
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragging);
    setOrder(next);
    persist(next, hidden, hiddenStats);
    setDragging(null);
    setDragOver(null);
  };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };

  const resetLayout = () => {
    setOrder(ALL_SECTIONS);
    setHidden(new Set());
    setHiddenStats(new Set());
    persist(ALL_SECTIONS, new Set(), new Set());
  };

  const renderSection = (id: SectionId) => {
    switch (id) {
      case "stats":
        return (
          <StatsSection
            stats={stats}
            hiddenStats={hiddenStats}
            customizing={customizing}
            onToggleStat={toggleStat}
          />
        );
      case "quick-actions":
        return <QuickActionsWidget role="ADMIN" />;
      case "compliance":
        return <ComplianceSection expiredDocs={expiredDocs} soonDocs={soonDocs} />;
      case "ai-insights":
        return (
          <div style={{ marginBottom: 32 }}>
            <AIInsightsPanel role="admin" />
          </div>
        );
      case "territory":
        return <TerritorySection mapHospitals={mapHospitals} repTerritories={repTerritories} />;
      case "recent-opps":
        return <RecentOppsSection opps={recentOpps} />;
      case "recent-activity":
        return <RecentActivitySection activities={recentActivities} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>NYXAEGIS</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>Command Center</h1>
          <p style={{ color: MUTED, fontSize: "0.875rem", marginTop: 4 }}>Business Development Overview</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {customizing && (
            <button
              onClick={resetLayout}
              style={{ background: "none", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "8px 12px", color: MUTED, fontSize: "0.75rem", cursor: "pointer" }}
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setCustomizing((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: customizing ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${customizing ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8, padding: "8px 14px",
              color: customizing ? GOLD : MUTED,
              fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {customizing
                ? <polyline points="20 6 9 17 4 12"/>
                : <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>
              }
            </svg>
            {customizing ? "Done" : "Customize Layout"}
          </button>
        </div>
      </div>

      {/* ── Customize panel ── */}
      {customizing && mounted && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            Toggle sections · Drag section handles to reorder
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_SECTIONS.map((id) => {
              const on = !hidden.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleSection(id)}
                  style={{
                    padding: "5px 13px", borderRadius: 20, fontSize: "0.77rem", fontWeight: 700, cursor: "pointer",
                    background: on ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${on ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: on ? GOLD : MUTED,
                    transition: "all 0.15s",
                  }}
                >
                  {on ? "✓ " : ""}{SECTION_LABELS[id]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sections in configured order ── */}
      {(!mounted ? ALL_SECTIONS : order).map((sectionId) => {
        if (mounted && hidden.has(sectionId)) return null;
        // hide compliance when there is nothing to show
        if (sectionId === "compliance" && expiredDocs.length === 0 && soonDocs.length === 0) return null;
        const isDragTarget = dragOver === sectionId && dragging !== sectionId;

        if (!mounted) {
          // SSR — render without drag / customize chrome
          return <React.Fragment key={sectionId}>{renderSection(sectionId)}</React.Fragment>;
        }

        return (
          <div
            key={sectionId}
            draggable={customizing}
            onDragStart={() => onDragStart(sectionId)}
            onDragOver={(e) => onDragOver(e, sectionId)}
            onDrop={(e) => onDrop(e, sectionId)}
            onDragEnd={onDragEnd}
            style={{
              opacity: dragging === sectionId ? 0.35 : 1,
              outline: isDragTarget ? "2px dashed rgba(201,168,76,0.45)" : "2px dashed transparent",
              borderRadius: 14,
              transition: "opacity 0.15s, outline 0.1s",
            }}
          >
            {customizing && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4, marginBottom: 4, cursor: "grab", userSelect: "none" }}>
                <SectionHandle />
                <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "rgba(201,168,76,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {SECTION_LABELS[sectionId]}
                </span>
                <button
                  onClick={() => toggleSection(sectionId)}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,80,80,0.55)", cursor: "pointer", fontSize: "0.72rem", padding: "1px 6px" }}
                >
                  Hide ×
                </button>
              </div>
            )}
            {renderSection(sectionId)}
          </div>
        );
      })}
    </div>
  );
}
