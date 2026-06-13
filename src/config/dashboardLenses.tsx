import {
  DEFAULT_JURISDICTION_BRAND,
  type InfraKpiDef,
  type JurisdictionBrand,
} from "../pages/JurisdictionDashboardPage";
import { hospitalNetworkSupplementalLayers } from "./arcgisLayers";

/* The three dashboard "lenses" — one engine (JurisdictionDashboardPage), three
   audience framings. Merged into a single BioMed Dashboard with a View switcher
   so there's one tool to learn and one place a fix lands, instead of three
   near-identical apps. Each lens still has its own route (deep-links preserved)
   and its own KPI band / supplemental layers / about copy. */

export type DashboardLensId = "overview" | "hospital" | "infrastructure";

const HOSPITAL_KPIS: InfraKpiDef[] = [
  { key: "hospitals", label: "Hospitals Served", hint: "Hospitals receiving Red Cross blood products", layerTokens: [["hospital locations"], ["hospital"]], accent: true },
  { key: "distribution", label: "Distribution Sites", hint: "Distribution & fulfillment anchors", layerTokens: [["distribution"]] },
  { key: "irl", label: "IRL Labs", hint: "Immunohematology reference labs", layerTokens: [["irl"]] },
  { key: "portfolios", label: "Portfolio Footprints", hint: "Tiered hospital-portfolio service areas", layerTokens: [["portfolio footprint"], ["portfolio"]] },
];

const INFRA_KPIS: InfraKpiDef[] = [
  { key: "manufacturing", label: "Manufacturing Sites", hint: "Manufacturing & processing locations", layerTokens: [["manufactur"]] },
  { key: "warehouse", label: "Warehouses", hint: "Warehouse & BioMed logistics anchors", layerTokens: [["warehouse"]] },
  { key: "distribution", label: "Distribution Sites", hint: "Distribution & fulfillment anchors", layerTokens: [["distribution"]] },
  { key: "staging", label: "Staging Sites", hint: "Mobile staging & collection support sites", layerTokens: [["staging"]] },
  { key: "fixed", label: "Fixed Sites", hint: "Donor-facing fixed collection sites", layerTokens: [["fixed sites"]], accent: true },
];

const hospitalAboutExtra = (
  <>
    <h3>What this view answers</h3>
    <p>
      The patient-care side of the blood supply: the hospitals the Red Cross serves, the
      distribution sites and reference labs that supply them, and the tiered portfolio
      footprints around them — on the same live operating picture as the other views,
      filterable by BioMed division, region, and district.
    </p>
    <p>
      Counts scope to the selected geography. The hospital story (units distributed, network
      relationships) deepens when the BioMed hospital dashboard concept is delivered — this view
      is built to absorb it without rework.
    </p>
  </>
);

const infraAboutExtra = (
  <>
    <h3>What this view answers</h3>
    <p>
      In one glance: what BioMed supply-chain assets exist and where. Manufacturing, warehouses,
      distribution anchors, mobile staging, and fixed collection sites — counted across the network,
      mapped on a live operating picture, and filterable by BioMed division, region, and district.
    </p>
    <p>
      Site counts scope to the selected geography (and to the whole network when nothing is
      filtered), with the map and clickable site list always in sync.
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
  aboutExtra: hospitalAboutExtra,
  supplementalLayers: hospitalNetworkSupplementalLayers,
  infraKpis: HOSPITAL_KPIS,
  initialPreset: "hospital",
  filterHeading: "Filter by Geography",
};

const INFRASTRUCTURE_BRAND: JurisdictionBrand = {
  ...DEFAULT_JURISDICTION_BRAND,
  testId: "infrastructure-dashboard",
  appTitle: "Infrastructure Dashboard",
  signInHeading: "Sign in to load the Infrastructure Dashboard",
  signInCopy:
    "This dashboard reads live, private Red Cross ArcGIS layers. Sign in to load manufacturing, warehouse, distribution, staging, and fixed-site locations across the BioMed network.",
  aboutTitle: "About the Infrastructure Dashboard",
  aboutLead:
    "A complete view of BioMed manufacturing, logistics, and collection infrastructure — what assets exist, where they sit, and how the network covers the country.",
  calloutTitle: "BioMed Supply-Chain Infrastructure",
  calloutSub: "Manufacturing, warehouses, distribution, staging, and fixed sites in one place.",
  aboutExtra: infraAboutExtra,
  infraKpis: INFRA_KPIS,
  initialPreset: "infrastructure",
  filterHeading: "Filter by Geography",
};

export type DashboardLens = {
  id: DashboardLensId;
  label: string;
  path: string;
  brand: JurisdictionBrand;
};

// Order = the order shown in the View switcher.
export const DASHBOARD_LENSES: DashboardLens[] = [
  { id: "overview", label: "Jurisdiction Dashboard", path: "/jurisdiction-dashboard", brand: DEFAULT_JURISDICTION_BRAND },
  { id: "hospital", label: "Hospital Network", path: "/hospital-network", brand: HOSPITAL_BRAND },
  { id: "infrastructure", label: "Infrastructure Dashboard", path: "/infrastructure-dashboard", brand: INFRASTRUCTURE_BRAND },
];

export function lensById(id: DashboardLensId | undefined): DashboardLens {
  return DASHBOARD_LENSES.find((lens) => lens.id === id) ?? DASHBOARD_LENSES[0];
}
