import { biomedLayerAtlasSource } from "../config/arcgisLayers";
import BiomedOpsWorkbenchPage from "./BiomedOpsWorkbenchPage";

export default function BiomedLayerAtlasPage() {
  return (
    <BiomedOpsWorkbenchPage
      title={biomedLayerAtlasSource.title}
      resultLabel="Layer atlas"
      supplementalLayers={biomedLayerAtlasSource.supplementalLayers}
      signInHeading="Sign in to inspect the full layer atlas"
      signInCopy="The Workbench layer inventory plus the supplemental source layer are listed here. Live counts, search, and selected features require the private Red Cross ArcGIS web map."
      testId="biomed-layer-atlas"
    />
  );
}
