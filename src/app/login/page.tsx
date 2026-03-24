"use client";
import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":  return "/admin/dashboard";
    case "REP":    return "/rep/dashboard";
    case "ACCOUNT":return "/account/dashboard";
    default:       return null;
  }
}

function getSafeCallbackUrl(callbackUrl: string | null): string | null {
  if (!callbackUrl || !callbackUrl.startsWith("/")) return null;
  if (callbackUrl.startsWith("//"))     return null;
  if (callbackUrl.startsWith("/login")) return null;
  return callbackUrl;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const isDev = process.env.NODE_ENV !== "production";

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
        setError("Signed in but could not determine your destination.");
        return;
      }
      const cb = getSafeCallbackUrl(searchParams.get("callbackUrl"));
      router.push(cb ?? home);
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .lp-wrap {
          min-height: 100dvh;
          width: 100%;
          background: var(--nyx-bg, #100805);
          padding: 48px 16px 64px;
          box-sizing: border-box;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .lp-card {
          max-width: 420px;
          width: 100%;
          margin: 0 auto;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.13));
          border-radius: 16px;
          padding: 36px 32px 28px;
          box-sizing: border-box;
        }
        .lp-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .lp-logo-name {
          font-weight: 900;
          font-size: 1.05rem;
          color: #ede4cf;
        }
        .lp-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #ede4cf;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .lp-sub {
          font-size: 0.875rem;
          color: rgba(237,228,207,0.5);
          margin: 0 0 28px;
        }
        .lp-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 8px;
          padding: 11px 14px;
          margin-bottom: 18px;
          font-size: 0.875rem;
          color: #f87171;
        }
        .lp-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--nyx-accent-label, rgba(201,168,76,0.60));
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .lp-input {
          display: block;
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--nyx-accent-mid, rgba(201,168,76,0.15));
          border-radius: 8px;
          padding: 13px 15px;
          color: #ede4cf;
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 16px;
          -webkit-appearance: none;
          appearance: none;
        }
        .lp-input:focus {
          border-color: var(--nyx-accent, #C9A84C);
          box-shadow: 0 0 0 2px var(--nyx-accent-glow, rgba(201,168,76,0.22));
        }
        .lp-btn {
          display: block;
          width: 100%;
          background: var(--nyx-accent, #C9A84C);
          color: var(--nyx-bg, #100805);
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          margin-top: 4px;
          -webkit-appearance: none;
        }
        .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-signup {
          margin-top: 22px;
          text-align: center;
          font-size: 0.85rem;
          color: rgba(237,228,207,0.45);
        }
        .lp-signup a {
          color: var(--nyx-accent, #C9A84C);
          text-decoration: none;
          font-weight: 600;
        }
        .lp-demo {
          margin-top: 28px;
          padding: 14px;
          background: var(--nyx-accent-dim, rgba(201,168,76,0.08));
          border-radius: 8px;
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.10));
        }
        .lp-demo-hdr {
          font-size: 0.68rem;
          color: rgba(237,228,207,0.3);
          text-align: center;
          margin: 0 0 10px;
          letter-spacing: 0.08em;
        }
        .lp-demo-btn {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          padding: 8px 4px;
          line-height: 1.5;
        }
        .lp-demo-role { font-size: 0.75rem; color: var(--nyx-accent, #C9A84C); font-weight: 700; opacity: 0.7; }
        .lp-demo-addr { font-size: 0.75rem; color: rgba(237,228,207,0.45); margin-left: 6px; }
        .lp-terms {
          margin-top: 20px;
          text-align: center;
          font-size: 0.72rem;
          color: rgba(237,228,207,0.22);
        }
        .lp-terms a { color: inherit; }
        @media (max-width: 480px) {
          .lp-wrap { padding: 24px 12px 48px; }
          .lp-card { padding: 28px 18px 22px; border-radius: 12px; }
          .lp-title { font-size: 1.5rem; }
        }
      `}</style>

      <div className="lp-wrap">
        <div className="lp-card">
          <div className="lp-logo">
            <Image src="/Aegislogo.png" alt="Destiny Springs" width={32} height={32} style={{ objectFit: "contain" }} />
            <span className="lp-logo-name">Destiny Springs</span>
          </div>

          <h1 className="lp-title">Welcome back</h1>
          <p className="lp-sub">Sign in to your account</p>

          {error && <div className="lp-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label className="lp-label" htmlFor="lp-email">Email Address</label>
            <input
              id="lp-email"
              className="lp-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@facility.com"
            />

            <label className="lp-label" htmlFor="lp-password">Password</label>
            <input
              id="lp-password"
              className="lp-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            <button className="lp-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="lp-signup">
            Don&apos;t have an account?{" "}
            <Link href="/signup">Request Access</Link>
          </div>

          {isDev && (
            <div className="lp-demo">
              <p className="lp-demo-hdr">DEMO CREDENTIALS (Dev Only)</p>
              {[
                { role: "Admin",    email: "admin@destinysprings.com",  pw: "admin123!" },
                { role: "Liaison",  email: "sarah@destinysprings.com",  pw: "rep123!" },
                { role: "Facility", email: "socialwork@valleywise.org", pw: "account123!" },
              ].map(d => (
                <button
                  key={d.role}
                  type="button"
                  className="lp-demo-btn"
                  onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                >
                  <span className="lp-demo-role">{d.role}:</span>
                  <span className="lp-demo-addr">{d.email}</span>
                </button>
              ))}
            </div>
          )}

          <div className="lp-terms">
            <Link href="/terms">Terms</Link> &middot; <Link href="/privacy">Privacy</Link> &middot; &copy; 2026 Destiny Springs Healthcare
          </div>
        </div>
      </div>
    </>
  );
}
