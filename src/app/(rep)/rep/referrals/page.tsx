import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RepReferralsClient from "./RepReferralsClient";

export const dynamic = "force-dynamic";

const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CYAN   = "var(--nyx-accent)";

function extractDischargeDestination(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Referred Out To:\s*(.+)$/im);
  return match?.[1]?.trim() || null;
}

export default async function RepReferralsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "REP" && session.user.role !== "ADMIN") redirect("/unauthorized");

  // Find the rep record for this user
  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!rep) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: MUTED }}>No rep profile found for your account. Contact your admin.</p>
      </div>
    );
  }

  const referrals = await prisma.referral.findMany({
    where: {
      referralSource: {
        assignedRepId: rep.id,
      },
    },
    include: {
      referralSource: {
        select: { id: true, name: true, type: true, specialty: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = referrals.map((r) => ({
    id: r.id,
    status: r.status,
    patientInitials: r.patientInitials ?? null,
    admissionDate: r.admissionDate?.toISOString() ?? null,
    dischargeDate: r.dischargeDate?.toISOString() ?? null,
    serviceLine: r.serviceLine ?? null,
    dischargeDestination: extractDischargeDestination(r.notes),
    referralSource: {
      id: r.referralSource.id,
      name: r.referralSource.name,
      type: r.referralSource.type,
      specialty: r.referralSource.specialty ?? null,
    },
  }));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: CYAN, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>My Pipeline</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Referral Log</h1>
        <p style={{ color: MUTED, fontSize: "0.875rem", marginTop: 4 }}>
          Admissions referred through your assigned sources.
        </p>
      </div>
      <RepReferralsClient referrals={enriched} />
    </div>
  );
}
