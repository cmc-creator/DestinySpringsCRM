"use client";
import React, { useState } from "react";

const GOLD   = "#c9a84c";
const RED    = "#f87171";
const AMBER  = "#fbbf24";
const GREEN  = "#34d399";
const BLUE   = "#60a5fa";
const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-border)";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  notes?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: TaskPriority;
  dueAt?: string | null;
  hospital?: { id: string; hospitalName: string } | null;
  opportunity?: { id: string; title: string } | null;
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW:    GREEN,
  MEDIUM: GOLD,
  HIGH:   AMBER,
  URGENT: RED,
};

function getDueColor(dueAt: string | null | undefined): string {
  if (!dueAt) return MUTED;
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  if (due < now) return RED;
  const diff = due - now;
  const hoursLeft = diff / (1000 * 60 * 60);
  if (hoursLeft < 24) return AMBER;
  return MUTED;
}

function formatDue(dueAt: string | null | undefined): string {
  if (!dueAt) return "";
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return "Due yesterday";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default function DashboardTasksWidget({
  initialTasks,
}: {
  initialTasks: Task[];
}) {
  const [tasks, setTasks]       = useState<Task[]>(initialTasks);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  async function markDone(taskId: string) {
    if (completing.has(taskId)) return;
    setCompleting(prev => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });
      if (res.ok) {
        // Optimistic remove with a brief checkmark animation
        setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          setCompleting(prev => { const s = new Set(prev); s.delete(taskId); return s; });
        }, 600);
      } else {
        setCompleting(prev => { const s = new Set(prev); s.delete(taskId); return s; });
      }
    } catch {
      setCompleting(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  }

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--nyx-accent-label)", letterSpacing: "0.13em", textTransform: "uppercase", margin: 0 }}>
          OPEN TASKS
        </p>
        <a
          href="/rep/tasks"
          style={{ fontSize: "0.72rem", color: GOLD, fontWeight: 600, textDecoration: "none" }}
        >
          View all →
        </a>
      </div>

      {tasks.length === 0 ? (
        <p style={{ color: MUTED, fontSize: "0.83rem", margin: 0 }}>No open tasks. 🎉</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map(task => {
            const isDone = completing.has(task.id);
            const dueColor = getDueColor(task.dueAt);
            const isOverdue = task.dueAt && new Date(task.dueAt).getTime() < Date.now();
            return (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.15)",
                  borderRadius: 10,
                  border: `1px solid ${isOverdue ? "rgba(248,113,113,0.2)" : BORDER}`,
                  opacity: isDone ? 0.4 : 1,
                  transition: "opacity 0.4s",
                }}
              >
                {/* Checkmark button */}
                <button
                  onClick={() => markDone(task.id)}
                  disabled={isDone}
                  title="Mark complete"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `2px solid ${isDone ? GREEN : BORDER}`,
                    background: isDone ? "rgba(52,211,153,0.2)" : "transparent",
                    cursor: isDone ? "default" : "pointer",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                    transition: "all 0.3s",
                    color: isDone ? GREEN : "transparent",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                  }}
                >
                  {isDone ? "✓" : ""}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.83rem",
                      color: TEXT,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "calc(100% - 80px)",
                    }}>
                      {task.title}
                    </span>
                    <span style={{
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      color: PRIORITY_COLOR[task.priority],
                      background: `${PRIORITY_COLOR[task.priority]}18`,
                      borderRadius: 5,
                      padding: "1px 6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      flexShrink: 0,
                    }}>
                      {task.priority}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                    {task.dueAt && (
                      <span style={{ fontSize: "0.7rem", color: dueColor, fontWeight: isOverdue ? 700 : 400 }}>
                        {isOverdue && "⚠ "}{formatDue(task.dueAt)}
                      </span>
                    )}
                    {task.hospital && (
                      <span style={{ fontSize: "0.7rem", color: MUTED }}>
                        {task.hospital.hospitalName}
                      </span>
                    )}
                    {task.opportunity && (
                      <span style={{ fontSize: "0.7rem", color: BLUE }}>
                        {task.opportunity.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
