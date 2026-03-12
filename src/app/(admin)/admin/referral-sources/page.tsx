"use client";

import { useEffect, useState, useRef } from "react";
import { ActivityFeedPanel } from "@/components/activities/ActivityFeedPanel";
import { ReferralFeedPanel } from "@/components/referrals/ReferralFeedPanel";

const C = {
  cyan: "var(--nyx-accent)",
  text: "var(--nyx-text)",
  muted: "var(--nyx-text-muted)",
  dim: "var(--nyx-text-muted)",
  card: "var(--nyx-card)",
  border: "var(--nyx-border)",
  emerald:"#10b981",
  amber: "#f59e0b",
  red:   "#f87171",
};

const SOURCE_TYPES = ["PHYSICIAN","SPECIALIST","SNF","REHAB_FACILITY","CARE_FACILITY","HOME_HEALTH","HOSPITAL","PRACTICE_GROUP","OTHER"] as const;

type Source = {
  id: string; name: string; type: string; specialty?: string; practiceName?: string;
  npi?: string; contactName?: string; phone?: string; city?: string; state?: string;
  monthlyGoal?: number; active: boolean;
  assignedRep?: { user: { name?: string } };
  _count: { referrals: number };
};

const LABEL: Record<string, string> = {
  PHYSICIAN:"Physician", SPECIALIST:"Specialist", SNF:"SNF",
  REHAB_FACILITY:"Rehab", CARE_FACILITY:"Care Facility",
  HOME_HEALTH:"Home Health", HOSPITAL:"Hospital",
  PRACTICE_GROUP:"Practice Group", OTHER:"Other",
};

const CSV_TEMPLATE_HEADERS = "source_npi,source_name,patient_initials,admission_date,discharge_date,service_line,external_id,status,notes";
const CSV_TEMPLATE_EXAMPLE = "1234567890,Dr. Jane Smith,J.D.,2026-01-15,2026-01-20,CARDIOLOGY,MRN-001,RECEIVED,Referred post cardiac cath";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/ /g, "_"));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim(); });
    return row;
  });
}

function downloadTemplate() {
  const content = [CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE].join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "referrals_import_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

type IntegrationConfig = {
  id: string; name: string; method: string; enabled: boolean;
  imports: { createdAt: string; imported: number; errors: number; method: string }[];
};

const empty = { name:"", type:"PHYSICIAN", specialty:"", practiceName:"", npi:"", contactName:"", email:"", phone:"", city:"", state:"", monthlyGoal:"", notes:"" };

export default function ReferralSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [activitySource, setActivitySource] = useState<Source | null>(null);
  const [referralSource, setReferralSource] = useState<Source | null>(null);

  // Import CSV state
  const [showImport, setShowImport]       = useState(false);
  const [csvRows, setCsvRows]             = useState<Record<string, string>[]>([]);
  const [csvFilename, setCsvFilename]     = useState("");
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState<{ imported: number; skipped: number; errors: number; errorLog: { row: number; error: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Integration status state
  const [integrations, setIntegrations]   = useState<IntegrationConfig[]>([]);
  const [showIntegrations, setShowIntegrations] = useState(false);

  const load = async () => {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/referral-sources${q}`);
    if (res.ok) setSources(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/integrations").then(r => r.ok ? r.json() : []).then(setIntegrations).catch(() => {});
  }, []);

  function handleCSVFile(file: File) {
    setCsvFilename(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setCsvRows(parseCSV(text));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvRows.length) return;
    setImporting(true); setImportResult(null);
    const rows = csvRows.map(r => ({
      sourceNpi:      r.source_npi      || undefined,
      sourceName:     r.source_name     || undefined,
      patientInitials:r.patient_initials|| undefined,
      admissionDate:  r.admission_date  || undefined,
      dischargeDate:  r.discharge_date  || undefined,
      serviceLine:    r.service_line    ? r.service_line.toUpperCase().replace(/ /g,"_") : undefined,
      externalId:     r.external_id     || undefined,
      status:         r.status          ? r.status.toUpperCase() : undefined,
      notes:          r.notes           || undefined,
    }));
    const res = await fetch("/api/referrals/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    if (result.imported > 0) load();
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/referral-sources", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, monthlyGoal: form.monthlyGoal ? Number(form.monthlyGoal) : undefined }),
    });
    if (res.ok) { setShowAdd(false); setForm(empty); load(); }
    else { const e = await res.json(); setError(e.error ?? "Failed to save"); }
    setSaving(false);
  };

  const attainment = (goal?: number, actual?: number) => {
    if (!goal || actual == null) return null;
    return Math.round((actual / goal) * 100);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <p style={{ color:C.cyan, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>Referral Tracking</p>
          <h1 style={{ fontSize:"1.8rem", fontWeight:900, color:C.text }}>Referral Sources</h1>
          <p style={{ color:C.muted, fontSize:"0.875rem", marginTop:4 }}>
            Track physicians, SNFs, and care facilities that refer patients to your organization.
          </p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button
            onClick={() => setShowIntegrations(v => !v)}
            style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 16px", fontWeight:700, fontSize:"0.82rem", cursor:"pointer", color:C.muted, display:"flex", alignItems:"center", gap:6 }}
          >
            ⚡ Integration Feed
            {integrations.some(i => i.enabled) && <span style={{ width:7, height:7, borderRadius:"50%", background:"#34d399", display:"inline-block" }} />}
          </button>
          <button
            onClick={() => { setShowImport(true); setCsvRows([]); setCsvFilename(""); setImportResult(null); }}
            style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 16px", fontWeight:700, fontSize:"0.82rem", cursor:"pointer", color:C.muted }}
          >
            ⬆ Import CSV
          </button>
          <button
            onClick={() => { setShowAdd(true); setError(""); setForm(empty); }}
            style={{ background:`var(--nyx-accent)`, color:"#000", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:800, fontSize:"0.85rem", cursor:"pointer" }}
          >
            + Add Source
          </button>
        </div>
      </div>

      {/* Integration Status Bar */}
      {showIntegrations && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:"0.7rem", fontWeight:700, color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Connected Integration Feeds</span>
            <a href="/admin/integrations" style={{ fontSize:"0.75rem", color:C.cyan, textDecoration:"none", fontWeight:600 }}>Manage Integrations →</a>
          </div>
          {integrations.length === 0 ? (
            <div style={{ color:C.muted, fontSize:"0.82rem" }}>
              No EHR integrations configured.{" "}
              <a href="/admin/integrations" style={{ color:C.cyan, textDecoration:"none", fontWeight:600 }}>Set up MedWorxs or ICANotes →</a>
            </div>
          ) : (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {integrations.map(cfg => {
                const last = cfg.imports[0];
                return (
                  <div key={cfg.id} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${cfg.enabled ? "var(--nyx-accent-str)" : C.border}`, borderRadius:8, padding:"10px 14px", minWidth:200 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background: cfg.enabled ? "#34d399" : "rgba(216,232,244,0.2)", flexShrink:0 }} />
                      <span style={{ fontWeight:700, fontSize:"0.82rem", color:C.text }}>{cfg.name}</span>
                      <span style={{ fontSize:"0.6rem", fontWeight:700, color:cfg.enabled ? "#34d399" : C.muted, marginLeft:"auto" }}>{cfg.enabled ? "ACTIVE" : "INACTIVE"}</span>
                    </div>
                    <div style={{ fontSize:"0.68rem", color:C.muted }}>{cfg.method}</div>
                    {last && (
                      <div style={{ fontSize:"0.65rem", color:C.muted, marginTop:4 }}>
                        Last import: {new Date(last.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})} · {last.imported} in · {last.errors} err
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom:20 }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:"0.875rem", width:280, outline:"none" }}
        />
      </div>

      {/* Table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Name","Type","Practice / Facility","NPI","Assigned Rep","Total Referrals","Monthly Goal","Attainment","Status","",""].map((h) => (
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"0.65rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} style={{ padding:"32px", textAlign:"center", color:C.muted, fontSize:"0.875rem" }}>Loading…</td></tr>
              )}
              {!loading && sources.length === 0 && (
                <tr><td colSpan={11} style={{ padding:"48px", textAlign:"center", color:C.muted, fontSize:"0.875rem" }}>
                  No referral sources yet.{" "}
                  <button onClick={() => setShowAdd(true)} style={{ color:C.cyan, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Add your first source</button>
                </td></tr>
              )}
              {sources.map((s) => {
                const pct = attainment(s.monthlyGoal, s._count.referrals);
                return (
                  <tr key={s.id} style={{ borderBottom:`1px solid var(--nyx-accent-dim)`, cursor:"pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ fontWeight:700, fontSize:"0.875rem", color:C.text }}>{s.name}</div>
                      {s.specialty && <div style={{ fontSize:"0.7rem", color:C.muted }}>{s.specialty}</div>}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-mid)`, borderRadius:999, padding:"2px 8px", fontSize:"0.65rem", fontWeight:700, color:C.cyan, whiteSpace:"nowrap" }}>
                        {LABEL[s.type] ?? s.type}
                      </span>
                    </td>
                    <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{s.practiceName ?? "-"}</td>
                    <td style={{ padding:"12px 14px", fontSize:"0.78rem", color:C.dim, fontFamily:"monospace" }}>{s.npi ?? "-"}</td>
                    <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{s.assignedRep?.user?.name ?? "Unassigned"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontSize:"1.1rem", fontWeight:900, color:C.cyan }}>{s._count.referrals}</span>
                    </td>
                    <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{s.monthlyGoal ?? "-"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      {pct !== null ? (
                        <span style={{ fontSize:"0.82rem", fontWeight:700, color: pct >= 100 ? C.emerald : pct >= 75 ? C.amber : C.red }}>
                          {pct}%
                        </span>
                      ) : <span style={{ color:C.dim }}>-</span>}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.08em", color: s.active ? C.emerald : C.muted }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background: s.active ? C.emerald : "rgba(216,232,244,0.2)", display:"inline-block" }} />
                        {s.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActivitySource(s); }}
                        style={{ background:"var(--nyx-accent-dim)", border:"1px solid var(--nyx-accent-str)", borderRadius:6, padding:"4px 10px", color:C.cyan, cursor:"pointer", fontSize:"0.7rem", fontWeight:700, whiteSpace:"nowrap" }}
                      >
                        📋 Activity
                      </button>
                    </td>
                    <td style={{ padding:"12px 8px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReferralSource(s); }}
                        style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", borderRadius:6, padding:"4px 10px", color:"#34d399", cursor:"pointer", fontSize:"0.7rem", fontWeight:700, whiteSpace:"nowrap" }}
                      >
                        📥 Referrals
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {referralSource && (
        <ReferralFeedPanel
          sourceId={referralSource.id}
          sourceName={referralSource.name}
          sourceSubtitle={[referralSource.specialty, referralSource.practiceName].filter(Boolean).join(" · ") || referralSource.type}
          onClose={() => setReferralSource(null)}
        />
      )}

      {activitySource && (
        <ActivityFeedPanel
          entityId={activitySource.id}
          entityParam="referralSourceId"
          entityName={activitySource.name}
          entitySubtitle={[activitySource.specialty, activitySource.practiceName].filter(Boolean).join(" · ") || activitySource.type}
          onClose={() => setActivitySource(null)}
        />
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px 32px", overflowY:"auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowImport(false); } }}>
          <div style={{ background:"var(--nyx-bg)", border:`1px solid var(--nyx-accent-str)`, borderRadius:14, padding:32, width:"100%", maxWidth:620, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:"1.2rem", fontWeight:900, color:C.text }}>Import Referrals from CSV</h2>
              <button onClick={() => setShowImport(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.4rem" }}>×</button>
            </div>

            {/* Template download */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:"0.78rem", color:C.muted, marginBottom:8 }}>Your CSV must include a header row. Required: <code style={{ color:C.cyan }}>source_npi</code> or <code style={{ color:C.cyan }}>source_name</code>. Optional: patient_initials, admission_date, discharge_date, service_line, external_id, status, notes.</div>
              <button onClick={downloadTemplate} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 14px", color:C.cyan, cursor:"pointer", fontSize:"0.78rem", fontWeight:600 }}>⬇ Download Template CSV</button>
            </div>

            {/* File picker */}
            <div
              style={{ border:`2px dashed ${C.border}`, borderRadius:10, padding:"28px", textAlign:"center", marginBottom:16, cursor:"pointer" }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCSVFile(f); }}
            >
              <div style={{ fontSize:"1.6rem", marginBottom:6 }}>📂</div>
              <div style={{ fontSize:"0.85rem", color:C.muted }}>
                {csvFilename ? <span style={{ color:C.text, fontWeight:600 }}>{csvFilename} — {csvRows.length} rows parsed</span> : "Click to select or drag & drop a CSV file"}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display:"none" }} onChange={e => { if (e.target.files?.[0]) handleCSVFile(e.target.files[0]); }} />
            </div>

            {/* Preview */}
            {csvRows.length > 0 && !importResult && (
              <div style={{ background:C.card, borderRadius:8, overflow:"hidden", marginBottom:16, border:`1px solid ${C.border}` }}>
                <div style={{ padding:"8px 12px", fontSize:"0.65rem", fontWeight:700, color:C.muted, letterSpacing:"0.08em", borderBottom:`1px solid ${C.border}` }}>PREVIEW — first {Math.min(5, csvRows.length)} of {csvRows.length} rows</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.72rem" }}>
                    <thead>
                      <tr>{Object.keys(csvRows[0]).map(h => <th key={h} style={{ padding:"6px 10px", textAlign:"left", color:C.muted, whiteSpace:"nowrap" }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                          {Object.values(row).map((v, j) => <td key={j} style={{ padding:"6px 10px", color:C.text, whiteSpace:"nowrap", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" }}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div style={{ borderRadius:8, padding:"14px 16px", marginBottom:16, background: importResult.errors > 0 ? "rgba(251,191,36,0.08)" : "rgba(52,211,153,0.08)", border:`1px solid ${importResult.errors > 0 ? "rgba(251,191,36,0.25)" : "rgba(52,211,153,0.25)"}` }}>
                <div style={{ fontWeight:700, fontSize:"0.85rem", color: importResult.errors > 0 ? C.amber : "#34d399", marginBottom:6 }}>Import Complete</div>
                <div style={{ display:"flex", gap:20, fontSize:"0.8rem" }}>
                  <span style={{ color:"#34d399" }}>✓ {importResult.imported} imported</span>
                  <span style={{ color:C.muted }}>⟳ {importResult.skipped} skipped (duplicate)</span>
                  {importResult.errors > 0 && <span style={{ color:C.red }}>✗ {importResult.errors} errors</span>}
                </div>
                {importResult.errorLog.length > 0 && (
                  <div style={{ marginTop:8, fontSize:"0.7rem", color:C.red }}>
                    {importResult.errorLog.slice(0,5).map(e => <div key={e.row}>Row {e.row}: {e.error}</div>)}
                    {importResult.errorLog.length > 5 && <div>…and {importResult.errorLog.length - 5} more</div>}
                  </div>
                )}
              </div>
            )}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setShowImport(false)} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 20px", color:C.muted, cursor:"pointer", fontWeight:600, fontSize:"0.85rem" }}>Close</button>
              {!importResult && (
                <button onClick={handleImport} disabled={!csvRows.length || importing} style={{ background:`var(--nyx-accent)`, color:"#000", border:"none", borderRadius:8, padding:"10px 24px", fontWeight:800, fontSize:"0.85rem", cursor: !csvRows.length || importing ? "not-allowed" : "pointer", opacity: !csvRows.length || importing ? 0.6 : 1 }}>
                  {importing ? `Importing ${csvRows.length} rows…` : `Import ${csvRows.length} Referral${csvRows.length !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px 32px", overflowY:"auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ background:"var(--nyx-bg)", border:`1px solid var(--nyx-accent-str)`, borderRadius:14, padding:32, width:"100%", maxWidth:520, flexShrink:0, display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 80px)" }}>
            <h2 style={{ fontSize:"1.2rem", fontWeight:900, color:C.text, marginBottom:20, flexShrink:0 }}>Add Referral Source</h2>
            {error && <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"10px 14px", color:C.red, fontSize:"0.82rem", marginBottom:16, flexShrink:0 }}>{error}</div>}

            <div style={{ overflowY:"auto", flex:1, minHeight:0 }}>
            {[
              { label:"Name *", key:"name", placeholder:"Dr. Sarah Mitchell" },
              { label:"Practice / Facility Name", key:"practiceName", placeholder:"Riverside Family Practice" },
              { label:"Specialty", key:"specialty", placeholder:"Cardiology" },
              { label:"NPI", key:"npi", placeholder:"1234567890" },
              { label:"Contact Name", key:"contactName", placeholder:"Office Manager" },
              { label:"Email", key:"email", placeholder:"office@clinic.com" },
              { label:"Phone", key:"phone", placeholder:"555-000-0000" },
              { label:"City", key:"city", placeholder:"Denver" },
              { label:"State", key:"state", placeholder:"CO" },
              { label:"Monthly Goal (referrals)", key:"monthlyGoal", placeholder:"10" },
              { label:"Notes", key:"notes", placeholder:"Warm relationship, refer on Tuesdays" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:"0.72rem", fontWeight:700, color:C.muted, marginBottom:5, letterSpacing:"0.06em" }}>{label}</label>
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:"0.875rem", outline:"none", boxSizing:"border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:"0.72rem", fontWeight:700, color:C.muted, marginBottom:5, letterSpacing:"0.06em" }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                style={{ width:"100%", background:"var(--nyx-card)", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:"0.875rem", outline:"none", colorScheme:"dark" }}
              >
                {SOURCE_TYPES.map((t) => <option key={t} value={t} style={{ background:"var(--nyx-card)", color:C.text }}>{LABEL[t]}</option>)}
              </select>
            </div>
            </div>{/* end scrollable body */}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", flexShrink:0, paddingTop:4 }}>
              <button onClick={() => setShowAdd(false)} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 20px", color:C.muted, cursor:"pointer", fontWeight:600, fontSize:"0.85rem" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ background:`var(--nyx-accent)`, color:"#000", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:800, fontSize:"0.85rem", cursor:"pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Add Source"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
