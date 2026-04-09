import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import AIChatWidget from "@/components/ai/AIChatWidget";
import QuickLogWidget from "@/components/activities/QuickLogWidget";
import FirstLoginCelebration from "@/components/onboarding/FirstLoginCelebration";
import OnboardingWalkthrough from "@/components/onboarding/OnboardingWalkthrough";
import SessionTracker from "@/components/analytics/SessionTracker";
import SsoConnectedBanner from "@/components/layout/SsoConnectedBanner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  let session;
  try { session = await auth(); } catch { redirect("/login"); }
  if (!session || (session.user.role !== "REP" && session.user.role !== "ADMIN")) redirect("/login");

  let rep: { id: string } | null = null;
  try {
    rep = await prisma.rep.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  } catch {
    // non-fatal — layout still renders; quick log widget will be disabled
  }

  return (
    <div className="flex min-h-screen" style={{ color: "var(--nyx-text)" }}>
      <Sidebar role="REP" userName={session.user.name} userEmail={session.user.email} />
      <main className="flex-1 overflow-auto" style={{ background: "var(--nyx-bg-scrim, var(--nyx-bg))" }}>
        <div className="px-4 pt-14 pb-4 md:p-8 page-enter">{children}</div>
      </main>
      <FirstLoginCelebration role="REP" userName={session.user.name} userEmail={session.user.email} />
      <OnboardingWalkthrough role="REP" />
      <AIChatWidget />
      <QuickLogWidget role="REP" repId={rep?.id} />
      <SessionTracker />
      <SsoConnectedBanner />
    </div>
  );
}