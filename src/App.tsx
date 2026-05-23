import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppMenu from "./components/AppMenu";

const HomePage = lazy(() => import("./pages/HomePage"));
const SectionDeckPage = lazy(() => import("./pages/SectionDeckPage"));
const MapPage = lazy(() => import("./pages/MapPage"));

function Fallback() {
  return (
    <div className="route-loading" role="status">
      Loading…
    </div>
  );
}

export default function App() {
  const location = useLocation();
  // Decks have their own chrome; keep the floating Explore trigger off them.
  const showMenu = !location.pathname.startsWith("/s/");

  return (
    <div className="app-shell">
      {showMenu && <AppMenu />}
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/s/:sectionId" element={<SectionDeckPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
