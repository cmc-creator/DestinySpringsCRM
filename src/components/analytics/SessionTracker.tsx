"use client";

/**
 * SessionTracker — lightweight, invisible component that:
 *  1. Creates a server-side UserSession record on first mount (per browser session).
 *  2. Posts a PageView whenever the Next.js pathname changes.
 *  3. Ends the session (records logoutAt + durationSecs) on page unload.
 *
 * Embed once in each authenticated layout (admin, rep, account).
 * The session ID is stored in sessionStorage so it survives same-tab navigation
 * but resets on a new tab / browser restart.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "nyx_session_id";

export default function SessionTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const initialized = useRef(false);

  // ── Init: create or restore session ─────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      sessionIdRef.current = existing;
      return;
    }

    // Create a new session on the server
    fetch("/api/sessions", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id: string } | null) => {
        if (data?.id) {
          sessionIdRef.current = data.id;
          sessionStorage.setItem(SESSION_KEY, data.id);
        }
      })
      .catch(() => {/* swallow — non-critical */});
  }, []);

  // ── Track page views on route change ────────────────────────────────────────
  useEffect(() => {
    const id = sessionIdRef.current;
    if (!id || !pathname) return;

    fetch("/api/sessions/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, path: pathname }),
    }).catch(() => {/* non-critical */});
  }, [pathname]);

  // ── End session on unload ────────────────────────────────────────────────────
  useEffect(() => {
    const end = () => {
      const id = sessionIdRef.current ?? sessionStorage.getItem(SESSION_KEY);
      if (!id) return;
      // Use sendBeacon so it survives page unload
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/sessions/${id}`, new Blob(
          [JSON.stringify({ end: true })],
          { type: "application/json" }
        ));
      }
      sessionStorage.removeItem(SESSION_KEY);
      sessionIdRef.current = null;
    };

    window.addEventListener("beforeunload", end);
    // Also catch tab hiding (mobile background)
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") end();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", end);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
