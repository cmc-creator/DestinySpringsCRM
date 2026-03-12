"use client";
import { useState, useEffect, useCallback } from "react";

const ACT_ICON: Record<string, string> = {
  CALL: "📞", EMAIL: "✉️", NOTE: "📝", MEETING: "🤝", TASK: "☑️",
  PROPOSAL_SENT: "📄", CONTRACT_SENT: "📋", DEMO_COMPLETED: "🖥️",
  SITE_VISIT: "📍", CONFERENCE: "🎤", LUNCH: "🍽️", FOLLOW_UP: "🔔",
};

const ACT_LABEL: Record<string, string> = {
  CALL: "Call", EMAIL: "Email", NOTE: "Note", MEETING: "Meeting", LUNCH: "Lunch",
  TASK: "Task", PROPOSAL_SENT: "Proposal Sent", CONTRACT_SENT: "Contract Sent",
  DEMO_COMPLETED: "Demo", SITE_VISIT: "Site Visit", CONFERENCE: "Conference", FOLLOW_UP: "Follow-up",
};

const ACT_TYPES = [
  "CALL","EMAIL","NOTE","MEETING","LUNCH","FOLLOW_UP",
  "SITE_VISIT","DEMO_COMPLETED","PROPOSAL_SENT","CONTRACT_SENT","TASK","CONFERENCE",
];

interface Activity {
  id: string; type: string; title: string; notes?: string | null; createdAt: string;
}

type EntityParam = "leadId" | "opportunityId" | "hospitalId" | "referralSourceId";

const C = {
  card: "var(--nyx-card)", border: "var(--nyx-border)",
  text: "var(--nyx-text)", muted: "var(--nyx-text-muted)",
  input: "var(--nyx-input-bg)", cyan: "var(--nyx-accent)",
};

const inp: React.CSSProperties = {
  width: "100%", background: C.input, border: `1px solid ${C.border}`,
  borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem",
  outline: "none", boxSizing: "border-box",
};

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityFeedPanel({
  entityId, entityParam, entityName, entitySubtitle, onClose,
}: {
  entityId: string;
  entityParam: EntityParam;
  entityName: string;
  entitySubtitle?: string;
  onClose: () => void;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState("NOTE");
  const [logTitle, setLogTitle] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/activities?${entityParam}=${entityId}`);
      if (r.ok) setActivities(await r.json());
    } finally { setLoading(false); }
  }, [entityId, entityParam]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  async function logActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!logTitle.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: logType, title: logTitle, notes: logNotes || null, [entityParam]: entityId }),
      });
      setLogTitle(""); setLogNotes("");
      await loadActivities();
    } finally { setSaving(false); }
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 380,
      background: "var(--nyx-bg)", borderLeft: "1px solid var(--nyx-accent-str)",
      zIndex: 200, display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>Activity Feed</div>
          <div style={{ fontWeight: 700, color: C.text, fontSize: "0.92rem", lineHeight: 1.3 }}>{entityName}</div>
          {entitySubtitle && <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2 }}>{entitySubtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem", lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {loading ? (
          <div style={{ color: C.muted, textAlign: "center", paddingTop: 24, fontSize: "0.82rem" }}>Loading…</div>
        ) : activities.length === 0 ? (
          <div style={{ color: C.muted, textAlign: "center", paddingTop: 32, fontSize: "0.82rem" }}>
            No activities logged yet.<br />Use the form below to add the first one.
          </div>
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
                <div style={{ fontSize: "0.66rem", color: "var(--nyx-accent-label)", marginTop: 1, marginBottom: a.notes ? 5 : 0 }}>
                  {ACT_LABEL[a.type] ?? a.type.replace(/_/g, " ")}
                </div>
                {a.notes && <div style={{ fontSize: "0.78rem", color: C.muted, lineHeight: 1.45 }}>{a.notes}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log form */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px", flexShrink: 0, background: "rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Log Activity</div>
        <form onSubmit={logActivity} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select style={{ ...inp, appearance: "none", padding: "7px 10px", fontSize: "0.8rem" }} value={logType} onChange={e => setLogType(e.target.value)}>
            {ACT_TYPES.map(t => <option key={t} value={t}>{ACT_LABEL[t] ?? t.replace(/_/g, " ")}</option>)}
          </select>
          <input
            required
            style={{ ...inp, padding: "7px 10px", fontSize: "0.8rem" }}
            value={logTitle}
            onChange={e => setLogTitle(e.target.value)}
            placeholder="Summary / title…"
          />
          <textarea
            style={{ ...inp, padding: "7px 10px", fontSize: "0.8rem", minHeight: 56, resize: "vertical" }}
            value={logNotes}
            onChange={e => setLogNotes(e.target.value)}
            placeholder="Notes… (optional)"
          />
          <button
            type="submit"
            disabled={saving || !logTitle.trim()}
            style={{
              background: saving ? "rgba(0,0,0,0.2)" : "var(--nyx-accent-mid)",
              border: "1px solid var(--nyx-accent-str)", borderRadius: 7,
              padding: "8px", color: saving ? C.muted : C.cyan,
              cursor: saving || !logTitle.trim() ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "0.82rem",
            }}
          >
            {saving ? "Saving…" : "Log Activity"}
          </button>
        </form>
      </div>
    </div>
  );
}
