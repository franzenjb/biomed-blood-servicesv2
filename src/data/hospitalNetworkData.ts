import type { Coordinates } from "./mockData";

export type HospitalTier = "tier1" | "tier2" | "tier3";

export type NetworkRecordType = "hospital" | "distribution" | "opportunity";

export type HospitalNetworkRecord = {
  id: string;
  type: NetworkRecordType;
  regionId: string;
  name: string;
  market: string;
  state: string;
  coordinates: Coordinates;
  tier?: HospitalTier;
  annualUnits: number;
  distanceMinutes: number;
  reliability: number;
  narrative: string;
};

export type HospitalNetworkRegion = {
  id: string;
  name: string;
  division: string;
  center: Coordinates;
  zoom: number;
  footprint: Coordinates[];
  hospitalsServed: number;
  distributionSites: number;
  tierMix: Record<HospitalTier, number>;
  summary: string;
};

export const hospitalTierLabels: Record<HospitalTier, string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3"
};

export const hospitalTierColors: Record<HospitalTier, [number, number, number, number]> = {
  tier1: [202, 35, 49, 0.92],
  tier2: [18, 109, 185, 0.9],
  tier3: [35, 142, 66, 0.9]
};

export const hospitalNetworkRegions: HospitalNetworkRegion[] = [
  {
    id: "northeast",
    name: "Northeast Corridor",
    division: "Northeast Division",
    center: [-74.85, 41.65],
    zoom: 6,
    footprint: [
      [-80.4, 39.7],
      [-77.2, 42.9],
      [-72.6, 44.2],
      [-69.4, 42.9],
      [-70.8, 40.3],
      [-75.1, 39.0]
    ],
    hospitalsServed: 196,
    distributionSites: 7,
    tierMix: { tier1: 26, tier2: 61, tier3: 109 },
    summary:
      "Dense hospital demand, short delivery corridors, and several high-acuity care markets that need a clean tier and reach story."
  },
  {
    id: "southeast",
    name: "Southeast Growth Belt",
    division: "Southeast and Caribbean Division",
    center: [-82.8, 33.55],
    zoom: 6,
    footprint: [
      [-90.2, 30.1],
      [-85.4, 35.7],
      [-80.1, 36.1],
      [-76.5, 33.7],
      [-79.6, 29.2],
      [-86.8, 29.3]
    ],
    hospitalsServed: 172,
    distributionSites: 6,
    tierMix: { tier1: 18, tier2: 49, tier3: 105 },
    summary:
      "Fast-growing metros and rural corridors make the distribution-site layer a stronger story than a wall of point symbols."
  },
  {
    id: "north-central",
    name: "North Central Network",
    division: "North Central Division",
    center: [-93.45, 41.95],
    zoom: 6,
    footprint: [
      [-101.4, 39.4],
      [-97.4, 46.4],
      [-90.5, 46.2],
      [-84.6, 41.3],
      [-89.7, 37.2],
      [-97.9, 37.6]
    ],
    hospitalsServed: 138,
    distributionSites: 5,
    tierMix: { tier1: 14, tier2: 42, tier3: 82 },
    summary:
      "Broad geographies and weather exposure make reach time, redundancy, and tier escalation the important presentation angles."
  },
  {
    id: "pacific",
    name: "Pacific Portfolio",
    division: "Pacific Division",
    center: [-121.2, 39.1],
    zoom: 5,
    footprint: [
      [-124.7, 32.5],
      [-123.5, 45.8],
      [-118.2, 46.0],
      [-113.8, 40.7],
      [-116.2, 35.0],
      [-121.1, 32.3]
    ],
    hospitalsServed: 151,
    distributionSites: 6,
    tierMix: { tier1: 17, tier2: 45, tier3: 89 },
    summary:
      "Coastal population density, mountain travel, wildfire disruption, and metro hospital concentration need to be readable together."
  }
];

export const hospitalNetworkRecords: HospitalNetworkRecord[] = [
  {
    id: "dist-boston",
    type: "distribution",
    regionId: "northeast",
    name: "Northeast Distribution Hub",
    market: "Boston-Worcester-Providence",
    state: "MA",
    coordinates: [-71.52, 42.24],
    annualUnits: 124000,
    distanceMinutes: 42,
    reliability: 96,
    narrative: "Regional anchor for dense academic medicine, trauma, oncology, and referral hospitals."
  },
  {
    id: "dist-philly",
    type: "distribution",
    regionId: "northeast",
    name: "Mid-Atlantic Distribution Site",
    market: "Philadelphia-New Jersey",
    state: "PA",
    coordinates: [-75.16, 39.95],
    annualUnits: 112000,
    distanceMinutes: 38,
    reliability: 95,
    narrative: "Short-haul corridor coverage for high-volume hospitals and transfer-sensitive products."
  },
  {
    id: "hosp-nyc-tier1",
    type: "hospital",
    regionId: "northeast",
    name: "Metro Trauma Portfolio",
    market: "New York City",
    state: "NY",
    coordinates: [-73.98, 40.76],
    tier: "tier1",
    annualUnits: 68000,
    distanceMinutes: 54,
    reliability: 94,
    narrative: "Tier 1 demand cluster where inventory continuity and rapid substitution matter."
  },
  {
    id: "hosp-albany-tier2",
    type: "hospital",
    regionId: "northeast",
    name: "Capital Region Referral Cluster",
    market: "Albany",
    state: "NY",
    coordinates: [-73.75, 42.65],
    tier: "tier2",
    annualUnits: 31000,
    distanceMinutes: 71,
    reliability: 91,
    narrative: "Tier 2 referral market that benefits from clear backup-site and delivery-zone framing."
  },
  {
    id: "opp-maine",
    type: "opportunity",
    regionId: "northeast",
    name: "Northern New England Coverage Gap",
    market: "Maine-New Hampshire-Vermont",
    state: "ME",
    coordinates: [-70.32, 43.66],
    annualUnits: 16800,
    distanceMinutes: 118,
    reliability: 86,
    narrative: "Best-location candidate area for reducing long-tail travel exposure."
  },
  {
    id: "dist-atlanta",
    type: "distribution",
    regionId: "southeast",
    name: "Atlanta Distribution Site",
    market: "Atlanta-Southeast",
    state: "GA",
    coordinates: [-84.39, 33.75],
    annualUnits: 108000,
    distanceMinutes: 46,
    reliability: 94,
    narrative: "High-throughput anchor for growth corridors across Georgia, Alabama, and the Carolinas."
  },
  {
    id: "dist-charlotte",
    type: "distribution",
    regionId: "southeast",
    name: "Carolinas Distribution Site",
    market: "Charlotte-Triad",
    state: "NC",
    coordinates: [-80.84, 35.23],
    annualUnits: 92000,
    distanceMinutes: 49,
    reliability: 93,
    narrative: "Connects a high-growth hospital corridor to rural access and seasonal surge planning."
  },
  {
    id: "hosp-nashville-tier1",
    type: "hospital",
    regionId: "southeast",
    name: "Tennessee Academic Medicine Cluster",
    market: "Nashville",
    state: "TN",
    coordinates: [-86.78, 36.16],
    tier: "tier1",
    annualUnits: 52000,
    distanceMinutes: 63,
    reliability: 92,
    narrative: "Tier 1 cluster where trauma, transplant, and oncology stories can be told without customer naming."
  },
  {
    id: "hosp-tampa-tier2",
    type: "hospital",
    regionId: "southeast",
    name: "Gulf Coast Hospital Cluster",
    market: "Tampa Bay",
    state: "FL",
    coordinates: [-82.46, 27.95],
    tier: "tier2",
    annualUnits: 39000,
    distanceMinutes: 82,
    reliability: 88,
    narrative: "Coastal surge and disruption exposure makes this a strong emergency-readiness example."
  },
  {
    id: "opp-carolina-upstate",
    type: "opportunity",
    regionId: "southeast",
    name: "Upstate Best-Location Candidate",
    market: "Greenville-Spartanburg",
    state: "SC",
    coordinates: [-82.39, 34.85],
    annualUnits: 20500,
    distanceMinutes: 76,
    reliability: 89,
    narrative: "Candidate location where hospital growth and drive access can be evaluated together."
  },
  {
    id: "dist-minneapolis",
    type: "distribution",
    regionId: "north-central",
    name: "Twin Cities Distribution Hub",
    market: "Minneapolis-Saint Paul",
    state: "MN",
    coordinates: [-93.26, 44.98],
    annualUnits: 99000,
    distanceMinutes: 53,
    reliability: 93,
    narrative: "Upper Midwest hub balancing metro demand with long rural delivery corridors."
  },
  {
    id: "dist-stlouis",
    type: "distribution",
    regionId: "north-central",
    name: "Mississippi Corridor Site",
    market: "St. Louis",
    state: "MO",
    coordinates: [-90.2, 38.63],
    annualUnits: 87000,
    distanceMinutes: 58,
    reliability: 92,
    narrative: "River corridor site that supports cross-state redundancy and weather-aware delivery planning."
  },
  {
    id: "hosp-chicago-tier1",
    type: "hospital",
    regionId: "north-central",
    name: "Great Lakes Tier 1 Cluster",
    market: "Chicago",
    state: "IL",
    coordinates: [-87.63, 41.88],
    tier: "tier1",
    annualUnits: 61000,
    distanceMinutes: 74,
    reliability: 91,
    narrative: "Dense Tier 1 demand with multiple product categories and backup route requirements."
  },
  {
    id: "hosp-dubuque-tier3",
    type: "hospital",
    regionId: "north-central",
    name: "River Community Hospital Cluster",
    market: "Dubuque",
    state: "IA",
    coordinates: [-90.66, 42.5],
    tier: "tier3",
    annualUnits: 16000,
    distanceMinutes: 68,
    reliability: 90,
    narrative: "Tier 3 community demand where donor access and hospital reach can be connected locally."
  },
  {
    id: "opp-plains",
    type: "opportunity",
    regionId: "north-central",
    name: "Plains Reach Opportunity",
    market: "Omaha-Lincoln",
    state: "NE",
    coordinates: [-96.7, 40.81],
    annualUnits: 21300,
    distanceMinutes: 93,
    reliability: 87,
    narrative: "Best-location candidate area for reducing route length and weather exposure."
  },
  {
    id: "dist-losangeles",
    type: "distribution",
    regionId: "pacific",
    name: "Southern California Distribution Site",
    market: "Los Angeles",
    state: "CA",
    coordinates: [-118.24, 34.05],
    annualUnits: 126000,
    distanceMinutes: 48,
    reliability: 94,
    narrative: "Major demand anchor with high-acuity care, population density, and traffic-sensitive routing."
  },
  {
    id: "dist-seattle",
    type: "distribution",
    regionId: "pacific",
    name: "Puget Sound Distribution Site",
    market: "Seattle-Tacoma",
    state: "WA",
    coordinates: [-122.33, 47.61],
    annualUnits: 84000,
    distanceMinutes: 55,
    reliability: 92,
    narrative: "Northwest anchor where geography, ferries, mountains, and winter weather shape reach."
  },
  {
    id: "hosp-bayarea-tier1",
    type: "hospital",
    regionId: "pacific",
    name: "Bay Area Specialty Care Cluster",
    market: "San Francisco Bay Area",
    state: "CA",
    coordinates: [-122.27, 37.8],
    tier: "tier1",
    annualUnits: 54000,
    distanceMinutes: 69,
    reliability: 91,
    narrative: "Tier 1 specialty-care demand where resilience and product mix become the story."
  },
  {
    id: "hosp-portland-tier2",
    type: "hospital",
    regionId: "pacific",
    name: "Columbia-Willamette Hospital Cluster",
    market: "Portland",
    state: "OR",
    coordinates: [-122.68, 45.52],
    tier: "tier2",
    annualUnits: 29500,
    distanceMinutes: 72,
    reliability: 90,
    narrative: "Regional referral cluster that needs simple footprint and backup-route explanation."
  },
  {
    id: "opp-inland",
    type: "opportunity",
    regionId: "pacific",
    name: "Inland Access Candidate",
    market: "Reno-Sacramento",
    state: "NV",
    coordinates: [-119.81, 39.53],
    annualUnits: 18300,
    distanceMinutes: 101,
    reliability: 86,
    narrative: "Candidate area for improving inland reach and disruption fallback."
  }
];
