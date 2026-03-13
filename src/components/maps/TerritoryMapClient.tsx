"use client";
import { useEffect, useRef } from "react";

// State center lat/lng lookup
const STATE_CENTERS: Record<string, [number, number]> = {
  AL:[32.8,-86.8],AK:[64.2,-153.4],AZ:[34.3,-111.1],AR:[34.8,-92.2],CA:[36.8,-119.4],
  CO:[39.0,-105.5],CT:[41.6,-72.7],DE:[39.0,-75.5],FL:[28.7,-82.4],GA:[32.7,-83.2],
  HI:[20.9,-157.0],ID:[44.4,-114.5],IL:[40.0,-89.2],IN:[39.9,-86.3],IA:[42.0,-93.5],
  KS:[38.5,-98.4],KY:[37.5,-85.3],LA:[31.1,-91.9],ME:[45.4,-69.2],MD:[39.0,-76.8],
  MA:[42.3,-71.8],MI:[44.3,-85.4],MN:[46.4,-93.1],MS:[32.7,-89.7],MO:[38.5,-92.5],
  MT:[47.0,-110.4],NE:[41.5,-99.9],NV:[39.3,-116.6],NH:[43.7,-71.6],NJ:[40.1,-74.5],
  NM:[34.8,-106.2],NY:[42.2,-74.9],NC:[35.5,-79.4],ND:[47.5,-100.5],OH:[40.4,-82.8],
  OK:[35.6,-97.5],OR:[44.1,-120.5],PA:[40.9,-77.8],RI:[41.7,-71.5],SC:[33.9,-81.0],
  SD:[44.4,-100.2],TN:[35.9,-86.7],TX:[31.5,-99.3],UT:[39.3,-111.1],VT:[44.0,-72.7],
  VA:[37.8,-78.2],WA:[47.4,-120.4],WV:[38.9,-80.5],WI:[44.3,-89.8],WY:[43.0,-107.6],
  DC:[38.9,-77.0],
};

type HospStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | string;
interface MapHospital {
  id: string; hospitalName: string; city?: string | null; state?: string | null;
  status: HospStatus; assignedRepName?: string | null;
}
interface MapRep {
  id: string; name: string; color: string; states: string[];
}

interface Props {
  hospitals: MapHospital[];
  repTerritories: MapRep[];
}

const STATUS_CLR: Record<string, string> = {
  ACTIVE: "var(--nyx-accent)", PROSPECT: "#fbbf24", INACTIVE: "#64748b",
};

// Slightly jitter markers within the same state so they don't stack
function jitter(seed: number, range: number) {
  // deterministic-ish jitter using index
  const a = Math.sin(seed * 9301 + 49297) * 233280;
  return ((a - Math.floor(a)) - 0.5) * range * 2;
}

export default function TerritoryMapClient({ hospitals, repTerritories }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically require leaflet to avoid SSR issues
    import("leaflet").then(L => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [34.3, -111.5],
        zoom: 6,
        minZoom: 3,
        maxZoom: 12,
        scrollWheelZoom: true,
        zoomControl: true,
      });

      // Dark tile layer using CartoDB Dark Matter
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // Draw state territory fills per rep
      repTerritories.forEach(rep => {
        rep.states.forEach(state => {
          const center = STATE_CENTERS[state];
          if (!center) return;
          L.circle(center, {
            radius: 180000,
            color: rep.color,
            fillColor: rep.color,
            fillOpacity: 0.08,
            weight: 1,
            dashArray: "4 4",
          }).addTo(map).bindTooltip(`<b>${rep.name}</b><br>${state}`, { sticky: true });
        });
      });

      // State label markers
      const stateAssignments = new Map<string, string>();
      repTerritories.forEach(rep => rep.states.forEach(s => stateAssignments.set(s, rep.name)));

      // Hospital markers
      const stateCounts = new Map<string, number>();
      hospitals.forEach((h, idx) => {
        const state = h.state ?? "";
        const center = STATE_CENTERS[state];
        if (!center) return;

        const count = stateCounts.get(state) ?? 0;
        stateCounts.set(state, count + 1);

        const lat = center[0] + jitter(idx * 3, 0.6);
        const lng = center[1] + jitter(idx * 3 + 1, 0.8);
        const color = STATUS_CLR[h.status] ?? "#64748b";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};
            border:2px solid rgba(255,255,255,0.9);
            box-shadow:0 0 8px ${color}cc,0 0 2px rgba(0,0,0,0.8);
            cursor:pointer;
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;line-height:1.6">
              <div style="font-weight:800;font-size:0.95rem;margin-bottom:4px">${h.hospitalName}</div>
              <div style="font-size:0.78rem;color:#666">${h.city ?? ""}${h.city && h.state ? ", " : ""}${h.state ?? ""}</div>
              <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
                <span style="font-size:0.78rem;font-weight:700;text-transform:uppercase">${h.status}</span>
              </div>
              ${h.assignedRepName ? `<div style="font-size:0.75rem;color:#888;margin-top:2px">Rep: ${h.assignedRepName}</div>` : ""}
            </div>
          `, { maxWidth: 250 });
      });

      // Legend
      const LegendControl = L.Control.extend({
        onAdd() {
          const div = L.DomUtil.create("div");
          div.style.cssText = "background:rgba(10,18,35,0.9);padding:12px 16px;border-radius:8px;border:1px solid var(--nyx-accent-mid);font-size:0.75rem;color:#d8e8f4;min-width:150px";
          div.innerHTML = `
            <div style="font-weight:700;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--nyx-accent-label);margin-bottom:8px">Account Status</div>
            ${[["ACTIVE","var(--nyx-accent)"],["PROSPECT","#fbbf24"],["INACTIVE","#64748b"]].map(([s,c]) =>
              `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c}"></span>${s}
              </div>`
            ).join("")}
          `;
          return div;
        },
      });
      new LegendControl({ position: "bottomright" as L.ControlPosition }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [hospitals, repTerritories]);

  return (
    <>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: "100%", height: 500, borderRadius: 10, overflow: "hidden" }} />
    </>
  );
}
