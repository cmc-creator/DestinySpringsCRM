"use client";
import { useState } from "react";

const ACTIVITY_TYPES = [
  { value: "CALL",           label: "📞 Call",            color: "#60a5fa" },
  { value: "MEETING",        label: "🤝 Meeting",         color: "#34d399" },
  { value: "LUNCH",          label: "🍽️ Lunch",          color: "#fb923c" },
  { value: "SITE_VISIT",     label: "📍 Site Visit",      color: "#fbbf24" },
  { value: "EMAIL",          label: "✉️ Email",           color: "#c084fc" },
  { value: "FOLLOW_UP",      label: "🔔 Follow-up",       color: "#f87171" },
  { value: "CONFERENCE",     label: "🎤 Conference",      color: "#a78bfa" },
  { value: "DEMO_COMPLETED", label: "🖥️ Demo",           color: "#22d3ee" },
  { value: "TASK",           label: "✅ Task",            color: "#86efac" },
  { value: "NOTE",           label: "📝 Note",            color: "var(--nyx-accent)" },
  { value: "PROPOSAL_SENT",  label: "📄 Proposal Sent",   color: "#fcd34d" },
  { value: "CONTRACT_SENT",  label: "📋 Contract Sent",   color: "#6ee7b7" },
];

export default function QuickLogWidget({ repId, role }: { repId?: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "detail">("type");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (role === "ACCOUNT") return null;

  const reset = () => { setStep("type"); setType(""); setTitle(""); setNotes(""); setSaved(false); };
  const close = () => { setOpen(false); reset(); };

  const selectType = (t: string) => {
    setType(t);
    const label = ACTIVITY_TYPES.find(a => a.value === t)?.label.replace(/^[\p{Emoji}\s]+/u, "").trim() ?? t;
    setTitle(label);
    setStep("detail");
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), notes: notes.trim() || null, repId: repId ?? null }),
      });
      setSaved(true);
      setTimeout(() => close(), 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* FAB — offset above the AIChatWidget FAB (bottom:24 right:24) to prevent overlap */}
      <button
        onClick={() => setOpen(true)}
        title="Quick log activity"
        style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 500,
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--nyx-accent), var(--nyx-accent-str))",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px var(--nyx-accent-glow)",
          fontSize: "1.3rem",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        ⚡
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}
          onClick={close}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ margin: "0 24px 24px 0", width: "min(360px, calc(100vw - 32px))", background: "var(--nyx-card)", border: "1px solid var(--nyx-accent-str)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 80px rgba(0,0,0,0.6)" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--nyx-accent-dim)" }}>
              <div>
                <p style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>QUICK LOG</p>
                <p style={{ fontWeight: 700, color: "var(--nyx-text)", fontSize: "0.95rem" }}>Log Activity</p>
              </div>
              <button onClick={close} style={{ background: "none", border: "none", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>×</button>
            </div>

            {saved ? (
              <div style={{ padding: 32, textAlign: "center", color: "#34d399", fontSize: "1.5rem" }}>✓ Logged!</div>
            ) : step === "type" ? (
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ACTIVITY_TYPES.map(a => (
                  <button key={a.value} onClick={() => selectType(a.value)}
                    style={{ background: "rgba(0,0,0,0.2)", border: `1px solid var(--nyx-accent-dim)`, borderRadius: 10, padding: "14px 10px", cursor: "pointer", color: a.color, fontSize: "0.875rem", fontWeight: 600, textAlign: "center", transition: "border-color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--nyx-accent-dim)"; }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Title</label>
                  <input
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && save()}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 8, padding: "9px 12px", color: "var(--nyx-text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 8, padding: "9px 12px", color: "var(--nyx-text)", fontSize: "0.875rem", outline: "none", resize: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep("type")} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 8, padding: "9px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>← Back</button>
                  <button onClick={save} disabled={saving || !title.trim()}
                    style={{ flex: 2, background: "var(--nyx-accent)", border: "none", borderRadius: 8, padding: "9px", color: "#000", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", opacity: saving || !title.trim() ? 0.6 : 1 }}>
                    {saving ? "Saving…" : "Log It"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
