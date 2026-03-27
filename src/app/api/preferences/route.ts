import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StoredPreferences = {
  ai?: {
    responseStyle?: "concise" | "checklist" | "strategy_memo" | "draft_email";
    suggestionAggressiveness?: "minimal" | "balanced" | "proactive";
    preferredChannels?: string[];
    favoriteWorkflow?: string;
  };
  automations?: {
    followUpReminders?: boolean;
    quietReferralAlerts?: boolean;
    lowCensusPlaybooks?: boolean;
    stageStallAlerts?: boolean;
    draftedOutreach?: boolean;
    dailyDigest?: boolean;
    digestCadence?: "daily" | "weekly";
    approvalRequiredForOutreach?: boolean;
  };
};

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sanitizePreferences(input: unknown): StoredPreferences {
  const value = toObject(input);
  const ai = toObject(value.ai);
  const automations = toObject(value.automations);
  return {
    ai: {
      responseStyle: ai.responseStyle === "checklist" || ai.responseStyle === "strategy_memo" || ai.responseStyle === "draft_email" ? ai.responseStyle : "concise",
      suggestionAggressiveness: ai.suggestionAggressiveness === "minimal" || ai.suggestionAggressiveness === "proactive" ? ai.suggestionAggressiveness : "balanced",
      preferredChannels: Array.isArray(ai.preferredChannels) ? ai.preferredChannels.filter((item): item is string => typeof item === "string").slice(0, 8) : ["emergency_department", "crisis_unit"],
      favoriteWorkflow: typeof ai.favoriteWorkflow === "string" ? ai.favoriteWorkflow.slice(0, 120) : "relationship_reactivation",
    },
    automations: {
      followUpReminders: typeof automations.followUpReminders === "boolean" ? automations.followUpReminders : true,
      quietReferralAlerts: typeof automations.quietReferralAlerts === "boolean" ? automations.quietReferralAlerts : true,
      lowCensusPlaybooks: typeof automations.lowCensusPlaybooks === "boolean" ? automations.lowCensusPlaybooks : true,
      stageStallAlerts: typeof automations.stageStallAlerts === "boolean" ? automations.stageStallAlerts : true,
      draftedOutreach: typeof automations.draftedOutreach === "boolean" ? automations.draftedOutreach : true,
      dailyDigest: typeof automations.dailyDigest === "boolean" ? automations.dailyDigest : true,
      digestCadence: automations.digestCadence === "weekly" ? "weekly" : "daily",
      approvalRequiredForOutreach: typeof automations.approvalRequiredForOutreach === "boolean" ? automations.approvalRequiredForOutreach : true,
    },
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  return NextResponse.json({ preferences: user?.preferences ?? null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { preferences?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  const merged = {
    ...toObject(existing?.preferences),
    ...sanitizePreferences(body.preferences),
  };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { preferences: merged as never },
    select: { preferences: true },
  });

  return NextResponse.json({ preferences: updated.preferences });
}