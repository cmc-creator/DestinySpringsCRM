import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SettingsClient from "@/components/settings/SettingsClient";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "REP":
      return "/rep/dashboard";
    case "ACCOUNT":
      return "/account/dashboard";
    default:
      return "/login";
  }
}

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const homeHref = getRoleHome(session.user.role);

  return (
    <main style={{ minHeight: "100vh", background: "var(--nyx-bg-scrim, var(--nyx-bg))", color: "var(--nyx-text)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "var(--nyx-accent)", opacity: 0.58, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Personal Portal</p>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>My Account</h1>
          </div>
          <Link href={homeHref} style={{ color: "var(--nyx-accent)", textDecoration: "none", border: "1px solid var(--nyx-accent-mid)", borderRadius: 999, padding: "10px 14px", fontSize: "0.8rem", fontWeight: 700, background: "var(--nyx-accent-dim)" }}>
            Back to workspace
          </Link>
        </div>
        <SettingsClient personalMode />
      </div>
    </main>
  );
}