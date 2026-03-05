"use client";

import { useState } from "react";

const C = {
  cyan: "var(--nyx-accent)", blue: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  dim: "var(--nyx-text-muted)", card: "var(--nyx-card)",
  border: "var(--nyx-border)", borderHover:"var(--nyx-accent-str)",
  emerald:"#10b981", amber:"#f59e0b", red:"#f87171",
};

const DEFAULT_MAPPING = {
  referringProvider : "Referring Physician",
  referringNpi      : "Referring NPI",
  admissionDate     : "Admit Date",
  dischargeDate     : "Discharge Date",
  serviceLine       : "Department",
  patientInitials   : "Patient",
  externalId        : "Encounter #",
};

type ImportResult = {
  importId: string; totalRows: number; imported: number;
  skipped: number; errors: number; errorLog: string[];
};

const TABS = ["CSV Import", "HL7 / ADT Setup", "About MedWorxs"] as const;
type Tab = typeof TABS[number];

export default function MedworxsIntegrationPage() {
  const [tab, setTab]         = useState<Tab>("CSV Import");
  const [file, setFile]       = useState<File | null>(null);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [hl7Secret, setHl7Secret]     = useState("");
  const [savingSecret, setSavingSecret] = useState(false);
  const [secretSaved,  setSecretSaved]  = useState(false);

  // Drag-and-drop
  const [dragging, setDragging] = useState(false);
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
      const res = await fetch("/api/integrations/medworxs/csv", { method:"POST", body: fd });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setImportError(data.error ?? "Import failed");
    } catch {
      setImportError("Network error - please try again");
    }
    setImporting(false);
  };

  const handleSaveSecret = async () => {
    setSavingSecret(true); setSecretSaved(false);
    const res = await fetch("/api/integrations/medworxs/hl7/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: hl7Secret }),
    });
    if (res.ok) setSecretSaved(true);
    setSavingSecret(false);
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/integrations/medworxs/hl7`
    : "/api/integrations/medworxs/hl7";

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:28, flexWrap:"wrap" }}>
        <div style={{ width:52, height:52, borderRadius:12, background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-str)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <h1 style={{ fontSize:"1.6rem", fontWeight:900, color:C.text }}>MedWorxs</h1>
            <span style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:999, padding:"3px 10px", fontSize:"0.65rem", fontWeight:800, color:C.amber, letterSpacing:"0.1em" }}>SETUP REQUIRED</span>
          </div>
          <p style={{ color:C.muted, fontSize:"0.875rem", marginTop:4 }}>
            Import patient referrals from MedWorxs via CSV export or real-time HL7 ADT feed.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${C.border}`, marginBottom:28 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background:"none", border:"none", padding:"10px 18px", fontSize:"0.82rem", fontWeight:700, color: tab===t ? C.cyan : C.muted, cursor:"pointer", borderBottom: tab===t ? `2px solid ${C.cyan}` : "2px solid transparent", marginBottom:-1, transition:"color 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── CSV IMPORT TAB ─── */}
      {tab === "CSV Import" && (
        <div style={{ maxWidth:680 }}>
          <p style={{ color:C.muted, fontSize:"0.875rem", lineHeight:1.7, marginBottom:24 }}>
            Export an admissions or census report from MedWorxs (Stat! or Evolution), then upload it here.
            NyxAegis will match referring providers to your referral source directory and log each referral.
          </p>

          {/* Column mapping */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
            <h3 style={{ fontSize:"0.82rem", fontWeight:800, color:C.text, marginBottom:4 }}>Column Mapping</h3>
            <p style={{ fontSize:"0.77rem", color:C.muted, marginBottom:16 }}>
              Enter the exact column headers from your MedWorxs CSV. Leave blank to skip that field.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { key:"referringProvider", label:"Referring Provider *" },
                { key:"referringNpi",      label:"Referring NPI" },
                { key:"admissionDate",     label:"Admission Date" },
                { key:"dischargeDate",     label:"Discharge Date" },
                { key:"serviceLine",       label:"Service / Department" },
                { key:"patientInitials",   label:"Patient (for initials)" },
                { key:"externalId",        label:"Encounter # (dedup key)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display:"block", fontSize:"0.65rem", fontWeight:700, color:C.dim, marginBottom:4, letterSpacing:"0.08em" }}>{label}</label>
                  <input
                    value={(mapping as Record<string, string>)[key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                    style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 10px", color:C.text, fontSize:"0.8rem", outline:"none", boxSizing:"border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* File drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("csv-file-input")?.click()}
            style={{ border:`2px dashed ${dragging ? C.cyan : C.borderHover}`, borderRadius:12, padding:"36px 24px", textAlign:"center", cursor:"pointer", background: dragging ? "var(--nyx-accent-dim)" : "transparent", transition:"border-color 0.2s, background 0.2s", marginBottom:20 }}>
            <input id="csv-file-input" type="file" accept=".csv" style={{ display:"none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragging ? C.cyan : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 12px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {file ? (
              <p style={{ color:C.cyan, fontWeight:700, fontSize:"0.9rem" }}>{file.name}</p>
            ) : (
              <>
                <p style={{ color:C.text, fontWeight:700, fontSize:"0.9rem", marginBottom:4 }}>Drop your CSV here or click to browse</p>
                <p style={{ color:C.muted, fontSize:"0.78rem" }}>Accepts .csv files exported from MedWorxs Stat! or Evolution</p>
              </>
            )}
          </div>

          {importError && (
            <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"12px 16px", color:C.red, fontSize:"0.82rem", marginBottom:16 }}>
              {importError}
            </div>
          )}

          <button onClick={handleImport} disabled={!file || importing}
            style={{ background:`linear-gradient(135deg,${C.cyan},${C.blue})`, color:"#000", border:"none", borderRadius:8, padding:"12px 28px", fontWeight:800, fontSize:"0.9rem", cursor: !file || importing ? "not-allowed" : "pointer", opacity: !file || importing ? 0.6 : 1 }}>
            {importing ? "Importing…" : "Run Import"}
          </button>

          {/* Result */}
          {result && (
            <div style={{ background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:12, padding:20, marginTop:20 }}>
              <h3 style={{ fontSize:"0.9rem", fontWeight:800, color:C.emerald, marginBottom:12 }}>Import Complete</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom: result.errorLog?.length ? 16 : 0 }}>
                {[
                  { label:"Total Rows",  value:result.totalRows, color:C.text },
                  { label:"Imported",    value:result.imported,  color:C.emerald },
                  { label:"Skipped (dup)",value:result.skipped, color:C.amber },
                  { label:"Errors",      value:result.errors,   color: result.errors > 0 ? C.red : C.muted },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"1.6rem", fontWeight:900, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:"0.65rem", color:C.muted, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {result.errorLog?.length > 0 && (
                <details style={{ marginTop:4 }}>
                  <summary style={{ fontSize:"0.78rem", color:C.amber, cursor:"pointer", fontWeight:600 }}>View {result.errorLog.length} error{result.errorLog.length!==1?"s":""}</summary>
                  <ul style={{ margin:"8px 0 0", padding:"0 0 0 16px", fontSize:"0.75rem", color:C.muted, lineHeight:1.8 }}>
                    {result.errorLog.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── HL7 / ADT SETUP TAB ─── */}
      {tab === "HL7 / ADT Setup" && (
        <div style={{ maxWidth:680 }}>
          <div style={{ background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:10, padding:"14px 18px", marginBottom:24, fontSize:"0.82rem", color:C.amber, lineHeight:1.7 }}>
            <strong>Requires hospital IT coordination.</strong> Your MedWorxs administrator or IT team must configure the system to send outbound HL7 ADT^A01 messages to the endpoint below. Contact MedWorxs at{" "}
            <a href="tel:866-539-0874" style={{ color:C.amber }}>866-539-0874</a> or{" "}
            <a href="mailto:info@medworxs.com" style={{ color:C.amber }}>info@medworxs.com</a>.
          </div>

          {/* Webhook endpoint */}
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:"0.72rem", fontWeight:700, color:C.muted, marginBottom:8, letterSpacing:"0.08em" }}>WEBHOOK ENDPOINT URL</label>
            <div style={{ display:"flex", gap:8 }}>
              <input readOnly value={webhookUrl}
                style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.cyan, fontSize:"0.82rem", outline:"none", fontFamily:"monospace" }} />
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)}
                style={{ background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-str)`, borderRadius:8, padding:"10px 16px", color:C.cyan, cursor:"pointer", fontWeight:700, fontSize:"0.8rem" }}>
                Copy
              </button>
            </div>
            <p style={{ fontSize:"0.72rem", color:C.dim, marginTop:6 }}>
              Tell MedWorxs to POST raw HL7 v2 ADT^A01 messages to this URL as <code style={{ color:C.muted }}>Content-Type: text/plain</code>.
            </p>
          </div>

          {/* Shared secret */}
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:"0.72rem", fontWeight:700, color:C.muted, marginBottom:8, letterSpacing:"0.08em" }}>SHARED SECRET (optional)</label>
            <div style={{ display:"flex", gap:8 }}>
              <input
                type="text" value={hl7Secret} onChange={(e) => setHl7Secret(e.target.value)}
                placeholder="Generate a random string and share it with MedWorxs IT"
                style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:"0.82rem", outline:"none" }}
              />
              <button onClick={handleSaveSecret} disabled={savingSecret}
                style={{ background:`linear-gradient(135deg,${C.cyan},${C.blue})`, color:"#000", border:"none", borderRadius:8, padding:"10px 18px", fontWeight:800, fontSize:"0.82rem", cursor:"pointer", opacity: savingSecret ? 0.7 : 1 }}>
                {savingSecret ? "Saving…" : secretSaved ? "Saved ✓" : "Save"}
              </button>
            </div>
            <p style={{ fontSize:"0.72rem", color:C.dim, marginTop:6 }}>
              MedWorxs sends this value in the <code style={{ color:C.muted }}>X-HL7-Secret</code> header. NyxAegis rejects messages without a matching secret.
            </p>
          </div>

          {/* What we parse */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <h3 style={{ fontSize:"0.85rem", fontWeight:800, color:C.text, marginBottom:14 }}>What NyxAegis extracts from each ADT^A01</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { seg:"PV1-8",  label:"Referring Provider",  desc:"Name and NPI of referring physician" },
                { seg:"PV1-10", label:"Hospital Service",    desc:"Service/department (service line)" },
                { seg:"PV1-44", label:"Admit Date/Time",     desc:"Patient admission timestamp" },
                { seg:"PID-3",  label:"Patient ID",          desc:"Used as deduplication key" },
                { seg:"PID-5",  label:"Patient Name",        desc:"Converted to initials only" },
              ].map((item) => (
                <div key={item.seg} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-mid)`, borderRadius:6, padding:"2px 8px", fontFamily:"monospace", fontSize:"0.7rem", color:C.cyan, flexShrink:0, marginTop:1 }}>{item.seg}</span>
                  <div>
                    <div style={{ fontSize:"0.8rem", fontWeight:700, color:C.text }}>{item.label}</div>
                    <div style={{ fontSize:"0.72rem", color:C.muted }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop:20, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <h3 style={{ fontSize:"0.85rem", fontWeight:800, color:C.text, marginBottom:12 }}>Example ADT^A01 Message</h3>
            <pre style={{ fontSize:"0.68rem", color:C.muted, overflowX:"auto", margin:0, lineHeight:1.8, fontFamily:"monospace" }}>{`MSH|^~\\&|MEDWORXS|HOSPITAL|NYXAEGIS|NYXAEGIS|20260304120000||ADT^A01^ADT_A01|12345|P|2.5.1
EVN|A01|20260304120000
PID|1||PID-98765^^^MedWorxs^MR||Smith^John||19600101|M
PV1|1|I|ICU^101^A|3|||1234567890^Mitchell^Sarah^A^^^&NPI&ISO^NPI|1234567890^Mitchell^Sarah^A|||CARD|||||1|||||||||||||||||20260304120000`}</pre>
          </div>
        </div>
      )}

      {/* ─── ABOUT TAB ─── */}
      {tab === "About MedWorxs" && (
        <div style={{ maxWidth:620 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24, marginBottom:16 }}>
            <h3 style={{ fontSize:"1rem", fontWeight:800, color:C.text, marginBottom:12 }}>What is MedWorxs?</h3>
            <p style={{ fontSize:"0.875rem", color:C.muted, lineHeight:1.75 }}>
              MedWorxs (medworxs.com) is a cloud-based EHR and Practice Management platform for hospitals and ambulatory practices. Their <strong style={{ color:C.text }}>Stat!</strong> product serves inpatient/critical access hospitals, and <strong style={{ color:C.text }}>Evolution</strong> serves ambulatory settings. Both are Meaningful Use Stage 2 certified under the 21st Century Cures Act.
            </p>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24, marginBottom:16 }}>
            <h3 style={{ fontSize:"1rem", fontWeight:800, color:C.text, marginBottom:12 }}>Integration Methods</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { method:"CSV Import", status:"Available now", color:C.emerald, desc:"Export an admissions report from MedWorxs and upload it here. Works with any version." },
                { method:"HL7 v2 ADT Feed", status:"Requires IT setup", color:C.amber, desc:"Real-time: MedWorxs sends an ADT^A01 message every time a patient is admitted. Requires MedWorxs IT to configure outbound HL7 interface." },
                { method:"FHIR R4 API", status:"Coming soon", color:C.muted, desc:"Direct FHIR Encounter queries. Availability depends on MedWorxs version. Contact them to confirm." },
              ].map((m) => (
                <div key={m.method} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:m.color, flexShrink:0, marginTop:5 }} />
                  <div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:"0.85rem", fontWeight:700, color:C.text }}>{m.method}</span>
                      <span style={{ fontSize:"0.65rem", color:m.color, fontWeight:600 }}>{m.status}</span>
                    </div>
                    <p style={{ fontSize:"0.78rem", color:C.muted, lineHeight:1.6, marginTop:2 }}>{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-mid)`, borderRadius:12, padding:20 }}>
            <p style={{ fontSize:"0.82rem", color:C.muted, lineHeight:1.7 }}>
              <strong style={{ color:C.cyan }}>MedWorxs contact:</strong>{" "}
              <a href="tel:866-539-0874" style={{ color:C.cyan }}>866-539-0874</a>
              {" "}·{" "}
              <a href="mailto:info@medworxs.com" style={{ color:C.cyan }}>info@medworxs.com</a>
              <br />
              Ask for the <strong>Director of Software Development (Kirby Hellegaard)</strong> to discuss enabling outbound HL7 interfaces or FHIR endpoint access.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
