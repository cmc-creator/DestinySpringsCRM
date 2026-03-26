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
    { label: "Cold referral sources",    prompt: "Which referral sources haven't sent a referral in 30+ days and need outreach? Give me a prioritized list and suggested action for each." },
    { label: "Stalled admissions",       prompt: "Which admissions are stalled in Clinical Review or Insurance Auth right now? What's the fastest way to move them forward?" },
    { label: "Top referrers this month", prompt: "Who are my top referral sources sending the most admissions this month and what's making them successful?" },
    { label: "Rep activity gaps",        prompt: "Which of my reps have the lowest visit and call activity this week? What should I do about it?" },
    { label: "Territory coverage gaps",  prompt: "Are there geographic areas or facility types in our territory with no active referral relationships? How should we address them?" },
    { label: "Leadership summary",       prompt: "Draft a concise weekly performance update I can share with leadership — referral volume, pipeline stage distribution, and key wins." },
  ],
  rep: [
    { label: "Who to visit today",       prompt: "Based on my referral source relationships, which facilities should I prioritize visiting today and why?" },
    { label: "Draft a follow-up",        prompt: "Help me draft a short, professional follow-up message to a referral source I visited this week." },
    { label: "Sources gone quiet",       prompt: "Which of my referral sources haven't sent a referral in the past 30 days? What's the best outreach strategy for each type?" },
    { label: "Write a visit note",       prompt: "Help me write a professional facility visit note I can log after meeting with a referral source today." },
    { label: "Prep for a cold call",     prompt: "What should I know and say when cold-calling a hospital ED social worker to introduce Destiny Springs for the first time?" },
    { label: "Relationship best practices", prompt: "What are the most effective strategies for building lasting referral relationships with ED social workers and crisis counselors?" },
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
    const base: NextAction[] = [];
    const now = Date.now();

    // Pull referral sources gone quiet (no referral in 30+ days)
    const sourcesPromise = fetch("/api/referral-sources?limit=40")
      .then(r => r.ok ? r.json() : [])
      .then((sources: { id: string; name: string; type?: string | null; updatedAt?: string; createdAt: string; active?: boolean }[]) => {
        sources.forEach(s => {
          if (s.active === false) return;
          const days = Math.floor((now - new Date(s.updatedAt ?? s.createdAt).getTime()) / 86_400_000);
          if (days >= 30) {
            base.push({
              label: `Re-engage ${s.name}`,
              desc: `${days} days since last activity — ${(s.type ?? "referral source").replace(/_/g, " ").toLowerCase()}`,
              prompt: `The referral source "${s.name}" (${(s.type ?? "facility").replace(/_/g, " ")}) hasn't been contacted in ${days} days. What's the best outreach strategy to re-engage them and get referrals flowing again?`,
              urgency: days >= 60 ? "high" : "medium",
            });
          }
        });
      })
      .catch(() => {});

    // Pull stalled admissions (Clinical Review or Insurance Auth > 7 days no update)
    const oppsPromise = fetch("/api/opportunities?limit=40")
      .then(r => r.ok ? r.json() : [])
      .then((opps: { id: string; title: string; stage: string; updatedAt?: string; createdAt: string; nextFollowUp?: string | null; hospital?: { hospitalName: string } | null }[]) => {
        opps.forEach(o => {
          const stallingStages = ["CLINICAL_REVIEW", "INSURANCE_AUTH"];
          if (!stallingStages.includes(o.stage)) return;
          const days = Math.floor((now - new Date(o.updatedAt ?? o.createdAt).getTime()) / 86_400_000);
          if (days >= 3) {
            base.push({
              label: `Unblock: ${o.title}`,
              desc: `${days} days in ${o.stage.replace(/_/g, " ")} — ${o.hospital?.hospitalName ?? ""}`,
              prompt: `The admission "${o.title}" has been stuck in ${o.stage.replace(/_/g, " ")} for ${days} days. What are the most likely blockers and what actions should I take right now to move this forward?`,
              urgency: days >= 7 ? "high" : "medium",
            });
          }
          if (o.nextFollowUp && new Date(o.nextFollowUp) <= new Date()) {
            base.push({
              label: `Overdue follow-up: ${o.title}`,
              desc: `Follow-up was due ${new Date(o.nextFollowUp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
              prompt: `My follow-up on the admission "${o.title}" is overdue. Help me draft a quick check-in message to move this forward.`,
              urgency: "high",
            });
          }
        });
      })
      .catch(() => {});

    Promise.all([sourcesPromise, oppsPromise]).then(() => {
      base.sort((a, b) => (a.urgency === "high" ? -1 : b.urgency === "high" ? 1 : 0));
      setActions(base.slice(0, 5));
    });
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
