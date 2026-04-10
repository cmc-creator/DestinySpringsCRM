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
  const [isAndroidFallback, setIsAndroidFallback] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user dismissed within the last 7 days
    const snooze = localStorage.getItem("pwa-install-snooze");
    if (snooze && Date.now() - Number(snooze) < 7 * 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Listen for Chrome's native install prompt (Android Chrome / desktop Chrome)
    let nativePromptFired = false;
    function handler(e: Event) {
      e.preventDefault();
      nativePromptFired = true;
      setPrompt(e as BeforeInstallPromptEvent);
      setIsAndroidFallback(false);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", handler);

    // Fallback for Android browsers where beforeinstallprompt doesn't fire
    // (Samsung Internet, Firefox, etc.) - show manual instructions after 2s
    const isMobile = /android|mobile/i.test(ua) || window.innerWidth < 768;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (isMobile) {
      fallbackTimer = setTimeout(() => {
        if (!nativePromptFired) {
          setIsAndroidFallback(true);
          setShow(true);
        }
      }, 2000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
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

  const instructionText = isIOS
    ? <>Tap the <strong style={{ color: "#C9A84C" }}>Share</strong> button then <strong style={{ color: "#C9A84C" }}>Add to Home Screen</strong> for the best experience.</>
    : isAndroidFallback
    ? <>Tap your browser&apos;s <strong style={{ color: "#C9A84C" }}>menu (&#8942;)</strong> then <strong style={{ color: "#C9A84C" }}>Add to Home Screen</strong> or <strong style={{ color: "#C9A84C" }}>Install App</strong>.</>
    : <>Install the app for faster access and a full-screen experience.</>;

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
        <p style={{ margin: "5px 0 0", fontSize: "0.78rem", color: "#a0a0b0", lineHeight: 1.45 }}>
          {instructionText}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {!isIOS && !isAndroidFallback && (
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

