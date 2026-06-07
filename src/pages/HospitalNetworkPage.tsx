import { Navigate } from "react-router-dom";
import MapShell from "../maps/MapShell";
import { hospitalPortfolioMapSource } from "../config/arcgisLayers";

export default function HospitalNetworkPage() {
  // Maps don't work well on phones — send mobile visitors back to the hub.
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    return <Navigate to="/hub" replace />;
  }
  return (
    <MapShell
      eyebrow="Hospital Network"
      title="Hospital Network"
      webMapItemId={hospitalPortfolioMapSource.webMapItemId}
      aboutMeta="Live Red Cross ArcGIS · Hospital portfolio"
      aboutLead="A live view of the hospitals the Red Cross supplies — their distribution sites, portfolio footprints, tiering, and site-opportunity layers — read straight from the published Red Cross ArcGIS web map. When the source updates, this view updates with it."
      aboutPoints={[
        { label: "Layers tab", text: "Turn distribution, portfolio, tiering, and opportunity layers on and off, grouped by category." },
        { label: "Find a place", text: "Jump the map to any city, county, or state to focus on a hospital footprint." },
        { label: "Click a hospital", text: "Opens a clean detail card in the side panel — tier, distribution site, and key facts. Never a raw Esri popup." },
        { label: "Map controls", text: "Home, zoom, scale bar, and a basemap gallery sit on the map itself." },
      ]}
    />
  );
}
