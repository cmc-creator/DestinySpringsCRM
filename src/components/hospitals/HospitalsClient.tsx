"use client";
import { useState, useCallback } from "react";
import { ActivityFeedPanel } from "@/components/activities/ActivityFeedPanel";

type HospitalType = "ACUTE_CARE"|"CRITICAL_ACCESS"|"SPECIALTY"|"HEALTH_SYSTEM"|"AMBULATORY"|"OUTPATIENT"|"LONG_TERM_CARE"|"BEHAVIORAL_HEALTH"|"REHABILITATION"|"CHILDRENS"|"CANCER_CENTER"|"URGENT_CARE"|"PCP"|"PRIVATE_PRACTICE"|"OTHER";
type HospitalStatus = "ACTIVE"|"INACTIVE"|"PROSPECT"|"CHURNED";

interface Hospital {
  id: string;
  hospitalName: string;
  systemName?: string | null;
  hospitalType: HospitalType;
  status: HospitalStatus;
  city?: string | null;
  state?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  primaryContactTitle?: string | null;
  bedCount?: number | null;
  address?: string | null;
  zip?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt: string;
  user?: { email: string; name?: string | null } | null;
  _count?: { opportunities: number; contacts: number };
}

const C = {
  card: "var(--nyx-card)", border: "var(--nyx-border)", text: "var(--nyx-text)",
  muted: "var(--nyx-text-muted)", input: "var(--nyx-input-bg)",
};

const STATUS_COLOR: Record<HospitalStatus, string> = {
  ACTIVE: "#34d399", INACTIVE: "#94a3b8", PROSPECT: "var(--nyx-accent)", CHURNED: "#f87171",
};

const HOSPITAL_TYPES: HospitalType[] = ["ACUTE_CARE","CRITICAL_ACCESS","SPECIALTY","HEALTH_SYSTEM","AMBULATORY","OUTPATIENT","LONG_TERM_CARE","BEHAVIORAL_HEALTH","REHABILITATION","CHILDRENS","CANCER_CENTER","URGENT_CARE","PCP","PRIVATE_PRACTICE","OTHER"];
const STATUSES: HospitalStatus[] = ["ACTIVE","INACTIVE","PROSPECT","CHURNED"];

const TYPE_LABEL: Record<string, string> = {
  ACUTE_CARE: "Acute Care", CRITICAL_ACCESS: "Critical Access", SPECIALTY: "Specialty",
  HEALTH_SYSTEM: "Health System", AMBULATORY: "Ambulatory", OUTPATIENT: "Outpatient",
  LONG_TERM_CARE: "Long-Term Care", BEHAVIORAL_HEALTH: "Behavioral Health",
  REHABILITATION: "Rehabilitation", CHILDRENS: "Children's", CANCER_CENTER: "Cancer Center",
  URGENT_CARE: "Urgent Care", PCP: "Primary Care (PCP)", PRIVATE_PRACTICE: "Private Practice", OTHER: "Other",
};
const TYPE_ICON: Record<string, string> = {
  ACUTE_CARE: "🏥", CRITICAL_ACCESS: "🚨", SPECIALTY: "💊", HEALTH_SYSTEM: "🏛️",
  AMBULATORY: "🚶", OUTPATIENT: "🏢", LONG_TERM_CARE: "🛏️", BEHAVIORAL_HEALTH: "🧠",
  REHABILITATION: "♻️", CHILDRENS: "👶", CANCER_CENTER: "🎗️", URGENT_CARE: "⚡",
  PCP: "👨‍⚕️", PRIVATE_PRACTICE: "🏠", OTHER: "🏗️",
};
const lbl = (s: string) => TYPE_LABEL[s] ?? s.replace(/_/g, " ");
const typeIcon = (t: string) => TYPE_ICON[t] ?? "🏥";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" };

// ── Modal ──────────────────────────────────────────────────────────────
function HospitalModal({ hospital, onClose, onSave }: {
  hospital: Hospital | null;
  onClose: () => void;
  onSave: (data: Partial<Hospital> & { portalEmail?: string }) => Promise<void>;
}) {
  const isEdit = !!hospital;
  const [form, setForm] = useState<Partial<Hospital> & { portalEmail?: string }>(
    hospital ? { ...hospital } : { hospitalType: "ACUTE_CARE", status: "PROSPECT" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 16px 32px", overflowY: "auto" }}>
      <div style={{ background: "var(--nyx-bg)", border: "1px solid var(--nyx-accent-str)", borderRadius: 14, width: "100%", maxWidth: 700, padding: 28, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{isEdit ? "Edit Account" : "Add Account"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: "0.82rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Hospital Info */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ACCOUNT NAME *</label>
              <input style={inp} required value={form.hospitalName ?? ""} onChange={e => set("hospitalName", e.target.value)} placeholder="Saint Mary's Medical Center" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SYSTEM NAME</label>
              <input style={inp} value={form.systemName ?? ""} onChange={e => set("systemName", e.target.value)} placeholder="Health System Name" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ACCOUNT TYPE</label>
              <select style={sel} value={form.hospitalType ?? "ACUTE_CARE"} onChange={e => set("hospitalType", e.target.value)}>
                {HOSPITAL_TYPES.map(t => <option key={t} value={t}>{lbl(t)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATUS</label>
              <select style={sel} value={form.status ?? "PROSPECT"} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>BED COUNT</label>
              <input style={inp} type="number" value={form.bedCount ?? ""} onChange={e => set("bedCount", e.target.value ? Number(e.target.value) : null)} placeholder="250" />
            </div>

            {/* Address */}
            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Address</p>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STREET ADDRESS</label>
              <input style={inp} value={form.address ?? ""} onChange={e => set("address", e.target.value)} placeholder="1234 Main St" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CITY</label>
              <input style={inp} value={form.city ?? ""} onChange={e => set("city", e.target.value)} placeholder="Nashville" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>STATE</label>
                <input style={inp} value={form.state ?? ""} onChange={e => set("state", e.target.value)} placeholder="TN" maxLength={2} />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ZIP</label>
                <input style={inp} value={form.zip ?? ""} onChange={e => set("zip", e.target.value)} placeholder="37201" />
              </div>
            </div>

            {/* Contact */}
            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Primary Contact</p>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT NAME</label>
              <input style={inp} value={form.primaryContactName ?? ""} onChange={e => set("primaryContactName", e.target.value)} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT TITLE</label>
              <input style={inp} value={form.primaryContactTitle ?? ""} onChange={e => set("primaryContactTitle", e.target.value)} placeholder="Chief Medical Officer" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT EMAIL</label>
              <input style={inp} type="email" value={form.primaryContactEmail ?? ""} onChange={e => set("primaryContactEmail", e.target.value)} placeholder="jsmith@hospital.org" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>CONTACT PHONE</label>
              <input style={inp} value={form.primaryContactPhone ?? ""} onChange={e => set("primaryContactPhone", e.target.value)} placeholder="(615) 555-0100" />
            </div>

            {/* Portal access — only for new hospitals */}
            {!isEdit && (
              <>
                <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Portal Access</p>
                  <p style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 10 }}>A portal account will be auto-created for this account.</p>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>PORTAL EMAIL *</label>
                  <input style={inp} required type="email" value={form.portalEmail ?? ""} onChange={e => set("portalEmail", e.target.value)} placeholder="admin@hospital.org" />
                </div>
              </>
            )}

            {/* Notes */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>NOTES</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 20px", color: C.muted, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", borderRadius: 7, padding: "8px 24px", color: "var(--nyx-accent)", cursor: "pointer", fontWeight: 700 }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function HospitalsClient({ initialHospitals }: { initialHospitals: Hospital[] }) {
  const [hospitals, setHospitals] = useState<Hospital[]>(initialHospitals);
  const [modal, setModal] = useState<Hospital | "add" | null>(null);
  const [activityHospital, setActivityHospital] = useState<Hospital | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const load = useCallback(async (q?: string) => {
    const url = q ? `/api/hospitals?search=${encodeURIComponent(q)}` : "/api/hospitals";
    const res = await fetch(url);
    if (res.ok) setHospitals(await res.json());
  }, []);

  const filtered = hospitals.filter(h => {
    if (filterType !== "ALL" && h.hospitalType !== filterType) return false;
    if (filterStatus !== "ALL" && h.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (h.hospitalName?.toLowerCase().includes(q) || h.systemName?.toLowerCase()?.includes(q) ||
      h.city?.toLowerCase()?.includes(q) || h.state?.toLowerCase()?.includes(q));
  });

  async function handleSave(data: Partial<Hospital> & { portalEmail?: string }) {
    const ex = modal !== "add" && modal !== null ? modal : null;
    const { user: _u, _count: _c, id: _id, createdAt: _ca, ...payload } = data as Record<string, unknown>;

    const res = ex
      ? await fetch(`/api/hospitals/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/hospitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? res.statusText);
    }
    setModal(null);
    await load();
  }

  const inp2: React.CSSProperties = { background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", width: 300 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>ACCOUNTS</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Accounts</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>{hospitals.length} accounts</p>
        </div>
        <button onClick={() => setModal("add")} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8, padding: "10px 20px", color: "var(--nyx-accent)", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
          + Add Account
        </button>
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {(["ALL", ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 20, border: `1px solid ${filterStatus === s ? STATUS_COLOR[s as HospitalStatus] ?? "var(--nyx-accent)" : C.border}`, background: filterStatus === s ? "rgba(0,0,0,0.3)" : "transparent", color: filterStatus === s ? STATUS_COLOR[s as HospitalStatus] ?? "var(--nyx-accent)" : C.muted, cursor: "pointer", whiteSpace: "nowrap" }}>
            {s === "ALL" ? "All Statuses" : s}
          </button>
        ))}
      </div>

      {/* Account type filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => setFilterType("ALL")}
          style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 16, border: `1px solid ${filterType === "ALL" ? "var(--nyx-accent-str)" : C.border}`, background: filterType === "ALL" ? "var(--nyx-accent-dim)" : "transparent", color: filterType === "ALL" ? "var(--nyx-accent)" : C.muted, cursor: "pointer", whiteSpace: "nowrap" }}>
          All Types
        </button>
        {HOSPITAL_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(filterType === t ? "ALL" : t)}
            style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 16, border: `1px solid ${filterType === t ? "var(--nyx-accent-str)" : C.border}`, background: filterType === t ? "var(--nyx-accent-dim)" : "transparent", color: filterType === t ? "var(--nyx-accent)" : C.muted, cursor: "pointer", whiteSpace: "nowrap" }}>
            {typeIcon(t)} {lbl(t)}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input style={inp2} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts, city, state…" />
      </div>

      {/* Table */}
      <div className="gold-card" style={{ borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: C.card, borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid var(--nyx-border)` }}>
                {["Account", "System", "Type", "Status", "Opportunities", "Contacts", "Added", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: "0.9rem" }}>
                  {search ? "No accounts match your search." : "No accounts yet. Click + Add Account to get started."}
                </td></tr>
              )}
              {filtered.map(h => (
                <tr key={h.id} onClick={() => setModal(h)} style={{ borderBottom: `1px solid var(--nyx-accent-dim)`, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--nyx-accent-dim)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: C.text }}>{h.hospitalName}</div>
                    <div style={{ fontSize: "0.75rem", color: C.muted }}>{h.city}{h.city && h.state ? ", " : ""}{h.state}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: C.muted }}>{h.systemName ?? "-"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 600, color: "var(--nyx-accent)", background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>
                      {typeIcon(h.hospitalType)} {lbl(h.hospitalType)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: STATUS_COLOR[h.status] ?? "var(--nyx-accent)", background: "rgba(0,0,0,0.3)", padding: "3px 9px", borderRadius: 4 }}>{h.status}</span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: C.muted, textAlign: "center" }}>{h._count?.opportunities ?? 0}</td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: C.muted, textAlign: "center" }}>{h._count?.contacts ?? 0}</td>
                  <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(h.createdAt)}</td>
                  <td style={{ padding: "14px 8px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActivityHospital(h); }}
                      style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "4px 10px", color: "var(--nyx-accent)", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}
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

      {activityHospital && (
        <ActivityFeedPanel
          entityId={activityHospital.id}
          entityParam="hospitalId"
          entityName={activityHospital.hospitalName}
          entitySubtitle={[activityHospital.city, activityHospital.state].filter(Boolean).join(", ")}
          onClose={() => setActivityHospital(null)}
        />
      )}

      {modal !== null && (
        <HospitalModal
          hospital={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
