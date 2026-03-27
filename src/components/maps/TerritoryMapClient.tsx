"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

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

const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA",
  COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE", FLORIDA: "FL", GEORGIA: "GA",
  HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA",
  KANSAS: "KS", KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD",
  MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO",
  MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", OHIO: "OH",
  OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT", VERMONT: "VT",
  VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV", WISCONSIN: "WI", WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
};

function normalizeStateCode(rawState: string | null | undefined): string | null {
  if (!rawState) return null;
  const value = rawState.trim();
  if (!value) return null;

  const upper = value.toUpperCase();
  const directCode = upper.match(/\b([A-Z]{2})\b/);
  if (directCode && STATE_CENTERS[directCode[1]]) return directCode[1];

  const cleanedName = upper.replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
  return STATE_NAME_TO_CODE[cleanedName] ?? null;
}

type HospStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | string;
interface MapHospital {
  id: string; hospitalName: string; city?: string | null; state?: string | null;
  status: HospStatus; assignedRepName?: string | null; referralMapLabel?: string | null; referralMapColor?: string | null;
}
interface MapRep {
  id: string; userId: string; name: string; color: string; states: string[];
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

const ALL_REPS = "__all__";
const UNASSIGNED = "__unassigned__";

type SavedTerritoryView = {
  id: string;
  label: string;
  repFilter: string;
};

function normalizeSavedViews(raw: unknown): SavedTerritoryView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const view = item as Record<string, unknown>;
      if (typeof view.id !== "string" || typeof view.label !== "string" || typeof view.repFilter !== "string") return null;
      return { id: view.id, label: view.label, repFilter: view.repFilter };
    })
    .filter((item): item is SavedTerritoryView => Boolean(item));
}

export default function TerritoryMapClient({ hospitals, repTerritories }: Props) {
  const { data: session } = useSession();
  const sessionUser = session?.user;
  const sessionRole = sessionUser?.role;
  const sessionName = sessionUser?.name;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [repFilter, setRepFilter] = useState<string>(ALL_REPS);
  const [savedViews, setSavedViews] = useState<SavedTerritoryView[]>([]);
  const [defaultViewId, setDefaultViewId] = useState<string>("");
  const [newViewLabel, setNewViewLabel] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const repOptions = useMemo(() => {
    const names = new Set<string>();
    repTerritories.forEach((rep) => {
      if (rep.name?.trim()) names.add(rep.name.trim());
    });
    hospitals.forEach((h) => {
      if (h.assignedRepName?.trim()) names.add(h.assignedRepName.trim());
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [hospitals, repTerritories]);

  const hasUnassigned = useMemo(
    () => hospitals.some((h) => !h.assignedRepName?.trim()),
    [hospitals]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `nyx-map-rep-filter:${window.location.pathname}`;
    const stored = localStorage.getItem(key);
    if (stored && (stored === ALL_REPS || stored === UNASSIGNED || repOptions.includes(stored))) {
      setRepFilter(stored);
    }

    let active = true;
    fetch("/api/preferences")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ preferences?: unknown }>;
      })
      .then(async (data) => {
        if (!active || !data?.preferences || typeof data.preferences !== "object" || Array.isArray(data.preferences)) return;
        const prefRoot = data.preferences as Record<string, unknown>;
        const territory = prefRoot.territory && typeof prefRoot.territory === "object" && !Array.isArray(prefRoot.territory)
          ? prefRoot.territory as Record<string, unknown>
          : null;
        if (!territory) return;

        const nextViews = normalizeSavedViews(territory.savedViews);
        const nextDefault = typeof territory.defaultViewId === "string" ? territory.defaultViewId : "";
        const defaultsInitialized = territory.defaultsInitialized === true;
        
        // Apply role-smart defaults on first login
        const finalDefault = nextDefault;
        let finalFilter = ALL_REPS;
        const isFirstLogin = !defaultsInitialized && !nextDefault && nextViews.length === 0;
        
        if (isFirstLogin && sessionUser) {
          if (sessionRole === "REP") {
            // Prefer stable ID match; only fall back to display-name matching if needed.
            const userRep = repTerritories.find((rep) => rep.userId === sessionUser.id);
            if (userRep?.name && repOptions.includes(userRep.name)) {
              finalFilter = userRep.name;
            } else if (sessionName) {
              const userRepByName = repOptions.find((name) => name.toLowerCase() === sessionName.toLowerCase());
              if (userRepByName) {
                finalFilter = userRepByName;
              }
            }
          } else if (sessionRole === "ADMIN") {
            // For ADMIN users, default to All Territories (already the default)
            finalFilter = ALL_REPS;
          }

          await fetch("/api/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              preferences: {
                territory: {
                  savedViews: nextViews,
                  defaultViewId: finalDefault,
                  defaultsInitialized: true,
                },
              },
            }),
          }).catch(() => {
            // best-effort
          });
        }
        
        setSavedViews(nextViews);
        setDefaultViewId(finalDefault);

        const defaultView = nextViews.find((view) => view.id === finalDefault);
        if (defaultView && (defaultView.repFilter === ALL_REPS || defaultView.repFilter === UNASSIGNED || repOptions.includes(defaultView.repFilter))) {
          setRepFilter(defaultView.repFilter);
        } else {
          setRepFilter(finalFilter);
        }
      })
      .catch(() => {
        // best-effort personalization
      });

    return () => {
      active = false;
    };
  }, [repOptions, repTerritories, sessionUser, sessionRole, sessionName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `nyx-map-rep-filter:${window.location.pathname}`;
    localStorage.setItem(key, repFilter);
  }, [repFilter]);

  useEffect(() => {
    if (repFilter === ALL_REPS || repFilter === UNASSIGNED || repOptions.includes(repFilter)) return;
    setRepFilter(ALL_REPS);
  }, [repFilter, repOptions]);

  const persistTerritoryPrefs = async (views: SavedTerritoryView[], defaultId: string) => {
    setSavingPrefs(true);
    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            territory: {
              savedViews: views,
              defaultViewId: defaultId,
            },
          },
        }),
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const filteredHospitals = useMemo(() => {
    if (repFilter === ALL_REPS) return hospitals;
    if (repFilter === UNASSIGNED) {
      return hospitals.filter((h) => !h.assignedRepName?.trim());
    }
    return hospitals.filter((h) => h.assignedRepName?.trim() === repFilter);
  }, [hospitals, repFilter]);

  const filteredTerritories = useMemo(() => {
    if (repFilter === ALL_REPS) return repTerritories;
    if (repFilter === UNASSIGNED) return [];
    return repTerritories.filter((rep) => rep.name?.trim() === repFilter);
  }, [repFilter, repTerritories]);

  const createSavedView = async () => {
    const label = newViewLabel.trim();
    if (!label) return;
    const view: SavedTerritoryView = {
      id: `view-${Date.now()}`,
      label: label.slice(0, 40),
      repFilter,
    };
    const nextViews = [view, ...savedViews].slice(0, 10);
    setSavedViews(nextViews);
    setNewViewLabel("");
    await persistTerritoryPrefs(nextViews, defaultViewId);
  };

  const removeSavedView = async (id: string) => {
    const nextViews = savedViews.filter((view) => view.id !== id);
    const nextDefault = defaultViewId === id ? "" : defaultViewId;
    setSavedViews(nextViews);
    setDefaultViewId(nextDefault);
    await persistTerritoryPrefs(nextViews, nextDefault);
  };

  const setDefaultView = async (id: string) => {
    setDefaultViewId(id);
    await persistTerritoryPrefs(savedViews, id);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      (mapRef.current as { remove: () => void }).remove();
      mapRef.current = null;
    }

    let cancelled = false;

    // Dynamically require leaflet to avoid SSR issues
    import("leaflet").then(L => {
      if (cancelled || !containerRef.current) return;

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
      filteredTerritories.forEach(rep => {
        rep.states.forEach(state => {
          const normalizedState = normalizeStateCode(state);
          if (!normalizedState) return;
          const center = STATE_CENTERS[normalizedState];
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

      const referralLegend = new Map<string, string>();

      // Hospital markers
      filteredHospitals.forEach((h, idx) => {
        const state = normalizeStateCode(h.state) ?? "";
        const center = STATE_CENTERS[state];
        if (!center) return;

        const lat = center[0] + jitter(idx * 3, 0.6);
        const lng = center[1] + jitter(idx * 3 + 1, 0.8);
        const color = h.referralMapColor ?? STATUS_CLR[h.status] ?? "#64748b";
        const tag = h.referralMapLabel ?? h.status;
        referralLegend.set(tag, color);

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
                <span style="font-size:0.78rem;font-weight:700">${tag}</span>
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
            <div style="font-weight:700;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--nyx-accent-label);margin-bottom:8px">Referral Map Colors</div>
            ${(referralLegend.size ? [...referralLegend.entries()] : [["ACTIVE","var(--nyx-accent)"],["PROSPECT","#fbbf24"],["INACTIVE","#64748b"]]).map(([s,c]) =>
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
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [filteredHospitals, filteredTerritories]);

  return (
    <div style={{ position: "relative" }}>
      {(repOptions.length > 1 || hasUnassigned) && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 500, background: "rgba(10,18,35,0.9)", border: "1px solid var(--nyx-accent-mid)", borderRadius: 8, padding: "8px 10px", minWidth: 210 }}>
          <label htmlFor="territory-map-filter" style={{ display: "block", color: "var(--nyx-accent-label)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            View Territory
          </label>
          <select
            id="territory-map-filter"
            value={repFilter}
            onChange={(event) => setRepFilter(event.target.value)}
            style={{ width: "100%", background: "rgba(0,0,0,0.35)", color: "var(--nyx-text)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 6, padding: "6px 8px", fontSize: "0.75rem" }}
          >
            <option value={ALL_REPS}>All Territories</option>
            {repOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
            {hasUnassigned && <option value={UNASSIGNED}>Unassigned Only</option>}
          </select>
          <div style={{ marginTop: 6, color: "var(--nyx-text-muted)", fontSize: "0.67rem" }}>
            Showing {filteredHospitals.length} location{filteredHospitals.length === 1 ? "" : "s"}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            <input
              value={newViewLabel}
              onChange={(event) => setNewViewLabel(event.target.value)}
              placeholder="Save current view"
              style={{ flex: 1, background: "rgba(0,0,0,0.35)", color: "var(--nyx-text)", border: "1px solid var(--nyx-accent-dim)", borderRadius: 6, padding: "5px 8px", fontSize: "0.72rem" }}
            />
            <button
              type="button"
              onClick={createSavedView}
              disabled={savingPrefs || !newViewLabel.trim()}
              style={{ background: "var(--nyx-accent-dim)", color: "var(--nyx-accent)", border: "1px solid var(--nyx-accent-str)", borderRadius: 6, padding: "5px 8px", fontSize: "0.7rem", cursor: savingPrefs ? "not-allowed" : "pointer" }}
            >
              Save
            </button>
          </div>
          {savedViews.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {savedViews.map((view) => {
                const active = view.repFilter === repFilter;
                const isDefault = view.id === defaultViewId;
                return (
                  <div key={view.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, border: `1px solid ${active ? "var(--nyx-accent-str)" : "var(--nyx-border)"}`, background: active ? "var(--nyx-accent-dim)" : "rgba(255,255,255,0.03)", padding: "3px 8px" }}>
                    <button type="button" onClick={() => setRepFilter(view.repFilter)} style={{ background: "transparent", border: "none", color: active ? "var(--nyx-accent)" : "var(--nyx-text-muted)", fontSize: "0.68rem", cursor: "pointer", padding: 0 }}>
                      {isDefault ? "* " : ""}{view.label}
                    </button>
                    <button type="button" onClick={() => void setDefaultView(view.id)} title="Set default" style={{ background: "transparent", border: "none", color: isDefault ? "var(--nyx-accent)" : "var(--nyx-text-muted)", fontSize: "0.66rem", cursor: "pointer", padding: 0 }}>
                      D
                    </button>
                    <button type="button" onClick={() => void removeSavedView(view.id)} title="Delete" style={{ background: "transparent", border: "none", color: "var(--nyx-text-muted)", fontSize: "0.66rem", cursor: "pointer", padding: 0 }}>
                      x
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: "100%", height: "clamp(300px, 50vh, 620px)", borderRadius: 10, overflow: "hidden" }} />
    </div>
  );
}
