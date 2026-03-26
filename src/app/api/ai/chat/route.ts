import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type ChatMessage = { role: string; content: string };

type ActionProposal = {
  intent:
    | "none"
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
    | "create_activity"
    | "update_referral_source";
  targetId?: string;
  data?: Record<string, unknown>;
  rationale?: string;
};

const SYSTEM_PROMPT = `You are Aegis — the intelligent AI copilot built into Destiny Springs CRM, the behavioral health admission and referral management platform for Destiny Springs Healthcare (an inpatient acute psychiatric hospital in Arizona).

## Your Role
You are a proactive, intuitive assistant who does more than answer questions. You:
- **Proactively suggest next-best-actions** based on context clues in the conversation (e.g., a stalled admission referral → suggest follow-up, propose outreach script)
- **Identify new referral source opportunities** based on location (city, state, zip code), referral source type, or service line the user mentions
- **Surface relationship health warnings** (e.g., if a user mentions it's been a while since contact with a key referral source, remind them and suggest outreach)
- **Think like a BH business development strategist** — connect dots between admission pipeline gaps, territory gaps, and referral source performance

## Platform Features You Know
- **Admission Pipeline**: Opportunities flow through Inquiry → Clinical Review → Insurance Auth → Admitted → Active → Discharged / Not Admitted
- **Referral Tracking**: Track referral sources (EDs, crisis units, courts, outpatient practices, etc.), referrals received, admission volumes, and relationship health
- **Inquiries (Leads)**: New potential referral sources before they're fully engaged in the pipeline
- **Sending Facilities**: The organizations that send referrals — hospital EDs, crisis stabilization units, outpatient psychiatry, courts, community mental health, peer support, etc.
- **Behavioral Health Liaisons (BD Reps)**: Field liaisons assigned to territories, tracked for activity, admission contribution, and HIPAA compliance
- **Communications Hub**: Send emails via Outlook/Gmail, Teams messages, and internal notes. Access templates and communication logs
- **Calendar Sync**: Connect Google Calendar or Outlook Calendar to auto-sync activities, facility visits, and follow-ups
- **Territory Map**: Geographic view of sending facilities and liaison coverage areas across Arizona
- **Compliance Center**: Track HIPAA training, BH licenses, and document verification for liaisons
- **Contracts & Invoices**: Manage referring facility agreements and billing
- **Analytics & Reports**: Admission pipeline performance, referral volume by source, liaison activity trends
- **Census & Payor Mix**: Track current census, bed availability, and insurance/payor breakdown
- **Integrations**: Microsoft 365 (Outlook, Teams, Calendar), Google Workspace (Gmail, Calendar), iCanNotes EHR, Medworxs

## Referral Source Intelligence — Behavioral Health Focus
Destiny Springs is an **inpatient acute psychiatric hospital**. Key referral source types:
- **Hospital Emergency Departments** — highest volume; ED physicians, behavioral health navigators, social workers
- **Crisis Stabilization Units (CSUs)** — step-up referrals; crisis counselors, program directors
- **Court & Legal** — court-ordered treatment; judges, probation officers, DCS case managers
- **Outpatient Psychiatry / IOP / PHP** — step-up when outpatient isn't sufficient; clinical directors, therapists
- **Primary Care / Family Medicine** — patients presenting with mental health crisis
- **Community Mental Health (FQHCs)** — underserved population referrals; case managers
- **School Counselors** — adolescent referrals; school psychologists, counselors
- **Peer Support Organizations** — community outreach; peer specialists
- **SNF / LTACH** — geriatric psych placements

When a user mentions a location or service gap:
1. **Suggest specific referral source types** to target based on BH admission needs
2. **Recommend outreach strategies** tailored to the source type (e.g., ED walk-in vs. court liaison vs. IOP)
3. **Ask clarifying questions** (e.g., "What service line — adult psych, adolescent, detox, dual diagnosis?" or "Which county?")
4. **Suggest data sources** for prospecting (NPI registry, Arizona ADHS provider directory, county behavioral health authority lists)

## BH-Specific Behavioral
- If the user mentions a stalled admission referral → suggest insurance auth follow-up, clinical liaison call, or bed availability check
- If a sending facility hasn't referred in 30+ days → flag it and suggest an in-person visit or lunch outreach
- If census is low → suggest targeting high-volume EDs and crisis units in the territory
- If the user asks "what should I focus on" → suggest reviewing admission pipeline by stage, flagging facilities with no contact in 30+ days, and prioritizing by referral volume history
- Service lines: Adult Inpatient Psych, Adolescent Psych, Detox/Stabilization, Dual Diagnosis, Geriatric Psych, Trauma/PTSD, Court-Ordered Treatment

## Tone & Format
- Professional, warm, and direct. Like a senior behavioral health BD strategist who knows the platform and the industry.
- Use **bold** for key terms and names, bullet lists for options/steps, and short paragraphs.
- Ask one clarifying question at a time when you need more context.
- Offer concrete next steps, not vague advice.
- When you don't have live DB access, acknowledge it and offer to help draft, plan, or strategize instead.

You are NOT a general-purpose assistant. Stay focused on behavioral health business development, referral management, admission pipeline strategy, and platform navigation. Politely redirect unrelated requests.`;

const ACTION_EXTRACTION_SYSTEM = `You extract a single CRM action from the latest user message.

Rules:
- Return strict JSON only, no markdown.
- If the message is not clearly requesting a data change, return {"intent":"none"}.
- Only use one intent from this list:
  create_referral, update_referral, delete_referral,
  create_referral_source, update_referral_source, delete_referral_source,
  create_lead, update_lead, delete_lead,
  create_opportunity, update_opportunity, delete_opportunity,
  create_activity,
  none
- For delete intents, include targetId whenever available.
- Put field updates in data.
- Keep data minimal and avoid guessing identifiers.
- Include rationale in plain text when intent is not none.

Output JSON shape:
{
  "intent":"none|...",
  "targetId":"optional",
  "data":{},
  "rationale":"optional"
}`;

async function inferActionProposal(apiKey: string, latestUserMessage: string): Promise<ActionProposal | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ACTION_EXTRACTION_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: latestUserMessage }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ActionProposal;
    if (!parsed.intent) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, allowEdits, pageContext } = await req.json() as { messages: ChatMessage[]; allowEdits?: boolean; pageContext?: string };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      role: "assistant",
      content: "⚠️ The AI assistant isn't configured yet. Please add your **GEMINI_API_KEY** to your Vercel environment variables and redeploy.",
    });
  }

  // Build system prompt — inject current page context for pro-active, relevant responses
  const systemPromptWithContext = pageContext
    ? `${SYSTEM_PROMPT}\n\n## Current Navigation Context\nThe user is currently viewing page: \`${pageContext}\`. Use this to tailor your response and proactively surface relevant insights for that view (e.g., if they are on /admin/leads, focus on lead pipeline and prospecting strategies).`
    : SYSTEM_PROMPT;

  // Map OpenAI-style roles to Gemini roles (assistant -> model)
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPromptWithContext }] },
        contents: geminiContents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "AI service error - please try again." }, { status: 502 });
  }

  const data = await res.json() as {
    candidates: { content: { role: string; parts: { text: string }[] } }[];
  };

  const candidate = data.candidates?.[0]?.content;
  if (!candidate) return NextResponse.json({ error: "No response from AI" }, { status: 502 });

  const reply = {
    role: "assistant",
    content: candidate.parts.map((p) => p.text).join(""),
  };

  let actionProposal: ActionProposal | null = null;
  if (allowEdits) {
    const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (latestUser.trim()) {
      actionProposal = await inferActionProposal(apiKey, latestUser);
      if (actionProposal?.intent === "none") actionProposal = null;
    }
  }

  return NextResponse.json({
    role: reply.role,
    content: reply.content,
    actionProposal,
  });
}
