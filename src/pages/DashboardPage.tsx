import { Link, Navigate } from "react-router-dom";
import { Home } from "lucide-react";
import { arcJurisdictionDashboardSource } from "../config/arcgisLayers";
import "./DashboardPage.css";

export default function DashboardPage() {
  // Dashboard iframe is unusable on phones — send mobile visitors back to the hub.
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    return <Navigate to="/hub" replace />;
  }
  return (
    <section className="dash" data-testid="dashboard">
      <Link to="/hub" className="dash__back" aria-label="Return to hub" title="Return to hub" data-testid="dash-back">
        <Home aria-hidden="true" size={17} />
        <span className="visually-hidden">Return to hub</span>
      </Link>
      <iframe
        className="dash__frame"
        src={arcJurisdictionDashboardSource.dashboardUrl}
        title="ARC Jurisdiction Dashboard"
        allowFullScreen
        data-testid="dash-frame"
      />
    </section>
  );
}
