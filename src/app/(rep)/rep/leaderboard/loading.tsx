import TableSkeleton from "@/components/ui/TableSkeleton";

const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const MUTED  = "var(--nyx-text-muted)";

export default function LeaderboardLoading() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="nyx-skeleton" style={{ height: 12, width: 90, marginBottom: 8 }} />
        <div className="nyx-skeleton" style={{ height: 28, width: 220, marginBottom: 8 }} />
        <div className="nyx-skeleton" style={{ height: 14, width: 160 }} />
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="nyx-skeleton" style={{ height: 16, width: 160 }} />
          <div className="nyx-skeleton" style={{ height: 14, width: 80 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Rank", "Rep", "Activities", "Referrals", "Score"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableSkeleton cols={5} rows={8} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
