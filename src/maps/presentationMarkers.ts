import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import { collectArcJurisdictionLayers, safeLayerTitle } from "../utils/biomedMapSuite";

type MarkerKind = "hospital" | "distribution" | "fixed" | "mobile" | "manufacturing" | "warehouse" | "lab" | "kitting";

type RenderableFeatureLayer = FeatureLayer & {
  blendMode?: string;
  effect?: string;
  opacity?: number;
};

const MARKER_STYLES: Record<MarkerKind, { fill: string; stroke: string; glyph: string }> = {
  hospital: {
    fill: "#d71920",
    stroke: "#8f1118",
    glyph: '<path d="M22 11h6v8h8v6h-8v8h-6v-8h-8v-6h8z" fill="#fff"/>'
  },
  distribution: {
    fill: "#d71920",
    stroke: "#8f1118",
    glyph:
      '<path d="M12 15h15v13H12zM27 20h5l4 5v3h-9z" fill="#fff"/><circle cx="17" cy="32" r="2.7" fill="#fff"/><circle cx="32" cy="32" r="2.7" fill="#fff"/>'
  },
  fixed: {
    fill: "#2563eb",
    stroke: "#1e3f8f",
    glyph: '<path d="M14 32V17l10-6 10 6v15h-7v-9h-6v9z" fill="#fff"/>'
  },
  mobile: {
    fill: "#119a61",
    stroke: "#0b6a43",
    glyph:
      '<path d="M11 18h18v12H11zM29 22h5l4 5v3h-9z" fill="#fff"/><circle cx="17" cy="33" r="2.6" fill="#fff"/><circle cx="33" cy="33" r="2.6" fill="#fff"/>'
  },
  manufacturing: {
    fill: "#334155",
    stroke: "#111827",
    glyph: '<path d="M12 33V20l8 4v-4l8 4v-7h6v16zM16 28h3v3h-3zm8 0h3v3h-3zm8 0h3v3h-3z" fill="#fff"/>'
  },
  warehouse: {
    fill: "#7c3aed",
    stroke: "#4c1d95",
    glyph: '<path d="M11 20 24 12l13 8v13H11zm7 6h6v7h-6zm9 0h6v7h-6z" fill="#fff"/>'
  },
  lab: {
    fill: "#0891b2",
    stroke: "#155e75",
    glyph: '<path d="M19 12h10v4h-2v7l7 12H14l7-12v-7h-2zM20 30h8l-3-5v-9h-2v9z" fill="#fff"/>'
  },
  kitting: {
    fill: "#c57900",
    stroke: "#8a5200",
    glyph: '<path d="m13 18 11-6 11 6-11 6zM13 21l10 6v10l-10-6zM35 21v10l-10 6V27z" fill="#fff"/>'
  }
};

function markerKindForLayer(title: string): MarkerKind | null {
  const normalized = title.toLowerCase();
  if (normalized.includes("footprint")) return null;
  if (normalized.includes("hospital") || normalized.includes("portfolio")) return "hospital";
  if (normalized.includes("distribution")) return "distribution";
  if (normalized.includes("fixed")) return "fixed";
  if (normalized.includes("mobile")) return "mobile";
  if (normalized.includes("manufacturing")) return "manufacturing";
  if (normalized.includes("warehouse")) return "warehouse";
  if (normalized.includes("irl")) return "lab";
  if (normalized.includes("kitting")) return "kitting";
  return null;
}

function markerUrl(kind: MarkerKind) {
  const style = MARKER_STYLES[kind];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 48 48">
<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#111827" flood-opacity=".46"/></filter></defs>
<circle cx="24" cy="24" r="19" fill="#fff" filter="url(#shadow)"/>
<circle cx="24" cy="24" r="16" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>
${style.glyph}
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function applyMarker(layer: Layer) {
  const kind = markerKindForLayer(safeLayerTitle(layer));
  if (!kind || typeof (layer as FeatureLayer).load !== "function") return;

  const featureLayer = layer as RenderableFeatureLayer;
  try {
    await featureLayer.load();
  } catch {
    return;
  }

  if (featureLayer.geometryType && featureLayer.geometryType !== "point") return;

  featureLayer.renderer = {
    type: "simple",
    symbol: {
      type: "picture-marker",
      url: markerUrl(kind),
      width: kind === "hospital" ? "28px" : "25px",
      height: kind === "hospital" ? "28px" : "25px",
      yoffset: "2px"
    }
  };
  featureLayer.effect = "drop-shadow(0 2px 3px rgba(17, 24, 39, 0.45))";
  featureLayer.blendMode = "normal";
  featureLayer.opacity = 1;
}

export async function applyPresentationMarkers(map?: ArcGISMap) {
  await Promise.allSettled(collectArcJurisdictionLayers(map).map(applyMarker));
}
