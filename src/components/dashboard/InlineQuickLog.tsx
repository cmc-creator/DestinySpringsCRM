"use client";
import React, { useState } from "react";

const GOLD   = "#c9a84c";
const GREEN  = "#34d399";
const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-border)";

const QUICK_TYPES = [
  { type: "CALL",            label: "Call",        icon: "📞" },
  { type: "EMAIL",           label: "Email",       icon: "✉️" },
  { type: "MEETING",         label: "Meeting",     icon: "🤝" },
  { type: "SITE_VISIT",      label: "Site Visit",  icon: "📍" },
  { type: "LUNCH_AND_LEARN", label: "Lunch & Learn", icon: "🍱" },
];

const ALL_TYPES = [
  { type: "NOTE",             label: "Note",             icon: "📝" },
  { type: "LUNCH",            label: "Lunch",            icon: "🍽️" },
  { type: "FOLLOW_UP",        label: "Follow-Up",        icon: "🔔" },
  { type: "IN_SERVICE",       label: "In-Service",       icon: "🏫" },
  { type: "CE_PRESENTATION",  label: "CE Presentation",  icon: "🎓" },
  { type: "FACILITY_TOUR",    label: "Facility Tour",    icon: "🏥" },
  { type: "CONFERENCE",       label: "Conference",       icon: "🎤" },
  { type: "PROPOSAL_SENT",    label: "Proposal Sent",    icon: "📄" },
  { type: "REFERRAL_RECEIVED",label: "Referral Received",icon: "🔁" },
  { type: "DISCHARGE_PLANNING",label: "Discharge Planning",icon: "📋" },
  { type: "COMMUNITY_EVENT",  label: "Community Event",  icon: "🌐" },
  { type: "CRISIS_CONSULT",   label: "Crisis Consult",   icon: "🚨" },
];

interface Hospital { id: string; hospitalName: string; }

interface Props {
  hospitals: Hospital[];
}

export default function InlineQuickLog({ hospitals }: Props) {
  const [selectedType, setSelectedType] = useState("CALL");
  const [showMore, setShowMore]         = useState(false);
  const [title, setTitle]               = useState("");
  const [notes, setNotes]               = useState("");
  const [hospitalId, setHospitalId]     = useState("");
  const [showNotes, setShowNotes]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const allChoices = showMore ? [...QUICK_TYPES, ...ALL_TYPES] : QUICK_TYPES;
  const selectedDef = [...QUICK_TYPES, ...ALL_TYPES].find(t => t.type === selectedType) ?? QUICK_TYPES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:       selectedType,
          title:      title.trim(),
          notes:      notes.trim() || null,
          hospitalId: hospitalId || null,
          completedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to log");
      }
      // Reset form
      setTitle("");
      setNotes("");
      setHospitalId("");
      setShowNotes(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--nyx-accent-label)", letterSpacing: "0.13em", textTransform: "uppercase", margin: 0 }}>
          QUICK LOG ACTIVITY
        </p>
        {success && (
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: GREEN, background: "rgba(52,211,153,0.12)", borderRadius: 6, padding: "3px 9px" }}>
            ✓ Logged
          </span>
        )}
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
        {allChoices.map(t => (
          <button
            key={t.type}
            onClick={() => setSelectedType(t.type)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px",
              borderRadius: 8,
              border: selectedType === t.type
                ? `1px solid ${GOLD}`
                : "1px solid var(--nyx-border)",
              background: selectedType === t.type
                ? "rgba(201,168,76,0.14)"
                : "rgba(255,255,255,0.03)",
              color: selectedType === t.type ? GOLD : MUTED,
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "0.85rem" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setShowMore(v => !v)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--nyx-border)",
            background: "rgba(255,255,255,0.03)",
            color: MUTED,
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          {showMore ? "Less ↑" : "More ↓"}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Title */}
        <input
          type="text"
          placeholder={`${selectedDef.icon} ${selectedDef.label} — what happened?`}
          value={title}
          onChange={e => { setTitle(e.target.value); setError(null); }}
          required
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${error ? "rgba(248,113,113,0.5)" : BORDER}`,
            borderRadius: 9,
            padding: "10px 14px",
            color: TEXT,
            fontSize: "0.88rem",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* Account select */}
        <select
          value={hospitalId}
          onChange={e => setHospitalId(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${BORDER}`,
            borderRadius: 9,
            padding: "9px 12px",
            color: hospitalId ? TEXT : MUTED,
            fontSize: "0.85rem",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <option value="">Account / Facility (optional)</option>
          {hospitals.map(h => (
            <option key={h.id} value={h.id}>{h.hospitalName}</option>
          ))}
        </select>

        {/* Notes toggle + field */}
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            style={{ background: "none", border: "none", color: MUTED, fontSize: "0.75rem", cursor: "pointer", textAlign: "left", padding: 0 }}
          >
            + Add notes
          </button>
        ) : (
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BORDER}`,
              borderRadius: 9,
              padding: "9px 14px",
              color: TEXT,
              fontSize: "0.85rem",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        )}

        {error && (
          <p style={{ fontSize: "0.75rem", color: "#f87171", margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 18px",
            background: saving ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.18)",
            border: `1px solid ${GOLD}`,
            borderRadius: 9,
            color: GOLD,
            fontWeight: 700,
            fontSize: "0.83rem",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            letterSpacing: "0.04em",
          }}
        >
          {saving ? "Logging..." : `Log ${selectedDef.label}`}
        </button>
      </form>
    </div>
  );
}
