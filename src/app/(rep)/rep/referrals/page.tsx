import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CYAN   = "var(--nyx-accent)";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  RECEIVED:  { bg: "rgba(201,168,76,0.12)",   text: "var(--nyx-accent)" },
  ADMITTED:  { bg: "rgba(16,185,129,0.12)",   text: "#34d399" },
  DECLINED:  { bg: "rgba(239,68,68,0.12)",    text: "#f87171" },
  PENDING:   { bg: "rgba(245,158,11,0.12)",   text: "#fbbf24" },
  DUPLICATE: { bg: "rgba(148,163,184,0.08)",  text: "#94a3b8" },
};

function fmt(d?: Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
    ...r,
    dischargeDestination: extractDischargeDestination(r.notes),
  }));

  const total    = enriched.length;
  const admitted = enriched.filter((r) => r.status === "ADMITTED").length;
  const pending  = enriched.filter((r) => r.status === "PENDING" || r.status === "RECEIVED").length;
  const declined = enriched.filter((r) => r.status === "DECLINED").length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: CYAN, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>My Pipeline</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Referral Log</h1>
        <p style={{ color: MUTED, fontSize: "0.875rem", marginTop: 4 }}>
          Admissions referred through your assigned sources.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Referrals", value: total, color: CYAN },
          { label: "Admitted",        value: admitted, color: "#34d399" },
          { label: "Pending / New",   value: pending,  color: "#fbbf24" },
          { label: "Declined",        value: declined, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div className="nyx-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Referring Source", "Patient", "Service Line", "Admitted", "Discharged", "Referred Out To", "Status"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: "0.875rem" }}>
                    No referrals found for your assigned sources yet.
                  </td>
                </tr>
              )}
              {enriched.map((r) => {
                const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.RECEIVED;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: TEXT }}>{r.referralSource.name}</div>
                      <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: 2 }}>
                        {r.referralSource.type}{r.referralSource.specialty ? ` · ${r.referralSource.specialty}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "0.875rem", color: TEXT }}>
                      {r.patientInitials ?? <span style={{ color: MUTED }}>-</span>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "0.85rem", color: MUTED }}>
                      {r.serviceLine ?? "-"}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "0.85rem", color: MUTED, whiteSpace: "nowrap" }}>
                      {fmt(r.admissionDate)}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "0.85rem", color: MUTED, whiteSpace: "nowrap" }}>
                      {fmt(r.dischargeDate)}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "0.85rem", color: MUTED }}>
                      {r.dischargeDestination ?? "-"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
