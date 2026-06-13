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
    <label className="rcbar__field">
      View
      <select
        value={active.id}
        onChange={(event) => {
          const next = lensById(event.target.value as DashboardLensId);
          navigate(next.path);
        }}
        data-testid="dashboard-lens"
        aria-label="Dashboard view"
      >
        {DASHBOARD_LENSES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  return <JurisdictionDashboardPage key={active.id} brand={active.brand} lensControl={lensControl} />;
}
