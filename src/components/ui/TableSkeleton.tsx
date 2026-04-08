"use client";

interface TableSkeletonProps {
  cols?: number;
  rows?: number;
}

export default function TableSkeleton({ cols = 6, rows = 8 }: TableSkeletonProps) {
  const widths = ["45%", "20%", "15%", "12%", "10%", "8%"];

  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: "12px 14px" }}>
              <div
                className="nyx-skeleton"
                style={{
                  height: 14,
                  width: widths[ci % widths.length],
                  minWidth: 40,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
