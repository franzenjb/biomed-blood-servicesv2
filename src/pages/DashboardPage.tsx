import MapShell from "../maps/MapShell";
import { hospitalPortfolioMapSource } from "../config/arcgisLayers";

export default function DashboardPage() {
  return (
    <MapShell
      eyebrow="Hospital Network"
      title="Hospital Reach & Distribution"
      webMapItemId={hospitalPortfolioMapSource.webMapItemId}
    />
  );
}
