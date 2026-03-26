"use client";
import React, { useState, useEffect, useCallback } from "react";

const ACT_ICON: Record<string, string> = {
  CALL: "📞", EMAIL: "✉️", NOTE: "📝", MEETING: "🤝", TASK: "☑️",
  PROPOSAL_SENT: "📄", CONTRACT_SENT: "📋", DEMO_COMPLETED: "🖥️",
  SITE_VISIT: "📍", CONFERENCE: "🎤", LUNCH: "🍽️", FOLLOW_UP: "🔔",
  REFERRAL_RECEIVED: "🔁",
};

const ACT_LABEL: Record<string, string> = {
  CALL: "Call", EMAIL: "Email", NOTE: "Note", MEETING: "Meeting", LUNCH: "Lunch",
  TASK: "Task", PROPOSAL_SENT: "Proposal Sent", CONTRACT_SENT: "Contract Sent",
  DEMO_COMPLETED: "Demo", SITE_VISIT: "Site Visit", CONFERENCE: "Conference",
  FOLLOW_UP: "Follow-up", REFERRAL_RECEIVED: "Referral Received",
};

const ACT_TYPES = Object.keys(ACT_LABEL);

interface Activity {
  id: string;
  type: string;
  title: string;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  hospital?: { id: string; hospitalName: string } | null;
  lead?: { hospitalName: string } | null;
  rep?: { user: { name: string | null } } | null;
}

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const GOLD = "#c9a84c";
const C = {
  border: "rgba(201,168,76,0.15)",
  text: "#ede4cf",
  muted: "rgba(237,228,207,0.45)",
  card: "rgba(255,255,255,0.03)",
  input: "rgba(255,255,255,0.06)",
};

const inp: React.CSSProperties = {
  background: C.input,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  color: C.text,
  fontSize: "0.82rem",
  outline: "none",
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "CALL", title: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activities");
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = activities.filter((a) => {
    const matchesType = typeFilter === "ALL" || a.type === typeFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.hospital?.hospitalName.toLowerCase().includes(q) ||
      a.rep?.user.name?.toLowerCase().includes(q) ||
      a.notes?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: form.type, title: form.title, notes: form.notes || undefined, completedAt: new Date() }),
      });
      setForm({ type: "CALL", title: "", notes: "" });
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  // Type breakdown counts
  const typeCounts = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: C.text }}>Activity Log</h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: C.muted }}>
            {activities.length} total activities
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: GOLD, color: "#100805", fontWeight: 800, fontSize: "0.85rem", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}
        >
          + Log Activity
        </button>
      </div>

      {/* Stat pills */}
      {topTypes.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          {topTypes.map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? "ALL" : type)}
              style={{
                background: typeFilter === type ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${typeFilter === type ? "rgba(201,168,76,0.4)" : C.border}`,
                borderRadius: 20,
                padding: "5px 14px",
                color: typeFilter === type ? GOLD : C.muted,
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {ACT_ICON[type] ?? "•"} {ACT_LABEL[type] ?? type} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          ))}
          {typeFilter !== "ALL" && (
            <button onClick={() => setTypeFilter("ALL")} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 14px", color: C.muted, fontSize: "0.78rem", cursor: "pointer" }}>
              Clear filter ×
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          style={{ ...inp, flex: 1, minWidth: 200 }}
          placeholder="Search activities, accounts, reps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ ...inp, minWidth: 160 }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All Types</option>
          {ACT_TYPES.map((t) => (
            <option key={t} value={t}>{ACT_ICON[t]} {ACT_LABEL[t]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 160px 110px", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span />
          <span>Activity</span>
          <span>Account</span>
          <span>Rep</span>
          <span>Date</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>
            {activities.length === 0 ? "No activities yet. Import data or log one above." : "No matches for your filters."}
          </div>
        ) : (
          filtered.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 160px 160px 110px",
                padding: "12px 16px",
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                alignItems: "start",
              }}
            >
              <span style={{ fontSize: "1.1rem", paddingTop: 1 }}>{ACT_ICON[a.type] ?? "•"}</span>
              <div>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{a.title}</p>
                {a.notes && <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: C.muted, lineHeight: 1.4 }}>{a.notes.slice(0, 120)}{a.notes.length > 120 ? "…" : ""}</p>}
                <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.68rem", fontWeight: 700, color: GOLD, background: "rgba(201,168,76,0.1)", borderRadius: 4, padding: "1px 6px" }}>
                  {ACT_LABEL[a.type] ?? a.type}
                </span>
              </div>
              <span style={{ fontSize: "0.8rem", color: C.muted, paddingTop: 2 }}>
                {a.hospital?.hospitalName ?? a.lead?.hospitalName ?? "—"}
              </span>
              <span style={{ fontSize: "0.8rem", color: C.muted, paddingTop: 2 }}>
                {a.rep?.user.name ?? "—"}
              </span>
              <span style={{ fontSize: "0.75rem", color: C.muted, paddingTop: 2 }}>
                {relTime(a.completedAt ?? a.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Log modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: "#1a1108", border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 800, color: C.text }}>Log Activity</h2>
            <form onSubmit={handleLog} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Type</label>
                <select style={{ ...inp, width: "100%" }} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {ACT_TYPES.map((t) => <option key={t} value={t}>{ACT_ICON[t]} {ACT_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Title / Subject *</label>
                <input
                  required
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. Called Dr. Smith at Sunrise ED"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Notes</label>
                <textarea
                  rows={3}
                  style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  placeholder="Optional details…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: GOLD, border: "none", borderRadius: 9, color: "#100805", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontSize: "0.82rem" }}>
                  {saving ? "Saving…" : "Save Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
