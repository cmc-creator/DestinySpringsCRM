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
  dischargeDate?:string; serviceLine?:string; externalId?:string; createdAt:string;
  referralSource:{ id:string; name:string; type:string; specialty?:string };
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fromDate, setFromDate]   = useState("");
  const [toDate,   setToDate]     = useState("");
  const [status,   setStatus]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate)   params.set("to",   toDate);
    if (status)   params.set("status", status);
    const res = await fetch(`/api/referrals?${params.toString()}`);
    if (res.ok) setReferrals(await res.json());
    setLoading(false);
  }, [fromDate, toDate, status]);

  useEffect(() => { load(); }, [load]);

  const fmt = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  // Summary stats
  const total    = referrals.length;
  const admitted = referrals.filter((r) => r.status === "ADMITTED").length;
  const pending  = referrals.filter((r) => r.status === "PENDING" || r.status === "RECEIVED").length;

  // Group by source for quick summary
  const bySource: Record<string, number> = {};
  for (const r of referrals) {
    const key = r.referralSource.name;
    bySource[key] = (bySource[key] ?? 0) + 1;
  }
  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p style={{ color:C.cyan, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>Referral Tracking</p>
        <h1 style={{ fontSize:"1.8rem", fontWeight:900, color:C.text }}>Referrals Received</h1>
        <p style={{ color:C.muted, fontSize:"0.875rem", marginTop:4 }}>All patient referrals received from your tracked sources.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
        {[
          { label:"Total Referrals", value:total,    color:C.cyan },
          { label:"Admitted",        value:admitted, color:C.emerald },
          { label:"In Progress",     value:pending,  color:C.amber },
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
        {(fromDate || toDate || status) && (
          <button onClick={() => { setFromDate(""); setToDate(""); setStatus(""); }}
            style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.muted, cursor:"pointer", fontSize:"0.8rem", fontWeight:600, marginTop:16 }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Referring Source","Type","Patient","Service Line","Admitted","Discharged","Encounter #","Status"].map((h) => (
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"0.65rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ padding:"32px", textAlign:"center", color:C.muted }}>Loading…</td></tr>
              )}
              {!loading && referrals.length === 0 && (
                <tr><td colSpan={8} style={{ padding:"48px", textAlign:"center", color:C.muted }}>
                  No referrals yet. Import a MedWorxs CSV or configure the HL7 listener.
                </td></tr>
              )}
              {referrals.map((r) => (
                <tr key={r.id} style={{ borderBottom:`1px solid var(--nyx-accent-dim)` }}>
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
