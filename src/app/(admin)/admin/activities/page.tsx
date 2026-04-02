"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";

const ACT_ICON: Record<string, string> = {
  CALL: "📞",
  EMAIL: "✉️",
  NOTE: "📝",
  MEETING: "🤝",
  TASK: "☑️",
  PROPOSAL_SENT: "📄",
  CONTRACT_SENT: "📋",
  DEMO_COMPLETED: "🖥️",
  SITE_VISIT: "📍",
  CONFERENCE: "🎤",
  LUNCH: "🍽️",
  FOLLOW_UP: "🔔",
  REFERRAL_RECEIVED: "🔁",
  IN_SERVICE: "🩺",
  FACILITY_TOUR: "🥼",
  CE_PRESENTATION: "🎓",
  CRISIS_CONSULT: "🚨",
  LUNCH_AND_LEARN: "🍱",
  COMMUNITY_EVENT: "🌉",
  DISCHARGE_PLANNING: "📋",
};

const ACT_LABEL: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  NOTE: "Note",
  MEETING: "Meeting",
  LUNCH: "Lunch",
  TASK: "Task",
  PROPOSAL_SENT: "Proposal Sent",
  CONTRACT_SENT: "Contract Sent",
  DEMO_COMPLETED: "Demo",
  SITE_VISIT: "Site Visit",
  CONFERENCE: "Conference",
  FOLLOW_UP: "Follow-up",
  REFERRAL_RECEIVED: "Referral Received",
  IN_SERVICE: "In-Service Training",
  FACILITY_TOUR: "Facility Tour",
  CE_PRESENTATION: "CE Presentation",
  CRISIS_CONSULT: "Crisis Consult",
  LUNCH_AND_LEARN: "Lunch & Learn",
  COMMUNITY_EVENT: "Community Event",
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
  lead?: { hospitalName: string } | null;
  rep?: { user: { name: string | null } } | null;
  createdByUser?: { id: string; name: string | null; email: string } | null;
}

interface AccountOption {
  id: string;
  hospitalName: string;
}

interface RelinkResult {
  linked: number;
  skipped: number;
}

function relTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const GOLD = "#c9a84c";
const C = {
  border: "rgba(201,168,76,0.15)",
  text: "#ede4cf",
  muted: "rgba(237,228,207,0.45)",
  card: "rgba(255,255,255,0.03)",
  input: "rgba(255,255,255,0.06)",
};

const inp: CSSProperties = {
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
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [relinkResult, setRelinkResult] = useState<RelinkResult | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState({
    type: "",
    title: "",
    notes: "",
    hospitalId: "",
    completedAt: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  useEffect(() => {
    fetch("/api/hospitals")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/activities");
      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void load();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [load]);

  const filtered = activities.filter((activity) => {
    const matchesType = typeFilter === "ALL" || activity.type === typeFilter;
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      activity.title.toLowerCase().includes(query) ||
      activity.hospital?.hospitalName.toLowerCase().includes(query) ||
      activity.rep?.user.name?.toLowerCase().includes(query) ||
      activity.notes?.toLowerCase().includes(query);

    return matchesType && matchesSearch;
  });

  const typeCounts = activities.reduce<Record<string, number>>((acc, activity) => {
    acc[activity.type] = (acc[activity.type] ?? 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(typeCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  function openEdit(activity: Activity) {
    setEditActivity(activity);
    setEditForm({
      type: activity.type,
      title: activity.title,
      notes: activity.notes ?? "",
      hospitalId: activity.hospital?.id ?? "",
      completedAt: activity.completedAt ? new Date(activity.completedAt).toISOString().slice(0, 10) : "",
    });
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editActivity) return;

    setEditSaving(true);
    try {
      const response = await fetch(`/api/activities/${editActivity.id}`, {
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

      if (!response.ok) {
        alert("Save failed");
        return;
      }

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
      await fetch(`/api/activities/${id}`, { method: "DELETE" });
      setActivities((prev) => prev.filter((activity) => activity.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected activit${selected.size === 1 ? "y" : "ies"}? This cannot be undone.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const response = await fetch("/api/admin/activities/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });

      if (!response.ok) {
        alert("Bulk delete failed");
        return;
      }

      setSelected(new Set());
      await load();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleRelink() {
    setRelinking(true);
    setRelinkResult(null);
    try {
      const response = await fetch("/api/admin/relink-activities", { method: "POST" });
      const data = await response.json();
      setRelinkResult({ linked: data.linked ?? 0, skipped: data.skipped ?? 0 });
      await load();
    } catch {
      alert("Re-link failed - please try again.");
    } finally {
      setRelinking(false);
    }
  }

  async function handleLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          notes: form.notes || undefined,
          completedAt: new Date(),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        alert(`Failed to log activity: ${errorPayload?.error ?? response.statusText}`);
        return;
      }

      setForm({ type: "CALL", title: "", notes: "" });
      setShowModal(false);
      await load();
    } catch (error) {
      alert(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: C.text }}>Activity Log</h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: C.muted }}>{activities.length} total activities</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: GOLD, color: "#100805", fontWeight: 800, fontSize: "0.85rem", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}>
          + Log Activity
        </button>
        <button onClick={handleRelink} disabled={relinking} title="Re-link activities that have no account connected" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)", color: relinking ? "rgba(237,228,207,0.3)" : "rgba(237,228,207,0.6)", fontWeight: 700, fontSize: "0.82rem", borderRadius: 10, padding: "10px 14px", cursor: relinking ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {relinking ? "Linking..." : "Link Accounts"}
        </button>
        <button onClick={() => void load()} disabled={loading} title="Refresh" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)", color: loading ? "rgba(237,228,207,0.3)" : "rgba(237,228,207,0.6)", fontWeight: 700, fontSize: "0.82rem", borderRadius: 10, padding: "10px 14px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Refreshing" : "Refresh"}
        </button>
        {selected.size > 0 && (
          <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: bulkDeleting ? "rgba(239,68,68,0.4)" : "#f87171", fontWeight: 800, fontSize: "0.82rem", borderRadius: 10, padding: "10px 14px", cursor: bulkDeleting ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {bulkDeleting ? "Deleting..." : `Delete ${selected.size} selected`}
          </button>
        )}
      </div>

      {relinkResult && (
        <div style={{ background: relinkResult.linked > 0 ? "rgba(80,200,120,0.08)" : "rgba(255,180,0,0.08)", border: `1px solid ${relinkResult.linked > 0 ? "rgba(80,200,120,0.3)" : "rgba(255,180,0,0.3)"}`, borderRadius: 10, padding: "10px 16px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem", color: C.text }}>
          <span>
            {relinkResult.linked > 0
              ? `Linked ${relinkResult.linked} activit${relinkResult.linked === 1 ? "y" : "ies"} to accounts.${relinkResult.skipped > 0 ? ` ${relinkResult.skipped} could not be matched.` : ""}`
              : "No activities were linked. Import accounts first, then try again."}
          </span>
          <button onClick={() => setRelinkResult(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1rem", padding: "0 4px" }}>
            x
          </button>
        </div>
      )}

      {topTypes.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          {topTypes.map(([type, count]) => (
            <button key={type} onClick={() => setTypeFilter(typeFilter === type ? "ALL" : type)} style={{ background: typeFilter === type ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${typeFilter === type ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 20, padding: "5px 14px", color: typeFilter === type ? GOLD : C.muted, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
              {ACT_ICON[type] ?? "*"} {ACT_LABEL[type] ?? type} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          ))}
          {typeFilter !== "ALL" && (
            <button onClick={() => setTypeFilter("ALL")} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 14px", color: C.muted, fontSize: "0.78rem", cursor: "pointer" }}>
              Clear filter
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Search activities, accounts, reps..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select style={{ ...inp, minWidth: 160 }} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All Types</option>
          {ACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACT_ICON[type]} {ACT_LABEL[type]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div className="nyx-table-scroll">
          <div style={{ minWidth: 980 }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 40px 1fr 160px 140px 140px 110px 56px", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <input type="checkbox" title="Select all visible" checked={filtered.length > 0 && filtered.every((activity) => selected.has(activity.id))} onChange={(event) => {
                if (event.target.checked) {
                  setSelected(new Set(filtered.map((activity) => activity.id)));
                  return;
                }
                setSelected(new Set());
              }} style={{ width: 14, height: 14, accentColor: GOLD, cursor: "pointer" }} />
              <span />
              <span>Activity</span>
              <span>Account</span>
              <span>Rep</span>
              <span>Logged By</span>
              <span>Date</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>{activities.length === 0 ? "No activities yet. Import data or log one above." : "No matches for your filters."}</div>
            ) : (
              filtered.map((activity, index) => (
                <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "28px 40px 1fr 160px 140px 140px 110px 56px", padding: "12px 16px", borderBottom: index < filtered.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "start" }}>
                  <input type="checkbox" checked={selected.has(activity.id)} onChange={(event) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (event.target.checked) next.add(activity.id);
                      else next.delete(activity.id);
                      return next;
                    });
                  }} style={{ width: 14, height: 14, accentColor: GOLD, cursor: "pointer", marginTop: 3 }} />
                  <span style={{ fontSize: "1.1rem", paddingTop: 1 }}>{ACT_ICON[activity.type] ?? "*"}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{activity.title}</p>
                    {activity.notes && <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: C.muted, lineHeight: 1.4 }}>{activity.notes.slice(0, 120)}{activity.notes.length > 120 ? "..." : ""}</p>}
                    <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.68rem", fontWeight: 700, color: GOLD, background: "rgba(201,168,76,0.1)", borderRadius: 4, padding: "1px 6px" }}>{ACT_LABEL[activity.type] ?? activity.type}</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: C.muted, paddingTop: 2 }}>{activity.hospital?.hospitalName ?? activity.lead?.hospitalName ?? "-"}</span>
                  <span style={{ fontSize: "0.8rem", color: C.muted, paddingTop: 2 }}>{activity.rep?.user.name ?? "-"}</span>
                  <span style={{ fontSize: "0.8rem", color: C.muted, paddingTop: 2 }}>{activity.createdByUser?.name ?? activity.createdByUser?.email ?? "-"}</span>
                  <span style={{ fontSize: "0.75rem", color: C.muted, paddingTop: 2 }}>{relTime(activity.completedAt ?? activity.createdAt)}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                    <button onClick={() => openEdit(activity)} title="Edit" style={{ background: "none", border: "none", color: "rgba(201,168,76,0.6)", cursor: "pointer", fontSize: "0.85rem", padding: 2 }}>Edit</button>
                    <button onClick={() => void handleDelete(activity.id)} disabled={deleting.has(activity.id)} title="Delete" style={{ background: "none", border: "none", color: "rgba(255,80,80,0.5)", cursor: deleting.has(activity.id) ? "not-allowed" : "pointer", fontSize: "0.85rem", padding: 2 }}>{deleting.has(activity.id) ? "..." : "Delete"}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {editActivity && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={(event) => { if (event.target === event.currentTarget) setEditActivity(null); }}>
          <div style={{ background: "#1a1108", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 800, color: C.text }}>Edit Activity</h2>
            <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Type</label>
                <select style={{ ...inp, width: "100%" }} value={editForm.type} onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value }))}>
                  {ACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ACT_ICON[type]} {ACT_LABEL[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Title *</label>
                <input required style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={editForm.title} onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Account</label>
                <select style={{ ...inp, width: "100%" }} value={editForm.hospitalId} onChange={(event) => setEditForm((prev) => ({ ...prev, hospitalId: event.target.value }))}>
                  <option value="">- None -</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.hospitalName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Date</label>
                <input type="date" style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={editForm.completedAt} onChange={(event) => setEditForm((prev) => ({ ...prev, completedAt: event.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Notes</label>
                <textarea rows={3} style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }} value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setEditActivity(null)} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Cancel</button>
                <button type="submit" disabled={editSaving} style={{ padding: "9px 20px", background: GOLD, border: "none", borderRadius: 9, color: "#100805", fontWeight: 800, cursor: editSaving ? "not-allowed" : "pointer", fontSize: "0.82rem" }}>{editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#1a1108", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 800, color: C.text }}>Log Activity</h2>
            <form onSubmit={handleLog} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Type</label>
                <select style={{ ...inp, width: "100%" }} value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
                  {ACT_TYPES.map((type) => (
                    <option key={type} value={type}>{ACT_ICON[type]} {ACT_LABEL[type]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Title / Subject *</label>
                <input required style={{ ...inp, width: "100%", boxSizing: "border-box" }} placeholder="e.g. Called Dr. Smith at Sunrise ED" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: C.muted, marginBottom: 5 }}>Notes</label>
                <textarea rows={3} style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }} placeholder="Optional details..." value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: GOLD, border: "none", borderRadius: 9, color: "#100805", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontSize: "0.82rem" }}>{saving ? "Saving..." : "Save Activity"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
