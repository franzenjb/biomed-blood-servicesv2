import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const HubPage = lazy(() => import("./pages/HubPage"));
const SectionDeckPage = lazy(() => import("./pages/SectionDeckPage"));
const BiomedLiveMapToolPage = lazy(() => import("./pages/BiomedLiveMapToolPage"));
const BiomedMasterMapV3Page = lazy(() => import("./pages/BiomedMasterMapV3Page"));
const HospitalNetworkPage = lazy(() => import("./pages/HospitalNetworkPage"));
const SiteMapToolPage = lazy(() => import("./pages/SiteMapToolPage"));
const BiomedOpsWorkbenchPage = lazy(() => import("./pages/BiomedOpsWorkbenchPage"));
const BiomedLayerExplorerPage = lazy(() => import("./pages/BiomedLayerExplorerPage"));
const MapsPage = lazy(() => import("./pages/MapsPage"));

function Fallback() {
  return (
    <div className="route-loading" role="status">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/s/:sectionId" element={<SectionDeckPage />} />
          <Route path="/map" element={<BiomedLiveMapToolPage />} />
          <Route path="/map-v3" element={<BiomedMasterMapV3Page />} />
          <Route path="/dashboard" element={<HospitalNetworkPage />} />
          <Route path="/map-tool" element={<SiteMapToolPage />} />
          <Route path="/ops" element={<BiomedOpsWorkbenchPage />} />
          <Route path="/layers" element={<BiomedLayerExplorerPage />} />
          <Route path="/maps-menu" element={<MapsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
