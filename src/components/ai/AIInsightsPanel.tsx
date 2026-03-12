"use client";
import { useState, useEffect } from "react";

const GOLD     = "var(--nyx-accent)";
const GOLD_DIM = "var(--nyx-accent-dim)";
const GOLD_MID = "var(--nyx-accent-mid)";
const GOLD_STR = "var(--nyx-accent-str)";
const CARD     = "var(--nyx-card)";
const BORDER   = "var(--nyx-border)";
const TEXT     = "var(--nyx-text)";
const MUTED    = "var(--nyx-text-muted)";

const SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
  admin: [
    { label: "Overdue visits",           prompt: "Which referral sources haven't been visited in 30+ days?" },
    { label: "At-risk opportunities",    prompt: "Summarize open opportunities that may be going cold and what I should do about them." },
    { label: "Top reps this week",       prompt: "Who are my top performing team members this week and what's driving their results?" },
    { label: "Leadership summary",       prompt: "Draft a concise team performance update I can share with leadership this week." },
    { label: "Territory gaps",           prompt: "Are there any obvious gaps in my territory coverage I should address?" },
    { label: "Pipeline forecast",        prompt: "Based on current pipeline stage distribution, what's a realistic close forecast for this month?" },
  ],
  rep: [
    { label: "Today's priorities",       prompt: "What should I prioritize in my territory today to maximize referral relationships?" },
    { label: "Draft a follow-up",        prompt: "Help me draft a follow-up message for a referral source I visited recently." },
    { label: "Cold accounts",            prompt: "Which of my accounts haven't heard from me in the past two weeks?" },
    { label: "Write a visit note",       prompt: "Help me write a professional visit note for a meeting I just completed." },
    { label: "Prep for a meeting",       prompt: "What key things should I know before meeting with a new referral source for the first time?" },
    { label: "Relationship tips",        prompt: "What are the best practices for building a strong long-term referral relationship?" },
  ],
  account: [
    { label: "Engagement status",        prompt: "Can you summarize the current engagement status and what stage we're at?" },
    { label: "Outstanding invoices",     prompt: "What invoices are currently outstanding on my account and when are they due?" },
    { label: "Respond to proposal",      prompt: "Help me draft a response to the proposal I received." },
    { label: "Contract questions",       prompt: "What should I look for when reviewing my current contract terms?" },
    { label: "Service questions",        prompt: "What services are currently active on my account?" },
    { label: "Escalation help",          prompt: "How do I escalate an issue or concern with my account rep?" },
  ],
};

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 3 11 7.5 15.5 9 11 10.5 9.5 15 8 10.5 3.5 9 8 7.5z"/>
      <path d="M18 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>
    </svg>
  );
}

interface Props {
  role: "admin" | "rep" | "account";
}

interface NextAction { label: string; desc: string; prompt: string; urgency: "high" | "medium" | "low" }

function SuggestedNextActions({ role }: { role: string }) {
  const [actions, setActions] = useState<NextAction[]>([]);

  useEffect(() => {
    if (role === "account") return;
    // Build personalized suggestions from stale leads + overdue follow-ups
    const base: NextAction[] = [];
    fetch("/api/leads?limit=20")
      .then(r => r.ok ? r.json() : [])
      .then((leads: { hospitalName: string; status: string; updatedAt?: string; createdAt: string; nextFollowUp?: string | null; assignedRep?: { user: { name: string | null } } | null }[]) => {
        const now = Date.now();
        leads.forEach(l => {
          if (l.status === "WON" || l.status === "LOST" || l.status === "UNQUALIFIED") return;
          const days = Math.floor((now - new Date(l.updatedAt ?? l.createdAt).getTime()) / 86_400_000);
          if (days >= 14) {
            base.push({
              label: `Re-engage ${l.hospitalName}`,
              desc: `${days} days since last update — status: ${l.status.replace(/_/g, " ")}`,
              prompt: `I haven't touched the lead "${l.hospitalName}" in ${days} days. It's currently in ${l.status.replace(/_/g, " ")} status. What's the best next step to move it forward?`,
              urgency: days >= 30 ? "high" : "medium",
            });
          }
          if (l.nextFollowUp && new Date(l.nextFollowUp) <= new Date()) {
            base.push({
              label: `Overdue follow-up: ${l.hospitalName}`,
              desc: `Follow-up was due ${new Date(l.nextFollowUp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
              prompt: `My follow-up with "${l.hospitalName}" is overdue. Help me draft a re-engagement message.`,
              urgency: "high",
            });
          }
        });
        // Sort by urgency, limit to 4
        base.sort((a, b) => (a.urgency === "high" ? -1 : b.urgency === "high" ? 1 : 0));
        setActions(base.slice(0, 4));
      })
      .catch(() => {});
  }, [role]);

  const ask = (prompt: string) => window.dispatchEvent(new CustomEvent("aegis:prompt", { detail: prompt }));

  if (actions.length === 0) return null;

  const urgencyColor = (u: "high" | "medium" | "low") =>
    u === "high" ? "#f87171" : u === "medium" ? "#fbbf24" : MUTED;

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px" }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f87171", marginBottom: 10 }}>
        ⚡ Suggested Next Actions
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a, i) => (
          <button key={i} onClick={() => ask(a.prompt)} style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 8, padding: "9px 12px", textAlign: "left", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,113,113,0.05)")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>{a.label}</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, color: urgencyColor(a.urgency), flexShrink: 0, marginTop: 1, letterSpacing: "0.06em" }}>{a.urgency.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: 2 }}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AIInsightsPanel({ role }: Props) {
  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.admin;

  const ask = (prompt: string) => {
    window.dispatchEvent(new CustomEvent("aegis:prompt", { detail: prompt }));
  };

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, rgba(167,139,250,0.8), ${GOLD_STR}, transparent)`,
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 18px 12px",
        background: `linear-gradient(135deg, rgba(167,139,250,0.06), ${GOLD_DIM})`,
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: "#a78bfa" }}><SparkleIcon /></div>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD }}>
            Ask Aegis AI
          </span>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event("aegis:open"))}
          style={{
            background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 6,
            padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700,
            color: GOLD, cursor: "pointer", letterSpacing: "0.06em",
          }}
        >
          Open Chat →
        </button>
      </div>

      {/* Prompt chips */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: "0.72rem", color: MUTED, margin: "0 0 4px", letterSpacing: "0.04em" }}>
          Tap a suggestion to ask instantly:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => ask(s.prompt)}
              style={{
                background: "rgba(167,139,250,0.07)",
                border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: TEXT,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
                letterSpacing: "0.01em",
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(167,139,250,0.15)";
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(167,139,250,0.07)";
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)";
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <SuggestedNextActions role={role} />
    </div>
  );
}
