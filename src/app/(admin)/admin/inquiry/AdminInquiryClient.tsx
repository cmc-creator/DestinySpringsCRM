"use client";
import { useState, useEffect, useCallback } from "react";

const C = {
  cyan:   "var(--nyx-accent)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  card:   "var(--nyx-card)",
  border: "var(--nyx-border)",
  lbl:    "var(--nyx-accent-label)",
};

const STATUS_BADGES: Record<string, { color: string; bg: string }> = {
  SUBMITTED:    { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  UNDER_REVIEW: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  CONVERTED:    { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  DECLINED:     { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  ON_HOLD:      { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
};

const URGENCY_COLOR: Record<string, string> = {
  EMERGENT: "#f87171",
  URGENT:   "#fbbf24",
  ROUTINE:  "var(--nyx-text-muted)",
};

type Assessment = {
  id: string;
  submittedById: string;
  patientInitials?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  presentingConcern?: string | null;
  currentMedications?: string | null;
  suicidalIdeation: boolean;
  substanceUse: boolean;
  priorTreatment: boolean;
  primaryInsurance?: string | null;
  memberId?: string | null;
  referringProvider?: string | null;
  urgencyLevel?: string | null;
  status: string;
  reviewNotes?: string | null;
  createdAt: string;
};

export default function AdminInquiryClient() {
  const [list, setList]           = useState<Assessment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState("");
  const [selected, setSelected]   = useState<Assessment | null>(null);
  const [reviewNotes, setReview]  = useState("");
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set("status", statusFilter);
      const r = await fetch(`/api/inquiry?${p}`);
      if (r.ok) setList(await r.json());
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    try {
      const r = await fetch(`/api/inquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes: reviewNotes || null }),
      });
      if (!r.ok) { alert("Update failed"); return; }
      setSelected(null);
      load();
    } finally { setSaving(false); }
  }

  const inp: React.CSSProperties = {
    background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: "0.875rem",
    width: "100%", outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: C.lbl, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>ADMIN</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Pre-Assessment Inbox</h1>
        <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>Review and action patient pre-assessments submitted by reps</p>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {["", "SUBMITTED", "UNDER_REVIEW", "CONVERTED", "DECLINED", "ON_HOLD"].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                     background: statusFilter === s ? (STATUS_BADGES[s]?.bg ?? "var(--nyx-accent-dim)") : "rgba(0,0,0,0.2)",
                     border: `1px solid ${statusFilter === s ? (STATUS_BADGES[s]?.color ?? "var(--nyx-accent-str)") : C.border}`,
                     color: statusFilter === s ? (STATUS_BADGES[s]?.color ?? C.cyan) : C.muted }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: C.muted, padding: 32, textAlign: "center" }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 48, textAlign: "center", color: C.muted }}>No pre-assessments found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(a => {
            const badge = STATUS_BADGES[a.status] ?? { color: C.muted, bg: "rgba(0,0,0,0.2)" };
            const urgColor = URGENCY_COLOR[a.urgencyLevel ?? "ROUTINE"] ?? C.muted;
            return (
              <div key={a.id} onClick={() => { setSelected(a); setReview(a.reviewNotes ?? ""); }}
                style={{ background: C.card, border: `1px solid ${a.urgencyLevel === "EMERGENT" ? "rgba(239,68,68,0.35)" : C.border}`,
                         borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.text }}>
                    {a.patientInitials ?? "—"} · Age {a.patientAge ?? "—"} · {a.patientGender ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 3 }}>
                    <span style={{ color: urgColor, fontWeight: 700 }}>{a.urgencyLevel}</span>
                    &nbsp;·&nbsp; SI: {a.suicidalIdeation ? <span style={{ color: "#f87171" }}>YES</span> : "No"}
                    &nbsp;·&nbsp; SU: {a.substanceUse ? <span style={{ color: "#fbbf24" }}>YES</span> : "No"}
                    &nbsp;·&nbsp; {new Date(a.createdAt).toLocaleString()}
                  </div>
                  {a.presentingConcern && (
                    <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.presentingConcern}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: badge.color, background: badge.bg, padding: "3px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  {a.status.replace("_", " ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Panel */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: "var(--nyx-bg)", border: "1px solid var(--nyx-accent-str)", borderRadius: 16, padding: "28px 28px 24px", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: C.text }}>Review Pre-Assessment</h2>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: "1.4rem", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                ["Patient", `${selected.patientInitials ?? "—"}  ·  Age ${selected.patientAge ?? "—"}  ·  ${selected.patientGender ?? "—"}`],
                ["Urgency", selected.urgencyLevel ?? "ROUTINE"],
                ["Presenting Concern", selected.presentingConcern ?? "—"],
                ["Medications", selected.currentMedications ?? "None listed"],
                ["Suicidal Ideation", selected.suicidalIdeation ? "⚠️ YES" : "No"],
                ["Substance Use", selected.substanceUse ? "⚠️ YES" : "No"],
                ["Prior Treatment", selected.priorTreatment ? "Yes" : "No"],
                ["Insurance", `${selected.primaryInsurance ?? "—"} · ID: ${selected.memberId ?? "—"}`],
                ["Referring Provider", selected.referringProvider ?? "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: C.lbl, textTransform: "uppercase", letterSpacing: "0.08em", minWidth: 140 }}>{k}</div>
                  <div style={{ fontSize: "0.85rem", color: C.text, flex: 1 }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.62rem", fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Review Notes</label>
              <textarea value={reviewNotes} onChange={e => setReview(e.target.value)} rows={3}
                placeholder="Add review notes for the rep…"
                style={{ ...inp, resize: "vertical" as const, fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["UNDER_REVIEW", "ON_HOLD", "DECLINED", "CONVERTED"].map(s => {
                const badge = STATUS_BADGES[s];
                return (
                  <button key={s} disabled={saving} onClick={() => updateStatus(selected.id, s)}
                    style={{ background: badge.bg, border: `1px solid ${badge.color}40`, borderRadius: 8, padding: "9px 0", color: badge.color, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                    {saving ? "…" : s.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
