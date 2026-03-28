"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type RepPerf = {
  repId: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  title?: string | null;
  opportunities: number;
  activities: number;
  lastActivityAt: string | null;
  lastLoginAt: string | null;
  loginCount30d: number;
  totalPaid: number;
  totalPending: number;
};

const C = {
  card: "var(--nyx-card)",
  border: "var(--nyx-border)",
  text: "var(--nyx-text)",
  muted: "var(--nyx-text-muted)",
  accent: "var(--nyx-accent)",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function dt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function RepPerformancePage() {
  const [rows, setRows] = useState<RepPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [savingPayment, setSavingPayment] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reps/performance");
      const data = (await response.json().catch(() => ({}))) as { reps?: RepPerf[] };
      if (response.ok) setRows(data.reps ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = status === "ALL" || row.status === status;
      const queryOk = !q || `${row.name} ${row.email} ${row.title ?? ""}`.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [rows, search, status]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => ({
        activities: acc.activities + row.activities,
        opportunities: acc.opportunities + row.opportunities,
        paid: acc.paid + row.totalPaid,
        pending: acc.pending + row.totalPending,
      }),
      { activities: 0, opportunities: 0, paid: 0, pending: 0 }
    );
  }, [filtered]);

  async function addPayment(repId: string, repName: string) {
    const amountRaw = prompt(`Enter bonus/commission amount for ${repName} (numbers only):`);
    if (!amountRaw) return;
    const amount = Number(amountRaw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    const description = prompt("Optional description (e.g., March admissions bonus):") ?? "";
    const isPaidNow = confirm("Mark this as paid now?\n\nOK = PAID, Cancel = PENDING");
    const statusValue = isPaidNow ? "PAID" : "PENDING";

    setSavingPayment(repId);
    try {
      const response = await fetch(`/api/reps/${repId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description, status: statusValue }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        alert(data.error ?? "Failed to save payment");
        return;
      }
      await load();
      alert("Payment logged.");
    } finally {
      setSavingPayment(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>REPS</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Rep Performance & Compensation</h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>Track activity, logins, and bonus/commission totals by rep.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Filtered Reps", value: String(filtered.length), color: C.accent },
          { label: "Activities", value: String(totals.activities), color: "#60a5fa" },
          { label: "Opportunities", value: String(totals.opportunities), color: "#34d399" },
          { label: "Paid", value: money(totals.paid), color: "#34d399" },
          { label: "Pending", value: money(totals.pending), color: "#fbbf24" },
        ].map((card) => (
          <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: "0.72rem", color: C.muted }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search rep name/email/title"
          style={{ background: "var(--nyx-input-bg)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, minWidth: 250, fontSize: "0.85rem" }}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={{ background: "var(--nyx-input-bg)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: "0.85rem" }}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {[
                "Rep",
                "Status",
                "Opportunities",
                "Activities",
                "Last Activity",
                "Last Login",
                "30d Logins",
                "Paid",
                "Pending",
                "Comp",
              ].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "10px 12px", color: "var(--nyx-accent-label)", fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={{ padding: 24, color: C.muted, textAlign: "center" }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 24, color: C.muted, textAlign: "center" }}>No reps match your filters.</td></tr>
            )}
            {!loading && filtered.map((row) => (
              <tr key={row.repId} style={{ borderBottom: `1px solid var(--nyx-accent-dim)` }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ color: C.text, fontSize: "0.85rem", fontWeight: 700 }}>{row.name}</div>
                  <div style={{ color: C.muted, fontSize: "0.72rem" }}>{row.email}</div>
                </td>
                <td style={{ padding: "10px 12px", color: C.muted, fontSize: "0.78rem" }}>{row.status.replace(/_/g, " ")}</td>
                <td style={{ padding: "10px 12px", color: C.text, fontSize: "0.82rem" }}>{row.opportunities}</td>
                <td style={{ padding: "10px 12px", color: C.text, fontSize: "0.82rem" }}>{row.activities}</td>
                <td style={{ padding: "10px 12px", color: C.muted, fontSize: "0.76rem", whiteSpace: "nowrap" }}>{dt(row.lastActivityAt)}</td>
                <td style={{ padding: "10px 12px", color: C.muted, fontSize: "0.76rem", whiteSpace: "nowrap" }}>{dt(row.lastLoginAt)}</td>
                <td style={{ padding: "10px 12px", color: C.text, fontSize: "0.82rem" }}>{row.loginCount30d}</td>
                <td style={{ padding: "10px 12px", color: "#34d399", fontSize: "0.82rem", fontWeight: 700 }}>{money(row.totalPaid)}</td>
                <td style={{ padding: "10px 12px", color: "#fbbf24", fontSize: "0.82rem", fontWeight: 700 }}>{money(row.totalPending)}</td>
                <td style={{ padding: "10px 12px" }}>
                  <button
                    type="button"
                    onClick={() => addPayment(row.repId, row.name)}
                    disabled={savingPayment === row.repId}
                    style={{
                      background: "var(--nyx-accent-dim)",
                      border: "1px solid var(--nyx-accent-str)",
                      borderRadius: 7,
                      padding: "6px 10px",
                      color: C.accent,
                      cursor: savingPayment === row.repId ? "not-allowed" : "pointer",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                    }}
                  >
                    {savingPayment === row.repId ? "Saving…" : "Log Bonus"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
