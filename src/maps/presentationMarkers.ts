import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import { collectArcJurisdictionLayers, safeLayerTitle, type BioMedLayerSnapshot } from "../utils/biomedMapSuite";

export type PresentationMarkerKind =
  | "hospital"
  | "distribution"
  | "fixed"
  | "mobile"
  | "manufacturing"
  | "warehouse"
  | "lab"
  | "kitting"
  | "county"
  | "boundary"
  | "division"
  | "region"
  | "chapter"
  | "district"
  | "zip"
  | "operations"
  | "portfolio";

type RenderableFeatureLayer = FeatureLayer & {
  blendMode?: string;
  effect?: string;
  opacity?: number;
  refresh?: () => void;
};

type HospitalTierMarker = "tier1" | "tier2" | "tier3" | "unknown";

const HOSPITAL_TIER_STYLES: Record<HospitalTierMarker, { fill: string; stroke: string; label: string }> = {
  tier1: {
    fill: "#d71920",
    stroke: "#7f0d13",
    label: "Tier 1"
  },
  tier2: {
    fill: "#1f6fbf",
    stroke: "#0f3f7c",
    label: "Tier 2"
  },
  tier3: {
    fill: "#2f8f3e",
    stroke: "#1f5d2b",
    label: "Tier 3"
  },
  unknown: {
    fill: "#6b7280",
    stroke: "#374151",
    label: "Hospital"
  }
};

const MARKER_STYLES: Record<PresentationMarkerKind, { fill: string; stroke: string; label: string; glyph: string }> = {
  hospital: {
    fill: "#d71920",
    stroke: "#8f1118",
    label: "Hospital tiers",
    glyph: '<path d="M22 11h6v8h8v6h-8v8h-6v-8h-8v-6h8z" fill="#fff"/>'
  },
  distribution: {
    fill: "#d71920",
    stroke: "#8f1118",
    label: "Distribution",
    glyph:
      '<path d="M12 15h15v13H12zM27 20h5l4 5v3h-9z" fill="#fff"/><circle cx="17" cy="32" r="2.7" fill="#fff"/><circle cx="32" cy="32" r="2.7" fill="#fff"/>'
  },
  fixed: {
    fill: "#2563eb",
    stroke: "#1e3f8f",
    label: "Fixed site",
    glyph: '<path d="M14 32V17l10-6 10 6v15h-7v-9h-6v9z" fill="#fff"/>'
  },
  mobile: {
    fill: "#119a61",
    stroke: "#0b6a43",
    label: "Mobile site",
    glyph:
      '<path d="M11 18h18v12H11zM29 22h5l4 5v3h-9z" fill="#fff"/><circle cx="17" cy="33" r="2.6" fill="#fff"/><circle cx="33" cy="33" r="2.6" fill="#fff"/>'
  },
  manufacturing: {
    fill: "#334155",
    stroke: "#111827",
    label: "Manufacturing",
    glyph: '<path d="M12 33V20l8 4v-4l8 4v-7h6v16zM16 28h3v3h-3zm8 0h3v3h-3zm8 0h3v3h-3z" fill="#fff"/>'
  },
  warehouse: {
    fill: "#7c3aed",
    stroke: "#4c1d95",
    label: "Warehouse",
    glyph: '<path d="M11 20 24 12l13 8v13H11zm7 6h6v7h-6zm9 0h6v7h-6z" fill="#fff"/>'
  },
  lab: {
    fill: "#0891b2",
    stroke: "#155e75",
    label: "IRL lab",
    glyph: '<path d="M19 12h10v4h-2v7l7 12H14l7-12v-7h-2zM20 30h8l-3-5v-9h-2v9z" fill="#fff"/>'
  },
  kitting: {
    fill: "#c57900",
    stroke: "#8a5200",
    label: "Kitting",
    glyph: '<path d="m13 18 11-6 11 6-11 6zM13 21l10 6v10l-10-6zM35 21v10l-10 6V27z" fill="#fff"/>'
  },
  county: {
    fill: "#7c5eb8",
    stroke: "#4b3b77",
    label: "County boundary",
    glyph: '<path d="M13 15h21v18H13z" fill="none" stroke="#fff" stroke-width="3"/><path d="M21 15v18M13 24h21M28 15v9" fill="none" stroke="#fff" stroke-width="2.5"/>'
  },
  boundary: {
    fill: "#9b5fc0",
    stroke: "#5f3679",
    label: "Boundary",
    glyph: '<path d="M13 30c5-12 10 1 15-11 2-4 5-5 8-5" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="4"/><path d="M13 35h22" stroke="#fff" stroke-linecap="round" stroke-width="3"/>'
  },
  division: {
    fill: "#b45fc6",
    stroke: "#6d347c",
    label: "Division",
    glyph: '<path d="M13 14h21v20H13z" fill="none" stroke="#fff" stroke-width="3"/><path d="M13 22h21M23 14v20" fill="none" stroke="#fff" stroke-width="3"/>'
  },
  region: {
    fill: "#8b63d9",
    stroke: "#51398b",
    label: "Region",
    glyph: '<path d="M15 24a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" fill="none" stroke="#fff" stroke-width="3"/><path d="M24 15v18M15 24h18" stroke="#fff" stroke-width="2.5"/>'
  },
  chapter: {
    fill: "#6f70c7",
    stroke: "#3f437d",
    label: "Chapter",
    glyph: '<path d="m24 12 13 8-13 8-13-8z" fill="none" stroke="#fff" stroke-width="3"/><path d="m15 28 9 6 9-6" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="3"/>'
  },
  district: {
    fill: "#6f85c7",
    stroke: "#3c4d7d",
    label: "District",
    glyph: '<path d="M14 15h9v9h-9zM27 15h7v9h-7zM14 28h20v6H14z" fill="#fff"/>'
  },
  zip: {
    fill: "#2f8f62",
    stroke: "#1f5f42",
    label: "ZIP data",
    glyph: '<path d="M13 15h21v18H13z" fill="none" stroke="#fff" stroke-width="3"/><path d="M17 20h6M17 25h11M17 30h14" stroke="#fff" stroke-linecap="round" stroke-width="3"/>'
  },
  operations: {
    fill: "#24955d",
    stroke: "#17643f",
    label: "Collections operations",
    glyph: '<path d="M24 11c6 0 10 4 10 9 0 8-10 17-10 17s-10-9-10-17c0-5 4-9 10-9z" fill="#fff"/><circle cx="24" cy="20" r="4" fill="#24955d"/>'
  },
  portfolio: {
    fill: "#1f78a8",
    stroke: "#155170",
    label: "Portfolio",
    glyph: '<path d="M15 17h18v18H15zM19 17v-3h10v3" fill="none" stroke="#fff" stroke-linejoin="round" stroke-width="3"/><path d="M15 24h18" stroke="#fff" stroke-width="3"/>'
  }
};

export function markerKindForLayer(title: string, category?: BioMedLayerSnapshot["category"]): PresentationMarkerKind | null {
  const normalized = title.toLowerCase();
  if (normalized.includes("footprint")) return null;
  if (normalized.includes("hospital")) return "hospital";
  if (normalized.includes("distribution")) return "distribution";
  if (normalized.includes("fixed")) return "fixed";
  if (normalized.includes("mobile")) return "mobile";
  if (normalized.includes("manufacturing")) return "manufacturing";
  if (normalized.includes("warehouse")) return "warehouse";
  if (normalized.includes("irl")) return "lab";
  if (normalized.includes("kitting")) return "kitting";
  if (normalized.includes("county")) return "county";
  if (normalized.includes("division")) return "division";
  if (normalized.includes("region")) return "region";
  if (normalized.includes("chapter")) return "chapter";
  if (normalized.includes("district")) return "district";
  if (normalized.includes("zip") || normalized.includes("fy25 data")) return "zip";
  if (normalized.includes("collection operations")) return "operations";
  if (normalized.includes("drd") || normalized.includes("portfolio")) return "portfolio";
  if (category === "sites") return "fixed";
  if (category === "operations") return "operations";
  if (category === "geography") return "boundary";
  if (category === "manufacturing") return "manufacturing";
  if (category === "hospitals") return "hospital";
  return "boundary";
}

export function markerUrl(kind: PresentationMarkerKind) {
  if (kind === "hospital") return hospitalTierLegendMarkerUrl();

  const style = MARKER_STYLES[kind];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 48 48">
<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#111827" flood-opacity=".46"/></filter></defs>
<circle cx="24" cy="24" r="19" fill="#fff" filter="url(#shadow)"/>
<circle cx="24" cy="24" r="16" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>
${style.glyph}
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hospitalTierLegendMarkerUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48" role="img" aria-label="Hospital tier colors">
<defs>
  <filter id="shadow" x="-35%" y="-35%" width="170%" height="170%">
    <feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#111827" flood-opacity=".42"/>
  </filter>
  <linearGradient id="tierFill" x1="8" y1="10" x2="40" y2="38" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${HOSPITAL_TIER_STYLES.tier1.fill}"/>
    <stop offset=".5" stop-color="${HOSPITAL_TIER_STYLES.tier2.fill}"/>
    <stop offset="1" stop-color="${HOSPITAL_TIER_STYLES.tier3.fill}"/>
  </linearGradient>
</defs>
<circle cx="24" cy="24" r="20" fill="#f8fafc" filter="url(#shadow)"/>
<circle cx="24" cy="24" r="16.5" fill="url(#tierFill)" stroke="#111827" stroke-opacity=".75" stroke-width="2"/>
<path d="M16 36V19c0-2 1.6-3.6 3.6-3.6h8.8c2 0 3.6 1.6 3.6 3.6v17" fill="none" stroke="#fff" stroke-linejoin="round" stroke-width="3"/>
<path d="M24 19.5v10M19 24.5h10" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="3.4"/>
<path d="M20.5 36v-6.5h7V36" fill="none" stroke="#fff" stroke-linejoin="round" stroke-width="3"/>
<path d="M16 36h16" stroke="#fff" stroke-linecap="round" stroke-width="3"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hospitalTierMarkerUrl(tier: HospitalTierMarker) {
  const style = HOSPITAL_TIER_STYLES[tier];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48" role="img" aria-label="${style.label} hospital">
<defs>
  <filter id="shadow" x="-35%" y="-35%" width="170%" height="170%">
    <feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#111827" flood-opacity=".42"/>
  </filter>
</defs>
<circle cx="24" cy="24" r="20" fill="#f8fafc" filter="url(#shadow)"/>
<circle cx="24" cy="24" r="16.5" fill="${style.fill}" stroke="#111827" stroke-opacity=".75" stroke-width="2"/>
<path d="M16 36V19c0-2 1.6-3.6 3.6-3.6h8.8c2 0 3.6 1.6 3.6 3.6v17" fill="none" stroke="#fff" stroke-linejoin="round" stroke-width="3"/>
<path d="M24 19.5v10M19 24.5h10" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="3.4"/>
<path d="M20.5 36v-6.5h7V36" fill="none" stroke="#fff" stroke-linejoin="round" stroke-width="3"/>
<path d="M16 36h16" stroke="#fff" stroke-linecap="round" stroke-width="3"/>
<circle cx="24" cy="24" r="16.5" fill="none" stroke="${style.stroke}" stroke-width="1.4"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hospitalTierSymbol(tier: HospitalTierMarker) {
  return {
    type: "picture-marker" as const,
    url: hospitalTierMarkerUrl(tier),
    width: "30px",
    height: "30px",
    yoffset: "2px"
  };
}

function normalizeTierFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findHospitalTierField(layer: FeatureLayer) {
  return layer.fields?.find((field) => {
    const normalizedName = normalizeTierFieldName(field.name);
    const normalizedAlias = normalizeTierFieldName(field.alias ?? "");
    return normalizedName === "finaltier" || normalizedAlias === "finaltier" || normalizedName === "tier" || normalizedAlias === "tier";
  })?.name;
}

function arcadeFieldName(fieldName: string) {
  return fieldName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function applyHospitalTierRenderer(featureLayer: RenderableFeatureLayer) {
  const tierField = findHospitalTierField(featureLayer);
  if (!tierField) {
    featureLayer.renderer = {
      type: "simple",
      symbol: hospitalTierSymbol("unknown")
    };
    return;
  }

  const fieldName = arcadeFieldName(tierField);
  featureLayer.renderer = {
    type: "unique-value",
    valueExpression: `var tier = Lower(Text($feature["${fieldName}"]));
if (Find("1", tier) > -1) { return "tier1"; }
if (Find("2", tier) > -1) { return "tier2"; }
if (Find("3", tier) > -1) { return "tier3"; }
return "unknown";`,
    valueExpressionTitle: "Hospital tier",
    defaultLabel: "Hospital",
    defaultSymbol: hospitalTierSymbol("unknown"),
    uniqueValueInfos: [
      {
        value: "tier1",
        label: HOSPITAL_TIER_STYLES.tier1.label,
        symbol: hospitalTierSymbol("tier1")
      },
      {
        value: "tier2",
        label: HOSPITAL_TIER_STYLES.tier2.label,
        symbol: hospitalTierSymbol("tier2")
      },
      {
        value: "tier3",
        label: HOSPITAL_TIER_STYLES.tier3.label,
        symbol: hospitalTierSymbol("tier3")
      }
    ]
  };
}

export function legendMarkerForLayer(title: string, category?: BioMedLayerSnapshot["category"]) {
  const kind = markerKindForLayer(title, category) ?? "boundary";
  return {
    kind,
    label: MARKER_STYLES[kind].label,
    url: markerUrl(kind)
  };
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

  if (kind === "hospital") {
    applyHospitalTierRenderer(featureLayer);
  } else {
    featureLayer.renderer = {
      type: "simple",
      symbol: {
        type: "picture-marker",
        url: markerUrl(kind),
        width: "25px",
        height: "25px",
        yoffset: "2px"
      }
    };
  }
  featureLayer.effect = "drop-shadow(0 2px 3px rgba(17, 24, 39, 0.45))";
  featureLayer.blendMode = "normal";
  featureLayer.opacity = 1;
  featureLayer.refresh?.();
}

export async function applyPresentationMarkers(map?: ArcGISMap) {
  await Promise.allSettled(collectArcJurisdictionLayers(map).map(applyMarker));
}
