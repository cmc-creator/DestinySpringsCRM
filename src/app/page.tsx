import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "REP":     return "/rep/dashboard";
    case "ACCOUNT": return "/account/dashboard";
    default:        return "/login";
  }
}

export default async function RootPage() {
  const session = await auth();
  if (session) {
    redirect(getRoleHome(session?.user?.role as string | undefined));
  }

  return (
    <main className="home-wrap">
      <style>{`
        .home-wrap {
          min-height: 100dvh;
          overflow-x: clip;
          background:
            radial-gradient(1100px 460px at 20% -10%, rgba(201,168,76,0.17), transparent 70%),
            radial-gradient(760px 380px at 85% 0%, rgba(255,255,255,0.07), transparent 66%),
            var(--nyx-bg, #100805);
          color: var(--nyx-text, #ede4cf);
          padding: 30px 34px 56px;
          box-sizing: border-box;
        }
        .home-shell {
          max-width: 1180px;
          margin: 0 auto;
        }
        .home-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 44px;
        }
        .home-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
          font-weight: 800;
          letter-spacing: 0.01em;
        }
        .home-brand-name {
          font-size: 1.13rem;
        }
        .home-nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .home-nav-link {
          color: rgba(237,228,207,0.74);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .home-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          border: 1px solid var(--nyx-accent-mid, rgba(201,168,76,0.3));
          background: linear-gradient(180deg, rgba(201,168,76,0.95), rgba(177,138,42,0.95));
          color: #2e1a08;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 11px;
          padding: 10px 14px;
        }
        .home-hero {
          display: grid;
          grid-template-columns: 1.22fr 0.95fr;
          gap: 24px;
          align-items: stretch;
        }
        .home-left {
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.13));
          border-radius: 22px;
          padding: 34px 34px 30px;
          background: linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          box-shadow: 0 20px 46px rgba(0,0,0,0.36);
        }
        .home-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.34);
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(237,228,207,0.88);
          margin-bottom: 16px;
        }
        .home-title {
          font-size: clamp(2rem, 4.4vw, 3.45rem);
          line-height: 1.04;
          margin: 0 0 14px;
          letter-spacing: -0.01em;
          font-weight: 900;
        }
        .home-sub {
          margin: 0;
          max-width: 56ch;
          font-size: 1rem;
          line-height: 1.72;
          color: rgba(237,228,207,0.66);
        }
        .home-ctas {
          margin-top: 22px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .home-primary,
        .home-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          text-decoration: none;
          border-radius: 12px;
          padding: 11px 16px;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 800;
        }
        .home-primary {
          background: linear-gradient(180deg, rgba(201,168,76,1), rgba(169,131,40,1));
          color: #281407;
          border: 1px solid rgba(201,168,76,0.46);
        }
        .home-ghost {
          color: rgba(237,228,207,0.8);
          border: 1px solid rgba(201,168,76,0.3);
          background: rgba(255,255,255,0.02);
        }
        .home-metrics {
          margin-top: 26px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .home-metric {
          border: 1px solid rgba(201,168,76,0.2);
          background: rgba(0,0,0,0.22);
          border-radius: 12px;
          padding: 10px 10px 12px;
        }
        .home-metric-value {
          font-size: 1.25rem;
          font-weight: 900;
          color: #f5e7be;
          line-height: 1.1;
        }
        .home-metric-label {
          margin-top: 4px;
          font-size: 0.67rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: rgba(237,228,207,0.53);
        }
        .home-right {
          border: 1px solid var(--nyx-accent-dim, rgba(201,168,76,0.13));
          border-radius: 22px;
          padding: 26px;
          background: radial-gradient(1000px 420px at 20% 0%, rgba(201,168,76,0.12), transparent 72%), rgba(0,0,0,0.26);
          box-shadow: 0 20px 46px rgba(0,0,0,0.36);
        }
        .home-right-title {
          margin: 0 0 12px;
          font-size: 0.8rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(237,228,207,0.58);
          font-weight: 700;
        }
        .home-card {
          border-radius: 14px;
          border: 1px solid rgba(201,168,76,0.22);
          background: rgba(255,255,255,0.02);
          padding: 14px;
          margin-bottom: 10px;
        }
        .home-card-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: baseline;
        }
        .home-card-title {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 700;
          color: rgba(237,228,207,0.95);
        }
        .home-card-kpi {
          font-size: 0.72rem;
          color: var(--nyx-accent, #c9a84c);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .home-card-sub {
          margin: 7px 0 0;
          font-size: 0.82rem;
          line-height: 1.45;
          color: rgba(237,228,207,0.6);
        }
        .home-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 0.74rem;
          color: rgba(237,228,207,0.4);
          letter-spacing: 0.02em;
        }
        @media (max-width: 980px) {
          .home-wrap { padding: 20px 14px 34px; }
          .home-hero { grid-template-columns: 1fr; }
          .home-left,
          .home-right { padding: 20px 16px; border-radius: 16px; }
          .home-metrics { grid-template-columns: 1fr; }
          .home-nav { margin-bottom: 24px; }
          .home-brand-name { font-size: 1rem; }
        }
        @media (max-width: 640px) {
          .home-nav {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .home-nav-actions {
            width: 100%;
            justify-content: space-between;
          }
          .home-nav-btn {
            min-width: 150px;
          }
          .home-title {
            font-size: 1.75rem;
            line-height: 1.12;
          }
          .home-sub {
            font-size: 0.93rem;
            line-height: 1.6;
          }
          .home-ctas {
            flex-direction: column;
          }
          .home-primary,
          .home-ghost {
            width: 100%;
          }
          .home-card-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>

      <div className="home-shell">
        <nav className="home-nav">
          <Link href="/" className="home-brand">
            <Image src="/Aegislogo.png" alt="NyxAegis for Destiny Springs" width={26} height={26} style={{ objectFit: "contain" }} />
            <span className="home-brand-name">NyxAegis for Destiny Springs</span>
          </Link>
          <div className="home-nav-actions">
            <Link href="/pricing" className="home-nav-link">Pricing</Link>
            <Link href="/login" className="home-nav-btn">Client Sign In</Link>
          </div>
        </nav>

        <section className="home-hero">
          <div className="home-left">
            <div className="home-kicker">Bespoke CRM for Destiny Springs</div>
            <h1 className="home-title">A white-label command center for behavioral health growth.</h1>
            <p className="home-sub">
              This is Destiny Springs&rsquo; dedicated deployment of NyxAegis, tuned for referral lifecycle execution,
              rep accountability, and facility engagement without generic SaaS clutter.
            </p>
            <div className="home-ctas">
              <Link href="/login" className="home-primary">Enter CRM</Link>
              <Link href="/signup" className="home-ghost">Request Access</Link>
            </div>

            <div className="home-metrics">
              <div className="home-metric">
                <div className="home-metric-value">3 Portals</div>
                <div className="home-metric-label">Admin, Rep, Facility</div>
              </div>
              <div className="home-metric">
                <div className="home-metric-value">Real-Time</div>
                <div className="home-metric-label">Referral Visibility</div>
              </div>
              <div className="home-metric">
                <div className="home-metric-value">Secure</div>
                <div className="home-metric-label">Role-Based Access</div>
              </div>
            </div>
          </div>

          <aside className="home-right">
            <p className="home-right-title">Operational Focus</p>

            <div className="home-card">
              <div className="home-card-head">
                <h2 className="home-card-title">Referral Pipeline Control</h2>
                <span className="home-card-kpi">Stage-Level</span>
              </div>
              <p className="home-card-sub">Track every active opportunity across inquiry, clinical review, auth, admit, and discharge outcomes.</p>
            </div>

            <div className="home-card">
              <div className="home-card-head">
                <h2 className="home-card-title">Rep Performance Intelligence</h2>
                <span className="home-card-kpi">Territory-Aware</span>
              </div>
              <p className="home-card-sub">Monitor activity quality, follow-up risk, and account momentum by representative and market segment.</p>
            </div>

            <div className="home-card" style={{ marginBottom: 0 }}>
              <div className="home-card-head">
                <h2 className="home-card-title">Facility Relationship Console</h2>
                <span className="home-card-kpi">Account Health</span>
              </div>
              <p className="home-card-sub">Keep engagement history, contracts, invoices, and communications anchored to the right facility teams.</p>
            </div>
          </aside>
        </section>

        <footer className="home-footer">
          NyxAegis &trade; is a product of NyxCollective LLC &trade; &middot; &copy; 2026 NyxCollective LLC. All rights reserved. &middot; <a href="https://www.nyxcollectivellc.com/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Explore more solutions</a>
        </footer>
      </div>
    </main>
  );
}
