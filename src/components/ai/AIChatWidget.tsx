"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ActionProposal = {
  intent:
    | "create_referral"
    | "update_referral"
    | "delete_referral"
    | "create_referral_source"
    | "update_referral_source"
    | "delete_referral_source"
    | "create_lead"
    | "update_lead"
    | "delete_lead"
    | "create_opportunity"
    | "update_opportunity"
    | "delete_opportunity";
  targetId?: string;
  data?: Record<string, unknown>;
  rationale?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const GOLD = "var(--nyx-accent)";
const GOLD_DIM = "var(--nyx-accent-dim)";
const GOLD_MID = "var(--nyx-accent-mid)";
const TEXT = "var(--nyx-text)";
const MUTED = "var(--nyx-text-muted)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-border)";
const BG = "var(--nyx-bg)";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm **Aegis**, your intelligent NyxAegis assistant. I can help you manage your pipeline, find new referral sources by location, draft outreach, surface relationships at risk, navigate the platform, and proactively suggest your next best action. What can I help you with?",
};

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, `<code style="background:rgba(255,255,255,0.08);border-radius:3px;padding:1px 5px;font-size:0.85em;">$1</code>`)
    .replace(/\n/g, "<br />");
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", height: 18 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: GOLD,
          display: "inline-block",
          animation: `aegis-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

export default function AIChatWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [allowEdits, setAllowEdits] = useState(true);
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);
  const speechRef               = useRef<SpeechRecognitionLike | null>(null);
  const pendingPromptRef        = useRef<string | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSpeechSupported(!!Ctor);
  }, []);

  // External trigger: aegis:prompt pre-fills + auto-sends, aegis:open just opens
  useEffect(() => {
    const handlePrompt = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail;
      setOpen(true);
      setInput(prompt);
      pendingPromptRef.current = prompt;
    };
    const handleOpen = () => setOpen(true);
    window.addEventListener("aegis:prompt", handlePrompt);
    window.addEventListener("aegis:open", handleOpen);
    return () => {
      window.removeEventListener("aegis:prompt", handlePrompt);
      window.removeEventListener("aegis:open", handleOpen);
    };
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setProposal(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, allowEdits }),
      });

      const data = await res.json() as { role?: string; content?: string; error?: string; actionProposal?: ActionProposal | null };
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content ?? data.error ?? "Sorry, something went wrong.",
      };
      setMessages((prev) => [...prev, reply]);
      setProposal(data.actionProposal ?? null);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, allowEdits]);

  const startMic = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor || listening) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const ev = event as unknown as { results?: { 0?: { 0?: { transcript?: string } } }[] };
      const transcript = ev.results?.[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setTimeout(() => inputRef.current?.focus(), 40);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      speechRef.current = null;
    };

    speechRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopMic = () => {
    speechRef.current?.stop();
    setListening(false);
  };

  const executeProposal = async () => {
    if (!proposal || loading) return;

    const deleting = proposal.intent.startsWith("delete_");
    if (deleting) {
      const ok = window.confirm("Confirm delete action? This cannot be undone.");
      if (!ok) return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proposal, confirmedDelete: deleting }),
      });
      const data = await res.json() as { summary?: string; error?: string };
      const message: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.ok ? (data.summary ?? "Action completed.") : (data.error ?? "Action failed."),
      };
      setMessages((prev) => [...prev, message]);
      if (res.ok) setProposal(null);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Could not execute action due to a network error." }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-send when a pending prompt has been set into input
  useEffect(() => {
    if (pendingPromptRef.current && input === pendingPromptRef.current && !loading) {
      pendingPromptRef.current = null;
      send();
    }
  }, [input, loading, send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => setMessages([WELCOME_MESSAGE]);

  return (
    <>
      <style>{`
        @keyframes aegis-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes aegis-fab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--nyx-accent-glow); }
          60%       { box-shadow: 0 0 0 10px transparent; }
        }
        @keyframes aegis-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .aegis-panel {
          animation: aegis-slide-up 0.22s ease-out;
        }
        .aegis-fab {
          animation: aegis-fab-pulse 2.4s ease-in-out infinite;
        }
        .aegis-fab:hover {
          transform: scale(1.08) !important;
          box-shadow: 0 0 22px var(--nyx-accent-glow) !important;
        }
        .aegis-msg-user {
          background: ${GOLD_DIM};
          border: 1px solid ${GOLD_MID};
        }
        .aegis-msg-ai {
          background: rgba(255,255,255,0.04);
          border: 1px solid ${BORDER};
        }
        .aegis-send:hover:not(:disabled) {
          background: rgba(201,168,76,0.25) !important;
        }
        .aegis-input:focus {
          outline: none;
          border-color: var(--nyx-accent-str) !important;
        }
      `}</style>

      {/* Floating action button */}
      <button
        className="aegis-fab"
        onClick={() => setOpen((v) => !v)}
        title="Ask Aegis AI"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: "50%", border: `1.5px solid ${GOLD_MID}`,
          background: `radial-gradient(circle at 35% 35%, var(--nyx-accent-dim), rgba(0,0,0,0.7))`,
          cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
          overflow: "hidden",
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <Image src="/Aegislogo.png" alt="Aegis AI" width={56} height={56} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="aegis-panel"
          style={{
            position: "fixed", bottom: 92, right: 24, zIndex: 9998,
            width: "min(420px, calc(100vw - 48px))",
            height: "min(580px, calc(100vh - 120px))",
            background: CARD,
            border: `1px solid ${GOLD_MID}`,
            borderRadius: 16,
            display: "flex", flexDirection: "column",
            boxShadow: `0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.08)`,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
            borderBottom: `1px solid ${GOLD_MID}`,
            background: `linear-gradient(135deg, var(--nyx-accent-dim) 0%, rgba(0,0,0,0) 100%)`,
            flexShrink: 0,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "var(--nyx-accent-dim)" }}>
              <Image src="/Aegislogo.png" alt="Aegis" width={36} height={36} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem", color: GOLD, letterSpacing: "0.03em" }}>Aegis AI</p>
              <p style={{ margin: 0, fontSize: "0.68rem", color: MUTED }}>NyxAegis Assistant</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={clearChat}
                title="Clear conversation"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: MUTED, borderRadius: 6, display: "flex", alignItems: "center" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: MUTED, borderRadius: 6, display: "flex", alignItems: "center" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginTop: 2, background: "var(--nyx-accent-dim)" }}>
                    <Image src="/Aegislogo.png" alt="Aegis" width={28} height={28} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  </div>
                )}
                <div
                  className={m.role === "user" ? "aegis-msg-user" : "aegis-msg-ai"}
                  style={{
                    maxWidth: "82%", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    padding: "9px 13px", fontSize: "0.82rem", color: TEXT, lineHeight: 1.65,
                  }}
                  
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                />
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginTop: 2, background: "var(--nyx-accent-dim)" }}>
                  <Image src="/Aegislogo.png" alt="Aegis" width={28} height={28} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                </div>
                <div className="aegis-msg-ai" style={{ borderRadius: "4px 14px 14px 14px", padding: "10px 14px" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: BG, display: "flex", gap: 8, alignItems: "flex-end" }}>
            {proposal && (
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 60, background: "rgba(0,0,0,0.72)", border: `1px solid ${GOLD_MID}`, borderRadius: 10, padding: "10px 12px", zIndex: 2 }}>
                <div style={{ fontSize: "0.7rem", color: GOLD, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
                  Action Proposed
                </div>
                <div style={{ fontSize: "0.78rem", color: TEXT, marginBottom: 8 }}>
                  {proposal.intent.replaceAll("_", " ")}
                  {proposal.targetId ? ` (${proposal.targetId})` : ""}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={executeProposal}
                    disabled={loading}
                    style={{ background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, borderRadius: 8, fontSize: "0.74rem", fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}
                  >
                    {proposal.intent.startsWith("delete_") ? "Confirm Delete" : "Apply"}
                  </button>
                  <button
                    onClick={() => setProposal(null)}
                    style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, fontSize: "0.74rem", fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={inputRef}
              className="aegis-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Aegis anything…"
              rows={1}
              style={{
                flex: 1, resize: "none", background: "rgba(255,255,255,0.05)",
                border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px",
                color: TEXT, fontSize: "0.82rem", fontFamily: "inherit",
                lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                transition: "border-color 0.15s",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />

            {speechSupported && (
              <button
                onClick={listening ? stopMic : startMic}
                title={listening ? "Stop microphone" : "Use microphone"}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: `1px solid ${GOLD_MID}`,
                  background: listening ? "rgba(248,113,113,0.2)" : GOLD_DIM,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  color: listening ? "#f87171" : GOLD,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}

            <button
              className="aegis-send"
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10, border: `1px solid ${GOLD_MID}`,
                background: GOLD_DIM, cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                opacity: !input.trim() || loading ? 0.45 : 1, transition: "background 0.15s, opacity 0.15s",
                color: GOLD,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: "0 12px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: BG }}>
            <label style={{ fontSize: "0.69rem", color: MUTED, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allowEdits}
                onChange={(e) => setAllowEdits(e.target.checked)}
                style={{ accentColor: "var(--nyx-accent)" }}
              />
              Allow AI edit actions
            </label>
            <span style={{ fontSize: "0.63rem", color: "rgba(216,232,244,0.46)" }}>
              Delete always requires confirmation
            </span>
          </div>
        </div>
      )}
    </>
  );
}
