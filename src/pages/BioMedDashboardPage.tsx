import { Navigate, useNavigate } from "react-router-dom";
import JurisdictionDashboardPage from "./JurisdictionDashboardPage";
import { DASHBOARD_LENSES, lensById, type DashboardLensId } from "../config/dashboardLenses";

/* The merged BioMed Dashboard. One engine, three lenses (Jurisdiction / Hospital
   Network / Infrastructure) selected by a "View" switcher in the app bar. The
   lens is URL-driven so every old deep-link still resolves and the active view
   is shareable; switching the lens navigates to that view's path and remounts
   the engine cleanly (different KPI band + supplemental layers). */

export default function BioMedDashboardPage({ lens = "overview" }: { lens?: DashboardLensId }) {
  const navigate = useNavigate();

  // Maps don't work well on phones — send mobile visitors back to the hub.
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    return <Navigate to="/hub" replace />;
  }

  const active = lensById(lens);

  const lensControl = (
    <div className="rcbar__seg" role="group" aria-label="Dashboard view" data-testid="dashboard-lens">
      {DASHBOARD_LENSES.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`rcbar__seg-btn${option.id === active.id ? " is-active" : ""}`}
          aria-pressed={option.id === active.id}
          data-value={option.id}
          title={option.label}
          onClick={() => navigate(option.path)}
        >
          {option.label.replace(/ (Dashboard|Network)$/, "")}
        </button>
      ))}
    </div>
  );

  return <JurisdictionDashboardPage key={active.id} brand={active.brand} lensControl={lensControl} />;
}
