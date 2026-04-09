import { prisma } from "@/lib/prisma";

const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const MUTED  = "var(--nyx-text-muted)";
const GOLD   = "var(--nyx-accent)";
const TEXT   = "var(--nyx-text)";

function bedColor(available: number): string {
  if (available >= 3) return "#34d399";
  if (available >= 1) return "#fbbf24";
  return "#f87171";
}

async function getCensus() {
  try {
    const rows = await prisma.censusSnapshot.findMany({ orderBy: { date: "desc" }, take: 14 });
    return { today: rows[0] ?? null, trend: [...rows].reverse() };
  } catch {
    return { today: null, trend: [] };
  }
}

async function getDischargeData(repId?: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  try {
    const referrals = await prisma.referral.findMany({
      where: {
        dischargeDate: { gte: since },
        notes: { not: null },
        ...(repId
          ? { referralSource: { assignedRepId: repId } }
          : {}),
      },
      select: { notes: true },
      take: 500,
    });

    const destinationCounts = new Map<string, number>();
    const providerCounts = new Map<string, number>();

    const destRe     = /Discharge(?:\s+Destination|s?\s+To):\s*([^\n\r|]+)/i;
    const providerRe = /Referred\s+Out\s+To:\s*([^\n\r|]+)/i;

    for (const ref of referrals) {
      if (!ref.notes) continue;

      const destMatch = ref.notes.match(destRe);
      if (destMatch) {
        const key = destMatch[1].trim().toLowerCase();
        if (key) {
          const existing = [...destinationCounts.keys()].find((k) => k === key);
          destinationCounts.set(existing ?? key, (destinationCounts.get(existing ?? key) ?? 0) + 1);
        }
      }

      const provMatch = ref.notes.match(providerRe);
      if (provMatch) {
        const key = provMatch[1].trim().toLowerCase();
        if (key) {
          const existing = [...providerCounts.keys()].find((k) => k === key);
          providerCounts.set(existing ?? key, (providerCounts.get(existing ?? key) ?? 0) + 1);
        }
      }
    }

    const toList = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([k, count]) => ({
          label: k.replace(/\b\w/g, (c) => c.toUpperCase()),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    return {
      destinations: toList(destinationCounts),
      providers: toList(providerCounts),
    };
  } catch {
    return { destinations: [], providers: [] };
  }
}

type SnapRow = { adultTotal: number; adultAvailable: number; adolescentTotal: number; adolescentAvailable: number; geriatricTotal: number; geriatricAvailable: number; dualDxTotal: number; dualDxAvailable: number; date: Date };

function CensusTrendSparkline({ trend }: { trend: SnapRow[] }) {
  if (trend.length < 2) return null;
  const W = 420, H = 64, PAD = 4;
  const data = trend.map((s) => ({
    date: s.date,
    occupied: (s.adultTotal + s.adolescentTotal + s.geriatricTotal + s.dualDxTotal) -
              (s.adultAvailable + s.adolescentAvailable + s.geriatricAvailable + s.dualDxAvailable),
    available: s.adultAvailable + s.adolescentAvailable + s.geriatricAvailable + s.dualDxAvailable,
  }));
  const maxVal = Math.max(...data.map((d) => d.occupied + d.available), 1);
  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - (v / maxVal) * (H - PAD * 2);
  const pts = (key: "occupied" | "available") =>
    data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(" ");
  const labelAt = [0, Math.floor(data.length / 2), data.length - 1];
  return (
    <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 }}>
      <p style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>14-Day Census Trend</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 64 }} preserveAspectRatio="none">
        <polyline fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" points={pts("occupied")} />
        <polyline fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" points={pts("available")} />
        {labelAt.map((i) => (
          <text key={i} x={toX(i)} y={H} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="8" fill="#6b7280">
            {new Date(data[i].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        <span style={{ fontSize: "0.65rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 12, height: 2, background: "#fbbf24", borderRadius: 1 }} />Occupied</span>
        <span style={{ fontSize: "0.65rem", color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 12, height: 2, background: "#34d399", borderRadius: 1 }} />Available</span>
      </div>
    </div>
  );
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: "0.8rem", color: TEXT, maxWidth: "72%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontSize: "0.72rem", color: MUTED, tabularNums: true } as React.CSSProperties}>{count} ({pct}%)</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: GOLD, borderRadius: 3, opacity: 0.7, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

export default async function BedboardAndDischargesWidget({ repId }: { repId?: string }) {
  const [{ today: census, trend }, { destinations, providers }] = await Promise.all([
    getCensus(),
    getDischargeData(repId),
  ]);

  const UNITS = [
    { label: "Adult",        total: census?.adultTotal ?? 0,       avail: census?.adultAvailable ?? 0 },
    { label: "Adolescent",   total: census?.adolescentTotal ?? 0,   avail: census?.adolescentAvailable ?? 0 },
    { label: "Geriatric",    total: census?.geriatricTotal ?? 0,    avail: census?.geriatricAvailable ?? 0 },
    { label: "Dual Dx",      total: census?.dualDxTotal ?? 0,       avail: census?.dualDxAvailable ?? 0 },
  ];

  const totalAvail = UNITS.reduce((s, u) => s + u.avail, 0);
  const totalBeds  = UNITS.reduce((s, u) => s + u.total, 0);

  const statusColor =
    !census       ? "#6b7280"
    : totalAvail >= 5 ? "#34d399"
    : totalAvail >= 2 ? "#fbbf24"
    : "#f87171";

  const destTotal = destinations.reduce((s, d) => s + d.count, 0);
  const provTotal = providers.reduce((s, p) => s + p.count, 0);

  const updatedLabel = census
    ? census.date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            BEDBOARD &amp; DISCHARGES
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block", boxShadow: `0 0 6px ${statusColor}88` }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: statusColor }}>
              {!census
                ? "No census data"
                : totalAvail === 0
                  ? "No beds available"
                  : `${totalAvail} of ${totalBeds} beds open`}
            </span>
          </div>
        </div>
        {updatedLabel && (
          <span style={{ fontSize: "0.65rem", color: MUTED, marginTop: 2 }}>Updated {updatedLabel}</span>
        )}
      </div>

      {/* Bed grid */}
      {census ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 22 }}>
          {UNITS.map(({ label, total, avail }) => {
            const color = bedColor(avail);
            const pct   = total > 0 ? avail / total : 0;
            return (
              <div key={label} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 13px" }}>
                <p style={{ fontSize: "0.66rem", color: MUTED, marginBottom: 6, fontWeight: 600 }}>{label}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 5 }}>
                  <span style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 10px ${color}55` }}>{avail}</span>
                  <span style={{ fontSize: "0.68rem", color: MUTED }}>/ {total}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(pct * 100)}%`, background: color, borderRadius: 2, opacity: 0.75 }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: "0.82rem", color: MUTED, marginBottom: 22 }}>
          Bed data not yet synced. Connect Microsoft 365 under Integrations to enable bedboard sync.
        </p>
      )}

      {/* Discharge data — two columns side by side */}
      <div style={{ borderTop: `1px solid rgba(255,255,255,0.07)`, paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Column G — discharge destinations */}
        <div>
          <p style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Discharge Destinations
          </p>
          {destinations.length === 0 ? (
            <p style={{ fontSize: "0.78rem", color: MUTED, fontStyle: "italic" }}>No data in last 30 days</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {destinations.map((d) => (
                <BarRow key={d.label} label={d.label} count={d.count} total={destTotal} />
              ))}
              <p style={{ fontSize: "0.65rem", color: MUTED, marginTop: 4 }}>{destTotal} total · last 30 days</p>
            </div>
          )}
        </div>

        {/* Column M — aftercare providers */}
        <div>
          <p style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Aftercare Providers
          </p>
          {providers.length === 0 ? (
            <p style={{ fontSize: "0.78rem", color: MUTED, fontStyle: "italic" }}>No referral data in last 30 days</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {providers.map((p) => (
                <BarRow key={p.label} label={p.label} count={p.count} total={provTotal} />
              ))}
              <p style={{ fontSize: "0.65rem", color: MUTED, marginTop: 4 }}>{provTotal} total · last 30 days</p>
            </div>
          )}
        </div>
      </div>

      <CensusTrendSparkline trend={trend} />
    </div>
  );
}
