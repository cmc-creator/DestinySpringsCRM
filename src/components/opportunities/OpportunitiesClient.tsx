"use client";
import { useState, useEffect, useCallback } from "react";
import { ActivityFeedPanel } from "@/components/activities/ActivityFeedPanel";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";

type Stage = "INQUIRY"|"CLINICAL_REVIEW"|"INSURANCE_AUTH"|"ADMITTED"|"ACTIVE"|"DISCHARGED"|"DECLINED"|"ON_HOLD";
type SvcLine = "ADULT_INPATIENT_PSYCH"|"ADOLESCENT_PSYCH"|"GERIATRIC_PSYCH"|"DUAL_DIAGNOSIS"|"DETOX_STABILIZATION"|"CRISIS_STABILIZATION"|"PARTIAL_HOSPITALIZATION"|"INTENSIVE_OUTPATIENT"|"OUTPATIENT_THERAPY"|"MED_MGMT"|"COURT_ORDERED_TREATMENT"|"OTHER";

interface Hospital { id: string; hospitalName: string }
interface Rep { id: string; user: { name: string | null; email: string } }
interface Opp {
  id: string; title: string; description?: string | null;
  hospitalId: string; hospital: { hospitalName: string };
  assignedRepId?: string | null; assignedRep?: { user: { name: string | null } } | null;
  stage: Stage; serviceLine: SvcLine; value?: string | number | null;
  closeDate?: string | null; priority: string; notes?: string | null; lostReason?: string | null;
  createdAt: string; updatedAt?: string; nextFollowUp?: string | null;
}

const C = { card: "var(--nyx-card)", border: "var(--nyx-border)", cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)", input: "var(--nyx-input-bg)" };
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

const STAGES: Stage[] = ["INQUIRY","CLINICAL_REVIEW","INSURANCE_AUTH","ADMITTED","ACTIVE","DISCHARGED","DECLINED","ON_HOLD"];
const STAGE_CLR: Record<Stage, string> = {
  INQUIRY: "#94a3b8", CLINICAL_REVIEW: "#fbbf24", INSURANCE_AUTH: "#f59e0b",
  ADMITTED: "var(--nyx-accent)", ACTIVE: "#60a5fa", DISCHARGED: "#34d399", DECLINED: "#f87171", ON_HOLD: "#a78bfa",
};
const SVC_LINES: SvcLine[] = ["ADULT_INPATIENT_PSYCH","ADOLESCENT_PSYCH","GERIATRIC_PSYCH","DUAL_DIAGNOSIS","DETOX_STABILIZATION","CRISIS_STABILIZATION","PARTIAL_HOSPITALIZATION","INTENSIVE_OUTPATIENT","OUTPATIENT_THERAPY","MED_MGMT","COURT_ORDERED_TREATMENT","OTHER"];
const lbl = (s: string) => s.replace(/_/g, " ");
const fmt = (v: string | number | null | undefined) => v ? `$${Number(v).toLocaleString()}` : "-";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const isStale = (o: Opp) => {
  if (o.stage === "DISCHARGED" || o.stage === "DECLINED" || o.stage === "ON_HOLD") return false;
  const ref = o.updatedAt ?? o.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000 > 14;
};
const staleDays = (o: Opp) => Math.floor((Date.now() - new Date(o.updatedAt ?? o.createdAt).getTime()) / 86_400_000);

function OppModal({ opp, hospitals, reps, onClose, onSave, onDelete }: {
  opp: Opp | null; hospitals: Hospital[]; reps: Rep[]; onClose: () => void;
  onSave: (d: Partial<Opp>) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Opp>>(opp ?? { stage: "INQUIRY", serviceLine: "OTHER", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: keyof Opp, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 16px 32px", overflowY: "auto" }}>
      <div style={{ background: "var(--nyx-bg)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 14, width: "100%", maxWidth: 680, padding: 28, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{opp ? "Edit Opportunity" : "New Opportunity"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem" }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>TITLE *</label>
              <input style={inp} required value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="Revenue Cycle Optimization" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>HOSPITAL *</label>
              <select style={sel} required value={form.hospitalId ?? ""} onChange={e => set("hospitalId", e.target.value)}>
                <option value="">Select Account</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ASSIGNED REP</label>
              <select style={sel} value={form.assignedRepId ?? ""} onChange={e => set("assignedRepId", e.target.value || null)}>
                <option value="">Unassigned</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STAGE</label>
              <select style={sel} value={form.stage ?? "INQUIRY"} onChange={e => set("stage", e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{lbl(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SERVICE LINE</label>
              <select style={sel} value={form.serviceLine ?? "OTHER"} onChange={e => set("serviceLine", e.target.value)}>
                {SVC_LINES.map(s => <option key={s} value={s}>{lbl(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>VALUE ($)</label>
              <input style={inp} type="number" value={form.value ?? ""} onChange={e => set("value", e.target.value ? Number(e.target.value) : null)} placeholder="125000" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>PRIORITY</label>
              <select style={sel} value={form.priority ?? "MEDIUM"} onChange={e => set("priority", e.target.value)}>
                {["LOW","MEDIUM","HIGH","URGENT"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CLOSE DATE</label>
              <input style={inp} type="date" value={form.closeDate ? form.closeDate.slice(0,10) : ""} onChange={e => set("closeDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>DESCRIPTION</label>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.description ?? ""} onChange={e => set("description", e.target.value)} placeholder="Opportunity details…" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>FOLLOW-UP DATE</label>
              <input style={inp} type="date" value={form.nextFollowUp ? form.nextFollowUp.slice(0, 10) : ""} onChange={e => set("nextFollowUp", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>NOTES</label>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Internal notes…" />
            </div>
            {(form.stage === "DECLINED") && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>LOST REASON</label>
                <input style={inp} value={form.lostReason ?? ""} onChange={e => set("lostReason", e.target.value)} placeholder="Why was this admission declined?" />
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 10 }}>
            <div>
              {opp && onDelete && (
                confirmDel
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Delete?</span>
                      <button type="button" onClick={onDelete} style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>Confirm</button>
                      <button type="button" onClick={() => setConfirmDel(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmDel(true)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 20px", color: C.muted, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "var(--nyx-accent-mid)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 7, padding: "8px 24px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving…" : opp ? "Save Changes" : "Create"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OpportunitiesClient({ hospitals, reps }: { hospitals: Hospital[]; reps: Rep[] }) {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const [modal, setModal] = useState<"add" | Opp | null>(null);
  const [activityOpp, setActivityOpp] = useState<Opp | null>(null);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [sortCol, setSortCol] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/opportunities"); if (r.ok) setOpps(await r.json()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Partial<Opp>) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (ex) await fetch(`/api/opportunities/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    else await fetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModal(null); await load();
  }

  async function handleDelete() {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (!ex) return;
    await fetch(`/api/opportunities/${ex.id}`, { method: "DELETE" });
    setModal(null); await load();
  }

  const totalWon = opps.filter(o => o.stage === "DISCHARGED").reduce((s, o) => s + (o.value ? Number(o.value) : 0), 0);
  const pipeline = opps.filter(o => !["DISCHARGED","DECLINED"].includes(o.stage)).reduce((s, o) => s + (o.value ? Number(o.value) : 0), 0);

  const filtered = opps.filter(o => {
    const matchStage = filterStage === "ALL" || o.stage === filterStage;
    const q = search.toLowerCase();
    const matchSearch = !q || o.title.toLowerCase().includes(q) || o.hospital.hospitalName.toLowerCase().includes(q) || (o.assignedRep?.user.name ?? "").toLowerCase().includes(q);
    return matchStage && matchSearch;
  });

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sorted = [...filtered].sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0;
    if (sortCol === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
    else if (sortCol === "value") { av = a.value ? Number(a.value) : 0; bv = b.value ? Number(b.value) : 0; }
    else if (sortCol === "priority") { const order = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }; av = order[a.priority as keyof typeof order] ?? 0; bv = order[b.priority as keyof typeof order] ?? 0; }
    else if (sortCol === "createdAt") { av = a.createdAt; bv = b.createdAt; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div>
      {/* AI Insights */}
      <div style={{ marginBottom: 20 }}>
        <AIInsightsPanel role="admin" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>PIPELINE</p>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Admissions</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Search + Stage filter */}
          <input
            style={{ ...inp, width: 240 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search title, hospital…"
          />
          <select style={{ ...sel, width: "auto", minWidth: 150 }} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
            <option value="ALL">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{lbl(s)}</option>)}
          </select>
          {(search || filterStage !== "ALL") && (
            <button onClick={() => { setSearch(""); setFilterStage("ALL"); }}
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, padding: "7px 12px", color: "#f87171", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              ✕ Clear
            </button>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: C.cyan }}>{fmt(pipeline)}</div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>Pipeline</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#34d399" }}>{fmt(totalWon)}</div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>Won</div>
            </div>
          </div>
          <div style={{ display: "flex", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            {(["kanban","list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 14px", background: view === v ? "var(--nyx-accent-dim)" : "none", border: "none", color: view === v ? C.cyan : C.muted, cursor: "pointer", fontSize: "0.78rem", fontWeight: view === v ? 700 : 400 }}>{v === "kanban" ? "Kanban" : "List"}</button>
            ))}
          </div>
          <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "9px 18px", color: C.cyan, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>+ New</button>
        </div>
      </div>

      {loading && <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading…</div>}

      {!loading && view === "kanban" && (
        <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const items = filtered.filter(o => o.stage === stage);
            const color = STAGE_CLR[stage];
            return (
              <div key={stage} style={{ minWidth: 230, flex: "0 0 230px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{lbl(stage)}</span>
                  <span style={{ fontSize: "0.68rem", background: `${color}18`, color, padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>{items.length}</span>
                </div>
                <button onClick={() => setModal("add")} style={{ width: "100%", background: "none", border: `1px dashed ${C.border}`, borderRadius: 8, padding: "8px", color: C.muted, cursor: "pointer", fontSize: "0.75rem", marginBottom: 8 }}>+ Add</button>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map(opp => (
                    <div key={opp.id} onClick={() => setModal(opp)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}44`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text }}>{opp.title}</span>
                        {isStale(opp) && <span title={`${staleDays(opp)}d no update`} style={{ fontSize: "0.55rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 3, padding: "1px 4px", whiteSpace: "nowrap" }}>STALE</span>}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 6 }}>{opp.hospital.hospitalName}</div>
                      {opp.value && <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.cyan }}>{fmt(opp.value)}</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        {opp.assignedRep && <div style={{ fontSize: "0.65rem", color: C.muted }}>👤 {opp.assignedRep.user.name}</div>}
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: opp.priority === "URGENT" ? "#f87171" : opp.priority === "HIGH" ? "#fbbf24" : C.muted }}>{opp.priority}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActivityOpp(opp); }}
                        style={{ marginTop: 8, width: "100%", background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 5, padding: "4px", color: C.cyan, cursor: "pointer", fontSize: "0.65rem", fontWeight: 700 }}
                      >
                        📋 Activity
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ padding: 12, fontSize: "0.75rem", color: "rgba(216,232,244,0.15)", textAlign: "center", border: `1px dashed var(--nyx-accent-dim)`, borderRadius: 8 }}>Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
          <p className="nyx-kanban-swipe-hint">← swipe to see more columns →</p>
        </div>
      )}

      {!loading && view === "list" && (
        <div className="gold-card" style={{ borderRadius: 12 }}>
        <div style={{ background: C.card, borderRadius: 12, overflow: "visible" }}>
        <div className="nyx-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {[
                  { col: "title", label: "Title" },
                  { col: null, label: "Hospital" },
                  { col: null, label: "Stage" },
                  { col: null, label: "Service Line" },
                  { col: "value", label: "Value" },
                  { col: null, label: "Rep" },
                  { col: "priority", label: "Priority" },
                  { col: null, label: "Next Follow-up" },
                  { col: null, label: "edit" },
                  { col: null, label: "activity" },
                ].map(({ col, label }) => col ? (
                  <th key={label} onClick={() => toggleSort(col)}
                    style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: sortCol === col ? "var(--nyx-accent)" : "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", userSelect: "none" }}>
                    {label}{sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : <span style={{ opacity: 0.3 }}> ⇅</span>}
                  </th>
                ) : (
                  <th key={label} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opps.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: C.muted }}>No opportunities yet.</td></tr>}
              {sorted.map(opp => (
                <tr key={opp.id} onClick={() => setModal(opp)} style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: C.text }}>{opp.title}</span>
                    {isStale(opp) && <span title={`${staleDays(opp)}d no update`} style={{ fontSize: "0.6rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>STALE {staleDays(opp)}d</span>}
                  </div>
                </td>
                  <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: C.muted }}>{opp.hospital.hospitalName}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STAGE_CLR[opp.stage], background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>{lbl(opp.stage)}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: C.muted }}>{lbl(opp.serviceLine)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: C.cyan, fontWeight: 600 }}>{fmt(opp.value)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: C.muted }}>{opp.assignedRep?.user.name ?? "-"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "0.68rem", fontWeight: 700, color: opp.priority === "URGENT" ? "#f87171" : opp.priority === "HIGH" ? "#fbbf24" : C.muted }}>{opp.priority}</td>
                  <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: opp.nextFollowUp && new Date(opp.nextFollowUp) < new Date() ? "#f87171" : C.muted, whiteSpace: "nowrap" }}>
                    {opp.nextFollowUp ? fmtDate(opp.nextFollowUp) : <span style={{ opacity: 0.4 }}>--</span>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: C.cyan }}>Edit →</td>
                  <td style={{ padding: "12px 8px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActivityOpp(opp); }}
                      style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "4px 10px", color: C.cyan, cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      📋 Activity
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </div>
        </div>
      )}

      {activityOpp && (
        <ActivityFeedPanel
          entityId={activityOpp.id}
          entityParam="opportunityId"
          entityName={activityOpp.title}
          entitySubtitle={activityOpp.hospital.hospitalName}
          onClose={() => setActivityOpp(null)}
        />
      )}

      {modal !== null && (
        <OppModal
          opp={modal === "add" ? null : modal}
          hospitals={hospitals} reps={reps}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "add" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
