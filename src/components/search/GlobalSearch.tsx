"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:     "var(--nyx-bg)",
  card:   "var(--nyx-card)",
  border: "var(--nyx-accent-dim)",
  str:    "var(--nyx-accent-str)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  accent: "var(--nyx-accent)",
  label:  "var(--nyx-accent-label)",
};

interface SearchResults {
  hospitals: { id: string; hospitalName: string; city?: string | null; state?: string | null; status: string }[];
  leads: { id: string; hospitalName: string; contactName?: string | null; status: string; city?: string | null; state?: string | null }[];
  opportunities: { id: string; title: string; stage: string; hospital: { hospitalName: string } }[];
  reps: { id: string; user: { name?: string | null; email?: string | null }; title?: string | null; territory?: string | null }[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export default function GlobalSearch({ role: _role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dq = useDebounce(query, 280);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  useEffect(() => {
    if (dq.length < 2) { setResults(null); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(dq)}`)
      .then(r => r.json())
      .then(d => { setResults(d); setCursor(0); })
      .finally(() => setLoading(false));
  }, [dq]);

  const allItems = results
    ? [
        ...results.hospitals.map(h => ({ type: "hospital" as const, id: h.id, primary: h.hospitalName, secondary: [h.city, h.state].filter(Boolean).join(", "), badge: h.status, href: `/admin/hospitals` })),
        ...results.leads.map(l => ({ type: "lead" as const, id: l.id, primary: l.hospitalName, secondary: l.contactName ?? "", badge: l.status, href: `/admin/leads` })),
        ...results.opportunities.map(o => ({ type: "opportunity" as const, id: o.id, primary: o.title, secondary: o.hospital.hospitalName, badge: o.stage, href: `/admin/opportunities` })),
        ...results.reps.map(r => ({ type: "rep" as const, id: r.id, primary: r.user.name ?? r.user.email ?? "", secondary: r.territory ?? "", badge: r.title ?? "", href: `/admin/reps` })),
      ]
    : [];

  const TYPE_ICON: Record<string, string> = { hospital: "🏥", lead: "🎯", opportunity: "📊", rep: "👤" };
  const TYPE_LABEL: Record<string, string> = { hospital: "Account", lead: "Lead", opportunity: "Opportunity", rep: "Rep" };

  const go = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults(null);
  }, [router]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && allItems[cursor]) go(allItems[cursor].href);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", color: C.muted, cursor: "pointer", fontSize: "0.8rem", transition: "border-color 0.15s" }}
        title="Global search (Ctrl+K)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        Search…
        <span className="nyx-search-shortcut" style={{ marginLeft: 4, fontSize: "0.68rem", background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", color: C.muted }}>Ctrl K</span>
      </button>
    );
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "min(640px, calc(100vw - 32px))", background: C.card, border: `1px solid ${C.str}`, borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search accounts, leads, opportunities, reps…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: "1rem", caretColor: C.accent }}
          />
          {loading && <span style={{ fontSize: "0.75rem", color: C.muted }}>Searching…</span>}
          <kbd style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", color: C.muted }}>ESC</kbd>
        </div>

        {/* Results */}
        {allItems.length > 0 && (
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {allItems.map((item, i) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => go(item.href)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", cursor: "pointer", background: i === cursor ? C.border : "transparent", transition: "background 0.1s" }}
                onMouseEnter={() => setCursor(i)}
              >
                <span style={{ fontSize: "1.1rem" }}>{TYPE_ICON[item.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.primary}</div>
                  {item.secondary && <div style={{ fontSize: "0.72rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.secondary}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: C.label, background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 4 }}>{TYPE_LABEL[item.type]}</span>
                  {item.badge && <span style={{ fontSize: "0.62rem", color: C.muted, background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4 }}>{item.badge}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && allItems.length === 0 && (
          <div style={{ padding: "32px 18px", textAlign: "center", color: C.muted, fontSize: "0.875rem" }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {query.length < 2 && (
          <div style={{ padding: "20px 18px", color: C.muted, fontSize: "0.8rem" }}>
            Start typing to search across all accounts, leads, opportunities, and reps.
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 18px", display: "flex", gap: 16, color: C.muted, fontSize: "0.68rem" }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>ESC close</span>
        </div>
      </div>
    </div>
  );
}
