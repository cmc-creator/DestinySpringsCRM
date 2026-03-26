"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const CYAN       = "var(--nyx-accent)";
const CARD       = "var(--nyx-card)";
const BORDER     = "var(--nyx-accent-dim)";
const BORDER_MID = "var(--nyx-accent-mid)";
const TEXT       = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

interface Message {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesInbox({ currentUserId }: { currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [newTo, setNewTo] = useState("");
  const [composing, setComposing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setMessages(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // Fetch users for "New message" recipient picker
  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.ok ? r.json() : { users: [] })
      .then(data => setUsers(Array.isArray(data) ? data : (data.users ?? [])))
      .catch(() => {});
  }, []);

  // Build thread list: unique partners
  const threads = (() => {
    const map = new Map<string, { partnerId: string; partnerName: string; lastMsg: Message; unread: number }>();
    for (const m of messages) {
      const partnerId = m.fromUserId === currentUserId ? m.toUserId : m.fromUserId;
      const partnerName = m.fromUserId === currentUserId ? m.toName : m.fromName;
      const existing = map.get(partnerId);
      const isNewer = !existing || new Date(m.createdAt) > new Date(existing.lastMsg.createdAt);
      const unread = (existing?.unread ?? 0) + (m.toUserId === currentUserId && !m.readAt ? 1 : 0);
      if (isNewer) map.set(partnerId, { partnerId, partnerName, lastMsg: m, unread });
      else if (existing) existing.unread = unread;
    }
    return [...map.values()].sort((a, b) => new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime());
  })();

  async function openThread(partnerId: string) {
    setSelectedThread(partnerId);
    setComposing(false);
    setBody("");
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/messages?thread=${partnerId}`);
      if (res.ok) {
        const msgs = await res.json() as Message[];
        setThreadMessages(msgs);
        // Mark unread messages as read
        for (const m of msgs) {
          if (m.toUserId === currentUserId && !m.readAt) {
            fetch(`/api/messages/${m.id}`, { method: "PATCH" }).catch(() => {});
          }
        }
        setMessages(prev => prev.map(m =>
          m.toUserId === currentUserId && m.fromUserId === partnerId ? { ...m, readAt: m.readAt ?? new Date().toISOString() } : m
        ));
      }
    } finally {
      setThreadLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function sendMessage(toUserId: string) {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, body: body.trim() }),
      });
      if (res.ok) {
        const sent = await res.json() as Message;
        setBody("");
        if (selectedThread === toUserId) {
          setThreadMessages(prev => [...prev, { ...sent, fromName: "You", toName: sent.toName }]);
        } else {
          setSelectedThread(toUserId);
          setThreadMessages([{ ...sent, fromName: "You", toName: sent.toName }]);
        }
        setComposing(false);
        await loadInbox();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally {
      setSending(false);
    }
  }

  const selectedPartner = threads.find(t => t.partnerId === selectedThread);
  const composeTarget = users.find(u => u.id === newTo);

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 120px)", minHeight: 500, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Thread list */}
      <div style={{ width: 260, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: TEXT }}>Inbox</span>
          <button
            onClick={() => { setComposing(true); setSelectedThread(null); setBody(""); setNewTo(""); }}
            style={{ background: CYAN, border: "none", borderRadius: 6, padding: "4px 10px", color: "#000", fontSize: "0.72rem", fontWeight: 900, cursor: "pointer" }}
          >
            + New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: TEXT_MUTED, fontSize: "0.8rem" }}>Loading…</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: TEXT_MUTED, fontSize: "0.8rem" }}>No messages yet.<br />Tap + New to start a conversation.</div>
          ) : (
            threads.map(t => (
              <button
                key={t.partnerId}
                onClick={() => openThread(t.partnerId)}
                style={{
                  width: "100%", background: selectedThread === t.partnerId ? "var(--nyx-accent-dim)" : "transparent",
                  border: "none", borderLeft: selectedThread === t.partnerId ? `2px solid ${CYAN}` : "2px solid transparent",
                  padding: "12px 14px", cursor: "pointer", textAlign: "left",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontWeight: t.unread > 0 ? 700 : 500, fontSize: "0.82rem", color: t.unread > 0 ? TEXT : TEXT_MUTED }}>{t.partnerName}</span>
                  {t.unread > 0 && (
                    <span style={{ background: CYAN, color: "#000", fontSize: "0.58rem", fontWeight: 900, borderRadius: 9, padding: "1px 5px" }}>{t.unread}</span>
                  )}
                </div>
                <div style={{ fontSize: "0.72rem", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                  {t.lastMsg.fromUserId === currentUserId ? "You: " : ""}{t.lastMsg.body}
                </div>
                <div style={{ fontSize: "0.65rem", color: "rgba(216,232,244,0.25)", marginTop: 2 }}>{relTime(t.lastMsg.createdAt)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {composing ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "0.82rem", color: TEXT_MUTED }}>To:</span>
              <select
                value={newTo}
                onChange={e => setNewTo(e.target.value)}
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER_MID}`, borderRadius: 6, padding: "6px 10px", color: TEXT, fontSize: "0.82rem", outline: "none" }}
              >
                <option value="">Select recipient…</option>
                {users.filter(u => u.id !== currentUserId).map(u => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email} ({u.role})</option>
                ))}
              </select>
              <button onClick={() => setComposing(false)} style={{ background: "transparent", border: "none", color: TEXT_MUTED, cursor: "pointer", fontSize: "1rem" }}>×</button>
            </div>
            <div style={{ flex: 1, padding: 20, color: TEXT_MUTED, fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {newTo ? `Composing message to ${composeTarget?.name ?? composeTarget?.email ?? newTo}` : "Select a recipient above"}
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10 }}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message…"
                rows={3}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_MID}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: "0.82rem", outline: "none", resize: "none" }}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && newTo) { e.preventDefault(); sendMessage(newTo); } }}
              />
              <button
                onClick={() => newTo && sendMessage(newTo)}
                disabled={!newTo || !body.trim() || sending}
                style={{ background: CYAN, border: "none", borderRadius: 8, padding: "0 18px", color: "#000", fontWeight: 900, fontSize: "0.82rem", cursor: sending || !newTo || !body.trim() ? "not-allowed" : "pointer", opacity: sending || !newTo || !body.trim() ? 0.5 : 1 }}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        ) : selectedThread ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: TEXT }}>{selectedPartner?.partnerName ?? selectedThread}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {threadLoading ? (
                <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: "0.8rem", marginTop: 40 }}>Loading…</div>
              ) : threadMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: "0.8rem", marginTop: 40 }}>No messages yet</div>
              ) : (
                threadMessages.map(m => {
                  const mine = m.fromUserId === currentUserId;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "72%", background: mine ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${mine ? BORDER_MID : BORDER}`, borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        padding: "10px 14px",
                      }}>
                        <div style={{ fontSize: "0.82rem", color: TEXT, lineHeight: 1.5 }}>{m.body}</div>
                        <div style={{ fontSize: "0.65rem", color: TEXT_MUTED, marginTop: 4, textAlign: mine ? "right" : "left" }}>{relTime(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10 }}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Reply…"
                rows={2}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_MID}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: "0.82rem", outline: "none", resize: "none" }}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendMessage(selectedThread!); } }}
              />
              <button
                onClick={() => sendMessage(selectedThread!)}
                disabled={!body.trim() || sending}
                style={{ background: CYAN, border: "none", borderRadius: 8, padding: "0 18px", color: "#000", fontWeight: 900, fontSize: "0.82rem", cursor: sending || !body.trim() ? "not-allowed" : "pointer", opacity: sending || !body.trim() ? 0.5 : 1 }}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: TEXT_MUTED }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: "0.9rem" }}>Select a conversation or start a new one</div>
          </div>
        )}
      </div>
    </div>
  );
}
