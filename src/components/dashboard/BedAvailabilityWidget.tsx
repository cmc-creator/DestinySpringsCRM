import { prisma } from "@/lib/prisma";

const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT_MUTED = "var(--nyx-text-muted)";

const UNITS = [
  { key: "adult",       label: "Adult",         totalKey: "adultTotal",       availKey: "adultAvailable" },
  { key: "adolescent",  label: "Adolescent",     totalKey: "adolescentTotal",  availKey: "adolescentAvailable" },
  { key: "geriatric",   label: "Geriatric",      totalKey: "geriatricTotal",   availKey: "geriatricAvailable" },
  { key: "dualDx",      label: "Dual Diagnosis", totalKey: "dualDxTotal",      availKey: "dualDxAvailable" },
] as const;

function bedColor(available: number): string {
  if (available >= 3) return "#34d399"; // green
  if (available >= 1) return "#fbbf24"; // yellow
  return "#f87171"; // red / full
}

export default async function BedAvailabilityWidget() {
  let census: {
    date: Date;
    adultTotal: number; adultAvailable: number;
    adolescentTotal: number; adolescentAvailable: number;
    geriatricTotal: number; geriatricAvailable: number;
    dualDxTotal: number; dualDxAvailable: number;
    note: string | null;
  } | null = null;

  try {
    census = await prisma.censusSnapshot.findFirst({ orderBy: { date: "desc" } });
  } catch {
    census = null;
  }

  const totalAvailable = census
    ? census.adultAvailable + census.adolescentAvailable + census.geriatricAvailable + census.dualDxAvailable
    : 0;

  const statusColor =
    !census ? "#6b7280"
    : totalAvailable >= 5 ? "#34d399"
    : totalAvailable >= 2 ? "#fbbf24"
    : "#f87171";

  const statusLabel =
    !census ? "No census data"
    : totalAvailable >= 5 ? "Beds available"
    : totalAvailable >= 2 ? "Limited capacity"
    : totalAvailable === 0 ? "No beds available"
    : "1 bed available";

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: "20px 22px",
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
            LIVE BED AVAILABILITY
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block", boxShadow: `0 0 6px ${statusColor}99` }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: statusColor }}>{statusLabel}</span>
          </div>
        </div>
        {census && (
          <span style={{ fontSize: "0.68rem", color: TEXT_MUTED }}>
            Updated {census.date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Unit grid */}
      {census ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
          {UNITS.map(({ key, label, totalKey, availKey }) => {
            const avail = census[availKey];
            const total = census[totalKey];
            const pct = total > 0 ? avail / total : 0;
            const color = bedColor(avail);

            return (
              <div key={key} style={{
                background: "rgba(0,0,0,0.2)",
                border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: 10,
                padding: "14px 14px 10px",
              }}>
                <p style={{ fontSize: "0.68rem", color: TEXT_MUTED, marginBottom: 8, fontWeight: 600 }}>{label}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 6 }}>
                  <span style={{ fontSize: "1.7rem", fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 12px ${color}66` }}>
                    {avail}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: TEXT_MUTED, fontWeight: 500 }}>/ {total}</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round(pct * 100)}%`,
                    background: color,
                    borderRadius: 2,
                    boxShadow: `0 0 6px ${color}66`,
                    transition: "width 0.6s ease",
                  }} />
                </div>
                <p style={{ fontSize: "0.63rem", color, marginTop: 5, fontWeight: 600 }}>
                  {avail === 0 ? "Full" : `${avail} open`}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "18px 0", textAlign: "center", color: TEXT_MUTED, fontSize: "0.82rem" }}>
          No census data entered today.{" "}
          <span style={{ color: "var(--nyx-accent)", fontSize: "0.78rem" }}>
            Ask admin to update census.
          </span>
        </div>
      )}

      {census?.note && (
        <p style={{ marginTop: 12, fontSize: "0.75rem", color: TEXT_MUTED, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
          📋 {census.note}
        </p>
      )}
    </div>
  );
}
