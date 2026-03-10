"use client";
import { useState, useEffect, useCallback, useRef } from "react";

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
  createdAt: string; updatedAt?: string; nextFollowUp?: string | null;
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

const fmt = (v: string | number | null | undefined) => v ? `$${Number(v).toLocaleString()}` : "-";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const lbl = (s: string) => s.replace(/_/g, " ");
const isStale = (lead: Lead) => {
  if (lead.status === "WON" || lead.status === "LOST" || lead.status === "UNQUALIFIED") return false;
  const ref = lead.updatedAt ?? lead.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000 > 14;
};
const staleDays = (lead: Lead) => {
  const ref = lead.updatedAt ?? lead.createdAt;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
};

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
                <option value="">Unassigned</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SERVICE INTEREST</label>
              <input style={inp} value={form.serviceInterest ?? ""} onChange={e => set("serviceInterest", e.target.value)} placeholder="Revenue Cycle, Telehealth..." />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>FOLLOW-UP DATE</label>
              <input style={inp} type="date" value={form.nextFollowUp ? form.nextFollowUp.slice(0, 10) : ""} onChange={e => set("nextFollowUp", e.target.value ? new Date(e.target.value).toISOString() : null)} />
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

// ── Activity Feed Panel ─────────────────────────────────
interface Activity { id: string; type: string; title: string; notes?: string | null; createdAt: string; }
const ACT_ICON: Record<string, string> = {
  CALL: "📞", EMAIL: "✉️", NOTE: "📝", MEETING: "🤝", TASK: "☑️",
  PROPOSAL_SENT: "📄", CONTRACT_SENT: "📋", DEMO_COMPLETED: "🖥️", SITE_VISIT: "🏥", CONFERENCE: "🎤", FOLLOW_UP: "🔔",
};
const ACT_TYPES = ["CALL","EMAIL","NOTE","MEETING","FOLLOW_UP","SITE_VISIT","DEMO_COMPLETED","PROPOSAL_SENT","CONTRACT_SENT","TASK"];

function ActivityFeedPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [actLoading, setActLoading] = useState(true);
  const [logType, setLogType] = useState("NOTE");
  const [logTitle, setLogTitle] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadActivities = useCallback(async () => {
    setActLoading(true);
    try {
      const r = await fetch(`/api/activities?leadId=${lead.id}`);
      if (r.ok) setActivities(await r.json());
    } finally { setActLoading(false); }
  }, [lead.id]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  async function logActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!logTitle.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: logType, title: logTitle, notes: logNotes || null, leadId: lead.id }),
      });
      setLogTitle(""); setLogNotes("");
      await loadActivities();
    } finally { setSaving(false); }
  }

  const relTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, background: "var(--nyx-bg)", borderLeft: "1px solid var(--nyx-accent-str)", zIndex: 200, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>Activity Feed</div>
          <div style={{ fontWeight: 700, color: C.text, fontSize: "0.92rem", lineHeight: 1.3 }}>{lead.hospitalName}</div>
          {lead.contactName && <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2 }}>{lead.contactName}</div>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem", lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {actLoading ? (
          <div style={{ color: C.muted, textAlign: "center", paddingTop: 24, fontSize: "0.82rem" }}>Loading…</div>
        ) : activities.length === 0 ? (
          <div style={{ color: C.muted, textAlign: "center", paddingTop: 32, fontSize: "0.82rem" }}>No activities logged yet.<br />Use the form below to add the first one.</div>
        ) : (
          activities.map((a, i) => (
            <div key={a.id} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 26 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", flexShrink: 0 }}>
                  {ACT_ICON[a.type] ?? "•"}
                </div>
                {i < activities.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: C.border, margin: "3px 0" }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.83rem", color: C.text, lineHeight: 1.3 }}>{a.title}</div>
                  <div style={{ fontSize: "0.63rem", color: C.muted, flexShrink: 0, paddingTop: 1 }}>{relTime(a.createdAt)}</div>
                </div>
                <div style={{ fontSize: "0.66rem", color: "var(--nyx-accent-label)", marginTop: 1, marginBottom: a.notes ? 5 : 0 }}>{a.type.replace(/_/g, " ")}</div>
                {a.notes && <div style={{ fontSize: "0.78rem", color: C.muted, lineHeight: 1.45 }}>{a.notes}</div>}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px", flexShrink: 0, background: "rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Log Activity</div>
        <form onSubmit={logActivity} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select style={{ ...sel, padding: "7px 10px", fontSize: "0.8rem" }} value={logType} onChange={e => setLogType(e.target.value)}>
            {ACT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <input required style={{ ...inp, padding: "7px 10px", fontSize: "0.8rem" }} value={logTitle} onChange={e => setLogTitle(e.target.value)} placeholder="Summary / title…" />
          <textarea style={{ ...inp, padding: "7px 10px", fontSize: "0.8rem", minHeight: 56, resize: "vertical" }} value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes… (optional)" />
          <button type="submit" disabled={saving || !logTitle.trim()}
            style={{ background: saving ? "rgba(0,0,0,0.2)" : "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", borderRadius: 7, padding: "8px", color: saving ? C.muted : C.cyan, cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
            {saving ? "Saving…" : "Log Activity"}
          </button>
        </form>
      </div>
    </div>
  );
}

function exportLeadsCSV(leads: Lead[], filename = "leads.csv") {
  const headers = ["Hospital","System","State","City","Beds","Status","Priority","Source","Contact","Contact Title","Contact Email","Contact Phone","Service Interest","Est. Value","Rep","Created"];
  const rows = leads.map(l => [
    l.hospitalName, l.systemName ?? "", l.state ?? "", l.city ?? "",
    l.bedCount != null ? String(l.bedCount) : "",
    l.status, l.priority, l.source,
    l.contactName ?? "", l.contactTitle ?? "", l.contactEmail ?? "", l.contactPhone ?? "",
    l.serviceInterest ?? "",
    l.estimatedValue != null ? String(l.estimatedValue) : "",
    l.assignedRep?.user.name ?? "",
    new Date(l.createdAt).toLocaleDateString("en-US"),
  ].map(v => `"${v.replace(/"/g, '""')}"`).join(","));
  const csv = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ──────────────────────────────────────
export default function LeadsClient({ reps }: { reps: Rep[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [modal, setModal] = useState<"add" | Lead | null>(null);
  const [activityLead, setActivityLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkRepId, setBulkRepId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.size > 0 && selected.size < filtered.length;
    }
  }, [selected, filtered.length]);

  async function handleSave(data: Partial<Lead>) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    const { assignedRep: _ar, id: _id, createdAt: _ca, ...payload } = data as Partial<Lead> & { assignedRep?: unknown; id?: unknown; createdAt?: unknown };
    try {
      const res = ex
        ? await fetch(`/api/leads/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save lead: ${err?.error ?? res.statusText}`);
        return;
      }
    } catch (e) {
      console.error("Lead save error:", e);
      alert("Network error. Could not save lead.");
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

  async function applyBulk(action: "status" | "rep" | "delete", value?: string) {
    if (!selected.size) return;
    setBulkLoading(true);
    try {
      await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action, value }),
      });
      setSelected(new Set()); setBulkStatus(""); setBulkRepId(""); setConfirmBulkDel(false);
      await load();
    } finally { setBulkLoading(false); }
  }

  function toggleSelect(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(l => l.id)));
  }

  const counts = STATUSES.reduce((acc, s) => { acc[s] = leads.filter(l => l.status === s).length; return acc; }, {} as Record<string, number>);

  return (
    <div style={{ paddingBottom: selected.size > 0 ? 80 : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>PIPELINE</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Lead Pipeline</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>{leads.length} total leads</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => exportLeadsCSV(filtered)} style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: "10px 18px", color: "#34d399", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}>
            ⬇ Export CSV
          </button>
          <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 20px", color: C.cyan, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
            + New Lead
          </button>
        </div>
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
        <div className="nyx-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: "12px 8px 12px 16px", width: 30 }}>
                <input ref={selectAllRef} type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  style={{ accentColor: C.cyan, cursor: "pointer", width: 14, height: 14 }} />
              </th>
              {["Hospital", "Contact", "Status", "Priority", "Source", "Est. Value", "Rep", "Next Follow-up", "Created", ""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: C.muted }}>No leads match your filters.</td></tr>}
            {filtered.map(lead => (
              <tr key={lead.id} onClick={() => setModal(lead)}
                style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: "pointer", background: selected.has(lead.id) ? "var(--nyx-accent-dim)" : "transparent", transition: "background 0.15s" }}
                onMouseEnter={e => { if (!selected.has(lead.id)) e.currentTarget.style.background = "var(--nyx-accent-dim)"; }}
                onMouseLeave={e => { if (!selected.has(lead.id)) e.currentTarget.style.background = "transparent"; }}>
                <td style={{ padding: "13px 8px 13px 16px" }} onClick={e => toggleSelect(lead.id, e)}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: C.cyan, cursor: "pointer", width: 14, height: 14 }} />
                </td>
                <td style={{ padding: "13px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: C.text }}>{lead.hospitalName}</span>
                    {isStale(lead) && <span title={`No activity in ${staleDays(lead)} days`} style={{ fontSize: "0.6rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap", letterSpacing: "0.05em" }}>STALE {staleDays(lead)}d</span>}
                  </div>
                  {lead.state && <div style={{ fontSize: "0.7rem", color: C.muted }}>{lead.city ? `${lead.city}, ` : ""}{lead.state}</div>}
                </td>
                <td style={{ padding: "13px 14px" }}>
                  <div style={{ fontSize: "0.82rem", color: C.text }}>{lead.contactName ?? "-"}</div>
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
                <td style={{ padding: "13px 14px", fontSize: "0.75rem", color: lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date() ? "#f87171" : C.muted, whiteSpace: "nowrap" }}>
                  {lead.nextFollowUp ? fmtDate(lead.nextFollowUp) : <span style={{ opacity: 0.4 }}>--</span>}
                </td>
                <td style={{ padding: "13px 14px", fontSize: "0.75rem", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(lead.createdAt)}</td>
                <td style={{ padding: "13px 10px" }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setActivityLead(lead)} title="Activity feed"
                    style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.22)", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    💬
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </div>
      </div>

      {/* Bulk action floater */}
      {selected.size > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--nyx-bg)", border: "1px solid var(--nyx-accent-str)", borderRadius: 12, padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", zIndex: 150, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", flexWrap: "wrap", maxWidth: "90vw" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.cyan, whiteSpace: "nowrap" }}>{selected.size} selected</span>
          <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            style={{ ...sel, width: "auto", minWidth: 140, padding: "5px 10px", fontSize: "0.78rem" }}>
            <option value="">Set status…</option>
            {STATUSES.map(s => <option key={s} value={s}>{lbl(s)}</option>)}
          </select>
          {bulkStatus && (
            <button disabled={bulkLoading} onClick={() => applyBulk("status", bulkStatus)}
              style={{ background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "5px 12px", color: C.cyan, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              Apply
            </button>
          )}

          <select value={bulkRepId} onChange={e => setBulkRepId(e.target.value)}
            style={{ ...sel, width: "auto", minWidth: 150, padding: "5px 10px", fontSize: "0.78rem" }}>
            <option value="">Assign rep…</option>
            <option value="__none__">Unassign</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
          </select>
          {bulkRepId && (
            <button disabled={bulkLoading} onClick={() => applyBulk("rep", bulkRepId === "__none__" ? "" : bulkRepId)}
              style={{ background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "5px 12px", color: C.cyan, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
              Assign
            </button>
          )}

          <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
          <button onClick={() => exportLeadsCSV(filtered.filter(l => selected.has(l.id)), `leads-selected-${Date.now()}.csv`)}
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "5px 12px", color: "#34d399", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
            ⬇ CSV
          </button>

          {confirmBulkDel ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "#f87171", whiteSpace: "nowrap" }}>Delete {selected.size}?</span>
              <button disabled={bulkLoading} onClick={() => applyBulk("delete")}
                style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
                {bulkLoading ? "…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmBulkDel(false)}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", color: C.muted, cursor: "pointer", fontSize: "0.78rem" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmBulkDel(true)}
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "5px 12px", color: "#f87171", cursor: "pointer", fontSize: "0.78rem" }}>
              Delete
            </button>
          )}

          <button onClick={() => { setSelected(new Set()); setBulkStatus(""); setBulkRepId(""); setConfirmBulkDel(false); }}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", color: C.muted, cursor: "pointer", fontSize: "0.78rem" }}>
            ✕
          </button>
        </div>
      )}

      {activityLead && <ActivityFeedPanel lead={activityLead} onClose={() => setActivityLead(null)} />}

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
