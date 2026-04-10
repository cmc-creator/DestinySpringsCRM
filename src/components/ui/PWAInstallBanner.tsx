"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user dismissed within the last 7 days
    const snooze = localStorage.getItem("pwa-install-snooze");
    if (snooze && Date.now() - Number(snooze) < 7 * 24 * 60 * 60 * 1000) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    function handler(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-install-snooze", String(Date.now()));
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    else dismiss();
  }

  if (!show || dismissed) return null;

  return (
    <div
      role="banner"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(135deg, #0f1422 0%, #1a1a2e 100%)",
        borderTop: "1px solid rgba(201,168,76,0.35)",
        padding: "14px 16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Icon */}
      <img
        src="/Aegislogo.png"
        alt="App icon"
        width={48}
        height={48}
        style={{ borderRadius: 12, flexShrink: 0, border: "1px solid rgba(201,168,76,0.3)" }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: "#e8e8e8", fontSize: "0.9rem" }}>
          Add Destiny Springs to your home screen
        </p>
        {isIOS ? (
          <p style={{ margin: "5px 0 0", fontSize: "0.78rem", color: "#a0a0b0", lineHeight: 1.45 }}>
            Tap the <strong style={{ color: "#C9A84C" }}>Share</strong> button then{" "}
            <strong style={{ color: "#C9A84C" }}>Add to Home Screen</strong> for the best experience.
          </p>
        ) : (
          <p style={{ margin: "5px 0 0", fontSize: "0.78rem", color: "#a0a0b0", lineHeight: 1.45 }}>
            Install the app for faster access and a full-screen experience.
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {!isIOS && (
          <button
            onClick={install}
            style={{
              background: "linear-gradient(135deg, #c9a84c, #a87c2a)",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#0a0f1a",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "7px 16px",
            color: "#888",
            fontSize: "0.78rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
