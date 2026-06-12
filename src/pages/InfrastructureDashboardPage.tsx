import JurisdictionDashboardPage, {
  DEFAULT_JURISDICTION_BRAND,
  type InfraKpiDef,
  type JurisdictionBrand,
} from "./JurisdictionDashboardPage";

/* Infrastructure Dashboard — mirrors the Jurisdiction Dashboard pattern but the
   KPI band counts BioMed supply-chain assets (manufacturing, warehouse,
   distribution, staging, fixed sites) instead of FY25 collection sums. Same
   live web map, same Division → Region → District filters, same clickable
   sites. The site layers all live in the base ARC Jurisdiction web map, so no
   extra data wiring — only the KPI definitions and the default layer preset
   change. */

const INFRA_KPIS: InfraKpiDef[] = [
  { key: "manufacturing", label: "Manufacturing Sites", hint: "Manufacturing & processing locations", layerTokens: [["manufactur"]] },
  { key: "warehouse", label: "Warehouses", hint: "Warehouse & BioMed logistics anchors", layerTokens: [["warehouse"]] },
  { key: "distribution", label: "Distribution Sites", hint: "Distribution & fulfillment anchors", layerTokens: [["distribution"]] },
  { key: "staging", label: "Staging Sites", hint: "Mobile staging & collection support sites", layerTokens: [["staging"]] },
  { key: "fixed", label: "Fixed Sites", hint: "Donor-facing fixed collection sites", layerTokens: [["fixed sites"]], accent: true },
];

const aboutExtra = (
  <>
    <h3>What this view answers</h3>
    <p>
      In one glance: what BioMed supply-chain assets exist and where. Manufacturing, warehouses,
      distribution anchors, mobile staging, and fixed collection sites — counted across the network,
      mapped on a live operating picture, and filterable by BioMed division, region, and district.
    </p>
    <p>
      Site counts are network totals (the assets we have). Geography filters scope the map and the
      clickable site list; per-geography asset counts are a planned refinement as the site layers gain
      consistent division/region/district attributes.
    </p>
  </>
);

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
  aboutExtra,
  infraKpis: INFRA_KPIS,
  initialPreset: "infrastructure",
  filterHeading: "Filter by Geography",
};

export default function InfrastructureDashboardPage() {
  return <JurisdictionDashboardPage brand={INFRASTRUCTURE_BRAND} />;
}
