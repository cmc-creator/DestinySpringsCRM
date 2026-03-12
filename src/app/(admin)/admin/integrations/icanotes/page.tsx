"use client";

import { useState } from "react";

const C = {
  cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  card: "var(--nyx-card)", border: "var(--nyx-border)", borderHover: "var(--nyx-accent-str)",
  green: "#34d399", emerald: "#10b981", amber: "#f59e0b", red: "#f87171",
};

const inp = { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: "0.82rem", outline: "none", boxSizing: "border-box" as const };

const DEFAULT_MAPPING = {
  referringProvider:   "Referring Provider",
  referringNpi:        "NPI",
  referralDate:        "Referral Date",
  serviceRequested:    "Service Requested",
  diagnosis:           "Primary Diagnosis",
  patientInitials:     "Patient Name",
  authNumber:          "Auth Number",
  externalId:          "Referral ID",
};

type ImportResult = {
  totalRows: number; imported: number; skipped: number; errors: number; errorLog: string[];
};

const TABS = ["CSV Import", "Webhook Setup", "About ICANotes"] as const;
type Tab = typeof TABS[number];

export default function ICANotesIntegrationPage() {
  const [tab, setTab]               = useState<Tab>("CSV Import");
  const [file, setFile]             = useState<File | null>(null);
  const [mapping, setMapping]       = useState(DEFAULT_MAPPING);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [savingSecret, setSavingSecret]   = useState(false);
  const [secretSaved, setSecretSaved]     = useState(false);
  const [dragging, setDragging]     = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".csv")) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true); setResult(null); setImportError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    try {
      const res = await fetch("/api/integrations/icanotes", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setImportError(data.error ?? "Import failed");
    } catch {
      setImportError("Network error. Please try again");
    }
    setImporting(false);
  };

  const handleSaveSecret = async () => {
    setSavingSecret(true); setSecretSaved(false);
    const res = await fetch("/api/integrations/icanotes/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: webhookSecret }),
    });
    if (res.ok) setSecretSaved(true);
    setSavingSecret(false);
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/integrations/icanotes/webhook`
    : "/api/integrations/icanotes/webhook";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/>
          </svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: C.text }}>ICANotes</h1>
            <span style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.amber, letterSpacing: "0.1em" }}>SETUP REQUIRED</span>
            <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.green, letterSpacing: "0.1em" }}>REFERRAL TRACKING</span>
          </div>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>
            Import behavioral health referrals from ICANotes via CSV export or real-time webhook.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: "none", border: "none", padding: "10px 18px", fontSize: "0.82rem", fontWeight: 700, color: tab === t ? C.green : C.muted, cursor: "pointer", borderBottom: tab === t ? `2px solid ${C.green}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── CSV IMPORT TAB ─── */}
      {tab === "CSV Import" && (
        <div style={{ maxWidth: 680 }}>
          <p style={{ color: C.muted, fontSize: "0.875rem", lineHeight: 1.7, marginBottom: 20 }}>
            Export a <strong style={{ color: C.text }}>Referral Report</strong> from ICANotes (Reports → Referrals), then upload it here.
            NyxAegis will match referring providers to your referral source directory and create lead records for each new referral.
          </p>

          {/* Column mapping */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: C.text, marginBottom: 4 }}>Column Mapping</h3>
            <p style={{ fontSize: "0.77rem", color: C.muted, marginBottom: 16 }}>
              Enter the exact column headers from your ICANotes CSV. Leave blank to skip a field.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { key: "referringProvider",  label: "Referring Provider *" },
                { key: "referringNpi",       label: "Referring NPI" },
                { key: "referralDate",       label: "Referral Date *" },
                { key: "serviceRequested",   label: "Service / Program" },
                { key: "diagnosis",          label: "Primary Diagnosis / ICD-10" },
                { key: "patientInitials",    label: "Patient Name (→ initials only)" },
                { key: "authNumber",         label: "Authorization Number" },
                { key: "externalId",         label: "Referral ID (dedup key)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.08em" }}>{label}</label>
                  <input value={(mapping as Record<string, string>)[key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                    style={inp} />
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("icanotes-csv")?.click()}
            style={{ border: `2px dashed ${dragging ? C.green : C.borderHover}`, borderRadius: 12, padding: "36px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(52,211,153,0.05)" : "transparent", transition: "all 0.2s", marginBottom: 20 }}>
            <input id="icanotes-csv" type="file" accept=".csv" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragging ? C.green : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {file ? (
              <p style={{ color: C.green, fontWeight: 700, fontSize: "0.9rem" }}>{file.name}</p>
            ) : (
              <>
                <p style={{ color: C.text, fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>Drop your ICANotes CSV here or click to browse</p>
                <p style={{ color: C.muted, fontSize: "0.78rem" }}>Export from ICANotes → Reports → Referrals → Export CSV</p>
              </>
            )}
          </div>

          {importError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", color: C.red, fontSize: "0.82rem", marginBottom: 16 }}>
              {importError}
            </div>
          )}

          <button onClick={handleImport} disabled={!file || importing}
            style={{ background: `linear-gradient(135deg,${C.green},${C.emerald})`, color: "#000", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 800, fontSize: "0.9rem", cursor: !file || importing ? "not-allowed" : "pointer", opacity: !file || importing ? 0.6 : 1 }}>
            {importing ? "Importing…" : "Run Import"}
          </button>

          {result && (
            <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 20, marginTop: 20 }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: C.emerald, marginBottom: 12 }}>Import Complete</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: result.errorLog?.length ? 16 : 0 }}>
                {[
                  { label: "Total Rows",   value: result.totalRows, color: C.text },
                  { label: "Imported",     value: result.imported,  color: C.emerald },
                  { label: "Skipped (dup)", value: result.skipped,  color: C.amber },
                  { label: "Errors",       value: result.errors,    color: result.errors > 0 ? C.red : C.muted },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {result.errorLog?.length > 0 && (
                <details>
                  <summary style={{ fontSize: "0.78rem", color: C.amber, cursor: "pointer", fontWeight: 600 }}>View {result.errorLog.length} error{result.errorLog.length !== 1 ? "s" : ""}</summary>
                  <ul style={{ margin: "8px 0 0", padding: "0 0 0 16px", fontSize: "0.75rem", color: C.muted, lineHeight: 1.8 }}>
                    {result.errorLog.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── WEBHOOK SETUP TAB ─── */}
      {tab === "Webhook Setup" && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: "0.82rem", color: C.amber, lineHeight: 1.7 }}>
            <strong>Requires ICANotes administrator access.</strong> Contact ICANotes support at{" "}
            <a href="mailto:support@icanotes.com" style={{ color: C.amber }}>support@icanotes.com</a>{" "}
            or <a href="tel:800-604-6556" style={{ color: C.amber }}>800-604-6556</a> to enable outbound webhook notifications for new admissions and referral events.
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: "0.08em" }}>WEBHOOK ENDPOINT URL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={webhookUrl}
                style={{ ...inp, flex: 1, color: C.green, fontFamily: "monospace" }} />
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)}
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "10px 16px", color: C.green, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                Copy
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: "0.08em" }}>SHARED SECRET</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Generate a random secret and share with ICANotes support"
                style={{ ...inp, flex: 1 }} />
              <button onClick={handleSaveSecret} disabled={savingSecret || !webhookSecret}
                style={{ background: `linear-gradient(135deg,${C.green},${C.emerald})`, color: "#000", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 800, fontSize: "0.82rem", cursor: !webhookSecret || savingSecret ? "not-allowed" : "pointer", opacity: !webhookSecret ? 0.5 : 1 }}>
                {savingSecret ? "Saving…" : secretSaved ? "Saved ✓" : "Save"}
              </button>
            </div>
            <p style={{ fontSize: "0.72rem", color: C.muted, marginTop: 6 }}>
              ICANotes sends this in the <code style={{ color: C.muted }}>X-ICANotes-Secret</code> header. NyxAegis rejects requests without a matching secret.
            </p>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: C.text, marginBottom: 14 }}>What NyxAegis extracts from each webhook event</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { field: "Referring Provider", desc: "Name/NPI of referring clinician → matched to referral source" },
                { field: "Service Requested",  desc: "Program or service type → mapped to service line" },
                { field: "Referral Date",       desc: "Date of referral → logged on lead record" },
                { field: "Diagnosis Code",      desc: "ICD-10 stored in notes for clinical context" },
                { field: "Auth Number",         desc: "Insurance auth # stored on lead record" },
                { field: "Patient ID",          desc: "Used as deduplication key (no PHI stored)" },
              ].map((item) => (
                <div key={item.field} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 6, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, color: C.green, flexShrink: 0, whiteSpace: "nowrap", marginTop: 1 }}>{item.field}</span>
                  <span style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ABOUT TAB ─── */}
      {tab === "About ICANotes" && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>What is ICANotes?</h3>
            <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.75 }}>
              ICANotes (icanotes.com) is a cloud-based EHR designed specifically for behavioral health organizations, including psychiatric hospitals, substance use treatment centers, and outpatient mental health practices. Its referral management module tracks outgoing and incoming referrals with authorization tracking.
            </p>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>HIPAA Compliance Note</h3>
            <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.75 }}>
              NyxAegis does not store patient names, dates of birth, or other PHI. Patient names from ICANotes are automatically converted to initials. All other fields stored are limited to referral metadata (provider NPI, service type, referral date) which are considered de-identified under HIPAA Safe Harbor guidelines when no direct identifiers are present.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
