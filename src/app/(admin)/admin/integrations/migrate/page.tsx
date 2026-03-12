"use client";

import { useState } from "react";

const C = {
  text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  card: "var(--nyx-card)", border: "var(--nyx-border)", borderHover: "var(--nyx-accent-str)",
  blue: "#60a5fa", cyan: "#22d3ee", amber: "#f59e0b", red: "#f87171", green: "#34d399",
};

const inp = { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: "0.82rem", outline: "none", boxSizing: "border-box" as const };

type EntityMode = "accounts" | "leads" | "opportunities" | "contacts";
type SourceCRM  = "salesforce" | "hubspot" | "zoho" | "pipedrive" | "custom";

const CRM_LABELS: Record<SourceCRM, string> = {
  salesforce: "Salesforce", hubspot: "HubSpot", zoho: "Zoho CRM",
  pipedrive: "Pipedrive", custom: "Custom / Other",
};

type FieldSpec = { key: string; label: string; required?: boolean };

const ENTITY_FIELDS: Record<EntityMode, FieldSpec[]> = {
  accounts: [
    { key: "hospitalName",           label: "Account / Hospital Name *", required: true },
    { key: "systemName",             label: "Health System / Parent Org" },
    { key: "hospitalType",           label: "Account Type" },
    { key: "city",                   label: "City" },
    { key: "state",                  label: "State" },
    { key: "address",                label: "Street Address" },
    { key: "zip",                    label: "Zip Code" },
    { key: "npi",                    label: "NPI Number" },
    { key: "bedCount",               label: "Bed Count" },
    { key: "primaryContactName",     label: "Primary Contact Name" },
    { key: "primaryContactEmail",    label: "Primary Contact Email" },
    { key: "primaryContactPhone",    label: "Primary Contact Phone" },
    { key: "primaryContactTitle",    label: "Primary Contact Title" },
    { key: "notes",                  label: "Notes / Description" },
  ],
  leads: [
    { key: "hospitalName",    label: "Account / Company Name *", required: true },
    { key: "contactName",     label: "Contact Name" },
    { key: "contactEmail",    label: "Contact Email" },
    { key: "contactPhone",    label: "Contact Phone" },
    { key: "contactTitle",    label: "Contact Title / Job" },
    { key: "state",           label: "State" },
    { key: "city",            label: "City" },
    { key: "source",          label: "Lead Source" },
    { key: "status",          label: "Lead Status" },
    { key: "serviceInterest", label: "Service / Interest Area" },
    { key: "estimatedValue",  label: "Estimated Value ($)" },
    { key: "notes",           label: "Notes / Description" },
  ],
  opportunities: [
    { key: "title",           label: "Opportunity / Deal Title *", required: true },
    { key: "hospitalName",    label: "Account Name (to match) *",  required: true },
    { key: "stage",           label: "Stage" },
    { key: "serviceLine",     label: "Service Line" },
    { key: "value",           label: "Deal Value ($)" },
    { key: "closeDate",       label: "Expected Close Date" },
    { key: "notes",           label: "Notes" },
  ],
  contacts: [
    { key: "hospitalName",  label: "Account Name (to match) *", required: true },
    { key: "name",          label: "Contact Full Name *", required: true },
    { key: "title",         label: "Job Title" },
    { key: "email",         label: "Email" },
    { key: "phone",         label: "Phone" },
    { key: "department",    label: "Department" },
    { key: "type",          label: "Contact Type (CMO, CFO, etc.)" },
    { key: "notes",         label: "Notes" },
  ],
};

// Pre-filled column name defaults per source CRM
const CRM_DEFAULTS: Record<SourceCRM, Record<string, string>> = {
  salesforce: {
    // accounts
    hospitalName: "Account Name", systemName: "Parent Account", city: "Billing City",
    state: "Billing State", address: "Billing Street", zip: "Billing Zip", npi: "NPI__c",
    bedCount: "NumberOfEmployees", primaryContactName: "Primary Contact", notes: "Description",
    // leads
    contactName: "Name", contactEmail: "Email", contactPhone: "Phone",
    contactTitle: "Title", source: "Lead Source", status: "Status",
    serviceInterest: "Product_Interest__c", estimatedValue: "Annual Revenue",
    // opportunities
    title: "Opportunity Name", stage: "Stage", value: "Amount", closeDate: "Close Date",
    // contacts
    name: "Name", email: "Email", phone: "Phone", department: "Department", type: "Title",
    hospitalName2: "Account Name",
  },
  hubspot: {
    hospitalName: "Company Name", systemName: "Parent Company", city: "City",
    state: "State/Region", address: "Street Address", zip: "Postal Code",
    primaryContactName: "First Name", primaryContactEmail: "Email", notes: "Notes",
    contactName: "First Name", contactEmail: "Email", contactPhone: "Phone Number",
    contactTitle: "Job Title", source: "Original Source", status: "Lead Status",
    serviceInterest: "Product Interest", estimatedValue: "Annual Revenue",
    title: "Deal Name", stage: "Deal Stage", value: "Amount",
    closeDate: "Close Date", name: "First Name", email: "Email", phone: "Phone Number",
  },
  zoho: {
    hospitalName: "Account Name", systemName: "Parent Account", city: "Billing City",
    state: "Billing State", address: "Billing Street", zip: "Billing Code",
    primaryContactName: "Account Owner", notes: "Description",
    contactName: "Last Name", contactEmail: "Email", contactPhone: "Mobile",
    contactTitle: "Title", source: "Lead Source", status: "Lead Status",
    estimatedValue: "Annual Revenue",
    title: "Opportunity Name", stage: "Stage", value: "Amount",
    name: "Last Name", email: "Email", phone: "Mobile", department: "Department",
  },
  pipedrive: {
    hospitalName: "Organization Name", city: "Address City", state: "Address State",
    address: "Address Street", zip: "Address Postal Code",
    primaryContactName: "Person Name", primaryContactEmail: "Email",
    primaryContactPhone: "Phone", notes: "Notes",
    contactName: "Person Name", contactEmail: "Email", contactPhone: "Phone",
    contactTitle: "Label", source: "Lead Source", status: "Stage",
    title: "Deal Title", stage: "Stage", value: "Value",
    closeDate: "Expected close date", name: "Person Name", email: "Email", phone: "Phone",
  },
  custom: {},
};

type ImportResult = { totalRows: number; imported: number; updated: number; skipped: number; errors: number; errorLog: string[] };

const ENTITY_TABS: { mode: EntityMode; label: string }[] = [
  { mode: "accounts",      label: "Hospital Accounts" },
  { mode: "leads",         label: "Leads" },
  { mode: "opportunities", label: "Opportunities" },
  { mode: "contacts",      label: "Contacts" },
];

export default function MigratePage() {
  const [entityMode, setEntityMode] = useState<EntityMode>("accounts");
  const [sourceCRM, setSourceCRM]   = useState<SourceCRM>("salesforce");
  const [mapping, setMapping]       = useState<Record<string, string>>(CRM_DEFAULTS["salesforce"]);
  const [file, setFile]             = useState<File | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  const handleCRMChange = (crm: SourceCRM) => {
    setSourceCRM(crm);
    setMapping(CRM_DEFAULTS[crm]);
    setResult(null);
    setImportError("");
  };

  const handleModeChange = (mode: EntityMode) => {
    setEntityMode(mode);
    setFile(null);
    setResult(null);
    setImportError("");
  };

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
    fd.append("mode", entityMode);
    fd.append("sourceCRM", sourceCRM);
    fd.append("mapping", JSON.stringify(mapping));
    try {
      const res = await fetch("/api/integrations/migrate", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setImportError(data.error ?? "Import failed");
    } catch {
      setImportError("Network error. Please try again");
    }
    setImporting(false);
  };

  const currentFields = ENTITY_FIELDS[entityMode];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
          </svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: C.text }}>CRM Migration</h1>
            <span style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.blue, letterSpacing: "0.1em" }}>DATA IMPORT</span>
          </div>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>
            Switching from another CRM? Import your accounts, leads, opportunities, and contacts in minutes.
          </p>
        </div>
      </div>

      {/* Source CRM picker */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 10, letterSpacing: "0.08em" }}>I&apos;M MIGRATING FROM</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(Object.keys(CRM_LABELS) as SourceCRM[]).map((crm) => (
            <button key={crm} onClick={() => handleCRMChange(crm)}
              style={{ background: sourceCRM === crm ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${sourceCRM === crm ? C.blue : C.border}`, borderRadius: 8, padding: "8px 16px", color: sourceCRM === crm ? C.blue : C.muted, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.15s" }}>
              {CRM_LABELS[crm]}
            </button>
          ))}
        </div>
        {sourceCRM !== "custom" && (
          <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8 }}>
            Column names are pre-filled with standard {CRM_LABELS[sourceCRM]} export headers. Adjust as needed.
          </p>
        )}
      </div>

      {/* Entity mode tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        {ENTITY_TABS.map(({ mode, label }) => (
          <button key={mode} onClick={() => handleModeChange(mode)}
            style={{ background: "none", border: "none", padding: "10px 18px", fontSize: "0.82rem", fontWeight: 700, color: entityMode === mode ? C.blue : C.muted, cursor: "pointer", borderBottom: entityMode === mode ? `2px solid ${C.blue}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* Context hint */}
        {entityMode === "opportunities" && (
          <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: "0.8rem", color: C.amber, marginBottom: 20, lineHeight: 1.6 }}>
            <strong>Tip:</strong> Import <strong>Hospital Accounts</strong> before Opportunities. Each opportunity is matched to an existing account by name.
          </div>
        )}
        {entityMode === "contacts" && (
          <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: "0.8rem", color: C.amber, marginBottom: 20, lineHeight: 1.6 }}>
            <strong>Tip:</strong> Import <strong>Hospital Accounts</strong> before Contacts. Each contact is linked to an account matched by name.
          </div>
        )}

        {/* Column mapping */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: C.text, marginBottom: 4 }}>Column Mapping</h3>
          <p style={{ fontSize: "0.77rem", color: C.muted, marginBottom: 16 }}>
            Enter the exact column header from your exported CSV for each field. Leave blank to skip.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {currentFields.map(({ key, label }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.08em" }}>{label}</label>
                <input
                  value={(mapping as Record<string, string>)[key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                  placeholder="CSV column header…"
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
          onClick={() => document.getElementById("migrate-csv")?.click()}
          style={{ border: `2px dashed ${dragging ? C.blue : C.borderHover}`, borderRadius: 12, padding: "36px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(96,165,250,0.05)" : "transparent", transition: "all 0.2s", marginBottom: 20 }}>
          <input id="migrate-csv" type="file" accept=".csv" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragging ? C.blue : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {file ? (
            <p style={{ color: C.blue, fontWeight: 700, fontSize: "0.9rem" }}>{file.name}</p>
          ) : (
            <>
              <p style={{ color: C.text, fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>
                Drop your {CRM_LABELS[sourceCRM]} CSV export here or click to browse
              </p>
              <p style={{ color: C.muted, fontSize: "0.78rem" }}>
                Export from {CRM_LABELS[sourceCRM]} as a CSV file, then upload it here
              </p>
            </>
          )}
        </div>

        {importError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", color: C.red, fontSize: "0.82rem", marginBottom: 16 }}>
            {importError}
          </div>
        )}

        <button onClick={handleImport} disabled={!file || importing}
          style={{ background: `linear-gradient(135deg,${C.blue},${C.cyan})`, color: "#000", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 800, fontSize: "0.9rem", cursor: !file || importing ? "not-allowed" : "pointer", opacity: !file || importing ? 0.6 : 1 }}>
          {importing ? "Importing…" : `Import ${ENTITY_TABS.find((t) => t.mode === entityMode)?.label}`}
        </button>

        {result && (
          <div style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 12, padding: 20, marginTop: 20 }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: C.blue, marginBottom: 12 }}>Import Complete</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: result.errorLog?.length ? 16 : 0 }}>
              {[
                { label: "Total Rows",  value: result.totalRows, color: C.text },
                { label: "Imported",    value: result.imported,  color: C.green },
                { label: "Updated",     value: result.updated,   color: C.cyan },
                { label: "Skipped",     value: result.skipped,   color: C.amber },
                { label: "Errors",      value: result.errors,    color: result.errors > 0 ? C.red : C.muted },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {result.errorLog?.length > 0 && (
              <details>
                <summary style={{ fontSize: "0.78rem", color: C.amber, cursor: "pointer", fontWeight: 600 }}>
                  View {result.errorLog.length} error{result.errorLog.length !== 1 ? "s" : ""}
                </summary>
                <ul style={{ margin: "8px 0 0", padding: "0 0 0 16px", fontSize: "0.75rem", color: C.muted, lineHeight: 1.8 }}>
                  {result.errorLog.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Help footer */}
        <div style={{ marginTop: 32, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>Import order matters</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { step: "1", label: "Hospital Accounts", desc: "Import these first. All other records link back to an account." },
              { step: "2", label: "Contacts",          desc: "Matched and linked to accounts by name." },
              { step: "3", label: "Leads",             desc: "Can be imported independently or linked to an existing account." },
              { step: "4", label: "Opportunities",     desc: "Must match an existing account by name." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ width: 22, height: 22, background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 900, color: C.blue, flexShrink: 0 }}>{item.step}</span>
                <div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.text }}>{item.label}</span>
                  <span style={{ fontSize: "0.78rem", color: C.muted }}>: {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
