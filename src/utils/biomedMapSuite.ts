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
import { arcJurisdictionMapSource } from "../config/arcgisLayers";
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
    description: "Distribution and portfolio context for patient-care readiness.",
    icon: Hospital,
    briefing: "Connect the BioMed operating map to hospital support without overloading the audience with raw partner detail.",
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
    id: "sites",
    label: "Facilities & Sites",
    description: "Collection access, staging, logistics, and distribution.",
    icon: Building2
  },
  {
    id: "geography",
    label: "Jurisdictions & Regions",
    description: "BioMed and HS operating geographies.",
    icon: MapPinned
  },
  {
    id: "operations",
    label: "Distribution & Operations",
    description: "FY25 operational and portfolio context.",
    icon: Activity
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    description: "RBC, manufacturing, kitting, and IRL support.",
    icon: Factory
  }
];

export const focusStops = [
  { id: "national", label: "National", center: [-96.2, 38.3], zoom: 4 },
  { id: "east", label: "Eastern Reach", center: [-78.5, 38.7], zoom: 5 },
  { id: "central", label: "Central Network", center: [-92.5, 38.5], zoom: 5 },
  { id: "west", label: "Western Network", center: [-119.4, 38.2], zoom: 5 }
];

export function getPresenterMode(modeId: BioMedPresenterModeId) {
  return presenterModes.find((mode) => mode.id === modeId) ?? presenterModes[0];
}

export function getConfiguredArcJurisdictionLayer(title: string) {
  const normalized = title.toLowerCase();
  return arcJurisdictionMapSource.operationalLayers.find((layer) => {
    const configured = layer.title.toLowerCase();
    return normalized === configured || normalized.includes(configured) || configured.includes(normalized);
  });
}

export function safeLayerTitle(layer: Layer) {
  return layer.title ?? layer.id ?? "Untitled BioMed layer";
}

export function getLayerRole(title: string) {
  return getConfiguredArcJurisdictionLayer(title)?.role ?? "Private ArcGIS source layer";
}

export function collectArcJurisdictionLayers(map?: ArcGISMap): Layer[] {
  return ((map?.allLayers?.toArray?.() ?? []) as Layer[]).filter((layer) => {
    const title = safeLayerTitle(layer).toLowerCase();
    return !["light gray reference", "light gray base"].includes(title);
  });
}

export function getMapElementMap(mapElement?: ArcgisMapElement | null) {
  return mapElement?.map ?? ((mapElement?.view as { map?: ArcGISMap } | undefined)?.map) ?? undefined;
}

export function shouldShowLayerForPresenterMode(layer: BioMedLayerSnapshot, modeId: BioMedPresenterModeId) {
  const title = layer.title.toLowerCase();
  if (modeId === "national-reach") return title.includes("biomed regions") || title.includes("biomed divisions");
  if (modeId === "jurisdiction-story") return title.includes("biomed regions") || title.includes("biomed districts") || title.includes("biomed divisions");
  if (modeId === "collection-access") return title.includes("biomed collection operations") || title.includes("fy25 data") || title.includes("fixed site");
  if (modeId === "hospital-readiness") return title.includes("distribution") || title.includes("portfolio") || title.includes("hospital");
  if (modeId === "manufacturing-backbone") {
    return layer.category === "manufacturing" || title.includes("manufacturing") || title.includes("warehouse") || title.includes("irl") || title.includes("kitting");
  }

  return false;
}

export function buildLayerSnapshots(map?: ArcGISMap): BioMedLayerSnapshot[] {
  return collectArcJurisdictionLayers(map).map((layer) => {
    const title = safeLayerTitle(layer);
    const configured = getConfiguredArcJurisdictionLayer(title);
    const category = configured?.category ?? classifyMasterLayer(title);
    return {
      id: layer.id,
      title,
      category,
      role: configured?.role ?? getLayerRole(title),
      visible: layer.visible,
      type: layer.type ?? "layer",
      status: layer.loaded ? "Loaded" : "Loading"
    };
  });
}

export function previewLayerSnapshots(): BioMedLayerSnapshot[] {
  return arcJurisdictionMapSource.operationalLayers.map((layer) => ({
    id: layer.title,
    title: layer.title,
    category: layer.category,
    role: layer.role,
    visible: layer.defaultVisible,
    type: "private feature layer",
    status: "Sign in required"
  }));
}

export function formatCount(value?: number) {
  if (typeof value !== "number") return "Source";
  return value.toLocaleString();
}
