const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";

export default function TerritoryLoading() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="nyx-skeleton" style={{ height: 12, width: 90, marginBottom: 8 }} />
        <div className="nyx-skeleton" style={{ height: 28, width: 200, marginBottom: 8 }} />
        <div className="nyx-skeleton" style={{ height: 14, width: 180 }} />
      </div>

      {/* Map placeholder */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, height: 380, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>🗺</div>
          <div className="nyx-skeleton" style={{ height: 14, width: 120, margin: "0 auto" }} />
        </div>
      </div>

      {/* Card grid placeholders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
            <div className="nyx-skeleton" style={{ height: 14, width: "65%", marginBottom: 10 }} />
            <div className="nyx-skeleton" style={{ height: 11, width: "45%", marginBottom: 6 }} />
            <div className="nyx-skeleton" style={{ height: 11, width: "55%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
