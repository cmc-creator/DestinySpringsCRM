"use client";
import { useState, useEffect, useCallback } from "react";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

interface Notification {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
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

export default function RepNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, margin: 0 }}>Notifications</h1>
          {unreadCount > 0 && (
            <p style={{ color: TEXT_MUTED, fontSize: "0.82rem", marginTop: 4 }}>{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            style={{
              background: "transparent", border: `1px solid var(--nyx-accent-str)`,
              borderRadius: 8, padding: "8px 16px", color: CYAN,
              fontSize: "0.82rem", fontWeight: 700, cursor: markingAll ? "not-allowed" : "pointer",
              opacity: markingAll ? 0.6 : 1,
            }}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
        {loading ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: "center", color: TEXT_MUTED }}>Loading…</div>
        ) : notifications.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: "center", color: TEXT_MUTED }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔔</div>
            <p style={{ margin: 0 }}>No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                background: n.read ? CARD : "var(--nyx-accent-dim)",
                border: `1px solid ${n.read ? BORDER : "var(--nyx-accent-mid)"}`,
                borderRadius: 10, padding: "14px 18px",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.read ? "rgba(216,232,244,0.15)" : CYAN, marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.read ? 400 : 600, fontSize: "0.875rem", color: TEXT, marginBottom: 3 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: 4 }}>{n.body}</div>}
                <div style={{ fontSize: "0.72rem", color: "rgba(216,232,244,0.3)" }}>{relTime(n.createdAt)}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    style={{ background: "transparent", border: `1px solid var(--nyx-accent-str)`, borderRadius: 6, padding: "4px 10px", color: CYAN, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Read
                  </button>
                )}
                <button
                  onClick={() => dismiss(n.id)}
                  style={{ background: "transparent", border: `1px solid rgba(216,232,244,0.1)`, borderRadius: 6, padding: "4px 8px", color: TEXT_MUTED, fontSize: "0.78rem", cursor: "pointer" }}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
