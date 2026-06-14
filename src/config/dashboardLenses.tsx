import {
  DEFAULT_JURISDICTION_BRAND,
  type JurisdictionBrand,
} from "../pages/JurisdictionDashboardPage";
import { hospitalNetworkSupplementalLayers } from "./arcgisLayers";

/* The three dashboard "lenses" — one engine (JurisdictionDashboardPage), three
   audience framings. Merged into a single BioMed Dashboard with a View switcher
   so there's one tool to learn and one place a fix lands, instead of three
   near-identical apps. Each lens has its own route (deep-links preserved),
   supplemental layers, and default layer preset. The TOP KPI band is FY25
   performance on every lens (drives/collections/SDP/plasma/fixed); each lens's
   asset counts live in the right-bar Detail scorecard. */

export type DashboardLensId = "overview" | "hospital" | "infrastructure";

const hospitalAboutExtra = (
  <>
    <h3>What This View Answers</h3>
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
    <h3>What This View Answers</h3>
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
