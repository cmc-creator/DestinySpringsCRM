"use client";
import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

function PasswordStrength({ password }: { password: string }) {
  const length = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum   = /\d/.test(password);
  const hasSpec  = /[^A-Za-z0-9]/.test(password);

  const score = (length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);

  if (!password) return null;

  const label  = score <= 2 ? "Weak" : score <= 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  const color  = score <= 2 ? "#f87171" : score <= 3 ? "#fb923c" : score === 4 ? GOLD : "#4ade80";

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? color : "rgba(255,255,255,0.1)", transition: "background 0.2s" }} />
        ))}
      </div>
      <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color }}>{label}</p>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Missing or invalid reset token. Please use the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, password, confirm, router]);

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
        <p style={{ color: MUTED, fontSize: "0.88rem", marginBottom: 20 }}>
          Invalid or missing reset link. Please request a new one.
        </p>
        <Link href="/forgot-password" style={{ color: GOLD, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
          Request new link →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.2rem", marginBottom: 14 }}>✅</div>
        <h2 style={{ color: TEXT, fontWeight: 700, fontSize: "1.1rem", margin: "0 0 10px" }}>
          Password updated!
        </h2>
        <p style={{ color: MUTED, fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 22 }}>
          Your password has been changed. Redirecting you to sign in…
        </p>
        <Link href="/login" style={{ color: GOLD, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
          Sign in now →
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 style={{ color: TEXT, fontWeight: 700, fontSize: "1.15rem", textAlign: "center", margin: "0 0 8px" }}>
        Choose a new password
      </h1>
      <p style={{ color: MUTED, fontSize: "0.84rem", textAlign: "center", margin: "0 0 24px" }}>
        Must be at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.74rem", color: MUTED, letterSpacing: 0.5, marginBottom: 6 }}>
            NEW PASSWORD
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              autoFocus
              style={{ ...inp, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "0.85rem" }}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.74rem", color: MUTED, letterSpacing: 0.5, marginBottom: 6 }}>
            CONFIRM PASSWORD
          </label>
          <input
            type={showPwd ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            required
            style={{
              ...inp,
              borderColor: confirm && confirm !== password ? "rgba(248,113,113,0.5)" : BORDER,
            }}
          />
          {confirm && confirm !== password && (
            <p style={{ color: "#f87171", fontSize: "0.72rem", margin: "4px 0 0" }}>Passwords do not match</p>
          )}
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "0.82rem", margin: 0, textAlign: "center" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password || !confirm || password !== confirm}
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
            opacity: loading || !password || !confirm || password !== confirm ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <style>{`
        html, body { overflow: auto !important; height: auto !important; min-height: 100% !important; }
        .rp-wrap {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background:
            radial-gradient(700px 300px at 80% 0%, rgba(201,168,76,0.12), transparent 70%),
            var(--nyx-bg, #100805);
        }
        .rp-card {
          width: 100%;
          max-width: 420px;
          background: ${CARD_BG};
          border: 1px solid ${BORDER};
          border-radius: 18px;
          padding: 36px 32px 30px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        }
        @media (max-width: 480px) {
          .rp-card { padding: 28px 20px 24px; border-radius: 14px; }
        }
      `}</style>

      <div className="rp-wrap">
        <div className="rp-card">
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: GOLD, letterSpacing: 2, lineHeight: 1.1 }}>
              DESTINY SPRINGS
            </div>
            <div style={{ fontSize: "0.7rem", color: MUTED, letterSpacing: 3, marginTop: 3 }}>
              HEALTHCARE CRM
            </div>
          </div>

          <Suspense fallback={<p style={{ color: MUTED, textAlign: "center", fontSize: "0.85rem" }}>Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>

          <div style={{ textAlign: "center", marginTop: 22 }}>
            <Link href="/login" style={{ color: GOLD, fontSize: "0.82rem", textDecoration: "none", opacity: 0.8 }}>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
