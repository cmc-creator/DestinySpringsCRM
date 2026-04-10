import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const CYAN   = "var(--nyx-accent)";
const CARD   = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT   = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

function pct(occ: number, total: number) {
  if (!total) return 0;
  return Math.round((occ / total) * 100);
}

export default async function CensusPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  async function saveCensus(formData: FormData) {
    "use server";
    const sess = await auth();
    if (!sess || sess.user.role !== "ADMIN") return;

    const dateStr = formData.get("date") as string;
    if (!dateStr) return;
    const date = new Date(dateStr);

    await prisma.censusSnapshot.upsert({
      where: { date },
      update: {
        adultTotal:        Number(formData.get("adultTotal") ?? 0),
        adultAvailable:    Number(formData.get("adultAvailable") ?? 0),
        adolescentTotal:   Number(formData.get("adolescentTotal") ?? 0),
        adolescentAvailable: Number(formData.get("adolescentAvailable") ?? 0),
        geriatricTotal:    Number(formData.get("geriatricTotal") ?? 0),
        geriatricAvailable: Number(formData.get("geriatricAvailable") ?? 0),
        dualDxTotal:       Number(formData.get("dualDxTotal") ?? 0),
        dualDxAvailable:   Number(formData.get("dualDxAvailable") ?? 0),
        note:              (formData.get("note") as string) || null,
      },
      create: {
        date,
        adultTotal:        Number(formData.get("adultTotal") ?? 0),
        adultAvailable:    Number(formData.get("adultAvailable") ?? 0),
        adolescentTotal:   Number(formData.get("adolescentTotal") ?? 0),
        adolescentAvailable: Number(formData.get("adolescentAvailable") ?? 0),
        geriatricTotal:    Number(formData.get("geriatricTotal") ?? 0),
        geriatricAvailable: Number(formData.get("geriatricAvailable") ?? 0),
        dualDxTotal:       Number(formData.get("dualDxTotal") ?? 0),
        dualDxAvailable:   Number(formData.get("dualDxAvailable") ?? 0),
        note:              (formData.get("note") as string) || null,
      },
    });
    revalidatePath("/admin/census");
  }

  const [snapshots, today] = await Promise.all([
    prisma.censusSnapshot.findMany({ orderBy: { date: "desc" }, take: 30 }),
    prisma.censusSnapshot.findUnique({
      where: { date: new Date(new Date().toISOString().slice(0, 10)) },
    }),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const units = [
    { key: "adult",       label: "Adult Inpatient",    icon: "🧑" },
    { key: "adolescent",  label: "Adolescent Psych",   icon: "🧒" },
    { key: "geriatric",   label: "Geriatric Psych",    icon: "👴" },
    { key: "dualDx",      label: "Dual Diagnosis",     icon: "🔄" },
  ] as const;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>OPERATIONS</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Bedboard &amp; Discharges</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginTop: 4 }}>Daily bed availability snapshot for all units.</p>
      </div>

      {/* ── Live SharePoint Documents ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        {/* Bedboard */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", textTransform: "uppercase", letterSpacing: "0.1em" }}>LIVE</p>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: TEXT }}>🛏 Bedboard</h2>
            </div>
            <a
              href="https://destinyspringshpt.sharepoint.com/:x:/r/sites/Intake/_layouts/15/Doc2.aspx?action=edit&sourcedoc=%7B0dec3106-c845-4eb7-b01c-c64a86da0796%7D&web=1"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 700, textDecoration: "none", background: "rgba(0,212,255,0.08)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "5px 10px" }}
            >
              Open in SharePoint ↗
            </a>
          </div>
          <iframe
            src="https://destinyspringshpt.sharepoint.com/:x:/r/sites/Intake/_layouts/15/Doc2.aspx?action=embedview&sourcedoc=%7B0dec3106-c845-4eb7-b01c-c64a86da0796%7D&wdAllowInteractivity=False"
            width="100%"
            height="420"
            style={{ border: "none", display: "block" }}
            title="Bedboard"
          />
        </div>

        {/* Discharge List */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-accent-label)", textTransform: "uppercase", letterSpacing: "0.1em" }}>LIVE</p>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: TEXT }}>📋 Discharge List</h2>
            </div>
            <a
              href="https://destinyspringshpt.sharepoint.com/:x:/r/sites/Discharge/_layouts/15/Doc.aspx?sourcedoc=%7B154a42d6-cc08-45b6-8af5-ebcb1029e635%7D&action=edit"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 700, textDecoration: "none", background: "rgba(0,212,255,0.08)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "5px 10px" }}
            >
              Open in SharePoint ↗
            </a>
          </div>
          <iframe
            src="https://destinyspringshpt.sharepoint.com/:x:/r/sites/Discharge/_layouts/15/Doc.aspx?sourcedoc=%7B154a42d6-cc08-45b6-8af5-ebcb1029e635%7D&action=embedview&wdAllowInteractivity=False"
            width="100%"
            height="420"
            style={{ border: "none", display: "block" }}
            title="Discharge List"
          />
        </div>
      </div>

      {/* Today's summary cards */}
      {today && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {units.map(u => {
            const total = today[`${u.key}Total` as keyof typeof today] as number;
            const avail = today[`${u.key}Available` as keyof typeof today] as number;
            const occ   = total - avail;
            const p     = pct(occ, total);
            const color = p >= 90 ? "#f87171" : p >= 70 ? "#fbbf24" : "#34d399";
            return (
              <div key={u.key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 18px" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{u.icon}</div>
                <div style={{ fontSize: "0.72rem", color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{u.label}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1 }}>{p}%</div>
                <div style={{ fontSize: "0.78rem", color: TEXT_MUTED, marginTop: 4 }}>{occ} / {total} occupied · {avail} available</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input form */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 28px", marginBottom: 32 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT, marginBottom: 18 }}>
          {today ? "Update Today's Census" : "Record Today's Census"}
        </h2>
        <form action={saveCensus}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" name="date" defaultValue={todayStr} required
                style={{ background: "var(--nyx-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: "0.875rem", padding: "8px 12px", width: "100%", maxWidth: 200 }} />
            </div>

            {units.map(u => (
              <>
                <div key={`${u.key}Total`}>
                  <label style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    {u.icon} {u.label} — Total Beds
                  </label>
                  <input type="number" name={`${u.key}Total`} min={0} max={200}
                    defaultValue={today ? String(today[`${u.key}Total` as keyof typeof today]) : "0"}
                    style={{ background: "var(--nyx-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: "0.875rem", padding: "8px 12px", width: "100%" }} />
                </div>
                <div key={`${u.key}Available`}>
                  <label style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    {u.icon} {u.label} — Available
                  </label>
                  <input type="number" name={`${u.key}Available`} min={0} max={200}
                    defaultValue={today ? String(today[`${u.key}Available` as keyof typeof today]) : "0"}
                    style={{ background: "var(--nyx-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: "0.875rem", padding: "8px 12px", width: "100%" }} />
                </div>
              </>
            ))}

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Note (optional)</label>
              <textarea name="note" rows={2} defaultValue={today?.note ?? ""}
                placeholder="e.g. 2 patients on medical hold, awaiting clearance"
                style={{ background: "var(--nyx-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: "0.875rem", padding: "8px 12px", width: "100%", resize: "vertical" }} />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button type="submit"
              style={{ background: CYAN, border: "none", borderRadius: 8, color: "#000", fontSize: "0.85rem", fontWeight: 700, padding: "10px 24px", cursor: "pointer" }}>
              {today ? "Update Census" : "Save Census"}
            </button>
          </div>
        </form>
      </div>

      {/* History table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT, margin: 0 }}>Recent History (Last 30 Days)</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--nyx-bg)" }}>
                {["Date", "Adult", "Adolescent", "Geriatric", "Dual Dx", "Note"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: TEXT_MUTED, fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "24px 16px", color: TEXT_MUTED, textAlign: "center" }}>No census records yet.</td></tr>
              ) : snapshots.map(s => {
                const adultOcc = s.adultTotal - s.adultAvailable;
                const adolOcc  = s.adolescentTotal - s.adolescentAvailable;
                const gerOcc   = s.geriatricTotal - s.geriatricAvailable;
                const dualOcc  = s.dualDxTotal - s.dualDxAvailable;
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "10px 16px", color: TEXT, fontWeight: 600 }}>
                      {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={{ padding: "10px 16px", color: TEXT }}>{adultOcc}/{s.adultTotal} ({pct(adultOcc, s.adultTotal)}%)</td>
                    <td style={{ padding: "10px 16px", color: TEXT }}>{adolOcc}/{s.adolescentTotal} ({pct(adolOcc, s.adolescentTotal)}%)</td>
                    <td style={{ padding: "10px 16px", color: TEXT }}>{gerOcc}/{s.geriatricTotal} ({pct(gerOcc, s.geriatricTotal)}%)</td>
                    <td style={{ padding: "10px 16px", color: TEXT }}>{dualOcc}/{s.dualDxTotal} ({pct(dualOcc, s.dualDxTotal)}%)</td>
                    <td style={{ padding: "10px 16px", color: TEXT_MUTED, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note ?? "—"}</td>
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
