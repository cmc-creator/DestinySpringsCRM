"use client";
import { Suspense, useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "REP":     return "/rep/dashboard";
    case "ACCOUNT": return "/account/dashboard";
    default:        return null;
  }
}

const CYAN = "var(--nyx-accent)";
const BG = "var(--nyx-bg)";

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

  // Catch NextAuth redirect errors (e.g. /login?error=CredentialsSignin)
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
        setError(`Auth error: ${result.error}`);
      } else {
        // Get role from session to redirect to the correct portal
        const session = await getSession();
        const role = session?.user?.role as string | undefined;
        const home = getRoleHome(role);
        if (!home) {
          setError(`Sign-in completed but no session returned. role=${String(role)} session=${JSON.stringify(session)}`);
          return;
        }
        const callbackUrl = searchParams.get("callbackUrl");
        // Don't follow callbackUrl back to /login to avoid redirect loops
        const isSafeCallback = callbackUrl && !callbackUrl.startsWith("/login");
        const destination = isSafeCallback ? callbackUrl : home;
        router.push(destination);
        router.refresh();
      }
    } catch (err) {
      setError(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* LEFT PANEL */}
      <div style={{ flex: "0 0 45%", background: "var(--nyx-accent-dim)", borderRight: "1px solid var(--nyx-accent-dim)", padding: "60px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, var(--nyx-accent-dim) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 64 }}>
            <Image src="/Aegislogo.png" alt="NyxAegis" width={34} height={34} style={{ objectFit: "contain" }} />
            <span style={{ fontWeight: 900, fontSize: "1.2rem", color: "#d8e8f4" }}>NyxAegis</span>
          </div>
          <div className="login-fade-up">
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#d8e8f4", lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.02em" }}>
              BD<br />
              <span className="login-text-glow" style={{ color: CYAN }}>Command Center</span>
            </h1>
            <p style={{ color: "rgba(216,232,244,0.55)", fontSize: "1rem", lineHeight: 1.7, maxWidth: 320, marginBottom: 40 }}>
              Manage accounts, track your opportunity pipeline, and grow your BD business - all from one platform.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { icon: "�", text: "360° account management" },
                { icon: "📈", text: "Live opportunity pipeline tracking" },
                { icon: "📍", text: "Geographic territory management" },
                { icon: "🔒", text: "HIPAA compliance document storage" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.9rem", color: "rgba(216,232,244,0.7)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["HIPAA Ready", "SOC 2", "BD"].map((badge) => (
            <div key={badge} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 6, padding: "6px 12px", fontSize: "0.7rem", color: CYAN, fontWeight: 600, letterSpacing: "0.08em" }}>{badge}</div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
        <div className="login-slide-in" style={{ width: "100%", maxWidth: 400 }}>
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

          <div style={{ marginTop: 40, padding: "16px", background: "var(--nyx-accent-dim)", borderRadius: 8, border: "1px solid var(--nyx-accent-dim)" }}>
            <p style={{ fontSize: "0.7rem", color: "rgba(216,232,244,0.35)", textAlign: "center", marginBottom: 8 }}>DEMO CREDENTIALS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { role: "Admin", email: "admin@destinysprings.com", pw: "admin123!" },
                { role: "Liaison", email: "sarah@destinysprings.com", pw: "rep123!" },
                { role: "Facility", email: "socialwork@valleywise.org", pw: "account123!" },
              ].map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: "4px 0" }}
                >
                  <span style={{ fontSize: "0.75rem", color: CYAN, opacity: 0.6, fontWeight: 600 }}>{d.role}:</span>
                  <span style={{ fontSize: "0.75rem", color: "rgba(216,232,244,0.45)", marginLeft: 6 }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: "0.75rem", color: "rgba(216,232,244,0.25)" }}>
            <Link href="/terms" style={{ color: "inherit" }}>Terms</Link> · <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link> · © 2026 Destiny Springs Healthcare
          </p>
        </div>
      </div>
    </div>
  );
}
