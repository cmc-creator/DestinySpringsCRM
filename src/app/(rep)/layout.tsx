import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import AIChatWidget from "@/components/ai/AIChatWidget";
import GlobalSearch from "@/components/search/GlobalSearch";
import QuickLogWidget from "@/components/activities/QuickLogWidget";

export const dynamic = "force-dynamic";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  let session;
  try { session = await auth(); } catch { redirect("/login"); }
  if (!session || (session.user.role !== "REP" && session.user.role !== "ADMIN")) redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ color: "var(--nyx-text)" }}>
      <Sidebar role="REP" userName={session.user.name} userEmail={session.user.email} />
      <main className="flex-1 overflow-auto" style={{ background: "var(--nyx-bg-scrim, var(--nyx-bg))" }}>
        <div className="px-4 pt-0 pb-4 md:p-8 page-enter">{children}</div>
      </main>
      <AIChatWidget />
      <GlobalSearch role="REP" />
      <QuickLogWidget role="REP" />
    </div>
  );
}
