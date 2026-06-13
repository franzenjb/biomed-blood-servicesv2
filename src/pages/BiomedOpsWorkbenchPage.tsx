import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Extent from "@arcgis/core/geometry/Extent";
import type Point from "@arcgis/core/geometry/Point";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Field from "@arcgis/core/layers/support/Field";
import type MapView from "@arcgis/core/views/MapView";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Filter,
  HelpCircle,
  Home,
  Info,
  List,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import RcMark from "../components/RcMark";
import RcAppBar from "../components/RcAppBar";
import RegionTour, { type TourSlideContext, type TourMobileStats } from "../maps/RegionTour";
import LayerList from "../components/mapshell/LayerList";
import "../components/mapshell/mapshell.css";
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
import { addArcgisPortalLayers, addChapterViewBiomedGroup } from "../utils/arcgisMasterLayers";
import {
  LEVELS,
  EMPTY_SELECTION,
  type LevelId,
  type Selection as GeoSelection,
  buildWhereForLayer,
  drawSelectionOutline,
  layerHasAnyLevelField,
  loadLevelOptions,
  computeSelectionZoomExtent,
  levelLabel,
  levelAllLabel,
} from "../utils/biomedGeographyFilter";
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
import { classifyMasterLayer, summarizeMasterFeature, type MasterFeatureSummary, type MasterLayerCategory } from "../utils/masterMapFeatures";
import "./BiomedOpsWorkbenchPage.css";

type WorkbenchPreset = BioMedPresenterModeId | "default-workbench" | "all-layers" | "clean-map";
type WatchHandle = { remove?: () => void };
type RightTab = "current" | "detail" | "list";
type LeftTab = "filter" | "geography";
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
  /** Initial + Home/Reset map view. Defaults to the national CONUS framing. */
  homeCenter?: [number, number];
  homeZoom?: number;
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
        <p className="opsv2__eyebrow">Trade-Area ZIP</p>
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
        <p className="opsv2__eyebrow">Selected Hospital</p>
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

function WorkbenchMapLoader({ pendingVisibleLayerCount }: { pendingVisibleLayerCount: number }) {
  return (
    <div className="opsv2__map-loading" role="status" aria-live="polite">
      <svg className="opsv2__loading-scene" viewBox="0 0 360 180" aria-hidden="true">
        <defs>
          <filter id="opsv2-loader-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#111827" floodOpacity="0.18" />
          </filter>
        </defs>
        <path className="opsv2__loading-road" d="M58 124 C118 86 178 88 232 108 S302 104 328 68" />
        <g className="opsv2__loading-node opsv2__loading-node--source" transform="translate(38 94)">
          <circle cx="24" cy="24" r="23" />
          <path d="M10 35h28V19L24 10 10 19z" />
          <path d="M15 35V23h8v12M27 35V23h8v12" />
        </g>
        <g className="opsv2__loading-node opsv2__loading-node--hospital" transform="translate(292 38)">
          <circle cx="24" cy="24" r="23" />
          <path d="M11 36h27V15H11z" />
          <path d="M21 19h7v6h6v7h-6v6h-7v-6h-6v-7h6z" />
        </g>
        <g className="opsv2__loading-van" filter="url(#opsv2-loader-shadow)">
          <rect className="opsv2__loading-van-body" x="0" y="0" width="64" height="34" rx="6" />
          <path className="opsv2__loading-van-cab" d="M44 8h13l9 10v16H44z" />
          <path className="opsv2__loading-van-window" d="M49 12h8l5 7H49z" />
          <path className="opsv2__loading-cross-h" d="M17 12h14v8H17z" />
          <path className="opsv2__loading-cross-v" d="M20 9h8v14h-8z" />
          <circle className="opsv2__loading-wheel" cx="16" cy="36" r="7" />
          <circle className="opsv2__loading-wheel" cx="51" cy="36" r="7" />
          <circle className="opsv2__loading-hub" cx="16" cy="36" r="3" />
          <circle className="opsv2__loading-hub" cx="51" cy="36" r="3" />
        </g>
      </svg>
      <strong>Preparing Workbench map</strong>
      <span>
        {pendingVisibleLayerCount > 0
          ? `Routing ${pendingVisibleLayerCount} source layer${pendingVisibleLayerCount === 1 ? "" : "s"} from ArcGIS…`
          : "Loading the BioMed operating map…"}
      </span>
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
        <p className="opsv2__eyebrow">Selected Feature</p>
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

const POINT_ICON_CATEGORIES = new Set(["sites", "hospitals", "manufacturing"]);

function isPointIconLayer(layer: Layer) {
  const title = safeLayerTitle(layer);
  if (POINT_ICON_CATEGORIES.has(classifyMasterLayer(title))) return true;
  return (layer as FeatureLayer | undefined)?.geometryType === "point";
}

function isZipCollectionLayer(layer: Layer) {
  const title = safeLayerTitle(layer);
  const normalized = title.toLowerCase().replace(/[_-]+/g, " ");
  return (
    isTradeAreaZipLayerTitle(title) ||
    isTradeAreaLayerTitle(title) ||
    isSupplementalBioMedSourceLayerTitle(title) ||
    normalized.includes("fy25 data") ||
    normalized.includes("collection operations")
  );
}

// Raise ZIP / collection polygons to the top of the polygon stack, then lift the
// point/icon layers back above them so markers stay on top and clickable.
function raiseZipCollectionAbovePolygons(map?: ReturnType<typeof getMapElementMap>) {
  const top = map?.layers as { toArray?: () => Layer[]; length?: number; reorder?: (layer: Layer, index: number) => unknown } | undefined;
  if (!top?.toArray || !top.reorder) return;
  const lastIndex = () => (typeof top.length === "number" ? top.length - 1 : 0);
  top.toArray().filter(isZipCollectionLayer).forEach((layer) => top.reorder?.(layer, lastIndex()));
  top.toArray().filter(isPointIconLayer).forEach((layer) => top.reorder?.(layer, lastIndex()));
}

type CoincidentHit = {
  key: string;
  graphic: Graphic;
  title: string;
  layerTitle: string;
  category: MasterLayerCategory;
  isPoint: boolean;
};

// All distinct operational features under the click pixel, de-duped by layer + object id
// and ordered the same way as the single-best pick (points first, then by priority).
function collectOperationalHits(results: unknown[], map?: ReturnType<typeof getMapElementMap>): CoincidentHit[] {
  const seen = new Set<string>();
  const ranked: Array<{ hit: CoincidentHit; priority: number; index: number }> = [];
  results.forEach((candidate, index) => {
    const graphic = (candidate as { graphic?: Graphic })?.graphic;
    if (!graphic || !isOperationalHitGraphic(graphic, map)) return;
    const layer = hitGraphicSourceLayer(graphic) as FeatureLayer | undefined;
    const objectId = layer?.objectIdField ? graphic.attributes?.[layer.objectIdField] : undefined;
    const key = `${layer?.id ?? "layer"}::${objectId ?? `idx-${index}`}`;
    if (seen.has(key)) return;
    seen.add(key);
    const layerTitle = hitGraphicLayerTitle(graphic);
    const summary = summarizeMasterFeature(graphic, layerTitle);
    ranked.push({
      hit: {
        key,
        graphic,
        title: featureDisplayTitle(summary) || layerTitle || "Feature",
        layerTitle: summary.layerTitle || layerTitle,
        category: summary.category,
        isPoint: layer?.geometryType === "point",
      },
      priority: hitGraphicPriority(graphic),
      index,
    });
  });
  return ranked.sort((a, b) => b.priority - a.priority || a.index - b.index).map((entry) => entry.hit);
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
        <p className="opsv2__eyebrow">Live Geography Rollup</p>
        <h3>Select a boundary</h3>
        <p className="opsv2__rollup-note">Click a BioMed division, region, district, chapter, or county to compute live intersections across the source layers.</p>
      </section>
    );
  }

  if (selectedFeature.category !== "geography") {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live Geography Rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <p className="opsv2__rollup-note">Select a geography boundary to roll up facilities, operations, and jurisdiction layers.</p>
      </section>
    );
  }

  if (!rollup || rollup.status === "loading") {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live Geography Rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <p className="opsv2__rollup-note">Building live layer intersections...</p>
      </section>
    );
  }

  if (rollup.status === "empty" || rollup.status === "error") {
    return (
      <section className="opsv2__rollup-card">
        <p className="opsv2__eyebrow">Live Geography Rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <p className="opsv2__rollup-note">{rollup.message ?? "No matching source layers were found inside this boundary."}</p>
      </section>
    );
  }

  return (
    <section className="opsv2__rollup-card">
      <header className="opsv2__rollup-head">
        <p className="opsv2__eyebrow">Live Geography Rollup</p>
        <h3>{featureDisplayTitle(selectedFeature)}</h3>
        <span>{rollup.message}</span>
      </header>

      <div className="opsv2__rollup-section">
        <header>
          <span>Category Totals</span>
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
          <span>Layer Matches</span>
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

function WorkbenchHelpModal({ title, onClose }: { title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mailSubject = encodeURIComponent(`${title} — question/suggestion`);

  return (
    <div className="jd__modal" role="dialog" aria-modal="true" aria-label={`About ${title}`} onClick={onClose}>
      <div className="jd__modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="jd__modal-head">
          <span className="jd__modal-mark"><RcMark size={22} /></span>
          <p className="jd__modal-eyebrow">{title}</p>
          <button type="button" className="jd__modal-x" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="jd__modal-body">
          <p className="jd__modal-meta">Live Red Cross ArcGIS · FY25 reporting</p>
          <h2 className="jd__modal-title">About {title}</h2>
          <p className="jd__modal-lead">
            An internal BioMed operating map — sign in with your Red Cross ArcGIS account to load the live private
            layers, then explore sites, geography, and FY25 collection data.
          </p>

          <div className="jd__modal-callout">
            <RcMark size={30} />
            <div>
              <strong>BioMed Operating Picture</strong>
              <span>Sites, boundaries, and live geography rollups in one place.</span>
            </div>
          </div>

          <p>
            The map and counts read live from the published Red Cross ArcGIS web map. When the source layers update,
            this view updates with them — there is nothing to refresh by hand.
          </p>

          <h3>How to use it</h3>
          <ul>
            <li><b>Sign in</b> — top-right, with your Red Cross ArcGIS account, to load the live web map.</li>
            <li><b>Quick View</b> — preset layer sets: Default workbench, All BioMed layers, Clean map, or a presenter story.</li>
            <li><b>Layer controls</b> — the left rail toggles individual layers; it collapses to free up the map.</li>
            <li><b>Click anything</b> — sites and boundaries open a clean detail card on the right (no raw ArcGIS popups).</li>
            <li><b>Live Geography Rollup</b> — click a Division, Region, District, Chapter, or County to total the layers inside it.</li>
            <li><b>Search</b> — find counties, regions, and sites, then click a result to zoom.</li>
          </ul>

          <div className="jd__modal-cards">
            <div className="jd__modal-stat"><span>Quick View</span><strong>Presets</strong></div>
            <div className="jd__modal-stat"><span>Layers</span><strong>Toggle</strong></div>
            <div className="jd__modal-stat"><span>Rollup</span><strong>Live</strong></div>
            <div className="jd__modal-stat"><span>Popups</span><strong>Clean cards</strong></div>
          </div>

          <h3>Map controls</h3>
          <p>
            Home and Zoom sit top-left, the Basemap gallery bottom-right. <b>Reset map</b> returns to the default view
            and clears the current selection.
          </p>

          <h3>Definitions</h3>
          <p>Geography is always shown by name — Chapter, Region, Division — never internal codes.</p>

          <p className="jd__modal-foot">
            <span className="jd__modal-foot-q">Question or suggestions?</span>{" "}
            <a href={`mailto:jeff.franzen2@redcross.org?subject=${mailSubject}`}>Email Jeff Franzen</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BiomedOpsWorkbenchPage({
  title = "BioMed Atlas",
  resultLabel = "Workbench",
  supplementalLayers = biomedWorkbenchSupplementalLayers,
  signInHeading = "Sign in to inspect live workbench layers",
  signInCopy = "Layer inventory is visible. Counts, toggles, and selected features require the private Red Cross ArcGIS web map.",
  testId = "biomed-ops-workbench",
  homeCenter = HOME_CENTER,
  homeZoom = ZOOM
}: BiomedOpsWorkbenchPageProps = {}) {
  useArcgisComponents();
  const homeCenterStr = homeCenter.join(",");
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const searchRef = useRef<ArcgisSearchElement | null>(null);
  const searchRunRef = useRef(0);
  // Layer-collection size at last preset apply. The after-changes handler re-applies
  // the preset only when this changes (layers added/removed) — NOT on a reorder or
  // visibility toggle, which would otherwise stomp manual toggles and re-fire on our
  // own z-order reordering.
  const layerCountRef = useRef(0);
  const [preset, setPreset] = useState<WorkbenchPreset>(DEFAULT_WORKBENCH_PRESET);
  // Track the live preset without making it a hydrate dependency: changing the
  // Quick View must only re-toggle layer visibility, never re-run the whole map
  // hydrate (re-add layers + re-style + re-goTo), which flickered the map and
  // snapped it back to an empty "clean" state.
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const [layers, setLayers] = useState<BioMedLayerSnapshot[]>(() =>
    previewWorkbenchLayerSnapshots(supplementalLayers).map((layer) => ({
      ...layer,
      visible: shouldShowLayerForPreset(layer, DEFAULT_WORKBENCH_PRESET),
    })),
  );
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResults, setSearchResults] = useState<FeatureSearchResult[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sourceGroups.map((group) => [group.id, true])),
  );
  const [selectedFeature, setSelectedFeature] = useState<MasterFeatureSummary | null>(null);
  const [selectedGraphic, setSelectedGraphic] = useState<Graphic | null>(null);
  const [coincidentHits, setCoincidentHits] = useState<CoincidentHit[]>([]);

  // Enrich a single graphic and show it in the detail card. Shared by map clicks and
  // the coincident-feature picker so both produce the same selected-feature readout.
  const applyGraphicSelection = useCallback(async (graphic: Graphic) => {
    const enriched = await enrichGraphicAttributes(graphic);
    const summary = summarizeMasterFeature(enriched, undefined, true);
    setSelectedFeature(summary);
    setSelectedGraphic(enriched);
    if (summary) {
      setRightOpen(true);
      setRightTab(summary.category === "geography" ? "current" : "detail");
    }
  }, []);

  const selectCoincidentHit = useCallback(
    (hit: CoincidentHit) => {
      void applyGraphicSelection(hit.graphic);
    },
    [applyGraphicSelection],
  );
  const [spatialRollup, setSpatialRollup] = useState<BioMedSpatialRollupSummary | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("current");
  // Geography first: it now carries the search box (top) + the drill-down.
  const [leftTab, setLeftTab] = useState<LeftTab>("geography");
  const [mapReady, setMapReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourRegion, setTourRegion] = useState<string | null>(null);
  const [tourFlying, setTourFlying] = useState(false);

  // Geography drill-down (division → region → district), ported from the
  // Jurisdiction Dashboard so the Workbench offers the same Filter by Geography.
  const [geoSelection, setGeoSelection] = useState<GeoSelection>(EMPTY_SELECTION);
  const [geoOptions, setGeoOptions] = useState<Record<LevelId, string[]>>({ division: [], region: [], district: [] });
  const geoSourceLayerRef = useRef<FeatureLayer | null>(null);
  const geoChosenFieldRef = useRef<Partial<Record<LevelId, string>>>({});
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  // Deep-link: /ops?tour=1 opens the guided region tour straight away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("tour")) {
      setTourActive(true);
      setLeftOpen(false);
      setRightOpen(false);
    }
  }, []);

  // Show the loader only while the authenticated map hydrates; fail open after 8s
  // so a slow/odd ArcGIS init can never leave the loader stuck on screen.
  useEffect(() => {
    if (!isAuthenticated) {
      setMapReady(true);
      return;
    }
    setMapReady(false);
    const failOpen = window.setTimeout(() => setMapReady(true), 8000);
    return () => window.clearTimeout(failOpen);
  }, [isAuthenticated]);

  // Keep ZIP / collection polygons at the top of the polygon stack (under the point
  // icons) whenever the map hydrates OR layer visibility changes — so a layer toggled on
  // after load is re-raised above every other polygon. Safe to re-run on `layers` now
  // that the after-changes handler is gated to add/remove only (a reorder keeps the same
  // count, so it no longer stomps toggles).
  useEffect(() => {
    if (!mapReady) return;
    raiseZipCollectionAbovePolygons(getMapElementMap(mapRef.current));
  }, [mapReady, layers]);

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
    if (preset === "default-workbench") return "Default Workbench";
    if (preset === "all-layers") return "All BioMed Layers";
    if (preset === "clean-map") return "Clean Map";
    return presenterModes.find((mode) => mode.id === preset)?.label ?? "Custom View";
  }, [preset]);

  const currentTitle = query.trim() ? `Search: ${query.trim()}` : selectedFeature ? featureDisplayTitle(selectedFeature) : "Current filter";
  const currentSubtitle = query.trim()
    ? `${searchResults.length} feature result${searchResults.length === 1 ? "" : "s"}`
    : presetLabel;

  const refreshLayers = useCallback(() => {
    setLayers(buildWorkbenchLayerSnapshots(getMapElementMap(mapRef.current), supplementalLayers));
  }, [supplementalLayers]);

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
        setLayers((current) => current.map((layer) => ({ ...layer, visible: shouldShowLayerForPreset(layer, nextPreset) })));
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
    [refreshLayers, supplementalLayers],
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
    const handles: WatchHandle[] = [];

    async function hydrateMap() {
      if (!isAuthenticated) {
        setLayers(previewWorkbenchLayerSnapshots(supplementalLayers).map((layer) => ({ ...layer, visible: shouldShowLayerForPreset(layer, preset) })));
        setSelectedFeature(null);
        setSelectedGraphic(null);
        setSpatialRollup(null);
        return;
      }

      const mapElement = mapRef.current;
      const view = mapElement?.view as (MapView & { popupEnabled?: boolean; popup?: { close?: () => void } }) | undefined;
      if (!mapElement || !view) return;

      // The view is already ready here (this runs on arcgisViewReadyChange / once
      // mapElement.view exists). Do NOT block on view.when(): with this 18-layer
      // web map it can stall for 8s+, the loader fails open, and the surface is
      // revealed unpainted (blank). Race when() against a short cap so one hung
      // layer load can never gate the reveal.
      await Promise.race([
        Promise.resolve(view.when?.()).catch(() => undefined),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);
      if (cancelled) return;

      const map = getMapElementMap(mapElement);
      await addArcgisPortalLayers(map, supplementalLayers);
      if (cancelled) return;

      hideBasemapUtilityLayers(map);
      await applyPresentationMapStyle(map, view);
      await applyPresentationMarkers(map);
      if (cancelled) return;

      // Force the first frame. An authenticated web-map view can finish loading
      // without ever painting until a camera change nudges it — the same reason
      // "Reset map" makes the blank screen appear. goTo guarantees a draw; only
      // then reveal the surface so the loader never fades onto a blank map.
      try {
        await view.goTo({ center: homeCenter, zoom: homeZoom }, { animate: false });
      } catch {
        // interrupted by user interaction; the view still paints
      }
      if (cancelled) return;
      setMapReady(true); // painted surface is live; loader fades out

      // Lift the chapter-view BIOMED layers in as a hidden group (non-blocking —
      // they default off, so this never delays the reveal). Disable their popups
      // and refresh the layer panel once they land.
      void addChapterViewBiomedGroup(map).then(({ added }) => {
        if (cancelled || added.length === 0) return;
        collectArcJurisdictionLayers(map).forEach((layer) => {
          if ("popupEnabled" in layer) (layer as Layer & { popupEnabled?: boolean }).popupEnabled = false;
          if ("popupTemplate" in layer) (layer as Layer & { popupTemplate?: unknown }).popupTemplate = null;
        });
        refreshLayers();
      });

      // Discover the geography source layer + seed the division dropdown so the
      // Geography tab is ready (non-blocking).
      if (discoverGeoSourceLayer(map)) void refreshGeoOptions(EMPTY_SELECTION);

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
      const layerCollection = (map as unknown as {
        allLayers?: { on?: (event: string, cb: () => void) => WatchHandle; length?: number };
      } | undefined)?.allLayers;
      const layerCount = () => (typeof layerCollection?.length === "number" ? layerCollection.length : 0);
      const collectionHandle = layerCollection?.on?.("after-changes", () => {
        if (cancelled) return;
        // Only re-apply the preset when layers are ADDED/REMOVED (the web map settling).
        // A reorder or visibility toggle keeps the same count — re-applying then would
        // stomp the user's toggle and re-fire on our own z-order reorder.
        const count = layerCount();
        if (count === layerCountRef.current) return;
        layerCountRef.current = count;
        applyPreset(presetRef.current);
        raiseZipCollectionAbovePolygons(getMapElementMap(mapRef.current));
      });
      if (collectionHandle) handles.push(collectionHandle);

      layerCountRef.current = layerCount();
      applyPreset(presetRef.current);
      refreshLayers();

      const clickHandle = view.on("click", async (event) => {
        try {
          view.popup?.close?.();
          const hit = await view.hitTest(event);
          const currentMap = getMapElementMap(mapElement);
          const hits = collectOperationalHits(hit.results, currentMap);
          // Only stacked POINT icons trigger the picker — a single point always sits over
          // county/ZIP polygons, and priority already resolves point-over-polygon.
          const pointHits = hits.filter((entry) => entry.isPoint);
          if (pointHits.length > 1) {
            setCoincidentHits(pointHits);
            setSelectedFeature(null);
            setSelectedGraphic(null);
            setRightOpen(true);
            setRightTab("detail");
          } else {
            setCoincidentHits([]);
            if (hits[0]) {
              await applyGraphicSelection(hits[0].graphic);
            } else {
              setSelectedFeature(null);
              setSelectedGraphic(null);
            }
          }
        } catch {
          setCoincidentHits([]);
          setSelectedFeature(null);
          setSelectedGraphic(null);
        }
      });
      handles.push(clickHandle);
    }

    const mapElement = mapRef.current;
    if (mapElement?.view) void hydrateMap();
    else mapElement?.addEventListener("arcgisViewReadyChange", hydrateMap, { once: true } as AddEventListenerOptions);

    return () => {
      cancelled = true;
      handles.forEach((handle) => handle.remove?.());
    };
    // `preset` intentionally excluded: Quick View changes go through applyPreset
    // (visibility only) and presetRef, not a full map re-hydrate.
  }, [applyPreset, disableSearchPopup, isAuthenticated, refreshLayers, supplementalLayers]);

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
    if (layer.visible) revealParentGroups(layer);
    refreshLayers();
  }

  // A child of a hidden GroupLayer renders nothing — turning a layer on must
  // also reveal its ancestors (the lifted BIOMED group ships hidden).
  function revealParentGroups(layer: Layer) {
    let parent = (layer as Layer & { parent?: unknown }).parent as (Layer & { parent?: unknown }) | undefined;
    while (parent && typeof parent === "object" && "visible" in parent && (parent as { type?: string }).type === "group") {
      (parent as Layer).visible = true;
      parent = parent.parent as (Layer & { parent?: unknown }) | undefined;
    }
  }

  function setLayersVisible(targetIds: Set<string>, visible: boolean) {
    const map = getMapElementMap(mapRef.current);
    if (!map) return;
    const all = collectArcJurisdictionLayers(map);
    targetIds.forEach((id) => {
      if (id === TRADE_AREA_COMBO_LAYER_ID) {
        all
          .filter((candidate) => isTradeAreaCompositeLayerTitle(safeLayerTitle(candidate)))
          .forEach((candidate) => {
            candidate.visible = visible;
          });
        return;
      }
      const layer = all.find((candidate) => candidate.id === id);
      if (layer) {
        layer.visible = visible;
        if (visible) revealParentGroups(layer);
      }
    });
    refreshLayers();
  }

  function toggleGroupLayers(groupId: string) {
    const groupLayers = layers.filter((layer) => layer.category === groupId);
    if (groupLayers.length === 0) return;
    const allOn = groupLayers.every((layer) => layer.visible);
    setLayersVisible(new Set(groupLayers.map((layer) => layer.id)), !allOn);
  }

  function setAllLayersVisible(visible: boolean) {
    setLayersVisible(new Set(layers.map((layer) => layer.id)), visible);
  }

  async function selectSearchResult(result: FeatureSearchResult) {
    result.layer.visible = true;
    refreshLayers();
    const summary = summarizeMasterFeature(result.graphic, result.layerTitle, true);
    setCoincidentHits([]);
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
    setCoincidentHits([]);
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
      await view.goTo({ center: homeCenter, zoom: homeZoom }, { duration: 650 });
    } catch {
      // Navigation can be interrupted by user pan/zoom; reset still clears layers.
    }
  }

  const openTour = useCallback(() => {
    setTourActive(true);
    setLeftOpen(false);
    setRightOpen(false);
  }, []);

  // ---- Geography drill-down (division → region → district) --------------
  // Pick the source layer that carries jurisdiction NAME fields (prefer the
  // FY25 / ZIP data layer with the widest coverage), then cache it.
  const discoverGeoSourceLayer = useCallback((map?: ReturnType<typeof getMapElementMap>) => {
    if (!map) return null;
    const featureLayers = collectArcJurisdictionLayers(map).filter(isSearchableFeatureLayer) as FeatureLayer[];
    const byTitle = (token: string) =>
      featureLayers.find((layer) => safeLayerTitle(layer).toLowerCase().includes(token) && layerHasAnyLevelField(layer));
    const source =
      byTitle("fy25") ||
      byTitle("zip") ||
      featureLayers.find((layer) => layerHasAnyLevelField(layer)) ||
      null;
    geoSourceLayerRef.current = source;
    return source;
  }, []);

  const refreshGeoOptions = useCallback(async (sel: GeoSelection) => {
    const layer = geoSourceLayerRef.current;
    const chosen = geoChosenFieldRef.current;
    const next: Record<LevelId, string[]> = { division: [], region: [], district: [] };
    const div = await loadLevelOptions(layer, "division", EMPTY_SELECTION, chosen);
    next.division = div.values;
    if (div.field) chosen.division = div.field;
    if (sel.division) {
      const reg = await loadLevelOptions(layer, "region", { ...sel, region: "", district: "" }, chosen);
      next.region = reg.values;
      if (reg.field) chosen.region = reg.field;
    }
    if (sel.region) {
      const dist = await loadLevelOptions(layer, "district", { ...sel, district: "" }, chosen);
      next.district = dist.values;
      if (dist.field) chosen.district = dist.field;
    }
    setGeoOptions(next);
  }, []);

  // Apply the selection to the live map: filter queryable layers by their own
  // jurisdiction fields, then zoom to the selected geography's live point icons.
  const geoOutlineRef = useRef<Graphic | null>(null);

  const applyGeographyToMap = useCallback(async (sel: GeoSelection) => {
    const map = getMapElementMap(mapRef.current);
    const view = mapRef.current?.view as MapView | undefined;
    if (!map) return;

    collectArcJurisdictionLayers(map)
      .filter(isSearchableFeatureLayer)
      .forEach((layer) => {
        const fl = layer as FeatureLayer;
        const where = buildWhereForLayer(fl, sel, geoChosenFieldRef.current);
        if (where !== "1=1" && !layerHasAnyLevelField(fl)) return;
        try {
          fl.definitionExpression = where;
        } catch {
          // some sublayers reject definitionExpression; ignore
        }
      });

    // Same red selection outline as the dashboards (shared implementation).
    if (view) {
      geoOutlineRef.current = (await drawSelectionOutline(
        map,
        view,
        sel,
        geoChosenFieldRef.current,
        geoOutlineRef.current,
      )) as Graphic | null;
    }

    const hasSelection = LEVELS.some((level) => sel[level]);
    if (!view) return;
    if (!hasSelection) {
      try {
        await view.goTo({ center: homeCenter, zoom: homeZoom }, { duration: 650 });
      } catch { /* interrupted */ }
      return;
    }
    try {
      const iconExtent = await computeSelectionZoomExtent(map, sel, geoChosenFieldRef.current);
      if (iconExtent) await view.goTo(iconExtent, { duration: 650 });
    } catch {
      // navigation can be interrupted; the filter still applies
    }
  }, []);

  const onGeoSelect = useCallback(
    (level: LevelId, value: string) => {
      setGeoSelection((current) => {
        const next: GeoSelection = { ...current, [level]: value };
        // Clear descendants when a parent changes.
        if (level === "division") { next.region = ""; next.district = ""; }
        if (level === "region") next.district = "";
        void refreshGeoOptions(next);
        void applyGeographyToMap(next);
        return next;
      });
    },
    [refreshGeoOptions, applyGeographyToMap],
  );

  const resetGeography = useCallback(() => {
    setGeoSelection(EMPTY_SELECTION);
    void refreshGeoOptions(EMPTY_SELECTION);
    void applyGeographyToMap(EMPTY_SELECTION);
  }, [refreshGeoOptions, applyGeographyToMap]);

  const siteHighlightRef = useRef<Graphic | null>(null);
  const tourOutlineRef = useRef<Graphic | null>(null);
  const clearSiteHighlight = useCallback(() => {
    const view = mapRef.current?.view as MapView | undefined;
    if (view && siteHighlightRef.current) view.graphics.remove(siteHighlightRef.current);
    siteHighlightRef.current = null;
  }, []);

  // The lifted services use ARC region names ("Indiana Region", "Alabama and
  // Mississippi Region") while the tour uses trade-area names ("Indiana",
  // "Alabama Mississippi"). Resolve by token-subset match: every tour word must
  // appear in the service name; fewest extra words wins. The resolved name also
  // feeds live drives/units KPIs onto the Mobile Story slide.
  const tourServiceRegionRef = useRef<Record<string, string | null>>({});
  const [tourStats, setTourStats] = useState<TourMobileStats | null>(null);
  const tourStatsCache = useRef<Record<string, TourMobileStats | null>>({});
  // Live mirror of the active tour region so async filter work can detect that
  // the user switched regions mid-flight and drop its stale result.
  const tourRegionLiveRef = useRef<string | null>(null);

  const findLiftedBiomedGroup = useCallback(() => {
    const map = getMapElementMap(mapRef.current);
    return ((map?.layers?.toArray?.() ?? []) as Layer[]).find(
      (layer) => layer.type === "group" && (layer.title ?? "").trim().toUpperCase() === "BIOMED",
    ) as (Layer & { layers?: { toArray?: () => Layer[] } }) | undefined;
  }, []);

  // Region boundary polygon (from the lifted "by Region" service) — used to
  // spatially clip the drive-point dot layers, which carry no Region field.
  const tourRegionGeomCache = useRef<Record<string, Geometry | null>>({});

  const getTourRegionGeometry = useCallback(async (region: string) => {
    if (region in tourRegionGeomCache.current) return tourRegionGeomCache.current[region];
    let geometry: Geometry | null = null;
    try {
      const group = findLiftedBiomedGroup();
      const sub = (group?.layers?.toArray?.() ?? []).find((layer) =>
        /by region/i.test(layer.title ?? ""),
      ) as FeatureLayer | undefined;
      if (sub) {
        await sub.load?.();
        const serviceName = tourServiceRegionRef.current[region] ?? region;
        const query = sub.createQuery();
        query.where = `Region = '${serviceName.replace(/'/g, "''")}'`;
        query.returnGeometry = true;
        query.outFields = [];
        query.num = 1;
        const result = await sub.queryFeatures(query);
        geometry = (result.features[0]?.geometry as Geometry | undefined) ?? null;
      }
    } catch {
      geometry = null;
    }
    // Don't pin a null result before the name resolver has run — a later call
    // with the resolved service name may still succeed.
    if (geometry || region in tourServiceRegionRef.current) {
      tourRegionGeomCache.current[region] = geometry;
    }
    return geometry;
  }, [findLiftedBiomedGroup]);

  const fetchTourStats = useCallback(async (region: string) => {
    if (region in tourStatsCache.current) {
      setTourStats(tourStatsCache.current[region]);
      return;
    }
    setTourStats(null);
    const group = findLiftedBiomedGroup();
    const sub = (group?.layers?.toArray?.() ?? []).find((layer) =>
      /by region/i.test(layer.title ?? ""),
    ) as FeatureLayer | undefined;
    if (!sub) return;
    try {
      await sub.load?.();
      const normTokens = (s: string) =>
        s.toLowerCase().replace(/\bregion\b/g, " ").replace(/\band\b/g, " ").replace(/[^a-z]+/g, " ").trim().split(/\s+/).filter(Boolean);
      const want = normTokens(region);
      const YEAR_FIELDS = ["2022", "2023", "2024", "2025", "2026"];
      const query = sub.createQuery();
      query.where = "1=1";
      query.outFields = ["Region", ...YEAR_FIELDS.flatMap((y) => [`F${y}`, `U${y}`])];
      query.returnGeometry = false;
      query.num = 100;
      const result = await sub.queryFeatures(query);
      let best: { name: string; extra: number; attrs: Record<string, unknown> } | null = null;
      for (const feature of result.features) {
        const name = feature.attributes?.Region;
        if (typeof name !== "string") continue;
        const have = new Set(normTokens(name));
        if (!want.every((token) => have.has(token))) continue;
        const extra = have.size - want.length;
        if (!best || extra < best.extra) best = { name, extra, attrs: feature.attributes ?? {} };
      }
      tourServiceRegionRef.current[region] = best?.name ?? null;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
      let stats: TourMobileStats | null = null;
      if (best) {
        const attrs = best.attrs;
        const years = YEAR_FIELDS.map((y) => ({
          year: y,
          drives: num(attrs[`F${y}`]) ?? 0,
          units: num(attrs[`U${y}`]) ?? 0,
        })).filter((entry) => entry.drives > 0 || entry.units > 0);
        // YoY from the latest two COMPLETE years (2026 is in-flight).
        const d23 = num(attrs.F2023);
        const d24 = num(attrs.F2024);
        const u23 = num(attrs.U2023);
        const u24 = num(attrs.U2024);
        stats = {
          serviceRegion: best.name,
          drives2024: d24,
          units2024: u24,
          years: years.length > 0 ? years : null,
          drivesYoyPct: d23 && d24 ? ((d24 - d23) / d23) * 100 : null,
          unitsYoyPct: u23 && u24 ? ((u24 - u23) / u23) * 100 : null,
        };
      }

      // Enrich with live CY24 drive-type + sponsor stats from the drive-point
      // layer, scoped to the region polygon server-side. Best-effort: the slide
      // renders fine without them.
      if (stats) {
        try {
          const dots = (group?.layers?.toArray?.() ?? []).find(
            (layer) => (layer.title ?? "").trim().toLowerCase() === "blood drives by type",
          ) as FeatureLayer | undefined;
          const geometry = await getTourRegionGeometry(region);
          if (dots && geometry) {
            await dots.load?.();
            const typeQuery = dots.createQuery();
            typeQuery.where = "Year = 2024";
            typeQuery.geometry = geometry;
            typeQuery.spatialRelationship = "intersects";
            typeQuery.returnGeometry = false;
            typeQuery.groupByFieldsForStatistics = ["Account_Type"];
            typeQuery.outStatistics = [
              { statisticType: "sum", onStatisticField: "Drives", outStatisticFieldName: "drive_sum" },
            ] as unknown as typeof typeQuery.outStatistics;
            const typeResult = await dots.queryFeatures(typeQuery);
            const byType = typeResult.features
              .map((feature) => ({
                name: String(feature.attributes?.Account_Type || "Other"),
                donors: Number(feature.attributes?.drive_sum) || 0,
              }))
              .filter((entry) => entry.donors > 0)
              .sort((a, b) => b.donors - a.donors)
              .slice(0, 6);
            if (byType.length > 0) stats.drivesByType = byType;

            const sponsorQuery = dots.createQuery();
            sponsorQuery.where = "Year = 2024";
            sponsorQuery.geometry = geometry;
            sponsorQuery.spatialRelationship = "intersects";
            sponsorQuery.returnGeometry = false;
            sponsorQuery.returnDistinctValues = true;
            sponsorQuery.outFields = ["Sponsor_Ext_ID"];
            const sponsorCount = await dots.queryFeatureCount(sponsorQuery);
            if (Number.isFinite(sponsorCount) && sponsorCount > 0) stats.sponsors2024 = sponsorCount;
          }
        } catch {
          // type/sponsor stats are optional garnish
        }

        // Top Biomedical Districts by CY24 drives (live district service; biomed
        // hierarchy region names ≈ tour names — token-subset matched).
        try {
          const districts = (group?.layers?.toArray?.() ?? []).find((layer) =>
            /drives by biomedical district/i.test(layer.title ?? ""),
          ) as FeatureLayer | undefined;
          if (districts) {
            await districts.load?.();
            const districtQuery = districts.createQuery();
            districtQuery.where = "1=1";
            districtQuery.outFields = ["Biomed_District", "Biomed_Region", "F2024"];
            districtQuery.returnGeometry = false;
            districtQuery.num = 200;
            const districtResult = await districts.queryFeatures(districtQuery);
            const top = districtResult.features
              .filter((feature) => {
                const dr = feature.attributes?.Biomed_Region;
                if (typeof dr !== "string") return false;
                const have = new Set(normTokens(dr));
                return want.every((token) => have.has(token));
              })
              .map((feature) => ({
                name: String(feature.attributes?.Biomed_District || ""),
                donors: Number(feature.attributes?.F2024) || 0,
              }))
              .filter((entry) => entry.name && entry.donors > 0)
              .sort((a, b) => b.donors - a.donors)
              .slice(0, 5);
            if (top.length > 0) stats.topDistricts = top;
          }
        } catch {
          // district stats are optional garnish
        }
      }

      tourStatsCache.current[region] = stats;
      setTourStats(stats);
    } catch {
      tourStatsCache.current[region] = null;
    }
  }, [findLiftedBiomedGroup, getTourRegionGeometry]);

  // Fly the live map to a BioMed region by querying its boundary polygon extent.
  const flyToRegion = useCallback(
    async (name: string) => {
      setTourRegion(name);
      tourRegionLiveRef.current = name;
      clearSiteHighlight();
      void fetchTourStats(name);
      const map = getMapElementMap(mapRef.current);
      const view = mapRef.current?.view as MapView | undefined;
      if (!map || !view) return;

      setTourFlying(true);
      try {
        const safeName = name.replace(/'/g, "''");
        const allLayers = (map.allLayers?.toArray?.() ?? map.layers?.toArray?.() ?? []) as Layer[];
        const featureLayers = allLayers.filter(isSearchableFeatureLayer) as FeatureLayer[];

        // The region NAME lives on the "Biomed Regions" boundary layer (field "Biomed_Region").
        // Rank that layer first; fall back to any name-bearing region field.
        const ranked = featureLayers
          .map((layer) => {
            const title = safeLayerTitle(layer).toLowerCase();
            const fields = layer.fields ?? [];
            const field =
              fields.find((candidate: Field) => /^biomed[_ ]?region$/i.test(candidate.name ?? "")) ??
              fields.find((candidate: Field) => /(^|_)region$/i.test(candidate.name ?? "") && !/id$/i.test(candidate.name ?? ""));
            let score = 0;
            if (field) score += 4;
            if (title.includes("biomed regions")) score += 10;
            if (layer.geometryType === "polygon") score += 2;
            return { layer, field, score };
          })
          .filter((candidate) => Boolean(candidate.field))
          .sort((a, b) => b.score - a.score);

        let union: Extent | null = null;
        for (const { layer, field } of ranked) {
          if (!field) continue;
          try {
            await layer.load?.();
            const regionQuery = layer.createQuery();
            regionQuery.where = `${field.name} = '${safeName}'`;
            regionQuery.returnGeometry = true;
            regionQuery.outFields = [];
            const result = await layer.queryFeatures(regionQuery);
            const extents = result.features
              .map((feature) => (feature.geometry as Geometry | null)?.extent as Extent | null | undefined)
              .filter((ext): ext is Extent => Boolean(ext))
              .map((ext) => ext.clone());
            if (extents.length > 0) {
              union = extents.reduce((acc, ext) => acc.union(ext));
              break;
            }
          } catch {
            // try the next candidate layer
          }
        }

        if (union) {
          // Offset the view so the region lands in the window between the tour panels.
          const width = view.width || window.innerWidth;
          view.padding = {
            top: 58,
            bottom: 28,
            left: 300,
            right: Math.min(470, Math.round(width * 0.34)),
          };
          await view.goTo(union.expand(1.12), { duration: 950 });
        }

        // Same red selection outline as the dashboards (shared implementation).
        tourOutlineRef.current = (await drawSelectionOutline(
          map,
          view,
          { division: "", region: name, district: "" },
          {},
          tourOutlineRef.current,
        )) as Graphic | null;
      } catch {
        // navigation can be interrupted; the slide panel still shows
      } finally {
        setTourFlying(false);
      }
    },
    [clearSiteHighlight, fetchTourStats],
  );

  // Fly the live map to a fixed collection site by name and drop a highlight ring.
  // A null siteName means the site story closed — restore the region extent.
  const flyToSite = useCallback(
    async (siteName: string | null) => {
      clearSiteHighlight();
      if (!siteName) {
        if (tourRegion) void flyToRegion(tourRegion);
        return;
      }
      const map = getMapElementMap(mapRef.current);
      const view = mapRef.current?.view as MapView | undefined;
      if (!map || !view) return;

      setTourFlying(true);
      try {
        const allLayers = (map.allLayers?.toArray?.() ?? map.layers?.toArray?.() ?? []) as Layer[];
        const featureLayers = allLayers.filter(isSearchableFeatureLayer) as FeatureLayer[];

        // The point/polygon name format varies by layer (full "... Blood Donation
        // Center", abbreviated, or punctuated). Match on a normalized comparison
        // rather than an exact string so layout differences don't break the zoom.
        const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const rootName = siteName.replace(/\s+(blood\s+)?(donation|donor)\s+center$/i, "").trim();
        const targetNorms = [norm(siteName), norm(rootName)].filter((s) => s.length >= 4);
        const generic = new Set(["BLOOD", "DONATION", "DONOR", "CENTER", "THE", "OF", "AND", "NORTH", "SOUTH", "EAST", "WEST"]);
        // Pick the most distinctive word to anchor a loose server-side LIKE.
        const anchor =
          rootName
            .split(/\s+/)
            .filter((w) => w.replace(/[^A-Za-z0-9]/g, "").length >= 4 && !generic.has(w.toUpperCase()))
            .sort((a, b) => b.length - a.length)[0] ??
          rootName.split(/\s+/).sort((a, b) => b.length - a.length)[0] ??
          rootName;
        const safeAnchor = anchor.replace(/[^A-Za-z0-9]/g, "").replace(/'/g, "''");

        const matches = (value: unknown) => {
          if (typeof value !== "string") return false;
          const v = norm(value);
          if (v.length < 4) return false;
          return targetNorms.some((t) => t === v || t.includes(v) || v.includes(t));
        };

        const ranked = featureLayers
          .map((layer) => {
            const title = safeLayerTitle(layer).toLowerCase();
            const fields = layer.fields ?? [];
            const nameFields = fields.filter(
              (candidate: Field) =>
                candidate.type === "string" && /name|site|facility|center|label|fsrsmo|title/i.test(candidate.name ?? ""),
            );
            let score = 0;
            if (nameFields.length > 0) score += 2;
            if (layer.geometryType === "point") score += 4;
            if (title.includes("fixed")) score += 10;
            if (title.includes("trade") || title.includes("fsrsmo")) score += 8;
            if (title.includes("donor") || title.includes("donation")) score += 4;
            return { layer, nameFields, score };
          })
          .filter((candidate) => candidate.nameFields.length > 0)
          .sort((a, b) => b.score - a.score);

        let target: Graphic | null = null;
        for (const { layer, nameFields } of ranked) {
          if (target) break;
          try {
            await layer.load?.();
            for (const field of nameFields) {
              const siteQuery = layer.createQuery();
              siteQuery.returnGeometry = true;
              siteQuery.outFields = [field.name];
              siteQuery.where = safeAnchor
                ? `UPPER(${field.name}) LIKE UPPER('%${safeAnchor}%')`
                : "1=1";
              const result = await layer.queryFeatures(siteQuery);
              const hit = result.features.find(
                (feature) => feature.geometry && matches(feature.attributes?.[field.name]),
              );
              if (hit) {
                target = hit;
                break;
              }
            }
          } catch {
            // try the next candidate layer
          }
        }

        const geometry = target?.geometry as Geometry | undefined;
        const center = geometry?.type === "point" ? (geometry as Point) : geometry?.extent?.center;
        if (center) {
          const [{ default: GraphicCtor }, { default: SimpleMarkerSymbol }] = await Promise.all([
            import("@arcgis/core/Graphic"),
            import("@arcgis/core/symbols/SimpleMarkerSymbol"),
          ]);
          const ring = new GraphicCtor({
            geometry: center,
            symbol: new SimpleMarkerSymbol({
              style: "circle",
              color: [237, 27, 46, 0.14],
              size: 34,
              outline: { color: [237, 27, 46, 0.95], width: 2.5 },
            }),
          });
          view.graphics.add(ring);
          siteHighlightRef.current = ring;
          await view.goTo({ target: center, zoom: Math.max(view.zoom ?? 0, 12) }, { duration: 950 });
        }
      } catch {
        // navigation can be interrupted; the site story panel still shows
      } finally {
        setTourFlying(false);
      }
    },
    [clearSiteHighlight, flyToRegion, tourRegion],
  );

  // ---- Tour story → map layer sync ---------------------------------------
  // Each story page lights up the matching lifted BIOMED layer so the map tells
  // the same story as the slide: drive-point dots for the Mobile Story, county
  // choropleths for performance/heat views. Choropleths are filtered to the
  // active region when the service carries a matching Region name (verified by
  // a cached count query); drive points have no region field, so the region
  // zoom does the cropping.
  const tourRegionFilterCache = useRef<Record<string, boolean>>({});

  const applyTourStoryLayers = useCallback(
    async (ctx: TourSlideContext | null) => {
      const map = getMapElementMap(mapRef.current);
      if (!map) return;
      const group = ((map.layers?.toArray?.() ?? []) as Layer[]).find(
        (layer) => layer.type === "group" && (layer.title ?? "").trim().toUpperCase() === "BIOMED",
      ) as (Layer & { layers?: { toArray?: () => Layer[] } }) | undefined;
      if (!group) return;

      const key =
        ctx == null
          ? "off"
          : ctx.kind === "deck"
            ? `deck-${ctx.slide}`
            : ctx.kind === "story"
              ? `story-${ctx.story}-${ctx.slide}`
              : "site";
      const PLAN: Record<string, string[]> = {
        "deck-1": ["RBC Collections by County"],
        "deck-2": ["Drives by Biomedical District"],
        "story-mobile-0": ["Blood Drives by Type"],
        "story-mobile-1": ["Drives by County"],
      };
      const wanted = new Set(PLAN[key] ?? []);
      group.visible = wanted.size > 0;

      const region = tourRegion;
      const view = mapRef.current?.view as MapView | undefined;
      // Make sure the ARC service name is resolved before building filters, so
      // the first slide visit filters correctly instead of falling back national.
      if (region && !(region in tourServiceRegionRef.current)) await fetchTourStats(region);
      const stale = () => tourRegionLiveRef.current !== region;
      for (const sub of group.layers?.toArray?.() ?? []) {
        const on = wanted.has((sub.title ?? "").trim());
        sub.visible = on;
        if (!on || !region) continue;
        const fl = sub as FeatureLayer;
        try {
          await fl.load?.();
          if (stale()) return;
          const regionField =
            (fl.fields ?? []).find((field) => field.name === "Region") ??
            (fl.fields ?? []).find((field) => field.name === "Biomed_Region");
          if (regionField) {
            // ARC-style services use the resolved ARC name; biomed-hierarchy
            // services (Biomed_Region) use the tour name directly. The count
            // query below falls back to national when either doesn't match.
            const serviceName =
              regionField.name === "Region" ? tourServiceRegionRef.current[region] ?? region : region;
            const where = `${regionField.name} = '${serviceName.replace(/'/g, "''")}'`;
            const cacheKey = `${fl.id}::${serviceName}`;
            if (!(cacheKey in tourRegionFilterCache.current)) {
              const countQuery = fl.createQuery();
              countQuery.where = where;
              countQuery.returnGeometry = false;
              const count = (await fl.queryFeatureCount?.(countQuery)) ?? 0;
              tourRegionFilterCache.current[cacheKey] = count > 0;
            }
            // Region names that don't match this service fall back to the national
            // layer — the region zoom still frames the local picture.
            if (stale()) return;
            fl.definitionExpression = tourRegionFilterCache.current[cacheKey] ? where : "";
          }
          if (view) {
            // Spatially clip EVERY story layer to the BIOMED region boundary.
            // The attribute filter alone isn't enough for the choropleths: their
            // Region field is HS geography (e.g. "Minnesota and Dakotas Region"
            // spans both states), while the drawn boundary is the smaller BIOMED
            // region — without the clip, out-of-region counties render anyway.
            const geometry = await getTourRegionGeometry(region);
            // Cap the wait so a layer view that never materializes can't hang
            // the loop (and later slide changes) behind an unresolved promise.
            const layerView = (await Promise.race([
              view.whenLayerView(fl).catch(() => null),
              new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
            ])) as { filter?: unknown } | null;
            if (stale()) return;
            if (layerView && "filter" in layerView) {
              if (geometry) {
                const { default: FeatureFilter } = await import("@arcgis/core/layers/support/FeatureFilter");
                if (stale()) return;
                layerView.filter = new FeatureFilter({ geometry, spatialRelationship: "intersects" });
              } else {
                layerView.filter = null;
              }
            }
          }
        } catch {
          // leave the layer unfiltered
        }
      }
    },
    [tourRegion, getTourRegionGeometry, fetchTourStats],
  );

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
      data-tour={tourActive ? "true" : "false"}
      data-testid={testId}
      aria-label={title}
    >
      <RcAppBar title={tourActive ? "Regional Story Explorer" : title}>
        <label className="rcbar__field">
          Quick View
          <select value={preset} onChange={(event) => applyPreset(event.target.value as WorkbenchPreset)}>
            <option value="default-workbench">Default Workbench</option>
            <option value="all-layers">All BioMed Layers</option>
            <option value="clean-map">Clean Map</option>
            {presenterModes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="rcbar__btn" onClick={() => void resetMap()}>
          <RotateCcw aria-hidden="true" size={16} />
          Reset map
        </button>
        {!tourActive && (
          <button type="button" className="rcbar__btn" onClick={openTour}>
            <Compass aria-hidden="true" size={16} />
            Region tour
          </button>
        )}
        <button type="button" className="rcbar__icon" onClick={() => setHelpOpen(true)} aria-label="Help" title="Help">
          <HelpCircle aria-hidden="true" size={18} />
        </button>
        <div className="rcbar__auth" data-on={isAuthenticated ? "true" : "false"} data-authenticated={isAuthenticated ? "true" : "false"}>

          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </RcAppBar>

      <div className="opsv2__stage">
      <div className="opsv2__map-shell">
        {createElement(
          "arcgis-map",
          {
            key: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "opsv2-preview",
            ref: mapRef,
            itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
            basemap: isAuthenticated ? undefined : quietOpsBasemapId(),
            center: homeCenterStr,
            zoom: homeZoom,
            className: "opsv2__arcgis",
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

        {isAuthenticated && !mapReady && (
          <WorkbenchMapLoader pendingVisibleLayerCount={layers.filter((layer) => layer.visible).length} />
        )}

        {tourActive && (
          <RegionTour
            activeRegion={tourRegion}
            flying={tourFlying}
            onSelectRegion={(name) => void flyToRegion(name)}
            onSelectSite={(siteName) => void flyToSite(siteName)}
            onSlideChange={(ctx) => void applyTourStoryLayers(ctx)}
            mobileStats={tourStats}
          />
        )}
      </div>

      <aside className="opsv2__panel opsv2__panel--left" data-collapsed={leftOpen ? "false" : "true"} data-has-query={query.trim().length > 0 ? "true" : "false"} aria-label="Layer controls">
        {!leftOpen && (
          <div className="opsv2__rail">
            <button type="button" className="opsv2__rail-btn" aria-label="Open layer controls" onClick={() => setLeftOpen(true)}>
              <ChevronRight aria-hidden="true" size={18} />
            </button>
            <Link to="/hub" className="opsv2__rail-home" aria-label="Home" title="Home">
              <Home aria-hidden="true" size={18} />
            </Link>
            <span className="opsv2__rail-label">Layers</span>
          </div>
        )}
        {leftOpen && (
        <>
          <div className="opsv2__panel-head">
            <Link to="/hub" className="opsv2__panel-home" aria-label="Home" title="Home">
              <Home aria-hidden="true" size={16} />
            </Link>
            <div>
              <h2>Layer Controls</h2>
              <p>{layerCounts.visible} active of {layerCounts.total} layers.</p>
            </div>
            <button type="button" className="opsv2__rail-btn" aria-label="Collapse layer controls" onClick={() => setLeftOpen(false)}>
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="opsv2__left-tabs" role="tablist" aria-label="Layer panel views">
            <button
              type="button"
              className={leftTab === "geography" ? "is-active" : ""}
              onClick={() => setLeftTab("geography")}
              role="tab"
              aria-selected={leftTab === "geography"}
              data-testid="ops-tab-geography"
            >
              <MapPin aria-hidden="true" size={17} />
              Geography
            </button>
            <button
              type="button"
              className={leftTab === "filter" ? "is-active" : ""}
              onClick={() => setLeftTab("filter")}
              role="tab"
              aria-selected={leftTab === "filter"}
            >
              <Filter aria-hidden="true" size={17} />
              Filter
            </button>
          </div>
          {leftTab === "filter" && (
          <>
          <div className="opsv2__layer-actions">
            <span>{layerCounts.visible} of {layerCounts.total} on</span>
            <div className="opsv2__layer-actions-buttons">
              <button type="button" className="opsv2__layer-action" disabled={!isAuthenticated} onClick={() => setAllLayersVisible(true)}>
                All on
              </button>
              <button type="button" className="opsv2__layer-action" disabled={!isAuthenticated} onClick={() => setAllLayersVisible(false)}>
                All off
              </button>
            </div>
          </div>
          <LayerList
            testId="ops-layer-list"
            rowsDisabled={!isAuthenticated}
            groups={sourceGroups
              .map((group) => ({
                id: group.id,
                label: group.label,
                rows: filteredLayers
                  .filter((layer) => layer.category === group.id)
                  .map((layer) => {
                    const marker = legendMarkerForLayer(layer.title, layer.category);
                    return {
                      id: layer.id,
                      title: layer.title,
                      summary: layer.summary,
                      category: layer.category,
                      marker: { url: marker.url, kind: marker.kind, label: marker.label },
                      visible: layer.visible,
                    };
                  }),
              }))
              .filter((group) => group.rows.length > 0)}
            openGroups={expandedGroups}
            onToggleGroup={(groupId) => setExpandedGroups((current) => ({ ...current, [groupId]: !(current[groupId] ?? true) }))}
            onToggleLayer={toggleLayer}
            onToggleGroupAll={(groupId) => toggleGroupLayers(groupId)}
          />
          </>
          )}
          {leftTab === "geography" && (
          <>
          <label className="opsv2__search">
            <Search aria-hidden="true" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search counties, regions, sites" />
          </label>
          {query.trim().length > 0 ? (
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
          ) : (
          <div className="opsv2__geo">
            <p className="opsv2__geo-intro">Drill from division to district. Filters the map and zooms to the selection.</p>
            {LEVELS.map((level) => {
              const disabled =
                !isAuthenticated ||
                (level === "region" && !geoSelection.division) ||
                (level === "district" && !geoSelection.region);
              return (
                <label key={level} className="opsv2__geo-field" data-disabled={disabled ? "true" : "false"}>
                  <span>{levelLabel(level)}</span>
                  <select
                    value={geoSelection[level]}
                    disabled={disabled}
                    onChange={(event) => onGeoSelect(level, event.target.value)}
                    data-testid={`ops-geo-${level}`}
                  >
                    <option value="">{levelAllLabel(level)}</option>
                    {geoOptions[level].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              );
            })}
            {LEVELS.some((level) => geoSelection[level]) && (
              <div className="opsv2__geo-chips" aria-label="Active geography filters">
                {LEVELS.filter((level) => geoSelection[level]).map((level) => (
                  <button key={level} type="button" className="opsv2__geo-chip" onClick={() => onGeoSelect(level, "")}>
                    <em>{levelLabel(level)}</em>
                    {geoSelection[level]}
                    <X aria-hidden="true" size={13} />
                  </button>
                ))}
                <button type="button" className="opsv2__geo-chip opsv2__geo-chip--clear" onClick={resetGeography}>
                  Clear all
                </button>
              </div>
            )}
            {!isAuthenticated && <p className="opsv2__search-hint">Sign in to filter by geography.</p>}
          </div>
          )}
          </>
          )}
        </>
        )}
      </aside>

      <aside className="opsv2__panel opsv2__panel--right" data-collapsed={rightOpen ? "false" : "true"} aria-label={`${resultLabel} results`}>
        {!rightOpen && (
          <div className="opsv2__rail">
            <button type="button" className="opsv2__rail-btn" aria-label={`Open ${resultLabel.toLowerCase()} results`} onClick={() => setRightOpen(true)}>
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span className="opsv2__rail-label">Results</span>
          </div>
        )}
        {rightOpen && (
        <>
          <div className="opsv2__panel-head">
            <div>
              <p className="opsv2__panel-kicker">Results</p>
              <h2>{currentTitle}</h2>
              <p>{currentSubtitle}</p>
            </div>
            <button type="button" className="opsv2__rail-btn" aria-label={`Collapse ${resultLabel.toLowerCase()} results`} onClick={() => setRightOpen(false)}>
              <ChevronRight aria-hidden="true" size={17} />
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
                    <span>Layer Group Subtotals</span>
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
              <>
                {coincidentHits.length > 1 && (
                  <section className="opsv2__coincident" data-testid="ops-coincident-picker" aria-label="Overlapping features at this point">
                    <header className="opsv2__coincident-head">
                      <strong>{coincidentHits.length} features here</strong>
                      <span>Stacked markers — pick one</span>
                    </header>
                    <div className="opsv2__coincident-list">
                      {coincidentHits.map((hit) => {
                        const active = selectedGraphic === hit.graphic;
                        return (
                          <button
                            key={hit.key}
                            type="button"
                            className={`opsv2__coincident-item${active ? " is-active" : ""}`}
                            aria-pressed={active}
                            onClick={() => selectCoincidentHit(hit)}
                          >
                            <strong>{hit.title}</strong>
                            <span>{hit.layerTitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
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
                    <p className="opsv2__empty">
                      {coincidentHits.length > 1 ? "Select one of the stacked features above." : "No feature selected."}
                    </p>
                  )}
                </section>
              </>
            )}

            {rightTab === "list" && (
              <>
                <section className="opsv2__subtotal-card">
                  <header>
                    <span>Active Layer Stack</span>
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
                      <span>Search Results</span>
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
        </>
        )}
      </aside>
      </div>

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

      {helpOpen && <WorkbenchHelpModal title={title} onClose={() => setHelpOpen(false)} />}
    </section>
  );
}
