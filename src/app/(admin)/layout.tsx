import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import AIChatWidget from "@/components/ai/AIChatWidget";
import QuickLogWidget from "@/components/activities/QuickLogWidget";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session;
  try { session = await auth(); } catch { redirect("/login"); }
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ color: "var(--nyx-text)" }}>
      <Sidebar role="ADMIN" userName={session.user.name} userEmail={session.user.email} />
      <main className="flex-1 overflow-auto" style={{ background: "var(--nyx-bg-scrim, var(--nyx-bg))" }}>
        <div className="px-4 pt-14 pb-6 md:p-8 page-enter">{children}</div>
      </main>
      <AIChatWidget />
      <QuickLogWidget role="ADMIN" />
    </div>
  );
}
