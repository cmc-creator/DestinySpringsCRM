"use client";

import { useSession } from "next-auth/react";

export default function BillingPage() {
  const { data: session } = useSession();

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 4 }}>Billing &amp; Subscription</h1>
      <p style={{ color: "rgba(216,232,244,0.5)", marginBottom: 28, fontSize: "0.9rem" }}>
        Destiny Springs is configured for partner-managed billing in this release.
      </p>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(216,232,244,0.08)", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          Current Billing Model
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 800 }}>Partner Managed</h2>
        <p style={{ margin: "0 0 14px", color: "rgba(216,232,244,0.55)", lineHeight: 1.6 }}>
          Stripe checkout and self-service subscription management are not enabled for this release. Billing and seat adjustments are managed directly by the NyxCollective team.
        </p>
        <a
          href="mailto:info@nyxcollectivellc.com?subject=Destiny%20Springs%20Billing%20Request"
          style={{ display: "inline-block", background: "#c9a84c", color: "#0a0e14", padding: "10px 22px", borderRadius: 8, fontWeight: 800, textDecoration: "none", fontSize: "0.85rem" }}
        >
          Contact Billing Support
        </a>
      </div>

      <p style={{ marginTop: 16, fontSize: "0.75rem", color: "rgba(216,232,244,0.2)" }}>
        Logged in as {session?.user?.email}
      </p>
    </div>
  );
}
