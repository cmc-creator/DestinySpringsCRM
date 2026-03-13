"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CYAN = "var(--nyx-accent)";
const BG = "var(--nyx-bg)";

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

  const inputStyle = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 8, padding: "11px 14px", color: "#d8e8f4", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 600 as const, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 };

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 24 }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--nyx-bg)"/>
              <rect x="1" y="1" width="30" height="30" rx="7" stroke={CYAN} strokeWidth="1" strokeOpacity="0.4"/>
              <path d="M16 6 L26 12 L26 20 L16 26 L6 20 L6 12 Z" stroke={CYAN} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
              <circle cx="16" cy="16" r="4" fill={CYAN} fillOpacity="0.8"/>
            </svg>
            <span style={{ fontWeight: 900, fontSize: "1.1rem", color: "#d8e8f4" }}>Destiny Springs CRM</span>
          </Link>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#d8e8f4", marginBottom: 8, letterSpacing: "-0.02em" }}>Request Access</h1>
          <p style={{ color: "rgba(216,232,244,0.5)", fontSize: "0.9rem" }}>Join the BD platform</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 16, padding: "32px" }}>
          {/* Role Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 4 }}>
            {(["ACCOUNT", "REP"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", background: role === r ? CYAN : "transparent", color: role === r ? BG : "rgba(216,232,244,0.5)", transition: "all 0.2s" }}
              >
                {r === "ACCOUNT" ? "?? Hospital" : "?? BD Rep"}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: "0.875rem", color: "#f87171" }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Dr. Jane Smith" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Work Email</label>
              <input type="email" required value={form.email} onChange={e => update("email", e.target.value)} placeholder="jane@hospital.com" style={inputStyle} />
            </div>
            {role === "ACCOUNT" && (
              <div>
                <label style={labelStyle}>Hospital / Organization Name</label>
                <input type="text" value={form.hospitalName} onChange={e => update("hospitalName", e.target.value)} placeholder="Nashville General Medical Center" style={inputStyle} />
              </div>
            )}
            {role === "REP" && (
              <div>
                <label style={labelStyle}>Your Title</label>
                <input type="text" value={form.repTitle} onChange={e => update("repTitle", e.target.value)} placeholder="Account Executive" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={e => update("password", e.target.value)} placeholder="At least 8 characters" style={inputStyle} />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? "var(--nyx-accent-label)" : CYAN, color: BG, padding: "12px", borderRadius: 8, fontWeight: 800, fontSize: "0.95rem", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
            >
              {loading ? "Creating account..." : "Create Account ?"}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.85rem", color: "rgba(216,232,244,0.4)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: CYAN, textDecoration: "none", fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>

        <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.75rem", color: "rgba(216,232,244,0.25)" }}>
          By signing up, you agree to our{" "}
          <Link href="/terms" style={{ color: "var(--nyx-accent-label)" }}>Terms</Link> and{" "}
          <Link href="/privacy" style={{ color: "var(--nyx-accent-label)" }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
