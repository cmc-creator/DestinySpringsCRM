"use client";

const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";

// Standard US cartogram grid (row, col, abbreviation)
// 11 columns × 8 rows
const STATE_GRID: [number, number, string][] = [
  [0, 0, "AK"],                                                              [0, 10, "ME"],
  [1, 0, "WA"],[1, 1, "ID"],[1, 2, "MT"],[1, 3, "ND"],[1, 4, "MN"],        [1, 9, "VT"],[1, 10, "NH"],
  [2, 0, "OR"],[2, 1, "NV"],[2, 2, "WY"],[2, 3, "SD"],[2, 4, "WI"],[2, 5, "MI"],        [2, 8, "NY"],[2, 9, "MA"],[2, 10, "RI"],
  [3, 0, "CA"],[3, 1, "UT"],[3, 2, "CO"],[3, 3, "NE"],[3, 4, "IA"],[3, 5, "IL"],[3, 6, "IN"],[3, 7, "OH"],[3, 8, "PA"],[3, 9, "NJ"],[3, 10, "CT"],
  [4, 1, "AZ"],[4, 2, "NM"],[4, 3, "KS"],[4, 4, "MO"],[4, 5, "KY"],[4, 6, "WV"],[4, 7, "VA"],[4, 8, "MD"],[4, 9, "DE"],
  [5, 3, "OK"],[5, 4, "AR"],[5, 5, "TN"],[5, 6, "NC"],[5, 7, "SC"],[5, 9, "DC"],
  [6, 0, "HI"],[6, 2, "TX"],[6, 3, "LA"],[6, 4, "MS"],[6, 5, "AL"],[6, 6, "GA"],
  [7, 6, "FL"],
];

const ROWS = 8;
const COLS = 11;

// Assign a stable color per rep (up to 8 reps before repeating)
const REP_COLORS = [
  "var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c",
];

export type RepTerritory = {
  id: string;
  name: string;
  states: string[]; // state abbreviations e.g. ["TN","KY"]
};

interface Props {
  repTerritories: RepTerritory[];
}

export default function UsaTileMap({ repTerritories }: Props) {
  // Build a lookup: state → { repName, color }
  const stateMap = new Map<string, { repName: string; color: string }>();
  repTerritories.forEach((rep, i) => {
    const color = REP_COLORS[i % REP_COLORS.length];
    rep.states.forEach(state => stateMap.set(state, { repName: rep.name, color }));
  });

  // Group states by row for rendering
  const grid: (typeof STATE_GRID[0] | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null)
  );
  for (const entry of STATE_GRID) {
    grid[entry[0]][entry[1]] = entry;
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        {repTerritories.map((rep, i) => (
          <div key={rep.id} style={{ display: "flex", alignItems: "center", gap: 7, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "5px 12px" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: REP_COLORS[i % REP_COLORS.length], boxShadow: `0 0 6px ${REP_COLORS[i % REP_COLORS.length]}88` }} />
            <span style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 600 }}>{rep.name}</span>
            <span style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>({rep.states.length} states)</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "5px 12px" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>Uncovered</span>
        </div>
      </div>

      {/* Tile grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 4,
          maxWidth: 600,
        }}
      >
        {grid.flatMap((row, ri) =>
          row.map((cell, ci) => {
            if (!cell) {
              return <div key={`empty-${ri}-${ci}`} style={{ aspectRatio: "1", borderRadius: 6 }} />;
            }
            const abbr = cell[2];
            const info = stateMap.get(abbr);
            const bg    = info ? info.color : "rgba(255,255,255,0.05)";
            const glowColor = info ? info.color : "transparent";
            const isCovered = !!info;
            return (
              <div
                key={abbr}
                title={info ? `${abbr}: ${info.repName}` : `${abbr}: Uncovered`}
                style={{
                  aspectRatio: "1",
                  borderRadius: 6,
                  background: isCovered ? `${bg}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isCovered ? bg : "rgba(255,255,255,0.08)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "default",
                  boxShadow: isCovered ? `0 0 8px ${glowColor}44` : "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1.15)";
                  (e.currentTarget as HTMLDivElement).style.zIndex = "10";
                  (e.currentTarget as HTMLDivElement).style.position = "relative";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLDivElement).style.zIndex = "0";
                }}
              >
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: isCovered ? bg : "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>{abbr}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Coverage stats */}
      <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--nyx-accent)" }}>
            {stateMap.size}
          </span>
          <span style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>States Covered</span>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#94a3b8" }}>
            {51 - stateMap.size}
          </span>
          <span style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>States Uncovered</span>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fbbf24" }}>
            {Math.round((stateMap.size / 51) * 100)}%
          </span>
          <span style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>US Coverage</span>
        </div>
      </div>
    </div>
  );
}
