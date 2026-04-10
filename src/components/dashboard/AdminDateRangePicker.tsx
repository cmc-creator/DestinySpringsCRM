"use client";
import { useRouter, useSearchParams } from "next/navigation";

const RANGES = [
  { label: "7 days",  value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time",value: "all" },
];

export default function AdminDateRangePicker({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "30d") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--nyx-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", alignSelf: "center", marginRight: 4 }}>
        Range:
      </span>
      {RANGES.map((r) => {
        const isActive = current === r.value;
        return (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            style={{
              background: isActive ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${isActive ? "var(--nyx-accent-str)" : "var(--nyx-border)"}`,
              borderRadius: 7,
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--nyx-accent)" : "var(--nyx-text-muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
