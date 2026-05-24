import MapShell from "../maps/MapShell";
import { standaloneBiomedMapSource } from "../config/arcgisLayers";

export default function MapPage() {
  return (
    <MapShell
      eyebrow="BioMed Blood Map"
      title="Collections, drives & geography"
      webMapItemId={standaloneBiomedMapSource.webMapItemId}
    />
  );
}
