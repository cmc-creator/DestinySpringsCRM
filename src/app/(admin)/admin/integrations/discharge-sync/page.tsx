"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-border)";
const ACCENT = "var(--nyx-accent)";

const SP_HOST    = "destinyspringshpt.sharepoint.com";
const SP_SITE    = "sites/Discharge";
const SP_FILE_ID = "154A42D6-CC08-45B6-8AF5-EBCB1029E635";

type SyncResult = {
  worksheet?: string;
  totalRows?: number;
  updated:    number;
  created:    number;
  skipped:    number;
  errors:     number;
  errorLog?:  { row: number; error: string }[];
  error?:     string;
};

export default function DischargeSyncPage() {
  const [syncing, setSyncing]   = useState(false);
  const [result, setResult]     = useState<SyncResult | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connected, setConnected] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "microsoft") {
      setConnected("Microsoft 365 connected — you can now sync.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function runSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res  = await fetch("/api/referrals/discharge/sync", { method: "POST" });
      const data = (await res.json()) as SyncResult;
      setResult(data);
      if (!data.error) setLastSync(new Date().toLocaleString());
    } catch {
      setResult({ updated: 0, created: 0, skipped: 0, errors: 1, error: "Network error — could not reach sync endpoint" });
    } finally {
      setSyncing(false);
    }
  }

  const resultBg     = result?.error ? "rgba(239,68,68,0.08)"  : "rgba(34,197,94,0.08)";
  const resultBorder = result?.error ? "rgba(239,68,68,0.3)"   : "rgba(34,197,94,0.3)";
  const resultColor  = result?.error ? "#fca5a5"               : "#86efac";

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/integrations" style={{ fontSize: "0.8rem", color: MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          ← Back to Integrations
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.45rem" }}>
            🏥
          </div>
          <div>
            <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>INTEGRATION</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Microsoft 365 Discharge Sync</h1>
          </div>
        </div>
        <p style={{ color: MUTED, fontSize: "0.9rem", maxWidth: 780, lineHeight: 1.6 }}>
          Reads the Discharge List spreadsheet directly from SharePoint. Matches patients to existing intake records
          and updates discharge dates — or creates new referral records for any unmatched rows.
        </p>
      </div>

      {/* ── Microsoft 365 connection ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 4 }}>Microsoft 365 Authorization</h2>
            <p style={{ fontSize: "0.8rem", color: MUTED, maxWidth: 560 }}>
              Both this sync and the Admissions Referrals sync share the same Microsoft 365 account.
              Connect once and both will work. You&apos;ll need to re-authorize if permissions were recently updated.
            </p>
          </div>
          <a
            href="/api/integrations/oauth/microsoft?returnTo=/admin/integrations/discharge-sync"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 8, textDecoration: "none",
              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)",
              color: "#93c5fd", fontWeight: 700, fontSize: "0.82rem", whiteSpace: "nowrap",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="9" height="9"/><rect x="13" y="2" width="9" height="9"/>
              <rect x="2" y="13" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/>
            </svg>
            Connect / Re-authorize Microsoft 365
          </a>
        </div>
        {connected && (
          <div style={{ marginTop: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: "0.8rem", color: "#86efac" }}>
            {connected}
          </div>
        )}
      </div>

      {/* ── Configured file ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 14 }}>Connected Spreadsheet</h2>
        <div style={{ display: "grid", gap: 8, fontSize: "0.82rem", color: MUTED }}>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: ACCENT, fontWeight: 600, minWidth: 80 }}>Site</span>
            <span style={{ fontFamily: "monospace", color: TEXT }}>{SP_HOST}/{SP_SITE}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: ACCENT, fontWeight: 600, minWidth: 80 }}>File</span>
            <span style={{ fontFamily: "monospace", color: TEXT }}>Discharge List.xlsx ({SP_FILE_ID})</span>
          </div>
        </div>
        <p style={{ fontSize: "0.75rem", color: MUTED, marginTop: 12 }}>
          Override via <code style={{ color: ACCENT }}>SHAREPOINT_DISCHARGE_FILE_ID</code> environment variable.
        </p>
      </div>

      {/* ── Sync Now ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 4 }}>Sync Now</h2>
            {lastSync && <p style={{ fontSize: "0.75rem", color: MUTED }}>Last synced: {lastSync}</p>}
          </div>
          <button
            onClick={runSync}
            disabled={syncing}
            style={{
              padding: "9px 22px", borderRadius: 8, border: "none",
              background: syncing ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.8)",
              color: "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: syncing ? "not-allowed" : "pointer", transition: "background 0.15s",
            }}
          >
            {syncing ? "Syncing…" : "Sync Discharge List"}
          </button>
        </div>

        {result && (
          <div style={{ background: resultBg, border: `1px solid ${resultBorder}`, borderRadius: 10, padding: "12px 16px", fontSize: "0.82rem", color: resultColor }}>
            {result.error ? (
              <p style={{ margin: 0 }}>{result.error}</p>
            ) : (
              <>
                <p style={{ margin: "0 0 6px" }}>
                  Worksheet: <strong>{result.worksheet}</strong> &nbsp;|&nbsp;
                  Rows read: <strong>{result.totalRows}</strong> &nbsp;|&nbsp;
                  Updated: <strong>{result.updated}</strong> &nbsp;|&nbsp;
                  Created: <strong>{result.created}</strong> &nbsp;|&nbsp;
                  Skipped: <strong>{result.skipped}</strong>
                  {result.errors > 0 && <span style={{ color: "#fca5a5" }}> &nbsp;|&nbsp; Errors: <strong>{result.errors}</strong></span>}
                </p>
                {result.errorLog && result.errorLog.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.75rem", color: "#fca5a5" }}>
                    {result.errorLog.map((e) => <li key={e.row}>Row {e.row}: {e.error}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── How it works ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 12 }}>How It Works</h2>
        <ol style={{ margin: 0, paddingLeft: 18, color: MUTED, fontSize: "0.82rem", lineHeight: 1.9 }}>
          <li>Each row must have a discharge date — rows without one are skipped</li>
          <li>Matches existing referral records first by Record ID, then by patient initials + admission date</li>
          <li>If a match is found, updates the discharge date and referred-out destination on that record</li>
          <li>If no match, creates a new referral record with the discharge date set</li>
          <li>Duplicates (same source + initials + discharge day) are skipped</li>
          <li>No existing records are deleted</li>
        </ol>
      </div>

      {/* ── Column mapping ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 }}>
        <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 12 }}>Recognized Column Names</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: "0.78rem" }}>
          {[
            ["Patient / Initials / PT Initials", "Patient initials"],
            ["Discharge / Discharge Date / D/C Date / DOD", "Discharge date (required)"],
            ["Admit Date / DOA / Date Admitted", "Admission date (for matching)"],
            ["Facility / Source / Referring Facility", "Referral source"],
            ["NPI / Facility NPI", "Source NPI"],
            ["Program / Service Line / LOC", "Service line"],
            ["Referred Out To / Discharge Destination / Placement", "Where the patient was referred after discharge"],
            ["ID / Record ID / MRN / Patient ID", "External ID (best match key)"],
            ["Notes / Comments", "Notes"],
          ].map(([col, desc]) => (
            <div key={col} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: ACCENT, fontFamily: "monospace", fontSize: "0.75rem", flex: "0 0 260px" }}>{col}</span>
              <span style={{ color: MUTED }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
