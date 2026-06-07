import { biomedLayerAtlasSource } from "../config/arcgisLayers";
import BiomedOpsWorkbenchPage from "./BiomedOpsWorkbenchPage";

export default function BiomedLayerAtlasPage() {
  return (
    <BiomedOpsWorkbenchPage
      title={biomedLayerAtlasSource.title}
      resultLabel="Explore Regions"
      supplementalLayers={biomedLayerAtlasSource.supplementalLayers}
      signInHeading="Sign in to inspect Explore Regions"
      signInCopy="Live regional layer counts, search, and selected features require the private Red Cross ArcGIS web map."
      testId="biomed-layer-atlas"
    />
  );
}
