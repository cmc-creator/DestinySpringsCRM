"use client";
import { useState, useEffect, useCallback } from "react";

const C = {
  card:   "var(--nyx-card)",
  border: "var(--nyx-border)",
  cyan:   "var(--nyx-accent)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  input:  "var(--nyx-input-bg)",
};
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

const ACTION_CLR: Record<string, string> = {
  CREATE: "#34d399",
  UPDATE: "#60a5fa",
  DELETE: "#f87171",
};

interface AuditEntry {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  diff?: { before?: unknown; after?: unknown } | null;
  ip?: string | null;
  createdAt: string;
}

const RESOURCES = ["", "Lead", "Opportunity", "Hospital", "Rep", "Invoice", "Contract", "User"];

const relTime = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (pg = 1, res = resource) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (res) params.set("resource", res);
      const r = await fetch(`/api/audit?${params}`);
      if (r.ok) {
        const data: AuditEntry[] = await r.json();
        setEntries(pg === 1 ? data : (prev) => [...prev, ...data]);
        setHasMore(data.length === 50);
        setPage(pg);
      }
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => { load(1, resource); }, [resource]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>INTELLIGENCE</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Audit Log</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>Full history of all record changes — who did what and when</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <label style={{ fontSize: "0.68rem", color: C.muted, display: "block", marginBottom: 4 }}>FILTER BY RESOURCE</label>
            <select style={{ ...sel, width: 180 }} value={resource} onChange={e => { setResource(e.target.value); setPage(1); }}>
              <option value="">All resources</option>
              {RESOURCES.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="gold-card" style={{ borderRadius: 12 }}>
        <div style={{ background: C.card, borderRadius: 12, overflow: "hidden" }}>
          <div className="nyx-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["When", "User", "Action", "Resource", "Record ID", "IP", "Details"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && entries.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</td></tr>
                )}
                {!loading && entries.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted }}>No audit events recorded yet.</td></tr>
                )}
                {entries.map(entry => (
                  <>
                    <tr key={entry.id}
                      style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: entry.diff ? "pointer" : "default" }}
                      onClick={() => entry.diff && setExpanded(expanded === entry.id ? null : entry.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: C.muted, whiteSpace: "nowrap" }}>
                        <span title={new Date(entry.createdAt).toLocaleString()}>{relTime(entry.createdAt)}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>{entry.userName ?? "System"}</div>
                        {entry.userEmail && <div style={{ fontSize: "0.68rem", color: C.muted }}>{entry.userEmail}</div>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: ACTION_CLR[entry.action] ?? C.muted, background: "rgba(0,0,0,0.3)", padding: "2px 9px", borderRadius: 4, letterSpacing: "0.06em" }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: C.text }}>{entry.resource}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>
                        {entry.resourceId ? entry.resourceId.slice(0, 12) + "..." : "-"}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.72rem", color: C.muted }}>{entry.ip ?? "-"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.72rem", color: C.cyan }}>
                        {entry.diff ? (expanded === entry.id ? "Hide ▲" : "Show ▼") : "-"}
                      </td>
                    </tr>
                    {expanded === entry.id && entry.diff && (
                      <tr key={`${entry.id}-diff`}>
                        <td colSpan={7} style={{ padding: "0 14px 14px", background: "rgba(0,0,0,0.25)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 0" }}>
                            {entry.diff.before !== undefined && (
                              <div>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#f87171", letterSpacing: "0.1em", marginBottom: 6 }}>BEFORE</div>
                                <pre style={{ fontSize: "0.72rem", color: C.muted, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 6, padding: 10, overflow: "auto", maxHeight: 200, margin: 0 }}>
                                  {JSON.stringify(entry.diff.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.diff.after !== undefined && (
                              <div>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#34d399", letterSpacing: "0.1em", marginBottom: 6 }}>AFTER</div>
                                <pre style={{ fontSize: "0.72rem", color: C.muted, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 6, padding: 10, overflow: "auto", maxHeight: 200, margin: 0 }}>
                                  {JSON.stringify(entry.diff.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button
            onClick={() => load(page + 1)}
            disabled={loading}
            style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 28px", color: C.cyan, cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
            {loading ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
