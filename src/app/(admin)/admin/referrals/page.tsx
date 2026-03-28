"use client";

import { useEffect, useState, useCallback } from "react";

const C = {
  cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  dim: "var(--nyx-text-muted)", card: "var(--nyx-card)",
  border: "var(--nyx-border)", emerald:"#10b981", amber:"#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED:"var(--nyx-accent-mid)", ADMITTED:"rgba(16,185,129,0.15)",
  DECLINED:"rgba(239,68,68,0.15)", PENDING:"rgba(245,158,11,0.15)",
  DUPLICATE:"rgba(148,163,184,0.1)",
};
const STATUS_TEXT: Record<string, string> = {
  RECEIVED:C.cyan, ADMITTED:C.emerald, DECLINED:"#f87171",
  PENDING:C.amber, DUPLICATE:"#94a3b8",
};

type Referral = {
  id:string; status:string; patientInitials?:string; admissionDate?:string;
  dischargeDate?:string; dischargeDestination?:string; serviceLine?:string; externalId?:string; createdAt:string;
  referralSource:{ id:string; name:string; type:string; specialty?:string };
};

type SyncHealthEntry = {
  syncType: "BEDBOARD" | "DISCHARGE";
  status: "SUCCESS" | "FAILED";
  detail?: string;
  createdAt: string;
  ageHours: number;
  stale: boolean;
  totalRows?: number;
  imported?: number;
  updated?: number;
  created?: number;
  skipped?: number;
  errors?: number;
};

type SyncHealthResponse = {
  bedboard: SyncHealthEntry | null;
  discharge: SyncHealthEntry | null;
  recentFailures: SyncHealthEntry[];
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncingBedboard, setSyncingBedboard] = useState(false);
  const [syncingDischarge, setSyncingDischarge] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [fromDate, setFromDate]   = useState("");
  const [toDate,   setToDate]     = useState("");
  const [status,   setStatus]     = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [syncHealth, setSyncHealth] = useState<SyncHealthResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate)   params.set("to",   toDate);
    if (status)   params.set("status", status);
    const [referralsRes, healthRes] = await Promise.all([
      fetch(`/api/referrals?${params.toString()}`),
      fetch("/api/referrals/sync-health"),
    ]);
    if (referralsRes.ok) setReferrals(await referralsRes.json());
    if (healthRes.ok) setSyncHealth(await healthRes.json());
    setLoading(false);
  }, [fromDate, toDate, status]);

  useEffect(() => { load(); }, [load]);

  async function syncBedboardNow() {
    setSyncingBedboard(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/referrals/intake/m365/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data?.error ? String(data.error) : "Bedboard sync failed");
      } else {
        setSyncMessage(`Bedboard synced: ${data.imported ?? 0} imported, ${data.skipped ?? 0} skipped, ${data.errors ?? 0} errors`);
        await load();
      }
    } catch {
      setSyncMessage("Network error while syncing bedboard");
    } finally {
      setSyncingBedboard(false);
    }
  }

  async function syncDischargeNow() {
    setSyncingDischarge(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/referrals/discharge/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data?.error ? String(data.error) : "Discharge sync failed");
      } else {
        setSyncMessage(`Discharge synced: ${data.updated ?? 0} updated, ${data.created ?? 0} created, ${data.skipped ?? 0} skipped, ${data.errors ?? 0} errors`);
        await load();
      }
    } catch {
      setSyncMessage("Network error while syncing discharge sheet");
    } finally {
      setSyncingDischarge(false);
    }
  }

  const fmt = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  const isMissingDischargeDestination = (referral: Referral) => {
    const discharged = !!referral.dischargeDate;
    const hasDestination = !!(referral.dischargeDestination && referral.dischargeDestination.trim());
    return discharged && !hasDestination;
  };

  const destinationOptions = Array.from(new Set(
    referrals
      .map((referral) => referral.dischargeDestination?.trim())
      .filter((destination): destination is string => !!destination),
  )).sort((a, b) => a.localeCompare(b));

  const filteredReferrals = referrals.filter((referral) => {
    if (!destinationFilter) return true;
    if (destinationFilter === "__MISSING__") return isMissingDischargeDestination(referral);
    return (referral.dischargeDestination ?? "").trim() === destinationFilter;
  });

  // Summary stats
  const total    = filteredReferrals.length;
  const admitted = filteredReferrals.filter((r) => r.status === "ADMITTED").length;
  const pending  = filteredReferrals.filter((r) => r.status === "PENDING" || r.status === "RECEIVED").length;
  const missingDestination = filteredReferrals.filter((referral) => isMissingDischargeDestination(referral)).length;

  // Group by source for quick summary
  const bySource: Record<string, number> = {};
  for (const referral of filteredReferrals) {
    const key = referral.referralSource.name;
    bySource[key] = (bySource[key] ?? 0) + 1;
  }
  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const byDestination: Record<string, number> = {};
  for (const referral of filteredReferrals) {
    const key = (referral.dischargeDestination ?? "").trim();
    if (!key) continue;
    byDestination[key] = (byDestination[key] ?? 0) + 1;
  }
  const topDestinations = Object.entries(byDestination)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const startOfWeek = (date: Date) => {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utc.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    utc.setUTCDate(utc.getUTCDate() + diff);
    return utc;
  };

  const weeklyDestinationTrends = (() => {
    const now = new Date();
    const thisWeek = startOfWeek(now);
    const weeks = Array.from({ length: 8 }).map((_, idx) => {
      const week = new Date(thisWeek);
      week.setUTCDate(week.getUTCDate() - (7 * (7 - idx)));
      return week;
    });

    const trendMap = new Map<string, number>();
    for (const weekStart of weeks) {
      trendMap.set(weekStart.toISOString().slice(0, 10), 0);
    }

    for (const referral of filteredReferrals) {
      if (!referral.dischargeDestination?.trim()) continue;
      if (!referral.dischargeDate) continue;
      const dischargeDate = new Date(referral.dischargeDate);
      if (isNaN(dischargeDate.getTime())) continue;
      const key = startOfWeek(dischargeDate).toISOString().slice(0, 10);
      if (!trendMap.has(key)) continue;
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }

    return Array.from(trendMap.entries()).map(([weekStart, count]) => ({ weekStart, count }));
  })();

  const maxWeeklyTrend = Math.max(1, ...weeklyDestinationTrends.map((week) => week.count));

  function exportCsv() {
    const headers = [
      "Referring Source",
      "Source Type",
      "Patient",
      "Service Line",
      "Admitted",
      "Discharged",
      "Referred Out To",
      "Encounter #",
      "Status",
    ];

    const rows = filteredReferrals.map((referral) => [
      referral.referralSource.name ?? "",
      referral.referralSource.type ?? "",
      referral.patientInitials ?? "",
      referral.serviceLine ?? "",
      referral.admissionDate ? new Date(referral.admissionDate).toISOString().slice(0, 10) : "",
      referral.dischargeDate ? new Date(referral.dischargeDate).toISOString().slice(0, 10) : "",
      referral.dischargeDestination ?? "",
      referral.externalId ?? "",
      referral.status ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admissions-referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p style={{ color:C.cyan, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>Admissions Referrals</p>
        <h1 style={{ fontSize:"1.8rem", fontWeight:900, color:C.text }}>Admissions Referrals Ledger</h1>
        <p style={{ color:C.muted, fontSize:"0.875rem", marginTop:4 }}>Track who referred each admission from the daily bedboard and EHR feeds.</p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:12 }}>
          <button
            onClick={syncBedboardNow}
            disabled={syncingBedboard}
            style={{
              background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.35)", borderRadius:8,
              padding:"8px 14px", color:"#93c5fd", cursor: syncingBedboard ? "not-allowed" : "pointer", fontSize:"0.8rem", fontWeight:700,
            }}
          >
            {syncingBedboard ? "Syncing Bedboard…" : "Sync Daily Bedboard (M365)"}
          </button>
          <button
            onClick={syncDischargeNow}
            disabled={syncingDischarge}
            style={{
              background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.35)", borderRadius:8,
              padding:"8px 14px", color:"#86efac", cursor: syncingDischarge ? "not-allowed" : "pointer", fontSize:"0.8rem", fontWeight:700,
            }}
          >
            {syncingDischarge ? "Syncing Discharge…" : "Sync Discharge Sheet (M365)"}
          </button>
          <a
            href="/admin/integrations/m365-intake"
            style={{
              background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8,
              padding:"8px 14px", color:C.muted, textDecoration:"none", fontSize:"0.8rem", fontWeight:700,
            }}
          >
            Open Bedboard Integration
          </a>
          <a
            href="/admin/integrations/discharge-sync"
            style={{
              background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8,
              padding:"8px 14px", color:C.muted, textDecoration:"none", fontSize:"0.8rem", fontWeight:700,
            }}
          >
            Open Discharge Integration
          </a>
          <button
            onClick={exportCsv}
            style={{
              background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8,
              padding:"8px 14px", color:C.muted, cursor:"pointer", fontSize:"0.8rem", fontWeight:700,
            }}
          >
            Export CSV
          </button>
        </div>
        {syncMessage && <p style={{ color:C.muted, fontSize:"0.78rem", marginTop:8 }}>{syncMessage}</p>}
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
        {[
          { label:"Total Referrals", value:total,    color:C.cyan },
          { label:"Admitted",        value:admitted, color:C.emerald },
          { label:"In Progress",     value:pending,  color:C.amber },
          { label:"Missing Destination", value:missingDestination, color:"#f87171" },
          { label:"Top Source",      value:topSources[0]?.[0]?.split(" ").slice(-1)[0] ?? "-", color:"#a78bfa" },
        ].map((s) => (
          <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 16px" }}>
            <div style={{ fontSize:"1.6rem", fontWeight:900, color:s.color, letterSpacing:"-0.03em" }}>{s.value}</div>
            <div style={{ fontSize:"0.72rem", color:C.muted, marginTop:4, fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        <div>
          <label style={{ display:"block", fontSize:"0.65rem", color:C.dim, marginBottom:4, fontWeight:700, letterSpacing:"0.08em" }}>FROM</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:"0.82rem", outline:"none" }} />
        </div>
        <div>
          <label style={{ display:"block", fontSize:"0.65rem", color:C.dim, marginBottom:4, fontWeight:700, letterSpacing:"0.08em" }}>TO</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:"0.82rem", outline:"none" }} />
        </div>
        <div>
          <label style={{ display:"block", fontSize:"0.65rem", color:C.dim, marginBottom:4, fontWeight:700, letterSpacing:"0.08em" }}>STATUS</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:"0.82rem", outline:"none" }}>
            <option value="">All</option>
            {["RECEIVED","ADMITTED","DECLINED","PENDING","DUPLICATE"].map((s) => (
              <option key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display:"block", fontSize:"0.65rem", color:C.dim, marginBottom:4, fontWeight:700, letterSpacing:"0.08em" }}>REFERRED OUT TO</label>
          <select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:"0.82rem", outline:"none", minWidth:220 }}>
            <option value="">All</option>
            <option value="__MISSING__">Missing destination only</option>
            {destinationOptions.map((destination) => (
              <option key={destination} value={destination}>{destination}</option>
            ))}
          </select>
        </div>
        {(fromDate || toDate || status || destinationFilter) && (
          <button onClick={() => { setFromDate(""); setToDate(""); setStatus(""); setDestinationFilter(""); }}
            style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.muted, cursor:"pointer", fontSize:"0.8rem", fontWeight:600, marginTop:16 }}>
            Clear
          </button>
        )}
      </div>

      {/* Destination leaderboard */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
          Top Referred Out Destinations
        </div>
        {topDestinations.length === 0 ? (
          <div style={{ color:C.muted, fontSize:"0.82rem" }}>No discharge destinations captured yet.</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:8 }}>
            {topDestinations.map(([destination, count]) => (
              <div key={destination} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", display:"flex", justifyContent:"space-between", gap:10 }}>
                <span style={{ color:C.text, fontSize:"0.82rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{destination}</span>
                <span style={{ color:C.cyan, fontSize:"0.82rem", fontWeight:700 }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly trend */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
          Weekly Destination Trend (Last 8 Weeks)
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:8 }}>
          {weeklyDestinationTrends.map((week) => {
            const height = Math.max(8, Math.round((week.count / maxWeeklyTrend) * 56));
            const weekLabel = new Date(`${week.weekStart}T00:00:00.000Z`).toLocaleDateString("en-US", { month:"short", day:"numeric" });
            return (
              <div key={week.weekStart} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", marginBottom:6 }}>{weekLabel}</div>
                <div style={{ height:56, display:"flex", alignItems:"flex-end" }}>
                  <div style={{ width:"100%", height, borderRadius:6, background:"rgba(59,130,246,0.35)", border:"1px solid rgba(59,130,246,0.5)" }} />
                </div>
                <div style={{ color:C.cyan, fontSize:"0.8rem", fontWeight:700, marginTop:6 }}>{week.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync health and SLA alerts */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
            Sync Health
          </div>
          {syncHealth ? (
            <div style={{ display:"grid", gap:8 }}>
              {[
                { label: "Bedboard", entry: syncHealth.bedboard },
                { label: "Discharge", entry: syncHealth.discharge },
              ].map(({ label, entry }) => (
                <div key={label} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                    <span style={{ color:C.text, fontSize:"0.82rem", fontWeight:700 }}>{label}</span>
                    <span style={{ color: !entry ? C.muted : entry.status === "FAILED" || entry.stale ? "#f87171" : "#86efac", fontSize:"0.75rem", fontWeight:700 }}>
                      {!entry ? "No runs" : entry.status === "FAILED" ? "FAILED" : entry.stale ? "STALE" : "HEALTHY"}
                    </span>
                  </div>
                  <div style={{ color:C.muted, fontSize:"0.76rem" }}>
                    {!entry ? "No sync telemetry recorded yet." : `Last run ${new Date(entry.createdAt).toLocaleString()} · ${Math.floor(entry.ageHours)}h ago`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color:C.muted, fontSize:"0.82rem" }}>Loading sync health…</div>
          )}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
            SLA Alerts
          </div>
          <div style={{ display:"grid", gap:8 }}>
            {missingDestination > 0 && (
              <div style={{ border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.08)", borderRadius:8, padding:"8px 10px", color:"#fca5a5", fontSize:"0.78rem", fontWeight:600 }}>
                {missingDestination} discharged referral{missingDestination === 1 ? "" : "s"} missing destination.
              </div>
            )}
            {syncHealth?.bedboard?.stale && (
              <div style={{ border:"1px solid rgba(245,158,11,0.35)", background:"rgba(245,158,11,0.1)", borderRadius:8, padding:"8px 10px", color:"#fcd34d", fontSize:"0.78rem", fontWeight:600 }}>
                Bedboard sync is stale ({Math.floor(syncHealth.bedboard.ageHours)}h since last run).
              </div>
            )}
            {syncHealth?.discharge?.stale && (
              <div style={{ border:"1px solid rgba(245,158,11,0.35)", background:"rgba(245,158,11,0.1)", borderRadius:8, padding:"8px 10px", color:"#fcd34d", fontSize:"0.78rem", fontWeight:600 }}>
                Discharge sync is stale ({Math.floor(syncHealth.discharge.ageHours)}h since last run).
              </div>
            )}
            {!missingDestination && !syncHealth?.bedboard?.stale && !syncHealth?.discharge?.stale && (
              <div style={{ border:"1px solid rgba(16,185,129,0.35)", background:"rgba(16,185,129,0.1)", borderRadius:8, padding:"8px 10px", color:"#86efac", fontSize:"0.78rem", fontWeight:600 }}>
                All SLA checks are healthy.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Referring Source","Type","Patient","Service Line","Admitted","Discharged","Referred Out To","Encounter #","Status"].map((h) => (
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"0.65rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{ padding:"32px", textAlign:"center", color:C.muted }}>Loading…</td></tr>
              )}
              {!loading && filteredReferrals.length === 0 && (
                <tr><td colSpan={9} style={{ padding:"48px", textAlign:"center", color:C.muted }}>
                  No admissions referral records yet. Sync the daily bedboard (M365) or import from MedWorxs.
                </td></tr>
              )}
              {filteredReferrals.map((r) => (
                <tr key={r.id} style={{ borderBottom:`1px solid var(--nyx-accent-dim)`, background: isMissingDischargeDestination(r) ? "rgba(239,68,68,0.06)" : "transparent" }}>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ fontWeight:700, fontSize:"0.875rem", color:C.text }}>{r.referralSource.name}</div>
                    {r.referralSource.specialty && <div style={{ fontSize:"0.7rem", color:C.muted }}>{r.referralSource.specialty}</div>}
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-mid)`, borderRadius:999, padding:"2px 8px", fontSize:"0.65rem", fontWeight:700, color:C.cyan }}>
                      {r.referralSource.type.replace("_"," ")}
                    </span>
                  </td>
                  <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{r.patientInitials ?? "-"}</td>
                  <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{r.serviceLine ?? "-"}</td>
                  <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted, whiteSpace:"nowrap" }}>{fmt(r.admissionDate)}</td>
                  <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted, whiteSpace:"nowrap" }}>{fmt(r.dischargeDate)}</td>
                  <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>
                    {r.dischargeDestination ?? (isMissingDischargeDestination(r) ? "Missing" : "-")}
                  </td>
                  <td style={{ padding:"12px 14px", fontSize:"0.75rem", color:C.dim, fontFamily:"monospace" }}>{r.externalId ?? "-"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ background: STATUS_COLORS[r.status] ?? "transparent", borderRadius:999, padding:"3px 10px", fontSize:"0.65rem", fontWeight:700, color: STATUS_TEXT[r.status] ?? C.muted, letterSpacing:"0.08em" }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
