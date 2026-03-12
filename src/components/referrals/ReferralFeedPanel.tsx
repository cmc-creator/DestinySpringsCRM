"use client";
import { useState, useEffect, useCallback } from "react";

interface Referral {
  id: string;
  patientInitials?: string | null;
  admissionDate?: string | null;
  dischargeDate?: string | null;
  serviceLine?: string | null;
  externalId?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  RECEIVED:  "var(--nyx-accent)",
  ADMITTED:  "#34d399",
  DECLINED:  "#f87171",
  PENDING:   "#fbbf24",
  DUPLICATE: "#94a3b8",
};

const STATUSES = ["RECEIVED", "ADMITTED", "DECLINED", "PENDING"];

const SERVICE_LINES = [
  "CARDIOLOGY","ONCOLOGY","ORTHOPEDICS","NEUROLOGY","WOMENS_HEALTH","PEDIATRICS",
  "BEHAVIORAL_HEALTH","PRIMARY_CARE","SURGICAL_SERVICES","EMERGENCY_MEDICINE",
  "RADIOLOGY","REHABILITATION","HOME_HEALTH","OTHER",
];

const C = {
  card:   "var(--nyx-card)",
  border: "var(--nyx-border)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  input:  "var(--nyx-input-bg)",
  cyan:   "var(--nyx-accent)",
};

const inp: React.CSSProperties = {
  width: "100%", background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: "0.8rem",
  outline: "none", boxSizing: "border-box",
};

const lbl = (s: string) => s.replace(/_/g, " ");

function relDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const emptyForm = {
  patientInitials: "", admissionDate: "", dischargeDate: "",
  serviceLine: "", status: "RECEIVED", notes: "", externalId: "",
};

export function ReferralFeedPanel({
  sourceId, sourceName, sourceSubtitle, onClose,
}: {
  sourceId: string;
  sourceName: string;
  sourceSubtitle?: string;
  onClose: () => void;
}) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"feed" | "log">("feed");
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/referrals?sourceId=${sourceId}`);
      if (r.ok) setReferrals(await r.json());
    } finally { setLoading(false); }
  }, [sourceId]);

  useEffect(() => { load(); }, [load]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError("");
    try {
      const body = {
        referralSourceId: sourceId,
        patientInitials:  form.patientInitials || null,
        admissionDate:    form.admissionDate   || null,
        dischargeDate:    form.dischargeDate   || null,
        serviceLine:      form.serviceLine     || null,
        externalId:       form.externalId      || null,
        status:           form.status,
        notes:            form.notes           || null,
      };
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        setSaveError(e.error ?? "Failed to save");
      } else {
        setForm(emptyForm);
        setTab("feed");
        await load();
      }
    } finally { setSaving(false); }
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 400,
      background: "var(--nyx-bg)", borderLeft: "1px solid var(--nyx-accent-str)",
      zIndex: 200, display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.45)",
    }}>
      {/* Header */}
      <div style={{ padding: "18px 20px 0", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--nyx-accent-label)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>Referrals Received</div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: "0.92rem" }}>{sourceName}</div>
            {sourceSubtitle && <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2 }}>{sourceSubtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {(["feed", "log"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "7px 0", background: "none", border: "none",
              borderBottom: tab === t ? `2px solid ${C.cyan}` : "2px solid transparent",
              color: tab === t ? C.cyan : C.muted, cursor: "pointer",
              fontSize: "0.75rem", fontWeight: tab === t ? 700 : 500,
              transition: "color 0.15s",
            }}>
              {t === "feed" ? `📋 Referral Feed (${referrals.length})` : "➕ Log Referral"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "feed" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ color: C.muted, textAlign: "center", paddingTop: 24, fontSize: "0.82rem" }}>Loading…</div>
          ) : referrals.length === 0 ? (
            <div style={{ color: C.muted, textAlign: "center", paddingTop: 32, fontSize: "0.82rem" }}>
              No referrals logged yet.{" "}
              <button onClick={() => setTab("log")} style={{ color: C.cyan, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Log the first one →</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {referrals.map(r => (
                <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: "0.83rem" }}>
                      {r.patientInitials ?? "Patient"}
                    </div>
                    <span style={{
                      fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em",
                      color: STATUS_COLOR[r.status] ?? C.muted,
                      background: "rgba(0,0,0,0.3)", padding: "2px 7px", borderRadius: 4,
                    }}>
                      {r.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                    {r.admissionDate && (
                      <div style={{ fontSize: "0.72rem", color: C.muted }}>
                        📅 <span style={{ color: C.text }}>{relDate(r.admissionDate)}</span>
                      </div>
                    )}
                    {r.serviceLine && (
                      <div style={{ fontSize: "0.72rem", color: C.muted }}>
                        🏥 <span style={{ color: C.text }}>{lbl(r.serviceLine)}</span>
                      </div>
                    )}
                    {r.externalId && (
                      <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: "monospace" }}>
                        ID: {r.externalId}
                      </div>
                    )}
                  </div>
                  {r.notes && <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{r.notes}</div>}
                  <div style={{ fontSize: "0.63rem", color: "rgba(216,232,244,0.25)", marginTop: 6 }}>Logged {relDate(r.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {saveError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "9px 12px", color: "#f87171", fontSize: "0.78rem", marginBottom: 12 }}>
              {saveError}
            </div>
          )}
          <form onSubmit={handleLog} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>PATIENT INITIALS</label>
              <input style={inp} value={form.patientInitials} onChange={e => setForm(f => ({ ...f, patientInitials: e.target.value }))} placeholder="J.D." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>ADMISSION DATE</label>
                <input type="date" style={inp} value={form.admissionDate} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>DISCHARGE DATE</label>
                <input type="date" style={inp} value={form.dischargeDate} onChange={e => setForm(f => ({ ...f, dischargeDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>SERVICE LINE</label>
              <select style={{ ...inp, colorScheme: "dark" }} value={form.serviceLine} onChange={e => setForm(f => ({ ...f, serviceLine: e.target.value }))}>
                <option value="">— Select —</option>
                {SERVICE_LINES.map(s => <option key={s} value={s} style={{ background: "var(--nyx-card)" }}>{lbl(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>STATUS</label>
              <select style={{ ...inp, colorScheme: "dark" }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s} style={{ background: "var(--nyx-card)" }}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>EXTERNAL ID <span style={{ fontWeight: 400 }}>(MRN / encounter)</span></label>
              <input style={inp} value={form.externalId} onChange={e => setForm(f => ({ ...f, externalId: e.target.value }))} placeholder="MRN-001 or encounter ID" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.06em" }}>NOTES</label>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any context about this referral…" />
            </div>
            <button type="submit" disabled={saving} style={{
              background: "var(--nyx-accent-mid)", border: "1px solid var(--nyx-accent-str)",
              borderRadius: 7, padding: "9px", color: C.cyan, cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "0.84rem", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : "Log Referral"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
