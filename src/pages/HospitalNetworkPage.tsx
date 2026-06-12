import { Navigate } from "react-router-dom";
import JurisdictionDashboardPage, {
  DEFAULT_JURISDICTION_BRAND,
  type InfraKpiDef,
  type JurisdictionBrand,
} from "./JurisdictionDashboardPage";
import { hospitalNetworkSupplementalLayers } from "../config/arcgisLayers";

/* Hospital Network — the jurisdiction-engine treatment (backlog item 4A).
   Count KPIs + Division/Region/District filters + clickable sites, with the
   portfolio visuals (footprints, site opportunities) lifted from Troy's
   Hospital Portfolio web map as supplemental layers. When Troy's dashboard
   concept lands, this page absorbs it — the engine and data wiring stay. */

const HOSPITAL_KPIS: InfraKpiDef[] = [
  { key: "hospitals", label: "Hospitals Served", hint: "Hospitals receiving Red Cross blood products", layerTokens: [["hospital locations"], ["hospital"]], accent: true },
  { key: "distribution", label: "Distribution Sites", hint: "Distribution & fulfillment anchors", layerTokens: [["distribution"]] },
  { key: "irl", label: "IRL Labs", hint: "Immunohematology reference labs", layerTokens: [["irl"]] },
  { key: "portfolios", label: "Portfolio Footprints", hint: "Tiered hospital-portfolio service areas", layerTokens: [["portfolio footprint"], ["portfolio"]] },
];

const aboutExtra = (
  <>
    <h3>What this view answers</h3>
    <p>
      The patient-care side of the blood supply: the hospitals the Red Cross serves, the
      distribution sites and reference labs that supply them, and the tiered portfolio
      footprints around them — on the same live operating picture as the other dashboards,
      filterable by BioMed division, region, and district.
    </p>
    <p>
      Counts are network totals. The hospital story (units distributed, network relationships)
      deepens when the BioMed hospital dashboard concept is delivered — this view is built to
      absorb it without rework.
    </p>
  </>
);

const HOSPITAL_BRAND: JurisdictionBrand = {
  ...DEFAULT_JURISDICTION_BRAND,
  testId: "hospital-network-dashboard",
  appTitle: "Hospital Network",
  signInHeading: "Sign in to load the Hospital Network",
  signInCopy:
    "This dashboard reads live, private Red Cross ArcGIS layers. Sign in to load hospitals, distribution sites, reference labs, and the hospital-portfolio footprints.",
  aboutTitle: "About the Hospital Network",
  aboutLead:
    "A live view of the hospitals the Red Cross supplies — locations, portfolio footprints, distribution anchors, and reference labs — without needing GIS training.",
  calloutTitle: "BioMed Hospital Network",
  calloutSub: "Hospitals, portfolios, distribution, and IRL labs in one place.",
  aboutExtra,
  supplementalLayers: hospitalNetworkSupplementalLayers,
  infraKpis: HOSPITAL_KPIS,
  initialPreset: "hospital",
  filterHeading: "Filter by Geography",
};

export default function HospitalNetworkPage() {
  // Maps don't work well on phones — send mobile visitors back to the hub.
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    return <Navigate to="/hub" replace />;
  }
  return <JurisdictionDashboardPage brand={HOSPITAL_BRAND} />;
}
