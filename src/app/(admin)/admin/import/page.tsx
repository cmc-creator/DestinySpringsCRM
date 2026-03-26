"use client";
import React, { useState, useRef } from "react";

type ImportType = "accounts" | "contacts" | "activities";

type ImportResult = {
  ok: boolean;
  type: ImportType;
  totalRows: number;
  created: number;
  skipped: number;
  errors: string[];
  error?: string;
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
    if (dropped) { setFile(dropped); setResult(null); startImport(dropped); }
  }

  async function startImport(fileToImport: File) {
    setUploading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", fileToImport);
    fd.append("type", type);

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
    await startImport(file);
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
              if (picked) { setFile(picked); setResult(null); startImport(picked); }
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
          style={{ background: file && !uploading ? "#c9a84c" : "rgba(201,168,76,0.25)", color: file && !uploading ? "#100805" : "rgba(237,228,207,0.4)", fontWeight: 800, fontSize: "0.9rem", border: "none", borderRadius: 10, padding: "13px 24px", cursor: file && !uploading ? "pointer" : "not-allowed", width: "100%" }}
        >
          {uploading ? `⏳ Importing ${active.label} — this may take up to 30 seconds…` : `Import ${active.label}`}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 20, borderRadius: 12, border: `1px solid ${result.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, background: result.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", padding: "18px 20px" }}>
          {result.error ? (
            <p style={{ margin: 0, color: "#fca5a5", fontWeight: 700 }}>Error: {result.error}</p>
          ) : (
            <>
              <p style={{ margin: "0 0 8px", fontWeight: 800, color: "#86efac", fontSize: "1rem" }}>
                Import complete — {result.created} record{result.created !== 1 ? "s" : ""} created
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(237,228,207,0.6)" }}>
                {result.totalRows} rows processed · {result.created} created · {result.skipped} skipped (duplicates or missing required fields)
              </p>
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
        Duplicate accounts (matched by name) are skipped. Contacts without a matching facility are skipped. Data is not reversible — run imports on a fresh database or verify first.
      </p>
    </div>
  );
}
