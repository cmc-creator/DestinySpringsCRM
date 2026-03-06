"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
  "--nyx-scrollbar": string; "--nyx-accent-label": string; "--nyx-texture": string; "--nyx-sidebar-tex": string; "--nyx-card-texture": string; "--nyx-card-border": string;
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
      "--nyx-bg":          "#100805",
      "--nyx-card":        "rgba(8,5,2,0.82)",
      "--nyx-border":      "rgba(201,168,76,0.13)",
      "--nyx-sidebar-bg":  "rgba(7,3,1,0.998)",
      "--nyx-text":        "#EDE4CF",
      "--nyx-text-muted":  "rgba(237,228,207,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.45)",
      "--nyx-scrollbar":   "rgba(201,168,76,0.20)",
      "--nyx-accent-label":"rgba(201,168,76,0.60)",
      "--nyx-texture":     "url('/luxury/leather1.jpg')",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "url('/luxury/marble2.png')",
      "--nyx-card-border": "linear-gradient(135deg, #2e1800 0%, #7a5210 8%, #C9A84C 18%, #f0d060 26%, #fffce0 33%, #e8c840 41%, #c09030 50%, #e8c840 58%, #fffce0 66%, #f0d060 74%, #C9A84C 82%, #7a5210 91%, #2e1800 100%)",
    },
  },
  {
    key: "glass", label: "Glass", desc: "Midnight Cyan",
    accent: "#00d4ff",
    vars: {
      "--nyx-accent":      "#00d4ff",
      "--nyx-accent-glow": "rgba(0,212,255,0.22)",
      "--nyx-accent-dim":  "rgba(0,212,255,0.08)",
      "--nyx-accent-mid":  "rgba(0,212,255,0.15)",
      "--nyx-accent-str":  "rgba(0,212,255,0.30)",
      "--nyx-bg":          "#040810",
      "--nyx-card":        "rgba(0,212,255,0.03)",
      "--nyx-border":      "rgba(0,212,255,0.09)",
      "--nyx-sidebar-bg":  "rgba(4,6,12,0.98)",
      "--nyx-text":        "#d8e8f4",
      "--nyx-text-muted":  "rgba(216,232,244,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.35)",
      "--nyx-scrollbar":   "rgba(0,212,255,0.18)",
      "--nyx-accent-label":"rgba(0,212,255,0.60)",
      "--nyx-texture":     "url('/luxury/bluelux.jpg')",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001428 0%, #00486a 12%, #00b8e8 22%, #40d8ff 30%, #d8f8ff 38%, #00c8f0 48%, #0098c0 58%, #40d8ff 68%, #d8f8ff 77%, #00486a 90%, #001428 100%)",
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
      "--nyx-text-muted":  "rgba(212,240,228,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.40)",
      "--nyx-scrollbar":   "rgba(52,211,153,0.18)",
      "--nyx-accent-label":"rgba(52,211,153,0.60)",
      "--nyx-texture":     "url('/luxury/greenluxx.jpg')",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #001208 0%, #0a4820 12%, #34d399 22%, #70f0c0 30%, #dfffef 38%, #28c880 48%, #10a060 58%, #70f0c0 68%, #dfffef 77%, #0a4820 90%, #001208 100%)",
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
      "--nyx-text-muted":  "rgba(228,220,247,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.40)",
      "--nyx-scrollbar":   "rgba(167,139,250,0.18)",
      "--nyx-accent-label":"rgba(167,139,250,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.66 .60' numOctaves='5' seed='5' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0.06 0 0 0 0.03  0 0 0 0 0.01  0.08 0 0 0 0.04  0 0 0 0.05 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #0a0218 0%, #340880 12%, #a78bfa 22%, #c8b0ff 30%, #f0e8ff 38%, #9868f0 48%, #7040d0 58%, #c8b0ff 68%, #f0e8ff 77%, #340880 90%, #0a0218 100%)",
    },
  },
  {
    key: "hotpink", label: "Hot Pink", desc: "Neon Magenta",
    accent: "#ec4899",
    vars: {
      "--nyx-accent":      "#ec4899",
      "--nyx-accent-glow": "rgba(236,72,153,0.22)",
      "--nyx-accent-dim":  "rgba(236,72,153,0.08)",
      "--nyx-accent-mid":  "rgba(236,72,153,0.15)",
      "--nyx-accent-str":  "rgba(236,72,153,0.30)",
      "--nyx-bg":          "#0a0308",
      "--nyx-card":        "rgba(236,72,153,0.03)",
      "--nyx-border":      "rgba(236,72,153,0.10)",
      "--nyx-sidebar-bg":  "rgba(6,1,4,0.99)",
      "--nyx-text":        "#fce7f3",
      "--nyx-text-muted":  "rgba(252,231,243,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.42)",
      "--nyx-scrollbar":   "rgba(236,72,153,0.18)",
      "--nyx-accent-label":"rgba(236,72,153,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.67 .61' numOctaves='5' seed='13' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0.15 0 0 0 0.07  0 0 0 0 0.01  0.08 0 0 0 0.04  0 0 0 0.055 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #1a0010 0%, #6a0040 12%, #ec4899 22%, #ff80c8 30%, #ffe8f4 38%, #d82880 48%, #a81860 58%, #ff80c8 68%, #ffe8f4 77%, #6a0040 90%, #1a0010 100%)",
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
      "--nyx-text-muted":  "rgba(244,220,220,0.72)",
      "--nyx-input-bg":    "rgba(0,0,0,0.42)",
      "--nyx-scrollbar":   "rgba(248,113,113,0.18)",
      "--nyx-accent-label":"rgba(248,113,113,0.60)",
      "--nyx-texture":     "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.68 .63' numOctaves='5' seed='9' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0.12 0 0 0 0.06  0 0 0 0 0.01  0.02 0 0 0 0.01  0 0 0 0.05 0'/></filter><rect width='256' height='256' filter='url(%23l)'/></svg>\")",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #180008 0%, #5a0020 12%, #f87171 22%, #ffa0a0 30%, #ffe8e8 38%, #e84040 48%, #c02020 58%, #ffa0a0 68%, #ffe8e8 77%, #5a0020 90%, #180008 100%)",
    },
  },
  {
    key: "light", label: "Light", desc: "Clean Silver",
    accent: "#6366f1",
    vars: {
      "--nyx-accent":      "#6366f1",
      "--nyx-accent-glow": "rgba(99,102,241,0.18)",
      "--nyx-accent-dim":  "rgba(99,102,241,0.10)",
      "--nyx-accent-mid":  "rgba(99,102,241,0.18)",
      "--nyx-accent-str":  "rgba(99,102,241,0.35)",
      "--nyx-bg":          "#f0f2f7",
      "--nyx-card":        "#ffffff",
      "--nyx-border":      "rgba(99,102,241,0.18)",
      "--nyx-sidebar-bg":  "#e8eaf2",
      "--nyx-text":        "#1a1b2e",
      "--nyx-text-muted":  "rgba(26,27,46,0.55)",
      "--nyx-input-bg":    "rgba(0,0,0,0.05)",
      "--nyx-scrollbar":   "rgba(99,102,241,0.25)",
      "--nyx-accent-label":"rgba(99,102,241,0.70)",
      "--nyx-texture":     "none",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #6080a0 0%, #90a8c0 12%, #b8d0e8 22%, #d8eaf8 30%, #f8fbff 38%, #c0d8f0 48%, #a0c0d8 58%, #d8eaf8 68%, #f8fbff 77%, #90a8c0 90%, #6080a0 100%)",
    },
  },
  {
    key: "blush", label: "Blush", desc: "Soft Daylight",
    accent: "#be185d",
    vars: {
      "--nyx-accent":      "#be185d",
      "--nyx-accent-glow": "rgba(190,24,93,0.16)",
      "--nyx-accent-dim":  "rgba(190,24,93,0.08)",
      "--nyx-accent-mid":  "rgba(190,24,93,0.14)",
      "--nyx-accent-str":  "rgba(190,24,93,0.28)",
      "--nyx-bg":          "#fdf4f7",
      "--nyx-card":        "#ffffff",
      "--nyx-border":      "rgba(190,24,93,0.15)",
      "--nyx-sidebar-bg":  "#f7e8ee",
      "--nyx-text":        "#1e0a12",
      "--nyx-text-muted":  "rgba(30,10,18,0.55)",
      "--nyx-input-bg":    "rgba(0,0,0,0.04)",
      "--nyx-scrollbar":   "rgba(190,24,93,0.22)",
      "--nyx-accent-label":"rgba(190,24,93,0.65)",
      "--nyx-texture":     "none",
      "--nyx-sidebar-tex": "",
      "--nyx-card-texture": "none",
      "--nyx-card-border": "linear-gradient(135deg, #2a0018 0%, #8c1050 12%, #be185d 22%, #e060a8 30%, #ffd4e8 38%, #c82870 48%, #9e1248 58%, #e060a8 68%, #ffd4e8 77%, #8c1050 90%, #2a0018 100%)",
    },
  },
];

/*  Helpers  */
const BG_VAR_MAP: Record<string, string> = {
  backgrounds: "--nyx-texture",
  sidebar:     "--nyx-sidebar-tex",
  cards:       "--nyx-card-texture",
};
function applyStoredBgs(themeKey: string) {
  if (typeof document === "undefined") return;
  const theme = THEMES.find(t => t.key === themeKey);
  const html  = document.documentElement;
  (["backgrounds", "sidebar", "cards"] as const).forEach(type => {
    const stored = localStorage.getItem(`nyxaegis-bg-${themeKey}-${type}`);
    const cssVar = BG_VAR_MAP[type];
    if (stored) {
      html.style.setProperty(cssVar, `url('${stored}')`);
    } else if (theme) {
      // Reset to theme default
      const def: Record<string, string> = {
        backgrounds: theme.vars["--nyx-texture"],
        sidebar:     theme.vars["--nyx-sidebar-tex"],
        cards:       theme.vars["--nyx-card-texture"],
      };
      html.style.setProperty(cssVar, def[type] || "");
    }
  });
}
function applyTheme(key: string) {
  if (typeof document === "undefined") return;
  const theme = THEMES.find(t => t.key === key);
  if (!theme) return;
  const html = document.documentElement;
  html.setAttribute("data-theme", key);
  Object.entries(theme.vars).forEach(([k, v]) => html.style.setProperty(k, v));
  applyStoredBgs(key);
}

// ─── Elegant per-theme icon — replaces the old gem/diamond cartoon ─────────
function ThemeIcon({ accent, themeKey, size = 32 }: { accent: string; themeKey: string; size?: number }) {
  const f = accent; // petal fill at low fillOpacity
  const petal = (deg: number, r: number) => {
    const a = (deg - 90) * Math.PI / 180;
    return { cx: 16 + r * Math.cos(a), cy: 16 + r * Math.sin(a) };
  };
  const icons: Record<string, React.ReactNode> = {
    luxury: (
      <>
        <path d="M6,23 L6,14 L10.5,18.5 L16,8 L21.5,18.5 L26,14 L26,23 Z"
          stroke={f} strokeWidth="1.2" strokeLinejoin="round" fill={f} fillOpacity="0.12" />
        <line x1="6" y1="23" x2="26" y2="23" stroke={f} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="16" cy="8"  r="1.3" fill={f} />
        <circle cx="6"  cy="14" r="0.9" fill={f} fillOpacity="0.65" />
        <circle cx="26" cy="14" r="0.9" fill={f} fillOpacity="0.65" />
      </>
    ),
    glass: (
      <>
        <polygon points="16,4 26,10 26,22 16,28 6,22 6,10"
          stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.10" strokeLinejoin="round" />
        <line x1="6" y1="10" x2="26" y2="22" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" />
        <circle cx="16" cy="16" r="1.6" fill={f} fillOpacity="0.85" />
      </>
    ),
    emerald: (
      <>
        <path d="M16,4 C22,8 24,16 16,28 C8,16 10,8 16,4 Z"
          stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.12" />
        <line x1="16" y1="6" x2="16" y2="26" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M16,13 C18,12 20,14 21,16" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
        <path d="M16,19 C14,18 12,20 11,22" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
      </>
    ),
    violet: (
      <>
        <ellipse cx="16" cy="10" rx="3" ry="7" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <ellipse cx="16" cy="22" rx="3" ry="7" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <ellipse cx="10" cy="16" rx="7" ry="3" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <ellipse cx="22" cy="16" rx="7" ry="3" stroke={f} strokeWidth="1.1" fill={f} fillOpacity="0.10" />
        <circle cx="16" cy="16" r="2.2" fill={f} fillOpacity="0.9" />
      </>
    ),
    hotpink: (
      <>
        {[0,72,144,216,288].map((deg, i) => {
          const { cx, cy } = petal(deg, 7);
          return <ellipse key={i} cx={cx} cy={cy} rx="3" ry="4.5"
            transform={`rotate(${deg}, ${cx}, ${cy})`}
            stroke={f} strokeWidth="1" fill={f} fillOpacity="0.14" />;
        })}
        <circle cx="16" cy="16" r="2.5" fill={f} fillOpacity="0.85" />
      </>
    ),
    rose: (
      <>
        <path d="M16,26 C8,20 4,14 7,9 C9,6 13,6 16,10 C19,6 23,6 25,9 C28,14 24,20 16,26 Z"
          stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.12" strokeLinejoin="round" />
        <path d="M10,11 C10,9 12,8 14,10" stroke={f} strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
      </>
    ),
    light: (
      <>
        <circle cx="16" cy="16" r="5" stroke={f} strokeWidth="1.2" fill={f} fillOpacity="0.12" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const a = deg * Math.PI / 180;
          return <line key={i}
            x1={16 + 7  * Math.cos(a)} y1={16 + 7  * Math.sin(a)}
            x2={16 + 11 * Math.cos(a)} y2={16 + 11 * Math.sin(a)}
            stroke={f} strokeWidth={i % 2 === 0 ? "1.1" : "0.7"} strokeLinecap="round" />;
        })}
      </>
    ),
    blush: (
      <>
        {[0,60,120,180,240,300].map((deg, i) => {
          const { cx, cy } = petal(deg, 7);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.8" ry="4"
            transform={`rotate(${deg}, ${cx}, ${cy})`}
            stroke={f} strokeWidth="1" fill={f} fillOpacity="0.12" />;
        })}
        <circle cx="16" cy="16" r="2.2" fill={f} fillOpacity="0.8" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {icons[themeKey] ?? icons.luxury}
    </svg>
  );
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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [activeTheme, setActiveTheme]     = useState("luxury");
  const [orgName, setOrgName]             = useState("NyxAegis");
  const [supportEmail, setSupportEmail]   = useState("support@nyxaegis.com");
  const [notifs, setNotifs]               = useState({ email: true, push: false, digest: true, leads: true, contracts: false });
  const [devMsg, setDevMsg]               = useState("");
  const [devLoading, setDevLoading]       = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [saved, setSaved]                 = useState(false);
  // Background picker state
  const [bgTab, setBgTab]               = useState<"backgrounds" | "sidebar" | "cards">("backgrounds");
  const [bgAssets, setBgAssets]         = useState<string[]>([]);
  const [bgLoading, setBgLoading]       = useState(false);
  const [bgSelections, setBgSelections] = useState<Record<string, string>>({});

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
    // Load stored bg selections
    const sels: Record<string, string> = {};
    THEMES.forEach(t => {
      ["backgrounds", "sidebar", "cards"].forEach(type => {
        const k = `nyxaegis-bg-${t.key}-${type}`;
        const v = localStorage.getItem(k);
        if (v) sels[k] = v;
      });
    });
    setBgSelections(sels);
  }, []);

  // Fetch available images whenever theme or tab changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    setBgLoading(true);
    fetch(`/api/theme-assets?theme=${activeTheme}&type=${bgTab}`)
      .then(r => r.json()).then(setBgAssets).catch(() => setBgAssets([]))
      .finally(() => setBgLoading(false));
  }, [activeTheme, bgTab]);

  function selectTheme(key: string) {
    setActiveTheme(key);
    localStorage.setItem("nyxaegis-theme", key);
    applyTheme(key);
  }

  function selectBg(url: string) {
    const lsKey  = `nyxaegis-bg-${activeTheme}-${bgTab}`;
    const cssVar = BG_VAR_MAP[bgTab];
    const theme  = THEMES.find(t => t.key === activeTheme);
    if (url) {
      localStorage.setItem(lsKey, url);
      document.documentElement.style.setProperty(cssVar, `url('${url}')`);
    } else {
      localStorage.removeItem(lsKey);
      const def: Record<string, string> = {
        backgrounds: theme?.vars["--nyx-texture"]     ?? "none",
        sidebar:     theme?.vars["--nyx-sidebar-tex"] ?? "",
        cards:       theme?.vars["--nyx-card-texture"] ?? "none",
      };
      document.documentElement.style.setProperty(cssVar, def[bgTab]);
    }
    setBgSelections((prev: Record<string, string>) => ({ ...prev, [lsKey]: url }));
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
                {/* Theme icon */}
                <div style={{ position: "relative", width: 32, height: 32, margin: "0 auto 10px" }}>
                  <ThemeIcon accent={t.accent} themeKey={t.key} />
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
          <ThemeIcon accent={curTheme.accent} themeKey={curTheme.key} size={18} />
          <span style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)" }}>
            Active: <strong style={{ color: curTheme.accent }}>{curTheme.label}</strong>
            <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: "0.72rem", opacity: 0.7 }}>{curTheme.accent}</span>
          </span>
        </div>
      </Section>

      {/* BACKGROUNDS */}
      <Section title="Backgrounds &amp; Textures">
        <p style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", marginBottom: 14 }}>
          Customize the body, sidebar, and card textures for{" "}
          <strong style={{ color: curTheme.accent }}>{curTheme.label}</strong>.{" "}
          Drop images into{" "}
          <code style={{ fontFamily: "monospace", fontSize: "0.7rem", opacity: 0.8 }}>public/themes/{activeTheme}/</code>{" "}
          to add more options.
        </p>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["backgrounds", "sidebar", "cards"] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setBgTab(tab)} style={{
              background: bgTab === tab ? "var(--nyx-accent-dim)" : "transparent",
              border: `1px solid ${bgTab === tab ? "var(--nyx-accent-mid)" : "var(--nyx-border)"}`,
              borderRadius: 7, padding: "5px 14px", cursor: "pointer", fontSize: "0.78rem",
              color: bgTab === tab ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
              fontWeight: bgTab === tab ? 700 : 400, transition: "all 0.15s",
            }}>
              {tab === "backgrounds" ? "Body" : tab === "sidebar" ? "Sidebar" : "Cards"}
            </button>
          ))}
        </div>
        {/* Thumbnails */}
        {bgLoading ? (
          <div style={{ fontSize: "0.78rem", color: "var(--nyx-text-muted)", padding: "16px 0" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
            {/* Clear / default */}
            <button type="button" onClick={() => selectBg("")} style={{
              flexShrink: 0, width: 72, height: 72, borderRadius: 8, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer",
              background: !bgSelections[`nyxaegis-bg-${activeTheme}-${bgTab}`] ? "var(--nyx-accent-dim)" : "rgba(0,0,0,0.25)",
              border: `2px solid ${!bgSelections[`nyxaegis-bg-${activeTheme}-${bgTab}`] ? "var(--nyx-accent)" : "var(--nyx-border)"}`,
              color: "var(--nyx-text-muted)", fontSize: "0.65rem", fontWeight: 600, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>∅</span>
              Default
            </button>
            {bgAssets.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", padding: "22px 10px", lineHeight: 1.7, alignSelf: "center" }}>
                No images yet. Add images to{" "}
                <code style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>public/themes/{activeTheme}/{bgTab}/</code>
              </div>
            ) : bgAssets.map(url => {
              const isSelected = bgSelections[`nyxaegis-bg-${activeTheme}-${bgTab}`] === url;
              return (
                <button key={url} type="button" onClick={() => selectBg(url)} title={url.split("/").pop()} style={{
                  flexShrink: 0, width: 80, height: 72, borderRadius: 8, cursor: "pointer",
                  backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center",
                  border: `2px solid ${isSelected ? "var(--nyx-accent)" : "transparent"}`,
                  outline: isSelected ? "2px solid var(--nyx-accent-mid)" : "none",
                  outlineOffset: 2,
                  boxShadow: isSelected ? "0 0 14px var(--nyx-accent-glow)" : "0 2px 8px rgba(0,0,0,0.4)",
                  transition: "all 0.15s",
                }} />
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: "0.68rem", color: "var(--nyx-text-muted)", opacity: 0.6 }}>
          ▸ <code style={{ fontFamily: "monospace" }}>public/themes/{activeTheme}/{bgTab}/</code>
        </div>
      </Section>

      {/*  ORGANISATION  */}
      <Section title="Organization">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>ORG / BRAND NAME</label>
            <input style={inp} value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)", display: "block", marginBottom: 4 }}>SUPPORT EMAIL</label>
            <input style={inp} type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={saveOrg} style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 7, padding: "8px 22px", color: "var(--nyx-accent)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}>{saved ? "Saved \u2713" : "Save Changes"}</button>
        </div>
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
        {/* Admin-only warning banner */}
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: 9, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: "1.1rem", lineHeight: "1.3", flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f87171", letterSpacing: "0.06em", marginBottom: 4 }}>ADMIN / OWNER ACCESS ONLY</div>
            <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", lineHeight: 1.55 }}>
              Destructive actions are <strong style={{ color: "#f87171" }}>permanent and irreversible</strong>. Clear All Data will permanently delete every record — no undo, no backup, no recovery.
            </div>
          </div>
        </div>
        {!isAdmin && (
          <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.20)", borderRadius: 7, padding: "9px 14px", marginBottom: 14, fontSize: "0.78rem", color: "#f87171", fontWeight: 600 }}>
            🔒 You do not have permission to perform destructive actions. Admin or Owner role required.
          </div>
        )}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(251,191,36,0.18)", opacity: isAdmin ? 1 : 0.45 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fbbf24" }}>Clear Demo Data</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.30)", borderRadius: 4, padding: "2px 6px", color: "#fbbf24", letterSpacing: "0.05em" }}>ADMIN ONLY</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 2 }}>Removes demo leads, opportunities, activities, invoices, and contracts</div>
            </div>
            {confirmAction === "clear-demo"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 7, padding: "7px 14px", color: "#fbbf24", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8rem" }}>{devLoading === "clear-demo" ? "Clearing\u2026" : "Confirm"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-demo")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 7, padding: "8px 18px", color: "#fbbf24", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8rem" }}>Clear Demo</button>
            }
          </div>

          {/* Clear All */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(248,113,113,0.04)", borderRadius: 9, padding: "14px 18px", border: "1px solid rgba(248,113,113,0.28)", opacity: isAdmin ? 1 : 0.45 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#f87171" }}>Clear All Data</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.40)", borderRadius: 4, padding: "2px 6px", color: "#f87171", letterSpacing: "0.06em" }}>EXTREME CAUTION</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: 4, padding: "2px 6px", color: "#f87171", letterSpacing: "0.05em" }}>ADMIN ONLY</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--nyx-text-muted)", marginTop: 4, lineHeight: 1.5 }}>Permanently wipes <strong style={{ color: "#f87171" }}>ALL</strong> records &mdash; leads, opps, invoices, contracts, activities. <strong style={{ color: "#f87171" }}>No undo. No recovery.</strong></div>
            </div>
            {confirmAction === "clear-all"
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => devAction("clear-all")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.45)", borderRadius: 7, padding: "7px 14px", color: "#f87171", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 800, fontSize: "0.8rem" }}>{devLoading === "clear-all" ? "Wiping\u2026" : "\u26a0 Confirm \u2014 Wipe Everything"}</button>
                  <button onClick={() => setConfirmAction(null)} style={{ background: "none", border: "1px solid var(--nyx-border)", borderRadius: 7, padding: "7px 12px", color: "var(--nyx-text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              : <button onClick={() => devAction("clear-all")} disabled={devLoading !== null || !isAdmin} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 7, padding: "8px 18px", color: "#f87171", cursor: isAdmin ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8rem" }}>Clear All</button>
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
