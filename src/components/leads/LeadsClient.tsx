"use client";
import { useState, useEffect, useCallback } from "react";

// ── Types ───────────────────────────────────────────────
type LeadStatus = "NEW"|"CONTACTED"|"QUALIFIED"|"PROPOSAL_SENT"|"NEGOTIATING"|"WON"|"LOST"|"UNQUALIFIED";
type LeadSource = "REFERRAL"|"COLD_OUTREACH"|"CONFERENCE"|"INBOUND"|"LINKEDIN"|"WEBINAR"|"EXISTING_RELATIONSHIP"|"OTHER";
type HospitalType = "ACUTE_CARE"|"CRITICAL_ACCESS"|"SPECIALTY"|"HEALTH_SYSTEM"|"AMBULATORY"|"LONG_TERM_CARE"|"BEHAVIORAL_HEALTH"|"REHABILITATION"|"CHILDRENS"|"CANCER_CENTER"|"OTHER";

interface Rep { id: string; user: { name: string | null; email: string } }
interface Lead {
  id: string; hospitalName: string; systemName?: string | null; hospitalType?: HospitalType | null;
  bedCount?: number | null; state?: string | null; city?: string | null;
  contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null; contactTitle?: string | null;
  serviceInterest?: string | null; estimatedValue?: string | number | null; notes?: string | null;
  status: LeadStatus; source: LeadSource; priority: string;
  assignedRepId?: string | null; assignedRep?: { user: { name: string | null } } | null;
  createdAt: string;
}

// ── Constants ───────────────────────────────────────────
const C = { bg: "#0a0f1a", card: "var(--nyx-card)", border: "var(--nyx-border)", cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)", input: "var(--nyx-input-bg)" };

const STATUS_COLOR: Record<LeadStatus, string> = {
  NEW: "var(--nyx-accent)", CONTACTED: "#fbbf24", QUALIFIED: "#f59e0b",
  PROPOSAL_SENT: "#60a5fa", NEGOTIATING: "#a78bfa", WON: "#34d399", LOST: "#f87171", UNQUALIFIED: "#94a3b8",
};
const STATUSES: LeadStatus[] = ["NEW","CONTACTED","QUALIFIED","PROPOSAL_SENT","NEGOTIATING","WON","LOST","UNQUALIFIED"];
const SOURCES: LeadSource[] = ["REFERRAL","COLD_OUTREACH","CONFERENCE","INBOUND","LINKEDIN","WEBINAR","EXISTING_RELATIONSHIP","OTHER"];
const H_TYPES: HospitalType[] = ["ACUTE_CARE","CRITICAL_ACCESS","SPECIALTY","HEALTH_SYSTEM","AMBULATORY","LONG_TERM_CARE","BEHAVIORAL_HEALTH","REHABILITATION","CHILDRENS","CANCER_CENTER","OTHER"];
const PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"];

const fmt = (v: string | number | null | undefined) => v ? `$${Number(v).toLocaleString()}` : "—";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const lbl = (s: string) => s.replace(/_/g, " ");

// ── Shared input style ──────────────────────────────────
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

// ── Modal ───────────────────────────────────────────────
function LeadModal({ lead, reps, onClose, onSave, onDelete }: {
  lead: Lead | null; reps: Rep[]; onClose: () => void;
  onSave: (data: Partial<Lead>) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const isEdit = !!lead;
  const [form, setForm] = useState<Partial<Lead>>(lead ?? { status: "NEW", source: "OTHER", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const set = (k: keyof Lead, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  async function doDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 16px 32px", overflowY: "auto" }}>
      <div style={{ background: "var(--nyx-bg)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 14, width: "100%", maxWidth: 680, padding: 28, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{isEdit ? "Edit Lead" : "New Lead"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>HOSPITAL NAME *</label>
              <input style={inp} required value={form.hospitalName ?? ""} onChange={e => set("hospitalName", e.target.value)} placeholder="Saint Mary's Medical Center" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SYSTEM NAME</label>
              <input style={inp} value={form.systemName ?? ""} onChange={e => set("systemName", e.target.value)} placeholder="Health System Name" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>HOSPITAL TYPE</label>
              <select style={sel} value={form.hospitalType ?? "ACUTE_CARE"} onChange={e => set("hospitalType", e.target.value)}>
                {H_TYPES.map(t => <option key={t} value={t}>{lbl(t)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CITY</label>
              <input style={inp} value={form.city ?? ""} onChange={e => set("city", e.target.value)} placeholder="Nashville" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATE</label>
              <input style={inp} value={form.state ?? ""} onChange={e => set("state", e.target.value)} placeholder="TN" maxLength={2} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>BED COUNT</label>
              <input style={inp} type="number" value={form.bedCount ?? ""} onChange={e => set("bedCount", e.target.value ? Number(e.target.value) : null)} placeholder="250" />
            </div>

            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Primary Contact</p>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT NAME</label>
              <input style={inp} value={form.contactName ?? ""} onChange={e => set("contactName", e.target.value)} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT TITLE</label>
              <input style={inp} value={form.contactTitle ?? ""} onChange={e => set("contactTitle", e.target.value)} placeholder="Chief Medical Officer" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT EMAIL</label>
              <input style={inp} type="email" value={form.contactEmail ?? ""} onChange={e => set("contactEmail", e.target.value)} placeholder="jsmith@hospital.org" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT PHONE</label>
              <input style={inp} value={form.contactPhone ?? ""} onChange={e => set("contactPhone", e.target.value)} placeholder="(615) 555-0100" />
            </div>

            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Pipeline Details</p>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATUS</label>
              <select style={sel} value={form.status ?? "NEW"} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{lbl(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SOURCE</label>
              <select style={sel} value={form.source ?? "OTHER"} onChange={e => set("source", e.target.value)}>
                {SOURCES.map(s => <option key={s} value={s}>{lbl(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>PRIORITY</label>
              <select style={sel} value={form.priority ?? "MEDIUM"} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ESTIMATED VALUE ($)</label>
              <input style={inp} type="number" value={form.estimatedValue ?? ""} onChange={e => set("estimatedValue", e.target.value ? Number(e.target.value) : null)} placeholder="125000" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ASSIGNED REP</label>
              <select style={sel} value={form.assignedRepId ?? ""} onChange={e => set("assignedRepId", e.target.value || null)}>
                <option value="">— Unassigned —</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SERVICE INTEREST</label>
              <input style={inp} value={form.serviceInterest ?? ""} onChange={e => set("serviceInterest", e.target.value)} placeholder="Revenue Cycle, Telehealth..." />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>NOTES</label>
              <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 10 }}>
            <div>
              {isEdit && onDelete && (
                confirmDel
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Delete this lead?</span>
                      <button type="button" onClick={doDelete} disabled={deleting} style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>{deleting ? "…" : "Confirm"}</button>
                      <button type="button" onClick={() => setConfirmDel(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmDel(true)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 20px", color: C.muted, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "var(--nyx-accent-mid)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 7, padding: "8px 24px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Lead"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────
export default function LeadsClient({ reps }: { reps: Rep[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [modal, setModal] = useState<"add" | Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (res.ok) setLeads(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    const matchStatus = filterStatus === "ALL" || l.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || l.hospitalName.toLowerCase().includes(q) || (l.contactName ?? "").toLowerCase().includes(q) || (l.state ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  async function handleSave(data: Partial<Lead>) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    // Strip relation objects and computed fields — only send scalars to API
    const { assignedRep: _ar, id: _id, createdAt: _ca, ...payload } = data as Partial<Lead> & { assignedRep?: unknown; id?: unknown; createdAt?: unknown };
    try {
      const res = ex
        ? await fetch(`/api/leads/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Lead save failed:", err);
        alert(`Failed to save lead: ${err?.error ?? res.statusText}`);
        return;
      }
    } catch (e) {
      console.error("Lead save error:", e);
      alert("Network error — could not save lead.");
      return;
    }
    setModal(null);
    await load();
  }

  async function handleDelete() {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (!ex) return;
    await fetch(`/api/leads/${ex.id}`, { method: "DELETE" });
    setModal(null);
    await load();
  }

  const counts = STATUSES.reduce((acc, s) => { acc[s] = leads.filter(l => l.status === s).length; return acc; }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>PIPELINE</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Lead Pipeline</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>{leads.length} total leads</p>
        </div>
        <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 20px", color: C.cyan, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
          + New Lead
        </button>
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "ALL" : s)}
            style={{ background: filterStatus === s ? `rgba(${hexToRgb(STATUS_COLOR[s])},0.12)` : C.card, border: `1px solid ${filterStatus === s ? STATUS_COLOR[s] + "44" : C.border}`, borderRadius: 20, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STATUS_COLOR[s] }}>{lbl(s)}</span>
            <span style={{ fontSize: "0.65rem", background: "rgba(0,0,0,0.3)", color: C.muted, borderRadius: 10, padding: "1px 6px" }}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input style={{ ...inp, maxWidth: 360 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hospital, contact, state…" />
      </div>

      {/* Table */}
      <div className="gold-card" style={{ borderRadius: 12 }}>
        <div style={{ background: C.card, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Hospital", "Contact", "Status", "Priority", "Source", "Est. Value", "Rep", "Created", ""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: C.muted }}>No leads match your filters.</td></tr>}
            {filtered.map(lead => (
              <tr key={lead.id} onClick={() => setModal(lead)} style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "13px 14px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: C.text }}>{lead.hospitalName}</div>
                  {lead.state && <div style={{ fontSize: "0.7rem", color: C.muted }}>{lead.city ? `${lead.city}, ` : ""}{lead.state}</div>}
                </td>
                <td style={{ padding: "13px 14px" }}>
                  <div style={{ fontSize: "0.82rem", color: C.text }}>{lead.contactName ?? "—"}</div>
                  <div style={{ fontSize: "0.7rem", color: C.muted }}>{lead.contactTitle ?? ""}</div>
                </td>
                <td style={{ padding: "13px 14px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STATUS_COLOR[lead.status], background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{lbl(lead.status)}</span>
                </td>
                <td style={{ padding: "13px 14px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: lead.priority === "URGENT" ? "#f87171" : lead.priority === "HIGH" ? "#fbbf24" : lead.priority === "LOW" ? "#94a3b8" : C.muted }}>{lead.priority}</span>
                </td>
                <td style={{ padding: "13px 14px", fontSize: "0.78rem", color: C.muted }}>{lbl(lead.source)}</td>
                <td style={{ padding: "13px 14px", fontSize: "0.85rem", color: C.cyan, fontWeight: 600 }}>{fmt(lead.estimatedValue)}</td>
                <td style={{ padding: "13px 14px", fontSize: "0.78rem", color: C.muted }}>{lead.assignedRep?.user.name ?? "Unassigned"}</td>
                <td style={{ padding: "13px 14px", fontSize: "0.75rem", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(lead.createdAt)}</td>
                <td style={{ padding: "13px 14px" }}>
                  <span style={{ fontSize: "0.75rem", color: C.cyan, opacity: 0 }} className="edit-hint">Edit →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {modal !== null && (
        <LeadModal
          lead={modal === "add" ? null : modal}
          reps={reps}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "add" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  if (!hex.startsWith("#")) return "120,100,50"; // fallback for CSS vars
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
