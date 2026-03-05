"use client";
import { useState, useEffect } from "react";

const inp: React.CSSProperties = {
  width: "100%", background: "var(--nyx-input-bg)", border: "1px solid var(--nyx-border)",
  borderRadius: 7, padding: "8px 12px", color: "var(--nyx-text)", fontSize: "0.875rem",
  outline: "none", boxSizing: "border-box",
};

/*  Theme definitions  */
type NyxVars = {
  "--nyx-accent": string; "--nyx-accent-glow": string; "--nyx-accent-dim": string;
  "--nyx-accent-mid": string; "--nyx-accent-str": string; "--nyx-bg": string;
  "--nyx-card": string; "--nyx-border": string; "--nyx-sidebar-bg": string;
  "--nyx-text": string; "--nyx-text-muted": string; "--nyx-input-bg": string;
  "--nyx-scrollbar": string;
};
interface Theme { key: string; label: string; desc: string; accent: string; vars: NyxVars; }

const THEMES: Theme[] = [
  {
    key: "luxury", label: "Luxury", desc: "Obsidian & Gold",
    accent: "#C9A84C",
    vars: {
      "--nyx-accent":      "#C9A84C",
      "--nyx-accent-glow": "rgba(201,168,76,0.22)",
      "--nyx-accent-dim":  "rgba(201,168,76,0.08)",
      "--nyx-accent-mid":  "rgba(201,168,76,0.15)",
      "--nyx-accent-str":  "rgba(201,168,76,0.30)",
      "--nyx-bg":          "#080604",
      "--nyx-card":        "rgba(201,168,76,0.028)",
      "--nyx-border":      "rgba(201,168,76,0.13)",
      "--nyx-sidebar-bg":  "rgba(5,3,1,0.995)",
      "--nyx-text":        "#EDE4CF",
      "--nyx-text-muted":  "rgba(237,228,207,0.46)",
      "--nyx-input-bg":    "rgba(0,0,0,0.45)",
      "--nyx-scrollbar":   "rgba(201,168,76,0.20)",
    },
  },
  {
    key: "glass", label: "Glass", desc: "Midnight Cyan",
    accent: "#00d4ff",
    vars: {
      "--nyx-accent":      "#00d4ff",
      "--nyx-accent-glow": "rgba(0,212,255,0.18)",
      "--nyx-accent-dim":  "rgba(0,212,255,0.08)",
      "--nyx-accent-mid":  "rgba(0,212,255,0.15)",
      "--nyx-accent-str":  "rgba(0,212,255,0.30)",
      "--nyx-bg":          "#040810",
      "--nyx-card":        "rgba(0,212,255,0.03)",
      "--nyx-border":      "rgba(0,212,255,0.08)",
      "--nyx-sidebar-bg":  "rgba(4,6,12,0.98)",
      "--nyx-text":        "#d8e8f4",
      "--nyx-text-muted":  "rgba(216,232,244,0.50)",
      "--nyx-input-bg":    "rgba(0,0,0,0.35)",
      "--nyx-scrollbar":   "rgba(0,212,255,0.15)",
    },
  },
  {
    key: "emerald", label: "Emerald", desc: "Forest Dark",
    accent: "#34d399",
    vars: {
      "--nyx-accent":      "#34d399",
      "--nyx-accent-glow": "rgba(52,211,153,0.20)",
      "--nyx-accent-dim":  "rgba(52,211,153,0.08)",
      "--nyx-accent-mid":  "rgba(52,211,153,0.15)",
      "--nyx-accent-str":  "rgba(52,211,153,0.28)",
      "--nyx-bg":          "#030a06",
      "--nyx-card":        "rgba(52,211,153,0.03)",
      "--nyx-border":      "rgba(52,211,153,0.09)",
      "--nyx-sidebar-bg":  "rgba(2,7,4,0.99)",
      "--nyx-text":        "#d4f0e4",
      "--nyx-text-muted":  "rgba(212,240,228,0.46)",
      "--nyx-input-bg":    "rgba(0,0,0,0.40)",
      "--nyx-scrollbar":   "rgba(52,211,153,0.18)",
    },
  },
  {
    key: "violet", label: "Violet", desc: "Deep Amethyst",
    accent: "#a78bfa",
    vars: {
      "--nyx-accent":      "#a78bfa",
      "--nyx-accent-glow": "rgba(167,139,250,0.20)",
      "--nyx-accent-dim":  "rgba(167,139,250,0.08)",
      "--nyx-accent-mid":  "rgba(167,139,250,0.15)",
      "--nyx-accent-str":  "rgba(167,139,250,0.28)",
      "--nyx-bg":          "#05030e",
      "--nyx-card":        "rgba(167,139,250,0.03)",
      "--nyx-border":      "rgba(167,139,250,0.10)",
      "--nyx-sidebar-bg":  "rgba(4,2,10,0.99)",
      "--nyx-text":        "#e4dcf7",
      "--nyx-text-muted":  "rgba(228,220,247,0.46)",
      "--nyx-input-bg":    "rgba(0,0,0,0.40)",
      "--nyx-scrollbar":   "rgba(167,139,250,0.18)",
    },
  },
  {
    key: "amber", label: "Amber", desc: "Warm Whiskey",
    accent: "#fbbf24",
    vars: {
      "--nyx-accent":      "#fbbf24",
      "--nyx-accent-glow": "rgba(251,191,36,0.20)",
      "--nyx-accent-dim":  "rgba(251,191,36,0.08)",
      "--nyx-accent-mid":  "rgba(251,191,36,0.15)",
      "--nyx-accent-str":  "rgba(251,191,36,0.28)",
      "--nyx-bg":          "#080600",
      "--nyx-card":        "rgba(251,191,36,0.03)",
      "--nyx-border":      "rgba(251,191,36,0.10)",
      "--nyx-sidebar-bg":  "rgba(5,4,0,0.99)",
      "--nyx-text":        "#f2e8c8",
      "--nyx-text-muted":  "rgba(242,232,200,0.46)",
      "--nyx-input-bg":    "rgba(0,0,0,0.42)",
      "--nyx-scrollbar":   "rgba(251,191,36,0.18)",
    },
  },
  {
    key: "rose", label: "Rose", desc: "Crimson Night",
    accent: "#f87171",
    vars: {
      "--nyx-accent":      "#f87171",
      "--nyx-accent-glow": "rgba(248,113,113,0.20)",
      "--nyx-accent-dim":  "rgba(248,113,113,0.08)",
      "--nyx-accent-mid":  "rgba(248,113,113,0.15)",
      "--nyx-accent-str":  "rgba(248,113,113,0.28)",
      "--nyx-bg":          "#0a0405",
      "--nyx-card":        "rgba(248,113,113,0.03)",
      "--nyx-border":      "rgba(248,113,113,0.10)",
      "--nyx-sidebar-bg":  "rgba(7,2,3,0.99)",
      "--nyx-text":        "#f4dcdc",
      "--nyx-text-muted":  "rgba(244,220,220,0.46)",
      "--nyx-input-bg":    "rgba(0,0,0,0.42)",
      "--nyx-scrollbar":   "rgba(248,113,113,0.18)",
    },
  },
];

/*  Helpers  */
function applyTheme(key: string) {
  if (typeof document === "undefined") return;
  const theme = THEMES.find(t => t.key === key);
  if (!theme) return;
  const html = document.documentElement;
  html.setAttribute("data-theme", key);
  // Also set vars directly so re-render is instant without waiting for CSS cascade
  Object.entries(theme.vars).forEach(([k, v]) => html.style.setProperty(k, v));
}

/*  Sub-components  */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
      <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent)", opacity: 0.55, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ position: "relative", width: 44, height: 24, borderRadius: 12, background: checked ? "var(--nyx-accent-mid)" : "rgba(255,255,255,0.06)", border: `1px solid ${checked ? "var(--nyx-accent-str)" : "var(--nyx-border)"}`, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 22 : 3, width: 16, height: 16, borderRadius: 8, background: checked ? "var(--nyx-accent)" : "var(--nyx-text-muted)", transition: "left 0.2s" }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--nyx-border)" }}>
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--nyx-text)" }}>{label}</div>
        {desc && <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

/*  Main component  */
export default function SettingsClient() {
  const [activeTheme, setActiveTheme] = useState("luxury");
  const [orgName, setOrgName] = useState("NyxAegis");
  const [supportEmail, setSupportEmail] = useState("support@nyxaegis.com");
  const [notifs, setNotifs] = useState({ email: true, push: false, digest: true, leads: true, contracts: false });
  const [devMsg, setDevMsg] = useState("");
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("nyxaegis-theme") ?? "luxury" : "luxury";
    setActiveTheme(stored);
    applyTheme(stored);
    const org = localStorage.getItem("nyxaegis-orgName");
    if (org) setOrgName(org);
    const em = localStorage.getItem("nyxaegis-supportEmail");
    if (em) setSupportEmail(em);
    const n = localStorage.getItem("nyxaegis-notifs");
    if (n) try { setNotifs(JSON.parse(n)); } catch { /* ignore */ }
  }, []);

  function selectTheme(key: string) {
    setActiveTheme(key);
    localStorage.setItem("nyxaegis-theme", key);
    applyTheme(key);
  }

  function saveOrg() {
    localStorage.setItem("nyxaegis-orgName", orgName);
    localStorage.setItem("nyxaegis-supportEmail", supportEmail);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  function setNotif(k: keyof typeof notifs, v: boolean) {
    const updated = { ...notifs, [k]: v };
    setNotifs(updated);
    localStorage.setItem("nyxaegis-notifs", JSON.stringify(updated));
  }

  async function devAction(action: string) {
    if (action !== "seed-demo" && !confirmAction) { setConfirmAction(action); return; }
    if (confirmAction && confirmAction !== action) { setConfirmAction(action); return; }
    setDevLoading(action); setDevMsg(""); setConfirmAction(null);
    try {
      const r = await fetch("/api/admin/dev-tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json();
      setDevMsg(d.message ?? (r.ok ? "Done." : "Error."));
    } catch { setDevMsg("Network error."); }
    finally { setDevLoading(null); }
  }

  const curTheme = THEMES.find(t => t.key === activeTheme) ?? THEMES[0];

  return (
    <div style={{ maxWidth: 740 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--nyx-accent)", opacity: 0.55, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>CONFIGURATION</p>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--nyx-text)", letterSpacing: "-0.025em" }}>Settings</h1>
        <p style={{ color: "var(--nyx-text-muted)", fontSize: "0.875rem", marginTop: 5 }}>Appearance, organization, notifications, and developer tools</p>
      </div>

      {/*  THEMES  */}
      <Section title="Appearance &mdash; Theme">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 18 }}>
          Choose your interface theme. Changes apply instantly across the entire platform.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
          {THEMES.map(t => {
            const isActive = activeTheme === t.key;
            return (
              <button key={t.key} type="button" onClick={() => selectTheme(t.key)} style={{
                background: isActive ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.28)",
                border: `2px solid ${isActive ? t.accent : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12, padding: "16px 10px 14px", cursor: "pointer", textAlign: "center",
                boxShadow: isActive ? `0 0 22px ${t.accent}38, 0 4px 20px rgba(0,0,0,0.5)` : "none",
                transition: "all 0.22s", position: "relative", overflow: "hidden",
              }}>
                {/* Gem / swatch */}
                <div style={{ position: "relative", width: 32, height: 32, margin: "0 auto 10px" }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <polygon points="16,2 30,14 16,30 2,14"
                      fill={`${t.accent}14`} stroke={t.accent} strokeWidth="1.3" strokeOpacity="0.75" />
                    <line x1="2" y1="14" x2="30" y2="14" stroke={t.accent} strokeWidth="0.65" strokeOpacity="0.4" />
                    <line x1="16" y1="2" x2="9" y2="14" stroke={t.accent} strokeWidth="0.55" strokeOpacity="0.35" />
                    <line x1="16" y1="2" x2="23" y2="14" stroke={t.accent} strokeWidth="0.55" strokeOpacity="0.35" />
                    <polygon points="11,8 16,3 21,8" fill={`${t.accent}28`} />
                    <circle cx="16" cy="10" r="1.5" fill={t.accent} fillOpacity="0.9" />
                  </svg>
                  {isActive && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${t.accent}22 0%, transparent 70%)`, pointerEvents: "none" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: isActive ? 800 : 500, color: isActive ? t.accent : "rgba(255,255,255,0.45)", lineHeight: 1.2 }}>{t.label}</div>
                <div style={{ fontSize: "0.65rem", color: isActive ? `${t.accent}99` : "rgba(255,255,255,0.22)", marginTop: 3 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid var(--nyx-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 30,14 16,30 2,14" fill={`${curTheme.accent}18`} stroke={curTheme.accent} strokeWidth="1.2" />
            <circle cx="16" cy="10" r="1.4" fill={curTheme.accent} fillOpacity="0.9" />
          </svg>
          <span style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>
            Active: <strong style={{ color: curTheme.accent }}>{curTheme.label}</strong>
            <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: "0.72rem", opacity: 0.7 }}>{curTheme.accent}</span>
          </span>
        </div>
      </Section>

      {/*  ORGANISATION  */}
      <Section title="Organization">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>ORG / BRAND NAME</label>
            <input style={inp} value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>SUPPORT EMAIL</label>
            <input style={inp} type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          </div>
        </div>
        <button onClick={saveOrg} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 7, padding: "8px 22px", color: "var(--nyx-accent)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}>{saved ? "Saved \u2713" : "Save Changes"}</button>
      </Section>

      {/*  NOTIFICATIONS  */}
      <Section title="Notifications">
        {([
          ["email",     "Email Notifications",      "Send alerts to support email"],
          ["push",      "Browser Push",              "In-browser push notifications"],
          ["digest",    "Daily Digest",              "Summary email each morning"],
          ["leads",     "New Lead Alerts",           "Notify when a new lead is created"],
          ["contracts", "Contract Expiry Warnings",  "Alert 30 days before expiry"],
        ] as [keyof typeof notifs, string, string][]).map(([key, label, desc]) => (
          <SettingRow key={key} label={label} desc={desc}>
            <Toggle checked={notifs[key]} onChange={v => setNotif(key, v)} />
          </SettingRow>
        ))}
      </Section>

      {/*  DEV TOOLS  */}
      <Section title="Developer Tools">
        <p style={{ fontSize: "0.8rem", color: "var(--nyx-text-muted)", marginBottom: 18 }}>Manage demo data for testing and presentations. Use with caution in production.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Seed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(52,211,153,0.12)" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#34d399" }}>Seed Demo Data</div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>Creates sample leads, opportunities, and activities for demonstration</div>
            </div>
            <button onClick={() => devAction("seed-demo")} disabled={devLoading !== null} style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 7, padding: "8px 18px", color: "#34d399", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{devLoading === "seed-demo" ? "Seeding\u2026" : "Seed Demo"}</button>
          </div>

          {/* Clear Demo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(251,191,36,0.12)" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fbbf24" }}>Clear Demo Data</div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>Removes demo leads, opportunities, activities, invoices, and contracts</div>
            </div>
            {confirmAction === "clear-demo"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null} style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 7, padding: "7px 14px", color: "#fbbf24", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>{devLoading === "clear-demo" ? "Clearing\u2026" : "Confirm"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 7, padding: "8px 18px", color: "#fbbf24", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>Clear Demo</button>
            }
          </div>

          {/* Clear All */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(248,113,113,0.12)" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f87171" }}>Clear All Data</div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>Wipes all transactional records &mdash; leads, opps, invoices, contracts, activities</div>
            </div>
            {confirmAction === "clear-all"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-all")} disabled={devLoading !== null} style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 7, padding: "7px 14px", color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>{devLoading === "clear-all" ? "Clearing\u2026" : "Confirm \u2014 Wipe All"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-all")} disabled={devLoading !== null} style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 7, padding: "8px 18px", color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>Clear All</button>
            }
          </div>
        </div>

        {devMsg && (
          <div style={{ marginTop: 14, background: "rgba(0,0,0,0.35)", borderRadius: 7, padding: "10px 14px", fontSize: "0.82rem", color: devMsg.toLowerCase().includes("error") || devMsg.toLowerCase().includes("fail") ? "#f87171" : "#34d399", border: "1px solid rgba(255,255,255,0.05)" }}>
            {devMsg}
          </div>
        )}
      </Section>
    </div>
  );
}
