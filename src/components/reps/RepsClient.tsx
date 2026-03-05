"use client";
import { useState, useEffect, useCallback } from "react";

type RepStatus = "ACTIVE"|"INACTIVE"|"PENDING_REVIEW"|"SUSPENDED";
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "#0d1525", border: `1px solid var(--nyx-accent-mid)`, borderRadius: 14, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
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

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/reps"); if (r.ok) setReps(await r.json()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = reps.filter(r => {
    const q = search.toLowerCase();
    return !q || (r.user.name ?? "").toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q) || (r.territory ?? "").toLowerCase().includes(q) || (r.state ?? "").toLowerCase().includes(q);
  });

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>BD TEAM</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>BD Representatives</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>{reps.length} reps on your team</p>
        </div>
        <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 20px", color: C.cyan, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>+ Add Rep</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input style={{ ...inp, maxWidth: 360 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, territory…" />
      </div>

      {loading && <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
        {filtered.map((rep, i) => {
          const colors = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];
          const color = colors[i % colors.length];
          return (
            <div key={rep.id} onClick={() => setModal(rep)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}44`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${color}18`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color, flexShrink: 0 }}>
                    {(rep.user.name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: C.text }}>{rep.user.name ?? "Unknown"}</div>
                    <div style={{ fontSize: "0.72rem", color: C.muted }}>{rep.title ?? "BD Rep"}</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: STATUS_CLR[rep.status], background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{lbl(rep.status)}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{rep._count.opportunities}</div>
                  <div style={{ fontSize: "0.65rem", color: C.muted }}>Opportunities</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{rep._count.territories}</div>
                  <div style={{ fontSize: "0.65rem", color: C.muted }}>Territories</div>
                </div>
              </div>
              <div style={{ fontSize: "0.75rem", color: C.muted, display: "flex", flexDirection: "column", gap: 3 }}>
                {rep.territory && <div>📍 {rep.territory}</div>}
                {rep.licensedStates.length > 0 && <div>🔖 {rep.licensedStates.slice(0,6).join(", ")}{rep.licensedStates.length > 6 ? ` +${rep.licensedStates.length-6}` : ""}</div>}
                {rep.hipaaTrainedAt && <div style={{ color: "#34d399" }}>✓ HIPAA {fmtDate(rep.hipaaTrainedAt)}</div>}
                {rep.w9OnFile && <div style={{ color: "#60a5fa" }}>✓ W-9 on file</div>}
              </div>
              <div style={{ marginTop: 10, fontSize: "0.7rem", color: "rgba(216,232,244,0.3)" }}>{rep.user.email}</div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.muted }}>
            No reps found. Click &quot;Add Rep&quot; to create the first one.
          </div>
        )}
      </div>

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
