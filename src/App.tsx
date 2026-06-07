import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NotesPanel from "./components/NotesPanel";

const HomePage = lazy(() => import("./pages/HomePage"));
const HubPage = lazy(() => import("./pages/HubPage"));
const SectionDeckPage = lazy(() => import("./pages/SectionDeckPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DeckViewerPage = lazy(() => import("./pages/DeckViewerPage"));
const VideoDemoPage = lazy(() => import("./pages/VideoDemoPage"));
const InfographicsPage = lazy(() => import("./pages/InfographicsPage"));
const DecksGalleryPage = lazy(() => import("./pages/DecksGalleryPage"));
const RegionsPage = lazy(() => import("./pages/RegionsPage"));
const BiomedOpsWorkbenchPage = lazy(() => import("./pages/BiomedOpsWorkbenchPage"));
const BiomedLayerAtlasPage = lazy(() => import("./pages/BiomedLayerAtlasPage"));
const HospitalNetworkPage = lazy(() => import("./pages/HospitalNetworkPage"));
const JurisdictionDashboardPage = lazy(() => import("./pages/JurisdictionDashboardPage"));

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
          {/* BioMed Blood Map merged into Jurisdiction Dashboard per spec §7/§19 */}
          <Route path="/map" element={<Navigate to="/jurisdiction-dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/deck/:deckId" element={<DeckViewerPage />} />
          <Route path="/video-demo" element={<VideoDemoPage />} />
          <Route path="/infographics" element={<InfographicsPage />} />
          <Route path="/decks" element={<DecksGalleryPage />} />
          <Route path="/regions" element={<RegionsPage />} />
          <Route path="/biomed-ops-workbench" element={<BiomedOpsWorkbenchPage />} />
          <Route path="/ops" element={<BiomedOpsWorkbenchPage />} />
          <Route path="/biomed-layer-atlas" element={<BiomedLayerAtlasPage />} />
          <Route path="/hospital-network" element={<HospitalNetworkPage />} />
          <Route path="/jurisdiction-dashboard" element={<JurisdictionDashboardPage />} />
          <Route path="/jurisdiction" element={<JurisdictionDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <NotesPanel />
    </div>
  );
}
