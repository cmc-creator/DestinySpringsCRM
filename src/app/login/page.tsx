"use client";
import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Fraunces, Manrope } from "next/font/google";

const headingFace = Fraunces({ subsets: ["latin"], weight: ["600", "700", "800"] });
const bodyFace = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

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
  const isRegistered = searchParams.get("registered") === "1";
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const isDev = process.env.NODE_ENV !== "production";

  function mapLoginError(errorCode: string) {
    if (errorCode === "RateLimit") {
      return "Too many sign-in attempts. Please wait a few minutes and try again.";
    }
    if (errorCode === "CredentialsSignin") {
      return "Sign-in failed. Check your email and password. If you recently signed up, your account may still be awaiting admin approval.";
    }
    if (errorCode === "AccessDenied") {
      return "Access denied. Your account may still be awaiting admin approval.";
    }
    if (errorCode === "OAuthNotLinked") {
      return "No CRM account is linked to that email address. Contact your admin to have your account created or linked.";
    }
    if (errorCode === "OAuthEmailReadFailed") {
      return "Could not read your email address from the provider. Please try again or sign in with email and password.";
    }
    if (errorCode === "SsoTokenMissing" || errorCode === "OAuthCallbackError" || errorCode === "OAuthSignin") {
      return "OAuth sign-in failed. Please try again or sign in with email and password.";
    }
    return `Sign-in failed. Please check your credentials or contact your admin.`;
  }

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(mapLoginError(urlError));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const result = await signIn("credentials", { email: normalizedEmail, password, redirect: false });
      if (result?.error) {
        setError(mapLoginError(result.error));
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
        /* Unlock html/body on the login page to keep scrolling reliable on mobile Safari. */
        html, body {
          overflow: auto !important;
          height: auto !important;
          min-height: 100% !important;
          background-attachment: scroll !important;
          overscroll-behavior-y: auto !important;
        }
        .lp-wrap {
          min-height: 100dvh;
          width: 100%;
          background:
            radial-gradient(900px 360px at 15% 0%, rgba(201,168,76,0.18), transparent 70%),
            radial-gradient(700px 340px at 88% 5%, rgba(255,255,255,0.06), transparent 68%),
            var(--nyx-bg, #100805);
          padding: max(24px, calc(20px + env(safe-area-inset-top))) 16px max(36px, calc(28px + env(safe-area-inset-bottom)));
          box-sizing: border-box;
        }
        .lp-shell {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.06fr 0.94fr;
          gap: 18px;
          align-items: stretch;
        }
        .lp-brand {
          border-radius: 22px;
          padding: 34px 34px 30px;
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.14));
          background: linear-gradient(156deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          box-shadow: 0 20px 44px rgba(0,0,0,0.36);
        }
        .lp-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          color: rgba(237,228,207,0.86);
          background: rgba(201,168,76,0.13);
          border: 1px solid rgba(201,168,76,0.35);
          border-radius: 999px;
          padding: 6px 12px;
          margin-bottom: 15px;
        }
        .lp-brand-title {
          margin: 0;
          font-size: clamp(2rem, 3.8vw, 3.25rem);
          line-height: 1.05;
          letter-spacing: -0.01em;
          color: #f5e7be;
        }
        .lp-brand-sub {
          margin: 14px 0 0;
          font-size: 0.98rem;
          line-height: 1.72;
          max-width: 46ch;
          color: rgba(237,228,207,0.64);
        }
        .lp-brand-grid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .lp-brand-item {
          border-radius: 12px;
          border: 1px solid rgba(201,168,76,0.19);
          background: rgba(0,0,0,0.22);
          padding: 12px;
        }
        .lp-brand-item-title {
          margin: 0;
          font-size: 0.83rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--nyx-accent, #c9a84c);
          font-weight: 800;
        }
        .lp-brand-item-sub {
          margin: 5px 0 0;
          font-size: 0.84rem;
          color: rgba(237,228,207,0.62);
          line-height: 1.42;
        }
        .lp-card {
          width: 100%;
          border-radius: 22px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.13));
          box-shadow: 0 20px 44px rgba(0,0,0,0.36);
          padding: 30px 28px 24px;
          box-sizing: border-box;
          align-self: start;
          overflow: hidden;
        }
        .lp-logo {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          margin-bottom: 24px;
        }
        .lp-logo-name {
          font-weight: 900;
          font-size: 1rem;
          color: #ede4cf;
        }
        .lp-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ede4cf;
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }
        .lp-sub {
          font-size: 0.88rem;
          color: rgba(237,228,207,0.5);
          margin: 0 0 24px;
        }
        .lp-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 8px;
          padding: 11px 14px;
          margin-bottom: 16px;
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
          min-height: 44px;
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
          margin-top: 6px;
          min-height: 46px;
          -webkit-appearance: none;
        }
        .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-sso-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: rgba(255,255,255,0.05);
          color: #ede4cf;
          border: 1px solid rgba(201,168,76,0.18);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 46px;
          -webkit-appearance: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .lp-sso-btn:hover:not(:disabled) { background: rgba(255,255,255,0.09); border-color: rgba(201,168,76,0.3); }
        .lp-sso-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lp-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 18px 0;
          font-size: 0.72rem;
          color: rgba(237,228,207,0.3);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .lp-divider::before, .lp-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(201,168,76,0.15);
        }
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
          min-height: 44px;
          line-height: 1.5;
        }
        .lp-demo-role { font-size: 0.75rem; color: var(--nyx-accent, #C9A84C); font-weight: 700; opacity: 0.7; }
        .lp-demo-addr { font-size: 0.75rem; color: rgba(237,228,207,0.45); margin-left: 6px; }
        .lp-terms {
          margin-top: 20px;
          text-align: left;
          font-size: 0.72rem;
          color: rgba(237,228,207,0.22);
        }
        .lp-terms a { color: inherit; }
        @media (max-width: 1200px) {
          .lp-shell {
            grid-template-columns: 1fr 1fr;
          }
          .lp-brand {
            padding: 26px 24px 22px;
          }
          .lp-card {
            padding: 24px 22px 20px;
          }
        }
        @media (max-width: 920px) {
          .lp-shell { grid-template-columns: 1fr; }
          .lp-brand { display: none; }
          .lp-card { max-width: 470px; margin: 0 auto; border-radius: 16px; }
        }
        @media (max-width: 480px) {
          .lp-wrap { padding: 20px 12px 42px; }
          .lp-card { padding: 24px 16px 20px; border-radius: 12px; }
          .lp-title { font-size: 1.5rem; }
          .lp-logo { justify-content: center; }
          .lp-input,
          .lp-btn,
          .lp-demo-btn {
            font-size: 16px;
          }
          .lp-sub,
          .lp-signup,
          .lp-terms { text-align: center; }
        }
        @media (max-width: 380px) {
          .lp-wrap { padding: 16px 10px 32px; }
          .lp-card { padding: 20px 12px 16px; }
          .lp-title { font-size: 1.35rem; }
          .lp-sub { font-size: 0.82rem; margin-bottom: 18px; }
        }
      `}</style>

      <div className={`${bodyFace.className} lp-wrap`}>
        <div className="lp-shell">
          <section className="lp-brand" aria-hidden="true">
            <div className="lp-chip">Bespoke Whitelabel Deployment</div>
            <h1 className={`${headingFace.className} lp-brand-title`}>Destiny Springs CRM</h1>
            <p className="lp-brand-sub">
              This is the dedicated Destiny Springs instance of NyxAegis, crafted for higher referral velocity,
              cleaner account coordination, and stronger rep execution quality.
            </p>
            <div className="lp-brand-grid">
              <div className="lp-brand-item">
                <p className="lp-brand-item-title">Referral Pipeline Visibility</p>
                <p className="lp-brand-item-sub">Track every open, admitted, discharged, and declined opportunity in one place.</p>
              </div>
              <div className="lp-brand-item">
                <p className="lp-brand-item-title">Role-Specific Portals</p>
                <p className="lp-brand-item-sub">Admin, rep, and facility experiences stay focused on the right operational tasks.</p>
              </div>
              <div className="lp-brand-item">
                <p className="lp-brand-item-title">Enterprise Security Baseline</p>
                <p className="lp-brand-item-sub">Credential-based access with role controls and production-safe endpoints.</p>
              </div>
            </div>
          </section>

          <div className="lp-card">
          <div className="lp-logo">
            <Image src="/Aegislogo.png" alt="NyxAegis for Destiny Springs" width={32} height={32} style={{ objectFit: "contain" }} />
            <span className="lp-logo-name">NyxAegis for Destiny Springs</span>
          </div>

          <h1 className={`${headingFace.className} lp-title`}>Welcome back</h1>
          <p className="lp-sub">Sign in to your account</p>

          {isRegistered && (
            <div className="lp-demo" style={{ marginTop: 0, marginBottom: 14 }}>
              <p className="lp-demo-hdr" style={{ marginBottom: 6 }}>ACCOUNT CREATED</p>
              <div style={{ fontSize: "0.84rem", color: "rgba(237,228,207,0.72)", textAlign: "center" }}>
                Start here: <Link href="/user-guide" style={{ color: "var(--nyx-accent, #C9A84C)", fontWeight: 700 }}>Open User Guide</Link>
              </div>
            </div>
          )}

          {error && <div className="lp-error">{error}</div>}

          {/* SSO buttons — shown when providers are configured */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 }}>
            <button
              type="button"
              className="lp-sso-btn"
              onClick={() => { window.location.href = "/api/integrations/oauth/microsoft?mode=login"; }}
            >
              <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </button>
            <button
              type="button"
              className="lp-sso-btn"
              onClick={() => { window.location.href = "/api/integrations/oauth/google?mode=login"; }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="lp-divider">or sign in with email</div>

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

          <div className="lp-signup" style={{ marginTop: 14 }}>
            <Link href="/forgot-password" style={{ color: "var(--nyx-accent, #C9A84C)", opacity: 0.8, textDecoration: "none", fontSize: "0.82rem" }}>
              Forgot your password?
            </Link>
          </div>

          <div className="lp-signup">
            Don&apos;t have an account?{" "}
            <Link href="/signup">Sign Up</Link>
          </div>

          <div className="lp-signup" style={{ marginTop: 8 }}>
            Need onboarding help? <Link href="/user-guide">View User Guide</Link>
          </div>

          <div className="lp-signup" style={{ marginTop: 8 }}>
            Support: <a href="mailto:info@nyxcollectivellc.com?subject=Destiny%20Springs%20Support" style={{ color: "var(--nyx-accent, #C9A84C)", textDecoration: "none", fontWeight: 700 }}>info@nyxcollectivellc.com</a>
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
            <Link href="/terms">Terms</Link> &middot; <Link href="/privacy">Privacy</Link> &middot; NyxAegis &trade; by NyxCollective LLC &trade; &middot; &copy; 2026 NyxCollective LLC &middot; <a href="https://www.nyxcollectivellc.com/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Explore more solutions</a>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
