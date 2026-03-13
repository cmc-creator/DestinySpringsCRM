import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT   = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";
const CYAN   = "var(--nyx-accent)";

const PAYOR_TYPE_LABELS: Record<string, string> = {
  COMMERCIAL:        "Commercial",
  MEDICARE:          "Medicare",
  MEDICAID:          "Medicaid",
  MEDICARE_ADVANTAGE:"Medicare Advantage",
  TRICARE:           "TRICARE",
  AHCCCS:            "AHCCCS",
  SELF_PAY:          "Self-Pay",
  OTHER:             "Other",
};

const PAYOR_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL:         "#60a5fa",
  MEDICARE:           "#34d399",
  MEDICAID:           "#a78bfa",
  MEDICARE_ADVANTAGE: "#2dd4bf",
  TRICARE:            "#f59e0b",
  AHCCCS:             "#fb923c",
  SELF_PAY:           "#f87171",
  OTHER:              "#94a3b8",
};

export default async function PayorMixPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const payors = await prisma.payor.findMany({
    where: { active: true },
    include: {
      opportunities: {
        select: { stage: true, value: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Aggregate by payor type across active admissions
  const typeCounts: Record<string, number> = {};
  for (const p of payors) {
    const active = p.opportunities.filter(
      o => !["DISCHARGED","DECLINED"].includes(o.stage)
    ).length;
    if (active > 0) {
      typeCounts[p.type] = (typeCounts[p.type] ?? 0) + active;
    }
  }

  const totalActive = Object.values(typeCounts).reduce((s, n) => s + n, 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REVENUE OPERATIONS</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Payor Mix</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Active admissions breakdown by payor type and network status.</p>
      </div>

      {/* Payor type breakdown */}
      {totalActive > 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 28px", marginBottom: 32 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT, marginBottom: 20 }}>Active Admissions by Payor Type</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const pct = Math.round((count / totalActive) * 100);
                const color = PAYOR_TYPE_COLORS[type] ?? "#94a3b8";
                return (
                  <div key={type}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: TEXT }}>
                        {PAYOR_TYPE_LABELS[type] ?? type}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: TEXT_MUTED }}>
                        {count} admission{count !== 1 ? "s" : ""} · {pct}%
                      </span>
                    </div>
                    <div style={{ background: "var(--nyx-bg)", borderRadius: 6, height: 10, overflow: "hidden" }}>
                      <div style={{ background: color, height: "100%", width: `${pct}%`, borderRadius: 6, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "32px 28px", marginBottom: 32, textAlign: "center", color: TEXT_MUTED }}>
          No active admissions linked to payors yet.
        </div>
      )}

      {/* Summary stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Active Payors", value: payors.length, icon: "🏦", color: CYAN },
          { label: "In-Network", value: payors.filter(p => p.inNetwork).length, icon: "✅", color: "#34d399" },
          { label: "Require Prior Auth", value: payors.filter(p => p.requiresPreAuth).length, icon: "📋", color: "#fbbf24" },
          { label: "Avg Auth Days", value: payors.filter(p => p.avgAuthDays).length
              ? `${Math.round(payors.filter(p => p.avgAuthDays).reduce((s, p) => s + (p.avgAuthDays ?? 0), 0) / payors.filter(p => p.avgAuthDays).length)}d`
              : "—",
            icon: "⏱️", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Payor table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT, margin: 0 }}>Payor Directory</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--nyx-bg)" }}>
                {["Payor", "Type", "Plan", "Network", "Prior Auth", "Avg Auth Days", "Phone", "Auth Line"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: TEXT_MUTED, fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payors.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "24px 16px", color: TEXT_MUTED, textAlign: "center" }}>No payors configured yet. Add payors via Settings.</td></tr>
              ) : payors.map(p => {
                const typeColor = PAYOR_TYPE_COLORS[p.type] ?? "#94a3b8";
                const activeCount = p.opportunities.filter(o => !["DISCHARGED","DECLINED"].includes(o.stage)).length;
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 700, color: TEXT }}>{p.name}</div>
                      {activeCount > 0 && (
                        <div style={{ fontSize: "0.7rem", color: CYAN, marginTop: 2 }}>{activeCount} active admission{activeCount !== 1 ? "s" : ""}</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: typeColor + "22", color: typeColor, border: `1px solid ${typeColor}55`, padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {PAYOR_TYPE_LABELS[p.type] ?? p.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: TEXT_MUTED }}>{p.planName ?? "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ color: p.inNetwork ? "#34d399" : "#f87171", fontWeight: 700 }}>
                        {p.inNetwork ? "✓ In-Network" : "✗ Out-of-Network"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: p.requiresPreAuth ? "#fbbf24" : TEXT_MUTED }}>
                      {p.requiresPreAuth ? "Required" : "Not Required"}
                    </td>
                    <td style={{ padding: "10px 14px", color: TEXT }}>{p.avgAuthDays != null ? `${p.avgAuthDays}d` : "—"}</td>
                    <td style={{ padding: "10px 14px", color: TEXT_MUTED, whiteSpace: "nowrap" }}>{p.phone ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: TEXT_MUTED, whiteSpace: "nowrap" }}>{p.authPhone ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
