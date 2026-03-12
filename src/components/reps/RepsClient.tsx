"use client";
import { useState, useEffect, useCallback, useRef } from "react";

type RepStatus = "ACTIVE"|"INACTIVE"|"PENDING_REVIEW"|"SUSPENDED";
type PerfTier = "all"|"top"|"mid"|"low";
type ViewMode = "cards"|"table";
interface Rep {
  id: string;
  user: { name: string | null; email: string };
  title?: string | null; phone?: string | null; city?: string | null; state?: string | null;
  territory?: string | null; bio?: string | null;
  hipaaTrainedAt?: string | null; licensedStates: string[];
  businessName?: string | null; w9OnFile: boolean;
  status: RepStatus; rating?: number | null; notes?: string | null;
  _count: { opportunities: number; territories: number };
  createdAt: string;
}

function exportRepsCSV(reps: Rep[]) {
  const headers = ["Name","Email","Title","Status","Phone","City","State","Territory","Business","Opportunities","Territories","Licensed States","HIPAA Trained","W-9 On File","Added"];
  const rows = reps.map(r => [
    r.user.name ?? "", r.user.email, r.title ?? "", r.status,
    r.phone ?? "", r.city ?? "", r.state ?? "", r.territory ?? "", r.businessName ?? "",
    String(r._count.opportunities), String(r._count.territories),
    r.licensedStates.join("; "),
    r.hipaaTrainedAt ? new Date(r.hipaaTrainedAt).toLocaleDateString("en-US") : "",
    r.w9OnFile ? "Yes" : "No",
    new Date(r.createdAt).toLocaleDateString("en-US"),
  ].map(v => `"${v.replace(/"/g, '""')}"`).join(","));
  const csv = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `reps-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/** Inline SVG sparkline — just a tiny trend line generated from the opp count as a visual anchor */
function Sparkline({ value, color }: { value: number; color: string }) {
  const max = 20;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const x = (i / 7) * 56;
    const seed = (value * (i + 3) * 17) % max;
    const y = 16 - Math.min(seed, 16);
    return `${x},${y}`;
  }).join(" ");
  const last = pts.split(" ").pop()!.split(",");
  return (
    <svg width={58} height={18} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r={2.2} fill={color} opacity={0.9} />
    </svg>
  );
}

const C = { card: "var(--nyx-card)", border: "var(--nyx-border)", cyan: "var(--nyx-accent)", text: "var(--nyx-text)", muted: "var(--nyx-text-muted)", input: "var(--nyx-input-bg)" };
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

const STATUS_CLR: Record<RepStatus, string> = { ACTIVE: "#34d399", INACTIVE: "#94a3b8", PENDING_REVIEW: "#fbbf24", SUSPENDED: "#f87171" };
const lbl = (s: string) => s.replace(/_/g, " ");
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function RepModal({ rep, onClose, onSave, onDelete }: {
  rep: Rep | null; onClose: () => void;
  onSave: (d: Partial<Rep> & { name?: string; email?: string; password?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const isEdit = !!rep;
  const [form, setForm] = useState<Partial<Rep> & { name?: string; email?: string; password?: string }>({
    name: rep?.user.name ?? "", email: rep?.user.email ?? "",
    title: rep?.title ?? "", phone: rep?.phone ?? "", city: rep?.city ?? "", state: rep?.state ?? "",
    territory: rep?.territory ?? "", bio: rep?.bio ?? "",
    licensedStates: rep?.licensedStates ?? [], status: rep?.status ?? "ACTIVE",
    businessName: rep?.businessName ?? "", w9OnFile: rep?.w9OnFile ?? false,
    notes: rep?.notes ?? "", password: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function toggleState(s: string) {
    const cur = form.licensedStates ?? [];
    set("licensedStates", cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 16px 32px", overflowY: "auto" }}>
      <div style={{ background: "var(--nyx-bg)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 14, width: "100%", maxWidth: 700, padding: 28, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{isEdit ? "Edit BD Rep" : "Add New BD Rep"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem" }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Account</p>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>FULL NAME *</label>
              <input style={inp} required value={form.name ?? ""} onChange={e => set("name", e.target.value)} placeholder="Alex Johnson" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>EMAIL *</label>
              <input style={inp} required type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="alex@company.com" />
            </div>
            {!isEdit && (
              <div>
                <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>PASSWORD (default: rep123!)</label>
                <input style={inp} type="password" value={form.password ?? ""} onChange={e => set("password", e.target.value)} placeholder="Leave blank for default" />
              </div>
            )}

            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Profile</p>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>TITLE</label>
              <input style={inp} value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="Senior BD Representative" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATUS</label>
              <select style={sel} value={form.status ?? "ACTIVE"} onChange={e => set("status", e.target.value)}>
                {(["ACTIVE","INACTIVE","PENDING_REVIEW","SUSPENDED"] as RepStatus[]).map(s => <option key={s} value={s}>{lbl(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>PHONE</label>
              <input style={inp} value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} placeholder="(615) 555-0100" />
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
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>TERRITORY (description)</label>
              <input style={inp} value={form.territory ?? ""} onChange={e => set("territory", e.target.value)} placeholder="Southeast US + Mid-Atlantic" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>BUSINESS NAME</label>
              <input style={inp} value={form.businessName ?? ""} onChange={e => set("businessName", e.target.value)} placeholder="Johnson BD Services LLC" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>HIPAA TRAINED DATE</label>
              <input style={inp} type="date" value={form.hipaaTrainedAt ? String(form.hipaaTrainedAt).slice(0,10) : ""} onChange={e => set("hipaaTrainedAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="w9" checked={form.w9OnFile ?? false} onChange={e => set("w9OnFile", e.target.checked)} style={{ accentColor: C.cyan, width: 16, height: 16 }} />
              <label htmlFor="w9" style={{ fontSize: "0.85rem", color: C.text, cursor: "pointer" }}>W-9 On File</label>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>BIO</label>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.bio ?? ""} onChange={e => set("bio", e.target.value)} placeholder="Brief professional bio…" />
            </div>

            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Licensed States</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {US_STATES.map(s => {
                  const active = (form.licensedStates ?? []).includes(s);
                  return (
                    <button type="button" key={s} onClick={() => toggleState(s)}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", border: active ? "1px solid var(--nyx-accent-label)" : `1px solid ${C.border}`, background: active ? "var(--nyx-accent-mid)" : C.input, color: active ? C.cyan : C.muted, transition: "all 0.1s" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>INTERNAL NOTES</label>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Admin notes…" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 10 }}>
            <div>
              {isEdit && onDelete && (
                confirmDel
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Delete this rep and their account?</span>
                      <button type="button" onClick={onDelete} style={{ background: "#f87171", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>Confirm</button>
                      <button type="button" onClick={() => setConfirmDel(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                    </div>
                  : <button type="button" onClick={() => setConfirmDel(true)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>Delete Rep</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 20px", color: C.muted, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "var(--nyx-accent-mid)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 7, padding: "8px 24px", color: C.cyan, cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Rep"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RepsClient() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | Rep | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepStatus | "ALL">("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [perfFilter, setPerfFilter] = useState<PerfTier>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [statusPatching, setStatusPatching] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/reps"); if (r.ok) setReps(await r.json()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close action menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setActionMenu(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derive performance tier threshold
  const sortedOpps = [...reps].map(r => r._count.opportunities).sort((a, b) => b - a);
  const topCut = sortedOpps[Math.floor(sortedOpps.length * 0.25)] ?? 5;
  const midCut = sortedOpps[Math.floor(sortedOpps.length * 0.75)] ?? 1;

  function getPerfTier(rep: Rep): { label: string; color: string } {
    const n = rep._count.opportunities;
    if (n >= topCut && topCut > 0) return { label: "Top Performer", color: "#f59e0b" };
    if (n >= midCut) return { label: "Active", color: "#34d399" };
    return { label: "Building", color: "#94a3b8" };
  }

  // Unique states for filter dropdown
  const allStates = Array.from(new Set(reps.flatMap(r => r.licensedStates))).sort();

  const filtered = reps.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || (r.user.name ?? "").toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q) || (r.territory ?? "").toLowerCase().includes(q) || (r.state ?? "").toLowerCase().includes(q) || (r.title ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchState = stateFilter === "ALL" || r.licensedStates.includes(stateFilter) || r.state === stateFilter;
    const tier = getPerfTier(r).label;
    const matchPerf = perfFilter === "all" || (perfFilter === "top" && tier === "Top Performer") || (perfFilter === "mid" && tier === "Active") || (perfFilter === "low" && tier === "Building");
    return matchQ && matchStatus && matchState && matchPerf;
  });

  const activeFilters = [statusFilter !== "ALL", stateFilter !== "ALL", perfFilter !== "all"].filter(Boolean).length;

  async function handleSave(data: Partial<Rep> & { name?: string; email?: string; password?: string }) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (ex) await fetch(`/api/reps/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    else await fetch("/api/reps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModal(null); await load();
  }

  async function handleDelete() {
    const ex = modal !== "add" && modal !== null ? modal : null;
    if (!ex) return;
    await fetch(`/api/reps/${ex.id}`, { method: "DELETE" });
    setModal(null); await load();
  }

  async function quickStatus(repId: string, newStatus: RepStatus) {
    setStatusPatching(repId);
    setActionMenu(null);
    try {
      await fetch(`/api/reps/${repId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      await load();
    } finally { setStatusPatching(null); }
  }

  function clearFilters() { setStatusFilter("ALL"); setStateFilter("ALL"); setPerfFilter("all"); setSearch(""); }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>BD TEAM</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>BD Representatives</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>
            {filtered.length !== reps.length ? `${filtered.length} of ${reps.length}` : reps.length} reps
            {reps.filter(r => r.status === "ACTIVE").length > 0 && <span style={{ color: "#34d399", marginLeft: 8 }}>● {reps.filter(r => r.status === "ACTIVE").length} active</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 7, padding: 2, border: `1px solid ${C.border}` }}>
            {(["cards","table"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: "5px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                  background: viewMode === m ? "var(--nyx-accent-mid)" : "transparent",
                  color: viewMode === m ? C.cyan : C.muted }}>
                {m === "cards" ? "⊞ Cards" : "≡ Table"}
              </button>
            ))}
          </div>
          <button onClick={() => exportRepsCSV(filtered)} style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: "10px 18px", color: "#34d399", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>⬇ Export CSV</button>
          <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 20px", color: C.cyan, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>+ Add Rep</button>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <input style={{ ...inp, maxWidth: 280, flex: "1 1 200px" }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, territory…" />

        <select style={{ ...sel, width: "auto", minWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as RepStatus | "ALL")}>
          <option value="ALL">All Statuses</option>
          {(["ACTIVE","INACTIVE","PENDING_REVIEW","SUSPENDED"] as RepStatus[]).map(s => <option key={s} value={s}>{lbl(s)}</option>)}
        </select>

        <select style={{ ...sel, width: "auto", minWidth: 130 }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
          <option value="ALL">All States</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select style={{ ...sel, width: "auto", minWidth: 150 }} value={perfFilter} onChange={e => setPerfFilter(e.target.value as PerfTier)}>
          <option value="all">All Tiers</option>
          <option value="top">⭐ Top Performers</option>
          <option value="mid">● Active</option>
          <option value="low">○ Building</option>
        </select>

        {(activeFilters > 0 || search) && (
          <button onClick={clearFilters} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, padding: "7px 14px", color: "#f87171", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
            ✕ Clear {activeFilters + (search ? 1 : 0)} filter{(activeFilters + (search ? 1 : 0)) > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {loading && <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading…</div>}

      {/* ── TABLE VIEW ── */}
      {!loading && viewMode === "table" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem", color: C.text }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Rep","Title","Territory","Status","Tier","Opps","Territories","Licensed","Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rep, i) => {
                const colors = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];
                const color = colors[i % colors.length];
                const tier = getPerfTier(rep);
                const isPatching = statusPatching === rep.id;
                return (
                  <tr key={rep.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${color}18`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color, flexShrink: 0 }}>
                          {(rep.user.name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{rep.user.name ?? "Unknown"}</div>
                          <div style={{ fontSize: "0.7rem", color: C.muted }}>{rep.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted }}>{rep.title ?? "-"}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{rep.territory ? rep.territory.slice(0,28) + (rep.territory.length > 28 ? "…" : "") : "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: STATUS_CLR[rep.status], background: "rgba(0,0,0,0.35)", padding: "2px 8px", borderRadius: 4 }}>{lbl(rep.status)}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: tier.color }}>{tier.label === "Top Performer" ? "⭐ " : ""}{tier.label}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, color }}>{rep._count.opportunities}</span>
                        <Sparkline value={rep._count.opportunities} color={color} />
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color }}>{rep._count.territories}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, fontSize: "0.72rem" }}>{rep.licensedStates.slice(0,4).join(", ")}{rep.licensedStates.length > 4 ? ` +${rep.licensedStates.length-4}` : ""}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        {rep.phone && (
                          <a href={`tel:${rep.phone}`} title={`Call ${rep.user.name}`}
                            style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", textDecoration: "none" }}>📞</a>
                        )}
                        <a href={`mailto:${rep.user.email}`} title={`Email ${rep.user.name}`}
                          style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", textDecoration: "none" }}>✉️</a>
                        <button onClick={() => setModal(rep)} title="Edit rep"
                          style={{ width: 28, height: 28, borderRadius: 6, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", cursor: "pointer" }}>✏️</button>
                        {/* Status quick-change menu */}
                        <div style={{ position: "relative" }} ref={actionMenu === rep.id ? actionMenuRef : undefined}>
                          <button disabled={isPatching} onClick={() => setActionMenu(actionMenu === rep.id ? null : rep.id)} title="Change status"
                            style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", cursor: "pointer", opacity: isPatching ? 0.5 : 1 }}>
                            {isPatching ? "…" : "⋯"}
                          </button>
                          {actionMenu === rep.id && (
                            <div style={{ position: "absolute", right: 0, top: 32, background: "var(--nyx-bg)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 8, padding: "6px 0", zIndex: 50, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                              <div style={{ padding: "4px 12px 6px", fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Set Status</div>
                              {(["ACTIVE","INACTIVE","PENDING_REVIEW","SUSPENDED"] as RepStatus[]).map(s => (
                                <button key={s} onClick={() => quickStatus(rep.id, s)}
                                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 12px", background: rep.status === s ? "var(--nyx-accent-dim)" : "transparent", border: "none", cursor: "pointer", fontSize: "0.8rem", color: rep.status === s ? C.cyan : C.text, textAlign: "left" }}>
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_CLR[s], flexShrink: 0, display: "inline-block" }} />
                                  {lbl(s)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.muted }}>No reps match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CARD VIEW ── */}
      {!loading && viewMode === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
          {filtered.map((rep, i) => {
            const colors = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];
            const color = colors[i % colors.length];
            const tier = getPerfTier(rep);
            const isPatching = statusPatching === rep.id;
            return (
              <div key={rep.id} className="gold-card" style={{ borderRadius: 12, padding: 20, cursor: "pointer", position: "relative" }}>
                {/* Top Performer ribbon */}
                {tier.label === "Top Performer" && (
                  <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", fontSize: "0.58rem", fontWeight: 800, padding: "3px 10px 3px 6px", borderRadius: "0 12px 0 8px", letterSpacing: "0.06em" }}>⭐ TOP</div>
                )}
                <div onClick={() => setModal(rep)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${color}18`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color, flexShrink: 0 }}>
                        {(rep.user.name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: C.text }}>{rep.user.name ?? "Unknown"}</div>
                        <div style={{ fontSize: "0.72rem", color: C.muted }}>{rep.title ?? "BD Rep"}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.63rem", fontWeight: 700, color: STATUS_CLR[rep.status], background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{lbl(rep.status)}</span>
                  </div>

                  {/* Metrics row with sparkline */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{rep._count.opportunities}</div>
                          <div style={{ fontSize: "0.63rem", color: C.muted }}>Opportunities</div>
                        </div>
                        <Sparkline value={rep._count.opportunities} color={color} />
                      </div>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{rep._count.territories}</div>
                      <div style={{ fontSize: "0.63rem", color: C.muted }}>Territories</div>
                      {/* Performance tier badge */}
                      <div style={{ marginTop: 4, fontSize: "0.6rem", fontWeight: 700, color: tier.color }}>{tier.label}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.75rem", color: C.muted, display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                    {rep.territory && <div>📍 {rep.territory}</div>}
                    {rep.licensedStates.length > 0 && <div>🔖 {rep.licensedStates.slice(0,6).join(", ")}{rep.licensedStates.length > 6 ? ` +${rep.licensedStates.length-6}` : ""}</div>}
                    {rep.hipaaTrainedAt && <div style={{ color: "#34d399" }}>✓ HIPAA {fmtDate(rep.hipaaTrainedAt)}</div>}
                    {rep.w9OnFile && <div style={{ color: "#60a5fa" }}>✓ W-9 on file</div>}
                  </div>
                </div>

                {/* Quick Actions bar */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
                  {rep.phone && (
                    <a href={`tel:${rep.phone}`} title={`Call ${rep.user.name ?? ""}`} onClick={e => e.stopPropagation()}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 0", borderRadius: 6, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", fontSize: "0.68rem", fontWeight: 600, color: "#34d399", textDecoration: "none", cursor: "pointer" }}>
                      📞 Call
                    </a>
                  )}
                  <a href={`mailto:${rep.user.email}`} title={`Email ${rep.user.name ?? ""}`} onClick={e => e.stopPropagation()}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 0", borderRadius: 6, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.18)", fontSize: "0.68rem", fontWeight: 600, color: "#60a5fa", textDecoration: "none" }}>
                    ✉️ Email
                  </a>
                  {/* Status quick-change */}
                  <div style={{ position: "relative" }} ref={actionMenu === rep.id ? actionMenuRef : undefined}>
                    <button disabled={isPatching} onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === rep.id ? null : rep.id); }}
                      style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(0,0,0,0.28)", border: `1px solid ${C.border}`, fontSize: "0.68rem", fontWeight: 600, color: C.muted, cursor: "pointer", opacity: isPatching ? 0.5 : 1 }}>
                      {isPatching ? "…" : "⋯ Status"}
                    </button>
                    {actionMenu === rep.id && (
                      <div style={{ position: "absolute", bottom: 34, right: 0, background: "var(--nyx-bg)", border: `1px solid var(--nyx-accent-str)`, borderRadius: 8, padding: "6px 0", zIndex: 50, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                        <div style={{ padding: "4px 12px 6px", fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Set Status</div>
                        {(["ACTIVE","INACTIVE","PENDING_REVIEW","SUSPENDED"] as RepStatus[]).map(s => (
                          <button key={s} onClick={e => { e.stopPropagation(); quickStatus(rep.id, s); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 12px", background: rep.status === s ? "var(--nyx-accent-dim)" : "transparent", border: "none", cursor: "pointer", fontSize: "0.8rem", color: rep.status === s ? C.cyan : C.text, textAlign: "left" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_CLR[s], flexShrink: 0, display: "inline-block" }} />
                            {lbl(s)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: "0.68rem", color: "rgba(216,232,244,0.25)" }}>{rep.user.email}</div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.muted }}>
              No reps match the current filters.{" "}
              {(activeFilters > 0 || search) && <button onClick={clearFilters} style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", textDecoration: "underline" }}>Clear filters</button>}
            </div>
          )}
        </div>
      )}

      {modal !== null && (
        <RepModal
          rep={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "add" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
