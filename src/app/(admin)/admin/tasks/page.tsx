"use client";
import React, { useState, useEffect, useCallback } from "react";

type TaskStatus   = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  notes?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  hospital?: { id: string; hospitalName: string } | null;
  rep?: { user: { name: string | null } } | null;
  lead?: { id: string; hospitalName: string } | null;
  opportunity?: { id: string; title: string } | null;
}

const GOLD = "#c9a84c";
const C = {
  border: "rgba(201,168,76,0.15)",
  text: "#ede4cf",
  muted: "rgba(237,228,207,0.45)",
  card: "rgba(255,255,255,0.03)",
  input: "rgba(255,255,255,0.06)",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  OPEN:        "#60a5fa",
  IN_PROGRESS: GOLD,
  DONE:        "#4ade80",
  CANCELLED:   "rgba(237,228,207,0.3)",
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW:    "#4ade80",
  MEDIUM: GOLD,
  HIGH:   "#fb923c",
  URGENT: "#f87171",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", DONE: "Done", CANCELLED: "Cancelled",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent",
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

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(task: Task) {
  if (!task.dueAt || task.status === "DONE" || task.status === "CANCELLED") return false;
  return new Date(task.dueAt) < new Date();
}

const EMPTY_FORM = { title: "", notes: "", priority: "MEDIUM" as TaskPriority, dueAt: "" };

export default function AdminTasksPage() {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [updating, setUpdating]         = useState<Set<string>>(new Set());
  const [deleting, setDeleting]         = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) setTasks(await res.json());
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function createTask() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          notes: form.notes || null,
          priority: form.priority,
          dueAt: form.dueAt || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm(EMPTY_FORM);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(id: string, status: TaskStatus) {
    setUpdating((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } finally {
      setUpdating((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      load();
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const filtered = tasks.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.notes ?? "").toLowerCase().includes(q) ||
      (t.rep?.user.name ?? "").toLowerCase().includes(q) ||
      (t.hospital?.hospitalName ?? "").toLowerCase().includes(q)
    );
  });

  const counts = {
    open: tasks.filter((t) => t.status === "OPEN").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    overdue: tasks.filter(isOverdue).length,
  };

  return (
    <div style={{ color: C.text, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: GOLD, margin: 0, letterSpacing: 2 }}>TASKS</h1>
          <p style={{ color: C.muted, fontSize: "0.82rem", margin: "4px 0 0" }}>
            {tasks.length} total · {counts.open} open · {counts.inProgress} in progress
            {counts.overdue > 0 && <span style={{ color: "#f87171", marginLeft: 8 }}>· {counts.overdue} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: GOLD, color: "#1a1208", padding: "9px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer", letterSpacing: 1 }}
        >
          + New Task
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Open",        value: counts.open,       color: "#60a5fa" },
          { label: "In Progress", value: counts.inProgress, color: GOLD },
          { label: "Done",        value: counts.done,        color: "#4ade80" },
          { label: "Overdue",     value: counts.overdue,     color: "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, letterSpacing: 0.5, marginTop: 2 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          style={{ ...inp, flex: 1, minWidth: 180, maxWidth: 280 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={inp}>
          <option value="ALL">All Statuses</option>
          {(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} style={inp}>
          <option value="ALL">All Priorities</option>
          {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>☑️</div>
          <p>No tasks found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((task) => (
            <div
              key={task.id}
              style={{
                background: C.card,
                border: `1px solid ${isOverdue(task) ? "rgba(248,113,113,0.4)" : C.border}`,
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              {/* Checkbox toggle */}
              <button
                disabled={updating.has(task.id)}
                onClick={() => patchStatus(task.id, task.status === "DONE" ? "OPEN" : "DONE")}
                title={task.status === "DONE" ? "Mark open" : "Mark done"}
                style={{
                  width: 22, height: 22, borderRadius: 5,
                  border: `2px solid ${task.status === "DONE" ? STATUS_COLOR.DONE : C.border}`,
                  background: task.status === "DONE" ? STATUS_COLOR.DONE : "transparent",
                  cursor: "pointer", flexShrink: 0, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#1a2a1a", fontSize: "0.75rem",
                }}
              >
                {task.status === "DONE" && "✓"}
              </button>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{
                    fontWeight: 600, fontSize: "0.92rem",
                    textDecoration: task.status === "DONE" ? "line-through" : "none",
                    opacity: task.status === "CANCELLED" ? 0.4 : 1,
                  }}>
                    {task.title}
                  </span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: PRIORITY_COLOR[task.priority], border: `1px solid ${PRIORITY_COLOR[task.priority]}40`, borderRadius: 12, padding: "1px 8px", letterSpacing: 0.5 }}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: STATUS_COLOR[task.status], border: `1px solid ${STATUS_COLOR[task.status]}40`, borderRadius: 12, padding: "1px 8px" }}>
                    {STATUS_LABELS[task.status]}
                  </span>
                  {isOverdue(task) && (
                    <span style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 700 }}>OVERDUE</span>
                  )}
                </div>
                {task.notes && (
                  <p style={{ margin: "5px 0 0", fontSize: "0.8rem", color: C.muted }}>{task.notes}</p>
                )}
                <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: "0.75rem", color: C.muted, flexWrap: "wrap" }}>
                  {task.rep?.user.name && (
                    <span>Rep: <span style={{ color: C.text }}>{task.rep.user.name}</span></span>
                  )}
                  {task.dueAt && (
                    <span>Due: <span style={{ color: isOverdue(task) ? "#f87171" : C.text }}>{fmtDate(task.dueAt)}</span></span>
                  )}
                  {task.hospital && (
                    <span>Account: <span style={{ color: C.text }}>{task.hospital.hospitalName}</span></span>
                  )}
                  {task.lead && (
                    <span>Lead: <span style={{ color: C.text }}>{task.lead.hospitalName}</span></span>
                  )}
                  {task.completedAt && task.status === "DONE" && (
                    <span>Completed: {fmtDate(task.completedAt)}</span>
                  )}
                </div>
              </div>

              {/* Status select */}
              <select
                value={task.status}
                disabled={updating.has(task.id)}
                onChange={(e) => patchStatus(task.id, e.target.value as TaskStatus)}
                style={{ ...inp, fontSize: "0.75rem", padding: "4px 8px" }}
              >
                {(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>

              {/* Delete */}
              <button
                onClick={() => deleteTask(task.id)}
                disabled={deleting.has(task.id)}
                title="Delete task"
                style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.85rem", padding: "4px 6px", flexShrink: 0 }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setForm(EMPTY_FORM); } }}
        >
          <div style={{ background: "var(--nyx-surface, #1a1a2e)", border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700, color: GOLD, letterSpacing: 1 }}>NEW TASK</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginBottom: 5, letterSpacing: 0.5 }}>TITLE *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Task title…"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  onKeyDown={(e) => e.key === "Enter" && createTask()}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginBottom: 5, letterSpacing: 0.5 }}>NOTES</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  rows={3}
                  style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginBottom: 5, letterSpacing: 0.5 }}>PRIORITY</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))} style={{ ...inp, width: "100%" }}>
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginBottom: 5, letterSpacing: 0.5 }}>DUE DATE</label>
                  <input
                    type="date"
                    value={form.dueAt}
                    onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
                    style={{ ...inp, width: "100%", boxSizing: "border-box", colorScheme: "dark" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={saving || !form.title.trim()}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: GOLD, color: "#1a1208", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", opacity: saving || !form.title.trim() ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
