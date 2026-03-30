"use client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CYAN = "var(--nyx-accent)";
const _TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export type HeatmapDay = { date: string; count: number };

interface Props {
  data: HeatmapDay[];
  weeks?: number;
}

export default function ActivityHeatmap({ data, weeks = 13 }: Props) {
  // Build a map of date → count
  const countMap = new Map(data.map(d => [d.date, d.count]));
  const max = Math.max(...data.map(d => d.count), 1);

  // Build grid: `weeks` columns x 7 rows, anchored to today
  const today = new Date();
  // Align start to the most-recent Sunday minus (weeks * 7 - 1) days
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() - today.getDay()); // most recent Sunday
  const startDate = new Date(endSunday);
  startDate.setDate(endSunday.getDate() - (weeks - 1) * 7);

  // Generate week columns [0..weeks-1], each col has 7 days [0..6]
  const grid: { iso: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { iso: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      if (date > today) {
        col.push({ iso: "", count: -1 }); // future — blank
      } else {
        const iso = date.toISOString().slice(0, 10);
        col.push({ iso, count: countMap.get(iso) ?? 0 });
      }
    }
    grid.push(col);
  }

  // Month labels: place where a new month starts
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  grid.forEach((col, w) => {
    const firstValidDay = col.find(c => c.iso !== "");
    if (!firstValidDay) return;
    const month = new Date(firstValidDay.iso).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ col: w, label: new Date(firstValidDay.iso).toLocaleString("default", { month: "short" }) });
      lastMonth = month;
    }
  });

  function cellColor(count: number) {
    if (count < 0) return "transparent";
    if (count === 0) return "rgba(255,255,255,0.05)";
    const intensity = Math.min(count / max, 1);
    // Use nyx-accent with increasing opacity
    if (intensity < 0.25) return "rgba(201,168,76,0.20)";
    if (intensity < 0.50) return "rgba(201,168,76,0.45)";
    if (intensity < 0.75) return "rgba(201,168,76,0.70)";
    return "rgba(201,168,76,0.95)";
  }

  const totalActivities = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="gold-card" style={{ borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
          ACTIVITY HEATMAP — LAST {weeks} WEEKS
        </p>
        <span style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 700 }}>{totalActivities} activities</span>
      </div>

      {/* Month labels row */}
      <div style={{ display: "flex", marginBottom: 4, marginLeft: 32 }}>
        {grid.map((_, w) => {
          const lbl = monthLabels.find(m => m.col === w);
          return (
            <div key={w} style={{ flex: 1, fontSize: "0.58rem", color: TEXT_MUTED, fontWeight: 600 }}>
              {lbl ? lbl.label : ""}
            </div>
          );
        })}
      </div>

      {/* Grid: day rows */}
      <div style={{ display: "flex" }}>
        {/* Day labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 6, paddingTop: 1 }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontSize: "0.58rem", color: TEXT_MUTED, height: 14, lineHeight: "14px", fontWeight: 500 }}>{d}</div>
          ))}
        </div>

        {/* Week columns */}
        <div style={{ flex: 1, display: "flex", gap: 3 }}>
          {grid.map((col, w) => (
            <div key={w} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              {col.map((cell, d) => (
                <div
                  key={d}
                  title={cell.iso ? `${cell.iso}: ${cell.count} activit${cell.count !== 1 ? "ies" : "y"}` : ""}
                  style={{
                    height: 14,
                    borderRadius: 3,
                    background: cellColor(cell.count),
                    border: cell.count > 0 ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                    transition: "transform 0.1s",
                    cursor: cell.count > 0 ? "default" : "default",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: "0.6rem", color: TEXT_MUTED }}>Less</span>
        {["rgba(255,255,255,0.05)", "rgba(201,168,76,0.20)", "rgba(201,168,76,0.45)", "rgba(201,168,76,0.70)", "rgba(201,168,76,0.95)"].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: "1px solid rgba(201,168,76,0.15)" }} />
        ))}
        <span style={{ fontSize: "0.6rem", color: TEXT_MUTED }}>More</span>
      </div>
    </div>
  );
}
