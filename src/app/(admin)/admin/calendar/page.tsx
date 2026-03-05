import { prisma } from "@/lib/prisma";
import CalendarClient from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
  const [hospitals, reps] = await Promise.all([
    prisma.hospital.findMany({
      select: { id: true, hospitalName: true },
      orderBy: { hospitalName: "asc" },
    }),
    prisma.rep.findMany({
      include: { user: { select: { name: true, email: true } } },
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const TEXT = "#d8e8f4";
  const TEXT_MUTED = "rgba(216,232,244,0.55)";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "rgba(0,212,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>COMMAND</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Calendar</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Scheduled meetings, demos, and site visits</p>
      </div>
      <CalendarClient hospitals={hospitals} reps={reps} />
    </div>
  );
}
