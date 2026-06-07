/**
 * Data Sources & Methodology — the application-wide credibility layer.
 *
 * Spec §30–32: every meaningful statistic must be traceable to a documented
 * source. This file is the single inventory the "About the Data" modal reads.
 * Entries marked `pending` are awaiting confirmation from Troy or Marketing &
 * Communications and should be presented as not-yet-finalized, never as fact.
 */

export type DatasetStatus = "live" | "maintained" | "pending";

export type Dataset = {
  id: string;
  name: string;
  description: string;
  /** Tile or section where this dataset is used. */
  usedIn: string;
  sourceSystem: string;
  /** Item / dashboard URL where available. */
  link?: string;
  owner: string;
  /** Refresh frequency + last-known refresh, or a pending note. */
  refresh: string;
  status: DatasetStatus;
  notes?: string;
};

export type Definition = { term: string; def: string };
export type MethodologyEntry = { topic: string; detail: string };
export type Steward = { role: string; who: string };

const AGOL = "https://arc-nhq-gis.maps.arcgis.com";

export const datasets: Dataset[] = [
  {
    id: "fs-map-layer",
    name: "FS Map Layer — FS RSMO Trade Areas",
    description:
      "Troy's hosted feature layer (FS RSMO Trade Areas Map_WFL1) with two polygon sublayers — FSRSMOTradeAreas and TradeAreaByZip — showing the observed donor reach of fixed sites. Red cell only.",
    usedIn: "Explore Regions (fixed-site trade-area drill-down)",
    sourceSystem: "Red Cross ArcGIS Online (hosted feature layer)",
    link: `${AGOL}/home/item.html?id=6af8a323a0b5468f9427baa4d6ee7481`,
    owner: "Troy Rathbun (BioMed)",
    refresh: "Item updated Jun 1, 2026; confirm refresh cadence with Troy.",
    status: "live",
    notes: "Platelet trade areas are a later phase — do not imply platelet behavior from these red cell polygons.",
  },
  {
    id: "redcell-trade-area-dashboard",
    name: "Red Cell Fixed Sites Trade Area Dashboard",
    description:
      "Troy's dashboard view built on the FS Map Layer above — the same trade-area polygons presented as an AGOL dashboard.",
    usedIn: "Reference for Explore Regions trade-area drill-down",
    sourceSystem: "Red Cross ArcGIS Online (dashboard)",
    link: `${AGOL}/apps/dashboards/f2e70959109342fca8da1fd33cfc54b2`,
    owner: "Troy Rathbun (BioMed)",
    refresh: "Reflects the FS Map Layer source.",
    status: "live",
  },
  {
    id: "biomed-collections-22-26",
    name: "BioMed Collections 22-26",
    description:
      "FY22–FY26 collection performance by ZIP, county, chapter, region, and division — the rollup behind jurisdiction counts.",
    usedIn: "Jurisdiction Dashboard · BioMed Collections",
    sourceSystem: "Red Cross ArcGIS Online (web map)",
    link: `${AGOL}/home/item.html?id=fe8739d16bf148ad9244c6c4bb0ed816`,
    owner: "BioMed",
    refresh: "FY22–FY26 reporting window; updates with the published source layer.",
    status: "live",
  },
  {
    id: "jurisdiction-geography",
    name: "Master ARC Geography 2026",
    description:
      "Authoritative Red Cross operational geography — 3,162 counties and 226 chapters with division, region, district, and chapter relationships.",
    usedIn: "Jurisdiction Dashboard · Operations Workbench · Explore Regions",
    sourceSystem: "Red Cross ArcGIS Online",
    owner: "GIS (Jeff Franzen)",
    refresh: "Maintained for FY2026.",
    status: "live",
  },
  {
    id: "future-demand",
    name: "Future Demand projections",
    description:
      "Forecasted demand and supply numbers shown in the Future Demand tile (e.g. +29.5% demand / −35.5% supply through 2045).",
    usedIn: "Future Demand",
    sourceSystem: "Averting the Future Blood Debt · AABB + Red Cross operating data · AI forecasting pilot",
    owner: "BioMed (Troy Rathbun)",
    refresh: "Pending — confirm every number against the intended source decks before final release.",
    status: "pending",
    notes: "Jennifer flagged some numbers for verification (spec §11). Do not finalize until Troy confirms.",
  },
  {
    id: "infrastructure-sites",
    name: "Operations infrastructure layers",
    description: "Staging, Manufacturing, Kitting, IRL, and Distribution site locations.",
    usedIn: "Operations Workbench",
    sourceSystem: "Red Cross ArcGIS Online",
    owner: "BioMed",
    refresh: "Confirm whether current visible layers are authoritative or prototype.",
    status: "pending",
  },
  {
    id: "hospital-network",
    name: "Hospital Network data",
    description: "Hospitals served, distribution reach, and service relationships.",
    usedIn: "Hospital Network",
    sourceSystem: "Pending dashboard concept from Troy.",
    owner: "BioMed (Troy Rathbun)",
    refresh: "Pending — tile held until the concept is provided.",
    status: "pending",
  },
  {
    id: "diversity-population",
    name: "Donor Diversity & Population Representation",
    description:
      "High-level donor representation context (African American, Latino, LGBTQ+) and population representation in local markets.",
    usedIn: "BioMed Collections · Explore Regions",
    sourceSystem: "Pending source-backed data.",
    owner: "BioMed",
    refresh: "Pending Marketing & Communications validation.",
    status: "pending",
  },
  {
    id: "sickle-cell",
    name: "Sickle Cell & Community Impact",
    description: "Community need, donor representation, and patient impact context for sickle cell.",
    usedIn: "Explore Regions",
    sourceSystem: "Pending source-backed data.",
    owner: "BioMed",
    refresh: "Pending Marketing & Communications validation.",
    status: "pending",
  },
  {
    id: "volunteer",
    name: "Volunteer contribution",
    description: "Volunteer roles and contribution context across Blood 101, Blood Journey, Distribution, and Collections.",
    usedIn: "Blood 101 · Blood Journey · Hospital Distribution · BioMed Collections",
    sourceSystem: "Narrative; metrics pending if used.",
    owner: "BioMed",
    refresh: "Volunteer language pending Marketing & Communications validation.",
    status: "pending",
  },
];

export const definitions: Definition[] = [
  { term: "Division", def: "The largest BioMed operating geography; regions roll up into divisions." },
  { term: "Region", def: "A grouping of districts; regions roll up into divisions." },
  { term: "District", def: "A grouping of smaller operating areas; districts roll up into regions." },
  { term: "Chapter", def: "A Humanitarian Services geography shown for orientation; may not align one-to-one with BioMed boundaries." },
  { term: "Fixed site", def: "A permanent, standing donor-facing collection location." },
  { term: "Mobile collection", def: "A pop-up blood drive hosted by an employer, school, faith group, or community sponsor." },
  { term: "Trade area", def: "The observed geographic donor reach of a fixed site, based on donor behavior and migration patterns." },
  { term: "Medical donor", def: "A donor giving for a specific medical/transfusion need, as distinct from total donors." },
  { term: "Products distributed", def: "Blood components (red cells, platelets, plasma) delivered to hospitals." },
  { term: "Hospital served", def: "A hospital that receives blood products through the BioMed distribution network." },
  { term: "Staging site", def: "A site where blood products are positioned for distribution." },
  { term: "Kitting site", def: "A site where collection or processing kits are assembled." },
  { term: "IRL site", def: "An Immunohematology Reference Laboratory site." },
  { term: "Manufacturing site", def: "A site where collected blood is processed into components." },
  { term: "GOAT hierarchy", def: "The internal taxonomy that organizes BioMed geography as a rollup of operating areas → districts → regions → divisions." },
];

export const methodology: MethodologyEntry[] = [
  {
    topic: "Future Demand calculation",
    detail:
      "Projections combine demographic forecasting (Averting the Future Blood Debt, through 2045), AABB + Red Cross operating data (FY24–FY25), and a Red Cross AI forecasting pilot. Exact method pending Troy confirmation.",
  },
  {
    topic: "Collection aggregation",
    detail: "Collection counts are summed across the FY source layer for the selected geography (ZIP → county → chapter → region → division).",
  },
  {
    topic: "Fixed-site trade-area methodology",
    detail:
      "Red cell trade areas represent observed donor reach associated with each fixed site, derived from donor behavior and migration patterns — not a fixed radius.",
  },
  { topic: "Regional rollup", detail: "Regional metrics aggregate the underlying chapter/county records that fall within the selected region." },
  {
    topic: "Boundary relationship",
    detail:
      "BioMed operational boundaries do not always align one-to-one with Humanitarian Services chapter boundaries; views are provided for orientation with known exceptions.",
  },
];

export const limitations: string[] = [
  "BioMed and Humanitarian Services boundaries may not align exactly.",
  "Some regions may have no fixed sites.",
  "Some datasets refresh on different schedules.",
  "Some metrics may be national only until regional fields are available.",
  "Trade-area methodology differs between red cell and platelet.",
  "Certain demographic or donor-representation data may require careful interpretation.",
];

export const stewards: Steward[] = [
  { role: "Business owner", who: "Troy Rathbun — BioMed" },
  { role: "Technical / GIS owner", who: "Jeff Franzen" },
  { role: "Data steward", who: "Pending" },
  { role: "Marketing & Communications reviewer", who: "Pending" },
];

/** Accordion section ids — used to deep-link the modal open to one section. */
export type DataSourcesSectionId =
  | "sources"
  | "refresh"
  | "definitions"
  | "methodology"
  | "limitations"
  | "stewards";

export const sectionTitles: Record<DataSourcesSectionId, string> = {
  sources: "Data Sources",
  refresh: "Refresh Schedule",
  definitions: "Definitions",
  methodology: "Methodology",
  limitations: "Known Limitations",
  stewards: "Data Steward Contacts",
};
