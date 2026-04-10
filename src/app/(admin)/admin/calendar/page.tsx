import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import CalendarClient from "@/components/calendar/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [hospitals, reps, overdueLeads, overdueOpps, msToken, googleToken] = await Promise.all([
    prisma.hospital.findMany({
      select: { id: true, hospitalName: true },
      orderBy: { hospitalName: "asc" },
    }),
    prisma.rep.findMany({
      include: { user: { select: { name: true, email: true } } },
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lead.findMany({
      where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATING"] } },
      select: { id: true, hospitalName: true, nextFollowUp: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),
    prisma.opportunity.findMany({
      where: { stage: { notIn: ["DISCHARGED", "DECLINED"] } },
      select: { id: true, title: true, nextFollowUp: true, updatedAt: true, hospital: { select: { hospitalName: true } } },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),
    userId ? prisma.integrationToken.findUnique({ where: { userId_provider: { userId, provider: "microsoft" } }, select: { id: true } }) : null,
    userId ? prisma.integrationToken.findUnique({ where: { userId_provider: { userId, provider: "google" } }, select: { id: true } }) : null,
  ]);

  const TEXT = "var(--nyx-text)";
  const TEXT_MUTED = "var(--nyx-text-muted)";
  const now = Date.now();
  const staleLeads = overdueLeads.filter((lead) => (now - new Date(lead.updatedAt).getTime()) / 86400000 > 14);
  const staleOpps = overdueOpps.filter((opp) => (now - new Date(opp.updatedAt).getTime()) / 86400000 > 14);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>COMMAND</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Calendar</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Scheduled meetings, demos, and site visits</p>
      </div>
      {(staleLeads.length > 0 || staleOpps.length > 0) && (
        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Untouched For 14+ Days
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: TEXT }}>
            <div style={{ fontSize: "0.85rem" }}>{staleLeads.length} leads need touch</div>
            <div style={{ fontSize: "0.85rem" }}>{staleOpps.length} opportunities need touch</div>
          </div>
        </div>
      )}
      <CalendarClient hospitals={hospitals} reps={reps} hasMsToken={!!msToken} hasGoogleToken={!!googleToken} />
    </div>
  );
}
