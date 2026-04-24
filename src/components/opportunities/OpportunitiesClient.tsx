"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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

// ── Color tokens ──
const C = {
  card: "var(--nyx-card)", border: "var(--nyx-border)", cyan: "var(--nyx-accent)",
  text: "var(--nyx-text)", muted: "var(--nyx-text-muted)", input: "var(--nyx-input-bg)",
};
const inp: React.CSSProperties = {
  width: "100%", background: "var(--nyx-input-bg)", border: "1px solid var(--nyx-border)", borderRadius: 7,
  padding: "8px 12px", color: "var(--nyx-text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, appearance: "none" };

// ── Stage definitions ──
const ACTIVE_STAGES: Stage[] = ["INQUIRY","CLINICAL_REVIEW","INSURANCE_AUTH","ADMITTED","ACTIVE"];
const TERMINAL_STAGES: Stage[] = ["DISCHARGED","DECLINED","ON_HOLD"];
const ALL_STAGES: Stage[] = [...ACTIVE_STAGES, ...TERMINAL_STAGES];
const STAGE_LABEL: Record<Stage, string> = {
  INQUIRY: "Inquiry", CLINICAL_REVIEW: "Clinical Review", INSURANCE_AUTH: "Insurance Auth",
  ADMITTED: "Admitted", ACTIVE: "Active", DISCHARGED: "Discharged",
  DECLINED: "Declined", ON_HOLD: "On Hold",
};
const STAGE_CLR: Record<Stage, string> = {
  INQUIRY: "#94a3b8", CLINICAL_REVIEW: "#fbbf24", INSURANCE_AUTH: "#f59e0b",
  ADMITTED: "var(--nyx-accent)", ACTIVE: "#60a5fa", DISCHARGED: "#34d399",
  DECLINED: "#f87171", ON_HOLD: "#a78bfa",
};
const PRIORITY_CLR: Record<string, string> = { URGENT: "#f87171", HIGH: "#fbbf24", MEDIUM: "#60a5fa", LOW: "#94a3b8" };
const SVC_LINES: SvcLine[] = ["ADULT_INPATIENT_PSYCH","ADOLESCENT_PSYCH","GERIATRIC_PSYCH","DUAL_DIAGNOSIS","DETOX_STABILIZATION","CRISIS_STABILIZATION","PARTIAL_HOSPITALIZATION","INTENSIVE_OUTPATIENT","OUTPATIENT_THERAPY","MED_MGMT","COURT_ORDERED_TREATMENT","OTHER"];

const fmt = (v: string | number | null | undefined) => v ? `$${Number(v).toLocaleString()}` : "-";
const fmtK = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v/1_000).toFixed(0)}K` : `$${v}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
const isStale = (o: Opp) => {
  if (["DISCHARGED","DECLINED","ON_HOLD"].includes(o.stage)) return false;
  return daysAgo(o.updatedAt ?? o.createdAt) > 14;
};
const daysInStage = (o: Opp) => daysAgo(o.updatedAt ?? o.createdAt);

const labelStyle: React.CSSProperties = {
  fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)",
  display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase",
};

// ── OppModal ─────────────────────────────────────────────────────────────────
function OppModal({ opp, hospitals, reps, onClose, onSave, onDelete, defaultStage }: {
  opp: Opp | null; hospitals: Hospital[]; reps: Rep[]; onClose: () => void;
  onSave: (d: Partial<Opp>) => Promise<void>; onDelete?: () => Promise<void>;
  defaultStage?: Stage;
}) {
  const [form, setForm] = useState<Partial<Opp>>(
    opp ?? { stage: defaultStage ?? "INQUIRY", serviceLine: "OTHER", priority: "MEDIUM" }
  );
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: keyof Opp, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const isNew = !opp;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px 16px", overflowY: "auto" }}>
      <div style={{ background: "var(--nyx-bg)", border: "1px solid var(--nyx-accent-str)", borderRadius: 16, width: "100%", maxWidth: 700, padding: 32, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>{isNew ? "NEW ADMISSION" : "EDIT ADMISSION"}</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--nyx-text)", margin: 0 }}>{opp?.title || "New Opportunity"}</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--nyx-border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}>x</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Patient / Opportunity Name *</label>
              <input style={inp} required value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="e.g. John D. - Adult Inpatient Psych" />
            </div>
            <div>
              <label style={labelStyle}>Referring Account *</label>
              <select style={sel} required value={form.hospitalId ?? ""} onChange={e => set("hospitalId", e.target.value)}>
                <option value="">Select Account</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assigned Rep</label>
              <select style={sel} value={form.assignedRepId ?? ""} onChange={e => set("assignedRepId", e.target.value || null)}>
                <option value="">Unassigned</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Stage</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ALL_STAGES.map(s => (
                  <button key={s} type="button" onClick={() => set("stage", s)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${form.stage === s ? STAGE_CLR[s] : "var(--nyx-border)"}`, background: form.stage === s ? `${STAGE_CLR[s]}18` : "rgba(0,0,0,0.2)", color: form.stage === s ? STAGE_CLR[s] : "var(--nyx-text-muted)", fontSize: "0.7rem", fontWeight: form.stage === s ? 800 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Service Line</label>
              <select style={sel} value={form.serviceLine ?? "OTHER"} onChange={e => set("serviceLine", e.target.value as SvcLine)}>
                {SVC_LINES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["LOW","MEDIUM","HIGH","URGENT"].map(p => (
                  <button key={p} type="button" onClick={() => set("priority", p)}
                    style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: `1px solid ${form.priority === p ? PRIORITY_CLR[p] : "var(--nyx-border)"}`, background: form.priority === p ? `${PRIORITY_CLR[p]}18` : "rgba(0,0,0,0.2)", color: form.priority === p ? PRIORITY_CLR[p] : "var(--nyx-text-muted)", fontSize: "0.68rem", fontWeight: form.priority === p ? 800 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Estimated Value ($)</label>
              <input style={inp} type="number" value={form.value ?? ""} onChange={e => set("value", e.target.value ? Number(e.target.value) : null)} placeholder="125000" />
            </div>
            <div>
              <label style={labelStyle}>Next Follow-up</label>
              <input style={inp} type="date" value={form.nextFollowUp ? form.nextFollowUp.slice(0,10) : ""} onChange={e => set("nextFollowUp", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div>
              <label style={labelStyle}>Target Close Date</label>
              <input style={inp} type="date" value={form.closeDate ? form.closeDate.slice(0,10) : ""} onChange={e => set("closeDate", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Clinical context, payer notes, referral details..." />
            </div>
            {form.stage === "DECLINED" && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Decline Reason</label>
                <input style={inp} value={form.lostReason ?? ""} onChange={e => set("lostReason", e.target.value)} placeholder="Why was this admission declined?" />
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, gap: 12 }}>
            <div>
              {opp && onDelete && (
                confirmDel
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Delete?</span>
                      <button type="button" onClick={onDelete} style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "7px 16px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>Confirm Delete</button>
                      <button type="button" onClick={() => setConfirmDel(false)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 6, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmDel(true)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, padding: "8px 16px", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 8, padding: "9px 22px", color: "var(--nyx-text-muted)", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "9px 28px", color: "var(--nyx-accent)", cursor: "pointer", fontWeight: 800, fontSize: "0.875rem", minWidth: 120 }}>
                {saving ? "Saving..." : isNew ? "Create Opportunity" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Quick stage picker ───────────────────────────────────────────────────────
function StageQuickPick({ opp, onStageChange }: { opp: Opp; onStageChange: (s: Stage) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ display: "flex", alignItems: "center", gap: 4, background: `${STAGE_CLR[opp.stage]}14`, border: `1px solid ${STAGE_CLR[opp.stage]}40`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: "0.62rem", fontWeight: 700, color: STAGE_CLR[opp.stage], whiteSpace: "nowrap" }}>
        {STAGE_LABEL[opp.stage]}
        <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3l3 4 3-4"/></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--nyx-card)", border: "1px solid var(--nyx-accent-str)", borderRadius: 10, zIndex: 99, minWidth: 160, padding: 6, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          {ALL_STAGES.map(s => (
            <button key={s} onClick={e => { e.stopPropagation(); onStageChange(s); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: s === opp.stage ? `${STAGE_CLR[s]}18` : "none", border: "none", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: "0.75rem", fontWeight: s === opp.stage ? 800 : 500, color: s === opp.stage ? STAGE_CLR[s] : "var(--nyx-text)", textAlign: "left" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_CLR[s], flexShrink: 0 }} />
              {STAGE_LABEL[s]}
              {s === opp.stage && <span style={{ marginLeft: "auto", fontSize: "0.58rem", opacity: 0.5 }}>current</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ opp, onEdit, onActivity, onStageChange, dragging }: {
  opp: Opp; onEdit: () => void; onActivity: () => void;
  onStageChange: (s: Stage) => void; dragging: boolean;
}) {
  const stale = isStale(opp);
  const days = daysInStage(opp);
  const overdue = opp.nextFollowUp && new Date(opp.nextFollowUp) < new Date();
  const repInitials = opp.assignedRep?.user.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const stageColor = STAGE_CLR[opp.stage];
  return (
    <div draggable
      onDragStart={e => { e.dataTransfer.setData("oppId", opp.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={onEdit}
      style={{
        background: "var(--nyx-card)", border: "1px solid var(--nyx-border)",
        borderLeft: `3px solid ${stageColor}`, borderRadius: "0 10px 10px 0",
        padding: "12px 14px", cursor: "pointer", opacity: dragging ? 0.4 : 1,
        transition: "transform 0.15s, box-shadow 0.15s", userSelect: "none",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.35), 0 0 0 1px ${stageColor}30`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
        <div style={{ flex: 1, fontSize: "0.83rem", fontWeight: 700, color: "var(--nyx-text)", lineHeight: 1.3 }}>{opp.title}</div>
        {stale && <span title={`${days}d since last update`} style={{ fontSize: "0.55rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap", flexShrink: 0 }}>{days}d STALE</span>}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--nyx-text-muted)", marginBottom: 8 }}>{opp.hospital.hospitalName}</div>
      {(opp.value || opp.serviceLine) && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          {opp.value && <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--nyx-accent)" }}>{fmt(opp.value)}</span>}
          <span style={{ fontSize: "0.62rem", color: "var(--nyx-text-muted)", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 6px" }}>{opp.serviceLine.replace(/_/g, " ")}</span>
        </div>
      )}
      {opp.nextFollowUp && (
        <div style={{ fontSize: "0.68rem", color: overdue ? "#f87171" : "var(--nyx-text-muted)", background: overdue ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.04)", borderRadius: 5, padding: "3px 7px", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
          {overdue ? "! " : ""}{fmtDate(opp.nextFollowUp)}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {opp.assignedRep && (
            <div title={opp.assignedRep.user.name ?? "Rep"} style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58rem", fontWeight: 800, color: "var(--nyx-accent)", flexShrink: 0 }}>
              {repInitials}
            </div>
          )}
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: PRIORITY_CLR[opp.priority] ?? "var(--nyx-text-muted)" }}>{opp.priority}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          <StageQuickPick opp={opp} onStageChange={onStageChange} />
          <button onClick={e => { e.stopPropagation(); onActivity(); }}
            title="Log Activity"
            style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 5, padding: "3px 7px", color: "var(--nyx-accent)", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700 }}>
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ stage, opps, onEdit, onActivity, onStageChange, onDrop, onAddClick, draggingId }: {
  stage: Stage; opps: Opp[]; onEdit: (o: Opp) => void; onActivity: (o: Opp) => void;
  onStageChange: (opp: Opp, s: Stage) => void; onDrop: (oppId: string, newStage: Stage) => void;
  onAddClick: (stage: Stage) => void; draggingId: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  const color = STAGE_CLR[stage];
  const colValue = opps.reduce((s, o) => s + (o.value ? Number(o.value) : 0), 0);
  return (
    <div style={{ minWidth: 240, width: 240, flexShrink: 0, display: "flex", flexDirection: "column" }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const id = e.dataTransfer.getData("oppId"); if (id) onDrop(id, stage); }}>
      <div style={{ background: dragOver ? `${color}10` : "transparent", borderRadius: "10px 10px 0 0", border: `1px solid ${dragOver ? color : "var(--nyx-border)"}`, borderBottom: "none", padding: "12px 14px", transition: "all 0.15s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}66` }} />
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{STAGE_LABEL[stage]}</span>
          </div>
          <span style={{ fontSize: "0.72rem", fontWeight: 900, background: `${color}18`, color, padding: "2px 8px", borderRadius: 6 }}>{opps.length}</span>
        </div>
        {colValue > 0 && <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent)", opacity: 0.8 }}>{fmtK(colValue)}</div>}
      </div>
      <div style={{ flex: 1, background: dragOver ? `${color}06` : "rgba(0,0,0,0.12)", border: `1px solid ${dragOver ? color : "var(--nyx-border)"}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 120, transition: "all 0.15s" }}>
        <button onClick={() => onAddClick(stage)}
          style={{ background: "none", border: "1px dashed var(--nyx-accent-dim)", borderRadius: 7, padding: "7px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--nyx-accent-dim)"; e.currentTarget.style.color = "var(--nyx-text-muted)"; }}>
          + Add {STAGE_LABEL[stage]}
        </button>
        {opps.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--nyx-accent-dim)", fontSize: "0.72rem", fontStyle: "italic", padding: "12px 0" }}>
            {dragOver ? "Drop here" : "Empty"}
          </div>
        )}
        {opps.map(opp => (
          <KanbanCard key={opp.id} opp={opp}
            onEdit={() => onEdit(opp)} onActivity={() => onActivity(opp)}
            onStageChange={s => onStageChange(opp, s)}
            dragging={draggingId === opp.id}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main OpportunitiesClient ─────────────────────────────────────────────────
export default function OpportunitiesClient({ hospitals, reps }: { hospitals: Hospital[]; reps: Rep[] }) {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const [modal, setModal] = useState<"add" | Opp | null>(null);
  const [modalDefaultStage, setModalDefaultStage] = useState<Stage>("INQUIRY");
  const [activityOpp, setActivityOpp] = useState<Opp | null>(null);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [filterRep, setFilterRep] = useState<string>("ALL");
  const [sortCol, setSortCol] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/opportunities"); if (r.ok) setOpps(await r.json()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onEnd = () => setDraggingId(null);
    document.addEventListener("dragend", onEnd);
    return () => document.removeEventListener("dragend", onEnd);
  }, []);

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

  async function handleStageChange(opp: Opp, newStage: Stage) {
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, stage: newStage, updatedAt: new Date().toISOString() } : o));
    await fetch(`/api/opportunities/${opp.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }),
    });
  }

  async function handleDrop(oppId: string, newStage: Stage) {
    const opp = opps.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;
    // DECLINED requires a lostReason - open the modal pre-filled to that stage
    if (newStage === "DECLINED") {
      setModalDefaultStage("DECLINED");
      setModal(opp);
      return;
    }
    await handleStageChange(opp, newStage);
  }

  function openAdd(stage: Stage = "INQUIRY") {
    setModalDefaultStage(stage);
    setModal("add");
  }

  const totalPipeline = opps.filter(o => !["DISCHARGED","DECLINED"].includes(o.stage)).reduce((s, o) => s + (o.value ? Number(o.value) : 0), 0);
  const totalWon = opps.filter(o => o.stage === "DISCHARGED").reduce((s, o) => s + (o.value ? Number(o.value) : 0), 0);
  const staleCount = opps.filter(o => isStale(o)).length;
  const overdueCount = opps.filter(o => o.nextFollowUp && new Date(o.nextFollowUp) < new Date() && !["DISCHARGED","DECLINED"].includes(o.stage)).length;

  const filtered = opps.filter(o => {
    const matchStage = filterStage === "ALL" || o.stage === filterStage;
    const matchRep = filterRep === "ALL" || o.assignedRepId === filterRep || (!o.assignedRepId && filterRep === "unassigned");
    const q = search.toLowerCase();
    const matchSearch = !q || o.title.toLowerCase().includes(q) || o.hospital.hospitalName.toLowerCase().includes(q) || (o.assignedRep?.user.name ?? "").toLowerCase().includes(q);
    return matchStage && matchRep && matchSearch;
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
    else if (sortCol === "followUp") { av = a.nextFollowUp ?? ""; bv = b.nextFollowUp ?? ""; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const uniqueReps = Array.from(new Map(opps.filter(o => o.assignedRep && o.assignedRepId).map(o => [o.assignedRepId, { id: o.assignedRepId!, name: o.assignedRep!.user.name }])).values());

  return (
    <div>
      <div style={{ marginBottom: 20 }}><AIInsightsPanel role="admin" /></div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>PIPELINE</p>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--nyx-text)", margin: 0 }}>Admissions</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--nyx-accent)" }}>{fmtK(totalPipeline)}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--nyx-text-muted)", fontWeight: 600 }}>Pipeline</div>
            </div>
            <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#34d399" }}>{fmtK(totalWon)}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--nyx-text-muted)", fontWeight: 600 }}>Won</div>
            </div>
            {staleCount > 0 && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#fbbf24" }}>{staleCount}</div>
                <div style={{ fontSize: "0.62rem", color: "#fbbf24", fontWeight: 600, opacity: 0.8 }}>Stale</div>
              </div>
            )}
            {overdueCount > 0 && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#f87171" }}>{overdueCount}</div>
                <div style={{ fontSize: "0.62rem", color: "#f87171", fontWeight: 600, opacity: 0.8 }}>Overdue</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 8, overflow: "hidden" }}>
            {(["kanban","list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "8px 16px", background: view === v ? "var(--nyx-accent-dim)" : "none", border: "none", color: view === v ? "var(--nyx-accent)" : "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.78rem", fontWeight: view === v ? 800 : 400, transition: "all 0.15s" }}>
                {v === "kanban" ? "Kanban" : "List"}
              </button>
            ))}
          </div>
          <button onClick={() => openAdd()}
            style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "9px 20px", color: "var(--nyx-accent)", cursor: "pointer", fontWeight: 800, fontSize: "0.875rem", whiteSpace: "nowrap" }}>
            + New Admission
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inp, flex: "1 1 200px", maxWidth: 320 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, hospital, rep..." />
        <select style={{ ...sel, width: "auto", minWidth: 140 }} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="ALL">All Stages</option>
          {ALL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
        <select style={{ ...sel, width: "auto", minWidth: 140 }} value={filterRep} onChange={e => setFilterRep(e.target.value)}>
          <option value="ALL">All Reps</option>
          <option value="unassigned">Unassigned</option>
          {uniqueReps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {(search || filterStage !== "ALL" || filterRep !== "ALL") && (
          <button onClick={() => { setSearch(""); setFilterStage("ALL"); setFilterRep("ALL"); }}
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, padding: "8px 12px", color: "#f87171", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
            x Clear filters
          </button>
        )}
      </div>

      {loading && <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: "var(--nyx-text-muted)", fontSize: "0.875rem" }}>Loading...</div>}

      {/* Kanban view */}
      {!loading && view === "kanban" && (
        <div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>ACTIVE PIPELINE</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {ACTIVE_STAGES.map(stage => (
                <KanbanColumn key={stage} stage={stage} opps={filtered.filter(o => o.stage === stage)}
                  onEdit={setModal} onActivity={setActivityOpp}
                  onStageChange={handleStageChange} onDrop={handleDrop}
                  onAddClick={openAdd} draggingId={draggingId} />
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--nyx-border)", margin: "20px 0 16px", opacity: 0.4 }} />
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>TERMINAL</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
              {TERMINAL_STAGES.map(stage => (
                <KanbanColumn key={stage} stage={stage} opps={filtered.filter(o => o.stage === stage)}
                  onEdit={setModal} onActivity={setActivityOpp}
                  onStageChange={handleStageChange} onDrop={handleDrop}
                  onAddClick={openAdd} draggingId={draggingId} />
              ))}
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--nyx-accent-dim)", marginTop: 8 }}>drag cards between columns to update stage</p>
        </div>
      )}

      {/* List view */}
      {!loading && view === "list" && (
        <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--nyx-border)", background: "rgba(0,0,0,0.2)" }}>
                  {[
                    { col: "title", label: "Name" }, { col: null, label: "Hospital" },
                    { col: null, label: "Stage" }, { col: null, label: "Service Line" },
                    { col: "value", label: "Value" }, { col: null, label: "Rep" },
                    { col: "priority", label: "Pri" }, { col: "followUp", label: "Follow-up" },
                    { col: null, label: "" },
                  ].map(({ col, label }) => (
                    <th key={label} onClick={col ? () => toggleSort(col) : undefined}
                      style={{ padding: "11px 14px", textAlign: "left", fontSize: "0.62rem", fontWeight: 700, color: col && sortCol === col ? "var(--nyx-accent)" : "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                      {label}{col && sortCol === col ? (sortDir === "asc" ? " v" : " ^") : col ? <span style={{ opacity: 0.3 }}> !</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: "60px 32px", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 12 }}>💼</div>
                    <p style={{ margin: 0, color: "var(--nyx-text)", fontWeight: 700, fontSize: "1rem" }}>No opportunities yet</p>
                    <p style={{ margin: "8px 0 0", color: "var(--nyx-text-muted)", fontSize: "0.85rem" }}>Create your first to start tracking the pipeline</p>
                  </td></tr>
                )}
                {sorted.map(opp => {
                  const overdue = opp.nextFollowUp && new Date(opp.nextFollowUp) < new Date();
                  return (
                    <tr key={opp.id} onClick={() => setModal(opp)}
                      style={{ borderBottom: "1px solid var(--nyx-accent-dim)", cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 3, height: 28, borderRadius: 2, background: STAGE_CLR[opp.stage], flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--nyx-text)" }}>{opp.title}</span>
                          {isStale(opp) && <span style={{ fontSize: "0.58rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 3, padding: "1px 5px" }}>STALE</span>}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>{opp.hospital.hospitalName}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STAGE_CLR[opp.stage], background: `${STAGE_CLR[opp.stage]}14`, padding: "3px 8px", borderRadius: 5 }}>{STAGE_LABEL[opp.stage]}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "0.75rem", color: "var(--nyx-text-muted)" }}>{opp.serviceLine.replace(/_/g, " ")}</td>
                      <td style={{ padding: "11px 14px", fontSize: "0.85rem", color: "var(--nyx-accent)", fontWeight: 700 }}>{fmt(opp.value)}</td>
                      <td style={{ padding: "11px 14px", fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>{opp.assignedRep?.user.name ?? "-"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: PRIORITY_CLR[opp.priority] ?? "var(--nyx-text-muted)" }}>{opp.priority}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "0.75rem", color: overdue ? "#f87171" : "var(--nyx-text-muted)", whiteSpace: "nowrap" }}>
                        {opp.nextFollowUp ? `${overdue ? "! " : ""}${fmtDate(opp.nextFollowUp)}` : "-"}
                      </td>
                      <td style={{ padding: "11px 10px" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActivityOpp(opp)}
                          style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "4px 10px", color: "var(--nyx-accent)", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                          + Log
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activityOpp && (
        <ActivityFeedPanel
          entityId={activityOpp.id} entityParam="opportunityId"
          entityName={activityOpp.title} entitySubtitle={activityOpp.hospital.hospitalName}
          onClose={() => setActivityOpp(null)} />
      )}

      {modal !== null && (
        <OppModal
          opp={modal === "add" ? null : modal}
          hospitals={hospitals} reps={reps}
          defaultStage={modal === "add" ? modalDefaultStage : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "add" ? handleDelete : undefined} />
      )}
    </div>
  );
}
