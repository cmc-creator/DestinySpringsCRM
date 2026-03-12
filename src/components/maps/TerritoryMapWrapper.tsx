"use client";
import dynamic from "next/dynamic";

// ssr: false MUST live in a Client Component — not a Server Component
const TerritoryMapClient = dynamic(
  () => import("@/components/maps/TerritoryMapClient"),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(216,232,244,0.35)", fontSize: "0.875rem", letterSpacing: "0.05em" }}>
        Loading map…
      </div>
    ),
  }
);

type MapHospital = {
  id: string; hospitalName: string; city?: string | null; state?: string | null;
  status: string; assignedRepName?: string | null;
};
type MapRep = { id: string; name: string; color: string; states: string[] };

export default function TerritoryMapWrapper({
  hospitals, repTerritories,
}: {
  hospitals: MapHospital[];
  repTerritories: MapRep[];
}) {
  return <TerritoryMapClient hospitals={hospitals} repTerritories={repTerritories} />;
}
