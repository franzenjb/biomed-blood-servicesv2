// Content for the Hub "About" / help modal: the 9-section index and the
// development status notes. The source bibliography now lives in the
// app-wide Data Sources & Methodology modal (data/dataSources.ts → references).

export type HubSectionInfo = {
  index: string;
  title: string;
  blurb: string;
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
      "Home page: renamed to “Inside Biomedical Capabilities” — Biomedical spelled out, more appropriate than the BioMed shorthand.",
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
