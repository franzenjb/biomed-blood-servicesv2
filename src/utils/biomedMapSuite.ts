import type ArcGISMap from "@arcgis/core/Map";
import type Layer from "@arcgis/core/layers/Layer";
import {
  Activity,
  Building2,
  Factory,
  HeartPulse,
  Hospital,
  Layers,
  MapPinned,
  type LucideIcon
} from "lucide-react";
import { arcJurisdictionMapSource, type ArcJurisdictionSupplementalLayerSource } from "../config/arcgisLayers";
import { classifyMasterLayer, type MasterLayerCategory } from "./masterMapFeatures";

export type BioMedPresenterModeId =
  | "national-reach"
  | "jurisdiction-story"
  | "collection-access"
  | "hospital-readiness"
  | "manufacturing-backbone";

export type BioMedLayerSnapshot = {
  id: string;
  title: string;
  category: MasterLayerCategory;
  role: string;
  summary: string;
  useCase: string;
  visible: boolean;
  type: string;
  status: string;
  count?: number;
};

export type ArcgisMapElement = HTMLElement & {
  map?: ArcGISMap;
  view?: unknown;
  loadErrorSources?: Array<{ loadError?: { message?: string }; source?: { title?: string } }>;
  goTo?: (target: unknown, options?: unknown) => Promise<unknown>;
};

export const presenterModes: Array<{
  id: BioMedPresenterModeId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  briefing: string;
  talkingPoint: string;
}> = [
  {
    id: "national-reach",
    label: "National Reach",
    shortLabel: "Reach",
    description: "Clean national network view for the first donor-facing read.",
    icon: HeartPulse,
    briefing: "Start with scale: one national BioMed operating footprint, many local access points, and a shared patient-care mission.",
    talkingPoint: "The value is national coordination with local accountability."
  },
  {
    id: "jurisdiction-story",
    label: "Jurisdiction Story",
    shortLabel: "Jurisdictions",
    description: "BioMed divisions, regions, districts, chapters, counties, and ZIP context.",
    icon: MapPinned,
    briefing: "Use operating boundaries to explain who owns the local donor, collection, and hospital-readiness story.",
    talkingPoint: "Boundaries make stewardship visible without exposing operational noise."
  },
  {
    id: "collection-access",
    label: "Collection Access",
    shortLabel: "Access",
    description: "Collection operations, fixed sites, staging, and ZIP-level access context.",
    icon: Activity,
    briefing: "Show how the network turns donor willingness into reliable collection opportunities.",
    talkingPoint: "Access is the front door of the blood system."
  },
  {
    id: "hospital-readiness",
    label: "Hospital Readiness",
    shortLabel: "Hospitals",
    description: "Hospitals receiving Red Cross blood products.",
    icon: Hospital,
    briefing: "Connect the BioMed operating map to the hospitals that receive Red Cross blood products.",
    talkingPoint: "The donor story is strongest when it reaches the patient-care endpoint."
  },
  {
    id: "manufacturing-backbone",
    label: "Manufacturing Backbone",
    shortLabel: "Manufacturing",
    description: "Manufacturing, warehouse, kitting, IRL, and distribution infrastructure.",
    icon: Factory,
    briefing: "Show the behind-the-scenes capacity that makes donated blood usable, tested, prepared, and deliverable.",
    talkingPoint: "This is the operational backbone between donor generosity and hospital inventory."
  }
];

export const sourceGroups: Array<{
  id: MasterLayerCategory;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "hospitals",
    label: "Hospitals & Patient Care",
    description: "Hospitals receiving Red Cross blood products.",
    icon: Hospital
  },
  {
    id: "sites",
    label: "Facilities & Sites",
    description: "Fixed donor access, staging, manufacturing, logistics, and distribution anchors.",
    icon: Building2
  },
  {
    id: "geography",
    label: "Jurisdictions & Regions",
    description: "BioMed ownership first; HS boundaries only for alignment comparison.",
    icon: MapPinned
  },
  {
    id: "operations",
    label: "Distribution & Operations",
    description: "FY25 ZIP, collection, and recruitment portfolio context.",
    icon: Activity
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    description: "Processing, kitting, IRL, and product-readiness infrastructure.",
    icon: Factory
  },
  {
    id: "reference",
    label: "Reference & Supplemental",
    description: "Additional private source layers and supporting geography.",
    icon: Layers
  }
];

const layerPresentation: Record<string, { summary: string; useCase: string }> = {
  "Warehouse-Biomed": {
    summary: "Warehouses and logistics anchors for BioMed supply movement.",
    useCase: "Use for the infrastructure/backbone view."
  },
  "Mobile Staging Sites": {
    summary: "Temporary staging locations that support mobile collection activity.",
    useCase: "Use when explaining mobile collection support."
  },
  "Manufacturing Sites": {
    summary: "Sites that process collected blood into patient-ready products.",
    useCase: "Use for processing capacity and operational backbone."
  },
  "Kitting Sites": {
    summary: "Kit preparation locations for collection operations.",
    useCase: "Use for behind-the-scenes collection readiness."
  },
  "IRL Sites": {
    summary: "Immunohematology reference lab locations.",
    useCase: "Use for specialty lab capability."
  },
  "Distribution Sites": {
    summary: "Fulfillment anchors that move products toward hospital support.",
    useCase: "Use for distribution and patient-care readiness."
  },
  "Fixed Sites": {
    summary: "Donor-facing fixed collection sites.",
    useCase: "Use for local donor access."
  },
  "Counties": {
    summary: "County geography for local stories, lookup, and community context.",
    useCase: "Use as base geography, not as the ownership layer."
  },
  "DRD AM Portfolio": {
    summary: "Donor recruitment portfolio assignments.",
    useCase: "Use when the story needs recruitment coverage."
  },
  "Biomed Collection Operations": {
    summary: "BioMed collection operations boundaries.",
    useCase: "Use for collections ownership."
  },
  "Biomed Districts": {
    summary: "BioMed district boundaries between regions and chapters.",
    useCase: "Use for the district-level operating story."
  },
  "Biomed Regions": {
    summary: "BioMed regional boundaries.",
    useCase: "Use for regional ownership and rollup views."
  },
  "Biomed Divisions": {
    summary: "BioMed division boundaries.",
    useCase: "Start here for the national leadership view."
  },
  "HS Chapters": {
    summary: "Humanitarian Services chapter boundaries.",
    useCase: "Use only to compare BioMed and HS alignment."
  },
  "HS Regions": {
    summary: "Humanitarian Services region boundaries.",
    useCase: "Use only to compare BioMed and HS alignment."
  },
  "HS Divisions": {
    summary: "Humanitarian Services division boundaries.",
    useCase: "Use only to compare BioMed and HS alignment."
  },
  "FY25 Data/Zip Codes (04.2026)": {
    summary: "ZIP-level FY25 collection and jurisdiction data.",
    useCase: "Use for detailed data checks after the boundary story is clear."
  },
  "Hospital Locations": {
    summary: "Hospitals receiving Red Cross blood products.",
    useCase: "Use when explaining patient-care reach and blood product support."
  },
  "Supplemental BioMed source layer": {
    summary: "Additional private BioMed source layer loaded with the Workbench layer stack.",
    useCase: "Use when the broader source map needs this extra layer in context."
  }
};

const HIDDEN_BASEMAP_UTILITY_LAYER_TITLES = new Set([
  "light gray reference",
  "light gray base",
  "world hillshade",
  "world topo"
]);

const SIDEBAR_EXCLUDED_BASEMAP_LAYER_TITLES = new Set([
  ...HIDDEN_BASEMAP_UTILITY_LAYER_TITLES,
  "open street map",
  "openstreetmap",
  "osm"
]);

export const focusStops = [
  { id: "national", label: "National", center: [-96.2, 38.3], zoom: 4 },
  { id: "east", label: "Eastern Reach", center: [-78.5, 38.7], zoom: 5 },
  { id: "central", label: "Central Network", center: [-92.5, 38.5], zoom: 5 },
  { id: "west", label: "Western Network", center: [-119.4, 38.2], zoom: 5 }
];

export function getPresenterMode(modeId: BioMedPresenterModeId) {
  return presenterModes.find((mode) => mode.id === modeId) ?? presenterModes[0];
}

function combinedArcJurisdictionLayerSources(supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []) {
  return [...arcJurisdictionMapSource.operationalLayers, ...supplementalLayers];
}

function normalizedLayerTitle(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isTradeAreaLayerTitle(title: string) {
  const normalized = normalizedLayerTitle(title).replace(/[_-]+/g, " ");
  return normalized.includes("tradearea") || normalized.includes("trade area") || normalized.includes("fsrsmo");
}

export function isBasemapUtilityLayerTitle(title: string) {
  const normalized = normalizedLayerTitle(title);
  return (
    SIDEBAR_EXCLUDED_BASEMAP_LAYER_TITLES.has(normalized) ||
    normalized === "hillshade" ||
    normalized === "topo" ||
    normalized.endsWith(" open street map") ||
    normalized.endsWith(" openstreetmap") ||
    normalized.endsWith(" hillshade") ||
    normalized.endsWith(" topo")
  );
}

export function isBasemapUtilityLayer(layer: Layer) {
  return isBasemapUtilityLayerTitle(safeLayerTitle(layer));
}

export function hideBasemapUtilityLayers(map?: ArcGISMap) {
  ((map?.allLayers?.toArray?.() ?? []) as Layer[]).forEach((layer) => {
    const title = safeLayerTitle(layer);
    if (isBasemapUtilityLayerTitle(title) && "listMode" in layer) {
      (layer as Layer & { listMode?: "show" | "hide" }).listMode = "hide";
    }
  });
}

export function getConfiguredArcJurisdictionLayer(
  title: string,
  supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []
) {
  const normalized = title.toLowerCase();
  return combinedArcJurisdictionLayerSources(supplementalLayers).find((layer) => {
    const configured = layer.title.toLowerCase();
    return normalized === configured || normalized.includes(configured) || configured.includes(normalized);
  });
}

export function safeLayerTitle(layer: Layer) {
  return layer.title ?? layer.id ?? "Untitled BioMed layer";
}

export function getLayerPresentation(title: string, supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []) {
  const configured = getConfiguredArcJurisdictionLayer(title, supplementalLayers);
  const presentation = layerPresentation[configured?.title ?? title];
  if (!presentation && !configured && isTradeAreaLayerTitle(title)) {
    return {
      summary: "Fixed-site trade-area ZIPs colored by donor share.",
      useCase: "Use to compare ZIP-level donor concentration inside each fixed-site trade area."
    };
  }
  return {
    summary: presentation?.summary ?? configured?.role ?? "BioMed map layer.",
    useCase: presentation?.useCase ?? "Use only when it supports the current story."
  };
}

export function getLayerRole(title: string) {
  return getLayerPresentation(title).summary;
}

export function collectArcJurisdictionLayers(map?: ArcGISMap): Layer[] {
  return ((map?.allLayers?.toArray?.() ?? []) as Layer[]).filter((layer) => {
    return !isBasemapUtilityLayer(layer);
  });
}

export function getMapElementMap(mapElement?: ArcgisMapElement | null) {
  return mapElement?.map ?? ((mapElement?.view as { map?: ArcGISMap } | undefined)?.map) ?? undefined;
}

export function shouldShowLayerForPresenterMode(layer: BioMedLayerSnapshot, modeId: BioMedPresenterModeId) {
  const title = layer.title.toLowerCase();
  if (modeId === "national-reach") return title.includes("biomed regions") || title.includes("biomed divisions");
  if (modeId === "jurisdiction-story") return title.includes("biomed regions") || title.includes("biomed districts") || title.includes("biomed divisions");
  if (modeId === "collection-access") {
    return title.includes("biomed collection operations") || title.includes("fy25 data") || title.includes("fixed site") || isTradeAreaLayerTitle(title);
  }
  if (modeId === "hospital-readiness") return title.includes("distribution") || title.includes("portfolio") || title.includes("hospital");
  if (modeId === "manufacturing-backbone") {
    return layer.category === "manufacturing" || title.includes("manufacturing") || title.includes("warehouse") || title.includes("irl") || title.includes("kitting");
  }

  return false;
}

export function buildLayerSnapshots(
  map?: ArcGISMap,
  supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []
): BioMedLayerSnapshot[] {
  return collectArcJurisdictionLayers(map).map((layer) => {
    const title = safeLayerTitle(layer);
    const configured = getConfiguredArcJurisdictionLayer(title, supplementalLayers);
    const category = configured?.category ?? classifyMasterLayer(title);
    const presentation = getLayerPresentation(title, supplementalLayers);
    return {
      id: layer.id,
      title,
      category,
      role: presentation.summary,
      summary: presentation.summary,
      useCase: presentation.useCase,
      visible: layer.visible,
      type: layer.type ?? "layer",
      status: layer.loaded ? "Loaded" : "Loading"
    };
  });
}

export function previewLayerSnapshots(supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []): BioMedLayerSnapshot[] {
  return combinedArcJurisdictionLayerSources(supplementalLayers)
    .filter((layer) => !isBasemapUtilityLayerTitle(layer.title))
    .map((layer) => {
      const presentation = getLayerPresentation(layer.title, supplementalLayers);
      return {
        id: layer.title,
        title: layer.title,
        category: layer.category,
        role: presentation.summary,
        summary: presentation.summary,
        useCase: presentation.useCase,
        visible: layer.defaultVisible,
        type: "private feature layer",
        status: "Sign in required"
      };
    });
}

export function formatCount(value?: number) {
  if (typeof value !== "number") return "";
  return value.toLocaleString();
}
