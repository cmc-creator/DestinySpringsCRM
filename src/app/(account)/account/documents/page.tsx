import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYAN      = "var(--nyx-accent)";
const CARD      = "var(--nyx-card)";
const BORDER    = "var(--nyx-accent-dim)";
const TEXT      = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const STATUS_COLORS: Record<string, string> = {
  DRAFT:   "#94a3b8",
  PENDING: "#fbbf24",
  SIGNED:  "#34d399",
  ACTIVE:  "#34d399",
  EXPIRED: "#f87171",
  VOIDED:  "#94a3b8",
};

export default async function AccountDocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const hospital = await prisma.hospital.findUnique({
    where: { userId: session.user.id },
    include: {
      contracts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!hospital) redirect("/login");

  const active   = hospital.contracts.filter((c) => ["ACTIVE", "SIGNED"].includes(c.status)).length;
  const pending  = hospital.contracts.filter((c) => ["DRAFT", "SENT"].includes(c.status)).length;
  const expired  = hospital.contracts.filter((c) => ["EXPIRED", "TERMINATED"].includes(c.status)).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>PARTNER PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Documents & Contracts</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Agreements and contracts on file for {hospital.hospitalName}</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Active / Signed", value: active,  color: "#34d399" },
          { label: "Pending Review",  value: pending, color: "#fbbf24" },
          { label: "Expired",         value: expired, color: "#f87171" },
          { label: "Total Documents", value: hospital.contracts.length, color: CYAN },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 22px" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: TEXT_MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24, padding: "16px 18px", background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.22)", borderRadius: 12 }}>
        <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>PHI-enabled integrations require approval first</div>
        <p style={{ color: TEXT_MUTED, fontSize: "0.8rem", lineHeight: 1.7, margin: 0 }}>
          If your organization plans to connect documents or integrations that may contain Protected Health Information, those workflows must stay within an executed BAA and an approved implementation scope. Do not place PHI into general notes, unapproved uploads, exports, or other workflows until that approval is in place.
        </p>
      </div>

      {hospital.contracts.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", color: TEXT_MUTED }}>
          No contracts on file yet. Contact your Destiny Springs liaison to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {hospital.contracts.map((contract) => (
            <div
              key={contract.id}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "18px 22px",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>
                  {contract.title}
                </div>
                {contract.terms && (
                  <div style={{ color: TEXT_MUTED, fontSize: "0.78rem", maxWidth: 520, lineHeight: 1.5 }}>
                    {contract.terms}
                  </div>
                )}
                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  {contract.startDate && (
                    <span style={{ fontSize: "0.73rem", color: TEXT_MUTED }}>
                      Start: <span style={{ color: TEXT }}>{formatDate(contract.startDate.toISOString())}</span>
                    </span>
                  )}
                  {contract.endDate && (
                    <span style={{ fontSize: "0.73rem", color: TEXT_MUTED }}>
                      End: <span style={{ color: TEXT }}>{formatDate(contract.endDate.toISOString())}</span>
                    </span>
                  )}
                  {contract.value != null && Number(contract.value) > 0 && (
                    <span style={{ fontSize: "0.73rem", color: TEXT_MUTED }}>
                      Value: <span style={{ color: "#34d399", fontWeight: 700 }}>
                        ${Number(contract.value).toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    background: `${STATUS_COLORS[contract.status] ?? "#94a3b8"}18`,
                    border: `1px solid ${STATUS_COLORS[contract.status] ?? "#94a3b8"}55`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: STATUS_COLORS[contract.status] ?? "#94a3b8",
                    letterSpacing: "0.06em",
                  }}
                >
                  {contract.status}
                </span>
                <div style={{ fontSize: "0.7rem", color: TEXT_MUTED, marginTop: 6 }}>
                  Updated {formatDate(contract.updatedAt.toISOString())}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32, padding: "18px 20px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 10 }}>
        <p style={{ color: TEXT_MUTED, fontSize: "0.8rem", margin: 0 }}>
          Questions about a contract or need to request an amendment?{" "}
          <span style={{ color: CYAN }}>Contact your liaison</span> or reach us at{" "}
          <span style={{ color: CYAN }}>partnerships@destinysprings.com</span>
        </p>
      </div>
    </div>
  );
}
