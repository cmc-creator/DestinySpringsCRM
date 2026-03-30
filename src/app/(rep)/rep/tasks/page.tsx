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

export default function RepTasksPage() {
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [updating, setUpdating]     = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter !== "ALL" ? `/api/tasks?status=${statusFilter}` : "/api/tasks";
      const res = await fetch(url);
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

  async function setStatus(id: string, status: TaskStatus) {
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

  const open       = tasks.filter((t) => t.status === "OPEN");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const done       = tasks.filter((t) => t.status === "DONE");
  const cancelled  = tasks.filter((t) => t.status === "CANCELLED");

  const _columns: { label: string; status: TaskStatus; items: Task[] }[] = [
    { label: "Open",        status: "OPEN",        items: open },
    { label: "In Progress", status: "IN_PROGRESS", items: inProgress },
    { label: "Done",        status: "DONE",        items: done },
    { label: "Cancelled",   status: "CANCELLED",   items: cancelled },
  ];

  const filtered = statusFilter === "ALL" ? tasks : tasks.filter((t) => t.status === statusFilter);

  return (
    <div style={{ color: C.text, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: GOLD, margin: 0, letterSpacing: 2 }}>MY TASKS</h1>
          <p style={{ color: C.muted, fontSize: "0.82rem", margin: "4px 0 0" }}>{tasks.length} total · {open.length} open · {inProgress.length} in progress</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: GOLD, color: "#1a1208", padding: "9px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer", letterSpacing: 1 }}
        >
          + New Task
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(["ALL", "OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: "0.78rem",
              fontWeight: 600,
              border: `1px solid ${statusFilter === s ? GOLD : C.border}`,
              background: statusFilter === s ? "rgba(201,168,76,0.15)" : "transparent",
              color: statusFilter === s ? GOLD : C.muted,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            {s === "ALL" ? "All" : STATUS_LABELS[s as TaskStatus]}
            {" "}
            <span style={{ opacity: 0.7 }}>
              {s === "ALL" ? tasks.length
                : s === "OPEN" ? open.length
                : s === "IN_PROGRESS" ? inProgress.length
                : s === "DONE" ? done.length
                : cancelled.length}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>☑️</div>
          <p>No tasks yet. Create one to get started.</p>
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
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              {/* Status toggle checkbox */}
              <button
                disabled={updating.has(task.id)}
                onClick={() => setStatus(task.id, task.status === "DONE" ? "OPEN" : task.status === "OPEN" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : "OPEN")}
                title="Cycle status"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  border: `2px solid ${STATUS_COLOR[task.status]}`,
                  background: task.status === "DONE" ? STATUS_COLOR.DONE : "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1a2a1a",
                  fontSize: "0.75rem",
                }}
              >
                {task.status === "DONE" && "✓"}
                {task.status === "IN_PROGRESS" && "…"}
              </button>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: "0.92rem",
                    textDecoration: task.status === "DONE" ? "line-through" : "none",
                    opacity: task.status === "CANCELLED" ? 0.4 : 1,
                  }}>
                    {task.title}
                  </span>
                  {/* Priority badge */}
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: PRIORITY_COLOR[task.priority], border: `1px solid ${PRIORITY_COLOR[task.priority]}40`, borderRadius: 12, padding: "1px 8px", letterSpacing: 0.5 }}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                  {/* Status badge */}
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

              {/* Quick status select */}
              <select
                value={task.status}
                disabled={updating.has(task.id)}
                onChange={(e) => setStatus(task.id, e.target.value as TaskStatus)}
                style={{ ...inp, fontSize: "0.75rem", padding: "4px 8px" }}
              >
                {(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
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
