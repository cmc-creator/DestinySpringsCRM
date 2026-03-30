"use client";
import React, { useState, useEffect, useCallback } from "react";

const ACT_ICON: Record<string, string> = {
  CALL: "📞", EMAIL: "✉️", NOTE: "📝", MEETING: "🤝", TASK: "☑️",
  PROPOSAL_SENT: "📄", CONTRACT_SENT: "📋", DEMO_COMPLETED: "🖥️",
  SITE_VISIT: "📍", CONFERENCE: "🎤", LUNCH: "🍽️", FOLLOW_UP: "🔔",
  REFERRAL_RECEIVED: "🔁", IN_SERVICE: "🏫", FACILITY_TOUR: "🏥",
  CE_PRESENTATION: "🎓", CRISIS_CONSULT: "🚨", LUNCH_AND_LEARN: "🍱",
  COMMUNITY_EVENT: "🌐", DISCHARGE_PLANNING: "📋",
};

const ACT_LABEL: Record<string, string> = {
  CALL: "Call", EMAIL: "Email", NOTE: "Note", MEETING: "Meeting", LUNCH: "Lunch",
  TASK: "Task", PROPOSAL_SENT: "Proposal Sent", CONTRACT_SENT: "Contract Sent",
  DEMO_COMPLETED: "Demo", SITE_VISIT: "Site Visit", CONFERENCE: "Conference",
  FOLLOW_UP: "Follow-up", REFERRAL_RECEIVED: "Referral Received",
  IN_SERVICE: "In-Service Training", FACILITY_TOUR: "Facility Tour",
  CE_PRESENTATION: "CE Presentation", CRISIS_CONSULT: "Crisis Consult",
  LUNCH_AND_LEARN: "Lunch & Learn", COMMUNITY_EVENT: "Community Event",
  DISCHARGE_PLANNING: "Discharge Planning",
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
}

interface AccountOption { id: string; hospitalName: string; }

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

export default function RepActivitiesClient({
  repId,
  hospitals,
}: {
  repId: string;
  hospitals: AccountOption[];
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "CALL", title: "", notes: "", hospitalId: "", completedAt: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState({ type: "", title: "", notes: "", hospitalId: "", completedAt: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activities?repId=${repId}`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [repId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  function openEdit(a: Activity) {
    setEditActivity(a);
    setEditForm({
      type: a.type,
      title: a.title,
      notes: a.notes ?? "",
      hospitalId: a.hospital?.id ?? "",
      completedAt: a.completedAt ? new Date(a.completedAt).toISOString().slice(0, 10) : "",
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editActivity) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/activities/${editActivity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editForm.type,
          title: editForm.title.trim(),
          notes: editForm.notes.trim() || null,
          hospitalId: editForm.hospitalId || null,
          completedAt: editForm.completedAt ? new Date(editForm.completedAt).toISOString() : null,
        }),
      });
      if (!res.ok) { alert("Save failed"); return; }
      setEditActivity(null);
      await load();
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this activity?")) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await fetch("/api/activities/" + id, { method: "DELETE" });
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          notes: form.notes || undefined,
          hospitalId: form.hospitalId || undefined,
          completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : new Date().toISOString(),
          repId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        alert(`Failed to log activity: ${err?.error ?? res.statusText}`);
        return;
      }
      setForm({ type: "CALL", title: "", notes: "", hospitalId: "", completedAt: "" });
      setShowModal(false);
      await load();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  const filtered = activities.filter((a) => {
    const matchesType = typeFilter === "ALL" || a.type === typeFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.hospital?.hospitalName.toLowerCase().includes(q) ||
      a.notes?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const typeCounts = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: C.text }}>My Activities</h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: C.muted }}>
            {activities.length} total · Use the ⚡ Quick Log button or log a detailed entry here
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: GOLD, color: "#100805", fontWeight: 800, fontSize: "0.85rem", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}
        >
          + Log Activity
        </button>
        <button
          onClick={load}
          disabled={loading}
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(201,168,76,0.2)`, color: loading ? "rgba(237,228,207,0.3)" : "rgba(237,228,207,0.6)", fontWeight: 700, fontSize: "0.82rem", borderRadius: 10, padding: "10px 14px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "↻" : "↻ Refresh"}
        </button>
      </div>

      {/* Type pills */}
      {topTypes.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          {topTypes.map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? "ALL" : type)}
              style={{ background: typeFilter === type ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${typeFilter === type ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 20, padding: "5px 14px", color: typeFilter === type ? GOLD : C.muted, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
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

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          style={{ ...inp, flex: 1, minWidth: 200 }}
          placeholder="Search activities, accounts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...inp, minWidth: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          {ACT_TYPES.map((t) => <option key={t} value={t}>{ACT_ICON[t]} {ACT_LABEL[t]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 180px 120px 36px", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span />
          <span>Activity</span>
          <span>Account</span>
          <span>Date</span>
          <span />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>
            {activities.length === 0 ? "No activities yet. Hit + Log Activity to get started." : "No matches for your filters."}
          </div>
        ) : (
          filtered.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 180px 120px 36px",
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
                {a.hospital?.hospitalName ?? "—"}
              </span>
              <span style={{ fontSize: "0.75rem", color: C.muted, paddingTop: 2 }}>
                {relTime(a.completedAt ?? a.createdAt)}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                <button onClick={() => openEdit(a)} title="Edit" style={{ background: "none", border: "none", color: "rgba(201,168,76,0.6)", cursor: "pointer", fontSize: "0.85rem", padding: 2 }}>✏️</button>
                <button onClick={() => handleDelete(a.id)} disabled={deleting.has(a.id)} title="Delete" style={{ background: "none", border: "none", color: "rgba(255,80,80,0.5)", cursor: deleting.has(a.id) ? "not-allowed" : "pointer", fontSize: "1rem", padding: 2 }}>
                  {deleting.has(a.id) ? "..." : "×"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {editActivity && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditActivity(null); }}
        >
          <div style={{ background: "#1a1108", border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 800, color: C.text }}>Edit Activity</h2>
            <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Type</label>
                <select style={{ ...inp, width: "100%" }} value={editForm.type} onChange={(e) => setEditForm(f => ({ ...f, type: e.target.value }))}>
                  {ACT_TYPES.map(t => <option key={t} value={t}>{ACT_ICON[t]} {ACT_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Title *</label>
                <input required style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Account</label>
                <select style={{ ...inp, width: "100%" }} value={editForm.hospitalId} onChange={(e) => setEditForm(f => ({ ...f, hospitalId: e.target.value }))}>
                  <option value="">— None —</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Date</label>
                <input type="date" style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={editForm.completedAt} onChange={(e) => setEditForm(f => ({ ...f, completedAt: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Notes</label>
                <textarea rows={3} style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }} value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setEditActivity(null)} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Cancel</button>
                <button type="submit" disabled={editSaving} style={{ padding: "9px 20px", background: GOLD, border: "none", borderRadius: 9, color: "#100805", fontWeight: 800, cursor: editSaving ? "not-allowed" : "pointer", fontSize: "0.82rem" }}>
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <select style={{ ...inp, width: "100%" }} value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                  {ACT_TYPES.map(t => <option key={t} value={t}>{ACT_ICON[t]} {ACT_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Title / Subject *</label>
                <input required style={{ ...inp, width: "100%", boxSizing: "border-box" }} placeholder="e.g. Called Dr. Smith at Sunrise ED" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Account</label>
                <select style={{ ...inp, width: "100%" }} value={form.hospitalId} onChange={(e) => setForm(f => ({ ...f, hospitalId: e.target.value }))}>
                  <option value="">— None —</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Date</label>
                <input type="date" style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={form.completedAt} onChange={(e) => setForm(f => ({ ...f, completedAt: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Notes</label>
                <textarea rows={3} style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }} placeholder="Optional details…" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
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
