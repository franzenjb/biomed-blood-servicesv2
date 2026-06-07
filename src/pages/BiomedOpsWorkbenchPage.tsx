import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Extent from "@arcgis/core/geometry/Extent";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Field from "@arcgis/core/layers/support/Field";
import type MapView from "@arcgis/core/views/MapView";
import {
  ChevronDown,
  Filter,
  Home,
  Info,
  Layers,
  List,
  MapPinned,
  PanelLeftOpen,
  PanelRightOpen,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import RcMark from "../components/RcMark";
import {
  arcJurisdictionMapSource,
  biomedWorkbenchSupplementalLayers,
  type ArcJurisdictionSupplementalLayerSource
} from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import { applyPresentationMarkers, legendMarkerForLayer } from "../maps/presentationMarkers";
import {
  applyPresentationMapStyle,
  quietOpsBasemapId,
  tradeAreaBreakForDonorShare,
  tradeAreaDonorShareBreaks
} from "../maps/presentationStyle";
import { addArcgisPortalLayers } from "../utils/arcgisMasterLayers";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  getMapElementMap,
  hideBasemapUtilityLayers,
  isBasemapUtilityLayerTitle,
  presenterModes,
  previewLayerSnapshots,
  safeLayerTitle,
  shouldShowLayerForPresenterMode,
  sourceGroups,
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
  type BioMedPresenterModeId,
} from "../utils/biomedMapSuite";
import { buildBioMedSpatialRollup, type BioMedSpatialRollupSummary } from "../utils/biomedRollups";
import { classifyMasterLayer, summarizeMasterFeature, type MasterFeatureSummary } from "../utils/masterMapFeatures";
import "./BiomedOpsWorkbenchPage.css";

type WorkbenchPreset = BioMedPresenterModeId | "default-workbench" | "all-layers" | "clean-map";
type WatchHandle = { remove?: () => void };
type RightTab = "current" | "detail" | "list";
type ArcgisSearchElement = HTMLElement & {
  popupDisabled?: boolean;
  popupTemplate?: unknown;
  resultGraphicDisabled?: boolean;
  viewModel?: {
    popupEnabled?: boolean;
    popupTemplate?: unknown;
    resultGraphicEnabled?: boolean;
  };
};
type SearchStatus = "idle" | "searching" | "ready" | "empty" | "blocked" | "error";
type BiomedOpsWorkbenchPageProps = {
  title?: string;
  resultLabel?: string;
  supplementalLayers?: ArcJurisdictionSupplementalLayerSource[];
  signInHeading?: string;
  signInCopy?: string;
  testId?: string;
};
type FeatureSearchResult = {
  id: string;
  title: string;
  layerTitle: string;
  category: BioMedLayerSnapshot["category"];
  layer: FeatureLayer;
  graphic: Graphic;
};

const HOME_CENTER: [number, number] = [-96.2, 38.3];
const CENTER = HOME_CENTER.join(",");
const ZOOM = 4;
const DEFAULT_WORKBENCH_PRESET: WorkbenchPreset = "default-workbench";
const TRADE_AREA_COMBO_LAYER_ID = "trade-area-by-zip-combo";
const TRADE_AREA_COMBO_TITLE = "Trade Areas by ZIP";
const TRADE_AREA_COMBO_SUMMARY = "ZIP donor-share shading, trade-area outline, and supporting BioMed source layer.";
const TRADE_AREA_COMBO_USE_CASE = "Use to compare ZIP-level donor concentration inside each fixed-site trade area.";
const SEARCH_PER_LAYER_LIMIT = 4;
const SEARCH_TOTAL_LIMIT = 24;
const SEARCH_FIELD_HINTS = [
  "name",
  "title",
  "division",
  "region",
  "district",
  "chapter",
  "county",
  "site",
  "facility",
  "zip",
  "city",
  "address",
  "portfolio",
  "code"
];

function layerMatchesQuery(layer: BioMedLayerSnapshot, query: string) {
  const text = `${layer.title} ${layer.summary} ${layer.useCase} ${layer.category}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function isSearchableFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatures === "function" && typeof (layer as FeatureLayer).createQuery === "function";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ");
}

function isSqlSafeFieldName(fieldName: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName);
}

function isUsefulSearchField(field: Field) {
  if (field.type !== "string" || !isSqlSafeFieldName(field.name)) return false;
  const normalized = normalizeFieldName(`${field.name} ${field.alias ?? ""} ${field.valueType ?? ""}`);
  return SEARCH_FIELD_HINTS.some((hint) => normalized.includes(hint));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function getFeatureSearchFields(layer: FeatureLayer) {
  const fields = layer.fields ?? [];
  const displayField = fields.find((field) => field.name === layer.displayField && field.type === "string");
  const preferred = fields.filter(isUsefulSearchField);
  const fallback = fields.filter((field) => field.type === "string" && isSqlSafeFieldName(field.name)).slice(0, 10);
  return uniqueStrings([displayField?.name, ...preferred.map((field) => field.name), ...fallback.map((field) => field.name)]).slice(0, 12);
}

function escapeSqlLikeTerm(term: string) {
  return term.trim().replace(/'/g, "''").toUpperCase();
}

function buildSearchWhere(fields: string[], term: string) {
  const escapedTerm = escapeSqlLikeTerm(term);
  return fields.map((field) => `UPPER(${field}) LIKE '%${escapedTerm}%'`).join(" OR ");
}

function normalizeDisplayValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeFieldText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function fieldLooksLikeCandidate(fieldName: string, candidate: string) {
  const normalizedField = normalizeFieldText(fieldName);
  const normalizedCandidate = normalizeFieldText(candidate);
  const compactField = normalizeDisplayValue(fieldName);
  const compactCandidate = normalizeDisplayValue(candidate);
  if (!normalizedCandidate || !compactCandidate) return false;
  if (normalizedField === normalizedCandidate || compactField === compactCandidate) return true;
  if (normalizedField.includes(normalizedCandidate)) return true;
  if (compactCandidate.length >= 4 && compactField.includes(compactCandidate)) return true;
  return false;
}

function isTradeAreaLayerTitle(title: string) {
  const normalized = title.toLowerCase().replace(/[_-]+/g, " ");
  return normalized.includes("tradearea") || normalized.includes("trade area") || normalized.includes("fsrsmo");
}

function isTradeAreaZipLayerTitle(title: string) {
  return normalizeDisplayValue(title).includes("tradeareabyzip");
}

function isTradeAreaBoundaryLayerTitle(title: string) {
  const normalized = normalizeDisplayValue(title);
  return normalized.includes("fsrsmotradeareas") || (normalized.includes("fsrsmo") && normalized.includes("tradeareas"));
}

function isSupplementalBioMedSourceLayerTitle(title: string) {
  return title.toLowerCase().replace(/[_-]+/g, " ").includes("biomed source layer");
}

function isTradeAreaCompositeLayerTitle(title: string) {
  return isTradeAreaLayerTitle(title) || isSupplementalBioMedSourceLayerTitle(title);
}

function combineTradeAreaLayerSnapshots(snapshots: BioMedLayerSnapshot[]) {
  const tradeAreaLayers = snapshots.filter((layer) => isTradeAreaCompositeLayerTitle(layer.title));
  if (tradeAreaLayers.length === 0) return snapshots;

  const firstTradeAreaIndex = snapshots.findIndex((layer) => isTradeAreaCompositeLayerTitle(layer.title));
  const combinedTradeAreaLayer: BioMedLayerSnapshot = {
    id: TRADE_AREA_COMBO_LAYER_ID,
    title: TRADE_AREA_COMBO_TITLE,
    category: "operations",
    role: TRADE_AREA_COMBO_SUMMARY,
    summary: TRADE_AREA_COMBO_SUMMARY,
    useCase: TRADE_AREA_COMBO_USE_CASE,
    visible: tradeAreaLayers.every((layer) => layer.visible),
    type: "paired feature layers",
    status: tradeAreaLayers.every((layer) => layer.status === "Loaded") ? "Loaded" : "Loading"
  };

  const combined: BioMedLayerSnapshot[] = [];
  snapshots.forEach((layer, index) => {
    if (index === firstTradeAreaIndex) combined.push(combinedTradeAreaLayer);
    if (!isTradeAreaCompositeLayerTitle(layer.title)) combined.push(layer);
  });
  return combined;
}

function buildWorkbenchLayerSnapshots(map?: ReturnType<typeof getMapElementMap>, supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []) {
  return combineTradeAreaLayerSnapshots(buildLayerSnapshots(map, supplementalLayers));
}

function previewWorkbenchLayerSnapshots(supplementalLayers: ArcJurisdictionSupplementalLayerSource[] = []) {
  return combineTradeAreaLayerSnapshots(previewLayerSnapshots(supplementalLayers));
}

function layerSnapshotKey(layer: Pick<BioMedLayerSnapshot, "title">) {
  return layer.title.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function intendedWorkbenchLayerSnapshots(
  supplementalLayers: ArcJurisdictionSupplementalLayerSource[],
  nextPreset: WorkbenchPreset
) {
  return previewWorkbenchLayerSnapshots(supplementalLayers).map((layer) => ({
    ...layer,
    visible: shouldShowLayerForPreset(layer, nextPreset),
  }));
}

function mergeWorkbenchLayerSnapshots({
  current,
  live,
  expected,
  isAuthenticated,
}: {
  current: BioMedLayerSnapshot[];
  live: BioMedLayerSnapshot[];
  expected: BioMedLayerSnapshot[];
  isAuthenticated: boolean;
}) {
  const currentByTitle = new Map(current.map((layer) => [layerSnapshotKey(layer), layer]));
  const liveByTitle = new Map(live.map((layer) => [layerSnapshotKey(layer), layer]));
  const expectedKeys = new Set(expected.map(layerSnapshotKey));

  const merged = expected.map((expectedLayer) => {
    const key = layerSnapshotKey(expectedLayer);
    const liveLayer = liveByTitle.get(key);
    if (liveLayer) {
      return {
        ...expectedLayer,
        ...liveLayer,
        title: expectedLayer.title,
        category: expectedLayer.category,
        role: expectedLayer.role,
        summary: expectedLayer.summary,
        useCase: expectedLayer.useCase,
      };
    }

    return {
      ...expectedLayer,
      visible: currentByTitle.get(key)?.visible ?? expectedLayer.visible,
      status: isAuthenticated ? "Loading" : expectedLayer.status,
    };
  });

  live.forEach((liveLayer) => {
    if (!expectedKeys.has(layerSnapshotKey(liveLayer))) merged.push(liveLayer);
  });

  return merged;
}

function shouldRetryLayerHydration(
  map: ReturnType<typeof getMapElementMap>,
  supplementalLayers: ArcJurisdictionSupplementalLayerSource[]
) {
  const expectedCount = previewWorkbenchLayerSnapshots(supplementalLayers).length;
  const live = buildWorkbenchLayerSnapshots(map, supplementalLayers);
  return live.length < expectedCount || live.some((layer) => layer.status !== "Loaded");
}

function featureDisplayTitle(feature: MasterFeatureSummary) {
  const tradeAreaZip = isTradeAreaLayerTitle(feature.layerTitle) && tradeAreaZipValue(feature);
  if (tradeAreaZip) return `ZIP ${tradeAreaZip}`;

  const preferredPlaceTitle = featureSourceFieldValue(feature, [
    "Facility Name",
    "Facility",
    "Site Name",
    "Site",
    "Hospital"
  ]);
  const title = (feature.category === "geography" ? feature.title : preferredPlaceTitle || feature.title).trim();
  const layerTitle = feature.layerTitle.toLowerCase();
  if (layerTitle.includes("division") && !/division$/i.test(title)) return `${title} Division`;
  if (layerTitle.includes("district") && !/district$/i.test(title)) return `${title} District`;
  if (layerTitle.includes("chapter") && !/chapter$/i.test(title)) return `${title} Chapter`;
  if (layerTitle.includes("county") && !/county$/i.test(title)) return `${title} County`;
  return title;
}

function featureKindLabel(feature: MasterFeatureSummary) {
  const layerTitle = feature.layerTitle.toLowerCase();
  if (isTradeAreaLayerTitle(feature.layerTitle)) return "Trade-area ZIP donor share";
  if (layerTitle.includes("footprint")) return "Portfolio footprint";
  if (layerTitle.includes("portfolio") && layerTitle.includes("home zip")) return "Portfolio manager base";
  if (layerTitle.includes("portfolio")) return "Portfolio operating area";
  if (layerTitle.includes("best location")) return "Recommended location";
  if (layerTitle.includes("division")) return "BioMed division boundary";
  if (layerTitle.includes("region")) return "BioMed regional boundary";
  if (layerTitle.includes("district")) return "BioMed district boundary";
  if (layerTitle.includes("chapter")) return "Chapter boundary";
  if (layerTitle.includes("county") || layerTitle.includes("counties")) return "County context";
  if (layerTitle.includes("state")) return "State context";
  if (layerTitle.includes("hospital")) return "Hospital location";
  if (layerTitle.includes("fixed site")) return "Fixed collection site";
  if (layerTitle.includes("mobile")) return "Mobile staging site";
  if (layerTitle.includes("distribution")) return "Distribution anchor";
  if (layerTitle.includes("manufacturing")) return "Manufacturing location";
  if (layerTitle.includes("warehouse")) return "Warehouse/logistics anchor";
  if (layerTitle.includes("kitting")) return "Kitting support site";
  if (layerTitle.includes("irl")) return "Reference lab location";
  if (layerTitle.includes("collection operations")) return "Collection operations";
  if (layerTitle.includes("zip")) return "ZIP-level operating data";
  return feature.layerTitle;
}

const GEO_PILL_LABELS = new Set(["region", "district", "division", "chapter", "county", "state", "city", "zip"]);
const STAT_ROW_LABELS = new Set([
  "collections",
  "units",
  "rbc donors",
  "drives",
  "red cells",
  "wb units",
  "sdp units",
  "plasma",
  "sdp",
  "drive distance",
  "drive time",
  "priority",
]);
const JUNK_VALUES = new Set(["x", "xx", "n/a", "na", "none", "null", "tbd", "unknown", "#n/a", "n.a.", "."]);

function isJunkValue(value: string) {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  if (JUNK_VALUES.has(v)) return true;
  if (/^[-–—.\s]+$/.test(v)) return true;
  return false;
}

function extraSourceRows(
  feature: MasterFeatureSummary,
  existing: Array<{ label: string; value: string }>,
  address: string,
  title: string,
  limit = 6,
) {
  const usedValues = new Set(existing.map((row) => normalizeDisplayValue(row.value)));
  const usedLabels = new Set(existing.map((row) => row.label.toLowerCase()));
  const titleNorm = normalizeDisplayValue(title);
  const addrNorm = normalizeDisplayValue(address || "");
  const out: Array<{ label: string; value: string }> = [];

  for (const field of feature.sourceFields) {
    if (out.length >= limit) break;
    const value = (field.value ?? "").trim();
    const label = (field.label ?? "").trim();
    if (!value || !label || isJunkValue(value)) continue;
    const valueNorm = normalizeDisplayValue(value);
    if (valueNorm === titleNorm || valueNorm === addrNorm) continue;
    if (usedValues.has(valueNorm) || usedLabels.has(label.toLowerCase())) continue;
    if (/^(address|street|country|match address|place address|address or place|site address)/i.test(label)) continue;
    out.push({ label, value });
    usedValues.add(valueNorm);
    usedLabels.add(label.toLowerCase());
  }
  return out;
}

function partitionFeatureRows(rows: Array<{ label: string; value: string }>) {
  const geo: Array<{ label: string; value: string }> = [];
  const stats: Array<{ label: string; value: string }> = [];
  const other: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();
  rows.forEach((row) => {
    if (isJunkValue(row.value)) return;
    const key = row.label.toLowerCase();
    const dedupeKey = `${key}:${normalizeDisplayValue(row.value)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    if (STAT_ROW_LABELS.has(key)) stats.push(row);
    else if (GEO_PILL_LABELS.has(key)) geo.push(row);
    else other.push(row);
  });
  return { geo, stats: stats.slice(0, 4), other: other.slice(0, 8) };
}

function featureAccentTone(feature: MasterFeatureSummary) {
  const layerTitle = feature.layerTitle.toLowerCase();
  if (feature.category === "geography") return "slate";
  if (layerTitle.includes("distribution")) return "red";
  if (layerTitle.includes("manufacturing") || layerTitle.includes("warehouse") || layerTitle.includes("kitting") || layerTitle.includes("irl")) return "violet";
  if (layerTitle.includes("fixed site") || layerTitle.includes("mobile") || feature.category === "sites") return "teal";
  if (feature.category === "operations") return "amber";
  return "slate";
}

function featureInsight(feature: MasterFeatureSummary) {
  const layerTitle = feature.layerTitle.toLowerCase();
  const region = featureDetailValue(feature, ["Region"]);
  const regionTail = region ? ` across ${region}` : "";

  // Sites & facilities
  if (layerTitle.includes("distribution")) return `Distribution anchor that receives manufactured blood products and routes them to hospitals${regionTail}.`;
  if (layerTitle.includes("manufacturing")) return "Manufacturing and processing site that turns donations into patient-ready blood products.";
  if (layerTitle.includes("warehouse")) return "Warehouse and logistics hub that stages product and supplies for the BioMed network.";
  if (layerTitle.includes("kitting")) return "Kitting site that assembles the supplies field collection teams rely on.";
  if (layerTitle.includes("irl")) return "Immunohematology reference lab providing specialized compatibility testing.";
  if (layerTitle.includes("fixed site")) {
    const products = featureDetailValue(feature, ["All Products Collected"]);
    return products
      ? `Fixed collection site collecting ${products.toLowerCase()} for the BioMed supply chain.`
      : "Fixed collection site where donors give blood that feeds the BioMed supply chain.";
  }
  if (layerTitle.includes("mobile")) return "Mobile staging site that launches blood drives directly into the community.";

  // Operations
  if (layerTitle.includes("footprint")) return "Geographic footprint a portfolio manager covers for hospital distribution.";
  if (layerTitle.includes("portfolio") && layerTitle.includes("home zip")) return "Home base a portfolio manager works from across their assigned territory.";
  if (layerTitle.includes("portfolio")) return "Portfolio operating area pairing accountable managers with the hospitals they serve.";
  if (layerTitle.includes("best location")) return "Modeled site recommendation for expanding collection or distribution reach.";
  if (layerTitle.includes("collection operations")) return "Collection activity tied to the geography and teams responsible for donor reach.";
  if (layerTitle.includes("zip")) return "ZIP-level operating data connecting collection activity to local donor geography.";

  // Geography
  if (feature.category === "geography") {
    if (layerTitle.includes("division")) return "BioMed division — the broadest stewardship tier organizing regional operations.";
    if (layerTitle.includes("region")) return "BioMed region accountable for collection performance and donor reach in this area.";
    if (layerTitle.includes("district")) return "BioMed district grouping local teams under a shared operating plan.";
    if (layerTitle.includes("chapter")) return "Red Cross chapter footprint framing local presence and community ties.";
    if (layerTitle.includes("county") || layerTitle.includes("counties")) return "County context for grounding operations in familiar local geography.";
    if (layerTitle.includes("state")) return "State context framing reach without raw operational clutter.";
    return feature.impact;
  }

  return feature.talkingPoint;
}

function featureContextRows(feature: MasterFeatureSummary) {
  const titleValue = normalizeDisplayValue(feature.title);
  return [...feature.geography, ...feature.metrics]
    .filter((item) => normalizeDisplayValue(item.value) !== titleValue)
    .slice(0, 6);
}

function featureAttributeValue(feature: MasterFeatureSummary, candidates: string[]) {
  const attributes = feature.rawAttributes ?? {};
  const entries = Object.entries(attributes);

  for (const candidate of candidates) {
    const exact = entries.find(([key]) => key.toLowerCase() === candidate.toLowerCase());
    if (exact && exact[1] != null && `${exact[1]}`.trim()) return exact[1];
  }

  for (const candidate of candidates) {
    const partial = entries.find(([key, value]) => fieldLooksLikeCandidate(key, candidate) && value != null && `${value}`.trim());
    if (partial) return partial[1];
  }

  return undefined;
}

function featureSourceFieldValue(feature: MasterFeatureSummary, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeDisplayValue);
  const exact = feature.sourceFields.find((field) => normalizedCandidates.includes(normalizeDisplayValue(field.label)));
  if (exact?.value) return exact.value;

  const partial = feature.sourceFields.find((field) =>
    normalizedCandidates.some((candidate) => normalizeDisplayValue(field.label).includes(candidate)),
  );
  return partial?.value ?? "";
}

function formatCompactValue(value: unknown, maximumFractionDigits = 1) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString(undefined, { maximumFractionDigits });
  }
  const raw = `${value}`.trim();
  if (!raw) return "";
  const parsed = Number(raw.replace(/,/g, ""));
  if (Number.isFinite(parsed) && /^-?[\d,]+(\.\d+)?$/.test(raw)) {
    return parsed.toLocaleString(undefined, { maximumFractionDigits });
  }
  return raw;
}

function formatIdentifierValue(value: unknown) {
  if (value == null) return "";
  return `${value}`.trim();
}

function featureDetailValue(feature: MasterFeatureSummary, candidates: string[], options: { identifier?: boolean } = {}) {
  const raw = featureAttributeValue(feature, candidates);
  if (raw != null) return options.identifier ? formatIdentifierValue(raw) : formatCompactValue(raw, 2);
  const fromSource = featureSourceFieldValue(feature, candidates);
  if (!fromSource) return "";
  return options.identifier ? fromSource.trim() : formatCompactValue(fromSource, 2);
}

function featureDetailRow(
  feature: MasterFeatureSummary,
  label: string,
  candidates: string[],
  options: { identifier?: boolean; requireNamedValue?: boolean; rejectShortCode?: boolean } = {},
) {
  const value = featureDetailValue(feature, candidates, { identifier: options.identifier });
  if (!value) return null;
  const normalized = normalizeDisplayValue(value);
  if (options.requireNamedValue && !/[a-z]/i.test(value)) return null;
  if (options.rejectShortCode && (/^[A-Z]{1,3}$/i.test(value.trim()) || /^[A-Z]{0,4}\d{1,6}$/i.test(value.replace(/,/g, "").trim()))) return null;
  if (normalized === "unitedstates" || normalized === "pointaddress") return null;
  return { label, value };
}

function compactRows(rows: Array<{ label: string; value: string } | null>, title: string, limit: number) {
  const normalizedTitle = normalizeDisplayValue(title);
  const seenLabels = new Set<string>();
  const seenValues = new Set<string>();
  const seenPairs = new Set<string>();
  return rows
    .filter((row): row is { label: string; value: string } => Boolean(row?.value))
    .filter((row) => {
      const label = normalizeDisplayValue(row.label);
      const value = normalizeDisplayValue(row.value);
      if (!value || value === normalizedTitle) return false;
      const pair = `${label}:${value}`;
      if (seenPairs.has(pair)) return false;
      if (seenValues.has(value) && ["city", "state", "zip", "region", "district", "division"].includes(label)) return false;
      if (seenLabels.has(label) && !["id", "siteid", "groupid", "hospid"].includes(label)) return false;
      seenLabels.add(label);
      seenValues.add(value);
      seenPairs.add(pair);
      return true;
    })
    .slice(0, limit);
}

function featureRawDetailValue(feature: MasterFeatureSummary, candidates: string[]) {
  const raw = featureAttributeValue(feature, candidates);
  if (raw != null) return raw;
  return featureSourceFieldValue(feature, candidates);
}

function formatPercentDonorsValue(value: unknown) {
  if (value == null) return "";
  const raw = `${value}`.trim();
  if (!raw) return "";
  const parsed = Number(raw.replace(/[%,$]/g, ""));
  if (!Number.isFinite(parsed)) return raw;
  return `${parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function parsePercentDonorsValue(value: unknown) {
  if (value == null) return undefined;
  const parsed = typeof value === "number" ? value : Number(`${value}`.replace(/[%,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rgbaCss(color: [number, number, number, number]) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
}

function cleanAddressPart(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
}

function composeFeatureAddress(feature: MasterFeatureSummary) {
  const street = cleanAddressPart(
    featureDetailValue(feature, ["Site Address", "Street Address", "Address 1", "Address Line 1", "StreetAddress"]) ||
      featureDetailValue(feature, ["Match Address", "Place Address", "Address Or Place"]),
  );
  const city = cleanAddressPart(featureDetailValue(feature, ["City"]));
  const state = cleanAddressPart(featureDetailValue(feature, ["State"]));
  const zip = cleanAddressPart(featureDetailValue(feature, ["ZIP", "ZipCode", "ZIP_CODE", "Postal"], { identifier: true }));

  if (!street) return cleanAddressPart([city, state, zip].filter(Boolean).join(", ").replace(/, ([A-Z]{2}),/, ", $1"));
  const locality = [city, state].filter(Boolean).join(", ");
  return cleanAddressPart([street, locality, zip].filter(Boolean).join(", "));
}

function tradeAreaZipValue(feature: MasterFeatureSummary) {
  return featureDetailValue(feature, ["TradeAreaByZip", "Trade Area By Zip", "ZIP", "ZipCode", "ZIP_CODE", "Postal"], { identifier: true });
}

function tradeAreaDonorShareRaw(feature: MasterFeatureSummary) {
  return featureRawDetailValue(feature, ["PercentDonors", "Percent Donors", "Percent_Donors", "Donor Percent", "Donor Share"]);
}

function tradeAreaCenterName(feature: MasterFeatureSummary) {
  const title = feature.title.trim();
  const fieldValue = featureDetailValue(feature, ["Blood Donation Center", "Donation Center", "Facility Name", "Facility", "Site Name", "Site", "Name"]);
  if (/blood donation center/i.test(title)) return title;
  if (/blood donation center/i.test(fieldValue)) return fieldValue;
  return fieldValue;
}

function tradeAreaLocality(feature: MasterFeatureSummary) {
  const city = cleanAddressPart(featureDetailValue(feature, ["City"]));
  const state = cleanAddressPart(featureDetailValue(feature, ["State"], { identifier: true }));
  return [city, state].filter(Boolean).join(", ");
}

function tradeAreaBandTone(feature: MasterFeatureSummary) {
  const activeBreak = tradeAreaBreakForDonorShare(tradeAreaDonorShareRaw(feature));
  const index = tradeAreaDonorShareBreaks.findIndex((breakInfo) => breakInfo.label === activeBreak?.label);
  return ["low", "moderate", "strong", "highest"][index] ?? "unknown";
}

function tradeAreaBandLabel(feature: MasterFeatureSummary) {
  const tone = tradeAreaBandTone(feature);
  if (tone === "highest") return "Highest donor-share band";
  if (tone === "strong") return "Strong donor-share band";
  if (tone === "moderate") return "Moderate donor-share band";
  if (tone === "low") return "Baseline donor-share band";
  return "Donor-share band";
}

function tradeAreaDetailRows(feature: MasterFeatureSummary) {
  const title = normalizeDisplayValue(featureDisplayTitle(feature));
  const center = tradeAreaCenterName(feature);
  const rows = [
    { label: "ZIP", value: tradeAreaZipValue(feature) },
    { label: "Trade area", value: center },
    { label: "Region", value: featureDetailValue(feature, ["Region"]) },
    { label: "District", value: featureDetailValue(feature, ["District"]) },
    { label: "Division", value: featureDetailValue(feature, ["Division"]) },
    { label: "Site type", value: featureDetailValue(feature, ["Site Type", "Facility Type", "Type"]) }
  ];

  const seen = new Set<string>();
  const seenValues = new Set<string>();
  return rows.filter((row) => {
    if (!row.value) return false;
    if (row.label !== "ZIP" && normalizeDisplayValue(row.value) === title) return false;
    const normalizedValue = normalizeDisplayValue(row.value);
    if (seenValues.has(normalizedValue) && row.label !== "ZIP") return false;
    const key = `${row.label}:${normalizeDisplayValue(row.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    seenValues.add(normalizedValue);
    return true;
  });
}

function TradeAreaZipLegend({ feature }: { feature: MasterFeatureSummary }) {
  const donorShare = featureRawDetailValue(feature, ["PercentDonors", "Percent Donors", "Percent_Donors", "Donor Percent", "Donor Share"]);
  const activeBreak = tradeAreaBreakForDonorShare(donorShare);

  return (
    <section className="opsv2__zip-legend" aria-label="Trade-area ZIP color legend">
      <header>
        <span>ZIP color legend</span>
        {activeBreak && <b>{activeBreak.label}</b>}
      </header>
      <div className="opsv2__zip-legend-list">
        {tradeAreaDonorShareBreaks.map((breakInfo) => (
          <div key={breakInfo.label} data-active={activeBreak?.label === breakInfo.label ? "true" : "false"}>
            <i style={{ backgroundColor: rgbaCss(breakInfo.color) }} />
            <span>{breakInfo.label}</span>
            {activeBreak?.label === breakInfo.label && <b>Selected ZIP</b>}
          </div>
        ))}
      </div>
    </section>
  );
}

function TradeAreaFeatureCard({ feature }: { feature: MasterFeatureSummary }) {
  const zip = tradeAreaZipValue(feature);
  const donorShareRaw = tradeAreaDonorShareRaw(feature);
  const donorShare = formatPercentDonorsValue(donorShareRaw);
  const donorShareNumber = parsePercentDonorsValue(donorShareRaw);
  const center = tradeAreaCenterName(feature);
  const locality = tradeAreaLocality(feature);
  const rows = tradeAreaDetailRows(feature).slice(0, 5);
  const tone = tradeAreaBandTone(feature);
  const bandLabel = tradeAreaBandLabel(feature);
  const title = zip ? `ZIP ${zip}` : featureDisplayTitle(feature);
  const contextLine = [locality, center].filter(Boolean).join(" | ");

  return (
    <>
      <header className="opsv2__feature-hero opsv2__feature-hero--trade">
        <p className="opsv2__eyebrow">Trade-area ZIP</p>
        <h2>{title}</h2>
        {contextLine && <p className="opsv2__feature-kind">{contextLine}</p>}
      </header>

      <section className="opsv2__trade-insight" data-tone={tone} aria-label="Selected ZIP donor share">
        <div className="opsv2__trade-metric">
          <span>Donor share</span>
          <strong>{donorShare || "No value"}</strong>
          <em>{bandLabel}</em>
        </div>
        <p>
          {donorShareNumber != null
            ? `${donorShare} of donors in this fixed-site trade area are assigned to ${zip ? `ZIP ${zip}` : "this ZIP"}.`
            : `This ZIP is part of the ${center || "selected"} fixed-site trade area.`}
        </p>
      </section>

      {rows.length > 0 && (
        <dl className="opsv2__feature-facts opsv2__feature-facts--trade">
          {rows.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <TradeAreaZipLegend feature={feature} />

      <div className="opsv2__feature-meta opsv2__feature-meta--quiet" aria-label="Selected feature source">
        <span>
          Layer
          <strong>{TRADE_AREA_COMBO_TITLE}</strong>
        </span>
      </div>
    </>
  );
}

function compactFeatureRows(feature: MasterFeatureSummary) {
  const displayTitle = featureDisplayTitle(feature);
  const layerTitle = feature.layerTitle.toLowerCase();
  if (isTradeAreaLayerTitle(feature.layerTitle)) return tradeAreaDetailRows(feature).slice(0, 8);

  if (feature.category === "geography") {
    return compactRows(
      [
        ...featureContextRows(feature),
        featureDetailRow(feature, "Division", ["Division"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "Region", ["Region"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "District", ["District"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "Chapter", ["Chapter"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "County", ["County"], { requireNamedValue: true }),
      ],
      displayTitle,
      7,
    );
  }

  if (layerTitle.includes("fixed site") || layerTitle.includes("distribution") || layerTitle.includes("mobile") || feature.category === "sites") {
    return compactRows(
      [
        // Real metric fields (Fixed Sites carries these; lean site layers don't)
        featureDetailRow(feature, "Drives", ["FY25 Red Cell Drives"]),
        featureDetailRow(feature, "Red cells", ["FY25 Total Red Cell Products"]),
        featureDetailRow(feature, "WB units", ["FY25 WB Collected"]),
        featureDetailRow(feature, "SDP units", ["FY25 SDP Units"]),
        featureDetailRow(feature, "Account", ["Account Name", "Account", "Customer Name"], { requireNamedValue: true }),
        featureDetailRow(feature, "Coll op", ["Biomed Coll Op", "Collection Operation"], { requireNamedValue: true }),
        featureDetailRow(feature, "Products", ["All Products Collected"], { requireNamedValue: true }),
        featureDetailRow(feature, "Status", ["Integrated Status"], { requireNamedValue: true }),
        featureDetailRow(feature, "Mfg site", ["Biomed Manufacturing Location - FS/Aph (ORC)", "Manufacturing Location"], { requireNamedValue: true }),
        featureDetailRow(feature, "Division", ["Division", "Biomed Division"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "Region", ["Biomed Region"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "District", ["Biomed District"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "City", ["City"]),
        featureDetailRow(feature, "State", ["State"], { identifier: true }),
        featureDetailRow(feature, "ZIP", ["ZIP", "Zip Code", "ZipCode", "ZIP_CODE", "Postal"], { identifier: true }),
      ],
      displayTitle,
      11,
    );
  }

  if (layerTitle.includes("zip") || layerTitle.includes("fy25")) {
    return compactRows(
      [
        featureDetailRow(feature, "Collections", ["TotalColl", "Total Collections", "Collections"]),
        featureDetailRow(feature, "Drives", ["TotalDrives", "Total Drives", "Drives"]),
        featureDetailRow(feature, "Plasma", ["Plasma"]),
        featureDetailRow(feature, "SDP", ["SDP"]),
        featureDetailRow(feature, "ZIP", ["Zip Code", "ZIP", "ZipCode", "ZIP_CODE"], { identifier: true }),
        featureDetailRow(feature, "Place", ["NAME", "Name"], { requireNamedValue: true }),
        featureDetailRow(feature, "Division", ["Biomed Division", "Division"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "Region", ["Biomed Region"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "District", ["Biomed District"], { requireNamedValue: true, rejectShortCode: true }),
        featureDetailRow(feature, "Coll op", ["Biomed Coll Op"], { requireNamedValue: true }),
        featureDetailRow(feature, "Chapter", ["HS Chapter", "Chapter"], { requireNamedValue: true }),
        featureDetailRow(feature, "Portfolio", ["DRD AM Portfolio"], { requireNamedValue: true }),
      ],
      displayTitle,
      11,
    );
  }

  if (feature.category === "manufacturing") {
    return compactRows(
      [
        featureDetailRow(feature, "Facility", ["Facility Name", "Facility", "Site Name"], { requireNamedValue: true }),
        featureDetailRow(feature, "Structure", ["Structure Details", "Structure Type"], { requireNamedValue: true }),
        featureDetailRow(feature, "Account", ["Account Name", "Account", "Customer Name"], { requireNamedValue: true }),
        featureDetailRow(feature, "City", ["City"]),
        featureDetailRow(feature, "State", ["State"], { identifier: true }),
        featureDetailRow(feature, "ZIP", ["ZIP", "Zip Code", "ZipCode", "ZIP_CODE", "Postal"], { identifier: true }),
        featureDetailRow(feature, "Region", ["Biomed Region"], { requireNamedValue: true, rejectShortCode: true }),
      ],
      displayTitle,
      7,
    );
  }

  return compactRows(
    [
      featureDetailRow(feature, "Portfolio", ["Portfolio", "PortfolioName", "Portfolio Name"]),
      featureDetailRow(feature, "ZIP", ["ZIP", "ZipCode", "ZIP_CODE", "Postal"], { identifier: true }),
      featureDetailRow(feature, "City", ["City"]),
      featureDetailRow(feature, "State", ["State"], { identifier: true }),
      featureDetailRow(feature, "Collections", ["Collections", "Collection Count", "Total Collections"]),
      featureDetailRow(feature, "Units", ["Units", "Total Units", "RBC Units"]),
      featureDetailRow(feature, "RBC donors", ["CY24 RBC Donors", "RBC Donors"]),
      featureDetailRow(feature, "Region", ["Region"], { requireNamedValue: true, rejectShortCode: true }),
      featureDetailRow(feature, "District", ["District"], { requireNamedValue: true, rejectShortCode: true }),
    ],
    displayTitle,
    6,
  );
}

function hospitalAttribute(feature: MasterFeatureSummary, candidates: string[]) {
  const raw = featureAttributeValue(feature, candidates);
  if (raw == null) return "";
  if (candidates.some((candidate) => /zip|postal|(^|\s)id$|code/i.test(candidate))) return `${raw}`.trim();
  return formatCompactValue(raw, 2);
}

function hospitalDriveTime(feature: MasterFeatureSummary) {
  const raw = featureAttributeValue(feature, ["Dist Drive Time", "Drive Time", "AvgHrsbyHospital", "Avg Hrs by Hospital"]);
  const value = typeof raw === "number" ? raw : Number(`${raw ?? ""}`.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} hr`;
}

function hospitalPriority(feature: MasterFeatureSummary) {
  const raw = featureAttributeValue(feature, ["Composite Priority Score", "Priority Score", "CompositePriorityScore"]);
  const value = typeof raw === "number" ? raw : Number(`${raw ?? ""}`.replace(/,/g, ""));
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function hospitalDetailRows(feature: MasterFeatureSummary) {
  const rows = [
    { label: "System", value: hospitalAttribute(feature, ["Group", "Health System", "Group Name"]) },
    { label: "Hosp ID", value: hospitalAttribute(feature, ["HospID", "Hosp ID", "Hospital ID", "HospitalID"]) },
    { label: "Group ID", value: hospitalAttribute(feature, ["Group ID", "GroupID"]) },
    { label: "Distribution", value: hospitalAttribute(feature, ["Distribution Site", "DistributionSite"]) },
    { label: "Division", value: hospitalAttribute(feature, ["Division"]) },
    { label: "ZIP", value: hospitalAttribute(feature, ["ZIP", "ZipCode", "ZIP_CODE"]) },
    { label: "Drive time", value: hospitalDriveTime(feature) },
    { label: "Priority", value: hospitalPriority(feature) }
  ];

  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.value) return false;
    const key = `${row.label}:${row.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function HospitalFeatureCard({ feature }: { feature: MasterFeatureSummary }) {
  const title = hospitalAttribute(feature, ["Hospital", "HospitalName", "Hospital Name"]) || featureDisplayTitle(feature);
  const tier = hospitalAttribute(feature, ["Final Tier", "FINAL_TIER", "Tier"]);
  const tierNum = tier && !isJunkValue(tier) ? (tier.match(/[123]/)?.[0] ?? "") : "";
  const hospitalTone = tierNum ? `tier${tierNum}` : "blue";
  const distributionSite = hospitalAttribute(feature, ["Distribution Site", "DistributionSite"]);
  const priority = hospitalPriority(feature);
  const address = composeFeatureAddress(feature);
  const directionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";
  const insight = distributionSite && !isJunkValue(distributionSite)
    ? `Hospital receiving Red Cross blood products, supplied through the ${distributionSite} distribution site.`
    : "Hospital receiving Red Cross blood products from the BioMed network.";

  const snapshotLabels = new Set(["distribution", "priority"]);
  const baseRows = hospitalDetailRows(feature).filter(
    (row) => !snapshotLabels.has(row.label.toLowerCase()) && !isJunkValue(row.value),
  );
  const detailRows = [...baseRows, ...extraSourceRows(feature, baseRows, address, title)];
  const pills = detailRows.filter((row) => GEO_PILL_LABELS.has(row.label.toLowerCase()));
  const facts = detailRows.filter((row) => !GEO_PILL_LABELS.has(row.label.toLowerCase())).slice(0, 8);

  return (
    <div className="opsv2__feature-body" data-tone={hospitalTone}>
      <header className={`opsv2__feature-hero opsv2__feature-hero--hospital${tierNum ? " opsv2__feature-hero--tiered" : ""}`}>
        <p className="opsv2__eyebrow">Selected hospital</p>
        <h2>{title}</h2>
        <span className="opsv2__feature-badge">
          <i aria-hidden="true" />
          {tierNum ? `Tier ${tierNum} hospital` : "Hospital location"}
        </span>
        {tierNum && (
          <div className="opsv2__tier-crest" aria-hidden="true">
            <span className="opsv2__tier-crest-medal">
              <em>Tier</em>
              <b>{tierNum}</b>
            </span>
            <span className="opsv2__tier-pips">
              {[0, 1, 2].map((index) => (
                <i key={index} data-on={index < 3 - Number(tierNum) + 1 ? "true" : "false"} />
              ))}
            </span>
          </div>
        )}
      </header>

      <p className="opsv2__feature-insight">{insight}</p>

      {address && (
        <div className="opsv2__feature-address" aria-label="Hospital address">
          <svg className="opsv2__feature-address-pin" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <span className="opsv2__feature-address-text">{address}</span>
          {directionsUrl && (
            <a className="opsv2__feature-directions" href={directionsUrl} target="_blank" rel="noreferrer">
              Directions
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}

      {(tier || distributionSite || priority) && (
        <div className="opsv2__hospital-snapshot" aria-label="Hospital selection summary">
          {tier && !isJunkValue(tier) && (
            <div className="opsv2__hospital-tier">
              <span>Tier</span>
              <strong>
                {tierNum && <i className="opsv2__tier-dot" aria-hidden="true" />}
                {tier}
              </strong>
            </div>
          )}
          {distributionSite && !isJunkValue(distributionSite) && (
            <div>
              <span>Distribution site</span>
              <strong>{distributionSite}</strong>
            </div>
          )}
          {priority && !isJunkValue(priority) && (
            <div>
              <span>Priority score</span>
              <strong>{priority}</strong>
            </div>
          )}
        </div>
      )}

      {pills.length > 0 && (
        <div className="opsv2__feature-pills" aria-label="Hospital geographic context">
          {pills.map((item) => (
            <span key={`${item.label}-${item.value}`} className="opsv2__feature-pill">
              <em>{item.label}</em>
              {item.value}
            </span>
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <dl className="opsv2__feature-facts opsv2__feature-facts--hospital">
          {facts.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="opsv2__feature-meta opsv2__feature-meta--quiet" aria-label="Hospital source layer">
        <span>
          Source
          <strong>{feature.layerTitle}</strong>
        </span>
      </div>
    </div>
  );
}

function FeatureInfoCard({ feature }: { feature: MasterFeatureSummary }) {
  if (isTradeAreaLayerTitle(feature.layerTitle)) return <TradeAreaFeatureCard feature={feature} />;

  const layerTitle = feature.layerTitle.toLowerCase();
  const isZipLayer = layerTitle.includes("zip") || layerTitle.includes("fy25");
  const address = isZipLayer ? "" : composeFeatureAddress(feature);
  const title = featureDisplayTitle(feature);
  const tone = featureAccentTone(feature);
  const insight = featureInsight(feature);
  const baseRows = compactFeatureRows(feature);
  const enrichedRows = [...baseRows, ...extraSourceRows(feature, baseRows, address, title)];
  const { geo, stats, other } = partitionFeatureRows(enrichedRows);
  const directionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  return (
    <div className="opsv2__feature-body" data-tone={tone}>
      <header className="opsv2__feature-hero opsv2__feature-hero--compact">
        <p className="opsv2__eyebrow">Selected feature</p>
        <h2>{title}</h2>
        <span className="opsv2__feature-badge">
          <i aria-hidden="true" />
          {featureKindLabel(feature)}
        </span>
      </header>

      {insight && <p className="opsv2__feature-insight">{insight}</p>}

      {address && (
        <div className="opsv2__feature-address" aria-label="Feature address">
          <svg className="opsv2__feature-address-pin" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <span className="opsv2__feature-address-text">{address}</span>
          {directionsUrl && (
            <a className="opsv2__feature-directions" href={directionsUrl} target="_blank" rel="noreferrer">
              Directions
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}

      {stats.length > 0 && (
        <div className="opsv2__feature-stats" aria-label="Feature metrics">
          {stats.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}

      {geo.length > 0 && (
        <div className="opsv2__feature-pills" aria-label="Geographic context">
          {geo.map((item) => (
            <span key={`${item.label}-${item.value}`} className="opsv2__feature-pill">
              <em>{item.label}</em>
              {item.value}
            </span>
          ))}
        </div>
      )}

      {other.length > 0 && (
        <dl className="opsv2__feature-facts opsv2__feature-facts--compact">
          {other.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="opsv2__feature-meta opsv2__feature-meta--quiet" aria-label="Selected feature source">
        <span>
          Source
          <strong>{feature.layerTitle}</strong>
        </span>
      </div>
    </div>
  );
}

async function enrichGraphicAttributes(graphic: Graphic) {
  const layer = graphic.layer as FeatureLayer | undefined;
  if (!layer || !isSearchableFeatureLayer(layer)) return graphic;

  try {
    await layer.load?.();
    const objectIdRaw = layer.objectIdField ? graphic.attributes?.[layer.objectIdField] : undefined;
    const objectId = Number(objectIdRaw);
    if (!Number.isFinite(objectId)) return graphic;

    const query = layer.createQuery();
    query.objectIds = [objectId];
    query.outFields = ["*"];
    query.returnGeometry = false;

    const result = await layer.queryFeatures(query);
    const fullAttributes = result.features?.[0]?.attributes;
    if (fullAttributes) {
      graphic.attributes = { ...graphic.attributes, ...fullAttributes };
    }
  } catch {
    // Hit-test attributes are still good enough for a fallback readout.
  }

  return graphic;
}

function zoomTargetForGeometry(geometry: Geometry) {
  const extent = geometry.extent as Extent | null | undefined;
  if (extent) return extent.clone().expand(1.35);
  return {
    target: geometry,
    zoom: 9
  };
}

function isOperationalHitGraphic(graphic: Graphic | undefined, map?: ReturnType<typeof getMapElementMap>) {
  const layer = hitGraphicSourceLayer(graphic);
  if (!graphic?.attributes || !layer || !map) return false;
  if (isBasemapUtilityLayerTitle(safeLayerTitle(layer))) return false;

  const operationalLayers = collectArcJurisdictionLayers(map);
  return operationalLayers.some((candidate) => candidate === layer || candidate.id === layer.id);
}

function hitGraphicSourceLayer(graphic: Graphic | undefined) {
  const graphicWithSource = graphic as (Graphic & { sourceLayer?: Layer }) | undefined;
  return graphicWithSource?.sourceLayer ?? (graphic?.layer as Layer | undefined);
}

function hitGraphicLayerTitle(graphic: Graphic | undefined) {
  const layer = hitGraphicSourceLayer(graphic);
  return layer ? safeLayerTitle(layer) : "";
}

function hitGraphicPriority(graphic: Graphic | undefined) {
  const layer = hitGraphicSourceLayer(graphic) as FeatureLayer | undefined;
  const title = hitGraphicLayerTitle(graphic);
  const category = classifyMasterLayer(title);
  const geometryType = layer?.geometryType;
  if (geometryType === "point" || category === "sites" || category === "hospitals" || category === "manufacturing") return 100;
  if (isTradeAreaZipLayerTitle(title)) return 80;
  if (isTradeAreaBoundaryLayerTitle(title)) return 50;
  if (category === "operations") return 60;
  if (category === "geography") return 30;
  return 40;
}

function selectBestOperationalHit(results: unknown[], map?: ReturnType<typeof getMapElementMap>) {
  return results
    .map((candidate, index) => ({ candidate: candidate as { graphic?: Graphic }, index }))
    .filter(({ candidate }) => isOperationalHitGraphic(candidate.graphic, map))
    .sort((a, b) => hitGraphicPriority(b.candidate.graphic) - hitGraphicPriority(a.candidate.graphic) || a.index - b.index)[0]?.candidate;
}

function shouldShowLayerForPreset(layer: BioMedLayerSnapshot, nextPreset: WorkbenchPreset) {
  const title = layer.title.toLowerCase();
  if (nextPreset === "default-workbench") {
    return (
      title.includes("fixed site") ||
      title.includes("distribution site") ||
      title.includes("biomed regions") ||
      isTradeAreaLayerTitle(title) ||
      isSupplementalBioMedSourceLayerTitle(title)
    );
  }
  if (nextPreset === "clean-map") return false;
  if (nextPreset === "all-layers") return true;
  if (isSupplementalBioMedSourceLayerTitle(title)) return nextPreset === "collection-access";
  return shouldShowLayerForPresenterMode(layer, nextPreset);
}

function formatRollupNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function shouldShowSecondaryText(primary: string, secondary: string) {
  if (!secondary) return false;
  return normalizeDisplayValue(primary) !== normalizeDisplayValue(secondary);
}

function SpatialRollupPanel({
  selectedFeature,
  rollup
}: {
  selectedFeature: MasterFeatureSummary | null;
  rollup: BioMedSpatialRollupSummary | null;
}) {
  if (!selectedFeature) {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live geography rollup</p>
        <h3>Select a boundary</h3>
        <p className="opsv2__rollup-note">Click a BioMed division, region, district, chapter, or county to compute live intersections across the source layers.</p>
      </section>
    );
  }

  if (selectedFeature.category !== "geography") {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live geography rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <p className="opsv2__rollup-note">Select a geography boundary to roll up facilities, operations, and jurisdiction layers.</p>
      </section>
    );
  }

  if (!rollup || rollup.status === "loading") {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live geography rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <p className="opsv2__rollup-note">Building live layer intersections...</p>
      </section>
    );
  }

  if (rollup.status === "empty" || rollup.status === "error") {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live geography rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <p className="opsv2__rollup-note">{rollup.message ?? "No matching source layers were found inside this boundary."}</p>
      </section>
    );
  }

  return (
    <section className="opsv2__rollup-card">
      <header className="opsv2__rollup-head">
        <p className="opsv2__eyebrow">Live geography rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <span>{rollup.message}</span>
      </header>

      <div className="opsv2__rollup-section">
        <header>
          <span>Category totals</span>
          <b>{rollup.categoryRows.length}</b>
        </header>
        <div className="opsv2__rollup-list">
          {rollup.categoryRows.map((row) => (
            <article key={row.id}>
              <div>
                <strong>{row.title}</strong>
                {shouldShowSecondaryText(row.title, row.categoryLabel) && <span>{row.categoryLabel}</span>}
              </div>
              <b>{formatRollupNumber(row.count)}</b>
            </article>
          ))}
        </div>
      </div>

      <div className="opsv2__rollup-section">
        <header>
          <span>Layer matches</span>
          <b>{rollup.layerRows.length}</b>
        </header>
        <div className="opsv2__rollup-list">
          {rollup.layerRows.map((row) => (
            <article key={row.id}>
              <div>
                <strong>{row.title}</strong>
                {shouldShowSecondaryText(row.title, row.categoryLabel) && <span>{row.categoryLabel}</span>}
                {row.metrics.length > 0 && (
                  <small>
                    {row.metrics.map((metric) => `${metric.label}: ${formatRollupNumber(metric.value)}`).join(" · ")}
                  </small>
                )}
              </div>
              <b>{formatRollupNumber(row.count)}</b>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function BiomedOpsWorkbenchPage({
  title = "BioMed Ops Workbench",
  resultLabel = "Workbench",
  supplementalLayers = biomedWorkbenchSupplementalLayers,
  signInHeading = "Sign in to inspect live workbench layers",
  signInCopy = "Layer inventory is visible. Counts, toggles, and selected features require the private Red Cross ArcGIS web map.",
  testId = "biomed-ops-workbench"
}: BiomedOpsWorkbenchPageProps = {}) {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const searchRef = useRef<ArcgisSearchElement | null>(null);
  const searchRunRef = useRef(0);
  const [preset, setPreset] = useState<WorkbenchPreset>(DEFAULT_WORKBENCH_PRESET);
  const [layers, setLayers] = useState<BioMedLayerSnapshot[]>(() =>
    intendedWorkbenchLayerSnapshots(supplementalLayers, DEFAULT_WORKBENCH_PRESET),
  );
  const [styledMapKey, setStyledMapKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResults, setSearchResults] = useState<FeatureSearchResult[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sourceGroups.map((group) => [group.id, true])),
  );
  const [selectedFeature, setSelectedFeature] = useState<MasterFeatureSummary | null>(null);
  const [selectedGraphic, setSelectedGraphic] = useState<Graphic | null>(null);
  const [spatialRollup, setSpatialRollup] = useState<BioMedSpatialRollupSummary | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("current");
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();
  const activeArcgisMapKey = isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "opsv2-preview";

  const filteredLayers = useMemo(
    () => layers.filter((layer) => layerMatchesQuery(layer, query)),
    [layers, query],
  );

  const layerCounts = useMemo(
    () =>
      layers.reduce(
        (counts, layer) => {
          counts.total += 1;
          if (layer.visible) counts.visible += 1;
          return counts;
        },
        { total: 0, visible: 0 },
      ),
    [layers],
  );

  const pendingLayerCount = useMemo(
    () => (isAuthenticated ? layers.filter((layer) => layer.status !== "Loaded").length : 0),
    [isAuthenticated, layers],
  );
  const pendingVisibleLayerCount = useMemo(
    () => (isAuthenticated ? layers.filter((layer) => layer.visible && layer.status !== "Loaded").length : 0),
    [isAuthenticated, layers],
  );
  const mapIsInitializing = isAuthenticated && (styledMapKey !== activeArcgisMapKey || pendingVisibleLayerCount > 0);
  const activeLayers = useMemo(() => layers.filter((layer) => layer.visible), [layers]);
  const inactiveLayers = useMemo(() => layers.filter((layer) => !layer.visible), [layers]);

  const groupSummaries = useMemo(
    () =>
      sourceGroups
        .map((group) => {
          const groupLayers = layers.filter((layer) => layer.category === group.id);
          const activeCount = groupLayers.filter((layer) => layer.visible).length;
          return {
            ...group,
            total: groupLayers.length,
            active: activeCount,
          };
        })
        .filter((group) => group.total > 0),
    [layers],
  );

  const presetLabel = useMemo(() => {
    if (preset === "default-workbench") return "Default workbench";
    if (preset === "all-layers") return "All BioMed layers";
    if (preset === "clean-map") return "Clean map";
    return presenterModes.find((mode) => mode.id === preset)?.label ?? "Custom view";
  }, [preset]);

  const currentTitle = query.trim() ? `Search: ${query.trim()}` : selectedFeature ? featureDisplayTitle(selectedFeature) : "Current filter";
  const currentSubtitle = query.trim()
    ? `${searchResults.length} feature result${searchResults.length === 1 ? "" : "s"}`
    : presetLabel;

  const refreshLayers = useCallback(() => {
    const map = getMapElementMap(mapRef.current);
    const live = buildWorkbenchLayerSnapshots(map, supplementalLayers);
    const expected = intendedWorkbenchLayerSnapshots(supplementalLayers, preset);
    setLayers((current) => mergeWorkbenchLayerSnapshots({ current, live, expected, isAuthenticated }));
  }, [isAuthenticated, preset, supplementalLayers]);

  const closeSearchPopup = useCallback(() => {
    const view = mapRef.current?.view as (MapView & { popup?: { close?: () => void } }) | undefined;
    view?.popup?.close?.();
  }, []);

  const disableSearchPopup = useCallback(() => {
    const searchElement = searchRef.current;
    if (!searchElement) return;
    searchElement.popupDisabled = true;
    searchElement.popupTemplate = null;
    searchElement.resultGraphicDisabled = true;
    if (searchElement.viewModel) {
      searchElement.viewModel.popupEnabled = false;
      searchElement.viewModel.popupTemplate = null;
      searchElement.viewModel.resultGraphicEnabled = false;
    }
  }, []);

  const runFeatureSearch = useCallback(
    async (term: string, runId: number) => {
      const map = getMapElementMap(mapRef.current);
      if (!map || !isAuthenticated) {
        setSearchResults([]);
        setSearchStatus(isAuthenticated ? "idle" : "blocked");
        return;
      }

      const featureLayers = collectArcJurisdictionLayers(map).filter(isSearchableFeatureLayer);
      const settled = await Promise.allSettled(
        featureLayers.map(async (layer) => {
          await layer.load?.();
          const fields = getFeatureSearchFields(layer);
          if (fields.length === 0) return [];

          const searchQuery = layer.createQuery();
          searchQuery.where = buildSearchWhere(fields, term);
          searchQuery.outFields = ["*"];
          searchQuery.returnGeometry = true;
          searchQuery.num = SEARCH_PER_LAYER_LIMIT;

          const featureSet = await layer.queryFeatures(searchQuery);
          const layerTitle = safeLayerTitle(layer);
          return featureSet.features.map((graphic, index) => {
            const summary = summarizeMasterFeature(graphic, layerTitle);
            const objectId = graphic.attributes?.[layer.objectIdField] ?? index;
            return {
              id: `${layer.id}-${objectId}-${summary.title}`,
              title: summary.title,
              layerTitle,
              category: summary.category,
              layer,
              graphic
            } satisfies FeatureSearchResult;
          });
        }),
      );

      if (runId !== searchRunRef.current) return;

      const results = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])).slice(0, SEARCH_TOTAL_LIMIT);
      setSearchResults(results);
      setSearchStatus(results.length > 0 ? "ready" : "empty");
    },
    [isAuthenticated],
  );

  const applyPreset = useCallback(
    (nextPreset: WorkbenchPreset) => {
      setPreset(nextPreset);
      const map = getMapElementMap(mapRef.current);
      hideBasemapUtilityLayers(map);
      const mapLayers = collectArcJurisdictionLayers(map);
      if (!map || mapLayers.length === 0) {
        setLayers((current) =>
          mergeWorkbenchLayerSnapshots({
            current,
            live: [],
            expected: intendedWorkbenchLayerSnapshots(supplementalLayers, nextPreset),
            isAuthenticated,
          }),
        );
        return;
      }

      const nextSnapshots = buildLayerSnapshots(map, supplementalLayers);
      mapLayers.forEach((layer) => {
        const snapshot = nextSnapshots.find((item) => item.id === layer.id);
        if (!snapshot) return;
        layer.visible = shouldShowLayerForPreset(snapshot, nextPreset);
      });
      refreshLayers();
    },
    [isAuthenticated, refreshLayers, supplementalLayers],
  );

  useEffect(() => {
    const term = query.trim();
    searchRunRef.current += 1;
    const runId = searchRunRef.current;

    if (term.length < 2) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    if (!isAuthenticated) {
      setSearchResults([]);
      setSearchStatus("blocked");
      return;
    }

    setSearchStatus("searching");
    const timeout = window.setTimeout(() => {
      void runFeatureSearch(term, runId).catch(() => {
        if (runId !== searchRunRef.current) return;
        setSearchResults([]);
        setSearchStatus("error");
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, query, runFeatureSearch]);

  useEffect(() => {
    const searchElement = searchRef.current;
    if (!searchElement) return;

    const cleanupSearchPopup = () => {
      disableSearchPopup();
      closeSearchPopup();
      window.setTimeout(closeSearchPopup, 0);
      window.setTimeout(closeSearchPopup, 150);
    };

    cleanupSearchPopup();
    searchElement.addEventListener("arcgisReady", cleanupSearchPopup);
    searchElement.addEventListener("arcgisSelectResult", cleanupSearchPopup);
    searchElement.addEventListener("arcgisSearchComplete", cleanupSearchPopup);
    searchElement.addEventListener("arcgisSearchClear", cleanupSearchPopup);

    return () => {
      searchElement.removeEventListener("arcgisReady", cleanupSearchPopup);
      searchElement.removeEventListener("arcgisSelectResult", cleanupSearchPopup);
      searchElement.removeEventListener("arcgisSearchComplete", cleanupSearchPopup);
      searchElement.removeEventListener("arcgisSearchClear", cleanupSearchPopup);
    };
  }, [closeSearchPopup, disableSearchPopup, isAuthenticated]);

  useEffect(() => {
    if (!query.trim()) return;
    const groupsToOpen = new Set<string>();
    filteredLayers.forEach((layer) => groupsToOpen.add(layer.category));
    searchResults.forEach((result) => groupsToOpen.add(result.category));
    if (groupsToOpen.size === 0) return;

    setExpandedGroups((current) => {
      let changed = false;
      const next = { ...current };
      groupsToOpen.forEach((groupId) => {
        if (!next[groupId]) {
          next[groupId] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [filteredLayers, query, searchResults]);

  useEffect(() => {
    let cancelled = false;
    let restyleTimer: number | undefined;
    let startupTimer: number | undefined;
    let readyListenerElement: ArcgisMapElement | null = null;
    let readyListener: (() => void) | null = null;
    const handles: WatchHandle[] = [];

    async function hydrateMap() {
      if (!isAuthenticated) {
        setStyledMapKey(activeArcgisMapKey);
        setLayers(intendedWorkbenchLayerSnapshots(supplementalLayers, preset));
        setSelectedFeature(null);
        setSelectedGraphic(null);
        setSpatialRollup(null);
        return;
      }

      setStyledMapKey(null);
      const mapElement = mapRef.current;
      const view = mapElement?.view as (MapView & { popupEnabled?: boolean; popup?: { close?: () => void } }) | undefined;
      if (!mapElement || !view) return;
      if (mapElement.dataset.mapKey !== activeArcgisMapKey) return;

      await view.when?.();
      if (cancelled) return;

      const map = getMapElementMap(mapElement);
      if (!map) return;
      await addArcgisPortalLayers(map, supplementalLayers);
      if (cancelled) return;

      hideBasemapUtilityLayers(map);
      await applyPresentationMapStyle(map, view);
      await applyPresentationMarkers(map);
      if (cancelled) return;

      collectArcJurisdictionLayers(map).forEach((layer) => {
        if ("popupEnabled" in layer) {
          (layer as Layer & { popupEnabled?: boolean }).popupEnabled = false;
        }
        if ("popupTemplate" in layer) {
          (layer as Layer & { popupTemplate?: unknown }).popupTemplate = null;
        }
        const handle = (layer as Layer & { watch?: (name: string, callback: () => void) => WatchHandle }).watch?.(
          "visible",
          refreshLayers,
        );
        if (handle) handles.push(handle);
      });

      view.popupEnabled = false;
      view.popup?.close?.();
      disableSearchPopup();

      // Web-map operational layers can finish loading after the view is ready;
      // re-apply the preset as the layer collection settles so the default view
      // isn't left with every layer visible on first load.
      const restyleSettledMap = () => {
        if (restyleTimer) window.clearTimeout(restyleTimer);
        restyleTimer = window.setTimeout(() => {
          if (cancelled) return;
          setStyledMapKey(null);
          void Promise.allSettled([applyPresentationMapStyle(map, view), applyPresentationMarkers(map)]).then(() => {
            if (cancelled) return;
            applyPreset(preset);
            refreshLayers();
            setStyledMapKey(activeArcgisMapKey);
          });
        }, 120);
      };
      const layerCollection = (map as unknown as {
        allLayers?: { on?: (event: string, cb: () => void) => WatchHandle };
      } | undefined)?.allLayers;
      const collectionHandle = layerCollection?.on?.("after-changes", () => {
        if (cancelled) return;
        restyleSettledMap();
      });
      if (collectionHandle) handles.push(collectionHandle);

      applyPreset(preset);
      refreshLayers();
      setStyledMapKey(activeArcgisMapKey);

      [500, 1500, 3500, 7000, 12000, 20000].forEach((delay) => {
        const timeout = window.setTimeout(() => {
          if (cancelled || !shouldRetryLayerHydration(map, supplementalLayers)) return;
          restyleSettledMap();
        }, delay);
        handles.push({ remove: () => window.clearTimeout(timeout) });
      });

      const clickHandle = view.on("click", async (event) => {
        try {
          view.popup?.close?.();
          const hit = await view.hitTest(event);
          const currentMap = getMapElementMap(mapElement);
          const result = selectBestOperationalHit(hit.results, currentMap);
          const enrichedGraphic = result?.graphic ? await enrichGraphicAttributes(result.graphic) : null;
          const summary = enrichedGraphic ? summarizeMasterFeature(enrichedGraphic, undefined, true) : null;
          setSelectedFeature(summary);
          setSelectedGraphic(enrichedGraphic);
          if (summary) {
            setRightOpen(true);
            setRightTab(summary.category === "geography" ? "current" : "detail");
          }
        } catch {
          setSelectedFeature(null);
          setSelectedGraphic(null);
        }
      });
      handles.push(clickHandle);
    }

    function clearReadyListener() {
      if (readyListenerElement && readyListener) {
        readyListenerElement.removeEventListener("arcgisViewReadyChange", readyListener);
      }
      readyListenerElement = null;
      readyListener = null;
    }

    function waitForExpectedMap(attempt = 0) {
      if (cancelled) return;
      const mapElement = mapRef.current;
      if (!mapElement || mapElement.dataset.mapKey !== activeArcgisMapKey) {
        if (attempt < 20) {
          startupTimer = window.setTimeout(() => waitForExpectedMap(attempt + 1), 50);
        }
        return;
      }

      if (mapElement.view) {
        void hydrateMap();
        return;
      }

      clearReadyListener();
      readyListenerElement = mapElement;
      readyListener = () => {
        clearReadyListener();
        void hydrateMap();
      };
      mapElement.addEventListener("arcgisViewReadyChange", readyListener, { once: true } as AddEventListenerOptions);
    }

    waitForExpectedMap();

    return () => {
      cancelled = true;
      if (restyleTimer) window.clearTimeout(restyleTimer);
      if (startupTimer) window.clearTimeout(startupTimer);
      clearReadyListener();
      handles.forEach((handle) => handle.remove?.());
    };
  }, [activeArcgisMapKey, applyPreset, disableSearchPopup, isAuthenticated, preset, refreshLayers, supplementalLayers]);

  useEffect(() => {
    let cancelled = false;

    async function buildRollup() {
      if (!isAuthenticated || !selectedFeature || !selectedGraphic || selectedFeature.category !== "geography") {
        setSpatialRollup(null);
        return;
      }

      const map = getMapElementMap(mapRef.current);
      if (!map) {
        setSpatialRollup({
          status: "error",
          focusTitle: selectedFeature.title,
          focusLayer: selectedFeature.layerTitle,
          checkedLayers: 0,
          matchedLayers: 0,
          featureCount: 0,
          failedLayers: 0,
          categoryRows: [],
          layerRows: [],
          message: "Map layers are not ready for live rollup yet."
        });
        return;
      }

      setSpatialRollup({
        status: "loading",
        focusTitle: selectedFeature.title,
        focusLayer: selectedFeature.layerTitle,
        checkedLayers: 0,
        matchedLayers: 0,
        featureCount: 0,
        failedLayers: 0,
        categoryRows: [],
        layerRows: [],
        message: "Building live layer intersections..."
      });

      try {
        const result = await buildBioMedSpatialRollup(map, selectedGraphic, selectedFeature);
        if (!cancelled) setSpatialRollup(result);
      } catch {
        if (!cancelled) {
          setSpatialRollup({
            status: "error",
            focusTitle: selectedFeature.title,
            focusLayer: selectedFeature.layerTitle,
            checkedLayers: 0,
            matchedLayers: 0,
            featureCount: 0,
            failedLayers: 0,
            categoryRows: [],
            layerRows: [],
            message: "Live rollup failed for this selection."
          });
        }
      }
    }

    void buildRollup();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedFeature, selectedGraphic]);

  function toggleLayer(layerId: string) {
    const map = getMapElementMap(mapRef.current);
    if (!map) return;
    if (layerId === TRADE_AREA_COMBO_LAYER_ID) {
      const tradeAreaLayers = collectArcJurisdictionLayers(map).filter((candidate) => isTradeAreaCompositeLayerTitle(safeLayerTitle(candidate)));
      const nextVisible = !tradeAreaLayers.every((candidate) => candidate.visible);
      tradeAreaLayers.forEach((candidate) => {
        candidate.visible = nextVisible;
      });
      refreshLayers();
      return;
    }
    const layer = collectArcJurisdictionLayers(map).find((candidate) => candidate.id === layerId);
    if (!layer) return;
    layer.visible = !layer.visible;
    refreshLayers();
  }

  async function selectSearchResult(result: FeatureSearchResult) {
    result.layer.visible = true;
    refreshLayers();
    const summary = summarizeMasterFeature(result.graphic, result.layerTitle, true);
    setSelectedFeature(summary);
    setSelectedGraphic(result.graphic);
    setExpandedGroups((current) => ({ ...current, [result.category]: true }));
    setRightOpen(true);
    setRightTab(summary.category === "geography" ? "current" : "detail");

    const view = mapRef.current?.view as MapView | undefined;
    const geometry = result.graphic.geometry as Geometry | null | undefined;
    if (!view || !geometry) return;

    try {
      await view.goTo(zoomTargetForGeometry(geometry), { duration: 650 });
    } catch {
      // Navigation can be interrupted by user pan/zoom; the selected feature still updates.
    }
  }

  async function resetMap() {
    setQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSelectedFeature(null);
    setSelectedGraphic(null);
    setSpatialRollup(null);
    setRightTab("current");
    closeSearchPopup();
    applyPreset(DEFAULT_WORKBENCH_PRESET);

    const view = mapRef.current?.view as MapView | undefined;
    const map = getMapElementMap(mapRef.current);
    if (map) {
      await applyPresentationMapStyle(map, view);
      await applyPresentationMarkers(map);
    }
    if (!view) return;

    try {
      await view.goTo({ center: HOME_CENTER, zoom: ZOOM }, { duration: 650 });
    } catch {
      // Navigation can be interrupted by user pan/zoom; reset still clears layers.
    }
  }

  const authLabel =
    status === "checking"
      ? "Checking ArcGIS"
      : status === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? `Signed in${userId ? ` as ${userId}` : ""}`
          : "Sign in for live map";

  return (
    <section
      className="opsv2"
      data-left-open={leftOpen ? "true" : "false"}
      data-right-open={rightOpen ? "true" : "false"}
      data-testid={testId}
      aria-label={title}
    >
      <header className="opsv2__bar">
        <Link to="/hub" className="opsv2__home-link" data-testid="ops-back-hub">
          <Home aria-hidden="true" size={18} />
          Home
        </Link>
        <Link to="/hub" className="opsv2__brand">
          <RcMark size={30} />
          <strong>{title}</strong>
        </Link>
        <label className="opsv2__preset">
          <span>Quick View</span>
          <select value={preset} onChange={(event) => applyPreset(event.target.value as WorkbenchPreset)}>
            <option value="default-workbench">Default workbench</option>
            <option value="all-layers">All BioMed layers</option>
            <option value="clean-map">Clean map</option>
            {presenterModes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="opsv2__button" onClick={() => void resetMap()}>
          <RotateCcw aria-hidden="true" size={16} />
          Reset map
        </button>
        <div className="opsv2__auth" data-authenticated={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="opsv2__map-shell">
        {createElement(
          "arcgis-map",
          {
            key: activeArcgisMapKey,
            ref: mapRef,
            itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
            basemap: isAuthenticated ? undefined : quietOpsBasemapId(),
            center: CENTER,
            zoom: ZOOM,
            className: "opsv2__arcgis",
            "data-map-key": activeArcgisMapKey,
            "data-testid": "biomed-ops-arcgis",
          },
          [
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-search", {
              key: "search",
              ref: searchRef,
              slot: "top-right",
              popupDisabled: true,
              popupTemplate: null,
              resultGraphicDisabled: true,
            }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
            createElement(
              "arcgis-expand",
              { key: "basemap", slot: "bottom-right", icon: "basemap", label: "Basemap", mode: "floating" },
              createElement("arcgis-basemap-gallery", {}),
            ),
          ],
        )}
        {mapIsInitializing && (
          <div className="opsv2__map-loading" role="status" aria-live="polite">
            <strong>Preparing Workbench map</strong>
            <span>
              {pendingVisibleLayerCount > 0
                ? `Loading ${pendingVisibleLayerCount} visible source layer${pendingVisibleLayerCount === 1 ? "" : "s"} from ArcGIS.`
                : "Applying the clean layer style before showing source geography."}
            </span>
          </div>
        )}
      </div>

      {leftOpen ? (
        <aside className="opsv2__panel opsv2__panel--left" data-has-query={query.trim().length > 0 ? "true" : "false"} aria-label="Layer controls">
          <div className="opsv2__panel-head">
            <Layers aria-hidden="true" size={18} />
            <div>
              <h2>Layer controls</h2>
              <p>{layerCounts.visible} active of {layerCounts.total} layers.</p>
            </div>
            <button type="button" aria-label="Hide layer controls" onClick={() => setLeftOpen(false)}>
              <PanelLeftOpen aria-hidden="true" size={17} />
            </button>
          </div>
          <label className="opsv2__search">
            <Search aria-hidden="true" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search counties, regions, sites" />
            <Filter aria-hidden="true" size={16} />
          </label>
          {pendingLayerCount > 0 && (
            <div className="opsv2__layer-load-note" role="status">
              Loading {pendingLayerCount} source layer{pendingLayerCount === 1 ? "" : "s"} from ArcGIS.
            </div>
          )}
          {query.trim().length > 0 && (
            <section className="opsv2__results" data-testid="ops-search-results" aria-label="Map search results">
              {searchStatus === "idle" && <p>Type at least 2 characters.</p>}
              {searchStatus === "blocked" && <p>Sign in to search live map features.</p>}
              {searchStatus === "searching" && <p>Searching BioMed layers...</p>}
              {searchStatus === "empty" && <p>No matching features found.</p>}
              {searchStatus === "error" && <p>Search failed. Try a more specific term.</p>}
              {searchStatus === "ready" && (
                <>
                  <div className="opsv2__results-head">
                    <strong>{searchResults.length} results</strong>
                    <span>Click to zoom</span>
                  </div>
                  <div className="opsv2__results-list">
                    {searchResults.map((result) => (
                      <button key={result.id} type="button" className="opsv2__result" onClick={() => void selectSearchResult(result)}>
                        <strong>{result.title}</strong>
                        <span>{result.layerTitle}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
          <div className="opsv2__layer-groups">
            {sourceGroups.map((group) => {
              const groupLayers = filteredLayers.filter((layer) => layer.category === group.id);
              if (groupLayers.length === 0) return null;
              const Icon = group.icon;
              const activeCount = groupLayers.filter((layer) => layer.visible).length;
              const isExpanded = expandedGroups[group.id] ?? true;
              return (
                <section key={group.id} className="opsv2__layer-group" data-expanded={isExpanded ? "true" : "false"}>
                  <header>
                    <button
                      type="button"
                      className="opsv2__layer-group-toggle"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedGroups((current) => ({ ...current, [group.id]: !isExpanded }))}
                    >
                      <Icon aria-hidden="true" size={17} />
                      <span>
                        <strong>{group.label}</strong>
                        <small>{group.description}</small>
                      </span>
                      <b>{activeCount}/{groupLayers.length}</b>
                      <ChevronDown aria-hidden="true" className="opsv2__group-chevron" size={18} />
                    </button>
                  </header>
                  {isExpanded && (
                    <div className="opsv2__layer-list">
                      {groupLayers.map((layer) => {
                        const legendMarker = legendMarkerForLayer(layer.title, layer.category);
                        return (
                          <button
                            key={layer.id}
                            type="button"
                            className="opsv2__layer"
                            aria-pressed={layer.visible}
                            disabled={!isAuthenticated}
                            onClick={() => toggleLayer(layer.id)}
                          >
                            <span className="opsv2__layer-icon-rail">
                              <span
                                className="opsv2__legend-marker"
                                data-kind={legendMarker.kind}
                                data-testid="ops-layer-legend-marker"
                                title={legendMarker.label}
                              >
                                <img src={legendMarker.url} alt="" aria-hidden="true" />
                              </span>
                              <em className="opsv2__layer-status">{layer.visible ? "On" : "Off"}</em>
                            </span>
                            <span>
                              <span className="opsv2__layer-title-row">
                                <strong>{layer.title}</strong>
                              </span>
                              <small>{layer.summary}</small>
                              {layer.category === "hospitals" && (
                                <span className="opsv2__tier-legend" aria-label="Hospital tiers">
                                  <span className="opsv2__tier" data-tier="1">
                                    <i aria-hidden="true" />
                                    Tier 1
                                  </span>
                                  <span className="opsv2__tier" data-tier="2">
                                    <i aria-hidden="true" />
                                    Tier 2
                                  </span>
                                  <span className="opsv2__tier" data-tier="3">
                                    <i aria-hidden="true" />
                                    Tier 3
                                  </span>
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </aside>
      ) : (
        <button type="button" className="opsv2__reopen opsv2__reopen--left" onClick={() => setLeftOpen(true)}>
          <PanelRightOpen aria-hidden="true" size={16} />
          Layers
        </button>
      )}

      {rightOpen ? (
        <aside className="opsv2__panel opsv2__panel--right" aria-label={`${resultLabel} results`}>
          <div className="opsv2__panel-head">
            <MapPinned aria-hidden="true" size={18} />
            <div>
              <p className="opsv2__panel-kicker">Results</p>
              <h2>{currentTitle}</h2>
              <p>{currentSubtitle}</p>
            </div>
            <button type="button" aria-label={`Hide ${resultLabel.toLowerCase()} results`} onClick={() => setRightOpen(false)}>
              <PanelRightOpen aria-hidden="true" size={17} />
            </button>
          </div>
          <div className="opsv2__right-tabs" role="tablist" aria-label={`${resultLabel} result views`}>
            <button
              type="button"
              className={rightTab === "current" ? "is-active" : ""}
              onClick={() => setRightTab("current")}
              role="tab"
              aria-selected={rightTab === "current"}
            >
              <SlidersHorizontal aria-hidden="true" size={17} />
              Current
            </button>
            <button
              type="button"
              className={rightTab === "detail" ? "is-active" : ""}
              onClick={() => setRightTab("detail")}
              role="tab"
              aria-selected={rightTab === "detail"}
            >
              <Info aria-hidden="true" size={17} />
              Detail
            </button>
            <button
              type="button"
              className={rightTab === "list" ? "is-active" : ""}
              onClick={() => setRightTab("list")}
              role="tab"
              aria-selected={rightTab === "list"}
            >
              <List aria-hidden="true" size={17} />
              List
            </button>
          </div>

          <div className="opsv2__right-body">
            {rightTab === "current" && (
              <>
                <SpatialRollupPanel selectedFeature={selectedFeature} rollup={spatialRollup} />

                <section className="opsv2__subtotal-card">
                  <header>
                    <span>Layer group subtotals</span>
                    <b>{groupSummaries.length}</b>
                  </header>
                  <div className="opsv2__subtotal-list">
                    {groupSummaries.map((group) => (
                      <article key={group.id}>
                        <div>
                          <strong>{group.label}</strong>
                          <span>{group.description}</span>
                        </div>
                        <b>{group.active}/{group.total}</b>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}

            {rightTab === "detail" && (
              <section
                className={`opsv2__selected-card${selectedFeature?.category === "hospitals" ? " opsv2__selected-card--hospital" : ""}`}
                data-testid={selectedFeature?.category === "hospitals" ? "ops-hospital-feature-card" : "ops-selected-feature-card"}
              >
                {selectedFeature ? (
                  selectedFeature.category === "hospitals" ? (
                    <HospitalFeatureCard feature={selectedFeature} />
                  ) : (
                    <FeatureInfoCard feature={selectedFeature} />
                  )
                ) : (
                  <p className="opsv2__empty">No feature selected.</p>
                )}
              </section>
            )}

            {rightTab === "list" && (
              <>
                <section className="opsv2__subtotal-card">
                  <header>
                    <span>Active layer stack</span>
                    <b>{activeLayers.length}</b>
                  </header>
                  <div className="opsv2__subtotal-list">
                    {(activeLayers.length ? activeLayers : inactiveLayers.slice(0, 8)).map((layer) => (
                      <article key={layer.id}>
                        <div>
                          <strong>{layer.title}</strong>
                          <span>{layer.summary}</span>
                        </div>
                        <b>{layer.visible ? "On" : "Off"}</b>
                      </article>
                    ))}
                  </div>
                </section>

                {(query.trim() || searchResults.length > 0) && (
                  <section className="opsv2__subtotal-card">
                    <header>
                      <span>Search results</span>
                      <b>{searchResults.length}</b>
                    </header>
                    <div className="opsv2__subtotal-list">
                      {searchResults.length ? (
                        searchResults.map((result) => (
                          <article key={result.id}>
                            <div>
                              <strong>{result.title}</strong>
                              <span>{result.layerTitle}</span>
                            </div>
                            <button type="button" onClick={() => void selectSearchResult(result)}>
                              Zoom
                            </button>
                          </article>
                        ))
                      ) : (
                        <p className="opsv2__empty">No feature results for this search.</p>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </aside>
      ) : (
        <button type="button" className="opsv2__reopen opsv2__reopen--right" onClick={() => setRightOpen(true)}>
          <PanelLeftOpen aria-hidden="true" size={16} />
          Feature
        </button>
      )}

      {!isAuthenticated && (
        <div className="opsv2__signin" role="dialog" aria-label="Sign in required">
          <ShieldCheck aria-hidden="true" size={24} />
          <h2>{signInHeading}</h2>
          <p>{signInCopy}</p>
          <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
            Sign in to ArcGIS
          </button>
          {error && <small>{error}</small>}
        </div>
      )}
    </section>
  );
}
