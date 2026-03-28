"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-border)";
const ACCENT = "var(--nyx-accent)";

const SP_HOST    = "destinyspringshpt.sharepoint.com";
const SP_SITE    = "sites/Intake";
const SP_FILE_ID = "0dec3106-c845-4eb7-b01c-c64a86da0796";

type SyncResult = {
  worksheet?: string;
  totalRows?: number;
  imported:   number;
  skipped:    number;
  errors:     number;
  errorLog?:  { row: number; error: string }[];
  error?:     string;
};

export default function M365IntakeIntegrationPage() {
  const [syncing, setSyncing]     = useState(false);
  const [result, setResult]       = useState<SyncResult | null>(null);
  const [lastSync, setLastSync]   = useState<string | null>(null);
  const [_connected, setConnected] = useState<string | null>(null);

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
      const res  = await fetch("/api/referrals/intake/m365/sync", { method: "POST" });
      const data = (await res.json()) as SyncResult;
      setResult(data);
      if (!data.error) setLastSync(new Date().toLocaleString());
    } catch {
      setResult({ imported: 0, skipped: 0, errors: 1, error: "Network error — could not reach sync endpoint" });
    } finally {
      setSyncing(false);
    }
  }

  const resultBg    = result?.error ? "rgba(239,68,68,0.08)"  : "rgba(34,197,94,0.08)";
  const resultBorder= result?.error ? "rgba(239,68,68,0.3)"   : "rgba(34,197,94,0.3)";
  const resultColor = result?.error ? "#fca5a5"               : "#86efac";

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/integrations" style={{ fontSize: "0.8rem", color: MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          ← Back to Integrations
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.45rem" }}>
            🧾
          </div>
          <div>
            <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>INTEGRATION</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Microsoft 365 Admissions Referrals Sync</h1>
          </div>
        </div>
        <p style={{ color: MUTED, fontSize: "0.9rem", maxWidth: 780, lineHeight: 1.6 }}>
          Directly reads the Destiny Springs daily bedboard spreadsheet from SharePoint via Microsoft Graph API.
          New rows are imported as admissions referral records. Duplicates are automatically skipped.
        </p>
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
            <span style={{ color: ACCENT, fontWeight: 600, minWidth: 80 }}>File ID</span>
            <span style={{ fontFamily: "monospace", color: TEXT }}>{SP_FILE_ID}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: ACCENT, fontWeight: 600, minWidth: 80 }}>Access</span>
            <span>Uses the Microsoft 365 account connected under Admin → Communications</span>
          </div>
        </div>
        <p style={{ fontSize: "0.75rem", color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
          To update the target file, set <code style={{ color: ACCENT }}>SHAREPOINT_INTAKE_FILE_ID</code> in your environment variables.
        </p>
      </div>

      {/* ── Sync Now ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 4 }}>Sync Now</h2>
            {lastSync && (
              <p style={{ fontSize: "0.75rem", color: MUTED }}>Last synced: {lastSync}</p>
            )}
          </div>
          <button
            onClick={runSync}
            disabled={syncing}
            style={{
              padding: "9px 22px",
              borderRadius: 8,
              border: "none",
              background: syncing ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.85)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: syncing ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {syncing ? "Syncing…" : "Sync Daily Bedboard"}
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
                  Imported: <strong>{result.imported}</strong> &nbsp;|&nbsp;
                  Skipped (dupes): <strong>{result.skipped}</strong>
                  {result.errors > 0 && <span style={{ color: "#fca5a5" }}> &nbsp;|&nbsp; Errors: <strong>{result.errors}</strong></span>}
                </p>
                {result.errorLog && result.errorLog.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.75rem", color: "#fca5a5" }}>
                    {result.errorLog.map((e) => (
                      <li key={e.row}>Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
          Requires Microsoft 365 to be connected. If you see a &quot;No Microsoft 365 connection&quot; error,
          go to <strong>Admin → Communications → Connect Microsoft</strong> and re-authorize.
          This will also pick up the new SharePoint read permissions.
        </p>
      </div>

      {/* ── Column mapping ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 12 }}>Column Mapping</h2>
        <p style={{ fontSize: "0.82rem", color: MUTED, marginBottom: 10 }}>
          The first row of the spreadsheet is treated as headers. Recognized column names (case-insensitive):
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: "0.78rem" }}>
          {[
            ["Patient / Initials / Patient Name", "Patient initials (PHI-safe)"],
            ["Facility / Source / Referring Facility", "Referral source name"],
            ["NPI / Facility NPI", "Source NPI for dedup"],
            ["Admit Date / DOA / Date", "Admission date"],
            ["Discharge / D/C Date", "Discharge date"],
            ["Program / Service Line / LOC", "Service line"],
            ["Status / Admission Status", "Referral status"],
            ["Notes / Comments", "Notes"],
            ["ID / Record ID / Patient ID", "External ID for dedup"],
          ].map(([col, desc]) => (
            <div key={col} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: ACCENT, fontFamily: "monospace", fontSize: "0.75rem", flex: "0 0 220px" }}>{col}</span>
              <span style={{ color: MUTED }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What syncs ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 }}>
        <h2 style={{ fontSize: "0.98rem", color: TEXT, fontWeight: 800, marginBottom: 12 }}>What Syncs</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: MUTED, fontSize: "0.82rem", lineHeight: 1.8 }}>
          <li>Admission context: patient initials, admission date, service line</li>
          <li>Admissions referral attribution: facility/source name and/or NPI matched to a Referral Source record</li>
          <li>New sources auto-created if no match found by NPI or name</li>
          <li>Deduplication: Record ID match first, then initials + source + same-day fallback</li>
          <li>No existing records are modified or deleted</li>
          <li>Monday.com BD pipeline is unaffected — this sync only populates the Referrals view</li>
        </ul>
      </div>
    </div>
  );
}
