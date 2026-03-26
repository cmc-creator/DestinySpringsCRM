"use client";
import React, { useState, useRef } from "react";

type ImportType = "accounts" | "contacts" | "activities";

type PreviewSample = { action: "create" | "skip"; reason?: string; fields: Record<string, string> };

type ImportResult = {
  ok: boolean;
  type: ImportType;
  totalRows: number;
  created: number;
  skipped: number;
  errors: string[];
  error?: string;
  columns?: string[];
  skipReasons?: Record<string, number>;
  isDryRun?: boolean;
  preview?: PreviewSample[];
};

const IMPORT_TYPES: { value: ImportType; label: string; hint: string; badge: string }[] = [
  {
    value: "accounts",
    label: "Facilities / Accounts",
    badge: "ACCOUNTS",
    hint: "Import referral sources and sending facility records. Expected columns: Account Name, Billing City, Billing State, Phone, NPI, Primary Contact, etc.",
  },
  {
    value: "contacts",
    label: "Contacts",
    badge: "CONTACTS",
    hint: "Import contacts linked to existing facilities. Each row must have an Account Name that matches an existing facility. Expected columns: Name, Title, Email, Phone, Department, Account Name, etc.",
  },
  {
    value: "activities",
    label: "Activities",
    badge: "ACTIVITIES",
    hint: "Import past visit logs, calls, and emails. Expected columns: Subject, Type, Date, Account Name, Owner, Description, etc.",
  },
];

export default function AdminImportPage() {
  const [type, setType]         = useState<ImportType>("accounts");
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) { setFile(dropped); setResult(null); startImport(dropped, true); }
  }

  async function startImport(fileToImport: File, dryRun = false) {
    setUploading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", fileToImport);
    fd.append("type", type);
    fd.append("dryRun", dryRun ? "true" : "false");

    try {
      const res  = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data = await res.json() as ImportResult;
      setResult(data);
    } catch (e) {
      setResult({ ok: false, type, totalRows: 0, created: 0, skipped: 0, errors: [], error: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function runImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    // If we already showed a preview, confirm = real import. Otherwise preview first.
    if (result?.isDryRun) {
      await startImport(file, false);
    } else {
      await startImport(file, true);
    }
  }

  const active = IMPORT_TYPES.find((t) => t.value === type)!;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#ede4cf" }}>Import Data</h1>
        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "rgba(237,228,207,0.5)" }}>
          Upload Excel (.xlsx) or CSV files to populate facilities, contacts, and activity history.
          Import Accounts first, then Contacts, then Activities.
        </p>
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {IMPORT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setType(t.value); setResult(null); setFile(null); }}
            style={{
              border: `1px solid ${type === t.value ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: type === t.value ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
              color: type === t.value ? "#c9a84c" : "rgba(237,228,207,0.6)",
              fontWeight: type === t.value ? 800 : 600,
              fontSize: "0.82rem",
              borderRadius: 9,
              padding: "9px 16px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Info card */}
      <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.16)", borderRadius: 12, padding: "14px 16px", marginBottom: 22, fontSize: "0.82rem", color: "rgba(237,228,207,0.58)", lineHeight: 1.6 }}>
        <strong style={{ color: "#c9a84c" }}>{active.label}:</strong> {active.hint}
      </div>

      {/* Upload form */}
      <form onSubmit={runImport} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 14, padding: "22px 24px" }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          style={{
            border: `2px dashed ${file ? "rgba(34,197,94,0.4)" : dragging ? "rgba(201,168,76,0.7)" : "rgba(201,168,76,0.2)"}`,
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 18,
            background: file ? "rgba(34,197,94,0.04)" : dragging ? "rgba(201,168,76,0.06)" : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              if (picked) { setFile(picked); setResult(null); startImport(picked, true); }
            }}
          />
          {file ? (
            <>
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#86efac" }}>✓ {file.name}</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "rgba(237,228,207,0.45)" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: "1.1rem", color: "rgba(201,168,76,0.5)" }}>⬆ Drop your Excel or CSV file here</p>
              <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "rgba(237,228,207,0.4)" }}>Accepts .xlsx, .xls, or .csv · Click to browse</p>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          style={{ background: file && !uploading ? (result?.isDryRun ? "#22c55e" : "#c9a84c") : "rgba(201,168,76,0.25)", color: file && !uploading ? "#100805" : "rgba(237,228,207,0.4)", fontWeight: 800, fontSize: "0.9rem", border: "none", borderRadius: 10, padding: "13px 24px", cursor: file && !uploading ? "pointer" : "not-allowed", width: "100%" }}
        >
          {uploading
            ? (result?.isDryRun ? `⏳ Importing ${active.label}…` : `⏳ Previewing ${active.label}…`)
            : result?.isDryRun
              ? `✓ Confirm and Import ${active.label}`
              : `Preview ${active.label} Before Importing`
          }
        </button>
      </form>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 20, borderRadius: 12, border: `1px solid ${result.error ? "rgba(239,68,68,0.25)" : result.isDryRun ? "rgba(201,168,76,0.3)" : "rgba(34,197,94,0.25)"}`, background: result.error ? "rgba(239,68,68,0.06)" : result.isDryRun ? "rgba(201,168,76,0.06)" : "rgba(34,197,94,0.06)", padding: "18px 20px" }}>
          {result.error ? (
            <p style={{ margin: 0, color: "#fca5a5", fontWeight: 700 }}>Error: {result.error}</p>
          ) : result.isDryRun ? (
            /* ── PREVIEW PANEL ── */
            <>
              <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#fde68a", fontSize: "1rem" }}>
                Preview — {result.totalRows} rows scanned
              </p>
              <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "rgba(237,228,207,0.55)" }}>
                {result.created} row{result.created !== 1 ? "s" : ""} ready to create · {result.skipped} will be skipped
                {" "}— nothing has been written yet. Review below, then click <strong style={{ color: "#fde68a" }}>Confirm and Import</strong>.
              </p>

              {/* Detected columns */}
              {result.columns && result.columns.length > 0 && (
                <details open style={{ marginBottom: 12 }}>
                  <summary style={{ fontSize: "0.8rem", color: "#c9a84c", cursor: "pointer", fontWeight: 700, marginBottom: 6 }}>
                    Columns detected in your file ({result.columns.length})
                  </summary>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                    {result.columns.map((c) => (
                      <span key={c} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", color: "#fde68a" }}>{c}</span>
                    ))}
                  </div>
                </details>
              )}

              {/* Sample creates */}
              {result.preview && result.preview.filter((p) => p.action === "create").length > 0 && (
                <details open style={{ marginBottom: 12 }}>
                  <summary style={{ fontSize: "0.8rem", color: "#86efac", cursor: "pointer", fontWeight: 700, marginBottom: 6 }}>
                    Sample records that will be created ({result.preview.filter((p) => p.action === "create").length} shown)
                  </summary>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.preview.filter((p) => p.action === "create").map((p, i) => (
                      <div key={i} style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: "0.75rem", display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
                        {Object.entries(p.fields).map(([k, v]) => (
                          <span key={k} style={{ color: "rgba(237,228,207,0.7)" }}>
                            <span style={{ color: "rgba(134,239,172,0.7)", fontWeight: 600 }}>{k}:</span> {v}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Skip reasons */}
              {result.skipped > 0 && result.skipReasons && Object.keys(result.skipReasons).length > 0 && (
                <details style={{ marginBottom: 12 }}>
                  <summary style={{ fontSize: "0.8rem", color: "#fca5a5", cursor: "pointer", fontWeight: 700 }}>
                    Why {result.skipped} row{result.skipped !== 1 ? "s" : ""} will be skipped
                  </summary>
                  <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: "0.78rem", color: "rgba(239,68,68,0.7)", lineHeight: 1.8 }}>
                    {Object.entries(result.skipReasons).map(([reason, count]) => (
                      <li key={reason}><strong>{count}x</strong> — {reason}</li>
                    ))}
                  </ul>
                </details>
              )}

              {result.created === 0 && (
                <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "#fca5a5", fontWeight: 700 }}>
                  No rows will be created. Check the skip reasons above and fix your file before importing.
                </p>
              )}
            </>
          ) : (
            /* ── IMPORT COMPLETE PANEL ── */
            <>
              <p style={{ margin: "0 0 8px", fontWeight: 800, color: "#86efac", fontSize: "1rem" }}>
                Import complete — {result.created} record{result.created !== 1 ? "s" : ""} created
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(237,228,207,0.6)" }}>
                {result.totalRows} rows processed · {result.created} created · {result.skipped} skipped (duplicates or missing required fields)
              </p>
              {result.created === 0 && result.columns && result.columns.length > 0 && (
                <details open style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: "0.8rem", color: "#fde68a", cursor: "pointer", fontWeight: 700 }}>Columns detected in your file — click to collapse</summary>
                  <p style={{ margin: "8px 0 4px", fontSize: "0.75rem", color: "rgba(237,228,207,0.45)" }}>Make sure one of these matches the expected column names:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {result.columns.map((c) => (
                      <span key={c} style={{ background: "rgba(253,230,138,0.1)", border: "1px solid rgba(253,230,138,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", color: "#fde68a" }}>{c}</span>
                    ))}
                  </div>
                </details>
              )}
              {result.skipReasons && Object.keys(result.skipReasons).length > 0 && (
                <details open={result.created === 0} style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: "0.8rem", color: "#fca5a5", cursor: "pointer", fontWeight: 700 }}>Why rows were skipped</summary>
                  <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: "0.78rem", color: "rgba(239,68,68,0.7)", lineHeight: 1.8 }}>
                    {Object.entries(result.skipReasons).map(([reason, count]) => (
                      <li key={reason}><strong>{count}x</strong> — {reason}</li>
                    ))}
                  </ul>
                </details>
              )}
              {result.errors.length > 0 && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: "0.8rem", color: "#fca5a5", cursor: "pointer" }}>{result.errors.length} row error{result.errors.length !== 1 ? "s" : ""} — click to expand</summary>
                  <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: "0.78rem", color: "rgba(239,68,68,0.7)", lineHeight: 1.8 }}>
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: "0.72rem", color: "rgba(237,228,207,0.28)", textAlign: "center", lineHeight: 1.6 }}>
        Import order: <strong style={{ color: "rgba(237,228,207,0.45)" }}>1. Accounts</strong> → <strong style={{ color: "rgba(237,228,207,0.45)" }}>2. Contacts</strong> → <strong style={{ color: "rgba(237,228,207,0.45)" }}>3. Activities</strong>.
        Imports are additive and do not delete existing records. Duplicate accounts (matched by name) are skipped. Contacts without a matching facility are skipped. Before production imports, take a database backup/snapshot so rollback is available if needed.
      </p>
    </div>
  );
}
