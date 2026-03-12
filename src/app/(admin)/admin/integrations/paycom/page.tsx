"use client";

import { useState } from "react";

const C = {
  cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  card: "var(--nyx-card)", border: "var(--nyx-border)", borderHover: "var(--nyx-accent-str)",
  purple: "#a78bfa", emerald: "#10b981", amber: "#f59e0b", red: "#f87171",
};

const inp = { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: "0.82rem", outline: "none", boxSizing: "border-box" as const };

const DEFAULT_MAPPING = {
  employeeName:   "Employee Name",
  employeeId:     "Employee ID",
  email:          "Work Email",
  phone:          "Work Phone",
  title:          "Job Title",
  department:     "Department",
  payDate:        "Check Date",
  grossPay:       "Gross Pay",
  netPay:         "Net Pay",
  commissionAmt:  "Commission Amount",
};

type ImportResult = {
  importId?: string; totalRows: number; imported: number;
  updated: number; skipped: number; errors: number; errorLog: string[];
};

const TABS = ["CSV Import", "API / Webhook", "About Paycom"] as const;
type Tab = typeof TABS[number];

export default function PaycomIntegrationPage() {
  const [tab, setTab]               = useState<Tab>("CSV Import");
  const [importMode, setImportMode] = useState<"reps" | "payments">("reps");
  const [file, setFile]             = useState<File | null>(null);
  const [mapping, setMapping]       = useState(DEFAULT_MAPPING);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [apiKey, setApiKey]         = useState("");
  const [savingKey, setSavingKey]   = useState(false);
  const [keySaved, setKeySaved]     = useState(false);
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
    fd.append("mode", importMode);
    fd.append("mapping", JSON.stringify(mapping));
    try {
      const res = await fetch("/api/integrations/paycom", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setImportError(data.error ?? "Import failed");
    } catch {
      setImportError("Network error. Please try again");
    }
    setImporting(false);
  };

  const handleSaveKey = async () => {
    setSavingKey(true); setKeySaved(false);
    const res = await fetch("/api/integrations/paycom/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    if (res.ok) setKeySaved(true);
    setSavingKey(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            <line x1="6" y1="15" x2="10" y2="15"/>
          </svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: C.text }}>Paycom</h1>
            <span style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.amber, letterSpacing: "0.1em" }}>SETUP REQUIRED</span>
            <span style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.purple, letterSpacing: "0.1em" }}>HR / PAYROLL</span>
          </div>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>
            Sync your BD rep roster and commission payments from Paycom payroll exports.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: "none", border: "none", padding: "10px 18px", fontSize: "0.82rem", fontWeight: 700, color: tab === t ? C.purple : C.muted, cursor: "pointer", borderBottom: tab === t ? `2px solid ${C.purple}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── CSV IMPORT TAB ─── */}
      {tab === "CSV Import" && (
        <div style={{ maxWidth: 680 }}>
          <p style={{ color: C.muted, fontSize: "0.875rem", lineHeight: 1.7, marginBottom: 20 }}>
            Export a <strong style={{ color: C.text }}>Employee Summary</strong> or <strong style={{ color: C.text }}>Payroll Register</strong> report from Paycom, then upload it here. NyxAegis will update your rep roster and log commission payments.
          </p>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["reps", "payments"] as const).map((m) => (
              <button key={m} onClick={() => { setImportMode(m); setResult(null); setImportError(""); }}
                style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${importMode === m ? C.purple : C.border}`, background: importMode === m ? "rgba(167,139,250,0.1)" : "transparent", color: importMode === m ? C.purple : C.muted, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                {m === "reps" ? "👤 Rep Roster" : "💰 Commission Payments"}
              </button>
            ))}
          </div>

          {/* Column mapping */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: C.text, marginBottom: 4 }}>Column Mapping</h3>
            <p style={{ fontSize: "0.77rem", color: C.muted, marginBottom: 16 }}>
              Enter the exact column headers from your Paycom export. Leave blank to skip a field.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(importMode === "reps" ? [
                { key: "employeeName",  label: "Employee Name *" },
                { key: "employeeId",    label: "Employee ID" },
                { key: "email",         label: "Work Email *" },
                { key: "phone",         label: "Work Phone" },
                { key: "title",         label: "Job Title" },
                { key: "department",    label: "Department" },
              ] : [
                { key: "employeeName",  label: "Employee Name *" },
                { key: "email",         label: "Work Email" },
                { key: "payDate",       label: "Check / Pay Date *" },
                { key: "grossPay",      label: "Gross Pay" },
                { key: "netPay",        label: "Net Pay" },
                { key: "commissionAmt", label: "Commission Amount" },
              ]).map(({ key, label }) => (
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
            onClick={() => document.getElementById("paycom-csv")?.click()}
            style={{ border: `2px dashed ${dragging ? C.purple : C.borderHover}`, borderRadius: 12, padding: "36px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(167,139,250,0.05)" : "transparent", transition: "all 0.2s", marginBottom: 20 }}>
            <input id="paycom-csv" type="file" accept=".csv" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragging ? C.purple : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {file ? (
              <p style={{ color: C.purple, fontWeight: 700, fontSize: "0.9rem" }}>{file.name}</p>
            ) : (
              <>
                <p style={{ color: C.text, fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>Drop your Paycom CSV here or click to browse</p>
                <p style={{ color: C.muted, fontSize: "0.78rem" }}>Export from Paycom → Reports → {importMode === "reps" ? "Employee Summary" : "Payroll Register"}</p>
              </>
            )}
          </div>

          {importError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", color: C.red, fontSize: "0.82rem", marginBottom: 16 }}>
              {importError}
            </div>
          )}

          <button onClick={handleImport} disabled={!file || importing}
            style={{ background: `linear-gradient(135deg,${C.purple},#7c3aed)`, color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 800, fontSize: "0.9rem", cursor: !file || importing ? "not-allowed" : "pointer", opacity: !file || importing ? 0.6 : 1 }}>
            {importing ? "Importing…" : "Run Import"}
          </button>

          {result && (
            <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 20, marginTop: 20 }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: C.emerald, marginBottom: 12 }}>Import Complete</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: result.errorLog?.length ? 16 : 0 }}>
                {[
                  { label: "Total Rows", value: result.totalRows, color: C.text },
                  { label: "Imported",   value: result.imported,  color: C.emerald },
                  { label: "Updated",    value: result.updated,   color: C.amber },
                  { label: "Errors",     value: result.errors,    color: result.errors > 0 ? C.red : C.muted },
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

      {/* ─── API / WEBHOOK TAB ─── */}
      {tab === "API / Webhook" && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: "0.82rem", color: C.purple, lineHeight: 1.7 }}>
            <strong>Requires Paycom admin access.</strong> Contact your Paycom account manager to enable API access. Paycom&apos;s BETI® payroll API can push payroll events to NyxAegis automatically after each payroll cycle.
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: "0.08em" }}>PAYCOM API KEY</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Paycom API client_secret here"
                style={{ ...inp, flex: 1 }} />
              <button onClick={handleSaveKey} disabled={savingKey || !apiKey}
                style={{ background: `linear-gradient(135deg,${C.purple},#7c3aed)`, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 800, fontSize: "0.82rem", cursor: !apiKey || savingKey ? "not-allowed" : "pointer", opacity: !apiKey ? 0.5 : 1 }}>
                {savingKey ? "Saving…" : keySaved ? "Saved ✓" : "Save"}
              </button>
            </div>
            <p style={{ fontSize: "0.72rem", color: C.muted, marginTop: 6 }}>
              Your key is encrypted at rest and never exposed in the client.
            </p>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>How it works</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { step: "1", text: "Paycom processes your payroll cycle (BETI® or manual)" },
                { step: "2", text: "Paycom pushes a payroll-complete event to NyxAegis via webhook" },
                { step: "3", text: "NyxAegis fetches updated employee and commission records via API" },
                { step: "4", text: "Rep profiles and RepPayment records are upserted automatically" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: C.purple, flexShrink: 0 }}>{s.step}</span>
                  <span style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ABOUT TAB ─── */}
      {tab === "About Paycom" && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>What is Paycom?</h3>
            <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.75 }}>
              Paycom (paycom.com) is a cloud-based HR and payroll platform used by thousands of healthcare organizations. The NyxAegis integration keeps your BD rep roster in sync with HR records and automatically logs commission payments after each payroll cycle.
            </p>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>What gets synced</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "👤", label: "Rep Profiles", desc: "Name, title, email, phone, department" },
                { icon: "💰", label: "Commission Payments", desc: "Gross pay, net pay, commission amounts" },
                { icon: "📅", label: "Pay Dates", desc: "Mapped to RepPayment records with paidAt date" },
                { icon: "🔄", label: "Bidirectional Updates", desc: "Changes in Paycom flow to NyxAegis" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, background: "rgba(167,139,250,0.04)", borderRadius: 8 }}>
                  <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.text }}>{item.label}</div>
                    <div style={{ fontSize: "0.72rem", color: C.muted }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
