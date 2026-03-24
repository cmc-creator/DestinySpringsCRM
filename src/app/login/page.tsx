"use client";
import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "REP":
      return "/rep/dashboard";
    case "ACCOUNT":
      return "/account/dashboard";
    default:
      return null;
  }
}

function getSafeCallbackUrl(callbackUrl: string | null): string | null {
  if (!callbackUrl || !callbackUrl.startsWith("/")) return null;
  if (callbackUrl.startsWith("//")) return null;
  if (callbackUrl.startsWith("/login")) return null;
  return callbackUrl;
}

const CYAN = "var(--nyx-accent)";
const BG = "var(--nyx-bg)";
const isDev = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(`Sign-in failed: ${urlError}`);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Authentication failed. Please check your credentials.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role as string | undefined;
      const home = getRoleHome(role);
      if (!home) {
        setError("Sign-in completed but we could not determine your destination.");
        return;
      }

      const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
      router.push(callbackUrl ?? home);
      router.refresh();
    } catch {
      setError("Unexpected sign-in error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: BG,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      className="login-container"
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          width: "100%",
          minHeight: "100dvh",
        }}
        className="login-form-panel"
      >
        <div className="login-slide-in login-form-card" style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18 }}>
            <Image src="/Aegislogo.png" alt="Destiny Springs" width={34} height={34} style={{ objectFit: "contain" }} />
            <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "#d8e8f4" }}>Destiny Springs</span>
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#d8e8f4", marginBottom: 8, letterSpacing: "-0.02em" }}>Welcome back</h2>
          <p style={{ color: "rgba(216,232,244,0.5)", marginBottom: 32, fontSize: "0.9rem" }}>Sign in to Destiny Springs CRM</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: "0.875rem", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@hospital.com"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 8, padding: "12px 16px", color: "#d8e8f4", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 8, padding: "12px 16px", color: "#d8e8f4", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? "var(--nyx-accent-label)" : CYAN, color: BG, padding: "13px", borderRadius: 8, fontWeight: 800, fontSize: "0.95rem", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.85rem", color: "rgba(216,232,244,0.45)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: CYAN, textDecoration: "none", fontWeight: 600 }}>Request Access</Link>
          </div>

          {isDev && (
            <div style={{ marginTop: 40, padding: "16px", background: "var(--nyx-accent-dim)", borderRadius: 8, border: "1px solid var(--nyx-accent-dim)" }}>
              <p style={{ fontSize: "0.7rem", color: "rgba(216,232,244,0.35)", textAlign: "center", marginBottom: 8 }}>DEMO CREDENTIALS (Local/Dev Only)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { role: "Admin", email: "admin@destinysprings.com", pw: "admin123!" },
                  { role: "Liaison", email: "sarah@destinysprings.com", pw: "rep123!" },
                  { role: "Facility", email: "socialwork@valleywise.org", pw: "account123!" },
                ].map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.pw);
                    }}
                    className="login-demo-button"
                    style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: "4px 0" }}
                  >
                    <span style={{ fontSize: "0.75rem", color: CYAN, opacity: 0.6, fontWeight: 600 }}>{d.role}:</span>
                    <span style={{ fontSize: "0.75rem", color: "rgba(216,232,244,0.45)", marginLeft: 6 }}>{d.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p style={{ marginTop: 24, textAlign: "center", fontSize: "0.75rem", color: "rgba(216,232,244,0.25)" }}>
            <Link href="/terms" style={{ color: "inherit" }}>Terms</Link> · <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link> · © 2026 Destiny Springs Healthcare
          </p>
        </div>
      </div>

      <style>{`
        .login-form-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--nyx-accent-dim);
          border-radius: 14px;
          padding: 20px 16px;
        }

        @media (max-width: 560px) {
          .login-form-panel {
            padding: 12px 12px !important;
            padding-top: 20px !important;
          }
          .login-form-card {
            padding: 16px 14px;
            border-radius: 12px;
            max-height: none;
            overflow: visible;
          }
          .login-form-card h2 {
            font-size: 1.6rem !important;
            line-height: 1.2;
            margin-bottom: 6px !important;
          }
          .login-form-card p {
            line-height: 1.5;
            margin-bottom: 20px !important;
            font-size: 0.88rem !important;
          }
          .login-form-card form {
            gap: 14px !important;
          }
          .login-form-card input {
            min-height: 48px !important;
            font-size: 16px !important;
            padding: 14px 16px !important;
            border-radius: 8px !important;
          }
          .login-form-card input::placeholder {
            font-size: 0.9rem;
          }
          .login-form-card button[type="submit"] {
            min-height: 48px !important;
            font-size: 0.95rem !important;
            border-radius: 8px !important;
            padding: 14px 16px !important;
            margin-top: 8px !important;
          }
          .login-form-card label {
            font-size: 0.7rem !important;
            margin-bottom: 6px !important;
          }
          .login-form-card > div:last-of-type {
            margin-top: 16px !important;
          }
          .login-demo-button {
            padding: 10px 12px !important;
            margin-bottom: 8px !important;
            display: block !important;
            width: 100% !important;
            text-align: left !important;
            min-height: 44px !important;
            line-height: 1.5 !important;
            font-size: 0.8rem !important;
          }
        }

        @media (max-width: 380px) {
          .login-form-card {
            padding: 12px 10px;
          }
          .login-form-card h2 {
            font-size: 1.4rem !important;
          }
          .login-form-card input,
          .login-form-card button {
            min-height: 44px !important;
            border-radius: 6px !important;
          }
        }
      `}</style>
    </div>
  );
}
