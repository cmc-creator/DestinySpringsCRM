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
        // Show exact error code to help diagnose (CredentialsSignin = wrong pw, Configuration = setup issue)
        setError(`Sign-in failed (${result.error}). Please check your credentials or contact your admin.`);
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
            <Link href="/terms">Terms</Link> &middot; <Link href="/privacy">Privacy</Link> &middot; NyxAegis &trade; by NyxCollective LLC &trade; &middot; &copy; 2026 NyxCollective LLC &middot; <a href="https://www.nyxcollectivellc.com/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Explore more solutions</a>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
