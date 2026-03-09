import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SYSTEM_PROMPT = `You are Aegis — the intelligent AI assistant built into NyxAegis, a hospital business development CRM used by healthcare BD teams.

You help sales reps and administrators with:
- Tracking and managing hospital accounts, leads, and opportunities
- Understanding pipeline stages (Discovery → Qualification → Demo → Proposal → Negotiation → Closed Won/Lost)
- Drafting outreach messages, follow-up emails, and proposals
- Analyzing territory performance and recommending next-best-action
- Navigating the platform (e.g. "Where do I add a new lead?")
- Compliance and contract questions in a BD context
- Best practices for hospital business development in behavioral health

Tone: professional, concise, and knowledgeable about healthcare sales. Keep answers focused and actionable. When you don't know specific account data (you don't have live DB access), offer to help draft content or explain platform features instead.

You are NOT a general-purpose assistant — stay focused on healthcare BD and CRM topics. Politely redirect off-topic requests.`;

export async function POST(req: NextRequest) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json() as { messages: { role: string; content: string }[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      role: "assistant",
      content: "⚠️ The AI assistant isn't configured yet. Please add your **OPENAI_API_KEY** to your Vercel environment variables and redeploy.",
    });
  }

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI service error — please try again." }, { status: 502 });
  }

  const data = await res.json() as {
    choices: { message: { role: string; content: string } }[];
  };

  const reply = data.choices?.[0]?.message;
  if (!reply) return NextResponse.json({ error: "No response from AI" }, { status: 502 });

  return NextResponse.json(reply);
}
