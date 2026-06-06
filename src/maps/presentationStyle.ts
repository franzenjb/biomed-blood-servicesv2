import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Field from "@arcgis/core/layers/support/Field";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import Basemap from "@arcgis/core/Basemap";
import { collectArcJurisdictionLayers, hideBasemapUtilityLayers, safeLayerTitle } from "../utils/biomedMapSuite";

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

const QUIET_BASEMAP = "osm";

const NO_FILL: Rgba = [255, 255, 255, 0];

const layerStyles = {
  biomedDivision: {
    fill: [189, 214, 224, 0.16],
    outline: [18, 24, 31, 0.84],
    outlineWidth: 2.2,
    opacity: 1,
    labelHints: ["division"],
    labelSize: 13
  },
  biomedRegion: {
    fill: [190, 225, 242, 0.22],
    outline: [18, 24, 31, 0.7],
    outlineWidth: 1.55,
    opacity: 0.96,
    labelHints: ["region"],
    labelSize: 10.5,
    labelMaxScale: 0,
    labelMinScale: 12000000
  },
  biomedDistrict: {
    fill: [190, 225, 242, 0.18],
    outline: [18, 24, 31, 0.5],
    outlineWidth: 1.05,
    opacity: 0.9
  },
  biomedChapter: {
    fill: NO_FILL,
    outline: [18, 24, 31, 0.42],
    outlineWidth: 0.8,
    opacity: 0.8
  },
  hsDivision: {
    fill: [63, 95, 159, 0.07],
    outline: [39, 60, 103, 0.78],
    outlineWidth: 1.8,
    opacity: 0.98,
    labelHints: ["division"],
    labelSize: 12.5
  },
  hsRegion: {
    fill: [109, 81, 165, 0.06],
    outline: [73, 52, 115, 0.74],
    outlineWidth: 1.35,
    opacity: 0.96,
    labelHints: ["region"],
    labelSize: 10.5,
    labelMaxScale: 0,
    labelMinScale: 12000000
  },
  hsChapter: {
    fill: [0, 127, 103, 0.05],
    outline: [0, 90, 73, 0.7],
    outlineWidth: 1,
    opacity: 0.94,
    labelHints: ["chapter"],
    labelSize: 9,
    labelMinScale: 5000000
  },
  county: {
    fill: [190, 225, 242, 0.22],
    outline: [18, 24, 31, 0.4],
    outlineWidth: 0.7,
    opacity: 0.82
  },
  operations: {
    fill: [244, 211, 94, 0.42],
    outline: [18, 24, 31, 0.68],
    outlineWidth: 1.15,
    opacity: 0.94,
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
    fill: [184, 224, 242, 0.62],
    outline: [18, 24, 31, 0.72],
    outlineWidth: 1.15,
    opacity: 0.98,
    labelHints: ["zip", "postal"],
    labelSize: 10.5,
    labelMinScale: 900000
  },
  tradeArea: {
    fill: [184, 224, 242, 0.64],
    outline: [18, 24, 31, 0.86],
    outlineWidth: 2,
    opacity: 0.98,
    labelHints: ["zip", "postal", "trade", "name"],
    labelSize: 11,
    labelMinScale: 1200000
  },
  fallback: {
    fill: [184, 224, 242, 0.28],
    outline: [18, 24, 31, 0.42],
    outlineWidth: 0.9,
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
  if (normalized.includes("tradearea") || normalized.includes("trade area") || normalized.includes("fsrsmo")) return layerStyles.tradeArea;
  if (normalized.includes("hs ") && normalized.includes("division")) return layerStyles.hsDivision;
  if (normalized.includes("hs ") && normalized.includes("region")) return layerStyles.hsRegion;
  if (normalized.includes("hs ") && normalized.includes("chapter")) return layerStyles.hsChapter;
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

  hideBasemapUtilityLayers(map);
  map.basemap = Basemap.fromId(QUIET_BASEMAP) ?? QUIET_BASEMAP;
  if (view) {
    view.background = { color: [244, 247, 244, 1] };
    (view as MapView & { highlightOptions?: unknown }).highlightOptions = {
      color: [215, 48, 65, 1],
      fillOpacity: 0.08,
      haloOpacity: 0.62
    };
  }

  await Promise.allSettled(collectArcJurisdictionLayers(map).map(applyLayerStyle));
}
