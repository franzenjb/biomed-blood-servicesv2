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
/** A published reference — article, report, or paper behind the narrative. */
export type SourceReference = { title: string; kind: string; url?: string };

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
    usedIn: "Jurisdiction Dashboard · BioMed Atlas · Regional Story Explorer",
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

/**
 * Reference Library — the published articles, reports, and papers behind the
 * Blood Services narrative. Moved here from the Hub "About" modal so all
 * sourcing lives in one credibility layer.
 */
export const references: SourceReference[] = [
  { title: "AABB2025: Adjusting Donor Recruitment Strategies For Different Generations May Offer Key to Expanding Donor Pool", kind: "Webpage", url: "https://www.aabb.org/news-resources/news/article/2025/10/28/aabb2025--adjusting-donor-recruitment-strategies-for-different-generations-may-offer-key-to-expanding-donor-pool" },
  { title: "American Red Cross 2024 Annual Report — Bringing Communities Hope", kind: "PDF", url: "https://www.redcross.org/content/dam/redcross/about-us/publications/2024-publications/478201-06-FY24-Annual-Report-Digital-3.28-ENG-ACC-FINAL.pdf" },
  { title: "American Red Cross Receives AWS Grant to Prototype Aid Platform with Generative AI", kind: "Webpage", url: "https://www.redcross.org/about-us/news-and-events/press-release/2026/red-cross-receives-aws-grant-to-prototype-aid-platform.html" },
  { title: "Blood Donation Process Explained | Red Cross Blood Services", kind: "Webpage", url: "https://www.redcrossblood.org/donate-blood/blood-donation-process/donation-process-overview.html" },
  { title: "Blood Donor App — Red Cross Blood Donation", kind: "Webpage", url: "https://www.redcrossblood.org/blood-donor-app.html" },
  { title: "Blood Centers Warn of Shortages as Summer Donations Fall and Hospital Demand Stays High — Mississippi Public Broadcasting", kind: "Webpage" },
  { title: "Blood Donation Groups Need Donors, Especially for the Summer — C&G Newspapers", kind: "Webpage" },
  { title: "Bringing Communities Hope Annual Report 2025 — Red Cross", kind: "PDF", url: "https://www.redcross.org/content/dam/redcross/about-us/publications/2025-publications/510901-02-FY25-Annual-Report-EN-Final.pdf" },
  { title: "Clara Chatbot — Red Cross Blood Donation", kind: "Webpage", url: "https://www.redcrossblood.org/donate-blood/dlp/meet-clara--the-blood-donation-chatbot-.html" },
  { title: "Donate Where It's Needed Most | American Red Cross", kind: "Webpage", url: "https://www.redcross.org/give-blood.html" },
  { title: "Facts About Blood Supply In The U.S. — Red Cross Blood Donation", kind: "Webpage" },
  { title: "From Donor to Distribution | A Trip Through the Blood Lab — Red Cross", kind: "Webpage", url: "https://www.redcross.org/local/california/northern-california-coastal/about-us/news-and-events/news/from-donor-to-distribution--a-trip-through-the-blood-lab.html" },
  { title: "Health Screenings and Blood Tests — Red Cross Blood Donation", kind: "Webpage" },
  { title: "Infectious Disease Testing | Red Cross Blood Services", kind: "Webpage", url: "https://www.redcrossblood.org/biomedical-services/blood-diagnostic-testing/blood-testing.html" },
  { title: "Journey of a Blood Donation: From the Donor Chair to the Hospital — Red Cross", kind: "Webpage", url: "https://www.redcross.org/local/georgia/about-us/news-and-events/news/journey-blood-donation-from-donor-chair-to-hospital.html" },
  { title: "Red Cross Declares Severe Shortage After Blood Supply Falls 35% in Past Month", kind: "Webpage", url: "https://www.redcross.org/about-us/news-and-events/press-release/2026/red-cross-declares-shortage-after-blood-supply-falls-35-.html" },
  { title: "Smart Platform for Data Blood Bank Management: Forecasting Demand in Blood Supply Chain Using Machine Learning — Semantic Scholar", kind: "PDF" },
  { title: "Systemic Analysis of Global Blood Services: Operational Logistics, Demographic Demands, and Policy Transformation", kind: "Markdown" },
  { title: "The Color of Blood: Red Cross Reflects on Its Blood Collection History", kind: "Webpage", url: "https://www.redcross.org/about-us/news-and-events/press-release/2021/the-color-of-blood--red-cross-reflects-on-its-blood-collection-hiistory.html" },
  { title: "The Future of Blood Donation: The Rise of Automated Blood Collection Systems", kind: "Webpage" },
  { title: "Types of Blood Donations", kind: "Webpage", url: "https://www.redcrossblood.org/donate-blood/how-to-donate/types-of-blood-donations.html" },
  { title: "What Does a Blood Shortage Mean | American Red Cross", kind: "Webpage", url: "https://www.redcrossblood.org/local-homepage/news/article/blood-shortage-explained-rcbs.html" },
];

/** Accordion section ids — used to deep-link the modal open to one section. */
export type DataSourcesSectionId =
  | "sources"
  | "references"
  | "refresh"
  | "definitions"
  | "methodology"
  | "limitations"
  | "stewards";

export const sectionTitles: Record<DataSourcesSectionId, string> = {
  sources: "Data Sources",
  references: "Reference Library",
  refresh: "Refresh Schedule",
  definitions: "Definitions",
  methodology: "Methodology",
  limitations: "Known Limitations",
  stewards: "Data Steward Contacts",
};
