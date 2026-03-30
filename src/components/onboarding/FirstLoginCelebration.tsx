"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "REP" | "ACCOUNT";

interface FirstLoginCelebrationProps {
  role: Role;
  userEmail?: string | null;
  userName?: string | null;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  rotate: number;
  color: string;
}

const COLORS = ["#c9a84c", "#e5d5b0", "#aeb2bb", "#f5efe2"];

function roleLabel(role: Role) {
  if (role === "ADMIN") return "Admin";
  if (role === "REP") return "Business Development";
  return "Account";
}

export default function FirstLoginCelebration({ role, userEmail: _userEmail, userName }: FirstLoginCelebrationProps) {
  const [open, setOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.5 + Math.random() * 2.4,
      size: 6 + Math.random() * 7,
      drift: -60 + Math.random() * 120,
      rotate: -220 + Math.random() * 440,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ shouldShowWelcome?: boolean }>;
      })
      .then((data) => {
        if (!active) return;
        if (data?.shouldShowWelcome) {
          void fetch("/api/onboarding", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markOnboarded: true }),
          }).catch(() => {
            // non-fatal
          });
          setOnboarded(true);
          const t = window.setTimeout(() => setOpen(true), 450);
          return () => window.clearTimeout(t);
        }
      })
      .catch(() => {
        // non-fatal: fail closed to avoid repeated onboarding on uncertain state
      });

    return () => {
      active = false;
    };
  }, []);

  const markWelcomeSeen = async () => {
    setOpen(false);
    if (onboarded) {
      return;
    }
    setOnboarded(true);
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markOnboarded: true }),
      });
    } catch {
      // non-fatal
    }
  };

  const startWalkthrough = async () => {
    await markWelcomeSeen();
    window.dispatchEvent(new CustomEvent("nyx:start-walkthrough", { detail: { role } }));
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes nyx-confetti-fall {
          0% {
            transform: translate3d(0, -16vh, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.95;
          }
          100% {
            transform: translate3d(0, 110vh, 0) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes nyx-pop {
          0% { transform: translateY(6px) scale(0.98); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,10,14,0.68)",
          backdropFilter: "blur(2px)",
          zIndex: 140,
          display: "grid",
          placeItems: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 16,
            border: "1px solid rgba(201,168,76,0.42)",
            background: "linear-gradient(155deg, rgba(22,14,7,0.98), rgba(10,10,14,0.98))",
            boxShadow: "0 28px 60px rgba(0,0,0,0.52)",
            padding: "24px 22px 20px",
            animation: "nyx-pop 0.22s ease-out",
            position: "relative",
            zIndex: 145,
          }}
        >
          <p style={{ margin: 0, fontSize: "0.72rem", letterSpacing: "0.11em", textTransform: "uppercase", color: "var(--nyx-accent-label)", fontWeight: 700 }}>
            Welcome to Destiny Springs CRM
          </p>
          <h2 style={{ margin: "10px 0 8px", color: "var(--nyx-text)", fontSize: "1.65rem", lineHeight: 1.2, fontWeight: 900 }}>
            Great to have you here{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h2>
          <p style={{ margin: "0 0 16px", color: "var(--nyx-text-muted)", lineHeight: 1.6, fontSize: "0.92rem" }}>
            Your {roleLabel(role)} workspace is ready. Start with the User Guide to learn the core workflow and shortcuts.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/user-guide"
              onClick={() => { void markWelcomeSeen(); }}
              style={{
                textDecoration: "none",
                background: "var(--nyx-accent)",
                color: "#100805",
                fontWeight: 800,
                borderRadius: 9,
                padding: "10px 16px",
                fontSize: "0.9rem",
              }}
            >
              Open User Guide
            </Link>
            <button
              onClick={() => { void startWalkthrough(); }}
              style={{
                border: "1px solid rgba(201,168,76,0.32)",
                background: "rgba(201,168,76,0.08)",
                color: "var(--nyx-text)",
                fontWeight: 700,
                borderRadius: 9,
                padding: "10px 16px",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Start Walkthrough
            </button>
            <button
              onClick={() => { void markWelcomeSeen(); }}
              style={{
                border: "1px solid rgba(201,168,76,0.32)",
                background: "rgba(255,255,255,0.03)",
                color: "var(--nyx-text)",
                fontWeight: 700,
                borderRadius: 9,
                padding: "10px 16px",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>

        <div style={{ position: "fixed", inset: 0, zIndex: 141, pointerEvents: "none", overflow: "hidden" }}>
          {pieces.map((piece) => (
            <span
              key={piece.id}
              style={{
                position: "absolute",
                left: `${piece.left}%`,
                top: "-12vh",
                width: `${piece.size}px`,
                height: `${Math.max(4, piece.size * 0.5)}px`,
                borderRadius: 2,
                background: piece.color,
                boxShadow: "0 0 10px rgba(255,255,255,0.18)",
                animation: `nyx-confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
                transform: `translate3d(${piece.drift}px, -16vh, 0) rotate(${piece.rotate}deg)`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
