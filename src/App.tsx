import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
// Notes/cohort FAB temporarily hidden (2026-06-13, Dragon's request). Restore by
// re-adding the import + <NotesPanel /> below.
// import NotesPanel from "./components/NotesPanel";
import { GlobalAboutTheData } from "./components/DataSourcesModal";

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
const BioMedDashboardPage = lazy(() => import("./pages/BioMedDashboardPage"));

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
          {/* Merged BioMed Dashboard — one engine, three lenses. Old paths kept
              as deep-links so nothing breaks; each preselects its lens. */}
          <Route path="/jurisdiction-dashboard" element={<BioMedDashboardPage lens="overview" />} />
          <Route path="/jurisdiction" element={<BioMedDashboardPage lens="overview" />} />
          <Route path="/hospital-network" element={<BioMedDashboardPage lens="hospital" />} />
          <Route path="/infrastructure-dashboard" element={<BioMedDashboardPage lens="infrastructure" />} />
          <Route path="/infrastructure" element={<BioMedDashboardPage lens="infrastructure" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <GlobalAboutTheData />
      {/* <NotesPanel /> — temporarily hidden per Dragon (2026-06-13) */}
    </div>
  );
}
