"use client";
import { useState, useEffect, useCallback } from "react";

type InvoiceStatus = "DRAFT"|"SENT"|"PAID"|"OVERDUE"|"VOID";
interface Hospital { id: string; hospitalName: string }
interface Invoice {
  id: string; invoiceNumber: string;
  hospitalId: string; hospital: { hospitalName: string };
  opportunityId?: string | null;
  status: InvoiceStatus; totalAmount: string | number;
  dueDate?: string | null; paidAt?: string | null;
  notes?: string | null; lineItems?: LineItem[] | null;
  createdAt: string;
}

const C = { card: "var(--nyx-card)", border: "var(--nyx-border)", cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)", input: "var(--nyx-input-bg)" };
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

const STATUS_CLR: Record<InvoiceStatus, string> = { DRAFT: "#94a3b8", SENT: "#60a5fa", PAID: "#34d399", OVERDUE: "#f87171", VOID: "#475569" };
const STATUSES: InvoiceStatus[] = ["DRAFT","SENT","PAID","OVERDUE","VOID"];
const fmt = (v: string | number | null | undefined) => v ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00";
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const genInvoiceNum = () => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`;

interface LineItem { description: string; qty: number; unitPrice: number }

function InvoiceModal({ invoice, hospitals, onClose, onSave, onDelete }: {
  invoice: Invoice | null; hospitals: Hospital[]; onClose: () => void;
  onSave: (d: Partial<Invoice>) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const isEdit = !!invoice;
  const [form, setForm] = useState<Partial<Invoice>>({
    invoiceNumber: invoice?.invoiceNumber ?? genInvoiceNum(),
    hospitalId: invoice?.hospitalId ?? "",
    status: invoice?.status ?? "DRAFT",
    totalAmount: invoice?.totalAmount ?? 0,
    dueDate: invoice?.dueDate ?? null,
    paidAt: invoice?.paidAt ?? null,
    notes: invoice?.notes ?? "",
    lineItems: (invoice?.lineItems as LineItem[] ?? null),
  });
  const [lines, setLines] = useState<LineItem[]>((invoice?.lineItems as LineItem[]) ?? [{ description: "", qty: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: keyof Invoice, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const total = lines.reduce((s, l) => s + (l.qty * l.unitPrice), 0);

  function updateLine(i: number, k: keyof LineItem, v: string | number) {
    const updated = lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l);
    setLines(updated);
    setForm(f => ({ ...f, totalAmount: updated.reduce((s, l) => s + l.qty * Number(l.unitPrice), 0), lineItems: updated }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await onSave({ ...form, totalAmount: total, lineItems: lines }); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "#0d1525", border: `1px solid var(--nyx-accent-mid)`, borderRadius: 14, width: "100%", maxWidth: 700, maxHeight: "92vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{isEdit ? "Edit Invoice" : "Create Invoice"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem" }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>INVOICE #</label>
              <input style={inp} required value={form.invoiceNumber ?? ""} onChange={e => set("invoiceNumber", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATUS</label>
              <select style={sel} value={form.status ?? "DRAFT"} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>HOSPITAL *</label>
              <select style={sel} required value={form.hospitalId ?? ""} onChange={e => set("hospitalId", e.target.value)}>
                <option value="">— Select Hospital —</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>DUE DATE</label>
              <input style={inp} type="date" value={form.dueDate ? String(form.dueDate).slice(0,10) : ""} onChange={e => set("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            {form.status === "PAID" && (
              <div>
                <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>PAID DATE</label>
                <input style={inp} type="date" value={form.paidAt ? String(form.paidAt).slice(0,10) : ""} onChange={e => set("paidAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
            )}

            {/* Line Items */}
            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Line Items</p>
                <button type="button" onClick={() => setLines(l => [...l, { description: "", qty: 1, unitPrice: 0 }])} style={{ background: "var(--nyx-accent-dim)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 6, padding: "4px 10px", color: C.cyan, cursor: "pointer", fontSize: "0.75rem" }}>+ Line</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 100px 32px", gap: 6, marginBottom: 8 }}>
                {["DESCRIPTION","QTY","UNIT PRICE",""].map(h => <div key={h} style={{ fontSize: "0.65rem", color: C.muted, fontWeight: 700 }}>{h}</div>)}
              </div>
              {lines.map((line, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 100px 32px", gap: 6, marginBottom: 6 }}>
                  <input style={inp} value={line.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Service description" />
                  <input style={{ ...inp, textAlign: "center" }} type="number" min="1" value={line.qty} onChange={e => updateLine(i, "qty", Number(e.target.value))} />
                  <input style={inp} type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => updateLine(i, "unitPrice", Number(e.target.value))} />
                  <button type="button" onClick={() => { const n = lines.filter((_,j) => j !== i); setLines(n); }} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: "0.9rem" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <div style={{ background: "var(--nyx-accent-dim)", border: `1px solid var(--nyx-accent-mid)`, borderRadius: 8, padding: "10px 20px", textAlign: "right" }}>
                  <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 2 }}>TOTAL</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: C.cyan }}>{fmt(total)}</div>
                </div>
              </div>
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>NOTES</label>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Payment terms, special notes…" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
            <div>
              {isEdit && onDelete && (
                confirmDel
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Delete invoice?</span>
                      <button type="button" onClick={onDelete} style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>Confirm</button>
                      <button type="button" onClick={() => setConfirmDel(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmDel(true)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 20px", color: C.muted, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "var(--nyx-accent-mid)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 7, padding: "8px 24px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Invoice"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvoicesClient({ hospitals }: { hospitals: Hospital[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/invoices"); if (r.ok) setInvoices(await r.json()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === "ALL" ? invoices : invoices.filter(i => i.status === filterStatus);
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalOutstanding = invoices.filter(i => ["SENT","OVERDUE"].includes(i.status)).reduce((s, i) => s + Number(i.totalAmount), 0);

  async function handleSave(data: Partial<Invoice>) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (ex) await fetch(`/api/invoices/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    else await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModal(null); await load();
  }

  async function handleDelete() {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (!ex) return;
    await fetch(`/api/invoices/${ex.id}`, { method: "DELETE" });
    setModal(null); await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>BILLING</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Invoices</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>{invoices.length} invoices</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, color: "#34d399" }}>{fmt(totalPaid)}</div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>Collected</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, color: "#fbbf24" }}>{fmt(totalOutstanding)}</div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>Outstanding</div>
          </div>
          <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "9px 18px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>+ New Invoice</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL",...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus === s ? "var(--nyx-accent-dim)" : C.card, border: `1px solid ${filterStatus === s ? "var(--nyx-accent-str)" : C.border}`, borderRadius: 6, padding: "5px 14px", color: filterStatus === s ? C.cyan : C.muted, cursor: "pointer", fontSize: "0.75rem", fontWeight: filterStatus === s ? 700 : 400 }}>{s}</button>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Invoice #","Hospital","Status","Total","Due Date","Paid","Created",""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: C.muted }}>No invoices. Create one to get started.</td></tr>}
            {filtered.map(inv => (
              <tr key={inv.id} onClick={() => setModal(inv)} style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.85rem", color: C.cyan }}>{inv.invoiceNumber}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: C.text }}>{inv.hospital.hospitalName}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STATUS_CLR[inv.status], background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{inv.status}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: C.text, fontWeight: 600 }}>{fmt(inv.totalAmount)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: inv.status === "OVERDUE" ? "#f87171" : C.muted }}>{fmtDate(inv.dueDate)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: "#34d399" }}>{fmtDate(inv.paidAt)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: C.muted }}>{fmtDate(inv.createdAt)}</td>
                <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: C.cyan }}>Edit →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <InvoiceModal
          invoice={modal === "add" ? null : modal}
          hospitals={hospitals}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "add" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
