"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface BillingData {
  planTier: string;
  subscriptionStatus: string;
  seatLimit: number;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  userCount: number;
}

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter (Trial)",
  solo_rep: "Solo Rep — $49/mo",
  bd_team: "BD Team — $199/mo",
  health_system: "Health System",
  dsh_partner: "Destiny Springs Preferred Partner",
};

const STATUS_COLORS: Record<string, string> = {
  trialing: "var(--nyx-accent)",
  active: "#22c55e",
  past_due: "#f59e0b",
  canceled: "#ef4444",
  trial_expired: "#ef4444",
  paused: "#94a3b8",
};

export default function BillingPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");

  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portaling, setPortaling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/billing");
      if (r.ok) {
        const d = await r.json();
        setBilling(d);
      } else {
        setError("Failed to load billing info");
      }
    } catch {
      setError("Network error loading billing info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan);
    setError(null);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url, error: err } = await r.json();
      if (err) { setError(err); return; }
      if (url) window.location.href = url;
    } catch {
      setError("Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  const handlePortal = async () => {
    setPortaling(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const { url, error: err } = await r.json();
      if (err) { setError(err); return; }
      if (url) window.location.href = url;
    } catch {
      setError("Failed to open billing portal");
    } finally {
      setPortaling(false);
    }
  };

  const trialDaysLeft = billing?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const statusColor = billing ? (STATUS_COLORS[billing.subscriptionStatus] ?? "var(--nyx-text)") : "var(--nyx-text)";

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 4 }}>Billing &amp; Subscription</h1>
      <p style={{ color: "rgba(216,232,244,0.5)", marginBottom: 28, fontSize: "0.9rem" }}>
        Manage your plan, payment method, and seat allocation.
      </p>

      {successParam === "1" && (
        <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid #22c55e", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: "#22c55e", fontSize: "0.9rem" }}>
          Payment complete — your subscription is now active. Thank you!
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: "#ef4444", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: "rgba(216,232,244,0.4)", padding: "60px 0", textAlign: "center" }}>Loading billing info…</div>
      ) : billing ? (
        <>
          {/* Current Plan Card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(216,232,244,0.08)", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Current Plan</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{PLAN_LABELS[billing.planTier] ?? billing.planTier}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(216,232,244,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Status</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: statusColor, textTransform: "capitalize" }}>
                  {billing.subscriptionStatus.replace("_", " ")}
                  {billing.subscriptionStatus === "trialing" && trialDaysLeft !== null && (
                    <span style={{ color: "rgba(216,232,244,0.4)", fontWeight: 400, fontSize: "0.85rem" }}> · {trialDaysLeft}d left</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: "0.7rem", color: "rgba(216,232,244,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Seats Used</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  {billing.userCount} <span style={{ color: "rgba(216,232,244,0.35)", fontWeight: 400, fontSize: "0.85rem" }}>/ {billing.seatLimit}</span>
                </div>
              </div>
              {billing.currentPeriodEnd && (
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(216,232,244,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Next Renewal</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                    {new Date(billing.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              )}
              {billing.subscriptionStatus === "trialing" && billing.trialEndsAt && (
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(216,232,244,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Trial Ends</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                    {new Date(billing.trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              )}
            </div>

            {billing.subscriptionStatus !== "canceled" && (
              <button
                onClick={handlePortal}
                disabled={portaling}
                style={{ marginTop: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,232,244,0.1)", borderRadius: 8, color: "var(--nyx-text)", padding: "10px 20px", cursor: portaling ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", opacity: portaling ? 0.6 : 1 }}
              >
                {portaling ? "Opening portal…" : "Manage Billing in Stripe"}
              </button>
            )}
          </div>

          {/* Upgrade Options — hidden for named/custom partner plans */}
          {billing.subscriptionStatus !== "active" && billing.planTier !== "dsh_partner" && billing.planTier !== "health_system" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(216,232,244,0.08)", borderRadius: 14, padding: "24px 28px" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>Upgrade Your Plan</h2>
              <p style={{ color: "rgba(216,232,244,0.4)", fontSize: "0.85rem", marginBottom: 20 }}>All plans include a 14-day free trial.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  { plan: "solo_rep", label: "Solo Rep", price: "$49/mo", desc: "1–3 users, core pipeline" },
                  { plan: "bd_team", label: "BD Team", price: "$199/mo", desc: "Up to 10 users, full features", highlight: true },
                ].map(({ plan, label, price, desc, highlight }) => (
                  <div key={plan} style={{ background: highlight ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${highlight ? "var(--nyx-accent-str)" : "rgba(216,232,244,0.08)"}`, borderRadius: 12, padding: "18px 20px" }}>
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: "var(--nyx-accent)", fontWeight: 700, marginBottom: 4 }}>{price}</div>
                    <div style={{ color: "rgba(216,232,244,0.45)", fontSize: "0.8rem", marginBottom: 16 }}>{desc}</div>
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={!!upgrading}
                      style={{ width: "100%", background: highlight ? "var(--nyx-accent)" : "rgba(255,255,255,0.07)", color: highlight ? "var(--nyx-bg)" : "var(--nyx-text)", border: "none", borderRadius: 7, padding: "9px", fontWeight: 700, cursor: upgrading ? "not-allowed" : "pointer", opacity: upgrading ? 0.6 : 1, fontSize: "0.85rem" }}
                    >
                      {upgrading === plan ? "Redirecting…" : "Select Plan"}
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 16, fontSize: "0.78rem", color: "rgba(216,232,244,0.3)" }}>
                Need 10+ users or white-label branding? <a href="mailto:ops@destinyspringshealthcare.com" style={{ color: "var(--nyx-accent)", textDecoration: "none" }}>Contact us for Health System pricing.</a>
              </p>
            </div>
          )}

          {/* DSH / named partner callout */}
          {(billing.planTier === "dsh_partner" || billing.planTier === "health_system") && (
            <div style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 14, padding: "22px 28px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#c9a84c", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Preferred Partner</div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>You have a dedicated account manager.</div>
                <div style={{ color: "rgba(216,232,244,0.45)", fontSize: "0.82rem" }}>Billing questions, seat changes, or feature requests — reach out any time.</div>
              </div>
              <a href="mailto:info@nyxcollectivellc.com?subject=Billing%20Question" style={{ background: "#c9a84c", color: "#0a0e14", padding: "10px 22px", borderRadius: 8, fontWeight: 800, textDecoration: "none", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                Contact Account Manager
              </a>
            </div>
          )}

          <p style={{ marginTop: 16, fontSize: "0.75rem", color: "rgba(216,232,244,0.2)" }}>
            Logged in as {session?.user?.email}
          </p>
        </>
      ) : (
        <div style={{ color: "rgba(216,232,244,0.3)" }}>Unable to load billing information.</div>
      )}
    </div>
  );
}
