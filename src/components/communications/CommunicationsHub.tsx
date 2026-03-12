"use client";
import { useState, useEffect, useCallback } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CYAN       = "var(--nyx-accent)";
const CARD       = "var(--nyx-card)";
const BORDER     = "var(--nyx-border)";
const TEXT       = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const ACCENT_DIM = "var(--nyx-accent-dim)";
const ACCENT_MID = "var(--nyx-accent-mid)";
const ACCENT_STR = "var(--nyx-accent-str)";

// ── Types ─────────────────────────────────────────────────────────────────────
interface IntegrationToken {
  provider:     string;
  email:        string | null;
  displayName:  string | null;
  teamsWebhook: string | null;
  expiresAt:    string | null;
  updatedAt:    string;
}

interface CommLog {
  id:        string;
  toEmail:   string | null;
  toName:    string | null;
  subject:   string | null;
  body:      string;
  channel:   string;
  status:    string;
  sentAt:    string | null;
  createdAt: string;
}

interface Template {
  id:       string;
  name:     string;
  subject:  string | null;
  body:     string;
  category: string;
}

// ── Channel config ────────────────────────────────────────────────────────────
const CHANNELS = [
  { value: "OUTLOOK", label: "Outlook Email",    icon: "📧", provider: "microsoft", color: "#0078D4" },
  { value: "GMAIL",   label: "Gmail",             icon: "📬", provider: "google",    color: "#EA4335" },
  { value: "TEAMS",   label: "Microsoft Teams",   icon: "💬", provider: "microsoft", color: "#5558AF" },
  { value: "INTERNAL", label: "Internal Note",   icon: "📝", provider: null,         color: "#6B7280" },
] as const;

const CATEGORIES = ["FOLLOW_UP","INTRODUCTION","PROPOSAL","CHECK_IN","THANK_YOU","INVITATION","OTHER"];
const CATEGORY_LABELS: Record<string, string> = {
  FOLLOW_UP: "Follow-Up", INTRODUCTION: "Introduction", PROPOSAL: "Proposal",
  CHECK_IN: "Check-In", THANK_YOU: "Thank You", INVITATION: "Invitation", OTHER: "Other",
};

const CHANNEL_STATUS_COLOR: Record<string, string> = {
  OUTLOOK: "#0078D4", GMAIL: "#EA4335", TEAMS: "#5558AF", INTERNAL: "#6B7280",
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    SENT:      { bg: "rgba(52,211,153,0.12)", color: "#34d399" },
    DRAFT:     { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
    FAILED:    { bg: "rgba(239,68,68,0.12)",  color: "#f87171" },
    SCHEDULED: { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
      background: s.bg, color: s.color, borderRadius: 20, padding: "2px 8px" }}>
      {status}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IntegrationBadge({
  token, providerKey: _providerKey, label, icon, color, onConnect, onDisconnect,
}: {
  token?: IntegrationToken;
  providerKey: string;
  label: string;
  icon: string;
  color: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = !!token;
  return (
    <div style={{
      background: CARD, border: `1px solid ${connected ? color + "44" : BORDER}`,
      borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center",
      gap: 12, minWidth: 200, flex: 1,
    }}>
      <span style={{ fontSize: "1.3rem" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT }}>{label}</div>
        {connected ? (
          <div style={{ fontSize: "0.68rem", color: "#34d399", marginTop: 2 }}>
            ● Connected{token.email ? ` · ${token.email}` : ""}
          </div>
        ) : (
          <div style={{ fontSize: "0.68rem", color: TEXT_MUTED, marginTop: 2 }}>Not connected</div>
        )}
      </div>
      {connected ? (
        <button
          onClick={onDisconnect}
          style={{ fontSize: "0.72rem", fontWeight: 600, color: "#f87171", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          style={{ fontSize: "0.72rem", fontWeight: 700, color: color, background: `${color}18`,
            border: `1px solid ${color}40`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
        >
          Connect
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  role: "ADMIN" | "REP" | "ACCOUNT";
}

export default function CommunicationsHub({ role: _role }: Props) {
  // State
  const [activeTab, setActiveTab]             = useState<"compose" | "history" | "templates">("compose");
  const [tokens, setTokens]                   = useState<IntegrationToken[]>([]);
  const [logs, setLogs]                       = useState<CommLog[]>([]);
  const [templates, setTemplates]             = useState<Template[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [sending, setSending]                 = useState(false);
  const [sendResult, setSendResult]           = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Compose form state
  const [to, setTo]                           = useState("");
  const [toName, setToName]                   = useState("");
  const [subject, setSubject]                 = useState("");
  const [body, setBody]                       = useState("");
  const [channel, setChannel]                 = useState<string>("INTERNAL");
  const [templateId, setTemplateId]           = useState<string>("");

  // Teams webhook edit state
  const [showTeamsWebhook, setShowTeamsWebhook] = useState(false);
  const [teamsWebhookInput, setTeamsWebhookInput] = useState("");
  const [savingWebhook, setSavingWebhook]         = useState(false);

  // New template form
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [tplName, setTplName]                 = useState("");
  const [tplSubject, setTplSubject]           = useState("");
  const [tplBody, setTplBody]                 = useState("");
  const [tplCategory, setTplCategory]         = useState("OTHER");
  const [savingTpl, setSavingTpl]             = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [tokRes, logRes, tplRes] = await Promise.all([
      fetch("/api/integrations/tokens"),
      fetch("/api/communications"),
      fetch("/api/communications/templates"),
    ]);
    if (tokRes.ok)  setTokens(await tokRes.json());
    if (logRes.ok)  setLogs(await logRes.json());
    if (tplRes.ok)  setTemplates(await tplRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    // Handle OAuth redirect results
    const params = new URLSearchParams(window.location.search);
    const connected   = params.get("connected");
    const oauthError  = params.get("oauth_error");
    if (connected)  setSendResult({ type: "success", msg: `✅ ${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!` });
    if (oauthError) setSendResult({ type: "error",   msg: `❌ OAuth error: ${oauthError}` });
    if (connected || oauthError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadAll]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getToken = (provider: string) => tokens.find((t) => t.provider === provider);
  const microsoftToken = getToken("microsoft");
  const googleToken    = getToken("google");

  function connectProvider(provider: "microsoft" | "google") {
    window.location.href = `/api/integrations/oauth/${provider}`;
  }

  async function disconnectProvider(provider: string) {
    if (!confirm(`Disconnect ${provider}? You'll need to re-authorize to send emails through it.`)) return;
    await fetch(`/api/integrations/tokens?provider=${provider}`, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.provider !== provider));
  }

  async function saveTeamsWebhook() {
    if (!teamsWebhookInput.startsWith("https://")) {
      alert("Please enter a valid HTTPS webhook URL.");
      return;
    }
    setSavingWebhook(true);
    const res = await fetch("/api/integrations/tokens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "microsoft", teamsWebhook: teamsWebhookInput }),
    });
    if (res.ok) {
      await loadAll();
      setShowTeamsWebhook(false);
      setSendResult({ type: "success", msg: "Teams webhook saved." });
    }
    setSavingWebhook(false);
  }

  function applyTemplate(tpl: Template) {
    setSubject(tpl.subject ?? "");
    setBody(tpl.body);
    setTemplateId(tpl.id);
    setActiveTab("compose");
  }

  function _askAI() {
    const prompt = `Draft a professional ${CATEGORY_LABELS[tplCategory] ?? "email"} message${to ? ` to ${toName || to}` : ""}${subject ? ` regarding: ${subject}` : ""}. Make it concise, warm, and professional. Return just the message body text.`;
    window.dispatchEvent(new CustomEvent("aegis:prompt", { detail: prompt }));
  }

  function fillBodyFromAI() {
    // Listen for AI response to fill body — fires aegis:prompt and listens for response
    const prompt = `Draft a professional outreach email body${to ? ` to ${toName || to}` : ""}${subject ? ` about: ${subject}` : ""}. Be concise, warm, and action-oriented. Return only the email body text without subject or salutation headers.`;
    window.dispatchEvent(new CustomEvent("aegis:prompt", { detail: prompt }));
  }

  async function handleSend() {
    if (!body.trim()) { alert("Please write a message first."); return; }
    if ((channel === "OUTLOOK" || channel === "GMAIL") && !to.trim()) {
      alert("Please enter a recipient email address."); return;
    }

    setSending(true);
    setSendResult(null);

    const res = await fetch("/api/communications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail:   to.trim()   || null,
        toName:    toName.trim() || null,
        subject:   subject.trim() || null,
        body:      body.trim(),
        channel,
        templateId: templateId || null,
      }),
    });

    const data = await res.json();
    setSending(false);

    if (!res.ok && res.status !== 502) {
      setSendResult({ type: "error", msg: data.error ?? "Send failed" });
      return;
    }
    if (res.status === 502) {
      setSendResult({ type: "error", msg: `Delivery failed: ${data.error}` });
      setLogs((prev) => [data.log, ...prev]);
      return;
    }

    setSendResult({ type: "success", msg: channel === "INTERNAL" ? "Note saved." : "Message sent!" });
    setLogs((prev) => [data.log, ...prev]);
    setTo(""); setToName(""); setSubject(""); setBody(""); setTemplateId("");
  }

  async function saveTemplate() {
    if (!tplName.trim() || !tplBody.trim()) { alert("Name and body are required."); return; }
    setSavingTpl(true);
    const res = await fetch("/api/communications/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tplName, subject: tplSubject, body: tplBody, category: tplCategory }),
    });
    if (res.ok) {
      const t = await res.json();
      setTemplates((prev) => [t, ...prev]);
      setTplName(""); setTplSubject(""); setTplBody(""); setTplCategory("OTHER");
      setShowNewTemplate(false);
    }
    setSavingTpl(false);
  }

  // ── Shared input style ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
    borderRadius: 8, padding: "9px 12px", fontSize: "0.83rem", color: TEXT,
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem", fontWeight: 700, color: TEXT_MUTED,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, display: "block",
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: TEXT_MUTED }}>
        Loading communications hub…
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: "1.3rem" }}>📡</span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: TEXT, margin: 0, letterSpacing: "-0.02em" }}>
            Communications Hub
          </h1>
        </div>
        <p style={{ fontSize: "0.85rem", color: TEXT_MUTED, margin: 0 }}>
          Send emails, Teams messages, and internal notes, all tracked in one place.
        </p>
      </div>

      {/* Integration badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <IntegrationBadge
          token={microsoftToken}
          providerKey="microsoft"
          label="Microsoft Outlook"
          icon="📧"
          color="#0078D4"
          onConnect={() => connectProvider("microsoft")}
          onDisconnect={() => disconnectProvider("microsoft")}
        />
        <IntegrationBadge
          token={googleToken}
          providerKey="google"
          label="Google Gmail"
          icon="📬"
          color="#EA4335"
          onConnect={() => connectProvider("google")}
          onDisconnect={() => disconnectProvider("google")}
        />

        {/* Microsoft Teams — webhook-based */}
        <div style={{
          background: CARD, border: `1px solid ${microsoftToken?.teamsWebhook ? "#5558AF44" : BORDER}`,
          borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center",
          gap: 12, minWidth: 200, flex: 1,
        }}>
          <span style={{ fontSize: "1.3rem" }}>💬</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT }}>Microsoft Teams</div>
            <div style={{ fontSize: "0.68rem", color: microsoftToken?.teamsWebhook ? "#34d399" : TEXT_MUTED, marginTop: 2 }}>
              {microsoftToken?.teamsWebhook ? "● Webhook configured" : "Webhook not configured"}
            </div>
          </div>
          <button
            onClick={() => { setTeamsWebhookInput(microsoftToken?.teamsWebhook ?? ""); setShowTeamsWebhook(true); }}
            style={{ fontSize: "0.72rem", fontWeight: 700, color: "#5558AF", background: "rgba(85,88,175,0.1)",
              border: "1px solid rgba(85,88,175,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
          >
            Configure
          </button>
        </div>

        {/* Google Calendar status (bundled with Google OAuth) */}
        <div style={{
          background: CARD, border: `1px solid ${googleToken ? "#1A73E844" : BORDER}`,
          borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center",
          gap: 12, minWidth: 200, flex: 1,
        }}>
          <span style={{ fontSize: "1.3rem" }}>📅</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT }}>Google Calendar</div>
            <div style={{ fontSize: "0.68rem", color: googleToken ? "#34d399" : TEXT_MUTED, marginTop: 2 }}>
              {googleToken ? "● Active via Google OAuth" : "Connect Google to enable"}
            </div>
          </div>
        </div>

        {/* Microsoft 365 Calendar status (bundled with Microsoft OAuth) */}
        <div style={{
          background: CARD, border: `1px solid ${microsoftToken ? "#0078D444" : BORDER}`,
          borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center",
          gap: 12, minWidth: 200, flex: 1,
        }}>
          <span style={{ fontSize: "1.3rem" }}>🗓️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT }}>Outlook Calendar</div>
            <div style={{ fontSize: "0.68rem", color: microsoftToken ? "#34d399" : TEXT_MUTED, marginTop: 2 }}>
              {microsoftToken ? "● Active via Microsoft OAuth" : "Connect Microsoft to enable"}
            </div>
          </div>
        </div>
      </div>

      {/* Teams webhook modal */}
      {showTeamsWebhook && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setShowTeamsWebhook(false)}
        >
          <div
            style={{ background: "var(--nyx-bg)", border: `1px solid ${BORDER}`, borderRadius: 14,
              padding: 28, width: 480, maxWidth: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", color: TEXT, fontSize: "1.05rem" }}>Configure Teams Webhook</h3>
            <p style={{ fontSize: "0.8rem", color: TEXT_MUTED, margin: "0 0 16px" }}>
              In Microsoft Teams, go to your channel → Manage Channel → Connectors → Incoming Webhook → Create. Paste the webhook URL below.
            </p>
            <label style={labelStyle}>Webhook URL</label>
            <input
              type="url"
              value={teamsWebhookInput}
              onChange={(e) => setTeamsWebhookInput(e.target.value)}
              placeholder="https://your-tenant.webhook.office.com/..."
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowTeamsWebhook(false)}
                style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${BORDER}`,
                  background: "transparent", color: TEXT_MUTED, cursor: "pointer", fontSize: "0.82rem" }}>
                Cancel
              </button>
              <button onClick={saveTeamsWebhook} disabled={savingWebhook}
                style={{ padding: "8px 16px", borderRadius: 7, border: "none",
                  background: "#5558AF", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                {savingWebhook ? "Saving…" : "Save Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert banner */}
      {sendResult && (
        <div style={{
          marginBottom: 20, padding: "12px 16px", borderRadius: 8, fontSize: "0.83rem", fontWeight: 600,
          background: sendResult.type === "success" ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${sendResult.type === "success" ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)"}`,
          color: sendResult.type === "success" ? "#34d399" : "#f87171",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {sendResult.msg}
          <button onClick={() => setSendResult(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
        {(["compose", "history", "templates"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "9px 18px", fontSize: "0.82rem", fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? CYAN : TEXT_MUTED,
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: activeTab === tab ? `2px solid ${CYAN}` : "2px solid transparent",
              textTransform: "capitalize", transition: "all 0.15s",
            }}
          >
            {tab === "compose" ? "✏️ Compose" : tab === "history" ? `📋 History (${logs.length})` : `📄 Templates (${templates.length})`}
          </button>
        ))}
      </div>

      {/* ── COMPOSE TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

          {/* Compose form */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>To (Email)</label>
                <input value={to} onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com" type="email" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Recipient Name</label>
                <input value={toName} onChange={(e) => setToName(e.target.value)}
                  placeholder="Dr. Jane Smith" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Channel</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CHANNELS.map((ch) => {
                  const isConnected = ch.provider === null
                    || (ch.provider === "microsoft" && (ch.value === "TEAMS" ? !!(microsoftToken?.teamsWebhook) : !!microsoftToken))
                    || (ch.provider === "google"    && !!googleToken);
                  return (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      title={!isConnected ? `Connect ${ch.provider} first` : ""}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                        borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                        border: channel === ch.value ? `1.5px solid ${ch.color}` : `1px solid ${BORDER}`,
                        background: channel === ch.value ? `${ch.color}18` : "transparent",
                        color: channel === ch.value ? ch.color : isConnected ? TEXT : TEXT_MUTED,
                        opacity: isConnected ? 1 : 0.5,
                        transition: "all 0.15s",
                      }}
                    >
                      <span>{ch.icon}</span>
                      {ch.label}
                      {!isConnected && <span style={{ fontSize: "0.65rem", opacity: 0.75 }}>⚠</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Re: Referral partnership opportunity" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <label style={{ ...labelStyle, margin: 0 }}>Message</label>
                <button
                  onClick={fillBodyFromAI}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 700,
                    color: CYAN, background: ACCENT_DIM, border: `1px solid ${ACCENT_MID}`,
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 3 11 7.5 15.5 9 11 10.5 9.5 15 8 10.5 3.5 9 8 7.5z"/>
                    <path d="M18 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>
                  </svg>
                  AI Draft
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={channel === "INTERNAL" ? "Write a note or activity log…" : "Write your message here, or click AI Draft to generate one…"}
                rows={9}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
              <select
                value={templateId}
                onChange={(e) => {
                  const tpl = templates.find((t) => t.id === e.target.value);
                  if (tpl) applyTemplate(tpl);
                  else setTemplateId("");
                }}
                style={{ ...inputStyle, width: "auto", flex: 1, maxWidth: 240 }}
              >
                <option value="">Use a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{CATEGORY_LABELS[t.category]}: {t.name}</option>
                ))}
              </select>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  padding: "10px 26px", borderRadius: 8, border: "none",
                  background: channel === "INTERNAL" ? ACCENT_MID : `linear-gradient(135deg, ${CHANNEL_STATUS_COLOR[channel]} 0%, ${CHANNEL_STATUS_COLOR[channel]}cc 100%)`,
                  color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                  cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1,
                  letterSpacing: "0.02em",
                }}
              >
                {sending ? "Sending…" : channel === "INTERNAL" ? "💾 Save Note" : "⚡ Send"}
              </button>
            </div>
          </div>

          {/* Quick actions panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Channel info */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Channel Info</div>
              {channel === "OUTLOOK" && (
                microsoftToken
                  ? <div style={{ fontSize: "0.8rem", color: TEXT }}>Sending as <span style={{ color: "#0078D4" }}>{microsoftToken.email ?? "your Microsoft account"}</span> via Microsoft Graph API</div>
                  : <div style={{ fontSize: "0.8rem", color: "#f87171" }}>⚠ Microsoft account not connected. <button onClick={() => connectProvider("microsoft")} style={{ color: "#0078D4", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}>Connect now</button></div>
              )}
              {channel === "GMAIL" && (
                googleToken
                  ? <div style={{ fontSize: "0.8rem", color: TEXT }}>Sending from <span style={{ color: "#EA4335" }}>{googleToken.email ?? "your Gmail account"}</span> via Gmail API</div>
                  : <div style={{ fontSize: "0.8rem", color: "#f87171" }}>⚠ Google account not connected. <button onClick={() => connectProvider("google")} style={{ color: "#EA4335", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}>Connect now</button></div>
              )}
              {channel === "TEAMS" && (
                microsoftToken?.teamsWebhook
                  ? <div style={{ fontSize: "0.8rem", color: TEXT }}>Posting to your <span style={{ color: "#5558AF" }}>Teams channel</span> via Incoming Webhook</div>
                  : <div style={{ fontSize: "0.8rem", color: "#f87171" }}>⚠ Teams webhook not configured. <button onClick={() => setShowTeamsWebhook(true)} style={{ color: "#5558AF", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}>Configure</button></div>
              )}
              {channel === "INTERNAL" && (
                <div style={{ fontSize: "0.8rem", color: TEXT_MUTED }}>Internal note: stored in the platform, not sent externally.</div>
              )}
            </div>

            {/* Quick prompts */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Quick Start</div>
              {[
                ["Introduction", "Write 'meeting request' in subject and click AI Draft"],
                ["Follow-Up", "Write 'follow up on our last meeting' in subject, AI Draft"],
                ["Proposal", "Write 'proposal for [name]' in subject, AI Draft"],
              ].map(([label, _tip]) => (
                <button
                  key={label}
                  onClick={() => {
                    setSubject(label === "Introduction" ? "Introduction: NyxAegis" : label === "Follow-Up" ? "Following up on our conversation" : "Proposal for your review");
                    fillBodyFromAI();
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                    marginBottom: 6, borderRadius: 7, border: `1px solid ${BORDER}`,
                    background: "transparent", color: TEXT, cursor: "pointer", fontSize: "0.8rem",
                    fontWeight: 600, transition: "background 0.15s" }}
                >
                  {label === "Introduction" ? "👋" : label === "Follow-Up" ? "🔄" : "📋"} {label}
                </button>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Recent Activity</div>
              {logs.length === 0 ? (
                <div style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>No messages yet.</div>
              ) : (
                logs.slice(0, 5).map((log) => (
                  <div key={log.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: "0.72rem", color: TEXT, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                        {log.toName ?? log.toEmail ?? "Internal"}
                      </span>
                      {statusBadge(log.status)}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>
                      {log.subject ?? "(no subject)"} · {timeAgo(log.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          {logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: TEXT_MUTED }}>
              No messages yet. Start by composing one.
            </div>
          ) : (
            <div className="nyx-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Channel", "To", "Subject", "Status", "Sent"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.68rem",
                      fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "0.82rem", color: CHANNEL_STATUS_COLOR[log.channel] ?? TEXT }}>
                        {CHANNELS.find((c) => c.value === log.channel)?.icon ?? "📝"}{" "}
                        {CHANNELS.find((c) => c.value === log.channel)?.label ?? log.channel}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: TEXT }}>
                      {log.toName ?? log.toEmail ?? <span style={{ color: TEXT_MUTED }}>-</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: TEXT_MUTED }}>
                      {log.subject ?? <span style={{ fontStyle: "italic" }}>no subject</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(log.status)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.78rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                      {timeAgo(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "templates" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              onClick={() => setShowNewTemplate((v) => !v)}
              style={{ padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem",
                background: ACCENT_DIM, border: `1px solid ${ACCENT_MID}`, color: CYAN, cursor: "pointer" }}
            >
              {showNewTemplate ? "Cancel" : "+ New Template"}
            </button>
          </div>

          {showNewTemplate && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: TEXT, marginBottom: 16, fontSize: "0.95rem" }}>New Template</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Template Name</label>
                  <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Warm Introduction" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={tplCategory} onChange={(e) => setTplCategory(e.target.value)} style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Subject Line (optional)</label>
                <input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} placeholder="e.g. Let's connect about {{topic}}" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Body</label>
                <textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} rows={7}
                  placeholder="Hi {{name}},&#10;&#10;I hope this finds you well…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowNewTemplate(false)}
                  style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_MUTED, cursor: "pointer", fontSize: "0.82rem" }}>
                  Cancel
                </button>
                <button onClick={saveTemplate} disabled={savingTpl}
                  style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: ACCENT_STR, color: "#000", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                  {savingTpl ? "Saving…" : "Save Template"}
                </button>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: TEXT_MUTED }}>
              No templates yet. Create one above or they&apos;ll be seeded on first use.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {templates.map((tpl) => (
                <div key={tpl.id} style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18,
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: TEXT }}>{tpl.name}</div>
                    <span style={{ fontSize: "0.65rem", background: ACCENT_DIM, color: CYAN,
                      borderRadius: 20, padding: "2px 8px", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {CATEGORY_LABELS[tpl.category]}
                    </span>
                  </div>
                  {tpl.subject && (
                    <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontStyle: "italic" }}>
                      {tpl.subject}
                    </div>
                  )}
                  <div style={{ fontSize: "0.78rem", color: TEXT_MUTED, lineHeight: 1.5,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                    {tpl.body}
                  </div>
                  <button
                    onClick={() => applyTemplate(tpl)}
                    style={{ marginTop: "auto", padding: "7px 0", borderRadius: 7, border: `1px solid ${ACCENT_MID}`,
                      background: ACCENT_DIM, color: CYAN, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                  >
                    Use Template →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
