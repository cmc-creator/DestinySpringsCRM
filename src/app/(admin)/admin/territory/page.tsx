import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import TerritoryMapWrapper from "@/components/maps/TerritoryMapWrapper";

const REP_COLORS = ["var(--nyx-accent)","#34d399","#fbbf24","#a78bfa","#f59e0b","#60a5fa","#f87171","#fb923c"];
const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function TerritoryPage() {
  const [reps, hospitals] = await Promise.all([
    prisma.rep.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true, email: true } },
        territories: true,
        _count: { select: { opportunities: true, leads: true } },
      },
    }),
    prisma.hospital.findMany({
      select: { id: true, hospitalName: true, city: true, state: true, status: true, assignedRepId: true },
      orderBy: { hospitalName: "asc" },
    }),
  ]);

  const repTerritories = reps.map((rep, i) => ({
    id: rep.id,
    name: rep.user.name ?? rep.user.email ?? "Unknown",
    color: REP_COLORS[i % REP_COLORS.length],
    states: [...new Set([
      ...(rep.licensedStates ?? []),
      ...rep.territories.map((t: { state: string }) => t.state),
    ])],
  }));

  const mapHospitals = hospitals.map(h => ({
    id: h.id,
    hospitalName: h.hospitalName,
    city: h.city,
    state: h.state,
    status: h.status,
    assignedRepName: h.assignedRepId ? (reps.find(r => r.id === h.assignedRepId)?.user.name ?? null) : null,
  }));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>BD TEAM</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>Territory Management</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Rep coverage and hospital locations across the US</p>
      </div>

      {/* Leaflet Map */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>INTERACTIVE COVERAGE MAP</p>
        <TerritoryMapWrapper hospitals={mapHospitals} repTerritories={repTerritories} />
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {repTerritories.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color, boxShadow: `0 0 6px ${r.color}88` }} />
              <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{r.name} ({r.states.length} states)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rep Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 28 }}>
        {reps.map((rep, i) => {
          const color = REP_COLORS[i % REP_COLORS.length];
          const states = [...new Set([...(rep.licensedStates ?? []), ...rep.territories.map((t: { state: string }) => t.state)])];
          return (
            <div key={rep.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}88` }} />
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: TEXT }}>{rep.user.name}</div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{rep.territory ?? (rep.city ? `${rep.city}, ${rep.state}` : "No territory set")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{rep._count.opportunities}</div>
                  <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>opps</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: TEXT }}>{rep._count.leads}</div>
                  <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>Leads</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: TEXT }}>{states.length}</div>
                  <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>States</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: rep.rating ? color : TEXT_MUTED }}>{rep.rating ?? ""}</div>
                  <div style={{ fontSize: "0.65rem", color: TEXT_MUTED }}>Rating</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {states.length === 0
                  ? <span style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>No states assigned</span>
                  : states.map((state: string) => (
                    <span key={state} style={{ background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 7px", fontSize: "0.7rem", fontWeight: 700, color }}>{state}</span>
                  ))
                }
              </div>
              {rep.hipaaTrainedAt && (
                <div style={{ marginTop: 12, fontSize: "0.72rem", color: TEXT_MUTED, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                  HIPAA certified  {formatDate(rep.hipaaTrainedAt)}
                </div>
              )}
            </div>
          );
        })}
        {reps.length === 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: "center", color: TEXT_MUTED, gridColumn: "1/-1" }}>
            No active reps yet.
          </div>
        )}
      </div>

      {/* Territory Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase" }}>TERRITORY ASSIGNMENTS</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["State","Region","Rep","City","Title","Notes"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reps.flatMap(rep =>
              rep.territories.length > 0
                ? rep.territories.map((t: { id: string; state: string; region?: string | null; city?: string | null; notes?: string | null }) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                    <td style={{ padding: "11px 16px", fontWeight: 700, fontSize: "0.85rem", color: CYAN }}>{t.state}</td>
                    <td style={{ padding: "11px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{t.region ?? ""}</td>
                    <td style={{ padding: "11px 16px", fontSize: "0.82rem", color: TEXT, fontWeight: 600 }}>{rep.user.name}</td>
                    <td style={{ padding: "11px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{t.city ?? ""}</td>
                    <td style={{ padding: "11px 16px", fontSize: "0.8rem", color: TEXT_MUTED }}>{rep.title ?? ""}</td>
                    <td style={{ padding: "11px 16px", fontSize: "0.78rem", color: TEXT_MUTED }}>{t.notes ?? ""}</td>
                  </tr>
                ))
                : []
            )}
            {reps.every(r => r.territories.length === 0) && (
              <tr><td colSpan={6} style={{ padding: 28, textAlign: "center", color: TEXT_MUTED }}>No territory assignments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
