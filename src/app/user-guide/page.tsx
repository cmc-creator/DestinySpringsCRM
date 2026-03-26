import Link from "next/link";

export default function UserGuidePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--nyx-bg)", color: "var(--nyx-text)", padding: "48px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", border: "1px solid var(--nyx-accent-dim)", borderRadius: 16, background: "rgba(255,255,255,0.03)", padding: "28px 24px" }}>
        <p style={{ margin: 0, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nyx-accent-label)", fontWeight: 700 }}>
          Getting Started
        </p>
        <h1 style={{ margin: "10px 0 10px", fontSize: "2rem", lineHeight: 1.15, fontWeight: 800 }}>
          Destiny Springs CRM User Guide
        </h1>
        <p style={{ margin: "0 0 22px", color: "var(--nyx-text-muted)", lineHeight: 1.7 }}>
          Welcome. This guide helps new users get productive quickly and shows where to find role-based resources.
        </p>

        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          <section style={{ border: "1px solid var(--nyx-accent-dim)", borderRadius: 12, padding: "14px 14px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Step 1: Sign in</h2>
            <p style={{ margin: 0, color: "var(--nyx-text-muted)", lineHeight: 1.6 }}>
              Use your work email and password on the sign-in page.
            </p>
          </section>

          <section style={{ border: "1px solid var(--nyx-accent-dim)", borderRadius: 12, padding: "14px 14px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Step 2: Open your dashboard</h2>
            <p style={{ margin: 0, color: "var(--nyx-text-muted)", lineHeight: 1.6 }}>
              Your role routes you to the correct dashboard automatically after login.
            </p>
          </section>

          <section style={{ border: "1px solid var(--nyx-accent-dim)", borderRadius: 12, padding: "14px 14px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Step 3: Use Resources</h2>
            <p style={{ margin: 0, color: "var(--nyx-text-muted)", lineHeight: 1.6 }}>
              Open the Resources section in your left navigation for reference docs, templates, and team materials.
            </p>
          </section>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/login" style={{ textDecoration: "none", background: "var(--nyx-accent)", color: "var(--nyx-bg)", borderRadius: 8, padding: "10px 16px", fontWeight: 800 }}>
            Go to Login
          </Link>
          <a href="mailto:info@nyxcollectivellc.com?subject=Destiny%20Springs%20Support" style={{ textDecoration: "none", border: "1px solid var(--nyx-accent-dim)", color: "var(--nyx-text)", borderRadius: 8, padding: "10px 16px", fontWeight: 700 }}>
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
