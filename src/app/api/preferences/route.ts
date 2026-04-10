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
  alerts?: {
    staleLeadDays?: number;
    stageStallDays?: number;
    noContactDays?: number;
    lowCensusThreshold?: number;
  };
  dashboard?: {
    focusStatIds?: string[];
    statTargets?: Record<string, number>;
  };
  territory?: {
    defaultViewId?: string;
    savedViews?: Array<{ id: string; label: string; repFilter: string }>;
    defaultsInitialized?: boolean;
    colorOverrides?: Record<string, string>;
  };
  onboarding?: {
    welcomeSeenRoles?: string[];
    walkthroughCompletedRoles?: string[];
  };
};

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizePreferences(input: unknown): StoredPreferences {
  const value = toObject(input);
  const next: StoredPreferences = {};

  if (value.ai !== undefined) {
    const ai = toObject(value.ai);
    next.ai = {
      responseStyle: ai.responseStyle === "checklist" || ai.responseStyle === "strategy_memo" || ai.responseStyle === "draft_email" ? ai.responseStyle : "concise",
      suggestionAggressiveness: ai.suggestionAggressiveness === "minimal" || ai.suggestionAggressiveness === "proactive" ? ai.suggestionAggressiveness : "balanced",
      preferredChannels: Array.isArray(ai.preferredChannels) ? ai.preferredChannels.filter((item): item is string => typeof item === "string").slice(0, 8) : ["emergency_department", "crisis_unit"],
      favoriteWorkflow: typeof ai.favoriteWorkflow === "string" ? ai.favoriteWorkflow.slice(0, 120) : "relationship_reactivation",
    };
  }

  if (value.automations !== undefined) {
    const automations = toObject(value.automations);
    next.automations = {
      followUpReminders: typeof automations.followUpReminders === "boolean" ? automations.followUpReminders : true,
      quietReferralAlerts: typeof automations.quietReferralAlerts === "boolean" ? automations.quietReferralAlerts : true,
      lowCensusPlaybooks: typeof automations.lowCensusPlaybooks === "boolean" ? automations.lowCensusPlaybooks : true,
      stageStallAlerts: typeof automations.stageStallAlerts === "boolean" ? automations.stageStallAlerts : true,
      draftedOutreach: typeof automations.draftedOutreach === "boolean" ? automations.draftedOutreach : true,
      dailyDigest: typeof automations.dailyDigest === "boolean" ? automations.dailyDigest : true,
      digestCadence: automations.digestCadence === "weekly" ? "weekly" : "daily",
      approvalRequiredForOutreach: typeof automations.approvalRequiredForOutreach === "boolean" ? automations.approvalRequiredForOutreach : true,
    };
  }

  if (value.alerts !== undefined) {
    const alerts = toObject(value.alerts);
    next.alerts = {
      staleLeadDays: clampNumber(alerts.staleLeadDays, 14, 1, 120),
      stageStallDays: clampNumber(alerts.stageStallDays, 10, 1, 120),
      noContactDays: clampNumber(alerts.noContactDays, 5, 1, 60),
      lowCensusThreshold: clampNumber(alerts.lowCensusThreshold, 4, 1, 50),
    };
  }

  if (value.dashboard !== undefined) {
    const dashboard = toObject(value.dashboard);
    const rawTargets = toObject(dashboard.statTargets);
    const statTargets = Object.fromEntries(
      Object.entries(rawTargets)
        .filter(([key, target]) => typeof key === "string" && Number.isFinite(Number(target)))
        .map(([key, target]) => [key, clampNumber(target, 0, 0, 100000)])
    );

    next.dashboard = {
      focusStatIds: Array.isArray(dashboard.focusStatIds)
        ? dashboard.focusStatIds.filter((item): item is string => typeof item === "string").slice(0, 12)
        : [],
      statTargets,
    };
  }

  if (value.territory !== undefined) {
    const territory = toObject(value.territory);
    const savedViews = Array.isArray(territory.savedViews)
      ? territory.savedViews
          .map((item) => {
            const view = toObject(item);
            const id = typeof view.id === "string" ? view.id.slice(0, 40) : "";
            const label = typeof view.label === "string" ? view.label.slice(0, 40) : "";
            const repFilter = typeof view.repFilter === "string" ? view.repFilter.slice(0, 120) : "";
            if (!id || !label || !repFilter) return null;
            return { id, label, repFilter };
          })
          .filter((item): item is { id: string; label: string; repFilter: string } => Boolean(item))
          .slice(0, 10)
      : [];

    next.territory = {
      defaultViewId: typeof territory.defaultViewId === "string" ? territory.defaultViewId.slice(0, 40) : "",
      savedViews,
      defaultsInitialized: typeof territory.defaultsInitialized === "boolean" ? territory.defaultsInitialized : false,
      colorOverrides: (() => {
        const raw = toObject(territory.colorOverrides);
        const HEX_RE = /^#[0-9a-fA-F]{6}$/;
        const safe: Record<string, string> = {};
        let count = 0;
        for (const [k, v] of Object.entries(raw)) {
          if (count >= 1000) break;
          if (typeof k === "string" && k.length <= 60 && typeof v === "string" && HEX_RE.test(v)) {
            safe[k] = v;
            count++;
          }
        }
        return safe;
      })(),
    };
  }

  if (value.onboarding !== undefined) {
    const onboarding = toObject(value.onboarding);
    next.onboarding = {
      welcomeSeenRoles: Array.isArray(onboarding.welcomeSeenRoles)
        ? onboarding.welcomeSeenRoles
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.toUpperCase())
            .filter((item) => item === "ADMIN" || item === "REP" || item === "ACCOUNT")
            .slice(0, 3)
        : [],
      walkthroughCompletedRoles: Array.isArray(onboarding.walkthroughCompletedRoles)
        ? onboarding.walkthroughCompletedRoles
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.toUpperCase())
            .filter((item) => item === "ADMIN" || item === "REP" || item === "ACCOUNT")
            .slice(0, 3)
        : [],
    };
  }

  return next;
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

  const existingRoot = toObject(existing?.preferences);
  const incoming = sanitizePreferences(body.preferences);
  const merged = {
    ...existingRoot,
    ...incoming,
    ...(incoming.ai ? { ai: { ...toObject(existingRoot.ai), ...incoming.ai } } : {}),
    ...(incoming.automations ? { automations: { ...toObject(existingRoot.automations), ...incoming.automations } } : {}),
    ...(incoming.alerts ? { alerts: { ...toObject(existingRoot.alerts), ...incoming.alerts } } : {}),
    ...(incoming.dashboard ? { dashboard: { ...toObject(existingRoot.dashboard), ...incoming.dashboard } } : {}),
    ...(incoming.onboarding ? { onboarding: { ...toObject(existingRoot.onboarding), ...incoming.onboarding } } : {}),
    ...(incoming.territory ? { territory: { ...toObject(existingRoot.territory), ...incoming.territory, ...(incoming.territory.colorOverrides !== undefined ? { colorOverrides: { ...toObject(toObject(existingRoot.territory).colorOverrides), ...incoming.territory.colorOverrides } } : {}) } } : {}),
  };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { preferences: merged as never },
    select: { preferences: true },
  });

  return NextResponse.json({ preferences: updated.preferences });
}