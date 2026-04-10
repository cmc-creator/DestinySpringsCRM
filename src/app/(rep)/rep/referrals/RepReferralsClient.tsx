"use client";
import { useState, useMemo } from "react";

const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT   = "var(--nyx-text)";
const MUTED  = "var(--nyx-text-muted)";
const CYAN   = "var(--nyx-accent)";

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  RECEIVED:  { bg: "rgba(201,168,76,0.12)",  text: "var(--nyx-accent)", label: "New" },
  ADMITTED:  { bg: "rgba(16,185,129,0.12)",  text: "#34d399",           label: "Admitted" },
  DECLINED:  { bg: "rgba(239,68,68,0.12)",   text: "#f87171",           label: "Declined" },
  PENDING:   { bg: "rgba(245,158,11,0.12)",  text: "#fbbf24",           label: "Pending" },
  DUPLICATE: { bg: "rgba(148,163,184,0.08)", text: "#94a3b8",           label: "Duplicate" },
};

function fmt(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type ReferralRow = {
  id: string;
  status: string;
  patientInitials: string | null;
  admissionDate: string | null;
  dischargeDate: string | null;
  serviceLine: string | null;
  dischargeDestination: string | null;
  referralSource: { id: string; name: string; type: string; specialty: string | null };
};

export default function RepReferralsClient({ referrals }: { referrals: ReferralRow[] }) {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("ALL");

  function exportCSV() {
    const headers = ["Referring Source", "Type", "Patient", "Service Line", "Admitted", "Discharged", "Referred Out To", "Status"];
    const rows = filtered.map((r) => [
      r.referralSource.name,
      r.referralSource.type.replace(/_/g, " "),
      r.patientInitials ?? "",
      r.serviceLine ?? "",
      r.admissionDate ? fmt(r.admissionDate) ?? "" : "",
      r.dischargeDate ? fmt(r.dischargeDate) ?? "" : "",
      r.dischargeDestination ?? "",
      STATUS_META[r.status]?.label ?? r.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return referrals.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.referralSource.name.toLowerCase().includes(q) ||
        (r.patientInitials ?? "").toLowerCase().includes(q) ||
        (r.serviceLine ?? "").toLowerCase().includes(q) ||
        (r.dischargeDestination ?? "").toLowerCase().includes(q)
      );
    });
  }, [referrals, search, statusFilter]);

  const total    = referrals.length;
  const admitted = referrals.filter((r) => r.status === "ADMITTED").length;
  const pending  = referrals.filter((r) => r.status === "PENDING" || r.status === "RECEIVED").length;
  const declined = referrals.filter((r) => r.status === "DECLINED").length;

  return (
    <>
      <style>{`
        .ref-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 600px) {
          .ref-stats { grid-template-columns: repeat(2, 1fr); }
        }
        .ref-filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          align-items: center;
        }
        .ref-search {
          flex: 1;
          min-width: 160px;
          background: var(--nyx-card);
          border: 1px solid var(--nyx-accent-dim);
          border-radius: 8px;
          padding: 9px 13px;
          color: var(--nyx-text);
          font-size: 0.875rem;
          outline: none;
        }
        .ref-select {
          background: var(--nyx-card);
          border: 1px solid var(--nyx-accent-dim);
          border-radius: 8px;
          padding: 9px 13px;
          color: var(--nyx-text);
          font-size: 0.875rem;
          outline: none;
        }
        .ref-export-btn {
          background: var(--nyx-card);
          border: 1px solid var(--nyx-accent-dim);
          border-radius: 8px;
          padding: 9px 16px;
          color: var(--nyx-accent);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .ref-export-btn:hover { background: rgba(201,168,76,0.08); }
        /* Desktop table */
        .ref-table-wrap { display: block; }
        /* Mobile cards */
        .ref-cards { display: none; }
        @media (max-width: 720px) {
          .ref-table-wrap { display: none; }
          .ref-cards { display: flex; flex-direction: column; gap: 10px; }
        }
      `}</style>

      {/* Stats */}
      <div className="ref-stats">
        {[
          { label: "Total Referrals", value: total,    color: CYAN },
          { label: "Admitted",        value: admitted, color: "#34d399" },
          { label: "Pending / New",   value: pending,  color: "#fbbf24" },
          { label: "Declined",        value: declined, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 14px" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.68rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ref-filters">
        <input
          className="ref-search"
          placeholder="Search source, patient, service line…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="ref-select" value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button type="button" className="ref-export-btn" onClick={exportCSV} title="Download CSV">
          ⬇ Download CSV
        </button>
      </div>

      {/* Desktop: table */}
      <div className="ref-table-wrap">
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div className="nyx-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Referring Source", "Patient", "Service Line", "Admitted", "Discharged", "Referred Out To", "Status"].map((h) => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "0.67rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 36, textAlign: "center", color: MUTED, fontSize: "0.875rem" }}>No referrals found.</td></tr>
                )}
                {filtered.map((r) => {
                  const sc = STATUS_META[r.status] ?? STATUS_META.RECEIVED;
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: TEXT }}>{r.referralSource.name}</div>
                        <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: 2 }}>
                          {r.referralSource.type.replace(/_/g, " ")}{r.referralSource.specialty ? ` · ${r.referralSource.specialty}` : ""}
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.875rem", color: r.patientInitials ? TEXT : MUTED }}>{r.patientInitials ?? "-"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: MUTED }}>{r.serviceLine ?? "-"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: MUTED, whiteSpace: "nowrap" }}>{fmt(r.admissionDate) ?? "-"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: MUTED, whiteSpace: "nowrap" }}>{fmt(r.dischargeDate) ?? "-"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: MUTED }}>{r.dischargeDestination ?? "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="ref-cards">
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: "0.875rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            No referrals found.
          </div>
        )}
        {filtered.map((r) => {
          const sc = STATUS_META[r.status] ?? STATUS_META.RECEIVED;
          return (
            <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 16px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT }}>{r.referralSource.name}</div>
                  <div style={{ fontSize: "0.75rem", color: MUTED, marginTop: 2 }}>
                    {r.referralSource.type.replace(/_/g, " ")}{r.referralSource.specialty ? ` · ${r.referralSource.specialty}` : ""}
                  </div>
                </div>
                <span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {sc.label}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                {r.patientInitials && (
                  <div>
                    <div style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Patient</div>
                    <div style={{ fontSize: "0.85rem", color: TEXT, marginTop: 2 }}>{r.patientInitials}</div>
                  </div>
                )}
                {r.serviceLine && (
                  <div>
                    <div style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Line</div>
                    <div style={{ fontSize: "0.85rem", color: TEXT, marginTop: 2 }}>{r.serviceLine}</div>
                  </div>
                )}
                {r.admissionDate && (
                  <div>
                    <div style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Admitted</div>
                    <div style={{ fontSize: "0.85rem", color: TEXT, marginTop: 2 }}>{fmt(r.admissionDate)}</div>
                  </div>
                )}
                {r.dischargeDate && (
                  <div>
                    <div style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Discharged</div>
                    <div style={{ fontSize: "0.85rem", color: TEXT, marginTop: 2 }}>{fmt(r.dischargeDate)}</div>
                  </div>
                )}
                {r.dischargeDestination && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Referred Out To</div>
                    <div style={{ fontSize: "0.85rem", color: TEXT, marginTop: 2 }}>{r.dischargeDestination}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
