"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
    | "delete_opportunity"
    | "create_activity";
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
  content: "Hi! I'm **Aegis**, your intelligent Destiny Springs CRM copilot. I can help you manage your admission pipeline, **scout your territory** for new BH referral sources, draft outreach, surface at-risk relationships, and suggest your next best action. Use the quick actions below or just ask me anything!",
};

function formatLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatProposalValue(value: unknown): string {
  if (value === null) return "None";
  if (value === undefined) return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-US") : String(value);
  if (typeof value === "string") return value.trim() || "Empty";
  if (Array.isArray(value)) {
    const rendered = value.map((item) => formatProposalValue(item)).join(", ");
    return rendered || "Empty";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function getProposalPreviewEntries(data?: Record<string, unknown>) {
  if (!data) return [];
  return Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      label: formatLabel(key),
      value: formatProposalValue(value),
    }));
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<div style="font-weight:800;font-size:0.78rem;color:var(--nyx-accent);margin:10px 0 3px;letter-spacing:0.04em">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:800;font-size:0.82rem;color:var(--nyx-accent);margin:12px 0 4px;letter-spacing:0.04em">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:900;font-size:0.88rem;color:var(--nyx-accent);margin:14px 0 5px;letter-spacing:0.04em">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, `<code style="background:rgba(255,255,255,0.08);border-radius:3px;padding:1px 5px;font-size:0.85em;">$1</code>`)
    .replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:7px;padding-left:10px;margin:3px 0"><span style="color:var(--nyx-accent);flex-shrink:0;margin-top:1px">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:14px;margin:3px 0">$1</div>')
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
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "helpful" | "not_helpful">>({});
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [allowEdits, setAllowEdits] = useState(true);
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmAIDelete, setConfirmAIDelete] = useState(false);
  const pathname = usePathname();
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const logAegisEvent = useCallback(async (eventType: string, details: Record<string, unknown> = {}) => {
    try {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AI_EVENT",
          resource: "Aegis",
          diff: {
            _meta: {
              source: "AEGIS_AI",
              eventType,
              pageContext: pathname,
              intent: typeof details.intent === "string" ? details.intent : null,
            },
            details,
          },
        }),
      });
    } catch {
      // Ignore audit logging failures in the chat UI.
    }
  }, [pathname]);

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
        body: JSON.stringify({ messages: history, allowEdits, pageContext: pathname }),
      });

      const data = await res.json() as { role?: string; content?: string; error?: string; actionProposal?: ActionProposal | null };
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content ?? data.error ?? "Sorry, something went wrong.",
      };
      setMessages((prev) => [...prev, reply]);
      setProposal(data.actionProposal ?? null);
      void logAegisEvent("RESPONSE_GENERATED", {
        messageId: reply.id,
        responsePreview: reply.content.slice(0, 280),
        hasProposal: Boolean(data.actionProposal),
        intent: data.actionProposal?.intent ?? null,
        promptLength: text.length,
      });
      if (data.actionProposal) {
        void logAegisEvent("PROPOSAL_PRESENTED", {
          intent: data.actionProposal.intent,
          targetId: data.actionProposal.targetId ?? null,
          fieldCount: Object.keys(data.actionProposal.data ?? {}).length,
          fields: Object.keys(data.actionProposal.data ?? {}),
        });
      }
      // TTS: speak AI response if enabled
      if (ttsEnabled && typeof window !== "undefined" && window.speechSynthesis) {
        const plain = (data.content ?? "")
          .replace(/<[^>]*>/g, "")
          .replace(/\*\*/g, "")
          .replace(/\*/g, "")
          .replace(/#{1,6}\s/g, "")
          .trim();
        if (plain) {
          const utt = new SpeechSynthesisUtterance(plain);
          utt.lang = "en-US";
          utt.rate = 1.05;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utt);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, allowEdits, pathname, ttsEnabled, logAegisEvent]);

  const startMic = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor || listening) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const ev = event as unknown as { results?: { 0?: { transcript?: string } }[] };
      const transcript = ev.results?.[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      // Build new value and pre-set pendingPromptRef to trigger auto-send
      const currentVal = inputRef.current?.value ?? "";
      const newVal = currentVal ? `${currentVal} ${transcript}` : transcript;
      setInput(newVal);
      pendingPromptRef.current = newVal;
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
      setConfirmAIDelete(true);
      return;
    }

    await doExecuteProposal(false);
  };

  const doExecuteProposal = async (isDelete: boolean) => {
    if (!proposal || loading) return;
    setLoading(true);
    void logAegisEvent("PROPOSAL_ACCEPTED", {
      intent: proposal.intent,
      targetId: proposal.targetId ?? null,
      fieldCount: Object.keys(proposal.data ?? {}).length,
      fields: Object.keys(proposal.data ?? {}),
    });
    try {
      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proposal, confirmedDelete: isDelete }),
      });
      const data = await res.json() as { summary?: string; error?: string };
      const message: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.ok ? (data.summary ?? "Action completed.") : (data.error ?? "Action failed."),
      };
      setMessages((prev) => [...prev, message]);
      if (res.ok) {
        void logAegisEvent("PROPOSAL_APPLIED", {
          intent: proposal.intent,
          targetId: proposal.targetId ?? null,
          summary: data.summary ?? null,
        });
        setProposal(null);
      } else {
        void logAegisEvent("PROPOSAL_FAILED", {
          intent: proposal.intent,
          targetId: proposal.targetId ?? null,
          error: data.error ?? "Action failed",
        });
      }
    } catch {
      void logAegisEvent("PROPOSAL_FAILED", {
        intent: proposal.intent,
        targetId: proposal.targetId ?? null,
        error: "network_error",
      });
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

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setProposal(null);
    setMessageFeedback({});
  };

  const triggerPrompt = (prompt: string) => {
    setInput(prompt);
    pendingPromptRef.current = prompt;
  };

  const submitFeedback = (message: Message, feedback: "helpful" | "not_helpful") => {
    if (message.id === "welcome" || messageFeedback[message.id]) return;
    setMessageFeedback((prev) => ({ ...prev, [message.id]: feedback }));
    void logAegisEvent("RESPONSE_FEEDBACK", {
      messageId: message.id,
      feedback,
      responsePreview: message.content.slice(0, 280),
    });
  };

  const proposalPreviewEntries = getProposalPreviewEntries(proposal?.data);
  const extraProposalFields = Math.max(0, proposalPreviewEntries.length - 8);

  const scoutTerritory = () => {
    setOpen(true);
    if (!navigator.geolocation) {
      const p = "I want to scout for behavioral health referral sources in my area (Arizona). What hospital EDs, crisis stabilization units, outpatient practices, and other BH facilities should I be targeting? Give me prioritized outreach strategies.";
      triggerPrompt(p);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const p = `I'm currently at GPS coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)} in Arizona. What behavioral health and mental health referral sources, hospital EDs, crisis stabilization units, outpatient practices, FQHCs, or other BH facilities should I be targeting near this location? Give me specific facility types, outreach strategies, and priority order.`;
        triggerPrompt(p);
      },
      () => {
        const p = "I want to scout my territory in Arizona for behavioral health referral sources. What hospital EDs, crisis units, outpatient practices, and other BH facilities should I be targeting? Give me specific outreach strategies.";
        triggerPrompt(p);
      },
      { timeout: 8000 }
    );
  };

  return (
    <>
      {confirmAIDelete && (
        <ConfirmDialog
          message="Confirm delete action?"
          subtext="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => { setConfirmAIDelete(false); void doExecuteProposal(true); }}
          onCancel={() => setConfirmAIDelete(false)}
        />
      )}
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
        onClick={() => {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          setOpen((v) => !v);
        }}
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
            position: "fixed",
            bottom: isMobile ? 0 : 92,
            right: isMobile ? 0 : 24,
            left: isMobile ? 0 : "auto",
            top: isMobile ? 0 : "auto",
            zIndex: 9998,
            width: isMobile ? "100%" : "min(420px, calc(100vw - 48px))",
            height: isMobile ? "100dvh" : "min(580px, calc(100vh - 120px))",
            background: CARD,
            border: isMobile ? "none" : `1px solid ${GOLD_MID}`,
            borderRadius: isMobile ? 0 : 16,
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
              <p style={{ margin: 0, fontSize: "0.68rem", color: MUTED }}>Destiny Springs AI Copilot</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => {
                  setTtsEnabled(v => {
                    if (v && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
                    return !v;
                  });
                }}
                title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: ttsEnabled ? GOLD : MUTED, borderRadius: 6, display: "flex", alignItems: "center" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {ttsEnabled ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a4 4 0 0 1 0 6.09"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/>
                      <line x1="17" y1="9" x2="23" y2="15"/>
                    </>
                  )}
                </svg>
              </button>
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
                onClick={() => {
                  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
                  setOpen(false);
                }}
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
                <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div
                    className={m.role === "user" ? "aegis-msg-user" : "aegis-msg-ai"}
                    style={{
                      width: "100%",
                      borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                      padding: "9px 13px", fontSize: "0.82rem", color: TEXT, lineHeight: 1.65,
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                  {m.role === "assistant" && m.id !== "welcome" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, paddingLeft: 4 }}>
                      {([
                        { id: "helpful", label: "Useful" },
                        { id: "not_helpful", label: "Not useful" },
                      ] as const).map((option) => {
                        const selected = messageFeedback[m.id] === option.id;
                        const disabled = Boolean(messageFeedback[m.id]) && !selected;
                        return (
                          <button
                            key={option.id}
                            onClick={() => submitFeedback(m, option.id)}
                            disabled={disabled}
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${selected ? GOLD_MID : BORDER}`,
                              background: selected ? GOLD_DIM : "transparent",
                              color: selected ? GOLD : MUTED,
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              padding: "4px 9px",
                              cursor: disabled ? "default" : "pointer",
                              opacity: disabled ? 0.55 : 1,
                            }}
                          >
                            {selected ? `✓ ${option.label}` : option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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

          {/* Quick action chips — shown only on fresh chat */}
          {messages.length === 1 && messages[0].id === "welcome" && (
            <div style={{ padding: "0 12px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {([
                { label: "🗺️ Scout My Territory", action: scoutTerritory },
                { label: "📊 Pipeline Summary", prompt: "Summarize my current admission pipeline — what\'s stalled, what stage has the most volume, and what needs immediate attention?" },
                { label: "⚡ Who Needs Attention?", prompt: "Which referral sources or sending facilities haven\'t referred in 30+ days and need a visit or outreach call?" },
                { label: "� Log a Visit or Call", prompt: "I need to log a visit or call I just completed. What facility did I visit? What was discussed? I\'ll give you the details — help me log it as an activity." },
                { label: "🎯 My Follow-Ups This Week", prompt: "What referral sources, leads, and opportunities assigned to me need a follow-up in the next 7 days? Prioritize for me." },
                { label: "📝 Draft ED Outreach", prompt: "Draft a short, professional outreach message I can send to a hospital emergency department social worker to introduce Destiny Springs Healthcare and request a facility visit." },
                { label: "🏥 Low Census Plan", prompt: "Census is soft. Give me a 72-hour business development action plan focused on the highest-yield behavioral health referral channels." },
                { label: "⚖️ Court Referral Strategy", prompt: "What is the best strategy to build more court-ordered treatment referrals in my territory?" },
                { label: "✍️ Relationship Risk Check", prompt: "Which of my key referral sources are at risk of going cold — no recent referrals, no recent contact? What should I do about each one?" },
              ] as { label: string; action?: () => void; prompt?: string }[]).map(({ label, action, prompt }) => (
                <button
                  key={label}
                  onClick={() => action ? action() : triggerPrompt(prompt!)}
                  style={{
                    background: GOLD_DIM,
                    border: `1px solid ${GOLD_MID}`,
                    borderRadius: 20,
                    padding: "5px 11px",
                    fontSize: "0.71rem",
                    color: GOLD,
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "background 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.22)")}
                  onMouseLeave={e => (e.currentTarget.style.background = GOLD_DIM)}
                >{label}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: BG, display: "flex", gap: 8, alignItems: "flex-end" }}>
            {proposal && (
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 60, background: "rgba(0,0,0,0.72)", border: `1px solid ${GOLD_MID}`, borderRadius: 10, padding: "10px 12px", zIndex: 2 }}>
                <div style={{ fontSize: "0.7rem", color: GOLD, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
                  Action Proposed
                </div>
                <div style={{ fontSize: "0.78rem", color: TEXT, marginBottom: 8 }}>
                  {formatLabel(proposal.intent)}
                  {proposal.targetId ? ` (${proposal.targetId})` : ""}
                </div>
                {proposal.rationale && (
                  <div style={{ fontSize: "0.72rem", color: MUTED, lineHeight: 1.55, marginBottom: 8 }}>
                    {proposal.rationale}
                  </div>
                )}
                {proposalPreviewEntries.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: "0.66rem", color: "var(--nyx-accent-label)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Proposed Fields
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
                      {proposalPreviewEntries.slice(0, 8).map((entry) => (
                        <div key={entry.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
                          <span style={{ fontSize: "0.68rem", color: MUTED, fontWeight: 700 }}>{entry.label}</span>
                          <span style={{ fontSize: "0.68rem", color: TEXT, textAlign: "right", overflowWrap: "anywhere" }}>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                    {extraProposalFields > 0 && (
                      <div style={{ fontSize: "0.65rem", color: MUTED, marginTop: 6 }}>
                        +{extraProposalFields} more field{extraProposalFields === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: "0.68rem", color: "rgba(216,232,244,0.5)", marginBottom: 8 }}>
                  AI actions require your review and are recorded in the audit log.
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
                    onClick={() => {
                      void logAegisEvent("PROPOSAL_DISMISSED", {
                        intent: proposal.intent,
                        targetId: proposal.targetId ?? null,
                        fieldCount: Object.keys(proposal.data ?? {}).length,
                      });
                      setProposal(null);
                    }}
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
