"use client";
import { useState, useEffect, useCallback } from "react";

type ContractStatus = "DRAFT"|"SENT"|"SIGNED"|"ACTIVE"|"EXPIRED"|"TERMINATED";
interface Hospital { id: string; hospitalName: string }
interface Rep { id: string; user: { name: string | null; email: string } }
interface Contract {
  id: string; title: string;
  hospitalId: string; hospital: { hospitalName: string };
  opportunityId?: string | null;
  assignedRepId?: string | null; assignedRep?: { user: { name: string | null } } | null;
  status: ContractStatus; startDate?: string | null; endDate?: string | null;
  value?: string | number | null; terms?: string | null; fileUrl?: string | null;
  createdAt: string;
}

const C = { card: "rgba(255,255,255,0.03)", border: "rgba(0,212,255,0.08)", cyan: "#00d4ff", text: "#d8e8f4", muted: "rgba(216,232,244,0.55)", input: "rgba(0,0,0,0.35)" };
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

const STATUS_CLR: Record<ContractStatus, string> = { DRAFT: "#94a3b8", SENT: "#60a5fa", SIGNED: "#a78bfa", ACTIVE: "#34d399", EXPIRED: "#fbbf24", TERMINATED: "#f87171" };
const STATUSES: ContractStatus[] = ["DRAFT","SENT","SIGNED","ACTIVE","EXPIRED","TERMINATED"];
const fmt = (v: string | number | null | undefined) => v ? `$${Number(v).toLocaleString()}` : "—";
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function ContractModal({ contract, hospitals, reps, onClose, onSave, onDelete }: {
  contract: Contract | null; hospitals: Hospital[]; reps: Rep[]; onClose: () => void;
  onSave: (d: Partial<Contract>) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const isEdit = !!contract;
  const [form, setForm] = useState<Partial<Contract>>(contract ?? { status: "DRAFT" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: keyof Contract, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "#0d1525", border: `1px solid rgba(0,212,255,0.15)`, borderRadius: 14, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{isEdit ? "Edit Contract" : "New Contract"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem" }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTRACT TITLE *</label>
              <input style={inp} required value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="Service Agreement — FY2026" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>HOSPITAL *</label>
              <select style={sel} required value={form.hospitalId ?? ""} onChange={e => set("hospitalId", e.target.value)}>
                <option value="">— Select Hospital —</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ASSIGNED REP</label>
              <select style={sel} value={form.assignedRepId ?? ""} onChange={e => set("assignedRepId", e.target.value || null)}>
                <option value="">— None —</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATUS</label>
              <select style={sel} value={form.status ?? "DRAFT"} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTRACT VALUE ($)</label>
              <input style={inp} type="number" value={form.value ?? ""} onChange={e => set("value", e.target.value ? Number(e.target.value) : null)} placeholder="125000" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>START DATE</label>
              <input style={inp} type="date" value={form.startDate ? String(form.startDate).slice(0,10) : ""} onChange={e => set("startDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>END DATE</label>
              <input style={inp} type="date" value={form.endDate ? String(form.endDate).slice(0,10) : ""} onChange={e => set("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>FILE / DOC URL</label>
              <input style={inp} value={form.fileUrl ?? ""} onChange={e => set("fileUrl", e.target.value)} placeholder="https://docs.google.com/…" />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>TERMS & NOTES</label>
              <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.terms ?? ""} onChange={e => set("terms", e.target.value)} placeholder="Contract terms, scope of work, special conditions…" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
            <div>
              {isEdit && onDelete && (
                confirmDel
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Delete contract?</span>
                      <button type="button" onClick={onDelete} style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>Confirm</button>
                      <button type="button" onClick={() => setConfirmDel(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmDel(true)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 20px", color: C.muted, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "rgba(0,212,255,0.12)", border: `1px solid rgba(0,212,255,0.25)`, borderRadius: 7, padding: "8px 24px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Contract"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContractsClient({ hospitals, reps }: { hospitals: Hospital[]; reps: Rep[] }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | Contract | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/contracts"); if (r.ok) setContracts(await r.json()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === "ALL" ? contracts : contracts.filter(c => c.status === filterStatus);
  const totalActive = contracts.filter(c => c.status === "ACTIVE").reduce((s, c) => s + (c.value ? Number(c.value) : 0), 0);

  async function handleSave(data: Partial<Contract>) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (ex) await fetch(`/api/contracts/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    else await fetch("/api/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModal(null); await load();
  }

  async function handleDelete() {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (!ex) return;
    await fetch(`/api/contracts/${ex.id}`, { method: "DELETE" });
    setModal(null); await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "rgba(0,212,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>AGREEMENTS</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Contracts</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>{contracts.length} contracts — {fmt(totalActive)} active value</p>
        </div>
        <button onClick={() => setModal("add")} style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 8, padding: "10px 20px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>+ New Contract</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL",...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus === s ? "rgba(0,212,255,0.1)" : C.card, border: `1px solid ${filterStatus === s ? "rgba(0,212,255,0.3)" : C.border}`, borderRadius: 6, padding: "5px 14px", color: filterStatus === s ? C.cyan : C.muted, cursor: "pointer", fontSize: "0.75rem", fontWeight: filterStatus === s ? 700 : 400 }}>{s}</button>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Title","Hospital","Status","Value","Start","End","Rep",""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "rgba(0,212,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: C.muted }}>No contracts. Create one to get started.</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} onClick={() => setModal(c)} style={{ borderBottom: `1px solid rgba(0,212,255,0.04)`, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: "0.875rem", color: C.text }}>{c.title}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: C.muted }}>{c.hospital.hospitalName}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STATUS_CLR[c.status], background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{c.status}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: C.cyan, fontWeight: 600 }}>{fmt(c.value)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: C.muted }}>{fmtDate(c.startDate)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: c.status === "EXPIRED" ? "#fbbf24" : C.muted }}>{fmtDate(c.endDate)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: C.muted }}>{c.assignedRep?.user.name ?? "—"}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: C.cyan }}>Edit →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ContractModal
          contract={modal === "add" ? null : modal}
          hospitals={hospitals} reps={reps}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "add" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
