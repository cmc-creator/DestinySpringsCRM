"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

const CYAN       = "var(--nyx-accent)";
const BORDER     = "var(--nyx-border)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const TEXT       = "var(--nyx-text)";
const ACCENT_DIM = "var(--nyx-accent-dim)";
const ACCENT_MID = "var(--nyx-accent-mid)";
const ACCENT_STR = "var(--nyx-accent-str)";
const ACCENT_LBL = "var(--nyx-accent-label)";

// ΓöÇΓöÇΓöÇ Diamond bullet ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// A tiny faceted gem SVG ΓÇö crown, girdle, pavillon, table highlight, culet.
// `tint` shifts the colour channel so each group looks like a different cut.
function DiamondBullet({ active, tint = "accent" }: { active: boolean; tint?: string }) {
  const base    = active ? "var(--nyx-accent)"     : "var(--nyx-text-muted)";
  const fill    = active ? "var(--nyx-accent-mid)"  : "var(--nyx-accent-dim)";
  const table   = active ? "var(--nyx-accent-str)"  : "rgba(255,255,255,0.06)";
  const sparkle = active ? "var(--nyx-accent)"      : "rgba(255,255,255,0.25)";
  const glow    = active ? "var(--nyx-accent-glow)" : "transparent";
  // tint filter per group so diamonds look like different stones
  const hueMap: Record<string, string> = {
    accent:  "hue-rotate(0deg)",
    blue:    "hue-rotate(200deg)",
    green:   "hue-rotate(110deg)",
    purple:  "hue-rotate(260deg)",
    red:     "hue-rotate(330deg)",
    orange:  "hue-rotate(25deg)",
    cyan:    "hue-rotate(175deg)",
    pink:    "hue-rotate(300deg)",
  };
  return (
    <svg
      width="14" height="16" viewBox="0 0 14 16" fill="none"
      style={{
        flexShrink: 0,
        filter: `drop-shadow(0 0 ${active ? "4px" : "1px"} ${glow}) ${hueMap[tint] ?? ""}`,
        transition: "filter 0.25s",
      }}
    >
      {/* Pavillon (lower body) */}
      <polygon points="1,7 7,15.5 13,7"
        fill={fill} stroke={base} strokeWidth="0.7" strokeOpacity="0.7" />
      {/* Crown (upper body) */}
      <polygon points="1,7 3,2.5 7,1 11,2.5 13,7"
        fill={fill} stroke={base} strokeWidth="0.7" strokeOpacity="0.8" />
      {/* Girdle line */}
      <line x1="1" y1="7" x2="13" y2="7"
        stroke={base} strokeWidth="0.5" strokeOpacity="0.45" />
      {/* Table facet highlight */}
      <polygon points="4,4.5 7,2.2 10,4.5 8.5,6.8 5.5,6.8"
        fill={table} stroke={base} strokeWidth="0.35" strokeOpacity="0.5" />
      {/* Crown facet lines */}
      <line x1="3" y1="2.5"  x2="5.5" y2="6.8" stroke={base} strokeWidth="0.35" strokeOpacity="0.3" />
      <line x1="11" y1="2.5" x2="8.5" y2="6.8" stroke={base} strokeWidth="0.35" strokeOpacity="0.3" />
      {/* Pavillon facet lines */}
      <line x1="1"  y1="7" x2="7" y2="15.5" stroke={base} strokeWidth="0.35" strokeOpacity="0.25" />
      <line x1="13" y1="7" x2="7" y2="15.5" stroke={base} strokeWidth="0.35" strokeOpacity="0.25" />
      <line x1="5.5" y1="6.8" x2="7" y2="15.5" stroke={base} strokeWidth="0.3" strokeOpacity="0.2" />
      <line x1="8.5" y1="6.8" x2="7" y2="15.5" stroke={base} strokeWidth="0.3" strokeOpacity="0.2" />
      {/* Culet sparkle */}
      <circle cx="7" cy="4.2" r={active ? "1.1" : "0.7"}
        fill={sparkle} style={{ transition: "r 0.2s" }} />
      {/* Active: extra brilliance flare */}
      {active && (
        <>
          <line x1="7" y1="1.2" x2="7"   y2="0"   stroke={sparkle} strokeWidth="0.6" strokeOpacity="0.7" />
          <line x1="12" y1="3" x2="13.2" y2="2"   stroke={sparkle} strokeWidth="0.5" strokeOpacity="0.5" />
          <line x1="2"  y1="3" x2="0.8"  y2="2"   stroke={sparkle} strokeWidth="0.5" strokeOpacity="0.5" />
        </>
      )}
    </svg>
  );
}

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
type NavItem = { href: string; label: string; tint?: string };
type NavGroup = { group: string; tint?: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  {
    group: "Command", tint: "accent",
    items: [
      { href: "/admin/dashboard",      label: "Dashboard" },
      { href: "/admin/notifications",  label: "Notifications" },
      { href: "/admin/calendar",       label: "Calendar" },
      { href: "/admin/messages",       label: "Messages" },
    ],
  },
  {
    group: "Admission Pipeline", tint: "blue",
    items: [
      { href: "/admin/opportunities",  label: "Admissions" },
      { href: "/admin/leads",          label: "Leads" },
      { href: "/admin/activities",     label: "Activities" },
      { href: "/admin/contracts",      label: "Contracts" },
    ],
  },
  {
    group: "Referrals", tint: "cyan",
    items: [
      { href: "/admin/referrals",        label: "Referrals" },
      { href: "/admin/referral-sources", label: "Referral Sources" },
    ],
  },
  {
    group: "Accounts", tint: "green",
    items: [
      { href: "/admin/hospitals",  label: "Accounts" },
      { href: "/admin/territory",  label: "Territory Map" },
    ],
  },
  {
    group: "Reps", tint: "orange",
    items: [
      { href: "/admin/reps",           label: "Reps" },
      { href: "/admin/tasks",          label: "Tasks" },
      { href: "/admin/communications", label: "Communications" },
    ],
  },
  {
    group: "Intake", tint: "purple",
    items: [
      { href: "/admin/inquiry",    label: "Referral Intake Inbox" },
      { href: "/admin/resources",  label: "Resource Library" },
    ],
  },
  {
    group: "Administration", tint: "red",
    items: [
      { href: "/admin/reps/performance", label: "Rep Performance" },
      { href: "/admin/compliance",       label: "Compliance" },
      { href: "/admin/analytics",        label: "Analytics" },
      { href: "/admin/reports",          label: "Reports" },
      { href: "/admin/census",           label: "Census" },
      { href: "/admin/payor-mix",        label: "Payor Mix" },
      { href: "/admin/audit",            label: "Audit Log" },
      { href: "/admin/users",            label: "User Accounts" },
      { href: "/admin/import",           label: "Import Data" },
      { href: "/admin/integrations",     label: "Integrations" },
    ],
  },
  {
    group: "Settings", tint: "pink",
    items: [
      { href: "/me",                 label: "My Account" },
      { href: "/admin/settings",     label: "Settings" },
      { href: "/enterprise/destiny-springs", label: "Partner Portal" },
    ],
  },
];

const REP_NAV: NavGroup[] = [
  {
    group: "Overview", tint: "accent",
    items: [
      { href: "/rep/dashboard",     label: "Dashboard" },
      { href: "/rep/notifications", label: "Notifications" },
      { href: "/rep/messages",      label: "Messages" },
    ],
  },
  {
    group: "Pipeline", tint: "blue",
    items: [
      { href: "/rep/opportunities", label: "My Admissions" },
      { href: "/rep/territory",     label: "My Territory" },
    ],
  },
  {
    group: "Outreach", tint: "orange",
    items: [
      { href: "/rep/communications", label: "Communications" },
      { href: "/rep/activities",     label: "My Activities" },
      { href: "/rep/tasks",          label: "Tasks" },
    ],
  },
  {
    group: "Intake", tint: "purple",
    items: [
      { href: "/rep/inquiry",   label: "Referral Intake" },
      { href: "/rep/resources", label: "Resource Library" },
    ],
  },
  {
    group: "Files", tint: "cyan",
    items: [
      { href: "/rep/documents", label: "Documents" },
      { href: "/me",            label: "My Account" },
    ],
  },
];

const ACCOUNT_NAV: NavGroup[] = [
  {
    group: "Overview", tint: "accent",
    items: [
      { href: "/account/dashboard",    label: "Dashboard" },
      { href: "/account/engagements",  label: "Engagements" },
      { href: "/me",                    label: "My Account" },
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

function tourIdForHref(href: string) {
  return `tour-${href.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase()}`;
}

interface SidebarProps {
  role: string;
  userName?: string | null;
  userEmail?: string | null;
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = getNav(role);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ΓöÇΓöÇ Notification & message badges ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.ok ? r.json() : [])
      .then((list: { read: boolean }[]) => setUnreadCount(list.filter(n => !n.read).length))
      .catch(() => {});
    fetch("/api/messages")
      .then(r => r.ok ? r.json() : [])
      .then((list: { readAt: string | null }[]) => setUnreadMessages(list.filter(m => !m.readAt).length))
      .catch(() => {});
  }, [pathname]); // refresh on navigation

  // ΓöÇΓöÇ Inline search ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    hospitals: { id: string; hospitalName: string; city?: string | null; state?: string | null }[];
    leads: { id: string; hospitalName: string; contactName?: string | null }[];
    opportunities: { id: string; title: string; hospital: { hospitalName: string } }[];
    reps: { id: string; user: { name?: string | null; email?: string | null }; territory?: string | null }[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json())
        .then(d => { setSearchResults(d); setSearchLoading(false); })
        .catch(() => setSearchLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const searchItems = searchResults ? [
    ...searchResults.hospitals.map(h => ({ icon: "≡ƒÅÑ", label: h.hospitalName, sub: [h.city, h.state].filter(Boolean).join(", "), href: "/admin/hospitals", typeLabel: "Account" })),
    ...searchResults.leads.map(l => ({ icon: "≡ƒÄ»", label: l.hospitalName, sub: l.contactName ?? "", href: "/admin/leads", typeLabel: "Lead" })),
    ...searchResults.opportunities.map(o => ({ icon: "≡ƒôè", label: o.title, sub: o.hospital.hospitalName, href: "/admin/opportunities", typeLabel: "Opportunity" })),
    ...searchResults.reps.map(r => ({ icon: "≡ƒæñ", label: r.user.name ?? r.user.email ?? "", sub: r.territory ?? "", href: "/admin/reps", typeLabel: "Rep" })),
  ] : [];

  function goToResult(href: string) {
    router.push(href);
    setSearchQuery("");
    setSearchResults(null);
    setMobileOpen(false);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="nyx-hamburger"
        onClick={() => setMobileOpen(true)}
        style={{ display: "none", position: "fixed", top: 14, left: 14, zIndex: 400, background: "var(--nyx-card)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", flexDirection: "column", gap: 4 }}
        aria-label="Open menu"
      >
        <span style={{ display: "block", width: 18, height: 2, background: "var(--nyx-accent)", borderRadius: 2 }} />
        <span style={{ display: "block", width: 18, height: 2, background: "var(--nyx-accent)", borderRadius: 2 }} />
        <span style={{ display: "block", width: 18, height: 2, background: "var(--nyx-accent)", borderRadius: 2 }} />
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="nyx-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.55)", zIndex: 299 }}
        />
      )}

      <aside
        className={`nyx-sidebar${mobileOpen ? " is-open" : ""}`}
        style={{ width: 248, minHeight: "100vh", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
      >
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
            <Image src="/Aegislogo.png" alt="Destiny Springs" width={34} height={34} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: "0.95rem", color: TEXT, letterSpacing: "-0.01em", lineHeight: 1 }}>Destiny Springs</div>
            <div style={{ fontSize: "0.62rem", color: TEXT_MUTED, letterSpacing: "0.08em", marginTop: 2 }}>{role === "ADMIN" ? "ADMIN" : role === "REP" ? "BD REP" : "ACCOUNT"}</div>
          </div>
          </div>
          {/* Close button ΓÇö mobile only */}
          <button
            className="nyx-hamburger"
            onClick={() => setMobileOpen(false)}
            style={{ display: "none", background: "transparent", border: "none", cursor: "pointer", padding: "10px 12px", minWidth: 44, minHeight: 44, color: TEXT_MUTED, fontSize: "1.2rem", lineHeight: 1, borderRadius: 6 }}
            aria-label="Close menu"
          >Γ£ò</button>
        </div>
      </div>

      {/* Inline search */}
      <div style={{ padding: "8px 10px 6px", borderBottom: `1px solid ${BORDER}`, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") { setSearchQuery(""); setSearchResults(null); (e.target as HTMLInputElement).blur(); }
            }}
            onBlur={() => setTimeout(() => setSearchResults(null), 160)}
            placeholder="Search (Ctrl+K)"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${BORDER}`,
              borderRadius: 7,
              padding: "7px 10px 7px 28px",
              color: TEXT, fontSize: "0.78rem",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = CYAN)}
          />
          {searchLoading && (
            <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: "0.6rem", color: TEXT_MUTED }}>ΓÇª</span>
          )}
        </div>
        {/* Results dropdown */}
        {(searchItems.length > 0 || (searchQuery.length >= 2 && !searchLoading && searchResults !== null)) && (
          <div
            ref={searchDropRef}
            style={{
              position: "absolute",
              left: 10, right: 10,
              top: "calc(100% - 4px)",
              background: "var(--nyx-card)",
              border: `1px solid ${ACCENT_MID}`,
              borderRadius: 9,
              boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
              zIndex: 9999,
              overflow: "hidden",
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {searchItems.length === 0 ? (
              <div style={{ padding: "14px 12px", fontSize: "0.72rem", color: TEXT_MUTED, textAlign: "center" }}>
                No results for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              searchItems.slice(0, 8).map((item, i) => (
                <button
                  key={i}
                  onMouseDown={e => { e.preventDefault(); goToResult(item.href); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", background: "none", border: "none",
                    borderBottom: i < Math.min(searchItems.length, 8) - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                    cursor: "pointer", textAlign: "left", color: TEXT, transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
                    {item.sub && <div style={{ fontSize: "0.65rem", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>}
                  </div>
                  <span style={{ fontSize: "0.58rem", fontWeight: 700, color: ACCENT_LBL, background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3, flexShrink: 0 }}>{item.typeLabel}</span>
                </button>
              ))
            )}
          </div>
        )}
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
                  data-tour-id={tourIdForHref(item.href)}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "11px 8px",
                    minHeight: 44,
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
                  <DiamondBullet active={active} tint={group.tint} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.href.endsWith("/notifications") && unreadCount > 0 && (
                    <span style={{ background: CYAN, color: "#000", fontSize: "0.6rem", fontWeight: 900, borderRadius: 9, padding: "1px 5px", lineHeight: "14px", minWidth: 16, textAlign: "center" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {item.href.endsWith("/messages") && unreadMessages > 0 && (
                    <span style={{ background: "#f59e0b", color: "#000", fontSize: "0.6rem", fontWeight: 900, borderRadius: 9, padding: "1px 5px", lineHeight: "14px", minWidth: 16, textAlign: "center" }}>
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
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
          onClick={() => window.dispatchEvent(new CustomEvent("nyx:start-walkthrough", { detail: { role } }))}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "11px 7px", minHeight: 44, fontSize: "0.78rem", color: TEXT, cursor: "pointer", fontWeight: 700, marginBottom: 6 }}
        >
          Guided Tour
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event("aegis:open"))}
          style={{ width: "100%", background: ACCENT_DIM, border: `1px solid ${ACCENT_MID}`, borderRadius: 6, padding: "11px 7px", minHeight: 44, fontSize: "0.78rem", color: CYAN, cursor: "pointer", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 3 11 7.5 15.5 9 11 10.5 9.5 15 8 10.5 3.5 9 8 7.5z"/>
            <path d="M18 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>
          </svg>
          Ask Aegis AI
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6, padding: "11px 7px", minHeight: 44, fontSize: "0.78rem", color: "#f87171", cursor: "pointer", fontWeight: 500 }}
        >
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
