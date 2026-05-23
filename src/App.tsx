import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const HubPage = lazy(() => import("./pages/HubPage"));
const SectionDeckPage = lazy(() => import("./pages/SectionDeckPage"));
const BiomedLiveMapToolPage = lazy(() => import("./pages/BiomedLiveMapToolPage"));
const BiomedMasterMapV3Page = lazy(() => import("./pages/BiomedMasterMapV3Page"));
const HospitalNetworkPage = lazy(() => import("./pages/HospitalNetworkPage"));

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
