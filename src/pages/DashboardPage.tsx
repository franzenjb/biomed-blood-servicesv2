import { Link } from "react-router-dom";
import { arcJurisdictionDashboardSource } from "../config/arcgisLayers";
import "./DashboardPage.css";

export default function DashboardPage() {
  return (
    <section className="dash" data-testid="dashboard">
      <Link to="/hub" className="dash__back" data-testid="dash-back">
        ← Hub
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
