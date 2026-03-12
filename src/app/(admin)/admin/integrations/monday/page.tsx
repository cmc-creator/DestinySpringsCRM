"use client";

import { useState } from "react";

const C = {
  cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  card: "var(--nyx-card)", border: "var(--nyx-border)", borderHover: "var(--nyx-accent-str)",
  orange: "#fb923c", amber: "#f59e0b", red: "#f87171", green: "#34d399",
};

const inp = { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: "0.82rem", outline: "none", boxSizing: "border-box" as const };

type Board = { id: string; name: string };
type BoardColumn = { id: string; title: string };
type EntityType = "leads" | "accounts" | "opportunities";

const ENTITY_FIELDS: Record<EntityType, { key: string; label: string; required?: boolean }[]> = {
  leads: [
    { key: "hospitalName",    label: "Account / Org Name *", required: true },
    { key: "contactName",     label: "Contact Name" },
    { key: "contactEmail",    label: "Contact Email" },
    { key: "state",           label: "State" },
    { key: "city",            label: "City" },
    { key: "serviceInterest", label: "Service / Interest" },
    { key: "notes",           label: "Notes / Description" },
    { key: "status",          label: "Status" },
  ],
  accounts: [
    { key: "hospitalName",    label: "Account Name *", required: true },
    { key: "systemName",      label: "Health System" },
    { key: "city",            label: "City" },
    { key: "state",           label: "State" },
    { key: "hospitalType",    label: "Hospital Type" },
    { key: "primaryContactName",  label: "Primary Contact" },
    { key: "primaryContactEmail", label: "Contact Email" },
    { key: "primaryContactPhone", label: "Contact Phone" },
    { key: "notes",           label: "Notes" },
  ],
  opportunities: [
    { key: "title",           label: "Opportunity Title *", required: true },
    { key: "hospitalName",    label: "Account Name (to match) *", required: true },
    { key: "stage",           label: "Stage" },
    { key: "serviceLine",     label: "Service Line" },
    { key: "value",           label: "Deal Value" },
    { key: "closeDate",       label: "Close Date" },
    { key: "notes",           label: "Notes" },
  ],
};

type ImportResult = { totalRows: number; imported: number; updated: number; skipped: number; errors: number; errorLog: string[] };

const TABS = ["API Connection", "Board Import", "About Monday"] as const;
type Tab = typeof TABS[number];

export default function MondayIntegrationPage() {
  const [tab, setTab]             = useState<Tab>("API Connection");
  const [apiKey, setApiKey]       = useState("");
  const [testing, setTesting]     = useState(false);
  const [connected, setConnected] = useState(false);
  const [connError, setConnError] = useState("");
  const [boards, setBoards]       = useState<Board[]>([]);
  const [savedKey, setSavedKey]   = useState("");

  const [selectedBoard, setSelectedBoard]   = useState("");
  const [boardCols, setBoardCols]           = useState<BoardColumn[]>([]);
  const [loadingCols, setLoadingCols]       = useState(false);
  const [entityType, setEntityType]         = useState<EntityType>("leads");
  const [mapping, setMapping]               = useState<Record<string, string>>({});
  const [importing, setImporting]           = useState(false);
  const [result, setResult]                 = useState<ImportResult | null>(null);
  const [importError, setImportError]       = useState("");

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setTesting(true); setConnError(""); setConnected(false);
    try {
      const res = await fetch("/api/integrations/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", apiKey }),
      });
      const data = await res.json();
      if (res.ok && data.boards) {
        setBoards(data.boards);
        setSavedKey(apiKey);
        setConnected(true);
      } else {
        setConnError(data.error ?? "Connection failed. Check your API key");
      }
    } catch {
      setConnError("Network error. Please try again");
    }
    setTesting(false);
  };

  const handleBoardChange = async (boardId: string) => {
    setSelectedBoard(boardId);
    setBoardCols([]);
    setMapping({});
    if (!boardId) return;
    setLoadingCols(true);
    try {
      const res = await fetch("/api/integrations/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "columns", apiKey: savedKey, boardId }),
      });
      const data = await res.json();
      if (res.ok) setBoardCols(data.columns ?? []);
    } catch { /* ignore */ }
    setLoadingCols(false);
  };

  const handleImport = async () => {
    if (!selectedBoard || !savedKey) return;
    setImporting(true); setResult(null); setImportError("");
    try {
      const res = await fetch("/api/integrations/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", apiKey: savedKey, boardId: selectedBoard, entityType, mapping }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setImportError(data.error ?? "Import failed");
    } catch {
      setImportError("Network error. Please try again");
    }
    setImporting(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {/* Monday.com dot grid logo */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="3.5" fill="#f87171"/>
            <circle cx="12" cy="12" r="3.5" fill={C.orange}/>
            <circle cx="19" cy="12" r="3.5" fill="#a78bfa"/>
          </svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: C.text }}>Monday.com</h1>
            <span style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.amber, letterSpacing: "0.1em" }}>SETUP REQUIRED</span>
            <span style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, color: C.orange, letterSpacing: "0.1em" }}>PROJECT MANAGEMENT</span>
          </div>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>
            Import leads, accounts, and opportunities directly from any Monday.com board.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: "none", border: "none", padding: "10px 18px", fontSize: "0.82rem", fontWeight: 700, color: tab === t ? C.orange : C.muted, cursor: "pointer", borderBottom: tab === t ? `2px solid ${C.orange}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── API CONNECTION TAB ─── */}
      {tab === "API Connection" && (
        <div style={{ maxWidth: 560 }}>
          <p style={{ color: C.muted, fontSize: "0.875rem", lineHeight: 1.7, marginBottom: 20 }}>
            Enter your Monday.com API token below. You can find it in Monday.com under{" "}
            <strong style={{ color: C.text }}>Profile → Developers → My Access Tokens</strong>.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: "0.08em" }}>API TOKEN</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiJ9…"
              style={{ ...inp, fontFamily: "monospace" }} />
            <p style={{ fontSize: "0.72rem", color: C.muted, marginTop: 6 }}>
              Your token is only used to query your boards. NyxAegis does not write back to Monday.com.
            </p>
          </div>

          {connError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", color: C.red, fontSize: "0.82rem", marginBottom: 16 }}>
              {connError}
            </div>
          )}

          <button onClick={handleConnect} disabled={!apiKey.trim() || testing}
            style={{ background: `linear-gradient(135deg,${C.orange},#f97316)`, color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 800, fontSize: "0.9rem", cursor: !apiKey.trim() || testing ? "not-allowed" : "pointer", opacity: !apiKey.trim() ? 0.5 : 1 }}>
            {testing ? "Connecting…" : "Test Connection"}
          </button>

          {connected && boards.length > 0 && (
            <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: 16, marginTop: 20 }}>
              <p style={{ color: C.green, fontWeight: 700, fontSize: "0.85rem", marginBottom: 10 }}>
                Connected: {boards.length} board{boards.length !== 1 ? "s" : ""} found
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {boards.slice(0, 10).map((b) => (
                  <span key={b.id} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", color: C.text }}>
                    {b.name}
                  </span>
                ))}
                {boards.length > 10 && <span style={{ fontSize: "0.75rem", color: C.muted, padding: "4px 10px" }}>+{boards.length - 10} more</span>}
              </div>
              <button onClick={() => setTab("Board Import")}
                style={{ marginTop: 12, background: "none", border: `1px solid ${C.orange}`, borderRadius: 8, padding: "8px 18px", color: C.orange, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                Go to Board Import →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── BOARD IMPORT TAB ─── */}
      {tab === "Board Import" && (
        <div style={{ maxWidth: 720 }}>
          {!savedKey && (
            <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: "0.82rem", color: C.amber }}>
              Connect your Monday.com account on the <strong>API Connection</strong> tab first.
            </div>
          )}

          {/* Board + entity picker */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: "0.08em" }}>SELECT BOARD</label>
              <select value={selectedBoard} onChange={(e) => handleBoardChange(e.target.value)}
                disabled={!savedKey || boards.length === 0}
                style={{ ...inp, appearance: "none" }}>
                <option value="">Choose a board</option>
                {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: "0.08em" }}>IMPORT AS</label>
              <select value={entityType} onChange={(e) => { setEntityType(e.target.value as EntityType); setMapping({}); }}
                style={{ ...inp, appearance: "none" }}>
                <option value="leads">Leads</option>
                <option value="accounts">Hospital Accounts</option>
                <option value="opportunities">Opportunities</option>
              </select>
            </div>
          </div>

          {/* Column mapping */}
          {selectedBoard && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: C.text, marginBottom: 4 }}>Column Mapping</h3>
              <p style={{ fontSize: "0.77rem", color: C.muted, marginBottom: 16 }}>
                {loadingCols ? "Loading board columns…" : `Map Monday.com columns to NyxAegis fields.`}
              </p>
              {!loadingCols && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {ENTITY_FIELDS[entityType].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.08em" }}>{label}</label>
                      <select value={mapping[key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                        style={{ ...inp, appearance: "none" }}>
                        <option value="">skip</option>
                        {boardCols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {importError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", color: C.red, fontSize: "0.82rem", marginBottom: 16 }}>
              {importError}
            </div>
          )}

          <button onClick={handleImport} disabled={!selectedBoard || !savedKey || importing}
            style={{ background: `linear-gradient(135deg,${C.orange},#f97316)`, color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 800, fontSize: "0.9rem", cursor: !selectedBoard || importing ? "not-allowed" : "pointer", opacity: !selectedBoard ? 0.5 : 1 }}>
            {importing ? "Importing…" : `Import Board as ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`}
          </button>

          {result && (
            <div style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 12, padding: 20, marginTop: 20 }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: C.orange, marginBottom: 12 }}>Import Complete</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: result.errorLog?.length ? 16 : 0 }}>
                {[
                  { label: "Total Items", value: result.totalRows, color: C.text },
                  { label: "Imported",    value: result.imported,  color: C.green },
                  { label: "Updated",     value: result.updated,   color: C.orange },
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

      {/* ─── ABOUT TAB ─── */}
      {tab === "About Monday" && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>What does this integration do?</h3>
            <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.75 }}>
              Many hospital BD teams use Monday.com to manage outreach pipelines before adopting a dedicated CRM. This integration lets you pull your Monday.com board data (leads, accounts, or deals) directly into NyxAegis so nothing is lost during the transition. Deduplication ensures existing records are updated rather than duplicated.
            </p>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 12 }}>Supported import types</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Leads",                desc: "Any board tracking outreach prospects, referral sources, or new contacts" },
                { label: "Hospital Accounts",    desc: "Boards representing existing relationships, active facilities, or target accounts" },
                { label: "Opportunities",        desc: "Deal pipelines, RFP trackers, or proposal boards (requires matching account name)" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: "0.7rem", fontWeight: 700, color: C.orange, flexShrink: 0, whiteSpace: "nowrap", marginTop: 2 }}>{item.label}</span>
                  <span style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.6 }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
