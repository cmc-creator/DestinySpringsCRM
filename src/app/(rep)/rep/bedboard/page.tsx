import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CYAN       = "var(--nyx-accent)";
const CARD       = "var(--nyx-card)";
const BORDER     = "var(--nyx-accent-dim)";
const TEXT       = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

function pct(occ: number, total: number) {
  if (!total) return 0;
  return Math.round((occ / total) * 100);
}

function BedBar({ occupied, total, color }: { occupied: number; total: number; color: string }) {
  const p = pct(occupied, total);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.75rem" }}>
        <span style={{ color: TEXT_MUTED }}>{occupied} occupied / {total} total</span>
        <span style={{ fontWeight: 700, color }}>{p}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function RepBedboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "ACCOUNT") redirect("/unauthorized");

  const [snapshots, discharges] = await Promise.all([
    prisma.censusSnapshot.findMany({
      orderBy: { date: "desc" },
      take: 7,
    }),
    prisma.referral.findMany({
      where: {
        status: "ADMITTED",
        dischargeDate: { not: null },
      },
      orderBy: { dischargeDate: "desc" },
      take: 10,
      include: {
        referralSource: { select: { name: true } },
      },
    }),
  ]);

  const today = snapshots[0] ?? null;

  const units = today
    ? [
        { label: "Adult Psych",        total: today.adultTotal,       occupied: today.adultTotal - today.adultAvailable,       available: today.adultAvailable,       color: "#60a5fa" },
        { label: "Adolescent Psych",   total: today.adolescentTotal,  occupied: today.adolescentTotal - today.adolescentAvailable, available: today.adolescentAvailable, color: "#34d399" },
        { label: "Geriatric Psych",    total: today.geriatricTotal,   occupied: today.geriatricTotal - today.geriatricAvailable,   available: today.geriatricAvailable, color: "#fbbf24" },
        { label: "Dual Dx / Detox",    total: today.dualDxTotal,      occupied: today.dualDxTotal - today.dualDxAvailable,         available: today.dualDxAvailable,    color: "#c084fc" },
      ]
    : [];

  const totalBeds      = units.reduce((s, u) => s + u.total, 0);
  const totalAvailable = units.reduce((s, u) => s + u.available, 0);
  const totalOccupied  = units.reduce((s, u) => s + u.occupied, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REP PORTAL</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, margin: 0 }}>Bedboard & Availability</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 6 }}>
          Live bed availability — updated by admissions. Last snapshot:{" "}
          {today ? new Date(today.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "No data yet"}
        </p>
      </div>

      {!today ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", color: TEXT_MUTED }}>
          No census data available yet. Contact your admin.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: CYAN, lineHeight: 1 }}>{totalAvailable}</div>
              <div style={{ fontSize: "0.68rem", color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 5 }}>Beds Available</div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f87171", lineHeight: 1 }}>{totalOccupied}</div>
              <div style={{ fontSize: "0.68rem", color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 5 }}>Occupied</div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{pct(totalOccupied, totalBeds)}%</div>
              <div style={{ fontSize: "0.68rem", color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 5 }}>Census Rate</div>
            </div>
          </div>

          {/* Unit breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 28 }}>
            {units.map((u) => (
              <div key={u.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 18px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: TEXT, letterSpacing: "0.02em" }}>{u.label}</p>
                  <span style={{
                    background: u.available > 0 ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                    color: u.available > 0 ? "#34d399" : "#f87171",
                    borderRadius: 6, padding: "3px 10px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                  }}>
                    {u.available > 0 ? `${u.available} Open` : "Full"}
                  </span>
                </div>
                <BedBar occupied={u.occupied} total={u.total} color={u.color} />
              </div>
            ))}
          </div>

          {today.note && (
            <div style={{ background: "rgba(201,168,76,0.07)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: CYAN, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Admin Note</p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: TEXT }}>{today.note}</p>
            </div>
          )}
        </>
      )}

      {/* Recent discharges */}
      {discharges.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>RECENT DISCHARGES</p>
          </div>
          <div className="nyx-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Patient", "Source", "Service Line", "Discharge Date"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discharges.map((d) => (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "11px 14px", fontSize: "0.85rem", color: TEXT }}>{d.patientInitials ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: "0.85rem", color: TEXT_MUTED }}>{d.referralSource.name}</td>
                    <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: TEXT_MUTED }}>{d.serviceLine ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                      {d.dischargeDate ? new Date(d.dischargeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
