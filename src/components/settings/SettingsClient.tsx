"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type ResponseStyle = "concise" | "checklist" | "strategy_memo" | "draft_email";
type SuggestionAggressiveness = "minimal" | "balanced" | "proactive";
type DigestCadence = "daily" | "weekly";

type TerritorySavedView = {
  id: string;
  label: string;
  repFilter: string;
};

type UserPreferenceState = {
  ai: {
    responseStyle: ResponseStyle;
    suggestionAggressiveness: SuggestionAggressiveness;
    preferredChannels: string[];
    favoriteWorkflow: string;
  };
  automations: {
    followUpReminders: boolean;
    quietReferralAlerts: boolean;
    lowCensusPlaybooks: boolean;
    stageStallAlerts: boolean;
    draftedOutreach: boolean;
    dailyDigest: boolean;
    digestCadence: DigestCadence;
    approvalRequiredForOutreach: boolean;
  };
  alerts: {
    staleLeadDays: number;
    stageStallDays: number;
    noContactDays: number;
    lowCensusThreshold: number;
  };
  dashboard: {
    focusStatIds: string[];
    statTargets: Record<string, number>;
  };
  territory: {
    defaultViewId: string;
    savedViews: TerritorySavedView[];
  };
};

const DEFAULT_PREFS: UserPreferenceState = {
  ai: {
    responseStyle: "concise",
    suggestionAggressiveness: "balanced",
    preferredChannels: ["emergency_department", "crisis_unit"],
    favoriteWorkflow: "relationship_reactivation",
  },
  automations: {
    followUpReminders: true,
    quietReferralAlerts: true,
    lowCensusPlaybooks: true,
    stageStallAlerts: true,
    draftedOutreach: true,
    dailyDigest: true,
    digestCadence: "daily",
    approvalRequiredForOutreach: true,
  },
  alerts: {
    staleLeadDays: 14,
    stageStallDays: 10,
    noContactDays: 5,
    lowCensusThreshold: 4,
  },
  dashboard: {
    focusStatIds: ["leads", "opportunities", "invoices"],
    statTargets: {
      leads: 30,
      opportunities: 20,
      invoices: 12,
    },
  },
  territory: {
    defaultViewId: "",
    savedViews: [],
  },
};

const CHANNEL_OPTIONS = [
  ["emergency_department", "Emergency Departments"],
  ["crisis_unit", "Crisis Units"],
  ["court_legal", "Court / Legal"],
  ["outpatient_psych", "Outpatient Psychiatry"],
  ["community_mh", "Community Mental Health"],
  ["primary_care", "Primary Care"],
] as const;

const KPI_OPTIONS = [
  ["reps", "Active Reps"],
  ["hospitals", "Active Clients"],
  ["leads", "Open Leads"],
  ["opportunities", "Open Opportunities"],
  ["won", "Discharged"],
  ["invoices", "Pending Invoices"],
] as const;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizePrefs(value: unknown): UserPreferenceState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PREFS;
  const prefs = value as Record<string, unknown>;
  const ai = prefs.ai && typeof prefs.ai === "object" && !Array.isArray(prefs.ai) ? prefs.ai as Record<string, unknown> : {};
  const automations = prefs.automations && typeof prefs.automations === "object" && !Array.isArray(prefs.automations) ? prefs.automations as Record<string, unknown> : {};
  const alerts = prefs.alerts && typeof prefs.alerts === "object" && !Array.isArray(prefs.alerts) ? prefs.alerts as Record<string, unknown> : {};
  const dashboard = prefs.dashboard && typeof prefs.dashboard === "object" && !Array.isArray(prefs.dashboard) ? prefs.dashboard as Record<string, unknown> : {};
  const territory = prefs.territory && typeof prefs.territory === "object" && !Array.isArray(prefs.territory) ? prefs.territory as Record<string, unknown> : {};
  const statTargets = dashboard.statTargets && typeof dashboard.statTargets === "object" && !Array.isArray(dashboard.statTargets)
    ? Object.fromEntries(Object.entries(dashboard.statTargets as Record<string, unknown>).map(([key, target]) => [key, clampNumber(target, 0, 0, 100000)]))
    : DEFAULT_PREFS.dashboard.statTargets;

  return {
    ai: {
      responseStyle: ai.responseStyle === "checklist" || ai.responseStyle === "strategy_memo" || ai.responseStyle === "draft_email" ? ai.responseStyle : DEFAULT_PREFS.ai.responseStyle,
      suggestionAggressiveness: ai.suggestionAggressiveness === "minimal" || ai.suggestionAggressiveness === "proactive" ? ai.suggestionAggressiveness : DEFAULT_PREFS.ai.suggestionAggressiveness,
      preferredChannels: Array.isArray(ai.preferredChannels) ? ai.preferredChannels.filter((item): item is string => typeof item === "string") : DEFAULT_PREFS.ai.preferredChannels,
      favoriteWorkflow: typeof ai.favoriteWorkflow === "string" && ai.favoriteWorkflow.trim() ? ai.favoriteWorkflow : DEFAULT_PREFS.ai.favoriteWorkflow,
    },
    automations: {
      followUpReminders: typeof automations.followUpReminders === "boolean" ? automations.followUpReminders : DEFAULT_PREFS.automations.followUpReminders,
      quietReferralAlerts: typeof automations.quietReferralAlerts === "boolean" ? automations.quietReferralAlerts : DEFAULT_PREFS.automations.quietReferralAlerts,
      lowCensusPlaybooks: typeof automations.lowCensusPlaybooks === "boolean" ? automations.lowCensusPlaybooks : DEFAULT_PREFS.automations.lowCensusPlaybooks,
      stageStallAlerts: typeof automations.stageStallAlerts === "boolean" ? automations.stageStallAlerts : DEFAULT_PREFS.automations.stageStallAlerts,
      draftedOutreach: typeof automations.draftedOutreach === "boolean" ? automations.draftedOutreach : DEFAULT_PREFS.automations.draftedOutreach,
      dailyDigest: typeof automations.dailyDigest === "boolean" ? automations.dailyDigest : DEFAULT_PREFS.automations.dailyDigest,
      digestCadence: automations.digestCadence === "weekly" ? "weekly" : DEFAULT_PREFS.automations.digestCadence,
      approvalRequiredForOutreach: typeof automations.approvalRequiredForOutreach === "boolean" ? automations.approvalRequiredForOutreach : DEFAULT_PREFS.automations.approvalRequiredForOutreach,
    },
    alerts: {
      staleLeadDays: clampNumber(alerts.staleLeadDays, DEFAULT_PREFS.alerts.staleLeadDays, 1, 120),
      stageStallDays: clampNumber(alerts.stageStallDays, DEFAULT_PREFS.alerts.stageStallDays, 1, 120),
      noContactDays: clampNumber(alerts.noContactDays, DEFAULT_PREFS.alerts.noContactDays, 1, 60),
      lowCensusThreshold: clampNumber(alerts.lowCensusThreshold, DEFAULT_PREFS.alerts.lowCensusThreshold, 1, 50),
    },
    dashboard: {
      focusStatIds: Array.isArray(dashboard.focusStatIds)
        ? dashboard.focusStatIds.filter((item): item is string => typeof item === "string")
        : DEFAULT_PREFS.dashboard.focusStatIds,
      statTargets,
    },
    territory: {
      defaultViewId: typeof territory.defaultViewId === "string" ? territory.defaultViewId : "",
      savedViews: Array.isArray(territory.savedViews)
        ? territory.savedViews
            .map((item) => {
              if (!item || typeof item !== "object" || Array.isArray(item)) return null;
              const view = item as Record<string, unknown>;
              if (typeof view.id !== "string" || typeof view.label !== "string" || typeof view.repFilter !== "string") return null;
              return { id: view.id, label: view.label, repFilter: view.repFilter };
            })
            .filter((item): item is TerritorySavedView => Boolean(item))
        : [],
    },
  };
}

const inp: React.CSSProperties = {
  width: "100%", background: "var(--nyx-input-bg)", border: "1px solid var(--nyx-border)",
  borderRadius: 7, padding: "8px 12px", color: "var(--nyx-text)", fontSize: "0.875rem",
  outline: "none", boxSizing: "border-box",
};

/*  Theme definitions  */
type NyxVars = {
  "--nyx-accent": string; "--nyx-accent-glow": string; "--nyx-accent-dim": string;
  "--nyx-accent-mid": string; "--nyx-accent-str": string; "--nyx-bg": string;
  "--nyx-card": string; "--nyx-bg-scrim": string; "--nyx-border": string; "--nyx-sidebar-bg": string;
  "--nyx-text": string; "--nyx-text-muted": string; "--nyx-input-bg": string;
  "--nyx-scrollbar": string; "--nyx-accent-label": string; "--nyx-texture": string; "--nyx-sidebar-tex": string; "--nyx-card-texture": string; "--nyx-card-border": string;
};
interface Theme { key: string; label: string; desc: string; accent: string; vars: NyxVars; }

const THEMES: Theme[] = [
  {
    key: "luxury", label: "Luxury", desc: "Obsidian & Gold",
    accent: "#C9A84C",
    vars: {
      "--nyx-accent":      "#C9A84C",
      "--nyx-accent-glow": "rgba(201,168,76,0.22)",
      "--nyx-accent-dim":  "rgba(201,168,76,0.08)",
      "--nyx-accent-mid":  "rgba(201,168,76,0.15)",
      "--nyx-accent-str":  "rgba(201,168,76,0.30)",
      "--nyx-bg":          "#100805",
      "--nyx-card":        "rgba(8,5,2,0.90)",
      "--nyx-bg-scrim":    "rgba(8,5,2,0.72)",
      "--nyx-border":      "rgba(201,168,76,0.13)",
      "--nyx-sidebar-bg":  "rgba(7,3,1,0.998)",
      "--nyx-text":        "#EDE4CF",
      "--nyx-text-muted":  "rgba(237,228,207,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.45)",
      "--nyx-scrollbar":   "rgba(201,168,76,0.20)",
      "--nyx-accent-label":"rgba(201,168,76,0.60)",
      "--nyx-texture":     "url('/luxury/leather1.jpg')",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "url('/luxury/marble2.png')",
      "--nyx-card-border": "linear-gradient(135deg, #2e1800 0%, #7a5210 8%, #C9A84C 18%, #f0d060 26%, #fffce0 33%, #e8c840 41%, #c09030 50%, #e8c840 58%, #fffce0 66%, #f0d060 74%, #C9A84C 82%, #7a5210 91%, #2e1800 100%)",
    },
  },
  {
    key: "glass", label: "Glass", desc: "Midnight Cyan",
    accent: "#00d4ff",
    vars: {
      "--nyx-accent":      "#00d4ff",
      "--nyx-accent-glow": "rgba(0,212,255,0.22)",
      "--nyx-accent-dim":  "rgba(0,212,255,0.08)",
      "--nyx-accent-mid":  "rgba(0,212,255,0.15)",
      "--nyx-accent-str":  "rgba(0,212,255,0.30)",
      "--nyx-bg":          "#040810",
      "--nyx-card":        "rgba(4,8,16,0.90)",
      "--nyx-bg-scrim":    "rgba(4,8,16,0.72)",
      "--nyx-border":      "rgba(0,212,255,0.09)",
      "--nyx-sidebar-bg":  "rgba(4,6,12,0.98)",
      "--nyx-text":        "#d8e8f4",
      "--nyx-text-muted":  "rgba(216,232,244,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.35)",
      "--nyx-scrollbar":   "rgba(0,212,255,0.18)",
      "--nyx-accent-label":"rgba(0,212,255,0.60)",
      "--nyx-texture":     "url('/luxury/bluelux.jpg')",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001428 0%, #00486a 12%, #00b8e8 22%, #40d8ff 30%, #d8f8ff 38%, #00c8f0 48%, #0098c0 58%, #40d8ff 68%, #d8f8ff 77%, #00486a 90%, #001428 100%)",
    },
  },
  {
    key: "emerald", label: "Emerald", desc: "Forest Dark",
    accent: "#34d399",
    vars: {
      "--nyx-accent":      "#34d399",
      "--nyx-accent-glow": "rgba(52,211,153,0.20)",
      "--nyx-accent-dim":  "rgba(52,211,153,0.08)",
      "--nyx-accent-mid":  "rgba(52,211,153,0.15)",
      "--nyx-accent-str":  "rgba(52,211,153,0.28)",
      "--nyx-bg":          "#030a06",
      "--nyx-card":        "rgba(3,10,6,0.90)",
      "--nyx-bg-scrim":    "rgba(3,10,6,0.72)",
      "--nyx-border":      "rgba(52,211,153,0.09)",
      "--nyx-sidebar-bg":  "rgba(2,7,4,0.99)",
      "--nyx-text":        "#d4f0e4",
      "--nyx-text-muted":  "rgba(212,240,228,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.40)",
      "--nyx-scrollbar":   "rgba(52,211,153,0.18)",
      "--nyx-accent-label":"rgba(52,211,153,0.60)",
      "--nyx-texture":     "url('/luxury/greenluxx.jpg')",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001208 0%, #0a4820 12%, #34d399 22%, #70f0c0 30%, #dfffef 38%, #28c880 48%, #10a060 58%, #70f0c0 68%, #dfffef 77%, #0a4820 90%, #001208 100%)",
    },
  },
  {
    key: "violet", label: "Violet", desc: "Deep Amethyst",
    accent: "#a78bfa",
    vars: {
      "--nyx-accent":      "#a78bfa",
      "--nyx-accent-glow": "rgba(167,139,250,0.20)",
      "--nyx-accent-dim":  "rgba(167,139,250,0.08)",
      "--nyx-accent-mid":  "rgba(167,139,250,0.15)",
      "--nyx-accent-str":  "rgba(167,139,250,0.28)",
      "--nyx-bg":          "#05030e",
      "--nyx-card":        "rgba(5,3,14,0.90)",
      "--nyx-bg-scrim":    "rgba(5,3,14,0.72)",
      "--nyx-border":      "rgba(167,139,250,0.10)",
      "--nyx-sidebar-bg":  "rgba(4,2,10,0.99)",
      "--nyx-text":        "#e4dcf7",
      "--nyx-text-muted":  "rgba(228,220,247,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.40)",
      "--nyx-scrollbar":   "rgba(167,139,250,0.18)",
      "--nyx-accent-label":"rgba(167,139,250,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.66 .60' numOctaves='5' seed='5' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0.06 0 0 0 0.03  0 0 0 0 0.01  0.08 0 0 0 0.04  0 0 0 0.05 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a0218 0%, #340880 12%, #a78bfa 22%, #c8b0ff 30%, #f0e8ff 38%, #9868f0 48%, #7040d0 58%, #c8b0ff 68%, #f0e8ff 77%, #340880 90%, #0a0218 100%)",
    },
  },
  {
    key: "hotpink", label: "Hot Pink", desc: "Neon Magenta",
    accent: "#ec4899",
    vars: {
      "--nyx-accent":      "#ec4899",
      "--nyx-accent-glow": "rgba(236,72,153,0.22)",
      "--nyx-accent-dim":  "rgba(236,72,153,0.08)",
      "--nyx-accent-mid":  "rgba(236,72,153,0.15)",
      "--nyx-accent-str":  "rgba(236,72,153,0.30)",
      "--nyx-bg":          "#0a0308",
      "--nyx-card":        "rgba(10,3,8,0.90)",
      "--nyx-bg-scrim":    "rgba(10,3,8,0.72)",
      "--nyx-border":      "rgba(236,72,153,0.10)",
      "--nyx-sidebar-bg":  "rgba(6,1,4,0.99)",
      "--nyx-text":        "#fce7f3",
      "--nyx-text-muted":  "rgba(252,231,243,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.42)",
      "--nyx-scrollbar":   "rgba(236,72,153,0.18)",
      "--nyx-accent-label":"rgba(236,72,153,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.67 .61' numOctaves='5' seed='13' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0.15 0 0 0 0.07  0 0 0 0 0.01  0.08 0 0 0 0.04  0 0 0 0.055 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1a0010 0%, #6a0040 12%, #ec4899 22%, #ff80c8 30%, #ffe8f4 38%, #d82880 48%, #a81860 58%, #ff80c8 68%, #ffe8f4 77%, #6a0040 90%, #1a0010 100%)",
    },
  },
  {
    key: "rose", label: "Rose", desc: "Crimson Night",
    accent: "#f87171",
    vars: {
      "--nyx-accent":      "#f87171",
      "--nyx-accent-glow": "rgba(248,113,113,0.20)",
      "--nyx-accent-dim":  "rgba(248,113,113,0.08)",
      "--nyx-accent-mid":  "rgba(248,113,113,0.15)",
      "--nyx-accent-str":  "rgba(248,113,113,0.28)",
      "--nyx-bg":          "#0a0405",
      "--nyx-card":        "rgba(10,4,5,0.90)",
      "--nyx-bg-scrim":    "rgba(10,4,5,0.72)",
      "--nyx-border":      "rgba(248,113,113,0.10)",
      "--nyx-sidebar-bg":  "rgba(7,2,3,0.99)",
      "--nyx-text":        "#f4dcdc",
      "--nyx-text-muted":  "rgba(244,220,220,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.42)",
      "--nyx-scrollbar":   "rgba(248,113,113,0.18)",
      "--nyx-accent-label":"rgba(248,113,113,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.68 .63' numOctaves='5' seed='9' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0.12 0 0 0 0.06  0 0 0 0 0.01  0.02 0 0 0 0.01  0 0 0 0.05 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #180008 0%, #5a0020 12%, #f87171 22%, #ffa0a0 30%, #ffe8e8 38%, #e84040 48%, #c02020 58%, #ffa0a0 68%, #ffe8e8 77%, #5a0020 90%, #180008 100%)",
    },
  },
  {
    key: "light", label: "Light", desc: "Clean Silver",
    accent: "#6366f1",
    vars: {
      "--nyx-accent":      "#6366f1",
      "--nyx-accent-glow": "rgba(99,102,241,0.18)",
      "--nyx-accent-dim":  "rgba(99,102,241,0.10)",
      "--nyx-accent-mid":  "rgba(99,102,241,0.18)",
      "--nyx-accent-str":  "rgba(99,102,241,0.35)",
      "--nyx-bg":          "#f0f2f7",
      "--nyx-card":        "rgba(255,255,255,0.94)",
      "--nyx-bg-scrim":    "rgba(240,242,247,0.82)",
      "--nyx-border":      "rgba(99,102,241,0.18)",
      "--nyx-sidebar-bg":  "#e8eaf2",
      "--nyx-text":        "#1a1b2e",
      "--nyx-text-muted":  "rgba(26,27,46,0.55)",
      "--nyx-input-bg":    "rgba(0,0,0,0.05)",
      "--nyx-scrollbar":   "rgba(99,102,241,0.25)",
      "--nyx-accent-label":"rgba(99,102,241,0.70)",
      "--nyx-texture":     "none",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #6080a0 0%, #90a8c0 12%, #b8d0e8 22%, #d8eaf8 30%, #f8fbff 38%, #c0d8f0 48%, #a0c0d8 58%, #d8eaf8 68%, #f8fbff 77%, #90a8c0 90%, #6080a0 100%)",
    },
  },
  {
    key: "blush", label: "Blush", desc: "Soft Daylight",
    accent: "#be185d",
    vars: {
      "--nyx-accent":      "#be185d",
      "--nyx-accent-glow": "rgba(190,24,93,0.16)",
      "--nyx-accent-dim":  "rgba(190,24,93,0.08)",
      "--nyx-accent-mid":  "rgba(190,24,93,0.14)",
      "--nyx-accent-str":  "rgba(190,24,93,0.28)",
      "--nyx-bg":          "#fdf4f7",
      "--nyx-card":        "rgba(255,255,255,0.94)",
      "--nyx-bg-scrim":    "rgba(253,244,247,0.82)",
      "--nyx-border":      "rgba(190,24,93,0.15)",
      "--nyx-sidebar-bg":  "#f7e8ee",
      "--nyx-text":        "#1e0a12",
      "--nyx-text-muted":  "rgba(30,10,18,0.55)",
      "--nyx-input-bg":    "rgba(0,0,0,0.04)",
      "--nyx-scrollbar":   "rgba(190,24,93,0.22)",
      "--nyx-accent-label":"rgba(190,24,93,0.65)",
      "--nyx-texture":     "none",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #2a0018 0%, #8c1050 12%, #be185d 22%, #e060a8 30%, #ffd4e8 38%, #c82870 48%, #9e1248 58%, #e060a8 68%, #ffd4e8 77%, #8c1050 90%, #2a0018 100%)",
    },
  },
  {
    key: "azure", label: "Azure", desc: "Deep Ocean",
    accent: "#3b82f6",
    vars: {
      "--nyx-accent":      "#3b82f6",
      "--nyx-accent-glow": "rgba(59,130,246,0.22)",
      "--nyx-accent-dim":  "rgba(59,130,246,0.10)",
      "--nyx-accent-mid":  "rgba(59,130,246,0.18)",
      "--nyx-accent-str":  "rgba(59,130,246,0.32)",
      "--nyx-bg":          "#060c1a",
      "--nyx-card":        "rgba(10,20,42,0.90)",
      "--nyx-bg-scrim":    "rgba(6,12,26,0.72)",
      "--nyx-border":      "rgba(59,130,246,0.18)",
      "--nyx-sidebar-bg":  "#070e20",
      "--nyx-text":        "#e4edff",
      "--nyx-text-muted":  "rgba(228,237,255,0.52)",
      "--nyx-input-bg":    "rgba(59,130,246,0.07)",
      "--nyx-scrollbar":   "rgba(59,130,246,0.28)",
      "--nyx-accent-label":"rgba(59,130,246,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.65 .58' numOctaves='5' seed='17' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.01  0.02 0 0 0 0.05  0.14 0 0 0 0.09  0 0 0 0.06 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a1628 0%, #1a3a6e 12%, #2563eb 22%, #3b82f6 30%, #93c5fd 38%, #1d4ed8 48%, #1e40af 58%, #60a5fa 68%, #bfdbfe 77%, #1a3a6e 90%, #0a1628 100%)",
    },
  },
  {
    key: "goddess", label: "Midnight Goddess", desc: "Obsidian & Amethyst",
    accent: "#9D4EDD",
    vars: {
      "--nyx-accent": "#9D4EDD", "--nyx-accent-glow": "rgba(157,78,221,0.22)", "--nyx-accent-dim": "rgba(157,78,221,0.08)", "--nyx-accent-mid": "rgba(157,78,221,0.15)", "--nyx-accent-str": "rgba(157,78,221,0.30)",
      "--nyx-bg": "#0A0612", "--nyx-card": "rgba(10,6,18,0.90)", "--nyx-bg-scrim": "rgba(10,6,18,0.72)", "--nyx-border": "rgba(157,78,221,0.14)", "--nyx-sidebar-bg": "rgba(6,3,12,0.99)",
      "--nyx-text": "#E8D8FF", "--nyx-text-muted": "rgba(232,216,255,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.45)", "--nyx-scrollbar": "rgba(157,78,221,0.22)", "--nyx-accent-label": "rgba(157,78,221,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0f0220 0%, #4a0a90 12%, #9D4EDD 22%, #c084ff 30%, #f0e0ff 38%, #8a32c8 48%, #6018a8 58%, #c084ff 68%, #f0e0ff 77%, #4a0a90 90%, #0f0220 100%)",
    },
  },
  {
    key: "imperial", label: "Imperial Gold", desc: "Charcoal & Polished Gold",
    accent: "#D4AF37",
    vars: {
      "--nyx-accent": "#D4AF37", "--nyx-accent-glow": "rgba(212,175,55,0.22)", "--nyx-accent-dim": "rgba(212,175,55,0.08)", "--nyx-accent-mid": "rgba(212,175,55,0.15)", "--nyx-accent-str": "rgba(212,175,55,0.30)",
      "--nyx-bg": "#0C0A06", "--nyx-card": "rgba(12,10,6,0.90)", "--nyx-bg-scrim": "rgba(12,10,6,0.72)", "--nyx-border": "rgba(212,175,55,0.14)", "--nyx-sidebar-bg": "rgba(8,6,2,0.99)",
      "--nyx-text": "#F5E8C8", "--nyx-text-muted": "rgba(245,232,200,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.45)", "--nyx-scrollbar": "rgba(212,175,55,0.22)", "--nyx-accent-label": "rgba(212,175,55,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1c0e00 0%, #7a5c10 10%, #D4AF37 20%, #f0d060 28%, #fffee0 36%, #e8c840 44%, #b89020 52%, #e8c840 60%, #fffee0 68%, #f0d060 76%, #D4AF37 84%, #7a5c10 92%, #1c0e00 100%)",
    },
  },
  {
    key: "chrome", label: "Stellar Chrome", desc: "Deep Navy & Chrome",
    accent: "#B8C8D8",
    vars: {
      "--nyx-accent": "#B8C8D8", "--nyx-accent-glow": "rgba(184,200,216,0.20)", "--nyx-accent-dim": "rgba(184,200,216,0.08)", "--nyx-accent-mid": "rgba(184,200,216,0.15)", "--nyx-accent-str": "rgba(184,200,216,0.28)",
      "--nyx-bg": "#060C18", "--nyx-card": "rgba(6,12,24,0.90)", "--nyx-bg-scrim": "rgba(6,12,24,0.72)", "--nyx-border": "rgba(184,200,216,0.14)", "--nyx-sidebar-bg": "rgba(4,8,15,0.99)",
      "--nyx-text": "#D8E8F4", "--nyx-text-muted": "rgba(216,232,244,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.42)", "--nyx-scrollbar": "rgba(184,200,216,0.20)", "--nyx-accent-label": "rgba(184,200,216,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a1020 0%, #283858 12%, #6888a8 22%, #B8C8D8 30%, #e8f0f8 38%, #90a8c0 48%, #607890 58%, #B8C8D8 68%, #e8f0f8 77%, #283858 90%, #0a1020 100%)",
    },
  },
  {
    key: "walnut", label: "Bespoke Walnut", desc: "Dark Wood & Brushed Bronze",
    accent: "#A07848",
    vars: {
      "--nyx-accent": "#A07848", "--nyx-accent-glow": "rgba(160,120,72,0.22)", "--nyx-accent-dim": "rgba(160,120,72,0.08)", "--nyx-accent-mid": "rgba(160,120,72,0.15)", "--nyx-accent-str": "rgba(160,120,72,0.30)",
      "--nyx-bg": "#120D05", "--nyx-card": "rgba(18,13,5,0.90)", "--nyx-bg-scrim": "rgba(18,13,5,0.72)", "--nyx-border": "rgba(160,120,72,0.14)", "--nyx-sidebar-bg": "rgba(8,5,1,0.99)",
      "--nyx-text": "#F0ECD8", "--nyx-text-muted": "rgba(240,236,216,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.45)", "--nyx-scrollbar": "rgba(160,120,72,0.22)", "--nyx-accent-label": "rgba(160,120,72,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #180a00 0%, #5a3810 12%, #A07848 22%, #c89a60 30%, #eeddb0 38%, #907030 48%, #684c18 58%, #c89a60 68%, #eeddb0 77%, #5a3810 90%, #180a00 100%)",
    },
  },
  {
    key: "argentum", label: "Argentum", desc: "Platinum Dark & Ice Blue",
    accent: "#7EC8E3",
    vars: {
      "--nyx-accent": "#7EC8E3", "--nyx-accent-glow": "rgba(126,200,227,0.20)", "--nyx-accent-dim": "rgba(126,200,227,0.08)", "--nyx-accent-mid": "rgba(126,200,227,0.15)", "--nyx-accent-str": "rgba(126,200,227,0.28)",
      "--nyx-bg": "#080A0E", "--nyx-card": "rgba(8,10,14,0.90)", "--nyx-bg-scrim": "rgba(8,10,14,0.72)", "--nyx-border": "rgba(126,200,227,0.14)", "--nyx-sidebar-bg": "rgba(5,6,10,0.99)",
      "--nyx-text": "#E0ECF4", "--nyx-text-muted": "rgba(224,236,244,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.40)", "--nyx-scrollbar": "rgba(126,200,227,0.20)", "--nyx-accent-label": "rgba(126,200,227,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #080e18 0%, #204060 12%, #4898b8 22%, #7EC8E3 30%, #d8f4ff 38%, #58a8cc 48%, #306888 58%, #7EC8E3 68%, #d8f4ff 77%, #204060 90%, #080e18 100%)",
    },
  },
  {
    key: "alchemist", label: "The Alchemist", desc: "Dark Nebula & Electric Violet",
    accent: "#7C3AED",
    vars: {
      "--nyx-accent": "#7C3AED", "--nyx-accent-glow": "rgba(124,58,237,0.25)", "--nyx-accent-dim": "rgba(124,58,237,0.09)", "--nyx-accent-mid": "rgba(124,58,237,0.17)", "--nyx-accent-str": "rgba(124,58,237,0.33)",
      "--nyx-bg": "#070614", "--nyx-card": "rgba(20,16,40,0.85)", "--nyx-bg-scrim": "rgba(7,6,20,0.68)", "--nyx-border": "rgba(124,58,237,0.18)", "--nyx-sidebar-bg": "rgba(5,4,12,0.98)",
      "--nyx-text": "#E0D8F0", "--nyx-text-muted": "rgba(224,216,240,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.42)", "--nyx-scrollbar": "rgba(124,58,237,0.22)", "--nyx-accent-label": "rgba(124,58,237,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a0420 0%, #380880 12%, #7C3AED 22%, #a070ff 30%, #e0d0ff 38%, #6820d0 48%, #4c10b0 58%, #a070ff 68%, #e0d0ff 77%, #380880 90%, #0a0420 100%)",
    },
  },
  {
    key: "slate", label: "Executive Slate", desc: "Matte Grey & Emerald",
    accent: "#10B981",
    vars: {
      "--nyx-accent": "#10B981", "--nyx-accent-glow": "rgba(16,185,129,0.20)", "--nyx-accent-dim": "rgba(16,185,129,0.08)", "--nyx-accent-mid": "rgba(16,185,129,0.15)", "--nyx-accent-str": "rgba(16,185,129,0.28)",
      "--nyx-bg": "#0C0F12", "--nyx-card": "rgba(12,15,18,0.90)", "--nyx-bg-scrim": "rgba(12,15,18,0.72)", "--nyx-border": "rgba(16,185,129,0.14)", "--nyx-sidebar-bg": "rgba(7,9,11,0.99)",
      "--nyx-text": "#D4DDE4", "--nyx-text-muted": "rgba(212,221,228,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.38)", "--nyx-scrollbar": "rgba(16,185,129,0.20)", "--nyx-accent-label": "rgba(16,185,129,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001808 0%, #085030 12%, #10B981 22%, #40d8a0 30%, #c0fff0 38%, #0a9068 48%, #087050 58%, #40d8a0 68%, #c0fff0 77%, #085030 90%, #001808 100%)",
    },
  },
  {
    key: "ivory", label: "Ivory Estate", desc: "Warm Ivory & Rose Gold",
    accent: "#C47A5A",
    vars: {
      "--nyx-accent": "#C47A5A", "--nyx-accent-glow": "rgba(196,122,90,0.20)", "--nyx-accent-dim": "rgba(196,122,90,0.10)", "--nyx-accent-mid": "rgba(196,122,90,0.18)", "--nyx-accent-str": "rgba(196,122,90,0.32)",
      "--nyx-bg": "#F8F4EE", "--nyx-card": "rgba(255,255,255,0.94)", "--nyx-bg-scrim": "rgba(248,244,238,0.82)", "--nyx-border": "rgba(196,122,90,0.22)", "--nyx-sidebar-bg": "#EDE8E0",
      "--nyx-text": "#2D1E14", "--nyx-text-muted": "rgba(45,30,20,0.55)", "--nyx-input-bg": "rgba(0,0,0,0.05)", "--nyx-scrollbar": "rgba(196,122,90,0.25)", "--nyx-accent-label": "rgba(196,122,90,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #6a2808 0%, #a85030 12%, #C47A5A 22%, #e0a888 30%, #fff0e8 38%, #b06040 48%, #904830 58%, #e0a888 68%, #fff0e8 77%, #a85030 90%, #6a2808 100%)",
    },
  },
  {
    key: "carbon", label: "Carbon Fiber", desc: "Matte Black & Racing Red",
    accent: "#DC2626",
    vars: {
      "--nyx-accent": "#DC2626", "--nyx-accent-glow": "rgba(220,38,38,0.22)", "--nyx-accent-dim": "rgba(220,38,38,0.08)", "--nyx-accent-mid": "rgba(220,38,38,0.15)", "--nyx-accent-str": "rgba(220,38,38,0.30)",
      "--nyx-bg": "#080808", "--nyx-card": "rgba(8,8,8,0.90)", "--nyx-bg-scrim": "rgba(8,8,8,0.72)", "--nyx-border": "rgba(220,38,38,0.14)", "--nyx-sidebar-bg": "rgba(4,4,4,0.99)",
      "--nyx-text": "#E0E0E0", "--nyx-text-muted": "rgba(224,224,224,0.60)", "--nyx-input-bg": "rgba(255,255,255,0.06)", "--nyx-scrollbar": "rgba(220,38,38,0.22)", "--nyx-accent-label": "rgba(220,38,38,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1a0000 0%, #600000 12%, #DC2626 22%, #ff5050 30%, #ffe0e0 38%, #c01010 48%, #900000 58%, #ff5050 68%, #ffe0e0 77%, #600000 90%, #1a0000 100%)",
    },
  },
  {
    key: "alabaster", label: "Alabaster Estate", desc: "White Marble & Gold Leaf",
    accent: "#B8960C",
    vars: {
      "--nyx-accent": "#B8960C", "--nyx-accent-glow": "rgba(184,150,12,0.18)", "--nyx-accent-dim": "rgba(184,150,12,0.10)", "--nyx-accent-mid": "rgba(184,150,12,0.18)", "--nyx-accent-str": "rgba(184,150,12,0.32)",
      "--nyx-bg": "#F5F0E8", "--nyx-card": "rgba(255,255,255,0.94)", "--nyx-bg-scrim": "rgba(245,240,232,0.82)", "--nyx-border": "rgba(184,150,12,0.22)", "--nyx-sidebar-bg": "#EAE4D8",
      "--nyx-text": "#2A2018", "--nyx-text-muted": "rgba(42,32,24,0.55)", "--nyx-input-bg": "rgba(0,0,0,0.05)", "--nyx-scrollbar": "rgba(184,150,12,0.25)", "--nyx-accent-label": "rgba(184,150,12,0.72)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #2e1800 0%, #7a5210 8%, #B8960C 18%, #e0c040 26%, #fffce0 33%, #d0a820 41%, #a07808 50%, #d0a820 58%, #fffce0 66%, #e0c040 74%, #B8960C 82%, #7a5210 91%, #2e1800 100%)",
    },
  },
  {
    key: "obsidian", label: "Obsidian Sovereign", desc: "Void Black & Lava Red",
    accent: "#FF3520",
    vars: {
      "--nyx-accent": "#FF3520", "--nyx-accent-glow": "rgba(255,53,32,0.24)", "--nyx-accent-dim": "rgba(255,53,32,0.08)", "--nyx-accent-mid": "rgba(255,53,32,0.15)", "--nyx-accent-str": "rgba(255,53,32,0.32)",
      "--nyx-bg": "#040404", "--nyx-card": "rgba(4,4,4,0.90)", "--nyx-bg-scrim": "rgba(4,4,4,0.72)", "--nyx-border": "rgba(255,53,32,0.14)", "--nyx-sidebar-bg": "rgba(2,2,2,0.99)",
      "--nyx-text": "#EEEEEE", "--nyx-text-muted": "rgba(238,238,238,0.60)", "--nyx-input-bg": "rgba(255,255,255,0.06)", "--nyx-scrollbar": "rgba(255,53,32,0.22)", "--nyx-accent-label": "rgba(255,53,32,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #200000 0%, #700000 12%, #FF3520 22%, #ff7060 30%, #ffe8e0 38%, #e01800 48%, #b00000 58%, #ff7060 68%, #ffe8e0 77%, #700000 90%, #200000 100%)",
    },
  },
  {
    key: "jade", label: "Jade Dynasty", desc: "Deep Jade & Rose Quartz",
    accent: "#E891A4",
    vars: {
      "--nyx-accent": "#E891A4", "--nyx-accent-glow": "rgba(232,145,164,0.20)", "--nyx-accent-dim": "rgba(232,145,164,0.08)", "--nyx-accent-mid": "rgba(232,145,164,0.15)", "--nyx-accent-str": "rgba(232,145,164,0.28)",
      "--nyx-bg": "#041408", "--nyx-card": "rgba(4,20,8,0.90)", "--nyx-bg-scrim": "rgba(4,20,8,0.72)", "--nyx-border": "rgba(232,145,164,0.14)", "--nyx-sidebar-bg": "rgba(2,10,4,0.99)",
      "--nyx-text": "#D4EED8", "--nyx-text-muted": "rgba(212,238,216,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.42)", "--nyx-scrollbar": "rgba(232,145,164,0.20)", "--nyx-accent-label": "rgba(232,145,164,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1a0010 0%, #602040 12%, #E891A4 22%, #ffb8c8 30%, #ffe8f0 38%, #d06880 48%, #a84860 58%, #ffb8c8 68%, #ffe8f0 77%, #602040 90%, #1a0010 100%)",
    },
  },
  {
    key: "grove", label: "Sovereign Grove", desc: "Dark Bronze & Moss Green",
    accent: "#6B8E4E",
    vars: {
      "--nyx-accent": "#6B8E4E", "--nyx-accent-glow": "rgba(107,142,78,0.20)", "--nyx-accent-dim": "rgba(107,142,78,0.08)", "--nyx-accent-mid": "rgba(107,142,78,0.15)", "--nyx-accent-str": "rgba(107,142,78,0.28)",
      "--nyx-bg": "#0A0C06", "--nyx-card": "rgba(10,12,6,0.90)", "--nyx-bg-scrim": "rgba(10,12,6,0.72)", "--nyx-border": "rgba(107,142,78,0.14)", "--nyx-sidebar-bg": "rgba(5,6,2,0.99)",
      "--nyx-text": "#DDD8C8", "--nyx-text-muted": "rgba(221,216,200,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.42)", "--nyx-scrollbar": "rgba(107,142,78,0.20)", "--nyx-accent-label": "rgba(107,142,78,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #081000 0%, #283c08 12%, #6B8E4E 22%, #90b870 30%, #d8f0c0 38%, #508038 48%, #386020 58%, #90b870 68%, #d8f0c0 77%, #283c08 90%, #081000 100%)",
    },
  },
  {
    key: "lotus", label: "Lotus Core", desc: "Deep Violet Water & Pearl",
    accent: "#EDE0DC",
    vars: {
      "--nyx-accent": "#EDE0DC", "--nyx-accent-glow": "rgba(237,224,220,0.18)", "--nyx-accent-dim": "rgba(237,224,220,0.08)", "--nyx-accent-mid": "rgba(237,224,220,0.15)", "--nyx-accent-str": "rgba(237,224,220,0.28)",
      "--nyx-bg": "#070614", "--nyx-card": "rgba(18,14,30,0.88)", "--nyx-bg-scrim": "rgba(7,6,20,0.68)", "--nyx-border": "rgba(237,224,220,0.16)", "--nyx-sidebar-bg": "rgba(5,4,12,0.99)",
      "--nyx-text": "#E8E0F0", "--nyx-text-muted": "rgba(232,224,240,0.65)", "--nyx-input-bg": "rgba(255,255,255,0.06)", "--nyx-scrollbar": "rgba(237,224,220,0.20)", "--nyx-accent-label": "rgba(237,224,220,0.65)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a0820 0%, #302060 12%, #8060a8 22%, #EDE0DC 30%, #ffffff 38%, #a080c0 48%, #806090 58%, #EDE0DC 68%, #ffffff 77%, #302060 90%, #0a0820 100%)",
    },
  },
  {
    key: "evolution", label: "Carbon Evolution", desc: "Carbon & Fern Green",
    accent: "#4CAF50",
    vars: {
      "--nyx-accent": "#4CAF50", "--nyx-accent-glow": "rgba(76,175,80,0.20)", "--nyx-accent-dim": "rgba(76,175,80,0.08)", "--nyx-accent-mid": "rgba(76,175,80,0.15)", "--nyx-accent-str": "rgba(76,175,80,0.28)",
      "--nyx-bg": "#080C08", "--nyx-card": "rgba(8,12,8,0.90)", "--nyx-bg-scrim": "rgba(8,12,8,0.72)", "--nyx-border": "rgba(76,175,80,0.14)", "--nyx-sidebar-bg": "rgba(4,6,4,0.99)",
      "--nyx-text": "#D8E8D8", "--nyx-text-muted": "rgba(216,232,216,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.40)", "--nyx-scrollbar": "rgba(76,175,80,0.20)", "--nyx-accent-label": "rgba(76,175,80,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001800 0%, #184818 12%, #4CAF50 22%, #80d880 30%, #d8ffd8 38%, #309030 48%, #187018 58%, #80d880 68%, #d8ffd8 77%, #184818 90%, #001800 100%)",
    },
  },
  {
    key: "abyss", label: "Deep Abyss", desc: "Midnight Ocean & Bioluminescent Teal",
    accent: "#00D4B4",
    vars: {
      "--nyx-accent": "#00D4B4", "--nyx-accent-glow": "rgba(0,212,180,0.22)", "--nyx-accent-dim": "rgba(0,212,180,0.08)", "--nyx-accent-mid": "rgba(0,212,180,0.15)", "--nyx-accent-str": "rgba(0,212,180,0.30)",
      "--nyx-bg": "#010812", "--nyx-card": "rgba(1,8,18,0.90)", "--nyx-bg-scrim": "rgba(1,8,18,0.72)", "--nyx-border": "rgba(0,212,180,0.14)", "--nyx-sidebar-bg": "rgba(1,4,10,0.99)",
      "--nyx-text": "#C8DCF0", "--nyx-text-muted": "rgba(200,220,240,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.44)", "--nyx-scrollbar": "rgba(0,212,180,0.22)", "--nyx-accent-label": "rgba(0,212,180,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001418 0%, #004848 12%, #00D4B4 22%, #40fff0 30%, #d0fffa 38%, #00b898 48%, #009070 58%, #40fff0 68%, #d0fffa 77%, #004848 90%, #001418 100%)",
    },
  },
  {
    key: "riviera", label: "The Riviera", desc: "Mediterranean & White Gold",
    accent: "#E8D890",
    vars: {
      "--nyx-accent": "#E8D890", "--nyx-accent-glow": "rgba(232,216,144,0.20)", "--nyx-accent-dim": "rgba(232,216,144,0.08)", "--nyx-accent-mid": "rgba(232,216,144,0.15)", "--nyx-accent-str": "rgba(232,216,144,0.28)",
      "--nyx-bg": "#041A18", "--nyx-card": "rgba(4,26,24,0.90)", "--nyx-bg-scrim": "rgba(4,26,24,0.72)", "--nyx-border": "rgba(232,216,144,0.14)", "--nyx-sidebar-bg": "rgba(2,12,10,0.99)",
      "--nyx-text": "#D8EEF0", "--nyx-text-muted": "rgba(216,238,240,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.42)", "--nyx-scrollbar": "rgba(232,216,144,0.20)", "--nyx-accent-label": "rgba(232,216,144,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #101800 0%, #484808 12%, #E8D890 22%, #fff8c0 30%, #fffff0 38%, #c8b860 48%, #a89840 58%, #fff8c0 68%, #fffff0 77%, #484808 90%, #101800 100%)",
    },
  },
  {
    key: "glacial", label: "Glacial Pure", desc: "Frosted Platinum & Ice Crystal",
    accent: "#4A9ECC",
    vars: {
      "--nyx-accent": "#4A9ECC", "--nyx-accent-glow": "rgba(74,158,204,0.18)", "--nyx-accent-dim": "rgba(74,158,204,0.10)", "--nyx-accent-mid": "rgba(74,158,204,0.18)", "--nyx-accent-str": "rgba(74,158,204,0.32)",
      "--nyx-bg": "#EFF3F8", "--nyx-card": "rgba(255,255,255,0.94)", "--nyx-bg-scrim": "rgba(239,243,248,0.82)", "--nyx-border": "rgba(74,158,204,0.22)", "--nyx-sidebar-bg": "#E2EAF2",
      "--nyx-text": "#1A2632", "--nyx-text-muted": "rgba(26,38,50,0.55)", "--nyx-input-bg": "rgba(0,0,0,0.04)", "--nyx-scrollbar": "rgba(74,158,204,0.25)", "--nyx-accent-label": "rgba(74,158,204,0.72)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #083060 0%, #2068a0 12%, #4A9ECC 22%, #80c8e8 30%, #e8f8ff 38%, #3088c0 48%, #1870a8 58%, #80c8e8 68%, #e8f8ff 77%, #2068a0 90%, #083060 100%)",
    },
  },
  {
    key: "peak", label: "Alabaster Peak", desc: "Silver-White & Cool Platinum",
    accent: "#8899AA",
    vars: {
      "--nyx-accent": "#8899AA", "--nyx-accent-glow": "rgba(136,153,170,0.18)", "--nyx-accent-dim": "rgba(136,153,170,0.10)", "--nyx-accent-mid": "rgba(136,153,170,0.18)", "--nyx-accent-str": "rgba(136,153,170,0.32)",
      "--nyx-bg": "#E4EAF0", "--nyx-card": "rgba(255,255,255,0.94)", "--nyx-bg-scrim": "rgba(228,234,240,0.82)", "--nyx-border": "rgba(136,153,170,0.24)", "--nyx-sidebar-bg": "#D8E0E8",
      "--nyx-text": "#1C2430", "--nyx-text-muted": "rgba(28,36,48,0.55)", "--nyx-input-bg": "rgba(0,0,0,0.04)", "--nyx-scrollbar": "rgba(136,153,170,0.28)", "--nyx-accent-label": "rgba(136,153,170,0.72)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #283848 0%, #506880 12%, #8899AA 22%, #b0c0d0 30%, #e8f0f8 38%, #7090a8 48%, #586880 58%, #b0c0d0 68%, #e8f0f8 77%, #506880 90%, #283848 100%)",
    },
  },
  {
    key: "tectonic", label: "Tectonic Gold", desc: "Matte Slate & Gold Veins",
    accent: "#C9A84C",
    vars: {
      "--nyx-accent": "#C9A84C", "--nyx-accent-glow": "rgba(201,168,76,0.22)", "--nyx-accent-dim": "rgba(201,168,76,0.08)", "--nyx-accent-mid": "rgba(201,168,76,0.15)", "--nyx-accent-str": "rgba(201,168,76,0.30)",
      "--nyx-bg": "#090C0F", "--nyx-card": "rgba(9,12,15,0.90)", "--nyx-bg-scrim": "rgba(9,12,15,0.72)", "--nyx-border": "rgba(201,168,76,0.14)", "--nyx-sidebar-bg": "rgba(5,7,9,0.99)",
      "--nyx-text": "#D8D4CC", "--nyx-text-muted": "rgba(216,212,204,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.40)", "--nyx-scrollbar": "rgba(201,168,76,0.22)", "--nyx-accent-label": "rgba(201,168,76,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1a1000 0%, #604c08 10%, #C9A84C 20%, #e8c860 28%, #fff8d8 36%, #d0a020 44%, #a07800 52%, #d0a020 60%, #fff8d8 68%, #e8c860 76%, #C9A84C 84%, #604c08 92%, #1a1000 100%)",
    },
  },
  {
    key: "altitude", label: "High Altitude", desc: "Twilight Mountain & Soft Amethyst",
    accent: "#9B7FCC",
    vars: {
      "--nyx-accent": "#9B7FCC", "--nyx-accent-glow": "rgba(155,127,204,0.20)", "--nyx-accent-dim": "rgba(155,127,204,0.08)", "--nyx-accent-mid": "rgba(155,127,204,0.15)", "--nyx-accent-str": "rgba(155,127,204,0.28)",
      "--nyx-bg": "#060810", "--nyx-card": "rgba(6,8,16,0.90)", "--nyx-bg-scrim": "rgba(6,8,16,0.72)", "--nyx-border": "rgba(155,127,204,0.14)", "--nyx-sidebar-bg": "rgba(3,4,10,0.99)",
      "--nyx-text": "#D8D0EC", "--nyx-text-muted": "rgba(216,208,236,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.42)", "--nyx-scrollbar": "rgba(155,127,204,0.20)", "--nyx-accent-label": "rgba(155,127,204,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a0618 0%, #302060 12%, #9B7FCC 22%, #c0a0f0 30%, #e8e0ff 38%, #7858b0 48%, #584090 58%, #c0a0f0 68%, #e8e0ff 77%, #302060 90%, #0a0618 100%)",
    },
  },
  {
    key: "future", label: "Fancy Future", desc: "Neon Void & Holographic Cyan",
    accent: "#00E5FF",
    vars: {
      "--nyx-accent": "#00E5FF", "--nyx-accent-glow": "rgba(0,229,255,0.24)", "--nyx-accent-dim": "rgba(0,229,255,0.08)", "--nyx-accent-mid": "rgba(0,229,255,0.16)", "--nyx-accent-str": "rgba(0,229,255,0.35)",
      "--nyx-bg": "#020812", "--nyx-card": "rgba(2,8,18,0.90)", "--nyx-bg-scrim": "rgba(2,8,18,0.72)", "--nyx-border": "rgba(0,229,255,0.16)", "--nyx-sidebar-bg": "rgba(1,4,10,0.99)",
      "--nyx-text": "#C0F0FF", "--nyx-text-muted": "rgba(192,240,255,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.44)", "--nyx-scrollbar": "rgba(0,229,255,0.24)", "--nyx-accent-label": "rgba(0,229,255,0.72)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001020 0%, #003858 12%, #00A8C8 22%, #00E5FF 30%, #aaf8ff 38%, #0090b8 48%, #006888 58%, #00E5FF 68%, #aaf8ff 77%, #003858 90%, #001020 100%)",
    },
  },
  {
    key: "medieval", label: "Medieval", desc: "Castle Stone & Torch Amber",
    accent: "#C8853C",
    vars: {
      "--nyx-accent": "#C8853C", "--nyx-accent-glow": "rgba(200,133,60,0.22)", "--nyx-accent-dim": "rgba(200,133,60,0.08)", "--nyx-accent-mid": "rgba(200,133,60,0.15)", "--nyx-accent-str": "rgba(200,133,60,0.30)",
      "--nyx-bg": "#0A0806", "--nyx-card": "rgba(10,8,6,0.90)", "--nyx-bg-scrim": "rgba(10,8,6,0.72)", "--nyx-border": "rgba(200,133,60,0.15)", "--nyx-sidebar-bg": "rgba(6,4,2,0.99)",
      "--nyx-text": "#E8D8B0", "--nyx-text-muted": "rgba(232,216,176,0.65)", "--nyx-input-bg": "rgba(0,0,0,0.44)", "--nyx-scrollbar": "rgba(200,133,60,0.22)", "--nyx-accent-label": "rgba(200,133,60,0.70)",
      "--nyx-texture": "none", "--nyx-sidebar-tex": "", "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1c0800 0%, #6a2c04 12%, #C8853C 22%, #e8b060 30%, #fff0c8 38%, #a86820 48%, #7c4c08 58%, #e8b060 68%, #fff0c8 77%, #6a2c04 90%, #1c0800 100%)",
    },
  },
];

/*  Helpers  */
const BG_VAR_MAP: Record<string, string> = {
  backgrounds: "--nyx-page-bg",
  sidebar:     "--nyx-sidebar-tex",
  cards:       "--nyx-card-texture",
};
function injectCardTexStyle(url: string) {
  if (typeof document === "undefined") return;
  let st = document.getElementById("nyx-card-tex-style") as HTMLStyleElement | null;
  if (!st) { st = document.createElement("style"); st.id = "nyx-card-tex-style"; document.head.appendChild(st); }
  st.textContent = url
    ? `[style*="var(--nyx-card)"]{position:relative!important;overflow:hidden}` +
      `[style*="var(--nyx-card)"]::after{content:"";position:absolute;inset:0;border-radius:inherit;` +
      `background-image:url('${url}');background-size:cover;background-position:center;` +
      `opacity:0.14;pointer-events:none;z-index:1}` +
      `[style*="var(--nyx-card)"]>*{position:relative;z-index:2}`
    : "";
}
function applyStoredBgs(themeKey: string) {
  if (typeof document === "undefined") return;
  const theme = THEMES.find(t => t.key === themeKey);
  const html  = document.documentElement;
  (["backgrounds", "sidebar", "cards"] as const).forEach(type => {
    const stored = localStorage.getItem(`destinysprings-bg-${themeKey}-${type}`);
    const cssVar = BG_VAR_MAP[type];
    if (stored) {
      html.style.setProperty(cssVar, `url('${stored}')`);
      if (type === "cards") injectCardTexStyle(stored);
    } else {
      // Reset to theme default
      if (type === "backgrounds") {
        html.style.removeProperty(cssVar);
      } else if (theme) {
        const defVal = type === "sidebar"
          ? (theme.vars["--nyx-sidebar-tex"] || "none")
          : (theme.vars["--nyx-card-texture"] || "none");
        html.style.setProperty(cssVar, defVal);
        if (type === "cards") injectCardTexStyle("");
      }
    }
  });
}
function applyTheme(key: string) {
  if (typeof document === "undefined") return;
  const theme = THEMES.find(t => t.key === key);
  if (!theme) return;
  const html = document.documentElement;
  html.setAttribute("data-theme", key);
  Object.entries(theme.vars).forEach(([k, v]) => html.style.setProperty(k, v));
  applyStoredBgs(key);
}

// ─── Elegant per-theme icon — replaces the old gem/diamond cartoon ─────────
function ThemeIcon({ accent, themeKey, size = 32 }: { accent: string; themeKey: string; size?: number }) {
  const f = accent; // petal fill at low fillOpacity
  const petal = (deg: number, r: number) => {
    const a = (deg - 90) * Math.PI / 180;
    return { cx: 16 + r * Math.cos(a), cy: 16 + r * Math.sin(a) };
  };
  const icons: Record<string, React.ReactNode> = {
    luxury: (
      <>
        <path d="M6,23 L6,14 L10.5,18.5 L16,8 L21.5,18.5 L26,14 L26,23 Z"
          stroke={f} strokeWidth="1.2" strokeLinejoin="round" fill={f} fillOpacity="0.12" />
        <line x1="6" y1="23" x2="26" y2="23" stroke={f} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="16" cy="8"  r="1.3" fill={f} />
        <circle cx="6"  cy="14" r="0.9" fill={f} fillOpacity="0.65" />
        <circle cx="26" cy="14" r="0.9" fill={f} fillOpacity="0.65" />
      </>
    ),
    glass: (
      <>
        <polygon points="16,4 26,10 26,22 16,28 6,22 6,10"
          stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.10" strokeLinejoin="round" />
        <line x1="6" y1="10" x2="26" y2="22" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" />
        <circle cx="16" cy="16" r="1.6" fill={f} fillOpacity="0.85" />
      </>
    ),
    emerald: (
      <>
        <path d="M16,4 C22,8 24,16 16,28 C8,16 10,8 16,4 Z"
          stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.12" />
        <line x1="16" y1="6" x2="16" y2="26" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M16,13 C18,12 20,14 21,16" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
        <path d="M16,19 C14,18 12,20 11,22" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
      </>
    ),
    violet: (
      <>
        <ellipse cx="16" cy="10" rx="3" ry="7" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <ellipse cx="16" cy="22" rx="3" ry="7" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <ellipse cx="10" cy="16" rx="7" ry="3" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <ellipse cx="22" cy="16" rx="7" ry="3" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <circle cx="16" cy="16" r="2.2" fill={f} fillOpacity="0.9" />
      </>
    ),
    hotpink: (
      <>
        {[0,72,144,216,288].map((deg, i) => {
          const { cx, cy } = petal(deg, 7);
          return <ellipse key={i} cx={cx} cy={cy} rx="3" ry="4.5"
            transform={`rotate(${deg}, ${cx}, ${cy})`}
            stroke={f} strokeWidth="1" fill={f} fillOpacity="0.14" />;
        })}
        <circle cx="16" cy="16" r="2.5" fill={f} fillOpacity="0.85" />
      </>
    ),
    rose: (
      <>
        <path d="M16,26 C8,20 4,14 7,9 C9,6 13,6 16,10 C19,6 23,6 25,9 C28,14 24,20 16,26 Z"
          stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.12" strokeLinejoin="round" />
        <path d="M10,11 C10,9 12,8 14,10" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
      </>
    ),
    light: (
      <>
        <circle cx="16" cy="16" r="5" stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.12" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const a = deg * Math.PI / 180;
          return <line key={i}
            x1={16 + 7  * Math.cos(a)} y1={16 + 7  * Math.sin(a)}
            x2={16 + 11 * Math.cos(a)} y2={16 + 11 * Math.sin(a)}
            stroke={f} strokeWidth={i % 2 === 0 ? "1.1" : "0.7"} strokeLinecap="round" />;
        })}
      </>
    ),
    blush: (
      <>
        {[0,60,120,180,240,300].map((deg, i) => {
          const { cx, cy } = petal(deg, 7);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.8" ry="4"
            transform={`rotate(${deg}, ${cx}, ${cy})`}
            stroke={f} strokeWidth="1" fill={f} fillOpacity="0.12" />;
        })}
        <circle cx="16" cy="16" r="2.2" fill={f} fillOpacity="0.8" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {icons[themeKey] ?? icons.luxury}
    </svg>
  );
}

/*  Sub-components  */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
      <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent)", opacity: 0.55, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ position: "relative", width: 44, height: 24, borderRadius: 12, background: checked ? "var(--nyx-accent-mid)" : "rgba(255,255,255,0.06)", border: `1px solid ${checked ? "var(--nyx-accent-str)" : "var(--nyx-border)"}`, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 22 : 3, width: 16, height: 16, borderRadius: 8, background: checked ? "var(--nyx-accent)" : "var(--nyx-text-muted)", transition: "left 0.2s" }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--nyx-border)" }}>
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--nyx-text)" }}>{label}</div>
        {desc && <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function TwoFactorToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const toggle = async () => {
    if (!enabled) { setShowSetup(true); return; }
    setLoading(true);
    // In a full implementation this would call /api/auth/2fa/disable
    await new Promise(r => setTimeout(r, 600));
    setEnabled(false);
    setLoading(false);
  };

  const confirmEnable = async () => {
    setLoading(true);
    // In a full implementation this would verify a TOTP code and call /api/auth/2fa/enable
    await new Promise(r => setTimeout(r, 800));
    setEnabled(true);
    setShowSetup(false);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, minWidth: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {enabled && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 4, padding: "2px 8px" }}>ENABLED</span>}
        <button type="button" onClick={toggle} disabled={loading}
          style={{ background: enabled ? "rgba(248,113,113,0.08)" : "var(--nyx-accent-dim)", border: `1px solid ${enabled ? "rgba(248,113,113,0.2)" : "var(--nyx-accent-str)"}`, borderRadius: 7, padding: "7px 16px", color: enabled ? "#f87171" : "var(--nyx-accent)", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
          {loading ? "..." : enabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      </div>
      {showSetup && (
        <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-accent-str)", borderRadius: 10, padding: 18, width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nyx-accent)", marginBottom: 10 }}>Set up Two-Factor Authentication</div>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--nyx-border)", borderRadius: 8, padding: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, minHeight: 96 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📱</div>
              <div style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", lineHeight: 1.5 }}>QR code will appear here once your server is configured with a TOTP secret generator.</div>
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
            Scan the QR code with your authenticator app (Google Authenticator, Authy, or 1Password), then enter the 6-digit code below to verify.
          </div>
          <input placeholder="000000" maxLength={6}
            style={{ width: "100%", background: "var(--nyx-input-bg)", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "8px 12px", color: "var(--nyx-text)", fontSize: "1.1rem", letterSpacing: "0.3em", outline: "none", boxSizing: "border-box", textAlign: "center", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowSetup(false)} style={{ flex: 1, background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.78rem" }}>Cancel</button>
            <button onClick={confirmEnable} disabled={loading} style={{ flex: 2, background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)", borderRadius: 7, padding: "7px", color: "var(--nyx-accent)", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
              {loading ? "Verifying..." : "Verify & Enable"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/*  Main component  */
export default function SettingsClient({ personalMode = false }: { personalMode?: boolean }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isProduction = process.env.NODE_ENV === "production";
  const roleLabel = session?.user?.role === "REP" ? "Rep" : session?.user?.role === "ACCOUNT" ? "Account" : "Admin";
  const isAccountRole = session?.user?.role === "ACCOUNT";
  const showPersonalHeading = personalMode || isAccountRole;
  const [activeTheme, setActiveTheme]     = useState("luxury");
  const [orgName, setOrgName]             = useState("Destiny Springs Healthcare");
  const [supportEmail, setSupportEmail]   = useState("intake@destinysprings.com");
  const [notifs, setNotifs]               = useState({ email: true, push: false, digest: true, leads: true, contracts: false });
  const [prefs, setPrefs]                 = useState<UserPreferenceState>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading]   = useState(true);
  const [prefsError, setPrefsError]       = useState("");
  const [devMsg, setDevMsg]               = useState("");
  const [devLoading, setDevLoading]       = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [saved, setSaved]                 = useState(false);
  // Background picker state
  const [bgTab, setBgTab]               = useState<"backgrounds" | "sidebar" | "cards">("backgrounds");
  const [bgAssets, setBgAssets]         = useState<string[]>([]);
  const [bgLoading, setBgLoading]       = useState(false);
  const [bgSelections, setBgSelections] = useState<Record<string, string>>({});
  const [bgTile, setBgTile]             = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    avatar: "",
    title: "",
    phone: "",
    city: "",
    state: "",
    bio: "",
    organizationName: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("destinysprings-theme") ?? "luxury" : "luxury";
    setActiveTheme(stored);
    applyTheme(stored);
    const org = localStorage.getItem("destinysprings-orgName");
    if (org) setOrgName(org);
    const em = localStorage.getItem("destinysprings-supportEmail");
    if (em) setSupportEmail(em);
    const n = localStorage.getItem("destinysprings-notifs");
    if (n) try { setNotifs(JSON.parse(n)); } catch { /* ignore */ }
    // Load stored bg selections
    const sels: Record<string, string> = {};
    THEMES.forEach(t => {
      ["backgrounds", "sidebar", "cards"].forEach(type => {
        const k = `destinysprings-bg-${t.key}-${type}`;
        const v = localStorage.getItem(k);
        if (v) sels[k] = v;
      });
    });
    setBgSelections(sels);
    // Load tile mode for current theme
    const tile = localStorage.getItem(`destinysprings-bg-tile-${stored}`) === "1";
    setBgTile(tile);
    applyTileMode(tile);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/preferences")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load preferences");
        return response.json() as Promise<{ preferences?: unknown }>;
      })
      .then((data) => {
        if (!active) return;
        setPrefs(normalizePrefs(data.preferences));
        setPrefsError("");
      })
      .catch(() => {
        if (!active) return;
        setPrefs(DEFAULT_PREFS);
        setPrefsError("Could not load Aegis preferences. Defaults are shown.");
      })
      .finally(() => {
        if (active) setPrefsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch available images whenever theme or tab changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    setBgLoading(true);
    fetch(`/api/theme-assets?theme=${activeTheme}&type=${bgTab}`)
      .then(r => r.json()).then(setBgAssets).catch(() => setBgAssets([]))
      .finally(() => setBgLoading(false));
  }, [activeTheme, bgTab]);

  useEffect(() => {
    if (!showPersonalHeading) return;
    let active = true;
    setProfileLoading(true);
    fetch("/api/me/profile")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load profile");
        return response.json() as Promise<{ profile?: {
          fullName?: string;
          email?: string;
          avatar?: string;
          title?: string;
          phone?: string;
          city?: string;
          state?: string;
          bio?: string;
          organizationName?: string;
        } }>;
      })
      .then((data) => {
        if (!active) return;
        const profile = data.profile;
        setProfileForm({
          fullName: profile?.fullName ?? "",
          email: profile?.email ?? "",
          avatar: profile?.avatar ?? "",
          title: profile?.title ?? "",
          phone: profile?.phone ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          bio: profile?.bio ?? "",
          organizationName: profile?.organizationName ?? "",
        });
        setProfileError("");
      })
      .catch(() => {
        if (!active) return;
        setProfileError("Could not load profile details right now.");
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showPersonalHeading]);

  function selectTheme(key: string) {
    setActiveTheme(key);
    localStorage.setItem("destinysprings-theme", key);
    applyTheme(key);
    const tile = localStorage.getItem(`destinysprings-bg-tile-${key}`) === "1";
    setBgTile(tile);
    applyTileMode(tile);
  }

  function selectBg(url: string) {
    const lsKey  = `destinysprings-bg-${activeTheme}-${bgTab}`;
    const cssVar = BG_VAR_MAP[bgTab];
    const theme  = THEMES.find(t => t.key === activeTheme);
    if (url) {
      localStorage.setItem(lsKey, url);
      document.documentElement.style.setProperty(cssVar, `url('${url}')`);
      if (bgTab === "cards") injectCardTexStyle(url);
    } else {
      localStorage.removeItem(lsKey);
      if (bgTab === "backgrounds") {
        document.documentElement.style.removeProperty(cssVar);
      } else {
        const defVal = bgTab === "sidebar"
          ? (theme?.vars["--nyx-sidebar-tex"] || "none")
          : (theme?.vars["--nyx-card-texture"] || "none");
        document.documentElement.style.setProperty(cssVar, defVal);
        if (bgTab === "cards") injectCardTexStyle("");
      }
    }
    setBgSelections((prev: Record<string, string>) => ({ ...prev, [lsKey]: url }));
  }

  function applyTileMode(tiled: boolean) {
    document.documentElement.style.setProperty("--nyx-page-bg-size", tiled ? "400px 400px" : "cover");
    document.documentElement.style.setProperty("--nyx-page-bg-repeat", tiled ? "repeat" : "no-repeat");
  }

  function selectTile(tiled: boolean) {
    setBgTile(tiled);
    localStorage.setItem(`destinysprings-bg-tile-${activeTheme}`, tiled ? "1" : "0");
    applyTileMode(tiled);
  }

  async function saveOrg() {
    localStorage.setItem("destinysprings-orgName", orgName);
    localStorage.setItem("destinysprings-supportEmail", supportEmail);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!response.ok) throw new Error("save_failed");
      setPrefsError("");
    } catch {
      setPrefsError("Could not save Aegis settings right now.");
      setSaved(false);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  function setNotif(k: keyof typeof notifs, v: boolean) {
    const updated = { ...notifs, [k]: v };
    setNotifs(updated);
    localStorage.setItem("destinysprings-notifs", JSON.stringify(updated));
  }

  function setAiPref<K extends keyof UserPreferenceState["ai"]>(key: K, value: UserPreferenceState["ai"][K]) {
    setPrefs((current) => ({ ...current, ai: { ...current.ai, [key]: value } }));
  }

  function setAutomationPref<K extends keyof UserPreferenceState["automations"]>(key: K, value: UserPreferenceState["automations"][K]) {
    setPrefs((current) => ({ ...current, automations: { ...current.automations, [key]: value } }));
  }

  function setAlertPref<K extends keyof UserPreferenceState["alerts"]>(key: K, value: UserPreferenceState["alerts"][K]) {
    setPrefs((current) => ({ ...current, alerts: { ...current.alerts, [key]: value } }));
  }

  function toggleFocusStat(statId: string) {
    setPrefs((current) => {
      const exists = current.dashboard.focusStatIds.includes(statId);
      return {
        ...current,
        dashboard: {
          ...current.dashboard,
          focusStatIds: exists
            ? current.dashboard.focusStatIds.filter((id) => id !== statId)
            : [...current.dashboard.focusStatIds, statId],
        },
      };
    });
  }

  function setStatTarget(statId: string, target: number) {
    setPrefs((current) => ({
      ...current,
      dashboard: {
        ...current.dashboard,
        statTargets: {
          ...current.dashboard.statTargets,
          [statId]: Math.max(0, Math.round(target)),
        },
      },
    }));
  }

  function toggleChannel(channel: string) {
    setPrefs((current) => {
      const exists = current.ai.preferredChannels.includes(channel);
      return {
        ...current,
        ai: {
          ...current.ai,
          preferredChannels: exists
            ? current.ai.preferredChannels.filter((item) => item !== channel)
            : [...current.ai.preferredChannels, channel],
        },
      };
    });
  }

  async function devAction(action: string) {
    if (isProduction && action === "seed-demo") {
      setDevMsg("Demo seeding is disabled in production.");
      return;
    }

    if (action !== "seed-demo" && !confirmAction) { setConfirmAction(action); return; }
    if (confirmAction && confirmAction !== action) { setConfirmAction(action); return; }
    setDevLoading(action); setDevMsg(""); setConfirmAction(null);
    try {
      const r = await fetch("/api/admin/dev-tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json();
      setDevMsg(d.message ?? (r.ok ? "Done." : "Error."));
    } catch { setDevMsg("Network error."); }
    finally { setDevLoading(null); }
  }

  async function updatePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/preferences/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setPasswordError(data.error ?? "Could not update password right now.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(data.message ?? "Password updated successfully.");
    } catch {
      setPasswordError("Network error while updating password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveProfile() {
    setProfileError("");
    setProfileSuccess("");
    if (!profileForm.fullName.trim()) {
      setProfileError("Full name is required.");
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileForm.fullName,
          avatar: profileForm.avatar || null,
          title: profileForm.title,
          phone: profileForm.phone,
          city: profileForm.city,
          state: profileForm.state,
          bio: profileForm.bio,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setProfileError(data.error ?? "Could not save profile right now.");
        return;
      }

      setProfileSuccess("Profile updated successfully.");
    } catch {
      setProfileError("Network error while saving profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function selectAvatarFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Image must be 2MB or smaller.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      setProfileError("Could not load selected image.");
      return;
    }

    setProfileError("");
    setProfileSuccess("");
    setProfileForm((current) => ({ ...current, avatar: dataUrl }));
  }

  const curTheme = THEMES.find(t => t.key === activeTheme) ?? THEMES[0];

  return (
    <div style={{ maxWidth: 740, paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--nyx-accent)", opacity: 0.55, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>CONFIGURATION</p>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--nyx-text)", letterSpacing: "-0.025em" }}>{showPersonalHeading ? "My Account" : "Settings"}</h1>
        <p style={{ color: "var(--nyx-text-muted)", fontSize: "0.875rem", marginTop: 5 }}>{showPersonalHeading ? "Personal preferences, notifications, AI behavior, and account security" : "Appearance, organization, notifications, and developer tools"}</p>
      </div>

      {showPersonalHeading && (
        <Section title="Profile">
          <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
            Manage your personal account details used across the platform.
          </p>
          {profileLoading ? (
            <div style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>Loading profile…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      border: "1px solid var(--nyx-border)",
                      background: "rgba(0,0,0,0.25)",
                      backgroundImage: profileForm.avatar ? `url(${profileForm.avatar})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--nyx-text-muted)",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                    }}
                  >
                    {!profileForm.avatar ? (profileForm.fullName?.trim()?.charAt(0)?.toUpperCase() || "?") : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <label
                      style={{
                        background: "var(--nyx-accent-dim)",
                        border: "1px solid var(--nyx-accent-str)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "var(--nyx-accent)",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Upload Photo
                      <input type="file" accept="image/*" onChange={selectAvatarFile} style={{ display: "none" }} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setProfileForm((current) => ({ ...current, avatar: "" }))}
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "#fca5a5",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>FULL NAME</label>
                  <input style={inp} value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>EMAIL</label>
                  <input style={{ ...inp, opacity: 0.72 }} value={profileForm.email} disabled />
                </div>
                {profileForm.organizationName ? (
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>ORGANIZATION</label>
                    <input style={{ ...inp, opacity: 0.72 }} value={profileForm.organizationName} disabled />
                  </div>
                ) : null}
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>TITLE</label>
                  <input style={inp} value={profileForm.title} onChange={(event) => setProfileForm((current) => ({ ...current, title: event.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>PHONE</label>
                  <input style={inp} value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
                </div>
                {session?.user?.role === "REP" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>CITY</label>
                      <input style={inp} value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>STATE</label>
                      <input style={inp} value={profileForm.state} onChange={(event) => setProfileForm((current) => ({ ...current, state: event.target.value }))} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>BIO</label>
                      <textarea style={{ ...inp, minHeight: 84, resize: "vertical" }} value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} />
                    </div>
                  </>
                )}
              </div>
              {(profileError || profileSuccess) && (
                <div style={{ marginTop: 10, fontSize: "0.78rem", color: profileError ? "#f87171" : "#34d399" }}>
                  {profileError || profileSuccess}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={profileSaving}
                  style={{ background: "var(--nyx-accent)", border: "1px solid transparent", borderRadius: 8, padding: "10px 18px", color: "#fff", cursor: profileSaving ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 700, opacity: profileSaving ? 0.75 : 1 }}
                >
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </>
          )}
        </Section>
      )}

      {/*  THEMES  */}
      <Section title="Appearance &mdash; Theme">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 18 }}>
          Choose your interface theme. Changes apply instantly across the entire platform.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
          {THEMES.map(t => {
            const isActive = activeTheme === t.key;
            return (
              <button key={t.key} type="button" onClick={() => selectTheme(t.key)} style={{
                background: isActive ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.28)",
                border: `2px solid ${isActive ? t.accent : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12, padding: "16px 10px 14px", cursor: "pointer", textAlign: "center",
                boxShadow: isActive ? `0 0 22px ${t.accent}38, 0 4px 20px rgba(0,0,0,0.5)` : "none",
                transition: "all 0.22s", position: "relative", overflow: "hidden",
              }}>
                {/* Theme icon */}
                <div style={{ position: "relative", width: 32, height: 32, margin: "0 auto 10px" }}>
                  <ThemeIcon accent={t.accent} themeKey={t.key} />
                  {isActive && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${t.accent}22 0%, transparent 70%)`, pointerEvents: "none" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: isActive ? 800 : 500, color: isActive ? t.accent : "rgba(255,255,255,0.45)", lineHeight: 1.2 }}>{t.label}</div>
                <div style={{ fontSize: "0.65rem", color: isActive ? `${t.accent}99` : "rgba(255,255,255,0.22)", marginTop: 3 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid var(--nyx-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeIcon accent={curTheme.accent} themeKey={curTheme.key} size={18} />
          <span style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>
            Active: <strong style={{ color: curTheme.accent }}>{curTheme.label}</strong>
            <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: "0.72rem", opacity: 0.7 }}>{curTheme.accent}</span>
          </span>
        </div>

        {/* ── Background picker ── */}
        <div style={{ marginTop: 24, borderTop: "1px solid var(--nyx-border)", paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--nyx-accent)", letterSpacing: "0.10em", textTransform: "uppercase", opacity: 0.7, marginBottom: 3 }}>Backgrounds &amp; Textures</div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)" }}>
                Customize backgrounds for <strong style={{ color: curTheme.accent }}>{curTheme.label}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["backgrounds", "sidebar", "cards"] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setBgTab(tab)} style={{
                  background: bgTab === tab ? "var(--nyx-accent-dim)" : "transparent",
                  border: `1px solid ${bgTab === tab ? "var(--nyx-accent-mid)" : "var(--nyx-border)"}`,
                  borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: "0.75rem",
                  color: bgTab === tab ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
                  fontWeight: bgTab === tab ? 700 : 400, transition: "all 0.15s",
                }}>
                  {tab === "backgrounds" ? "Body" : tab === "sidebar" ? "Sidebar" : "Cards"}
                </button>
              ))}
              {bgTab === "backgrounds" && (<>
                <div style={{ width: 1, background: "var(--nyx-border)", margin: "4px 2px", alignSelf: "stretch" }} />
                {([{ k: false, l: "Cover" }, { k: true, l: "Tile" }] as const).map(({ k, l }) => (
                  <button key={l} type="button" onClick={() => selectTile(k)} style={{
                    background: bgTile === k ? "var(--nyx-accent-dim)" : "transparent",
                    border: `1px solid ${bgTile === k ? "var(--nyx-accent-mid)" : "var(--nyx-border)"}`,
                    borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: "0.75rem",
                    color: bgTile === k ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
                    fontWeight: bgTile === k ? 700 : 400, transition: "all 0.15s",
                  }}>{l}</button>
                ))}
              </>)}
            </div>
          </div>
          {bgLoading ? (
            <div style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", padding: "14px 0" }}>Loading…</div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
              <button type="button" onClick={() => selectBg("")} style={{
                flexShrink: 0, width: 68, height: 68, borderRadius: 8, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer",
                background: !bgSelections[`destinysprings-bg-${activeTheme}-${bgTab}`] ? "var(--nyx-accent-dim)" : "rgba(0,0,0,0.25)",
                border: `2px solid ${!bgSelections[`destinysprings-bg-${activeTheme}-${bgTab}`] ? "var(--nyx-accent)" : "var(--nyx-border)"}`,
                color: "var(--nyx-text-muted)", fontSize: "0.62rem", fontWeight: 600, transition: "all 0.15s",
              }}>
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>∅</span>
                Default
              </button>
              {bgAssets.length === 0 ? (
                <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", padding: "20px 10px", lineHeight: 1.7, alignSelf: "center" }}>
                  {isAdmin ? (
                    <>
                      No images yet, drop images into{" "}
                      <code style={{ fontFamily: "monospace", fontSize: "0.68rem" }}>public/themes/{activeTheme}/{bgTab}/</code>
                    </>
                  ) : (
                    "No images available for this theme section yet."
                  )}
                </div>
              ) : bgAssets.map(url => {
                const isSelected = bgSelections[`destinysprings-bg-${activeTheme}-${bgTab}`] === url;
                return (
                  <button key={url} type="button" onClick={() => selectBg(url)} title={url.split("/").pop()} style={{
                    flexShrink: 0, width: 80, height: 68, borderRadius: 8, cursor: "pointer",
                    backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center",
                    border: `2px solid ${isSelected ? "var(--nyx-accent)" : "transparent"}`,
                    outline: isSelected ? "2px solid var(--nyx-accent-mid)" : "none",
                    outlineOffset: 2,
                    boxShadow: isSelected ? "0 0 14px var(--nyx-accent-glow)" : "0 2px 8px rgba(0,0,0,0.4)",
                    transition: "all 0.15s",
                  }} />
                );
              })}
            </div>
          )}
          {bgTab === "cards" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--nyx-text-muted)", marginBottom: 8, letterSpacing: "0.06em", opacity: 0.7 }}>LIVE PREVIEW</div>
              <div className="gold-card" style={{ minHeight: 64, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--nyx-accent)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.8rem", color: "var(--nyx-text)", opacity: 0.7 }}>Card texture preview: select an image above</span>
              </div>
            </div>
          )}
        </div>
      </Section>
      {!personalMode && <Section title="Organization">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>ORG / BRAND NAME</label>
            <input style={inp} value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>SUPPORT EMAIL</label>
            <input style={inp} type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          </div>
        </div>
      </Section>}

      {/*  NOTIFICATIONS  */}
      <Section title="Notifications">
        {([
          ["email",     "Email Notifications",      "Send alerts to support email"],
          ["push",      "Browser Push",              "In-browser push notifications"],
          ["digest",    "Daily Digest",              "Summary email each morning"],
          ["leads",     "New Lead Alerts",           "Notify when a new lead is created"],
          ["contracts", "Contract Expiry Warnings",  "Alert 30 days before expiry"],
        ] as [keyof typeof notifs, string, string][]).map(([key, label, desc]) => (
          <SettingRow key={key} label={label} desc={desc}>
            <Toggle checked={notifs[key]} onChange={v => setNotif(key, v)} />
          </SettingRow>
        ))}
      </Section>

      <Section title="Aegis AI Preferences">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 18, lineHeight: 1.65 }}>
          Control how Aegis supports your workflow. These settings shape response style, proactive guidance, preferred referral channels, and automation behavior for your {roleLabel.toLowerCase()} workflow.
        </p>
        {prefsLoading ? (
          <div style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>Loading Aegis profile…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>RESPONSE STYLE</label>
                <select style={inp} value={prefs.ai.responseStyle} onChange={e => setAiPref("responseStyle", e.target.value as ResponseStyle)}>
                  <option value="concise">Concise</option>
                  <option value="checklist">Checklist</option>
                  <option value="strategy_memo">Strategy Memo</option>
                  <option value="draft_email">Draft Email</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>SUGGESTION STYLE</label>
                <select style={inp} value={prefs.ai.suggestionAggressiveness} onChange={e => setAiPref("suggestionAggressiveness", e.target.value as SuggestionAggressiveness)}>
                  <option value="minimal">Minimal</option>
                  <option value="balanced">Balanced</option>
                  <option value="proactive">Proactive</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>FAVORITE WORKFLOW</label>
              <input style={inp} value={prefs.ai.favoriteWorkflow} onChange={e => setAiPref("favoriteWorkflow", e.target.value)} placeholder="relationship_reactivation, low_census_recovery, court_strategy" />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", marginBottom: 8 }}>PRIORITY REFERRAL CHANNELS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CHANNEL_OPTIONS.map(([value, label]) => {
                  const selected = prefs.ai.preferredChannels.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleChannel(value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: `1px solid ${selected ? "var(--nyx-accent-str)" : "var(--nyx-border)"}`,
                        background: selected ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.03)",
                        color: selected ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: selected ? 700 : 500,
                      }}
                    >
                      {selected ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Automation Preferences">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 10, lineHeight: 1.65 }}>
          Choose which automations Aegis should prepare or monitor for you. High-risk actions remain approval-based by design.
        </p>
        {([
          ["followUpReminders", "Follow-Up Reminders", "Notify when leads or opportunities are due or overdue"],
          ["quietReferralAlerts", "Quiet Referral Alerts", "Flag sending facilities or referral sources that have gone quiet"],
          ["lowCensusPlaybooks", "Low Census Playbooks", "Generate action plans when census or pipeline softness appears"],
          ["stageStallAlerts", "Stage Stall Alerts", "Detect opportunities sitting too long in Inquiry, Clinical Review, or Insurance Auth"],
          ["draftedOutreach", "Drafted Outreach", "Let Aegis generate outreach sequences and follow-up drafts"],
          ["dailyDigest", "Digest Emails", "Prepare daily or weekly workload summaries"],
          ["approvalRequiredForOutreach", "Approval Required For Outreach", "Never auto-send relationship or marketing emails without review"],
        ] as [keyof UserPreferenceState["automations"], string, string][]).map(([key, label, desc]) => (
          <SettingRow key={key} label={label} desc={desc}>
            <Toggle checked={prefs.automations[key] as boolean} onChange={v => setAutomationPref(key, v as never)} />
          </SettingRow>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>DIGEST CADENCE</label>
            <select style={inp} value={prefs.automations.digestCadence} onChange={e => setAutomationPref("digestCadence", e.target.value as DigestCadence)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Personal KPI Cards">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
          Pick the KPI cards that matter most to you and set your personal targets. The dashboard can prioritize these metrics first.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {KPI_OPTIONS.map(([id, label]) => {
            const selected = prefs.dashboard.focusStatIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleFocusStat(id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${selected ? "var(--nyx-accent-str)" : "var(--nyx-border)"}`,
                  background: selected ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.03)",
                  color: selected ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: selected ? 700 : 500,
                }}
              >
                {selected ? "* " : ""}{label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {prefs.dashboard.focusStatIds.map((id) => {
            const label = KPI_OPTIONS.find(([key]) => key === id)?.[1] ?? id;
            return (
              <div key={id}>
                <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>{label.toUpperCase()} TARGET</label>
                <input
                  type="number"
                  min={0}
                  style={inp}
                  value={prefs.dashboard.statTargets[id] ?? 0}
                  onChange={(event) => setStatTarget(id, Number(event.target.value || 0))}
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Alert Thresholds">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
          Define when Aegis should nudge you. These thresholds drive personal reminders and stage-stall alert timing.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>STALE LEAD DAYS</label>
            <input type="number" min={1} max={120} style={inp} value={prefs.alerts.staleLeadDays} onChange={e => setAlertPref("staleLeadDays", clampNumber(e.target.value, 14, 1, 120))} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>STAGE STALL DAYS</label>
            <input type="number" min={1} max={120} style={inp} value={prefs.alerts.stageStallDays} onChange={e => setAlertPref("stageStallDays", clampNumber(e.target.value, 10, 1, 120))} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>NO-CONTACT DAYS</label>
            <input type="number" min={1} max={60} style={inp} value={prefs.alerts.noContactDays} onChange={e => setAlertPref("noContactDays", clampNumber(e.target.value, 5, 1, 60))} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>LOW CENSUS THRESHOLD</label>
            <input type="number" min={1} max={50} style={inp} value={prefs.alerts.lowCensusThreshold} onChange={e => setAlertPref("lowCensusThreshold", clampNumber(e.target.value, 4, 1, 50))} />
          </div>
        </div>
      </Section>

      {/*  SECURITY / 2FA  */}
      <Section title="Security &amp; Authentication">
        <SettingRow
          label="Two-Factor Authentication (2FA)"
          desc="Add a second layer of protection to your account using a TOTP authenticator app such as Google Authenticator, Authy, or 1Password.">
          <TwoFactorToggle />
        </SettingRow>
        <SettingRow
          label="Session Management"
          desc="Active sessions are managed by NextAuth. Signing out on this device will invalidate your session token.">
          <span style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)" }}>Managed by NextAuth</span>
        </SettingRow>
      </Section>

      {personalMode && (
        <Section title="Change Password">
          <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
            Update your account password. You must enter your current password to confirm this change.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>CURRENT PASSWORD</label>
              <input
                type="password"
                autoComplete="current-password"
                style={inp}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>NEW PASSWORD</label>
              <input
                type="password"
                autoComplete="new-password"
                style={inp}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>CONFIRM NEW PASSWORD</label>
              <input
                type="password"
                autoComplete="new-password"
                style={inp}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          {(passwordError || passwordSuccess) && (
            <div
              style={{
                marginTop: 12,
                fontSize: "0.78rem",
                color: passwordError ? "#f87171" : "#34d399",
              }}
            >
              {passwordError || passwordSuccess}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={updatePassword}
              disabled={passwordSaving}
              style={{
                background: "var(--nyx-accent)",
                border: "1px solid transparent",
                borderRadius: 8,
                padding: "10px 18px",
                color: "#fff",
                cursor: passwordSaving ? "not-allowed" : "pointer",
                fontSize: "0.82rem",
                fontWeight: 700,
                opacity: passwordSaving ? 0.75 : 1,
              }}
            >
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </Section>
      )}

      {/*  DEV TOOLS  */}
      {!personalMode && !isProduction && <Section title="Developer Tools">
        {/* Admin-only warning banner */}
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: 9, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: "1.1rem", lineHeight: "1.3", flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f87171", letterSpacing: "0.06em", marginBottom: 4 }}>ADMIN / OWNER ACCESS ONLY</div>
            <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", lineHeight: 1.55 }}>
              Destructive actions are <strong style={{ color: "#f87171" }}>permanent and irreversible</strong>. Clear All Data will permanently delete every record. No undo, no backup, no recovery.
            </div>
          </div>
        </div>
        {!isAdmin && (
          <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.20)", borderRadius: 7, padding: "9px 14px", marginBottom: 14, fontSize: "0.78rem", color: "#f87171", fontWeight: 600 }}>
            🔒 You do not have permission to perform destructive actions. Admin or Owner role required.
          </div>
        )}
        <p style={{ fontSize: "0.8rem", color: "var(--nyx-text-muted)", marginBottom: 18 }}>Manage demo data for testing and presentations. Use with caution in production.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!isProduction && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(52,211,153,0.12)" }}>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#34d399" }}>Seed Demo Data</div>
                <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>Creates sample leads, opportunities, and activities for demonstration</div>
              </div>
              <button onClick={() => devAction("seed-demo")} disabled={devLoading !== null} style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 7, padding: "8px 18px", color: "#34d399", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{devLoading === "seed-demo" ? "Seeding\u2026" : "Seed Demo"}</button>
            </div>
          )}

          {/* Clear Demo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(251,191,36,0.18)", opacity: isAdmin ? 1 : 0.45 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fbbf24" }}>Clear Demo Data</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.30)", borderRadius: 4, padding: "2px 6px", color: "#fbbf24", letterSpacing: "0.05em" }}>ADMIN ONLY</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>Removes demo leads, opportunities, activities, invoices, and contracts</div>
            </div>
            {confirmAction === "clear-demo"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 7, padding: "7px 14px", color: "#fbbf24", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8rem" }}>{devLoading === "clear-demo" ? "Clearing\u2026" : "Confirm"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 7, padding: "8px 18px", color: "#fbbf24", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8rem" }}>Clear Demo</button>
            }
          </div>

          {/* Clear All */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(248,113,113,0.04)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(248,113,113,0.28)", opacity: isAdmin ? 1 : 0.45 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#f87171" }}>Clear All Data</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.40)", borderRadius: 4, padding: "2px 6px", color: "#f87171", letterSpacing: "0.06em" }}>EXTREME CAUTION</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: 4, padding: "2px 6px", color: "#f87171", letterSpacing: "0.05em" }}>ADMIN ONLY</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 4, lineHeight: 1.5 }}>Permanently wipes <strong style={{ color: "#f87171" }}>ALL</strong> records &mdash; leads, opps, invoices, contracts, activities. <strong style={{ color: "#f87171" }}>No undo. No recovery.</strong></div>
            </div>
            {confirmAction === "clear-all"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-all")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.45)", borderRadius: 7, padding: "7px 14px", color: "#f87171", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 800, fontSize: "0.8rem" }}>{devLoading === "clear-all" ? "Wiping\u2026" : "\u26a0 Confirm \u2014 Wipe Everything"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-all")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 7, padding: "8px 18px", color: "#f87171", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8rem" }}>Clear All</button>
            }
          </div>
        </div>

        {devMsg && (
          <div style={{ marginTop: 14, background: "rgba(0,0,0,0.35)", borderRadius: 7, padding: "10px 14px", fontSize: "0.82rem", color: devMsg.toLowerCase().includes("error") || devMsg.toLowerCase().includes("fail") ? "#f87171" : "#34d399", border: "1px solid rgba(255,255,255,0.05)" }}>
            {devMsg}
          </div>
        )}
      </Section>}

      {/* Save bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 14, marginTop: 32, paddingTop: 20, paddingBottom: 32,
        borderTop: "1px solid var(--nyx-border)",
      }}>
        {prefsError && <span style={{ fontSize: "0.78rem", color: "#f87171", marginRight: "auto" }}>{prefsError}</span>}
        <button onClick={saveOrg} style={{
          background: saved ? "rgba(52,211,153,0.18)" : "var(--nyx-accent)",
          border: `1px solid ${saved ? "rgba(52,211,153,0.45)" : "transparent"}`,
          borderRadius: 8, padding: "10px 28px",
          color: saved ? "#34d399" : "#fff",
          cursor: "pointer", fontSize: "0.875rem", fontWeight: 700,
          boxShadow: saved ? "none" : "0 4px 18px var(--nyx-accent-glow)",
          transition: "all 0.25s", letterSpacing: "0.01em",
          minWidth: 140,
        }}>
          {saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
