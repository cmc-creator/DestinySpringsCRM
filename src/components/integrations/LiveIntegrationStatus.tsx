"use client";
import { useEffect, useState } from "react";

type TokenInfo = {
  provider: string;
  email: string | null;
  displayName: string | null;
  teamsWebhook: string | null;
  expiresAt: string | null;
  updatedAt: string;
};

const PROVIDERS = [
  { key: "microsoft", label: "Microsoft 365 (Outlook + Calendar + Teams)", icon: "📮", color: "#0078D4", connectPath: "/admin/communications" },
  { key: "google",    label: "Google (Gmail + Calendar)",                  icon: "📬", color: "#EA4335", connectPath: "/admin/communications" },
];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function LiveIntegrationStatus() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/tokens")
      .then(r => r.json())
      .then(data => { setTokens(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 14, padding: "18px 22px", marginBottom: 28 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--nyx-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Live Connection Status
        </div>
        <div style={{ color: "var(--nyx-text-muted)", fontSize: "0.8rem" }}>Checking connections…</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 14, padding: "18px 22px", marginBottom: 28 }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--nyx-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
        Live Connection Status
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PROVIDERS.map(p => {
          const token = tokens.find(t => t.provider === p.key);
          const days  = token ? daysUntil(token.expiresAt) : null;
          const expired  = days !== null && days <= 0;
          const expiring = days !== null && days > 0 && days <= 3;

          const badgeColor = expired ? "#f87171" : expiring ? "#f59e0b" : "#34d399";
          const badgeLabel = !token ? "Not connected"
            : expired  ? "Token expired"
            : expiring ? `Expires in ${days}d`
            : "Connected";

          return (
            <div key={p.key}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
                background: "var(--nyx-bg)", border: "1px solid var(--nyx-border)", borderRadius: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>{p.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nyx-text)", marginBottom: 2 }}>{p.label}</div>
                {token && (
                  <div style={{ fontSize: "0.7rem", color: "var(--nyx-text-muted)" }}>
                    {token.email ?? token.displayName ?? "Connected"}
                    {token.expiresAt && (
                      <span style={{ marginLeft: 8 }}>
                        · Token {expired ? "expired" : `expires ${new Date(token.expiresAt).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                  background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}55`,
                }}>
                  {badgeLabel}
                </span>
                {(!token || expired || expiring) && (
                  <a href={p.connectPath}
                    style={{ fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 7,
                      background: p.color, color: "#fff", textDecoration: "none",
                      display: "inline-block" }}>
                    {token && (expired || expiring) ? "Reconnect" : "Connect"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
