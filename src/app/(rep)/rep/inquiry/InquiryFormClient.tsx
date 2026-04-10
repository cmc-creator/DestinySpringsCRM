"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";

const C = {
  cyan:   "var(--nyx-accent)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  card:   "var(--nyx-card)",
  border: "var(--nyx-border)",
  lbl:    "var(--nyx-accent-label)",
};
const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`,
  borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: "0.875rem",
  width: "100%", outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: "0.62rem", fontWeight: 700, color: C.muted,
  letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5,
};
function Check({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <div onClick={() => onChange(!value)} style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${value ? C.cyan : C.border}`,
        background: value ? "var(--nyx-accent-mid)" : "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {value && <span style={{ color: C.cyan, fontSize: "0.7rem", fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: "0.875rem", color: C.muted }}>{label}</span>
    </label>
  );
}

type Hospital = { id: string; hospitalName: string };
type ReferralSource = { id: string; name: string };

export default function InquiryFormClient({
  hospitals,
  referralSources,
}: {
  hospitals: Hospital[];
  referralSources: ReferralSource[];
}) {
  const router = useRouter();
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    patientInitials: "", patientAge: "", patientGender: "",
    presentingConcern: "", currentMedications: "",
    suicidalIdeation: false, substanceUse: false,
    priorTreatment: false, priorTreatmentDetails: "",
    primaryInsurance: "", memberId: "", groupNumber: "",
    referralSourceId: "", referringProvider: "",
    hospitalId: "", urgencyLevel: "ROUTINE",
  });

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.presentingConcern.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { alert("Submission failed. Please try again."); return; }
      setSuccess(true);
      setTimeout(() => router.push("/rep/inquiry"), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 64, gap: 16 }}>
        <div style={{ fontSize: "3rem" }}>✅</div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: C.text }}>Pre-Assessment Submitted</div>
        <div style={{ color: C.muted }}>Clinical team has been notified. Redirecting…</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Urgency Banner */}
      {form.urgencyLevel === "EMERGENT" && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 18px", marginBottom: 20, color: "#fca5a5", fontWeight: 700, fontSize: "0.875rem" }}>
          🚨 EMERGENT — This will immediately notify the clinical team. Use only for crisis situations.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Section: Patient */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.lbl, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Patient Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Initials</label>
              <input value={form.patientInitials} onChange={e => set("patientInitials", e.target.value)} style={inp} placeholder="J.D." />
            </div>
            <div>
              <label style={lbl}>Age</label>
              <input type="number" min="0" max="120" value={form.patientAge} onChange={e => set("patientAge", e.target.value)} style={inp} placeholder="34" />
            </div>
            <div>
              <label style={lbl}>Gender</label>
              <select value={form.patientGender} onChange={e => set("patientGender", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Urgency Level</label>
            <select value={form.urgencyLevel} onChange={e => set("urgencyLevel", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="ROUTINE">Routine — Standard review</option>
              <option value="URGENT">Urgent — Same-day response needed</option>
              <option value="EMERGENT">Emergent 🚨 — Crisis / immediate risk</option>
            </select>
          </div>
        </div>

        {/* Section: Clinical */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.lbl, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Clinical Presentation</div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Presenting Concern *</label>
            <textarea required value={form.presentingConcern} onChange={e => set("presentingConcern", e.target.value)} rows={4}
              placeholder="Describe the patient's primary presenting concern and current mental status…"
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Current Medications</label>
            <textarea value={form.currentMedications} onChange={e => set("currentMedications", e.target.value)} rows={2}
              placeholder="List current psychiatric and medical medications…"
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Check value={form.suicidalIdeation}  onChange={v => set("suicidalIdeation", v)}  label="Active suicidal ideation / self-harm risk" />
            <Check value={form.substanceUse}       onChange={v => set("substanceUse", v)}       label="Active substance use / intoxication" />
            <Check value={form.priorTreatment}     onChange={v => set("priorTreatment", v)}     label="Prior psychiatric treatment" />
          </div>
          {form.priorTreatment && (
            <div style={{ marginTop: 12 }}>
              <label style={lbl}>Prior Treatment Details</label>
              <textarea value={form.priorTreatmentDetails} onChange={e => set("priorTreatmentDetails", e.target.value)} rows={2}
                placeholder="Where, when, and what type of treatment…"
                style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
            </div>
          )}
        </div>

        {/* Section: Insurance */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.lbl, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Insurance Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>Primary Insurance</label>
              <input value={form.primaryInsurance} onChange={e => set("primaryInsurance", e.target.value)} style={inp} placeholder="Blue Cross Blue Shield" />
            </div>
            <div>
              <label style={lbl}>Member ID</label>
              <input value={form.memberId} onChange={e => set("memberId", e.target.value)} style={inp} placeholder="XYZ123456" />
            </div>
            <div>
              <label style={lbl}>Group Number</label>
              <input value={form.groupNumber} onChange={e => set("groupNumber", e.target.value)} style={inp} placeholder="G0042" />
            </div>
          </div>
        </div>

        {/* Section: Referral Context */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.lbl, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Referral Context</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>Sending Facility</label>
              <SearchableSelect
                options={hospitals.map(h => ({ value: h.id, label: h.hospitalName }))}
                value={form.hospitalId}
                onChange={(v) => set("hospitalId", v)}
                placeholder="— None —"
              />
            </div>
            <div>
              <label style={lbl}>Referral Source</label>
              <SearchableSelect
                options={referralSources.map(s => ({ value: s.id, label: s.name }))}
                value={form.referralSourceId}
                onChange={(v) => set("referralSourceId", v)}
                placeholder="— None —"
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Referring Provider Name</label>
              <input value={form.referringProvider} onChange={e => set("referringProvider", e.target.value)} style={inp} placeholder="Dr. Jane Smith, LCSW" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={saving || !form.presentingConcern.trim()}
          style={{
            background: form.presentingConcern.trim() ? (form.urgencyLevel === "EMERGENT" ? "rgba(239,68,68,0.2)" : "var(--nyx-accent-dim)") : "rgba(0,0,0,0.2)",
            border: `1px solid ${form.presentingConcern.trim() ? (form.urgencyLevel === "EMERGENT" ? "rgba(239,68,68,0.4)" : "var(--nyx-accent-str)") : C.border}`,
            borderRadius: 10, padding: "12px 0", width: "100%",
            color: form.presentingConcern.trim() ? (form.urgencyLevel === "EMERGENT" ? "#fca5a5" : C.cyan) : C.muted,
            fontSize: "0.95rem", fontWeight: 800, cursor: form.presentingConcern.trim() ? "pointer" : "default",
          }}>
          {saving ? "Submitting…" : form.urgencyLevel === "EMERGENT" ? "🚨 Submit Emergent Pre-Assessment" : "Submit Pre-Assessment"}
        </button>
      </div>
    </form>
  );
}
