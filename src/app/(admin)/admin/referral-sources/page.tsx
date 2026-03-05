"use client";

import { useEffect, useState } from "react";

const C = {
  cyan: "var(--nyx-accent)",
  text: "var(--nyx-text)",
  muted: "var(--nyx-text-muted)",
  dim: "var(--nyx-text-muted)",
  card: "var(--nyx-card)",
  border: "var(--nyx-border)",
  emerald:"#10b981",
  amber: "#f59e0b",
  red:   "#f87171",
};

const SOURCE_TYPES = ["PHYSICIAN","SPECIALIST","SNF","REHAB_FACILITY","CARE_FACILITY","HOME_HEALTH","HOSPITAL","PRACTICE_GROUP","OTHER"] as const;

type Source = {
  id: string; name: string; type: string; specialty?: string; practiceName?: string;
  npi?: string; contactName?: string; phone?: string; city?: string; state?: string;
  monthlyGoal?: number; active: boolean;
  assignedRep?: { user: { name?: string } };
  _count: { referrals: number };
};

const LABEL: Record<string, string> = {
  PHYSICIAN:"Physician", SPECIALIST:"Specialist", SNF:"SNF",
  REHAB_FACILITY:"Rehab", CARE_FACILITY:"Care Facility",
  HOME_HEALTH:"Home Health", HOSPITAL:"Hospital",
  PRACTICE_GROUP:"Practice Group", OTHER:"Other",
};

const empty = { name:"", type:"PHYSICIAN", specialty:"", practiceName:"", npi:"", contactName:"", phone:"", city:"", state:"", monthlyGoal:"", notes:"" };

export default function ReferralSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const load = async () => {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/referral-sources${q}`);
    if (res.ok) setSources(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/referral-sources", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, monthlyGoal: form.monthlyGoal ? Number(form.monthlyGoal) : undefined }),
    });
    if (res.ok) { setShowAdd(false); setForm(empty); load(); }
    else { const e = await res.json(); setError(e.error ?? "Failed to save"); }
    setSaving(false);
  };

  const attainment = (goal?: number, actual?: number) => {
    if (!goal || !actual) return null;
    return Math.round((actual / goal) * 100);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <p style={{ color:C.cyan, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>Referral Tracking</p>
          <h1 style={{ fontSize:"1.8rem", fontWeight:900, color:C.text }}>Referral Sources</h1>
          <p style={{ color:C.muted, fontSize:"0.875rem", marginTop:4 }}>
            Track physicians, SNFs, and care facilities that refer patients to your hospital.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(""); setForm(empty); }}
          style={{ background:`var(--nyx-accent)`, color:"#000", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:800, fontSize:"0.85rem", cursor:"pointer" }}
        >
          + Add Source
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom:20 }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:"0.875rem", width:280, outline:"none" }}
        />
      </div>

      {/* Table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Name","Type","Practice / Hospital","NPI","Assigned Rep","Referrals MTD","Goal","Attainment","Status"].map((h) => (
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"0.65rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{ padding:"32px", textAlign:"center", color:C.muted, fontSize:"0.875rem" }}>Loading…</td></tr>
              )}
              {!loading && sources.length === 0 && (
                <tr><td colSpan={9} style={{ padding:"48px", textAlign:"center", color:C.muted, fontSize:"0.875rem" }}>
                  No referral sources yet.{" "}
                  <button onClick={() => setShowAdd(true)} style={{ color:C.cyan, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Add your first source</button>
                </td></tr>
              )}
              {sources.map((s) => {
                const pct = attainment(s.monthlyGoal, s._count.referrals);
                return (
                  <tr key={s.id} style={{ borderBottom:`1px solid var(--nyx-accent-dim)` }}>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ fontWeight:700, fontSize:"0.875rem", color:C.text }}>{s.name}</div>
                      {s.specialty && <div style={{ fontSize:"0.7rem", color:C.muted }}>{s.specialty}</div>}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ background:"var(--nyx-accent-dim)", border:`1px solid var(--nyx-accent-mid)`, borderRadius:999, padding:"2px 8px", fontSize:"0.65rem", fontWeight:700, color:C.cyan, whiteSpace:"nowrap" }}>
                        {LABEL[s.type] ?? s.type}
                      </span>
                    </td>
                    <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{s.practiceName ?? "-"}</td>
                    <td style={{ padding:"12px 14px", fontSize:"0.78rem", color:C.dim, fontFamily:"monospace" }}>{s.npi ?? "-"}</td>
                    <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{s.assignedRep?.user?.name ?? "Unassigned"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontSize:"1.1rem", fontWeight:900, color:C.cyan }}>{s._count.referrals}</span>
                    </td>
                    <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:C.muted }}>{s.monthlyGoal ?? "-"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      {pct !== null ? (
                        <span style={{ fontSize:"0.82rem", fontWeight:700, color: pct >= 100 ? C.emerald : pct >= 75 ? C.amber : C.red }}>
                          {pct}%
                        </span>
                      ) : <span style={{ color:C.dim }}>-</span>}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.08em", color: s.active ? C.emerald : C.muted }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background: s.active ? C.emerald : "rgba(216,232,244,0.2)", display:"inline-block" }} />
                        {s.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ background:"var(--nyx-bg)", border:`1px solid ${C.border}`, borderRadius:14, padding:32, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ fontSize:"1.2rem", fontWeight:900, color:C.text, marginBottom:20 }}>Add Referral Source</h2>
            {error && <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"10px 14px", color:C.red, fontSize:"0.82rem", marginBottom:16 }}>{error}</div>}

            {[
              { label:"Name *", key:"name", placeholder:"Dr. Sarah Mitchell" },
              { label:"Practice / Facility Name", key:"practiceName", placeholder:"Riverside Family Practice" },
              { label:"Specialty", key:"specialty", placeholder:"Cardiology" },
              { label:"NPI", key:"npi", placeholder:"1234567890" },
              { label:"Contact Name", key:"contactName", placeholder:"Office Manager" },
              { label:"Phone", key:"phone", placeholder:"555-000-0000" },
              { label:"City", key:"city", placeholder:"Denver" },
              { label:"State", key:"state", placeholder:"CO" },
              { label:"Monthly Goal (referrals)", key:"monthlyGoal", placeholder:"10" },
              { label:"Notes", key:"notes", placeholder:"Warm relationship, refer on Tuesdays" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:"0.72rem", fontWeight:700, color:C.muted, marginBottom:5, letterSpacing:"0.06em" }}>{label}</label>
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:"0.875rem", outline:"none", boxSizing:"border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:"0.72rem", fontWeight:700, color:C.muted, marginBottom:5, letterSpacing:"0.06em" }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:"0.875rem", outline:"none" }}
              >
                {SOURCE_TYPES.map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}
              </select>
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 20px", color:C.muted, cursor:"pointer", fontWeight:600, fontSize:"0.85rem" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ background:`var(--nyx-accent)`, color:"#000", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:800, fontSize:"0.85rem", cursor:"pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Add Source"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
