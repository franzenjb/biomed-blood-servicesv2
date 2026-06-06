import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Field from "@arcgis/core/layers/support/Field";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import { collectArcJurisdictionLayers, safeLayerTitle } from "../utils/biomedMapSuite";

type Rgba = [number, number, number, number];

type StyledFeatureLayer = FeatureLayer & {
  blendMode?: string;
  effect?: string;
  labelingInfo?: unknown[];
  labelsVisible?: boolean;
  opacity?: number;
  refresh?: () => void;
};

type PresentationLayerStyle = {
  fill: Rgba;
  outline: Rgba;
  outlineWidth: number;
  outlineStyle?: "solid" | "short-dash" | "dash";
  opacity: number;
  labelHints?: string[];
  labelSize?: number;
  labelMinScale?: number;
  labelMaxScale?: number;
};

const QUIET_BASEMAP = "topo-vector";

const NO_FILL: Rgba = [255, 255, 255, 0];

const layerStyles = {
  biomedDivision: {
    fill: [215, 48, 65, 0.1],
    outline: [122, 32, 43, 0.74],
    outlineWidth: 1.45,
    opacity: 1,
    labelHints: ["division"],
    labelSize: 12.5
  },
  biomedRegion: {
    fill: [82, 113, 130, 0.09],
    outline: [42, 74, 92, 0.58],
    outlineWidth: 1.05,
    opacity: 0.96,
    labelHints: ["region"],
    labelSize: 10.5,
    labelMaxScale: 0,
    labelMinScale: 12000000
  },
  biomedDistrict: {
    fill: [96, 106, 118, 0.055],
    outline: [61, 72, 84, 0.36],
    outlineWidth: 0.7,
    opacity: 0.9
  },
  biomedChapter: {
    fill: NO_FILL,
    outline: [80, 91, 105, 0.28],
    outlineWidth: 0.55,
    opacity: 0.8
  },
  hsBoundary: {
    fill: NO_FILL,
    outline: [116, 88, 125, 0.34],
    outlineStyle: "short-dash" as const,
    outlineWidth: 0.9,
    opacity: 0.82
  },
  county: {
    fill: NO_FILL,
    outline: [71, 85, 105, 0.18],
    outlineWidth: 0.45,
    opacity: 0.72
  },
  operations: {
    fill: [66, 118, 101, 0.13],
    outline: [42, 82, 72, 0.46],
    outlineWidth: 0.85,
    opacity: 0.9,
    labelHints: ["operation", "chapter", "region"],
    labelSize: 9.5,
    labelMinScale: 5000000
  },
  portfolio: {
    fill: [64, 112, 136, 0.1],
    outline: [38, 84, 108, 0.45],
    outlineWidth: 0.8,
    opacity: 0.88
  },
  zip: {
    fill: [205, 158, 76, 0.07],
    outline: [130, 101, 56, 0.18],
    outlineWidth: 0.35,
    opacity: 0.72
  },
  fallback: {
    fill: [95, 105, 118, 0.06],
    outline: [67, 76, 90, 0.32],
    outlineWidth: 0.65,
    opacity: 0.82
  }
} satisfies Record<string, PresentationLayerStyle>;

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ");
}

export function quietOpsBasemapId() {
  return QUIET_BASEMAP;
}

export function getPresentationStyleForLayer(title: string): PresentationLayerStyle {
  const normalized = normalize(title);
  if (normalized.includes("hs ")) return layerStyles.hsBoundary;
  if (normalized.includes("division")) return layerStyles.biomedDivision;
  if (normalized.includes("region")) return layerStyles.biomedRegion;
  if (normalized.includes("district")) return layerStyles.biomedDistrict;
  if (normalized.includes("chapter")) return layerStyles.biomedChapter;
  if (normalized.includes("county")) return layerStyles.county;
  if (normalized.includes("portfolio")) return layerStyles.portfolio;
  if (normalized.includes("zip") || normalized.includes("fy25 data")) return layerStyles.zip;
  if (normalized.includes("collection operations")) return layerStyles.operations;
  return layerStyles.fallback;
}

function simpleFillSymbol(style: PresentationLayerStyle) {
  return {
    type: "simple-fill" as const,
    color: style.fill,
    outline: {
      type: "simple-line" as const,
      color: style.outline,
      style: style.outlineStyle ?? "solid",
      width: style.outlineWidth
    }
  };
}

function pickLabelField(fields: Field[] | undefined, hints: string[] | undefined) {
  if (!hints?.length) return undefined;
  return fields?.find((field) => {
    if (field.type !== "string") return false;
    const text = normalize(`${field.name} ${field.alias ?? ""}`);
    return hints.some((hint) => text.includes(hint));
  });
}

function labelClassForField(field: Field, style: PresentationLayerStyle) {
  return {
    labelExpressionInfo: {
      expression: `$feature["${field.name.replace(/"/g, '\\"')}"]`
    },
    labelPlacement: "always-horizontal" as const,
    minScale: style.labelMinScale ?? 0,
    maxScale: style.labelMaxScale ?? 0,
    symbol: {
      type: "text" as const,
      color: [25, 31, 39, 0.92] as Rgba,
      haloColor: [249, 250, 248, 0.92] as Rgba,
      haloSize: 1.35,
      font: {
        family: "Avenir Next",
        size: style.labelSize ?? 10,
        weight: "bold" as const
      }
    }
  };
}

async function applyLayerStyle(layer: Layer) {
  if (typeof (layer as FeatureLayer).load !== "function") return;

  const featureLayer = layer as StyledFeatureLayer;
  try {
    await featureLayer.load();
  } catch {
    return;
  }

  if (featureLayer.geometryType !== "polygon" && featureLayer.geometryType !== "polyline") return;

  const style = getPresentationStyleForLayer(safeLayerTitle(featureLayer));
  featureLayer.renderer = {
    type: "simple",
    symbol:
      featureLayer.geometryType === "polyline"
        ? {
            type: "simple-line" as const,
            color: style.outline,
            style: style.outlineStyle ?? "solid",
            width: style.outlineWidth
          }
        : simpleFillSymbol(style)
  };
  featureLayer.opacity = style.opacity;
  featureLayer.blendMode = "normal";
  featureLayer.effect = "drop-shadow(0 1px 0 rgba(17, 24, 39, 0.12))";

  const labelField = pickLabelField(featureLayer.fields, style.labelHints);
  featureLayer.labelsVisible = Boolean(labelField);
  featureLayer.labelingInfo = labelField ? [labelClassForField(labelField, style)] : [];
  featureLayer.refresh?.();
}

export async function applyPresentationMapStyle(map?: ArcGISMap, view?: MapView) {
  if (!map) return;

  map.basemap = QUIET_BASEMAP;
  if (view) {
    view.background = { color: [238, 242, 240, 1] };
    (view as MapView & { highlightOptions?: unknown }).highlightOptions = {
      color: [215, 48, 65, 1],
      fillOpacity: 0.08,
      haloOpacity: 0.62
    };
  }

  await Promise.allSettled(collectArcJurisdictionLayers(map).map(applyLayerStyle));
}
