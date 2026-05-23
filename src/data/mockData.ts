export type Coordinates = [number, number];

export type Demographics = {
  population: number;
  age65PlusPct: number;
  africanAmericanPct: number;
  hispanicLatinoPct: number;
  medianAge: number;
};

export type Region = {
  id: string;
  name: string;
  chapter: string;
  center: Coordinates;
  zoom: number;
  summary: string;
  demographics: Demographics;
  annualProducts: number;
  activeDonors: number;
  hospitalPartners: number;
  demandSignal: string;
};

export type FixedSite = {
  id: string;
  regionId: string;
  name: string;
  city: string;
  county: string;
  state: string;
  division: string;
  chapter: string;
  coordinates: Coordinates;
  tradeArea: string;
  annualCollections: number;
  plateletSharePct: number;
  donorRetentionPct: number;
  narrative: string;
};

export type MobileMarket = {
  id: string;
  regionId: string;
  division: string;
  chapter: string;
  county: string;
  state: string;
  name: string;
  coordinates: Coordinates;
  drives: number;
  products: number;
  partners: number;
  drivesByYear: Record<string, number>;
  unitsByYear: Record<string, number>;
  narrative: string;
};

export type HospitalDistribution = {
  regionId: string;
  title: string;
  hospitalsServed: number;
  deliveryZones: number;
  traumaSupport: string;
  productMix: {
    redCells: number;
    platelets: number;
    plasma: number;
  };
};

export type DemandIndicator = {
  id: string;
  regionId: string;
  title: string;
  metric: string;
  trend: "Rising" | "Stable" | "Watch";
  description: string;
  source: string;
};

export type FutureDemandYear = "2025" | "2035" | "2045";

export type FutureDemandLens = "supply-demand" | "demographics" | "disruption" | "compatibility";

export type FutureDemandLensDefinition = {
  id: FutureDemandLens;
  label: string;
  title: string;
  summary: string;
  metricLabel: string;
};

export type FutureDemandProjection = {
  regionId: string;
  year: FutureDemandYear;
  supplyIndex: number;
  demandIndex: number;
  coverageIndex: number;
  disruptionScore: number;
  donorRiskScore: number;
  compatibilityScore: number;
  youthDonorIndex: number;
  seniorDemandIndex: number;
  primarySignal: string;
  narrative: string;
  mapCallout: string;
  mitigation: string;
  lensNarratives: Record<FutureDemandLens, string>;
};

export type ResearchSource = {
  title: string;
  url: string;
  use: string;
};

export type ComponentBasics = {
  title: string;
  detail: string;
  storage: string;
  patientUse: string;
};

export type BloodSystemMetric = {
  label: string;
  value: string;
  detail: string;
};

export type DonationMethod = {
  title: string;
  duration: string;
  frequency: string;
  idealTypes: string;
  description: string;
};

export const regions: Region[] = [
  {
    id: "tennessee",
    name: "Tennessee Region",
    chapter: "ARC Heart of Tennessee",
    center: [-86.7816, 36.1627],
    zoom: 7,
    summary:
      "A chapter-level mobile collections view shaped around drives, RBC units, county filters, and ARC hierarchy.",
    demographics: {
      population: 2110000,
      age65PlusPct: 16.9,
      africanAmericanPct: 17.7,
      hispanicLatinoPct: 8.1,
      medianAge: 38.9
    },
    annualProducts: 41900,
    activeDonors: 27600,
    hospitalPartners: 31,
    demandSignal: "Chapter and county collection patterns can be paired with growth and health demand indicators."
  },
  {
    id: "badger-hawkeye",
    name: "Badger-Hawkeye Region",
    chapter: "Dubuque Area Chapter",
    center: [-90.6646, 42.5006],
    zoom: 7,
    summary:
      "A synthetic Midwest chapter example for trade area, county, and fixed-site concepts.",
    demographics: {
      population: 860000,
      age65PlusPct: 19.4,
      africanAmericanPct: 5.8,
      hispanicLatinoPct: 7.6,
      medianAge: 41.7
    },
    annualProducts: 27600,
    activeDonors: 18200,
    hospitalPartners: 19,
    demandSignal: "County-level donor travel behavior can explain why collection reach extends beyond a facility location."
  },
  {
    id: "carolina",
    name: "Carolinas Region",
    chapter: "ARC Northwest North Carolina",
    center: [-80.8431, 35.2271],
    zoom: 7,
    summary:
      "A synthetic high-growth example for future demand and hospital distribution storytelling.",
    demographics: {
      population: 1540000,
      age65PlusPct: 15.7,
      africanAmericanPct: 22.4,
      hispanicLatinoPct: 13.2,
      medianAge: 37.4
    },
    annualProducts: 35200,
    activeDonors: 24100,
    hospitalPartners: 34,
    demandSignal: "Population growth and hospital corridor expansion make this a strong future-demand planning example."
  }
];

export const fixedSites: FixedSite[] = [
  {
    id: "milwaukee-center",
    regionId: "badger-hawkeye",
    name: "Dubuque IA Blood Donation Center",
    city: "Dubuque",
    county: "Dubuque County",
    state: "IA",
    division: "Midwest and Plains Division",
    chapter: "Dubuque Area Chapter",
    coordinates: [-90.6646, 42.5006],
    tradeArea: "Synthetic donor travel area spanning river communities and nearby county seats",
    annualCollections: 18400,
    plateletSharePct: 21,
    donorRetentionPct: 64,
    narrative:
      "The Dubuque example translates the weak trade-area concept into a selectable fixed-site story with map, catchment, and market context."
  },
  {
    id: "waukesha-center",
    regionId: "badger-hawkeye",
    name: "Madison Area Donor Center",
    city: "Madison",
    county: "Dane County",
    state: "WI",
    division: "Midwest and Plains Division",
    chapter: "Dubuque Area Chapter",
    coordinates: [-89.4012, 43.0731],
    tradeArea: "Synthetic capital-region donor catchment",
    annualCollections: 23600,
    plateletSharePct: 24,
    donorRetentionPct: 68,
    narrative:
      "This synthetic fixed-site record shows how real fixed-site layers could be added alongside the current mobile collections web map."
  },
  {
    id: "madison-center",
    regionId: "tennessee",
    name: "Nashville Donor Center",
    city: "Nashville",
    county: "Davidson County",
    state: "TN",
    division: "Southeast and Caribbean Division",
    chapter: "ARC Heart of Tennessee",
    coordinates: [-86.7816, 36.1627],
    tradeArea: "Synthetic metro donor catchment for future fixed-site layer testing",
    annualCollections: 21700,
    plateletSharePct: 26,
    donorRetentionPct: 61,
    narrative:
      "The Nashville fixed-site placeholder aligns with the active ARC Heart of Tennessee chapter use case from the source dashboard."
  },
  {
    id: "fox-valley-center",
    regionId: "tennessee",
    name: "Murfreesboro Donor Center",
    city: "Murfreesboro",
    county: "Rutherford County",
    state: "TN",
    division: "Southeast and Caribbean Division",
    chapter: "ARC Heart of Tennessee",
    coordinates: [-86.3903, 35.8456],
    tradeArea: "Synthetic suburban and county-seat catchment",
    annualCollections: 16600,
    plateletSharePct: 19,
    donorRetentionPct: 59,
    narrative:
      "The Murfreesboro placeholder demonstrates how fixed-site filters can reuse the same region, chapter, and county hierarchy."
  },
  {
    id: "wausau-center",
    regionId: "carolina",
    name: "Charlotte Donor Center",
    city: "Charlotte",
    county: "Mecklenburg County",
    state: "NC",
    division: "Southeast and Caribbean Division",
    chapter: "ARC Northwest North Carolina",
    coordinates: [-80.8431, 35.2271],
    tradeArea: "Synthetic growth-corridor catchment",
    annualCollections: 25400,
    plateletSharePct: 25,
    donorRetentionPct: 62,
    narrative:
      "The Charlotte placeholder supports the future demand story by linking fixed-site access to a high-growth hospital corridor."
  }
];

export const mobileMarkets: MobileMarket[] = [
  {
    id: "campus-and-employer",
    regionId: "tennessee",
    division: "Southeast and Caribbean Division",
    chapter: "ARC Heart of Tennessee",
    county: "Davidson County",
    state: "TN",
    name: "Chapter Mobile Collections",
    coordinates: [-86.7816, 36.1627],
    drives: 1870,
    products: 41800,
    partners: 86,
    drivesByYear: {
      "2022": 270,
      "2023": 400,
      "2024": 365,
      "2025": 560,
      "2026": 275
    },
    unitsByYear: {
      "2022": 7300,
      "2023": 9200,
      "2024": 8500,
      "2025": 15300,
      "2026": 1500
    },
    narrative:
      "This mirrors the actual dashboard pattern: select a chapter, review blood drives and RBC units by year, then understand the ARC hierarchy."
  },
  {
    id: "county-rotation",
    regionId: "badger-hawkeye",
    division: "Midwest and Plains Division",
    chapter: "Dubuque Area Chapter",
    county: "Dubuque County",
    state: "IA",
    name: "County Rotation Drives",
    coordinates: [-90.6646, 42.5006],
    drives: 740,
    products: 27600,
    partners: 74,
    drivesByYear: {
      "2022": 122,
      "2023": 148,
      "2024": 161,
      "2025": 204,
      "2026": 105
    },
    unitsByYear: {
      "2022": 4300,
      "2023": 5100,
      "2024": 6000,
      "2025": 8500,
      "2026": 3700
    },
    narrative:
      "County filters are the practical bridge between a broad chapter layer and local donor travel or trade-area storytelling."
  },
  {
    id: "rural-access",
    regionId: "carolina",
    division: "Southeast and Caribbean Division",
    chapter: "ARC Northwest North Carolina",
    county: "Mecklenburg County",
    state: "NC",
    name: "Growth Corridor Drives",
    coordinates: [-80.8431, 35.2271],
    drives: 920,
    products: 35200,
    partners: 58,
    drivesByYear: {
      "2022": 135,
      "2023": 171,
      "2024": 188,
      "2025": 278,
      "2026": 148
    },
    unitsByYear: {
      "2022": 5200,
      "2023": 6400,
      "2024": 7100,
      "2025": 11300,
      "2026": 5200
    },
    narrative:
      "This synthetic example shows how future demand can connect back to the same collection hierarchy."
  }
];

export const hospitalDistribution: HospitalDistribution[] = [
  {
    regionId: "tennessee",
    title: "Tennessee Hospital Distribution",
    hospitalsServed: 31,
    deliveryZones: 6,
    traumaSupport: "High-acuity trauma, oncology, transplant, and routine surgical demand",
    productMix: {
      redCells: 54,
      platelets: 28,
      plasma: 18
    }
  },
  {
    regionId: "badger-hawkeye",
    title: "Badger-Hawkeye Hospital Distribution",
    hospitalsServed: 19,
    deliveryZones: 5,
    traumaSupport: "Academic medicine, regional referral, and community hospital demand",
    productMix: {
      redCells: 58,
      platelets: 24,
      plasma: 18
    }
  },
  {
    regionId: "carolina",
    title: "Carolinas Hospital Distribution",
    hospitalsServed: 34,
    deliveryZones: 7,
    traumaSupport: "Rural access, emergency readiness, and seasonal demand coverage",
    productMix: {
      redCells: 64,
      platelets: 16,
      plasma: 20
    }
  }
];

export const demandIndicators: DemandIndicator[] = [
  {
    id: "age-shift",
    regionId: "tennessee",
    title: "Care Demand Mix",
    metric: "Oncology, surgery, trauma",
    trend: "Rising",
    description:
      "Blood products support trauma care, surgery, cancer treatment, childbirth complications, and chronic conditions. Pairing these care categories with public demographic and health layers can make the future-demand story credible.",
    source: "Red Cross journey and donation-type sources plus future Living Atlas health indicators"
  },
  {
    id: "oncology-access",
    regionId: "tennessee",
    title: "Platelet Pressure",
    metric: "5-day platelet shelf life",
    trend: "Watch",
    description:
      "Platelets are especially time-sensitive and are used heavily in cancer care and transplant care. Short shelf life makes steady donor engagement and collection planning important.",
    source: "Types of Blood Donations; Journey of a Blood Donation"
  },
  {
    id: "growth-corridor",
    regionId: "carolina",
    title: "Diverse Donor Need",
    metric: "Rare match readiness",
    trend: "Rising",
    description:
      "Patients with rare blood types or sickle cell disease may need closely matched blood. Future demand planning should include diverse donor reach alongside population growth and care-access indicators.",
    source: "The Color of Blood; future ACS and demographic layers"
  },
  {
    id: "travel-resilience",
    regionId: "badger-hawkeye",
    title: "Supply Disruption",
    metric: "Weather and illness risk",
    trend: "Stable",
    description:
      "Severe weather, seasonal illness, and blood drive disruptions can quickly affect collections. This is a good place to connect Living Atlas hazard, travel-time, and social vulnerability context.",
    source: "Red Cross shortage release; future hazard and vulnerability layers"
  }
];

export const futureDemandYears: FutureDemandYear[] = ["2025", "2035", "2045"];

export const futureDemandLenses: FutureDemandLensDefinition[] = [
  {
    id: "supply-demand",
    label: "Supply vs Demand",
    title: "Supply And Demand Gap",
    summary:
      "Compare projected supply contraction against rising clinical demand and the resulting coverage gap.",
    metricLabel: "Coverage index"
  },
  {
    id: "demographics",
    label: "Demographic Pressure",
    title: "Thumbtack Pressure",
    summary:
      "Show how aging recipients and a smaller youth donor base can shift the burden onto fewer eligible donors.",
    metricLabel: "Donor-risk score"
  },
  {
    id: "disruption",
    label: "Disruption Risk",
    title: "Volatile Collection Environment",
    summary:
      "Frame weather, seasonal illness, and drive cancellations as supply-chain stressors, not isolated events.",
    metricLabel: "Disruption score"
  },
  {
    id: "compatibility",
    label: "Compatibility Need",
    title: "Matched Blood Readiness",
    summary:
      "Connect diverse donor reach to Type O demand, sickle cell support, and rare compatibility needs.",
    metricLabel: "Compatibility score"
  }
];

export const futureDemandProjections: FutureDemandProjection[] = [
  {
    regionId: "tennessee",
    year: "2025",
    supplyIndex: 100,
    demandIndex: 100,
    coverageIndex: 100,
    disruptionScore: 46,
    donorRiskScore: 42,
    compatibilityScore: 55,
    youthDonorIndex: 100,
    seniorDemandIndex: 100,
    primarySignal: "Baseline balance",
    narrative:
      "The current state is still manageable, but the chapter already depends on consistent mobile drives, repeat donors, and stable daily collection patterns.",
    mapCallout: "A balanced baseline can mask fragile inventory when platelets and Type O demand tighten.",
    mitigation: "Protect repeat donor schedules and use mobile outreach to stabilize known collection corridors.",
    lensNarratives: {
      "supply-demand":
        "Supply and demand are close to balanced in the baseline year, which makes this the reference point for future gap analysis.",
      demographics:
        "The older-care demand signal is present but not yet dominant. The risk is whether younger donors keep pace.",
      disruption:
        "Weather and illness disruptions remain episodic, but even short interruptions can pressure time-sensitive products.",
      compatibility:
        "Compatibility work is strongest when diverse outreach is treated as core supply planning rather than a separate campaign."
    }
  },
  {
    regionId: "tennessee",
    year: "2035",
    supplyIndex: 82,
    demandIndex: 114,
    coverageIndex: 72,
    disruptionScore: 62,
    donorRiskScore: 66,
    compatibilityScore: 70,
    youthDonorIndex: 84,
    seniorDemandIndex: 116,
    primarySignal: "Gap emerging",
    narrative:
      "By 2035, demand pressure starts to separate from the available donor base, especially around oncology, surgery, trauma, and platelet readiness.",
    mapCallout: "A 2035 gap scenario turns routine collection reliability into a strategic planning issue.",
    mitigation: "Pair youth recruitment with health-insight donor value and stronger employer or campus partnerships.",
    lensNarratives: {
      "supply-demand":
        "Demand begins outpacing supply, creating a visible gap between what hospitals may need and what the donor base can sustain.",
      demographics:
        "The thumbtack pattern appears: more older recipients and a thinner youth donor cohort sharing the load.",
      disruption:
        "Storm and illness disruptions become more consequential because fewer buffer donations are available.",
      compatibility:
        "Sickle cell and rare-match readiness require early, consistent donor cultivation before shortages arrive."
    }
  },
  {
    regionId: "tennessee",
    year: "2045",
    supplyIndex: 64,
    demandIndex: 130,
    coverageIndex: 50,
    disruptionScore: 78,
    donorRiskScore: 82,
    compatibilityScore: 84,
    youthDonorIndex: 66,
    seniorDemandIndex: 133,
    primarySignal: "Coverage cliff",
    narrative:
      "The 2045 scenario illustrates the widening supply-and-demand gap: fewer donors are being asked to support more patient demand under more volatile operating conditions.",
    mapCallout: "Only half of projected patient need is covered in the stress scenario unless recruitment and resilience improve.",
    mitigation: "Treat donor diversification, youth conversion, and disruption-resilient collection sites as one operating strategy.",
    lensNarratives: {
      "supply-demand":
        "The modeled split is stark: supply contracts while demand rises, reducing projected patient coverage to roughly half.",
      demographics:
        "A smaller eligible youth cohort must carry a larger senior-care burden, making donor conversion a structural issue.",
      disruption:
        "Weather, heat, winter storms, and flu seasons can turn a demographic gap into an acute supply crisis.",
      compatibility:
        "Rare-match and Type O readiness become system risks if the donor base is not broad enough before demand peaks."
    }
  },
  {
    regionId: "badger-hawkeye",
    year: "2025",
    supplyIndex: 100,
    demandIndex: 100,
    coverageIndex: 100,
    disruptionScore: 52,
    donorRiskScore: 48,
    compatibilityScore: 44,
    youthDonorIndex: 100,
    seniorDemandIndex: 100,
    primarySignal: "Distance resilience",
    narrative:
      "The Midwest baseline emphasizes access: broad geographies, river communities, and rural hospital corridors require dependable donor travel patterns.",
    mapCallout: "Distance and weather make the baseline more sensitive than the headline numbers suggest.",
    mitigation: "Use county rotations and fixed-site access to protect collection reliability across travel corridors.",
    lensNarratives: {
      "supply-demand":
        "Current coverage is balanced, but large service areas require more buffer than compact metro markets.",
      demographics:
        "Older and rural populations raise the planning value of travel-time and access layers.",
      disruption:
        "Winter weather can interrupt collection geography, so cancellations need to be part of demand planning.",
      compatibility:
        "Compatibility planning should connect rural access with targeted outreach before rare-match need becomes urgent."
    }
  },
  {
    regionId: "badger-hawkeye",
    year: "2035",
    supplyIndex: 79,
    demandIndex: 113,
    coverageIndex: 70,
    disruptionScore: 70,
    donorRiskScore: 69,
    compatibilityScore: 60,
    youthDonorIndex: 80,
    seniorDemandIndex: 120,
    primarySignal: "Rural pressure",
    narrative:
      "By 2035, a shrinking donor base combines with longer service distances and aging-care demand to make coverage more sensitive to cancellations.",
    mapCallout: "When distance, winter weather, and lower donor availability combine, missed drives matter more.",
    mitigation: "Build redundant collection options and prioritize drive calendars around weather and travel-time risk.",
    lensNarratives: {
      "supply-demand":
        "The modeled coverage gap grows faster where geography limits easy replacement collections.",
      demographics:
        "Aging-care pressure grows while the youth donor base becomes less reliable.",
      disruption:
        "Weather-canceled drives become a structural supply risk, not simply a seasonal inconvenience.",
      compatibility:
        "Diverse donor recruitment remains important even when the most visible pressure is geography and age."
    }
  },
  {
    regionId: "badger-hawkeye",
    year: "2045",
    supplyIndex: 61,
    demandIndex: 128,
    coverageIndex: 48,
    disruptionScore: 86,
    donorRiskScore: 88,
    compatibilityScore: 73,
    youthDonorIndex: 61,
    seniorDemandIndex: 137,
    primarySignal: "Access debt",
    narrative:
      "The 2045 view shows an access debt: fewer donors, higher demand, and broader geography make rural resilience a patient-care issue.",
    mapCallout: "The map shifts from coverage to resilience: who can still donate, and how reliably can products move?",
    mitigation: "Use Living Atlas travel-time, hazard, and vulnerability layers to choose resilient collection investments.",
    lensNarratives: {
      "supply-demand":
        "The gap is deepest where replacement collections are hardest to schedule and travel distances are longer.",
      demographics:
        "Older-care demand outpaces the remaining eligible donor base, intensifying the thumbtack pattern.",
      disruption:
        "Winter weather, flooding, and infrastructure outages can remove too much collection capacity at once.",
      compatibility:
        "Rare compatibility need should be layered into rural planning so geography does not hide clinical risk."
    }
  },
  {
    regionId: "carolina",
    year: "2025",
    supplyIndex: 100,
    demandIndex: 100,
    coverageIndex: 100,
    disruptionScore: 58,
    donorRiskScore: 45,
    compatibilityScore: 68,
    youthDonorIndex: 100,
    seniorDemandIndex: 100,
    primarySignal: "Growth baseline",
    narrative:
      "The Carolinas baseline combines high-growth corridors, hospital expansion, and a stronger compatibility planning signal.",
    mapCallout: "Growth makes the baseline feel positive, but it also raises the ceiling for future patient demand.",
    mitigation: "Connect fixed-site access, mobile recruitment, and diverse donor outreach before demand accelerates.",
    lensNarratives: {
      "supply-demand":
        "Baseline supply is adequate, but regional growth means the future gap can widen quickly.",
      demographics:
        "Population growth and hospital corridor expansion add demand before the donor base has time to mature.",
      disruption:
        "Hurricane and severe-weather exposure make collection continuity a visible resilience issue.",
      compatibility:
        "A diverse donor base is a strategic asset for sickle cell support and rare-match readiness."
    }
  },
  {
    regionId: "carolina",
    year: "2035",
    supplyIndex: 81,
    demandIndex: 117,
    coverageIndex: 69,
    disruptionScore: 76,
    donorRiskScore: 63,
    compatibilityScore: 83,
    youthDonorIndex: 82,
    seniorDemandIndex: 118,
    primarySignal: "Growth strain",
    narrative:
      "By 2035, growth and climate disruption begin to stack: collection networks must serve more patients while also planning around storms and outages.",
    mapCallout: "The 2035 pressure ring highlights where growth and disruption risk overlap.",
    mitigation: "Use donor health insights and digital scheduling to convert new residents into durable donor relationships.",
    lensNarratives: {
      "supply-demand":
        "Demand grows faster than the donor base, particularly near expanding hospital corridors.",
      demographics:
        "The population mix increases both potential donors and future recipients, making conversion strategy decisive.",
      disruption:
        "Hurricanes, heat, and outages are not side stories; they directly shape collection reliability.",
      compatibility:
        "Compatibility planning becomes a strength if diverse outreach scales with population growth."
    }
  },
  {
    regionId: "carolina",
    year: "2045",
    supplyIndex: 63,
    demandIndex: 134,
    coverageIndex: 47,
    disruptionScore: 92,
    donorRiskScore: 78,
    compatibilityScore: 92,
    youthDonorIndex: 64,
    seniorDemandIndex: 139,
    primarySignal: "Compounded risk",
    narrative:
      "The 2045 scenario is a compounded-risk story: demand growth, severe-weather disruption, and compatibility need converge around the same communities.",
    mapCallout: "The highest-risk future is where fast growth, weather disruption, and matched-blood need overlap.",
    mitigation: "Prioritize resilient sites, diverse donor pipelines, and real-time logistics visibility for high-growth corridors.",
    lensNarratives: {
      "supply-demand":
        "A major supply-demand gap appears unless donor growth keeps pace with hospital and population growth.",
      demographics:
        "The future donor pool has to be built early because demand grows before a mature donor culture exists.",
      disruption:
        "Storm exposure can turn regional growth into a fragile supply chain without redundant collection capacity.",
      compatibility:
        "The compatibility score peaks because sickle cell, Type O, and rare-match readiness all depend on donor diversity."
    }
  }
];

export const redCrossResearchSources: ResearchSource[] = [
  {
    title: "Blood Donation Process Explained",
    url: "https://www.redcrossblood.org/donate-blood/blood-donation-process/donation-process-overview.html",
    use: "Donation appointment steps, RapidPass, screening, draw time, and recovery."
  },
  {
    title: "Bringing Communities Hope Annual Report 2025",
    url: "https://www.redcross.org/content/dam/redcross/about-us/publications/2025-publications/510901-02-FY25-Annual-Report-EN-Final.pdf",
    use: "National role, Biomedical Services framing, community health, and broad impact metrics."
  },
  {
    title: "From Donor to Distribution",
    url: "https://www.redcross.org/local/california/northern-california-coastal/about-us/news-and-events/news/from-donor-to-distribution--a-trip-through-the-blood-lab.html",
    use: "Laboratory processing, hospital orders, and public-safe behind-the-scenes narrative."
  },
  {
    title: "Journey of a Blood Donation",
    url: "https://www.redcross.org/local/georgia/about-us/news-and-events/news/journey-blood-donation-from-donor-chair-to-hospital.html",
    use: "Barcode continuity, processing, testing, shelf life, and hospital arrival story."
  },
  {
    title: "Red Cross Declares Severe Shortage",
    url: "https://www.redcross.org/about-us/news-and-events/press-release/2026/red-cross-declares-shortage-after-blood-supply-falls-35-.html",
    use: "Shortage pressure, donor-base decline, seasonal illness, and weather disruption signals."
  },
  {
    title: "The Color of Blood",
    url: "https://www.redcross.org/about-us/news-and-events/press-release/2021/the-color-of-blood--red-cross-reflects-on-its-blood-collection-hiistory.html",
    use: "Diverse donor need, rare blood matching, antigens, and sickle cell context."
  },
  {
    title: "Types of Blood Donations",
    url: "https://www.redcrossblood.org/donate-blood/how-to-donate/types-of-blood-donations.html",
    use: "Whole blood, Power Red, platelet, and plasma donation types and patient uses."
  }
];

export const bloodSystemMetrics: BloodSystemMetric[] = [
  {
    label: "National supply role",
    value: "~40%",
    detail: "Approximate share of the U.S. blood supply provided by the American Red Cross."
  },
  {
    label: "Hospital reach",
    value: "~2,500",
    detail: "Hospitals and transfusion centers supported by Red Cross blood products nationally."
  },
  {
    label: "Whole blood draw",
    value: "8-10 min",
    detail: "Typical draw time during an appointment that lasts about an hour end to end."
  },
  {
    label: "Shelf-life range",
    value: "5 days-1 year",
    detail: "Platelets are shortest-lived; red cells last up to 42 days and plasma can be frozen longer."
  }
];

export const componentBasics: ComponentBasics[] = [
  {
    title: "Red blood cells",
    detail: "Carry oxygen and are commonly used for trauma, surgery, severe blood loss, newborn care, and sickle cell disease.",
    storage: "Refrigerated; usable for up to 42 days.",
    patientUse: "Trauma, surgery, anemia, and blood-loss care."
  },
  {
    title: "Platelets",
    detail: "Help blood clot and stop bleeding. They are especially important for cancer patients and some transplant patients.",
    storage: "Room temperature with continuous agitation; usable for about five days.",
    patientUse: "Cancer treatment, transplant support, and bleeding control."
  },
  {
    title: "Plasma",
    detail: "The liquid part of blood that supports clotting and is used in emergency and trauma situations.",
    storage: "Frozen; can be stored for up to one year.",
    patientUse: "Emergency, trauma, and major bleeding care."
  }
];

export const donationMethods: DonationMethod[] = [
  {
    title: "Whole blood",
    duration: "About 1 hour",
    frequency: "Every 56 days",
    idealTypes: "All blood types",
    description:
      "The most flexible donation. It can be used as whole blood or separated into red cells, platelets, and plasma."
  },
  {
    title: "Power Red",
    duration: "About 1.5 hours",
    frequency: "Every 112 days",
    idealTypes: "O-, O+, A-, B-",
    description:
      "An automated donation that collects a concentrated red cell dose while returning plasma and platelets to the donor."
  },
  {
    title: "Platelets",
    duration: "2.5-3 hours",
    frequency: "Every 7 days",
    idealTypes: "A+, A-, B+, O+, AB+, AB-",
    description:
      "An apheresis donation that supports patients who need clotting support, especially cancer and transplant patients."
  },
  {
    title: "Plasma",
    duration: "About 1.25 hours",
    frequency: "Every 28 days",
    idealTypes: "AB+ and AB-",
    description:
      "An automated donation focused on plasma, including universal AB plasma used in emergency and trauma care."
  }
];

export const journeyStages = [
  {
    title: "Donor Visit",
    detail:
      "A whole blood appointment takes about an hour from arrival through recovery. The draw itself typically takes 8 to 10 minutes and collects about one pint, plus small tubes for testing."
  },
  {
    title: "Linked Records",
    detail:
      "The donation, test tubes, and donor record are linked so the product can move through processing and testing with the right information attached."
  },
  {
    title: "Processing",
    detail:
      "Blood is transported to a manufacturing laboratory, where it can be separated into transfusable components such as red cells, platelets, and plasma."
  },
  {
    title: "Testing",
    detail:
      "Sample tubes are tested for blood type and infectious disease markers. If a donation cannot be used safely, it is removed from the supply."
  },
  {
    title: "Storage",
    detail:
      "Cleared products are labeled and stored under component-specific conditions, from five-day platelet inventory to frozen plasma."
  },
  {
    title: "Hospital Use",
    detail:
      "Products are distributed to hospitals and transfusion teams for trauma, surgery, cancer treatment, childbirth complications, chronic disease, and emergency readiness."
  }
];

export const blood101Facts = [
  "Blood cannot be manufactured, so the system depends on volunteer donors and repeat community participation.",
  "Whole blood is often separated into red cells, platelets, and plasma so one donation can support different patient needs.",
  "Platelets have the shortest shelf life, making steady collection activity essential for cancer and transplant care.",
  "A diverse donor base improves readiness for patients who need closely matched blood, including some sickle cell patients."
];

export const storyCards = [
  {
    number: "01",
    title: "Blood 101",
    description: "Explain the national blood system, donation basics, blood components, and why donors matter.",
    signal: "Who we are and why every donor appointment matters.",
    href: "/blood-101"
  },
  {
    number: "02",
    title: "Biomed Collections",
    description: "Open the collection story across fixed sites, mobile activity, trade areas, and market context.",
    signal: "Where donors meet the system: fixed sites and mobile drives.",
    href: "/collections/mobile",
    secondaryHref: "/collections/fixed-sites",
    secondaryLabel: "Fixed-site view"
  },
  {
    number: "03",
    title: "Blood Journey",
    description: "Follow a donation from donor visit to processing, testing, storage, distribution, and patient use.",
    signal: "The path from donor chair to hospital-ready product.",
    href: "/journey"
  },
  {
    number: "04",
    title: "Hospital Distribution",
    description: "Show generalized hospital reach and the categories of patient care supported by donated blood.",
    signal: "Community impact without exposing sensitive operations.",
    href: "/distribution"
  },
  {
    number: "05",
    title: "Future Demand",
    description: "Frame long-range need using donor resilience, care demand, diversity, and public health indicators.",
    signal: "Why today's donor relationships shape tomorrow's readiness.",
    href: "/future-demand"
  }
];
