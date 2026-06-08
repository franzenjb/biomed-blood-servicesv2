// Content for the Hub "About" / help modal: the 9-section index and the
// source bibliography. Source URLs verified where available; the rest are
// titled entries pending link cleanup.

export type HubSectionInfo = {
  index: string;
  title: string;
  blurb: string;
};

export type HubSource = {
  title: string;
  kind: "Webpage" | "PDF" | "Markdown";
  url?: string;
};

export const hubSectionIndex: HubSectionInfo[] = [
  { index: "01", title: "Blood 101", blurb: "Why blood donation matters — the human stakes and the basics of the supply." },
  { index: "02", title: "Blood Journey", blurb: "How a donation moves from the donor chair to a patient at the hospital." },
  { index: "03", title: "Hospital Distribution", blurb: "Which communities and hospitals the Red Cross blood network supports." },
  { index: "04", title: "Future Demand", blurb: "Demographic and supply pressures shaping the future blood supply." },
  { index: "05", title: "BioMed Collections", blurb: "How the Red Cross collects blood across the country, fixed and mobile." },
  { index: "06", title: "Jurisdiction Dashboard", blurb: "BioMed boundaries, FY25 counts, and clickable sites — filter by division, region, and district." },
  { index: "07", title: "BioMed Ops Workbench", blurb: "Internal layer controls and selected-feature review on the live BioMed map." },
  { index: "08", title: "Hospital Network", blurb: "Hospital tiers, distribution sites, portfolio footprint, and coverage." },
  { index: "09", title: "Explore Regions", blurb: "The full BioMed layer atlas with live map controls." },
];

export const hubSources: HubSource[] = [
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

// Development status for Jennifer & Troy — shown in the Hub "About" modal so the
// review notes and current state live with the experience. Tone matches the
// status writeup; keep concise and plain-language.
export type HubDevNoteGroup = {
  group: string;
  tone: "discuss" | "summary" | "done" | "progress" | "troy" | "jennifer" | "note";
  items: string[];
};

export const hubDevNotes: HubDevNoteGroup[] = [
  {
    group: "To Discuss Today — Jennifer & Troy",
    tone: "discuss",
    items: [
      "Interactive territory map inside the Collections tile: Troy's notes ask for “territory footprint map visualizations” with Division / Region / Chapter filters. Open design question — embed a live map directly inside a Collections slide, or a button on the slide that opens the map in a pop-up modal with an accordion? Decide scope and which slide before we build it.",
    ],
  },
  {
    group: "Summary",
    tone: "summary",
    items: [
      "The core experience tested well and we are refining, not rebuilding. The structural changes and the biggest new feature (Explore Regions) are in and working on real Red Cross data. The remaining work is mostly content depth in Collections, a few enhancements to the Operations Workbench, and items that depend on data or sign-off from Troy and Marketing & Communications.",
    ],
  },
  {
    group: "Done",
    tone: "done",
    items: [
      "Home page: renamed to “Inside BioMed Capabilities.”",
      "Nine-tile structure: confirmed at nine tiles, ordered foundation to regional.",
      "Tile 6 — Jurisdiction Dashboard: BioMed Blood Map merged into the Jurisdiction Dashboard (one authoritative geography view, no duplicate map).",
      "Tile 9 — Explore Regions: built and live on real layers — region selection, live FY collection metrics, fixed sites, and the Red Cell fixed-site trade-area polygons (Troy's FS Map Layer). Community impact, donor diversity, and Sickle Cell now live here.",
      "Content moves: Clara AI / RapidPass / Track Your Blood moved into Blood Journey; Sickle Cell moved into Explore Regions.",
      "Volunteers: volunteer sections present in Blood 101, Blood Journey, Hospital Distribution, and Collections.",
      "Data Sources & Methodology: new “About the Data” modal — the source-traceability layer Troy asked for. Lists datasets, refresh status, definitions, methodology, limitations, and stewards. Available app-wide; not a tenth tile.",
    ],
  },
  {
    group: "In Progress",
    tone: "progress",
    items: [
      "Tile 5 — BioMed Collections: restructure into Mobile Collections and Fixed Sites (including the Fixed Site Growth Program), add the Diversity / population section, Division/Region/Chapter filters, a high-level territory map, and the BioMed-vs-Humanitarian-Services boundary disclaimer.",
      "Tile 7 — Operations Workbench: design retained as requested. Still to add — GOAT boundary bookmarks (Division/Region/District/Chapter), boundary disclaimer, and confirm the infrastructure layers (Staging, Manufacturing, Kitting, IRL, Distribution) are the authoritative ones.",
    ],
  },
  {
    group: "Outstanding — Needs Troy",
    tone: "troy",
    items: [
      "Future Demand: verify the numbers Jennifer flagged and confirm their sources before we finalize the tile.",
      "Tile 8 — Hospital Network: held for Troy's dashboard concept (kept as a placeholder, not over-built).",
      "Platelet (SDP) trade areas: red cell is live now; platelet is a later phase. Need Troy to confirm which SDP trade-area layer is the blessed current one before we add a red-cell / platelet toggle.",
      "Regional detail metrics: chapters, hospitals served, staging locations, products distributed by region were “to be determined.” Explore Regions is ready to show them once provided.",
      "Complete data sources list: to finish populating the About the Data modal.",
    ],
  },
  {
    group: "Outstanding — Needs Jennifer / Marketing & Communications",
    tone: "jennifer",
    items: [
      "Validate Blood 101 content and all volunteer, diversity, and Sickle Cell language.",
      "Confirm which Future Demand figures were the concern.",
    ],
  },
  {
    group: "Note on Data",
    tone: "note",
    items: [
      "Where BioMed-specific regional numbers are not available yet, regional geography and population context use Red Cross Humanitarian Services geography — labeled as such, for discussion, until BioMed figures are finalized.",
    ],
  },
];
