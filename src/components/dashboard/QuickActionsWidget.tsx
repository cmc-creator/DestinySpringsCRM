"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CYAN  = "var(--nyx-accent)";
const MUTED = "var(--nyx-text-muted)";
const TEXT  = "var(--nyx-text)";
const CARD  = "var(--nyx-card)";
const BORDER = "var(--nyx-border)";

const s = (c: string) => ({ stroke: c, fill: "none", strokeWidth: "1.6", strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

function Icon({ id }: { id: string }) {
  const p = s(CYAN);
  const icons: Record<string, React.JSX.Element> = {
    referral: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p}/>
        <circle cx="9" cy="7" r="4" {...p}/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" {...p}/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" {...p}/>
      </svg>
    ),
    target: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" {...p}/>
        <circle cx="12" cy="12" r="5" {...p}/>
        <circle cx="12" cy="12" r="1.5" fill={CYAN} stroke="none"/>
      </svg>
    ),
    chart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="13" width="4" height="8" rx="1" {...p}/>
        <rect x="10" y="8" width="4" height="13" rx="1" {...p}/>
        <rect x="17" y="3" width="4" height="18" rx="1" {...p}/>
      </svg>
    ),
    user: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" {...p}/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...p}/>
      </svg>
    ),
    hospital: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="14" rx="1" {...p}/>
        <path d="M9 21V11h6v10M3 11l9-7 9 7" {...p}/>
      </svg>
    ),
    contract: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="16" height="20" rx="2" {...p}/>
        <path d="M8 7h8M8 11h8M8 15h5" {...p}/>
      </svg>
    ),
    invoice: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="16" height="20" rx="2" {...p}/>
        <path d="M8 8h8M8 12h5" {...p}/>
        <path d="M12 16v4m-2-2h4" {...p}/>
      </svg>
    ),
    calendar: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" {...p}/>
        <path d="M16 2v4M8 2v4M3 10h18" {...p}/>
      </svg>
    ),
    analytics: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 3v18h18" {...p}/>
        <path d="M7 16l4-4 4 4 4-7" {...p}/>
      </svg>
    ),
    reports: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="16" height="20" rx="2" {...p}/>
        <path d="M8 6h8M8 10h8M8 14h5" {...p}/>
      </svg>
    ),
    territory: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" {...p}/>
        <path d="M2 12h20M12 2c-3 4-3 14 0 20M12 2c3 4 3 14 0 20" {...p}/>
      </svg>
    ),
    notifications: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...p}/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" {...p}/>
      </svg>
    ),
  };
  return <>{icons[id] ?? null}</>;
}

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

const ALL_ACTIONS: QuickAction[] = [
  { id: "referral",      label: "Add Referral",     href: "/admin/leads",         icon: "referral" },
  { id: "lead",          label: "Add Lead",          href: "/admin/leads",         icon: "target" },
  { id: "opportunity",   label: "New Opportunity",   href: "/admin/opportunities", icon: "chart" },
  { id: "rep",           label: "Add Rep",           href: "/admin/reps",          icon: "user" },
  { id: "hospital",      label: "Add Hospital",      href: "/admin/hospitals",     icon: "hospital" },
  { id: "contract",      label: "New Contract",      href: "/admin/contracts",     icon: "contract" },
  { id: "invoice",       label: "New Invoice",       href: "/admin/invoices",      icon: "invoice" },
  { id: "calendar",      label: "Calendar",          href: "/admin/calendar",      icon: "calendar" },
  { id: "analytics",     label: "Analytics",         href: "/admin/analytics",     icon: "analytics" },
  { id: "reports",       label: "Reports",           href: "/admin/reports",       icon: "reports" },
  { id: "territory",     label: "Territory",         href: "/admin/territory",     icon: "territory" },
  { id: "notifications", label: "Notifications",     href: "/admin/notifications", icon: "notifications" },
];

const DEFAULT_IDS = ["referral", "lead", "opportunity", "rep"];
const STORAGE_KEY = "nyx_quick_actions";

export default function QuickActionsWidget() {
  const [enabled, setEnabled]   = useState<string[]>(DEFAULT_IDS);
  const [editing, setEditing]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEnabled(JSON.parse(stored) as string[]);
    } catch {
      // ignore
    }
  }, []);

  const save = (ids: string[]) => {
    setEnabled(ids);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  };

  const toggle = (id: string) => {
    save(enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id]);
  };

  const active = ALL_ACTIONS.filter((a) => enabled.includes(a.id));

  if (!mounted) {
    // SSR placeholder — renders default actions non-interactively
    return (
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
          QUICK ACTIONS
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ALL_ACTIONS.filter((a) => DEFAULT_IDS.includes(a.id)).map((a) => (
            <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 8, padding: "8px 14px", color: CYAN, fontSize: "0.8rem", fontWeight: 600 }}>
              <Icon id={a.icon} /> {a.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
          QUICK ACTIONS
        </p>
        <button
          onClick={() => setEditing((v) => !v)}
          title={editing ? "Done" : "Customize quick actions"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, color: editing ? CYAN : MUTED, fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s" }}
        >
          {editing ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Done
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Customize
            </>
          )}
        </button>
      </div>

      {/* Active action buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: editing ? 16 : 0 }}>
        {active.length === 0 ? (
          <span style={{ fontSize: "0.78rem", color: MUTED, fontStyle: "italic" }}>No actions selected. Use Customize to add some.</span>
        ) : (
          active.map((a) => (
            <Link key={a.id} href={a.href} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 8, padding: "8px 14px", textDecoration: "none", color: CYAN, fontSize: "0.8rem", fontWeight: 600 }}>
              <Icon id={a.icon} /> {a.label}
            </Link>
          ))
        )}
      </div>

      {/* Customize panel */}
      {editing && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
          <p style={{ fontSize: "0.72rem", color: MUTED, marginBottom: 14 }}>
            Toggle which actions appear in your quick actions bar. Changes save automatically.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ALL_ACTIONS.map((a) => {
              const on = enabled.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: on ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${on ? "var(--nyx-accent-mid)" : BORDER}`,
                    borderRadius: 8, padding: "8px 14px",
                    color: on ? CYAN : MUTED,
                    fontSize: "0.8rem", fontWeight: on ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? CYAN : MUTED}`, background: on ? CYAN : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                    {on && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                    )}
                  </span>
                  <Icon id={a.icon} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
