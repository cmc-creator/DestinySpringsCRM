import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import InquiryFormClient from "./InquiryFormClient";

const TEXT  = "var(--nyx-text)";
const MUTED = "var(--nyx-text-muted)";
const LBL   = "var(--nyx-accent-label)";
const CARD  = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const CYAN  = "var(--nyx-accent)";

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  SUBMITTED:     { color: "#fbbf24", label: "Submitted" },
  UNDER_REVIEW:  { color: "#60a5fa", label: "Under Review" },
  CONVERTED:     { color: "#34d399", label: "Converted ✓" },
  DECLINED:      { color: "#f87171", label: "Declined" },
  ON_HOLD:       { color: "#a78bfa", label: "On Hold" },
};

export const dynamic = "force-dynamic";

export default async function RepInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const view = resolvedSearchParams.view === "new" ? "new" : "list";

  const [hospitals, referralSources, myAssessments] = await Promise.all([
    prisma.hospital.findMany({ select: { id: true, hospitalName: true }, orderBy: { hospitalName: "asc" } }),
    prisma.referralSource.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.preAssessment.findMany({
      where: { submittedById: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: LBL, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Admissions Intake / Inquiry</h1>
        <p style={{ color: MUTED, fontSize: "0.875rem", marginTop: 4 }}>Submit a patient pre-assessment for clinical review</p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <Link href="/rep/inquiry" style={{
          padding: "7px 18px", borderRadius: 8, fontWeight: 700, fontSize: "0.83rem",
          textDecoration: "none",
          background: view === "list" ? "var(--nyx-accent-dim)" : "rgba(0,0,0,0.2)",
          border: `1px solid ${view === "list" ? "var(--nyx-accent-str)" : "var(--nyx-accent-dim)"}`,
          color: view === "list" ? CYAN : MUTED,
        }}>My Submissions</Link>
        <Link href="/rep/inquiry?view=new" style={{
          padding: "7px 18px", borderRadius: 8, fontWeight: 700, fontSize: "0.83rem",
          textDecoration: "none",
          background: view === "new" ? "var(--nyx-accent-dim)" : "rgba(0,0,0,0.2)",
          border: `1px solid ${view === "new" ? "var(--nyx-accent-str)" : "var(--nyx-accent-dim)"}`,
          color: view === "new" ? CYAN : MUTED,
        }}>+ New Submission</Link>
      </div>

      {view === "new" ? (
        <InquiryFormClient hospitals={hospitals} referralSources={referralSources} />
      ) : (
        <div>
          {myAssessments.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 48, textAlign: "center", color: MUTED }}>
              No pre-assessments submitted yet.{" "}
              <Link href="/rep/inquiry?view=new" style={{ color: CYAN, fontWeight: 700 }}>Submit your first</Link>.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {myAssessments.map(a => {
                const badge = STATUS_BADGE[a.status] ?? { color: MUTED, label: a.status };
                return (
                  <div key={a.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: TEXT }}>
                        Patient: {a.patientInitials ?? "—"} &nbsp;·&nbsp; Age: {a.patientAge ?? "—"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: MUTED, marginTop: 3 }}>
                        Urgency: <strong style={{ color: a.urgencyLevel === "EMERGENT" ? "#f87171" : a.urgencyLevel === "URGENT" ? "#fbbf24" : MUTED }}>{a.urgencyLevel}</strong>
                        &nbsp;·&nbsp; Submitted {new Date(a.createdAt).toLocaleDateString()}
                      </div>
                      {a.reviewNotes && <div style={{ fontSize: "0.75rem", color: MUTED, marginTop: 4 }}>Review note: {a.reviewNotes}</div>}
                    </div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: badge.color, background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
