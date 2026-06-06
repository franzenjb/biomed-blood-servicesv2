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
  maxScale?: number;
  minScale?: number;
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

export type TradeAreaDonorShareBreak = {
  minValue: number;
  maxValue: number;
  color: Rgba;
  label: string;
};

const QUIET_BASEMAP = "gray-vector";

const NO_FILL: Rgba = [255, 255, 255, 0];
const ZIP_OUTLINE: Rgba = [15, 18, 23, 0.9];
export const tradeAreaDonorShareBreaks: TradeAreaDonorShareBreak[] = [
  { minValue: 0, maxValue: 3.178484, color: [188, 229, 247, 0.82], label: "0.00 - 3.18%" },
  { minValue: 3.178485, maxValue: 8.873239, color: [47, 169, 0, 0.86], label: "3.18 - 8.87%" },
  { minValue: 8.87324, maxValue: 21.209741, color: [255, 244, 31, 0.88], label: "8.87 - 21.21%" },
  { minValue: 21.209742, maxValue: 63.323782, color: [255, 24, 18, 0.9], label: "21.21 - 63.32%" }
];

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

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function tradeAreaBreakForDonorShare(value: unknown) {
  if (value == null) return undefined;
  const parsed = typeof value === "number" ? value : Number(`${value}`.replace(/[%,$]/g, ""));
  if (!Number.isFinite(parsed)) return undefined;
  return tradeAreaDonorShareBreaks.find((breakInfo) => parsed >= breakInfo.minValue && parsed <= breakInfo.maxValue);
}

function isTradeAreaLayerTitle(title: string) {
  const normalized = normalize(title);
  return normalized.includes("tradearea") || normalized.includes("trade area") || normalized.includes("fsrsmo");
}

function isLower48VisibleSourceLayerTitle(title: string) {
  const normalized = normalize(title);
  return isTradeAreaLayerTitle(title) || normalized.includes("biomed source layer");
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

function isNumericField(field: Field) {
  return field.type === "double" || field.type === "single" || field.type === "integer" || field.type === "small-integer" || field.type === "oid";
}

function findPercentDonorsField(fields: Field[] | undefined) {
  return fields?.find((field) => {
    if (!isNumericField(field)) return false;
    const normalized = compact(`${field.name} ${field.alias ?? ""}`);
    return normalized === "percentdonors" || (normalized.includes("percent") && normalized.includes("donor"));
  });
}

function findTradeAreaZipField(fields: Field[] | undefined) {
  return fields?.find((field) => {
    if (field.type !== "string") return false;
    const normalized = compact(`${field.name} ${field.alias ?? ""}`);
    return normalized === "tradeareabyzip" || normalized === "zip" || normalized === "zipcode" || normalized.includes("postal");
  });
}

function tradeAreaClassBreakSymbol(color: Rgba) {
  return {
    type: "simple-fill" as const,
    color,
    outline: {
      type: "simple-line" as const,
      color: ZIP_OUTLINE,
      width: 1.35
    }
  };
}

function tradeAreaRenderer(field: Field) {
  return {
    type: "class-breaks" as const,
    field: field.name,
    legendOptions: {
      title: field.alias || "Percent donors"
    },
    defaultLabel: "No donor share",
    defaultSymbol: tradeAreaClassBreakSymbol([220, 226, 232, 0.62]),
    classBreakInfos: tradeAreaDonorShareBreaks.map((breakInfo) => ({
      minValue: breakInfo.minValue,
      maxValue: breakInfo.maxValue,
      label: breakInfo.label,
      symbol: tradeAreaClassBreakSymbol(breakInfo.color)
    }))
  };
}

function tradeAreaZipLabelClass(field: Field) {
  return {
    labelExpressionInfo: {
      expression: `Text($feature["${field.name.replace(/"/g, '\\"')}"])`
    },
    labelPlacement: "always-horizontal" as const,
    minScale: 6500000,
    maxScale: 0,
    symbol: {
      type: "text" as const,
      color: [14, 18, 23, 0.94] as Rgba,
      haloColor: [255, 255, 255, 0.94] as Rgba,
      haloSize: 1.45,
      font: {
        family: "Avenir Next",
        size: 11.5,
        weight: "bold" as const
      }
    }
  };
}

function applyTradeAreaZipStyle(featureLayer: StyledFeatureLayer) {
  const percentDonorsField = findPercentDonorsField(featureLayer.fields);
  if (!percentDonorsField) return false;

  featureLayer.renderer = tradeAreaRenderer(percentDonorsField);
  const zipField = findTradeAreaZipField(featureLayer.fields);
  featureLayer.labelsVisible = Boolean(zipField);
  featureLayer.labelingInfo = zipField ? [tradeAreaZipLabelClass(zipField)] : [];
  featureLayer.minScale = 0;
  featureLayer.maxScale = 0;
  featureLayer.opacity = 1;
  featureLayer.blendMode = "normal";
  featureLayer.effect = "drop-shadow(0 1px 0 rgba(17, 24, 39, 0.16))";
  featureLayer.refresh?.();
  return true;
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

  const title = safeLayerTitle(featureLayer);
  if (featureLayer.geometryType === "polygon" && isTradeAreaLayerTitle(title) && applyTradeAreaZipStyle(featureLayer)) return;

  const style = getPresentationStyleForLayer(title);
  if (isLower48VisibleSourceLayerTitle(title)) {
    featureLayer.minScale = 0;
    featureLayer.maxScale = 0;
  }
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
