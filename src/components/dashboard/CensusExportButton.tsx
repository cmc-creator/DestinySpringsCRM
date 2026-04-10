"use client";

type Snapshot = {
  id: string;
  date: Date | string;
  adultTotal: number;
  adultAvailable: number;
  adolescentTotal: number;
  adolescentAvailable: number;
  geriatricTotal: number;
  geriatricAvailable: number;
  dualDxTotal: number;
  dualDxAvailable: number;
  note: string | null;
};

function esc(v: string | number | null | undefined) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export default function CensusExportButton({ snapshots }: { snapshots: Snapshot[] }) {
  function handleExport() {
    const headers = [
      "Date",
      "Adult Occupied","Adult Total","Adult Avail",
      "Adolescent Occupied","Adolescent Total","Adolescent Avail",
      "Geriatric Occupied","Geriatric Total","Geriatric Avail",
      "Dual Dx Occupied","Dual Dx Total","Dual Dx Avail",
      "Note",
    ];

    const rows = snapshots.map(s => {
      const adultOcc = s.adultTotal - s.adultAvailable;
      const adolOcc  = s.adolescentTotal - s.adolescentAvailable;
      const gerOcc   = s.geriatricTotal - s.geriatricAvailable;
      const dualOcc  = s.dualDxTotal - s.dualDxAvailable;
      return [
        esc(new Date(s.date).toLocaleDateString("en-US")),
        esc(adultOcc), esc(s.adultTotal), esc(s.adultAvailable),
        esc(adolOcc), esc(s.adolescentTotal), esc(s.adolescentAvailable),
        esc(gerOcc), esc(s.geriatricTotal), esc(s.geriatricAvailable),
        esc(dualOcc), esc(s.dualDxTotal), esc(s.dualDxAvailable),
        esc(s.note),
      ].join(",");
    });

    const csv = [headers.map(h => esc(h)).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `census-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      style={{
        fontSize: "0.75rem",
        color: "var(--nyx-accent)",
        fontWeight: 700,
        textDecoration: "none",
        background: "rgba(0,212,255,0.08)",
        border: "1px solid var(--nyx-accent-dim)",
        borderRadius: 7,
        padding: "5px 12px",
        cursor: "pointer",
      }}
    >
      ⬇ Export CSV
    </button>
  );
}
