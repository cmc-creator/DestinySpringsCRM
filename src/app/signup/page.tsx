"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Fraunces, Manrope } from "next/font/google";

const CYAN = "var(--nyx-accent)";
const headingFace = Fraunces({ subsets: ["latin"], weight: ["600", "700", "800"] });
const bodyFace = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"ACCOUNT" | "REP">("ACCOUNT");
  const [form, setForm] = useState({ name: "", email: "", password: "", hospitalName: "", repTitle: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Signup failed"); return; }
      router.push("/login?registered=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--nyx-accent-mid)",
    borderRadius: 9,
    padding: "13px 14px",
    minHeight: 44,
    color: "#d8e8f4",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 700 as const,
    color: "var(--nyx-accent-label)",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    marginBottom: 7,
  };

  return (
    <div className={`${bodyFace.className} su-wrap`}>
      <style>{`
        html, body {
          overflow: auto !important;
          height: auto !important;
          min-height: 100% !important;
          background-attachment: scroll !important;
        }
        .su-wrap {
          min-height: 100dvh;
          background:
            radial-gradient(900px 360px at 15% 0%, rgba(201,168,76,0.18), transparent 70%),
            radial-gradient(700px 340px at 88% 5%, rgba(255,255,255,0.06), transparent 68%),
            var(--nyx-bg, #100805);
          padding: max(24px, calc(20px + env(safe-area-inset-top))) 16px max(36px, calc(28px + env(safe-area-inset-bottom)));
          box-sizing: border-box;
        }
        .su-shell {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.04fr 0.96fr;
          gap: 18px;
        }
        .su-left {
          border-radius: 22px;
          padding: 32px 32px 28px;
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.14));
          background: linear-gradient(156deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          box-shadow: 0 20px 44px rgba(0,0,0,0.36);
        }
        .su-chip {
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
          margin-bottom: 14px;
        }
        .su-title {
          margin: 0;
          font-size: clamp(2rem, 3.8vw, 3.2rem);
          line-height: 1.06;
          letter-spacing: -0.01em;
          color: #f5e7be;
        }
        .su-sub {
          margin: 14px 0 0;
          font-size: 0.98rem;
          line-height: 1.68;
          max-width: 46ch;
          color: rgba(237,228,207,0.64);
        }
        .su-points {
          margin-top: 24px;
          display: grid;
          gap: 10px;
        }
        .su-point {
          border-radius: 12px;
          border: 1px solid rgba(201,168,76,0.19);
          background: rgba(0,0,0,0.22);
          padding: 12px;
        }
        .su-point-title {
          margin: 0;
          font-size: 0.83rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--nyx-accent, #c9a84c);
          font-weight: 800;
        }
        .su-point-sub {
          margin: 5px 0 0;
          font-size: 0.84rem;
          color: rgba(237,228,207,0.62);
          line-height: 1.42;
        }
        .su-card {
          border-radius: 22px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.13));
          box-shadow: 0 20px 44px rgba(0,0,0,0.36);
          padding: 30px 28px 24px;
          box-sizing: border-box;
          align-self: start;
          overflow: hidden;
        }
        .su-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 18px;
        }
        .su-brand-name {
          font-size: 1rem;
          font-weight: 900;
          color: #ede4cf;
        }
        .su-heading {
          margin: 0 0 4px;
          font-size: 2rem;
          color: #ede4cf;
          letter-spacing: -0.02em;
          font-weight: 700;
        }
        .su-heading-sub {
          margin: 0 0 20px;
          font-size: 0.88rem;
          color: rgba(237,228,207,0.5);
        }
        .su-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
          background: rgba(0,0,0,0.3);
          border-radius: 10px;
          padding: 4px;
        }
        .su-tab {
          flex: 1;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 800;
          font-size: 0.84rem;
          min-height: 42px;
          transition: all 0.2s ease;
        }
        .su-tab.active {
          background: var(--nyx-accent, #c9a84c);
          color: var(--nyx-bg, #100805);
        }
        .su-tab.inactive {
          background: transparent;
          color: rgba(216,232,244,0.55);
        }
        .su-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 14px;
          font-size: 0.875rem;
          color: #f87171;
        }
        .su-submit {
          background: var(--nyx-accent, #c9a84c);
          color: var(--nyx-bg, #100805);
          padding: 13px;
          border-radius: 9px;
          font-weight: 800;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          margin-top: 6px;
          min-height: 46px;
        }
        .su-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .su-login {
          margin-top: 18px;
          text-align: center;
          font-size: 0.85rem;
          color: rgba(216,232,244,0.45);
        }
        .su-login a {
          color: var(--nyx-accent, #c9a84c);
          text-decoration: none;
          font-weight: 700;
        }
        .su-legal {
          margin-top: 14px;
          text-align: center;
          font-size: 0.72rem;
          color: rgba(216,232,244,0.24);
          line-height: 1.5;
        }
        .su-legal a {
          color: inherit;
        }
        @media (max-width: 1200px) {
          .su-shell {
            grid-template-columns: 1fr 1fr;
          }
          .su-left {
            padding: 26px 24px 22px;
          }
          .su-card {
            padding: 24px 22px 20px;
          }
        }
        @media (max-width: 920px) {
          .su-shell {
            grid-template-columns: 1fr;
          }
          .su-left {
            display: none;
          }
          .su-card {
            max-width: 510px;
            margin: 0 auto;
            border-radius: 16px;
          }
        }
        @media (max-width: 480px) {
          .su-wrap {
            padding: 18px 12px 34px;
          }
          .su-card {
            padding: 22px 16px 18px;
            border-radius: 12px;
          }
          .su-brand {
            justify-content: center;
            display: flex;
          }
          .su-heading {
            font-size: 1.5rem;
            text-align: center;
          }
          .su-heading-sub {
            text-align: center;
            margin-bottom: 16px;
          }
          .su-tab {
            min-height: 44px;
          }
        }
        @media (max-width: 380px) {
          .su-wrap {
            padding: 14px 10px 28px;
          }
          .su-card {
            padding: 18px 12px 16px;
          }
          .su-heading {
            font-size: 1.35rem;
          }
        }
      `}</style>

      <div className="su-shell">
        <section className="su-left" aria-hidden="true">
          <div className="su-chip">Bespoke Whitelabel Deployment</div>
          <h1 className={`${headingFace.className} su-title`}>Submit a new access request</h1>
          <p className="su-sub">
            New team members can request secure portal access for facility accounts or business development workflows.
            Every request is routed through internal approval before activation.
          </p>
          <div className="su-points">
            <div className="su-point">
              <p className="su-point-title">Controlled onboarding</p>
              <p className="su-point-sub">Each request is tied to role scope so access is correct from day one.</p>
            </div>
            <div className="su-point">
              <p className="su-point-title">Role-specific routing</p>
              <p className="su-point-sub">Hospital and rep requests capture the right profile fields automatically.</p>
            </div>
            <div className="su-point">
              <p className="su-point-title">Client-ready presentation</p>
              <p className="su-point-sub">Branded onboarding that reflects a premium Destiny Springs experience.</p>
            </div>
          </div>
        </section>

        <section className="su-card">
          <Link href="/" className="su-brand">
            <Image src="/Aegislogo.png" alt="NyxAegis for Destiny Springs" width={30} height={30} style={{ objectFit: "contain" }} />
            <span className="su-brand-name">NyxAegis for Destiny Springs</span>
          </Link>

          <h2 className={`${headingFace.className} su-heading`}>Request Access</h2>
          <p className="su-heading-sub">Select your role and submit details for approval.</p>

          <div className="su-toggle">
            <button
              type="button"
              onClick={() => setRole("ACCOUNT")}
              className={`su-tab ${role === "ACCOUNT" ? "active" : "inactive"}`}
            >
              Facility / Hospital
            </button>
            <button
              type="button"
              onClick={() => setRole("REP")}
              className={`su-tab ${role === "REP" ? "active" : "inactive"}`}
            >
              BD Representative
            </button>
          </div>

          {error && <div className="su-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Dr. Jane Smith" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Work Email</label>
              <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@hospital.com" style={inputStyle} />
            </div>

            {role === "ACCOUNT" && (
              <div>
                <label style={labelStyle}>Facility / Organization Name</label>
                <input type="text" value={form.hospitalName} onChange={(e) => update("hospitalName", e.target.value)} placeholder="Nashville General Medical Center" style={inputStyle} />
              </div>
            )}

            {role === "REP" && (
              <div>
                <label style={labelStyle}>Your Title</label>
                <input type="text" value={form.repTitle} onChange={(e) => update("repTitle", e.target.value)} placeholder="Account Executive" style={inputStyle} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} className="su-submit">
              {loading ? "Submitting request..." : "Submit Access Request"}
            </button>
          </form>

          <p className="su-login">
            Already approved? <Link href="/login">Sign In</Link>
          </p>

          <p className="su-legal">
            By submitting this request, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
