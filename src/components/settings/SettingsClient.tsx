"use client";
import { useState, useEffect } from "react";

const C = { card: "rgba(255,255,255,0.03)", border: "rgba(0,212,255,0.08)", cyan: "#00d4ff", text: "#d8e8f4", muted: "rgba(216,232,244,0.55)", input: "rgba(0,0,0,0.35)" };
const inp: React.CSSProperties = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };

const THEMES = [
  { key: "cyber-blue",  label: "Cyber Blue",   accent: "#00d4ff", glow: "rgba(0,212,255,0.15)" },
  { key: "emerald",     label: "Emerald",       accent: "#34d399", glow: "rgba(52,211,153,0.15)" },
  { key: "purple",      label: "Violet",        accent: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
  { key: "amber",       label: "Amber",         accent: "#fbbf24", glow: "rgba(251,191,36,0.15)" },
  { key: "rose",        label: "Rose",          accent: "#f87171", glow: "rgba(248,113,113,0.15)" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
      <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(0,212,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ position: "relative", width: 44, height: 24, borderRadius: 12, background: checked ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.06)", border: `1px solid ${checked ? "rgba(0,212,255,0.4)" : C.border}`, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 22 : 3, width: 16, height: 16, borderRadius: 8, background: checked ? C.cyan : C.muted, transition: "left 0.2s" }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid rgba(0,212,255,0.04)` }}>
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.text }}>{label}</div>
        {desc && <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsClient() {
  const [activeTheme, setActiveTheme] = useState("cyber-blue");
  const [orgName, setOrgName] = useState("NyxAegis");
  const [supportEmail, setSupportEmail] = useState("support@nyxaegis.com");
  const [notifs, setNotifs] = useState({ email: true, push: false, digest: true, leads: true, contracts: false });
  const [devMsg, setDevMsg] = useState("");
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("nyxaegis-theme") ?? "cyber-blue" : "cyber-blue";
    setActiveTheme(stored);
    applyTheme(stored);
    const org = localStorage.getItem("nyxaegis-orgName");
    if (org) setOrgName(org);
    const email = localStorage.getItem("nyxaegis-supportEmail");
    if (email) setSupportEmail(email);
    const n = localStorage.getItem("nyxaegis-notifs");
    if (n) try { setNotifs(JSON.parse(n)); } catch {}
  }, []);

  function applyTheme(key: string) {
    const theme = THEMES.find(t => t.key === key);
    if (!theme || typeof document === "undefined") return;
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.style.setProperty("--accent-glow", theme.glow);
  }

  function selectTheme(key: string) {
    setActiveTheme(key);
    localStorage.setItem("nyxaegis-theme", key);
    applyTheme(key);
  }

  function saveOrg() {
    localStorage.setItem("nyxaegis-orgName", orgName);
    localStorage.setItem("nyxaegis-supportEmail", supportEmail);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "rgba(0,212,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>CONFIGURATION</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Settings</h1>
        <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>Appearance, organization, notifications, and developer tools</p>
      </div>

      {/* THEMES */}
      <Section title="Appearance — Theme">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {THEMES.map(t => (
            <button key={t.key} type="button" onClick={() => selectTheme(t.key)} style={{
              background: activeTheme === t.key ? `rgba(0,0,0,0.4)` : "rgba(0,0,0,0.2)",
              border: `2px solid ${activeTheme === t.key ? t.accent : "rgba(255,255,255,0.06)"}`,
              borderRadius: 10, padding: "14px 18px", cursor: "pointer", textAlign: "center", minWidth: 100,
              boxShadow: activeTheme === t.key ? `0 0 16px ${t.accent}44` : "none",
              transition: "all 0.2s",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.accent, margin: "0 auto 8px", boxShadow: `0 0 12px ${t.accent}88` }} />
              <div style={{ fontSize: "0.75rem", fontWeight: activeTheme === t.key ? 700 : 400, color: activeTheme === t.key ? t.accent : C.muted }}>{t.label}</div>
            </button>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: "0.75rem", color: C.muted }}>Active: <span style={{ color: curTheme.accent, fontWeight: 700 }}>{curTheme.label}</span> — accent color <code style={{ background: "rgba(0,0,0,0.4)", padding: "1px 6px", borderRadius: 4, fontSize: "0.7rem" }}>{curTheme.accent}</code></p>
      </Section>

      {/* ORGANIZATION */}
      <Section title="Organization">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>ORG / BRAND NAME</label>
            <input style={inp} value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: C.muted, display: "block", marginBottom: 4 }}>SUPPORT EMAIL</label>
            <input style={inp} type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          </div>
        </div>
        <button onClick={saveOrg} style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 7, padding: "8px 22px", color: C.cyan, cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}>{saved ? "Saved ✓" : "Save Changes"}</button>
      </Section>

      {/* NOTIFICATIONS */}
      <Section title="Notifications">
        {([
          ["email",     "Email Notifications",       "Send alerts to support email"],
          ["push",      "Browser Push",               "In-browser push notifications"],
          ["digest",    "Daily Digest",               "Summary email each morning"],
          ["leads",     "New Lead Alerts",            "Notify when a new lead is created"],
          ["contracts", "Contract Expiry Warnings",   "Alert 30 days before expiry"],
        ] as [keyof typeof notifs, string, string][]).map(([key, label, desc]) => (
          <SettingRow key={key} label={label} desc={desc}>
            <Toggle checked={notifs[key]} onChange={v => setNotif(key, v)} />
          </SettingRow>
        ))}
      </Section>

      {/* DEV TOOLS */}
      <Section title="Developer Tools">
        <p style={{ fontSize: "0.8rem", color: C.muted, marginBottom: 18 }}>Manage demo data for testing and presentations. Use with caution in production.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Seed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "14px 18px", border: `1px solid rgba(52,211,153,0.1)` }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#34d399" }}>Seed Demo Data</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>Creates sample leads, opportunities, and activities for demonstration</div>
            </div>
            <button onClick={() => devAction("seed-demo")} disabled={devLoading !== null} style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 7, padding: "8px 18px", color: "#34d399", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{devLoading === "seed-demo" ? "Seeding…" : "Seed Demo"}</button>
          </div>

          {/* Clear Demo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "14px 18px", border: `1px solid rgba(251,191,36,0.1)` }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fbbf24" }}>Clear Demo Data</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>Removes demo leads, opportunities, activities, invoices, and contracts</div>
            </div>
            {confirmAction === "clear-demo"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null} style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 7, padding: "7px 14px", color: "#fbbf24", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>{devLoading === "clear-demo" ? "Clearing…" : "Confirm"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 7, padding: "8px 18px", color: "#fbbf24", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>Clear Demo</button>
            }
          </div>

          {/* Clear All */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "14px 18px", border: `1px solid rgba(248,113,113,0.1)` }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f87171" }}>Clear All Data</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>Wipes all transactional records — leads, opps, invoices, contracts, activities</div>
            </div>
            {confirmAction === "clear-all"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-all")} disabled={devLoading !== null} style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 7, padding: "7px 14px", color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>{devLoading === "clear-all" ? "Clearing…" : "Confirm — Wipe All"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
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
