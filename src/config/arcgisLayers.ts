export type ArcgisLayerSlot = {
  itemId: string;
  layerUrl: string;
  title: string;
  fieldMappings: Record<string, string>;
};

export type MasterMapLayerSource = {
  itemId: string;
  title: string;
  role: string;
  category: "manufacturing" | "collections" | "drives" | "geography" | "reference";
  defaultVisible: boolean;
  itemUrl: string;
  mapViewerUrl: string;
};

export type ArcJurisdictionLayerCategory = "sites" | "geography" | "operations" | "hospitals" | "reference";

export type ArcJurisdictionLayerSource = {
  title: string;
  category: ArcJurisdictionLayerCategory;
  role: string;
  defaultVisible: boolean;
};

export type ArcJurisdictionSupplementalLayerSource = ArcJurisdictionLayerSource & {
  itemId: string;
  itemUrl: string;
  mapViewerUrl: string;
};

export const biomedCollectionsSource = {
  portalUrl: "https://arc-nhq-gis.maps.arcgis.com",
  webMapItemId: "fe8739d16bf148ad9244c6c4bb0ed816",
  dashboardItemUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/dashboards/d0061c0fec8244b299bff93ec3739736",
  title: "Biomed Collections 22-26",
  updated: "2026-04-23",
  featureCount: 79885,
  currentUse: "Mobile collections chapter view; fixed sites are planned for a later layer pass.",
  hierarchy: ["Division", "Region", "Chapter", "County", "ZIP Code"],
  operationalLayers: [
    {
      title: "Master RC Geo HQ 2026",
      itemId: "8c6753c3c5814d05be65723cd4615d7c",
      role: "Reference geography"
    },
    {
      title: "Master RC Geo Division 2026",
      itemId: "8c6753c3c5814d05be65723cd4615d7c",
      role: "Reference geography"
    },
    {
      title: "Master RC Geo Region 2026",
      itemId: "8c6753c3c5814d05be65723cd4615d7c",
      role: "Reference geography"
    },
    {
      title: "Master RC Geo Chapter 2026",
      itemId: "8c6753c3c5814d05be65723cd4615d7c",
      role: "Reference geography"
    },
    {
      title: "Zip Codes - Biomed Collections 22-26",
      itemId: "f1586cbaba2c4ad384589e88afd0493c",
      role: "Collections rollup"
    },
    {
      title: "Counties - Biomed Collections 22-26",
      itemId: "2654cc02bcc34dc7a77373658a3c8c5e",
      role: "Collections rollup"
    },
    {
      title: "Chapters - Biomed Collections 22-26",
      itemId: "75a8d6fce9b348488cc727f2a1cd4d2b",
      role: "Collections rollup"
    },
    {
      title: "Regions - Biomed Collections 22-26",
      itemId: "2aad9d6573a0411cb49464c977935076",
      role: "Collections rollup"
    },
    {
      title: "Divisions - Biomed Collections 22-26",
      itemId: "36f0ed4dd85f449f9786b02b05df46c1",
      role: "Collections rollup"
    }
  ]
};

export const standaloneBiomedMapSource = {
  portalUrl: "https://arc-nhq-gis.maps.arcgis.com",
  webMapItemId: biomedCollectionsSource.webMapItemId,
  itemUrl: `https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=${biomedCollectionsSource.webMapItemId}`,
  mapViewerUrl:
    `https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?webmap=${biomedCollectionsSource.webMapItemId}`,
  title: "Biomed Collections 22-26 source web map",
  created: "2026-04-23",
  sources: [
    "CM - Volunteers / 2b947b613f0f4eb79132da593f0db7b4",
    "Biomed Collections 22-26 / fe8739d16bf148ad9244c6c4bb0ed816",
    "Biomed Manufacturing Location RBC Current State / a87c4e0b80714552917a47e760bee67b"
  ],
  liveLayerGroups: [
    "BIOMED",
    "Biomed Collections 22-26 rollups",
    "Biomed Manufacturing Location RBC Current State",
    "Master ARC Geography FY26"
  ]
};

export const masterMapLayerSources: MasterMapLayerSource[] = [
  {
    itemId: "a87c4e0b80714552917a47e760bee67b",
    title: "Biomed Manufacturing Location RBC Current State",
    role: "Manufacturing location and RBC current-state context for the consolidated master map.",
    category: "manufacturing",
    defaultVisible: true,
    itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=a87c4e0b80714552917a47e760bee67b",
    mapViewerUrl:
      "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?layers=a87c4e0b80714552917a47e760bee67b"
  }
];

export const arcJurisdictionDashboardSource = {
  itemId: "25b0a8b8459244dbb7220790fb735429",
  title: "ARC Jurisdiction Map - FY25 (04.2026)",
  type: "Dashboard",
  owner: "Ron Reitman",
  updated: "2026-05-15",
  summary:
    "FY25 collections summary by Biomed jurisdictions. Additional layers include fixed sites and all Biomed sites.",
  dashboardUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/dashboards/25b0a8b8459244dbb7220790fb735429",
  hubExploreUrl:
    "https://arc-nhq-gis.hub.arcgis.com/apps/25b0a8b8459244dbb7220790fb735429/explore",
  itemUrl:
    "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=25b0a8b8459244dbb7220790fb735429"
};

export const arcJurisdictionMapSource = {
  portalUrl: "https://arc-nhq-gis.maps.arcgis.com",
  webMapItemId: "8cb78614758548e3b39597b43eb0a573",
  title: "ARC Jurisdiction Map FY25 (04.2026)",
  owner: "Ron Reitman",
  updated: "2026-05-01",
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=8cb78614758548e3b39597b43eb0a573",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?webmap=8cb78614758548e3b39597b43eb0a573",
  summary:
    "Layer-rich FY25 source web map feeding the ARC jurisdiction dashboard, including facilities, jurisdictions, operations, and ZIP-level data.",
  operationalLayers: [
    {
      title: "Warehouse-Biomed",
      category: "sites",
      role: "Warehouse and BioMed logistics anchors",
      defaultVisible: true
    },
    {
      title: "Mobile Staging Sites",
      category: "sites",
      role: "Mobile staging and collection support sites",
      defaultVisible: true
    },
    {
      title: "Manufacturing Sites",
      category: "sites",
      role: "Manufacturing and processing locations",
      defaultVisible: true
    },
    {
      title: "Kitting Sites",
      category: "sites",
      role: "Kit preparation and operational support sites",
      defaultVisible: false
    },
    {
      title: "IRL Sites",
      category: "sites",
      role: "Immunohematology reference lab locations",
      defaultVisible: false
    },
    {
      title: "Distribution Sites",
      category: "sites",
      role: "Distribution and fulfillment anchors",
      defaultVisible: true
    },
    {
      title: "Fixed Sites",
      category: "sites",
      role: "Donor-facing fixed collection sites",
      defaultVisible: true
    },
    {
      title: "Counties",
      category: "geography",
      role: "County geography for local presentation and search",
      defaultVisible: false
    },
    {
      title: "DRD AM Portfolio",
      category: "operations",
      role: "Donor recruitment portfolio context",
      defaultVisible: false
    },
    {
      title: "Biomed Collection Operations",
      category: "operations",
      role: "Collection operations jurisdiction layer",
      defaultVisible: true
    },
    {
      title: "Biomed Districts",
      category: "geography",
      role: "BioMed district boundaries",
      defaultVisible: true
    },
    {
      title: "Biomed Regions",
      category: "geography",
      role: "BioMed regional boundaries",
      defaultVisible: true
    },
    {
      title: "Biomed Divisions",
      category: "geography",
      role: "BioMed division boundaries",
      defaultVisible: true
    },
    {
      title: "HS Chapters",
      category: "geography",
      role: "Humanitarian Services chapter boundaries",
      defaultVisible: false
    },
    {
      title: "HS Regions",
      category: "geography",
      role: "Humanitarian Services region boundaries",
      defaultVisible: false
    },
    {
      title: "HS Divisions",
      category: "geography",
      role: "Humanitarian Services division boundaries",
      defaultVisible: false
    },
    {
      title: "FY25 Data/Zip Codes (04.2026)",
      category: "operations",
      role: "FY25 ZIP-level collection and jurisdiction data",
      defaultVisible: false
    }
  ] satisfies ArcJurisdictionLayerSource[]
};

// Troy's "FS Map Layer" — a hosted feature layer titled "FS RSMO Trade Areas
// Map_WFL1" with two polygon sublayers (FSRSMOTradeAreas, TradeAreaByZip). This
// IS the Red Cell fixed-site trade-area source behind the trade-area dashboard.
export const supplementalBiomedSourceLayer = {
  title: "Fixed Site Trade Areas",
  itemId: "6af8a323a0b5468f9427baa4d6ee7481",
  category: "sites",
  role: "Red Cell fixed-site trade-area polygons (donor reach) — FSRSMOTradeAreas + TradeAreaByZip.",
  defaultVisible: true,
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=6af8a323a0b5468f9427baa4d6ee7481",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?layers=6af8a323a0b5468f9427baa4d6ee7481"
} satisfies ArcJurisdictionSupplementalLayerSource;

// Chapter-view BIOMED layers (maps.jbf.com/chapter-view source web map). These
// 12 styled layers are lifted into the biomed views at runtime as a hidden
// "BIOMED" group — see addChapterViewBiomedGroup(). Editing nothing in AGOL;
// the layer instances carry their own renderers + popups from this web map.
export const chapterViewBiomedSource = {
  webMapItemId: "2b947b613f0f4eb79132da593f0db7b4",
  title: "Chapter View — BIOMED layers",
  groupTitle: "BIOMED",
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=2b947b613f0f4eb79132da593f0db7b4",
  layerTitles: [
    "Blood Drives by Type",
    "Blood Drives Planned or Completed",
    "Latino Blood Drives",
    "Total Collections (RBC)",
    "Drives by County",
    "Drives by Chapter",
    "Drives by Region",
    "Drives by Division",
    "RBC Collections by County",
    "RBC Collections by Chapter",
    "RBC Collections by Region",
    "RBC Collections by Division",
  ],
};

// Lifted from Troy's Hospital Portfolio web map (1824471e) so the Hospital
// Network dashboard keeps the portfolio visuals on the jurisdiction engine.
export const hospitalPortfolioFootprintLayerSource = {
  title: "Hospital Portfolio Footprint",
  itemId: "0d3534699687410283f7f377a040a744",
  category: "hospitals",
  role: "Shaded hospital-portfolio footprints (tiered service areas).",
  defaultVisible: true,
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=0d3534699687410283f7f377a040a744",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?layers=0d3534699687410283f7f377a040a744"
} satisfies ArcJurisdictionSupplementalLayerSource;

export const hospitalOpportunityLayerSource = {
  title: "Final Best Location",
  itemId: "0a3c0d69e55740e0bb4ec1cc46eedcd2",
  category: "hospitals",
  role: "Site-opportunity analysis — candidate best locations.",
  defaultVisible: false,
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=0a3c0d69e55740e0bb4ec1cc46eedcd2",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?layers=0a3c0d69e55740e0bb4ec1cc46eedcd2"
} satisfies ArcJurisdictionSupplementalLayerSource;

export const hospitalLocationsLayerSource = {
  title: "Hospital Locations",
  itemId: "87e9189c3b284ecb900749eecfb64a05",
  category: "hospitals",
  role: "Hospitals receiving Red Cross blood products.",
  defaultVisible: true,
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=87e9189c3b284ecb900749eecfb64a05",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?layers=87e9189c3b284ecb900749eecfb64a05"
} satisfies ArcJurisdictionSupplementalLayerSource;

export const biomedWorkbenchSupplementalLayers = [
  hospitalLocationsLayerSource
] satisfies ArcJurisdictionSupplementalLayerSource[];

// Mobile BioMed collections — added to the Jurisdiction Dashboard so the
// "Mobile + fixed sites" Quick View has real mobile coverage. Title carries
// "mobile" so the preset matcher and KPIs pick it up automatically.
export const mobileCollectionsLayerSource = {
  title: "Mobile BioMed Collections",
  itemId: "b33432c2e89041899ba2315f24a619b8",
  category: "operations",
  role: "Mobile BioMed blood collections.",
  defaultVisible: false,
  itemUrl: "https://arc-nhq-gis.maps.arcgis.com/home/item.html?id=b33432c2e89041899ba2315f24a619b8",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?layers=b33432c2e89041899ba2315f24a619b8"
} satisfies ArcJurisdictionSupplementalLayerSource;

export const jurisdictionDashboardSupplementalLayers = [
  mobileCollectionsLayerSource
] satisfies ArcJurisdictionSupplementalLayerSource[];

// Hospital Network dashboard: hospitals + the portfolio visuals lifted from
// Troy's Hospital Portfolio web map (distribution/IRL sites already live in
// the base jurisdiction web map).
export const hospitalNetworkSupplementalLayers = [
  hospitalLocationsLayerSource,
  hospitalPortfolioFootprintLayerSource,
  hospitalOpportunityLayerSource
] satisfies ArcJurisdictionSupplementalLayerSource[];

export const biomedLayerAtlasSource = {
  title: "Explore Regions",
  routePath: "/biomed-layer-atlas",
  webMapItemId: arcJurisdictionMapSource.webMapItemId,
  itemUrl: arcJurisdictionMapSource.itemUrl,
  supplementalLayers: [
    supplementalBiomedSourceLayer,
    hospitalLocationsLayerSource
  ] satisfies ArcJurisdictionSupplementalLayerSource[]
};

export const hospitalPortfolioMapSource = {
  portalUrl: "https://arc-nhq-gis.maps.arcgis.com",
  webMapItemId: "1824471e366f4cd1ac8f326a6c0a86af",
  mapViewerUrl:
    "https://arc-nhq-gis.maps.arcgis.com/apps/mapviewer/index.html?webmap=1824471e366f4cd1ac8f326a6c0a86af",
  title: "Hospital Portfolio_WorkingCopy",
  access: "Private Red Cross ArcGIS Online item",
  currentUse:
    "Internal source map for hospital network reach, distribution sites, portfolio footprint, tiering, and site opportunity layers.",
  operationalLayers: [
    {
      title: "Best Location",
      role: "Candidate location scoring"
    },
    {
      title: "Portfolio Manager Home Zip",
      role: "Portfolio manager home ZIP context"
    },
    {
      title: "Distribution Sites",
      role: "Distribution site anchors"
    },
    {
      title: "Hospital Portfolio_WorkingCopy",
      role: "Hospital portfolio points and tiering"
    },
    {
      title: "Hospital Portfolio Footprint",
      role: "Service footprint polygons"
    },
    {
      title: "States",
      role: "Reference geography"
    },
    {
      title: "Division",
      role: "Reference geography"
    }
  ]
};

export const arcgisLayerConfig = {
  useMockData: true,
  renderLiveBasemapInMockMode: true,
  defaultBasemap: "osm",
  webMaps: {
    fixedSites: biomedCollectionsSource.webMapItemId,
    mobileCollections: biomedCollectionsSource.webMapItemId,
    hospitalDistribution: "",
    futureDemand: "",
    biomedCollections: biomedCollectionsSource.webMapItemId,
    standaloneBiomed: standaloneBiomedMapSource.webMapItemId,
    hospitalNetwork: hospitalPortfolioMapSource.webMapItemId
  },
  layers: {
    fixedSites: {
      itemId: "",
      layerUrl: "",
      title: "Fixed Site Locations",
      fieldMappings: {
        regionId: "REGION_ID",
        siteName: "SITE_NAME",
        products: "PRODUCTS_ANNUAL"
      }
    },
    tradeAreas: {
      itemId: "",
      layerUrl: "",
      title: "Trade Areas",
      fieldMappings: {
        siteId: "SITE_ID",
        population: "POPULATION",
        donorHouseholds: "DONOR_HOUSEHOLDS"
      }
    },
    mobileActivity: {
      itemId: "",
      layerUrl: "",
      title: "Mobile Collection Activity",
      fieldMappings: {
        regionId: "REGION_ID",
        drives: "DRIVE_COUNT",
        products: "PRODUCTS_ANNUAL"
      }
    },
    hospitalDistribution: {
      itemId: hospitalPortfolioMapSource.webMapItemId,
      layerUrl: "",
      title: "Hospital Distribution Summary",
      fieldMappings: {
        regionId: "REGION_ID",
        facilities: "FACILITY_COUNT",
        products: "PRODUCT_MIX"
      }
    },
    futureDemand: {
      itemId: "",
      layerUrl: "",
      title: "Future Demand Indicators",
      fieldMappings: {
        regionId: "REGION_ID",
        indicator: "INDICATOR",
        trend: "TREND"
      }
    }
  } satisfies Record<string, ArcgisLayerSlot>
};
