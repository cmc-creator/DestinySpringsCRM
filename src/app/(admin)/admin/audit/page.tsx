"use client";
import { useState, useEffect, useCallback, Fragment } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  card:   "var(--nyx-card)",
  border: "var(--nyx-border)",
  cyan:   "var(--nyx-accent)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  input:  "var(--nyx-input-bg)",
};
const inp: React.CSSProperties = {
  width: "100%", background: C.input, border: `1px solid ${C.border}`,
  borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem",
  outline: "none", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, appearance: "none" };

const ACTION_CLR: Record<string, string> = {
  CREATE: "#34d399",
  UPDATE: "#60a5fa",
  DELETE: "#f87171",
  LOGIN_SUCCESS: "#a78bfa",
};

const DEVICE_CLR: Record<string, string> = {
  mobile: "#f59e0b",
  tablet: "#a78bfa",
  desktop: "var(--nyx-accent)",
};

const DEVICE_ICON: Record<string, string> = {
  mobile: "📱",
  tablet: "📟",
  desktop: "🖥",
};

interface AuditEntry {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  diff?: { _meta?: { source?: string; intent?: string }; before?: unknown; after?: unknown } | null;
  ip?: string | null;
  createdAt: string;
}

interface SessionDetail {
  id: string;
  loginAt: string;
  logoutAt: string | null;
  durationSecs: number | null;
  deviceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  topPaths: { path: string; count: number }[];
}

// ─── Analytics types ───────────────────────────────────────────────────────────
interface UserStat {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  sessionCount: number;
  lastLoginAt: string | null;
  avgDurationSecs: number | null;
  mobilePercent: number;
  topPaths: { path: string; count: number }[];
}

interface AnalyticsData {
  days: number;
  summary: {
    totalSessions: number;
    uniqueUsers: number;
    totalPageViews: number;
    avgSessionSecs: number | null;
    deviceCounts: { mobile: number; tablet: number; desktop: number };
  };
  heatmap: number[][];
  topPages: { path: string; count: number }[];
  perUser: UserStat[];
}

const RESOURCES = ["", "Lead", "Opportunity", "Hospital", "Rep", "Invoice", "Contract", "User"];
const DAYS_OPTS = [7, 14, 30, 60, 90];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const fmtDuration = (secs: number | null): string => {
  if (secs === null) return "—";
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
};

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

// ─── Heatmap cell ─────────────────────────────────────────────────────────────
function HeatCell({ count, max }: { count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0;
  const bg = intensity === 0
    ? "rgba(0,0,0,0.15)"
    : `rgba(0,212,255,${0.1 + intensity * 0.85})`;
  return (
    <td
      title={`${count} login${count !== 1 ? "s" : ""}`}
      style={{ width: 22, height: 22, background: bg, borderRadius: 3, transition: "background 0.2s" }}
    />
  );
}

// ─── Login session detail panel ───────────────────────────────────────────────
function LoginDetail({ entry }: { entry: AuditEntry }) {
  const [sessionData, setSessionData] = useState<SessionDetail | null | "loading" | "none">("loading");

  useEffect(() => {
    fetch(`/api/sessions/for-audit?userId=${entry.userId}&loginAt=${encodeURIComponent(entry.createdAt)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setSessionData(data?.session ?? "none"))
      .catch(() => setSessionData("none"));
  }, [entry.userId, entry.createdAt]);

  const loginDate = new Date(entry.createdAt);
  const dayLabel = loginDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeLabel = loginDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });

  const s = sessionData === "loading" || sessionData === "none" ? null : sessionData;

  return (
    <div style={{ padding: "14px 20px", background: "rgba(167,139,250,0.05)", borderTop: "1px solid rgba(167,139,250,0.15)" }}>
      {/* ── Row 1: when + device + duration ─────────────────────────────── */}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: s?.topPaths.length ? 16 : 0 }}>
        {/* Login time */}
        <div>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 4 }}>LOGIN TIME</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.text }}>{timeLabel}</div>
          <div style={{ fontSize: "0.7rem", color: C.muted }}>{dayLabel}</div>
        </div>

        {/* Device */}
        <div>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 4 }}>DEVICE</div>
          {sessionData === "loading" ? (
            <div style={{ fontSize: "0.78rem", color: C.muted }}>Fetching…</div>
          ) : s ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "1rem" }}>{DEVICE_ICON[s.deviceType ?? "desktop"] ?? "🖥"}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: DEVICE_CLR[s.deviceType ?? "desktop"] ?? C.cyan, textTransform: "capitalize" }}>
                {s.deviceType ?? "Unknown"}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: "0.78rem", color: C.muted }}>No session data</div>
          )}
        </div>

        {/* Session duration */}
        {s && (
          <div>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 4 }}>SESSION DURATION</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.text }}>{fmtDuration(s.durationSecs)}</div>
            {s.logoutAt && <div style={{ fontSize: "0.7rem", color: C.muted }}>Ended {fmtDateTime(s.logoutAt)}</div>}
            {!s.logoutAt && <div style={{ fontSize: "0.7rem", color: "#f59e0b" }}>Session still open</div>}
          </div>
        )}

        {/* IP */}
        <div>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 4 }}>IP ADDRESS</div>
          <div style={{ fontSize: "0.82rem", color: C.text, fontFamily: "monospace" }}>
            {s?.ipAddress ?? entry.ip ?? "—"}
          </div>
        </div>
      </div>

      {/* ── Row 2: pages visited ─────────────────────────────────────────── */}
      {s && s.topPaths.length > 0 && (
        <div>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 }}>
            PAGES VISITED THIS SESSION ({s.topPaths.reduce((a, p) => a + p.count, 0)} total)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {s.topPaths.map(({ path, count }) => {
              const pct = Math.round((count / (s.topPaths[0]?.count || 1)) * 100);
              return (
                <div key={path} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.72rem", color: C.text, fontFamily: "monospace", minWidth: 220 }}>{path}</span>
                  <div style={{ flex: 1, maxWidth: 100, height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 2 }}>
                    <div style={{ height: 4, width: `${pct}%`, background: "#a78bfa", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", color: C.muted }}>{count}×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No page data notice ──────────────────────────────────────────── */}
      {s && s.topPaths.length === 0 && (
        <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 4 }}>No page view data for this session yet.</div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [tab, setTab] = useState<"log" | "activity">("log");

  // ── Audit log state ────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [resource, setResource] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Analytics state ────────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadLog = useCallback(async (pg = 1, res = resource, src = source) => {
    setLogLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (res) params.set("resource", res);
      if (src) params.set("source", src);
      const r = await fetch(`/api/audit?${params}`);
      if (r.ok) {
        const { logs }: { logs: AuditEntry[] } = await r.json();
        setEntries(pg === 1 ? logs : (prev) => [...prev, ...logs]);
        setHasMore(logs.length === 50);
        setPage(pg);
      }
    } finally { setLogLoading(false); }
  }, [resource, source]);

  useEffect(() => {
    if (tab === "log") loadLog(1, resource, source);
  }, [resource, source, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalytics = useCallback(async (days = analyticsDays) => {
    setAnalyticsLoading(true);
    try {
      const r = await fetch(`/api/admin/analytics?days=${days}`);
      if (r.ok) setAnalytics(await r.json());
    } finally { setAnalyticsLoading(false); }
  }, [analyticsDays]);

  useEffect(() => {
    if (tab === "activity") loadAnalytics(analyticsDays);
  }, [tab, analyticsDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem",
    cursor: "pointer", border: "none", letterSpacing: "0.04em",
    background: active ? "var(--nyx-accent-dim)" : "transparent",
    color: active ? C.cyan : C.muted,
    borderBottom: active ? `2px solid ${C.cyan}` : "2px solid transparent",
  });

  const heatmapMax = analytics
    ? Math.max(...analytics.heatmap.flatMap((row) => row), 1)
    : 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>INTELLIGENCE</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Audit Log</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>Full history of record changes and user activity</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        <button style={tabStyle(tab === "log")} onClick={() => setTab("log")}>Audit Log</button>
        <button style={tabStyle(tab === "activity")} onClick={() => setTab("activity")}>User Activity</button>
      </div>

      {/* ── TAB: Audit Log ─────────────────────────────────────────────────── */}
      {tab === "log" && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: "0.68rem", color: C.muted, display: "block", marginBottom: 4 }}>FILTER BY RESOURCE</label>
              <select style={{ ...sel, width: 180 }} value={resource} onChange={e => { setResource(e.target.value); setPage(1); }}>
                <option value="">All resources</option>
                {RESOURCES.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.68rem", color: C.muted, display: "block", marginBottom: 4 }}>FILTER BY SOURCE</label>
              <select style={{ ...sel, width: 180 }} value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
                <option value="">All sources</option>
                <option value="AEGIS_AI">Aegis AI only</option>
              </select>
            </div>
          </div>

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
                    {logLoading && entries.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</td></tr>
                    )}
                    {!logLoading && entries.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted }}>No audit events recorded yet.</td></tr>
                    )}
                    {entries.map(entry => {
                      const isLogin = entry.action === "LOGIN_SUCCESS";
                      const isExpanded = expanded === entry.id;
                      return (
                        <Fragment key={entry.id}>
                          <tr
                            style={{ borderBottom: isExpanded ? "none" : `1px solid var(--nyx-accent-dim)`, cursor: "pointer" }}
                            onClick={() => setExpanded(isExpanded ? null : entry.id)}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                              <div style={{ fontSize: "0.75rem", color: C.muted }} title={new Date(entry.createdAt).toLocaleString()}>
                                {relTime(entry.createdAt)}
                              </div>
                              {isLogin && (
                                <div style={{ fontSize: "0.68rem", color: "#a78bfa", marginTop: 2 }}>
                                  {new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                  {" · "}
                                  {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </div>
                              )}
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
                            <td style={{ padding: "12px 14px", fontSize: "0.72rem", color: isLogin ? "#a78bfa" : C.cyan }}>
                              {entry.diff?._meta?.source === "AEGIS_AI" && (
                                <span style={{ display: "inline-block", marginRight: 8, color: "#a78bfa", fontWeight: 700 }}>Aegis</span>
                              )}
                              {isLogin ? (isExpanded ? "Hide ▲" : "Details ▼") : (entry.diff ? (isExpanded ? "Hide ▲" : "Show ▼") : "-")}
                            </td>
                          </tr>

                          {/* ── Expanded: LOGIN_SUCCESS ── */}
                          {isExpanded && isLogin && (
                            <tr style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                              <td colSpan={7} style={{ padding: 0 }}>
                                <LoginDetail entry={entry} />
                              </td>
                            </tr>
                          )}

                          {/* ── Expanded: diff (non-login) ── */}
                          {isExpanded && !isLogin && entry.diff && (
                            <tr style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
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
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button
                onClick={() => loadLog(page + 1)}
                disabled={logLoading}
                style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 28px", color: C.cyan, cursor: logLoading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                {logLoading ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── TAB: User Activity ─────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>TIME RANGE</span>
            {DAYS_OPTS.map(d => (
              <button key={d} onClick={() => setAnalyticsDays(d)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                border: `1px solid ${analyticsDays === d ? C.cyan : C.border}`,
                background: analyticsDays === d ? "var(--nyx-accent-dim)" : "transparent",
                color: analyticsDays === d ? C.cyan : C.muted,
              }}>{d}d</button>
            ))}
            {analyticsLoading && <span style={{ fontSize: "0.75rem", color: C.muted }}>Loading…</span>}
          </div>

          {analytics && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "SESSIONS", value: analytics.summary.totalSessions.toLocaleString() },
                  { label: "UNIQUE USERS", value: analytics.summary.uniqueUsers.toLocaleString() },
                  { label: "PAGE VIEWS", value: analytics.summary.totalPageViews.toLocaleString() },
                  { label: "AVG SESSION", value: fmtDuration(analytics.summary.avgSessionSecs) },
                  { label: "MOBILE %", value: analytics.summary.totalSessions > 0 ? `${Math.round((analytics.summary.deviceCounts.mobile / analytics.summary.totalSessions) * 100)}%` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="gold-card" style={{ borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: C.text }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Heatmap */}
                <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", marginBottom: 14 }}>LOGIN HEATMAP — DAY × HOUR</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "separate", borderSpacing: 2 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 28 }} />
                          {Array.from({ length: 24 }, (_, h) => (
                            <th key={h} style={{ fontSize: "0.5rem", color: C.muted, fontWeight: 600, textAlign: "center", paddingBottom: 4, width: 22 }}>
                              {h % 6 === 0 ? `${h}h` : ""}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS_OF_WEEK.map((day, di) => (
                          <tr key={day}>
                            <td style={{ fontSize: "0.6rem", color: C.muted, fontWeight: 600, paddingRight: 6, textAlign: "right", whiteSpace: "nowrap" }}>{day}</td>
                            {analytics.heatmap[di].map((count, hi) => (
                              <HeatCell key={hi} count={count} max={heatmapMax} />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <span style={{ fontSize: "0.6rem", color: C.muted }}>Less</span>
                      {[0, 0.25, 0.5, 0.75, 1].map(i => (
                        <div key={i} style={{ width: 14, height: 14, borderRadius: 2, background: i === 0 ? "rgba(0,0,0,0.15)" : `rgba(0,212,255,${0.1 + i * 0.85})` }} />
                      ))}
                      <span style={{ fontSize: "0.6rem", color: C.muted }}>More</span>
                    </div>
                  </div>
                </div>

                {/* Top Pages */}
                <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", marginBottom: 14 }}>TOP VISITED PAGES</div>
                  {analytics.topPages.length === 0 && <p style={{ color: C.muted, fontSize: "0.8rem" }}>No page views tracked yet.</p>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {analytics.topPages.slice(0, 15).map(({ path, count }) => {
                      const pct = Math.round((count / (analytics.topPages[0]?.count || 1)) * 100);
                      return (
                        <div key={path}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: "0.72rem", color: C.text, fontFamily: "monospace" }}>{path}</span>
                            <span style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 700 }}>{count.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 2 }}>
                            <div style={{ height: 4, width: `${pct}%`, background: C.cyan, borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Device split */}
              <div className="gold-card" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", marginBottom: 12 }}>DEVICE BREAKDOWN</div>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  {(["mobile", "tablet", "desktop"] as const).map((dt) => {
                    const count = analytics.summary.deviceCounts[dt];
                    const total = analytics.summary.totalSessions || 1;
                    const pct = Math.round((count / total) * 100);
                    const clr = dt === "mobile" ? "#f59e0b" : dt === "tablet" ? "#a78bfa" : C.cyan;
                    return (
                      <div key={dt} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${clr}22`, border: `2px solid ${clr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: clr }}>{pct}%</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.text, textTransform: "capitalize" }}>{dt}</div>
                          <div style={{ fontSize: "0.68rem", color: C.muted }}>{count.toLocaleString()} sessions</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-user table */}
              <div className="gold-card" style={{ borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em" }}>PER-USER ACTIVITY</div>
                </div>
                <div className="nyx-table-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["User", "Role", "Last Login", "Sessions", "Avg Duration", "Mobile %", "Top Pages"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.perUser.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted }}>No activity data yet.</td></tr>
                      )}
                      {analytics.perUser.map(u => (
                        <Fragment key={u.userId}>
                          <tr
                            style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: "pointer" }}
                            onClick={() => setExpandedUser(expandedUser === u.userId ? null : u.userId)}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding: "11px 14px" }}>
                              <div style={{ fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>{u.name ?? "—"}</div>
                              {u.email && <div style={{ fontSize: "0.68rem", color: C.muted }}>{u.email}</div>}
                            </td>
                            <td style={{ padding: "11px 14px" }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.2)", color: u.role === "ADMIN" ? "#f59e0b" : u.role === "REP" ? "#34d399" : C.cyan }}>
                                {u.role}
                              </span>
                            </td>
                            <td style={{ padding: "11px 14px", fontSize: "0.78rem", color: C.muted, whiteSpace: "nowrap" }}>
                              {u.lastLoginAt ? <span title={new Date(u.lastLoginAt).toLocaleString()}>{fmtDateTime(u.lastLoginAt)}</span> : "—"}
                            </td>
                            <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: C.text, fontWeight: 700, textAlign: "center" }}>{u.sessionCount}</td>
                            <td style={{ padding: "11px 14px", fontSize: "0.78rem", color: C.muted }}>{fmtDuration(u.avgDurationSecs)}</td>
                            <td style={{ padding: "11px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ flex: 1, maxWidth: 60, height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 2 }}>
                                  <div style={{ height: 4, width: `${u.mobilePercent}%`, background: "#f59e0b", borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: "0.72rem", color: C.muted }}>{u.mobilePercent}%</span>
                              </div>
                            </td>
                            <td style={{ padding: "11px 14px", fontSize: "0.72rem", color: C.cyan }}>
                              {u.topPaths.length > 0 ? (expandedUser === u.userId ? "Hide ▲" : `${u.topPaths.length} paths ▼`) : "—"}
                            </td>
                          </tr>
                          {expandedUser === u.userId && u.topPaths.length > 0 && (
                            <tr>
                              <td colSpan={7} style={{ padding: "8px 20px 14px", background: "rgba(0,0,0,0.2)" }}>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", marginBottom: 8 }}>TOP PATHS FOR {(u.name ?? u.email ?? "this user").toUpperCase()}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                  {u.topPaths.map(({ path, count }) => (
                                    <div key={path} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <span style={{ fontSize: "0.72rem", color: C.text, fontFamily: "monospace", minWidth: 200 }}>{path}</span>
                                      <div style={{ flex: 1, maxWidth: 120, height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 2 }}>
                                        <div style={{ height: 4, width: `${Math.round((count / (u.topPaths[0]?.count || 1)) * 100)}%`, background: C.cyan, borderRadius: 2 }} />
                                      </div>
                                      <span style={{ fontSize: "0.7rem", color: C.muted }}>{count}x</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!analytics && !analyticsLoading && (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>No activity data available yet.</div>
          )}
        </div>
      )}
    </div>
  );
}