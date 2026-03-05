"use client";

interface Hospital {
  id: string;
  hospitalName: string;
  city?: string | null;
  state?: string | null;
}

interface RouteIQButtonProps {
  hospitals: Hospital[];
}

function buildRouteUrl(hospitals: Hospital[]): string {
  const destinations = hospitals
    .filter(h => h.city || h.state)
    .map(h => [h.hospitalName, h.city, h.state].filter(Boolean).join(", "))
    .slice(0, 10); // most map apps cap waypoints at 10

  if (destinations.length === 0) {
    // No location data — open generic maps search
    return "https://maps.google.com/maps";
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (isIOS) {
    // Apple Maps — supports single destination only (use first hospital)
    const dest = encodeURIComponent(destinations[0]);
    return `https://maps.apple.com/?q=${dest}`;
  }

  if (isAndroid) {
    // Android native geo intent via Google Maps URL
    const dest = encodeURIComponent(destinations[0]);
    return `geo:0,0?q=${dest}`;
  }

  // Desktop / other — Google Maps multi-stop route
  if (destinations.length === 1) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(destinations[0])}`;
  }

  const origin = encodeURIComponent(destinations[0]);
  const waypoints = destinations
    .slice(1, destinations.length - 1)
    .map(encodeURIComponent)
    .join("/");
  const dest = encodeURIComponent(destinations[destinations.length - 1]);

  const base = `https://maps.google.com/maps/dir/${origin}/${waypoints ? waypoints + "/" : ""}${dest}`;
  return base;
}

export default function RouteIQButton({ hospitals }: RouteIQButtonProps) {
  function handleClick() {
    const url = buildRouteUrl(hospitals);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (hospitals.length === 0) return null;

  return (
    <button
      onClick={handleClick}
      title="Open optimised route in your native map app"
      style={{
        background: "var(--nyx-accent-dim)",
        border: "1px solid var(--nyx-accent-str)",
        borderRadius: 8,
        padding: "10px 18px",
        color: "var(--nyx-accent)",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      Route IQ
    </button>
  );
}
