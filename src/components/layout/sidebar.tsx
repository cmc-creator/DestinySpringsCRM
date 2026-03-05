"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const CYAN       = "var(--nyx-accent)";
const BG_SIDEBAR = "var(--nyx-sidebar-bg)";
const BORDER     = "var(--nyx-border)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const TEXT       = "var(--nyx-text)";
const ACCENT_DIM = "var(--nyx-accent-dim)";
const ACCENT_MID = "var(--nyx-accent-mid)";
const ACCENT_STR = "var(--nyx-accent-str)";
const ACCENT_LBL = "var(--nyx-accent-label)";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { group: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  {
    group: "Command",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "⬡" },
      { href: "/admin/notifications", label: "Notifications", icon: "🔔" },
      { href: "/admin/calendar", label: "Calendar", icon: "📅" },
    ],
  },
  {
    group: "Pipeline",
    items: [
      { href: "/admin/opportunities",    label: "Opportunities",    icon: "📊" },
      { href: "/admin/leads",            label: "Leads",            icon: "🎯" },
    ],
  },
  {
    group: "Referral Tracking",
    items: [
      { href: "/admin/referral-sources", label: "Referral Sources",  icon: "👥" },
      { href: "/admin/referrals",        label: "Referrals Received",icon: "📥" },
    ],
  },
  {
    group: "Accounts",
    items: [
      { href: "/admin/hospitals", label: "Hospitals", icon: "🏥" },
      { href: "/admin/territory", label: "Territory Map", icon: "🗺️" },
    ],
  },
  {
    group: "BD Team",
    items: [
      { href: "/admin/reps", label: "BD Reps", icon: "🤝" },
    ],
  },
  {
    group: "Finance",
    items: [
      { href: "/admin/invoices", label: "Invoices", icon: "💳" },
      { href: "/admin/contracts", label: "Contracts", icon: "📝" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { href: "/admin/compliance", label: "Compliance", icon: "🛡️" },
      { href: "/admin/analytics", label: "Analytics", icon: "📈" },
      { href: "/admin/reports", label: "Reports", icon: "📋" },
    ],
  },
  {
    group: "Settings",
    items: [
      { href: "/admin/integrations", label: "Integrations", icon: "🔌" },
      { href: "/admin/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

const REP_NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { href: "/rep/dashboard", label: "Dashboard", icon: "⬡" },
      { href: "/rep/opportunities", label: "My Opportunities", icon: "📊" },
      { href: "/rep/territory", label: "My Territory", icon: "🗺️" },
    ],
  },
  {
    group: "Files",
    items: [
      { href: "/rep/documents", label: "Documents", icon: "📂" },
    ],
  },
  {
    group: "Finance",
    items: [
      { href: "/rep/payments", label: "Payments", icon: "💰" },
    ],
  },
];

const ACCOUNT_NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { href: "/account/dashboard", label: "Dashboard", icon: "⬡" },
      { href: "/account/engagements", label: "Engagements", icon: "🤝" },
    ],
  },
  {
    group: "Billing",
    items: [
      { href: "/account/invoices", label: "Invoices", icon: "💳" },
    ],
  },
];

function getNav(role: string) {
  if (role === "ADMIN") return ADMIN_NAV;
  if (role === "REP") return REP_NAV;
  return ACCOUNT_NAV;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface SidebarProps {
  role: string;
  userName?: string | null;
  userEmail?: string | null;
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const nav = getNav(role);

  return (
    <aside style={{ width: 220, minHeight: "100vh", background: BG_SIDEBAR, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            {/* Diamond gem — faceted */}
            <polygon points="16,2 30,14 16,30 2,14"
              style={{ fill: ACCENT_DIM, stroke: CYAN, strokeWidth: "1.15", strokeOpacity: "0.75" }} />
            {/* Girdle line */}
            <line x1="2" y1="14" x2="30" y2="14"
              style={{ stroke: CYAN, strokeWidth: "0.65", strokeOpacity: "0.45" }} />
            {/* Crown facets */}
            <line x1="16" y1="2" x2="9" y2="14"  style={{ stroke: CYAN, strokeWidth: "0.55", strokeOpacity: "0.35" }} />
            <line x1="16" y1="2" x2="23" y2="14" style={{ stroke: CYAN, strokeWidth: "0.55", strokeOpacity: "0.35" }} />
            <line x1="16" y1="2" x2="8" y2="8"   style={{ stroke: CYAN, strokeWidth: "0.5",  strokeOpacity: "0.28" }} />
            <line x1="16" y1="2" x2="24" y2="8"  style={{ stroke: CYAN, strokeWidth: "0.5",  strokeOpacity: "0.28" }} />
            {/* Table highlight */}
            <polygon points="11,8 16,3 21,8"
              style={{ fill: ACCENT_MID, stroke: "none" }} />
            {/* Pavillon facets */}
            <line x1="2"  y1="14" x2="10" y2="24" style={{ stroke: CYAN, strokeWidth: "0.5", strokeOpacity: "0.22" }} />
            <line x1="30" y1="14" x2="22" y2="24" style={{ stroke: CYAN, strokeWidth: "0.5", strokeOpacity: "0.22" }} />
            {/* Culet sparkle */}
            <circle cx="16" cy="10" r="1.4" style={{ fill: CYAN, fillOpacity: "0.92" }} />
          </svg>
          <div>
            <div style={{ fontWeight: 900, fontSize: "0.95rem", color: TEXT, letterSpacing: "-0.01em", lineHeight: 1 }}>NyxAegis</div>
            <div style={{ fontSize: "0.62rem", color: TEXT_MUTED, letterSpacing: "0.08em", marginTop: 2 }}>{role === "ADMIN" ? "ADMIN" : role === "REP" ? "BD REP" : "ACCOUNT"}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {nav.map((group) => (
          <div key={group.group} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: ACCENT_LBL, letterSpacing: "0.14em", textTransform: "uppercase", padding: "0 8px", marginBottom: 4 }}>{group.group}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 8px",
                    borderRadius: 7,
                    marginBottom: 1,
                    textDecoration: "none",
                    background: active ? ACCENT_DIM : "transparent",
                    color: active ? CYAN : TEXT,
                    fontSize: "0.82rem",
                    fontWeight: active ? 600 : 450,
                    transition: "all 0.15s",
                    borderLeft: active ? `2px solid ${CYAN}` : "2px solid transparent",
                  }}
                >
                  <span style={{ fontSize: "0.9rem", opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px", marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: ACCENT_MID, border: `1px solid ${ACCENT_STR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: CYAN, flexShrink: 0 }}>
            {getInitials(userName)}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName ?? "User"}</div>
            <div style={{ fontSize: "0.68rem", color: TEXT_MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6, padding: "7px", fontSize: "0.78rem", color: "#f87171", cursor: "pointer", fontWeight: 500 }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
