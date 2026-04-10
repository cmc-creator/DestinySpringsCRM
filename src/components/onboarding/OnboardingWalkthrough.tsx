"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Role = "ADMIN" | "REP" | "ACCOUNT";

type WalkStep = {
  href: string;
  title: string;
  body: string;
};

interface OnboardingWalkthroughProps {
  role: Role;
}

const STEPS: Record<Role, WalkStep[]> = {
  ADMIN: [
    { href: "/admin/dashboard", title: "Dashboard", body: "Start here for command-center KPIs, sync health, and SLA alerts." },
    { href: "/admin/opportunities", title: "Admissions", body: "Track active admissions pipeline stages and stalled opportunities." },
    { href: "/admin/referrals", title: "Admissions Referrals", body: "Review source attribution, discharge destinations, and destination trends." },
    { href: "/admin/inquiry", title: "Referral Intake Inbox", body: "Review new referral submissions and route qualified cases quickly." },
    { href: "/admin/reps/performance", title: "Rep Performance", body: "Monitor rep output, login activity, and bonus/commission performance." },
    { href: "/user-guide", title: "User Guide", body: "Use this as the complete operating guide for role workflows and standards." },
  ],
  REP: [
    { href: "/rep/dashboard", title: "Dashboard", body: "Your day starts here with personal KPIs and follow-up priorities." },
    { href: "/rep/opportunities", title: "My Admissions", body: "Manage your admissions pipeline and next actions." },
    { href: "/rep/communications", title: "Communications", body: "Log your outreach so leadership can see activity quality and cadence." },
    { href: "/rep/inquiry", title: "Referral Intake", body: "Submit referral details and keep cases moving through review." },
    { href: "/user-guide", title: "User Guide", body: "Open role-specific instructions whenever you need process guidance." },
  ],
  ACCOUNT: [
    { href: "/account/dashboard", title: "Dashboard", body: "View engagement summary and referral outcomes at a glance." },
    { href: "/account/engagements", title: "Engagements", body: "Track interactions and updates with your Destiny Springs team." },
    { href: "/user-guide", title: "User Guide", body: "Use this guide for onboarding and feature reference." },
  ],
};

function tourIdForHref(href: string) {
  return `tour-${href.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase()}`;
}

export default function OnboardingWalkthrough({ role }: OnboardingWalkthroughProps) {
  const router = useRouter();
  const pathname = usePathname();
  const steps = useMemo(() => STEPS[role], [role]);

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [completedRoles, setCompletedRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/preferences")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ preferences?: unknown }>;
      })
      .then((data) => {
        if (!active) return;
        const prefs = data?.preferences;
        if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return;
        const onboarding = (prefs as Record<string, unknown>).onboarding;
        if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) return;
        const completed = (onboarding as Record<string, unknown>).walkthroughCompletedRoles;
        if (!Array.isArray(completed)) return;
        const next = new Set(
          completed
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.toUpperCase()),
        );
        setCompletedRoles(next);
      })
      .catch(() => {
        // non-fatal
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const start = (event: Event) => {
      const custom = event as CustomEvent<{ role?: string; force?: boolean }>;
      const requestedRole = custom.detail?.role?.toUpperCase();
      if (requestedRole && requestedRole !== role) return;
      // Only block auto-start for already-completed tours; manual button always restarts
      if (!custom.detail?.force && completedRoles.has(role)) return;
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener("nyx:start-walkthrough", start as EventListener);
    return () => {
      window.removeEventListener("nyx:start-walkthrough", start as EventListener);
    };
  }, [completedRoles, role]);

  useEffect(() => {
    if (!open) return;
    const step = steps[stepIndex];
    if (!step) return;

    const updateRect = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour-id="${tourIdForHref(step.href)}"]`);
      if (!target) {
        setTargetRect(null);
        return;
      }
      setTargetRect(target.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, pathname, stepIndex, steps]);

  const step = steps[stepIndex];
  if (!open || !step) return null;

  const finish = async () => {
    setOpen(false);
    try {
      const prefRes = await fetch("/api/preferences");
      const prefBody = prefRes.ok
        ? await prefRes.json() as { preferences?: unknown }
        : { preferences: null };

      const root = prefBody.preferences && typeof prefBody.preferences === "object" && !Array.isArray(prefBody.preferences)
        ? prefBody.preferences as Record<string, unknown>
        : {};
      const onboarding = root.onboarding && typeof root.onboarding === "object" && !Array.isArray(root.onboarding)
        ? root.onboarding as Record<string, unknown>
        : {};
      const existing = Array.isArray(onboarding.walkthroughCompletedRoles)
        ? onboarding.walkthroughCompletedRoles.filter((item): item is string => typeof item === "string").map((item) => item.toUpperCase())
        : [];
      const next = Array.from(new Set([...existing, role]));
      const welcomeSeenRoles = Array.isArray(onboarding.welcomeSeenRoles)
        ? onboarding.welcomeSeenRoles
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.toUpperCase())
        : [];

      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            onboarding: {
              welcomeSeenRoles,
              walkthroughCompletedRoles: next,
            },
          },
        }),
      });
      setCompletedRoles(new Set(next));
    } catch {
      // non-fatal
    }
  };

  const nextStep = () => {
    if (stepIndex >= steps.length - 1) {
      void finish();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const panelTop = targetRect ? Math.max(20, targetRect.top - 8) : 80;
  const panelLeft = targetRect ? Math.min(viewportWidth - 370, targetRect.right + 14) : 280;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 220,
        }}
      />
      {targetRect && (
        <div
          style={{
            position: "fixed",
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            border: "2px solid var(--nyx-accent)",
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            zIndex: 221,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          left: panelLeft,
          top: panelTop,
          width: 350,
          maxWidth: "calc(100vw - 20px)",
          background: "var(--nyx-card)",
          border: "1px solid var(--nyx-accent-mid)",
          borderRadius: 12,
          padding: "14px 14px 12px",
          zIndex: 222,
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Guided Walkthrough · Step {stepIndex + 1} of {steps.length}
        </div>
        <div style={{ fontSize: "0.96rem", fontWeight: 800, color: "var(--nyx-text)", marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: "0.82rem", color: "var(--nyx-text-muted)", lineHeight: 1.55, marginBottom: 12 }}>{step.body}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push(step.href)}
            style={{
              border: "1px solid var(--nyx-accent-mid)",
              background: "rgba(201,168,76,0.12)",
              color: "var(--nyx-text)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            Open this feature
          </button>
          <button
            onClick={nextStep}
            style={{
              border: "none",
              background: "var(--nyx-accent)",
              color: "#111",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "0.8rem",
            }}
          >
            {stepIndex >= steps.length - 1 ? "Finish" : "Next"}
          </button>
          <button
            onClick={() => setOpen(false)}
            style={{
              border: "1px solid var(--nyx-border)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--nyx-text-muted)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </>
  );
}
