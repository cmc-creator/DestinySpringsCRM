"use client";
import { useState } from "react";
import Link from "next/link";

const GOLD = "#c9a84c";
const TEXT = "#ede4cf";
const MUTED = "rgba(237,228,207,0.55)";
const BORDER = "rgba(201,168,76,0.18)";
const INPUT_BG = "rgba(255,255,255,0.05)";
const CARD_BG = "rgba(255,255,255,0.035)";

const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "11px 14px",
  color: TEXT,
  fontSize: "0.92rem",
  outline: "none",
};

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        html, body { overflow: auto !important; height: auto !important; min-height: 100% !important; }
        .fp-wrap {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background:
            radial-gradient(700px 300px at 20% 0%, rgba(201,168,76,0.14), transparent 70%),
            var(--nyx-bg, #100805);
        }
        .fp-card {
          width: 100%;
          max-width: 420px;
          background: ${CARD_BG};
          border: 1px solid ${BORDER};
          border-radius: 18px;
          padding: 36px 32px 30px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        }
        @media (max-width: 480px) {
          .fp-card { padding: 28px 20px 24px; border-radius: 14px; }
        }
      `}</style>

      <div className="fp-wrap">
        <div className="fp-card">
          {/* Logo / brand */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: GOLD, letterSpacing: 2, lineHeight: 1.1 }}>
              DESTINY SPRINGS
            </div>
            <div style={{ fontSize: "0.7rem", color: MUTED, letterSpacing: 3, marginTop: 3 }}>
              HEALTHCARE CRM
            </div>
          </div>

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.2rem", marginBottom: 14 }}>📬</div>
              <h2 style={{ color: TEXT, fontWeight: 700, fontSize: "1.1rem", margin: "0 0 10px" }}>
                Check your inbox
              </h2>
              <p style={{ color: MUTED, fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 24px" }}>
                If <strong style={{ color: TEXT }}>{email}</strong> is registered, you&apos;ll receive a password reset link shortly. The link expires in 1 hour.
              </p>
              <Link href="/login" style={{ color: GOLD, fontSize: "0.85rem", textDecoration: "none", fontWeight: 600 }}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ color: TEXT, fontWeight: 700, fontSize: "1.15rem", textAlign: "center", margin: "0 0 8px" }}>
                Reset your password
              </h1>
              <p style={{ color: MUTED, fontSize: "0.84rem", textAlign: "center", margin: "0 0 24px", lineHeight: 1.5 }}>
                Enter your email address and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", color: MUTED, letterSpacing: 0.5, marginBottom: 6 }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    style={inp}
                  />
                </div>

                {error && (
                  <p style={{ color: "#f87171", fontSize: "0.82rem", margin: 0, textAlign: "center" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: GOLD,
                    color: "#1a1208",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    letterSpacing: 0.5,
                    cursor: "pointer",
                    opacity: loading || !email.trim() ? 0.6 : 1,
                    marginTop: 4,
                  }}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: 22 }}>
                <Link href="/login" style={{ color: GOLD, fontSize: "0.82rem", textDecoration: "none", opacity: 0.8 }}>
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
