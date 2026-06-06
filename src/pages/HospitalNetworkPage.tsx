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
    />
  );
}
