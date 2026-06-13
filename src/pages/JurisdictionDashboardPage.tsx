import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import RcAppBar from "../components/RcAppBar";
import type ArcGISMap from "@arcgis/core/Map";
import type Graphic from "@arcgis/core/Graphic";
import type Geometry from "@arcgis/core/geometry/Geometry";
import Extent from "@arcgis/core/geometry/Extent";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Field from "@arcgis/core/layers/support/Field";
import type MapView from "@arcgis/core/views/MapView";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Info,
  Home,
  Layers,
  List,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import RcMark from "../components/RcMark";
import {
  arcJurisdictionMapSource,
  jurisdictionDashboardSupplementalLayers,
  type ArcJurisdictionSupplementalLayerSource,
} from "../config/arcgisLayers";
import { addArcgisPortalLayers, addChapterViewBiomedGroup } from "../utils/arcgisMasterLayers";
import { computeSelectionZoomExtent, drawSelectionOutline, queryBoundaryGeometry } from "../utils/biomedGeographyFilter";
import { runBiomedFeatureSearch, type BiomedSearchResult, type SearchStatus } from "../utils/biomedFeatureSearch";
import LayerList from "../components/mapshell/LayerList";
import FeatureSearch from "../components/mapshell/FeatureSearch";
import MapTabBar from "../components/mapshell/MapTabBar";
import MapMarkerLegend from "../components/MapMarkerLegend";
import "../components/mapshell/mapshell.css";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import { applyPresentationMapStyle, quietOpsBasemapId } from "../maps/presentationStyle";
import { applyPresentationMarkers } from "../maps/presentationMarkers";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  getMapElementMap,
  hideBasemapUtilityLayers,
  safeLayerTitle,
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
} from "../utils/biomedMapSuite";
import { summarizeMasterFeature, type MasterFeatureSummary } from "../utils/masterMapFeatures";
import "./JurisdictionDashboardPage.css";

const HOME_CENTER: [number, number] = [-96.2, 38.3];
const CENTER = HOME_CENTER.join(",");
const ZOOM = 4;
const LEVELS = ["division", "region", "district"] as const;
type LevelId = (typeof LEVELS)[number];
type Selection = Record<LevelId, string>;
const EMPTY_SELECTION: Selection = { division: "", region: "", district: "" };

type WatchHandle = { remove?: () => void };

type KpiDef = {
  key: string;
  label: string;
  hint: string;
  tokens: string[][]; // OR-of-AND token groups
  stat: "sum" | "count";
};

// FY25 jurisdiction summary counts. Field names are resolved live against the
// source layer by token match, so the dashboard self-configures even if the
// published schema differs slightly.
const KPI_DEFS: KpiDef[] = [
  { key: "drives", label: "FY25 Red Cell Drives", hint: "Total mobile + fixed red cell drives", tokens: [["total", "drive"], ["red", "cell", "drive"], ["drive"]], stat: "sum" },
  { key: "collections", label: "FY25 Red Cell Collections", hint: "Total red cell collections", tokens: [["total", "coll"], ["red", "cell", "product"], ["red", "cell", "collect"], ["collection"]], stat: "sum" },
  { key: "sdp", label: "FY25 SDP Units", hint: "Single-donor platelet units", tokens: [["sdp", "unit"], ["sdp"]], stat: "sum" },
  { key: "plasma", label: "FY25 Plasma Units", hint: "Plasma units collected", tokens: [["plasma", "unit"], ["plasma"]], stat: "sum" },
];

function normalizeField(field: Field) {
  return `${field.name} ${field.alias ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isNumericField(field: Field) {
  return (
    field.type === "double" ||
    field.type === "single" ||
    field.type === "integer" ||
    field.type === "small-integer"
  );
}

function isSqlSafeField(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function findField(fields: Field[], groups: string[][], opts: { numeric?: boolean } = {}) {
  const candidates = fields.filter((field) => isSqlSafeField(field.name) && (!opts.numeric || isNumericField(field)));
  for (const tokens of groups) {
    const match = candidates.find((field) => {
      const text = normalizeField(field);
      return tokens.every((token) => text.includes(token));
    });
    if (match) return match;
  }
  return undefined;
}

// Name-first: prefer explicit *name* fields, then plain jurisdiction fields.
const LEVEL_FIELD_TOKENS: Record<LevelId, string[][]> = {
  division: [["biomed", "division", "name"], ["division", "name"], ["biomed", "division"], ["division"]],
  region: [["biomed", "region", "name"], ["region", "name"], ["biomed", "region"], ["region"]],
  district: [["biomed", "district", "name"], ["district", "name"], ["biomed", "district"], ["district"]],
};

// Codes never reach a human: skip ECODE/RCODE/DCODE/FIPS/code/id fields entirely.
const CODE_FIELD_RE = /\b(code|ecode|rcode|dcode|fips|geoid|abbr|objectid|globalid|id)\b/i;

function fieldText(field: Field) {
  return `${field.name} ${field.alias ?? ""}`.replace(/[_]+/g, " ").toLowerCase();
}

function isCodeLikeFieldName(field: Field) {
  return CODE_FIELD_RE.test(fieldText(field));
}

// Humanitarian Services geography is a different jurisdiction system. This tool
// is BioMed-only — never let an HS field win a level match.
function isHsFieldName(field: Field) {
  const text = fieldText(field);
  return /\bhs\b/.test(text) || text.includes("humanitarian");
}

// A short, space-free, mostly-uppercase/numeric token is a code, not a name
// (e.g. "R12", "0512", "NE"). Names have spaces or real words.
function looksLikeCodeValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 6 && !/\s/.test(trimmed) && !/[a-z]{3,}/.test(trimmed);
}

function levelNameFieldCandidates(fields: Field[], level: LevelId): Field[] {
  const stringFields = fields.filter(
    (field) => field.type === "string" && isSqlSafeField(field.name) && !isCodeLikeFieldName(field) && !isHsFieldName(field),
  );
  const ranked: Field[] = [];
  for (const tokens of LEVEL_FIELD_TOKENS[level]) {
    for (const field of stringFields) {
      if (ranked.includes(field)) continue;
      const text = fieldText(field);
      if (tokens.every((token) => text.includes(token))) ranked.push(field);
    }
  }
  return ranked;
}

function findLevelField(fields: Field[], level: LevelId) {
  return levelNameFieldCandidates(fields, level)[0];
}

// Use the field that actually fed the dropdown (chosen) when this layer carries
// it; otherwise fall back to the layer's own best name field.
function resolveLevelField(layer: FeatureLayer, level: LevelId, chosen: Partial<Record<LevelId, string>>) {
  const candidates = levelNameFieldCandidates(layer.fields ?? [], level);
  if (chosen[level]) {
    const match = candidates.find((field) => field.name === chosen[level]);
    if (match) return match;
  }
  return candidates[0];
}

function isQueryableFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatures === "function" && typeof (layer as FeatureLayer).createQuery === "function";
}

// Click priority so a small/specific feature wins over the big boundary polygon
// drawn behind it: point sites > ZIP > county > chapter > district > region >
// division. Higher number wins.
function hitGraphicPriority(graphic: Graphic) {
  const layer = ((graphic as Graphic & { sourceLayer?: Layer }).sourceLayer ?? graphic.layer) as FeatureLayer | undefined;
  if (!layer) return 0;
  if (layer.geometryType === "point") return 100;
  const title = (layer.title ?? "").toLowerCase();
  if (title.includes("zip") || title.includes("trade") || title.includes("fy25")) return 80;
  if (title.includes("count")) return 50;
  if (title.includes("chapter")) return 45;
  if (title.includes("district")) return 40;
  if (title.includes("region")) return 30;
  if (title.includes("division")) return 20;
  return 60; // other operational polygons sit above jurisdiction boundaries
}

type CoincidentHit = { key: string; graphic: Graphic; title: string; layerTitle: string; isPoint: boolean };

// All distinct operational features under the click pixel, de-duped by layer + object id
// and ranked by hitGraphicPriority (points first). Drives the stacked-marker picker.
function collectCoincidentHits(
  results: Array<{ type: string; graphic?: Graphic }>,
  opLayerIds: Set<string>,
): CoincidentHit[] {
  const seen = new Set<string>();
  const ranked: Array<{ hit: CoincidentHit; priority: number; index: number }> = [];
  results.forEach((result, index) => {
    if (result.type !== "graphic" || !result.graphic) return;
    const graphic = result.graphic;
    const layer = ((graphic as Graphic & { sourceLayer?: Layer }).sourceLayer ?? graphic.layer) as FeatureLayer | undefined;
    if (!layer || !opLayerIds.has(String(layer.id))) return;
    const objectId = layer.objectIdField ? graphic.attributes?.[layer.objectIdField] : undefined;
    const key = `${layer.id}::${objectId ?? `idx-${index}`}`;
    if (seen.has(key)) return;
    seen.add(key);
    const layerTitle = (layer as { title?: string }).title ?? "Feature";
    const summary = summarizeMasterFeature(graphic, layerTitle);
    ranked.push({
      hit: { key, graphic, title: summary.title || layerTitle, layerTitle: summary.layerTitle || layerTitle, isPoint: layer.geometryType === "point" },
      priority: hitGraphicPriority(graphic),
      index,
    });
  });
  return ranked.sort((a, b) => b.priority - a.priority || a.index - b.index).map((entry) => entry.hit);
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

// Build a WHERE clause for THIS layer using its own jurisdiction NAME fields.
function buildWhereForLayer(layer: FeatureLayer, selection: Selection, chosen: Partial<Record<LevelId, string>> = {}) {
  const clauses: string[] = [];
  LEVELS.forEach((level) => {
    const value = selection[level];
    if (!value) return;
    const field = resolveLevelField(layer, level, chosen);
    if (field) clauses.push(`${field.name} = '${escapeSql(value)}'`);
  });
  return clauses.length ? clauses.join(" AND ") : "1=1";
}

function layerHasAnyLevelField(layer: FeatureLayer) {
  const fields = layer.fields ?? [];
  return LEVELS.some((level) => findLevelField(fields, level));
}

const SITE_TITLE_TOKENS = [["site", "name", "donor"], ["facility", "name"], ["site", "name"], ["account", "name"], ["name"]];

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString();
}

function levelLabel(level: LevelId) {
  if (level === "division") return "BioMed Division";
  if (level === "region") return "BioMed Region";
  return "BioMed District";
}

// Quick View presets — logical layer combinations. The matcher decides which
// layers are ON for each preset; "minimal" is the default starting view.
type PresetId = "minimal" | "boundaries" | "fixed" | "mobile-fixed" | "collections" | "infrastructure" | "hospital" | "all" | "clean";

// Layers tab accordions — every snapshot category maps to exactly one group.
const LAYER_TYPE_GROUPS: Array<{ id: string; label: string; categories: string[] }> = [
  { id: "sites", label: "Sites & Facilities", categories: ["sites", "manufacturing"] },
  { id: "geography", label: "Boundaries & Geography", categories: ["geography"] },
  { id: "operations", label: "Operations & Collections Data", categories: ["operations"] },
  { id: "hospitals", label: "Hospitals", categories: ["hospitals"] },
  { id: "reference", label: "Reference", categories: ["reference"] },
];

const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: "minimal", label: "Minimal (Boundaries + Fixed Sites)" },
  { id: "boundaries", label: "Boundaries Only" },
  { id: "fixed", label: "Fixed Sites" },
  { id: "mobile-fixed", label: "Mobile + Fixed Sites" },
  { id: "collections", label: "FY25 Collections Data" },
  { id: "infrastructure", label: "Infrastructure (All Site Types)" },
  { id: "hospital", label: "Hospital Network" },
  { id: "all", label: "All BioMed Layers" },
  { id: "clean", label: "Clean Map (No Overlays)" },
];

function isHsTitle(title: string) {
  const t = title.toLowerCase();
  return t.includes("hs ") || t.includes("humanitarian");
}

function shouldShowLayerForPreset(title: string, preset: PresetId) {
  const t = title.toLowerCase();
  if (preset === "clean") return false;
  if (isHsTitle(title)) return false; // BioMed-only tool
  if (preset === "all") return true;

  const isBoundary = t.includes("biomed division") || t.includes("biomed region") || t.includes("biomed district");
  const isFixed = t.includes("fixed site");
  const isMobile = t.includes("mobile");
  // FY25 collections = ZIP/FY25 data only — NOT the Biomed Collection Operations layer.
  const isCollections = t.includes("zip") || t.includes("fy25");

  if (preset === "boundaries") return isBoundary;
  if (preset === "fixed") return isFixed || t.includes("biomed region");
  if (preset === "mobile-fixed") return isMobile || isFixed || t.includes("biomed region");
  if (preset === "collections") return isCollections || t.includes("biomed region");
  if (preset === "hospital") {
    // Patient-care picture: hospitals, portfolio visuals, distribution, IRL.
    const isHospital =
      t.includes("hospital") || t.includes("portfolio") || t.includes("final best") ||
      t.includes("distribution") || t.includes("irl");
    return isHospital || t.includes("biomed region");
  }
  if (preset === "infrastructure") {
    // Logistics + collection-site footprint: every site type + region context.
    const isSite =
      t.includes("warehouse") || t.includes("staging") || t.includes("manufactur") ||
      t.includes("kitting") || t.includes("irl") || t.includes("distribution") || isFixed;
    return isSite || t.includes("biomed region");
  }
  // minimal
  return t.includes("biomed division") || t.includes("biomed region") || isFixed;
}

type SiteRow = {
  id: string;
  title: string;
  subtitle: string;
  graphic: Graphic;
  layerTitle: string;
  drives: number | null;
  volume: number | null;
};

function zoomTargetForGeometry(geometry: Geometry) {
  const extent = geometry.extent as Extent | null | undefined;
  if (extent) return extent.clone().expand(1.4);
  return { target: geometry, zoom: 10 };
}

// Never surface a raw code to a human. Drop rows that are codes or whose
// jurisdiction value is a code rather than a name.
const JURIS_LABEL_RE = /^(division|region|district|chapter|county)$/i;
function isCodeRow(row: { label: string; value: string }) {
  const label = row.label.trim();
  if (/\b(code|ecode|rcode|dcode|fips|geoid|objectid|globalid)\b/i.test(label)) return true;
  if (JURIS_LABEL_RE.test(label) && looksLikeCodeValue(row.value)) return true;
  return false;
}

// Read a field value by normalized name (exact first, then contains).
function rawGet(raw: Record<string, unknown> | undefined, candidates: string[]) {
  if (!raw) return "";
  const entries = Object.entries(raw).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), value] as const);
  for (const candidate of candidates) {
    const target = candidate.toLowerCase();
    const exact = entries.find(([key, value]) => key === target && value != null && `${value}`.trim());
    if (exact) return `${exact[1]}`.trim();
  }
  for (const candidate of candidates) {
    const target = candidate.toLowerCase();
    const partial = entries.find(([key, value]) => key.includes(target) && value != null && `${value}`.trim());
    if (partial) return `${partial[1]}`.trim();
  }
  return "";
}

// Headline metrics, ranked. Capture real counts (projection, drives, units),
// reject IDs/dates/year/zip/codes and implausibly large values.
const METRIC_HINT_ORDER = [
  "projection",
  "product",
  "drive",
  "collection",
  "sdp",
  "platelet",
  "plasma",
  "whole blood",
  "wb",
  "apheresis",
  "apo",
  "unit",
];

function isExcludedMetricKey(normalized: string) {
  return (
    /\bid\b/.test(normalized) ||
    normalized.includes("date") ||
    normalized.includes("sponsor") ||
    normalized.includes("master") ||
    normalized.includes("external") ||
    /\byear\b/.test(normalized) ||
    normalized.includes("time") ||
    /\b(zip|postal|fips|geoid|code|objectid|globalid|fid)\b/.test(normalized) ||
    /\b(lat|lon|long|latitude|longitude)\b/.test(normalized)
  );
}

// Pull a single numeric value from a feature's attributes by token match,
// rejecting IDs/dates/years/codes/times and oversized values.
function rawNumber(raw: Record<string, unknown> | undefined, groups: string[][]) {
  if (!raw) return null;
  for (const tokens of groups) {
    for (const [key, value] of Object.entries(raw)) {
      const num = typeof value === "number" ? value : Number(`${value}`.replace(/,/g, ""));
      if (!Number.isFinite(num)) continue;
      const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (isExcludedMetricKey(normalized)) continue;
      if (Math.abs(num) > 5_000_000) continue;
      if (tokens.every((token) => normalized.includes(token))) return num;
    }
  }
  return null;
}

const SITE_DRIVES_TOKENS = [["red", "cell", "drive"], ["total", "drive"], ["drive"]];
const SITE_VOLUME_TOKENS = [["total", "red", "cell", "product"], ["red", "cell", "product"], ["total", "coll"], ["rbc", "product"], ["collection"]];

function metricRank(normalized: string) {
  const index = METRIC_HINT_ORDER.findIndex((hint) => normalized.includes(hint));
  return index === -1 ? 99 : index;
}

function formatMetricLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSiteMetrics(raw?: Record<string, unknown>) {
  if (!raw) return [] as Array<{ label: string; value: string }>;
  const found: Array<{ label: string; value: string; rank: number }> = [];
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(raw)) {
    const num = typeof value === "number" ? value : Number(`${value}`.replace(/,/g, ""));
    if (!Number.isFinite(num)) continue;
    const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (isExcludedMetricKey(normalized)) continue;
    if (Math.abs(num) > 5_000_000) continue;
    const rank = metricRank(normalized);
    if (rank === 99) continue;
    const label = formatMetricLabel(key);
    const dedupe = label.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    found.push({ label, value: Math.round(num).toLocaleString(), rank });
  }
  return found.sort((a, b) => a.rank - b.rank).slice(0, 3).map(({ label, value }) => ({ label, value }));
}

function isJunkFactRow(row: { label: string; value: string }) {
  const label = row.label.trim().toLowerCase();
  if (/^user\b/.test(label)) return true;
  if (/(^|\s)(country|street name|object ?id|global ?id)(\s|$)/.test(label)) return true;
  if (/\bid\b/.test(label) || /\bdate\b/.test(label)) return true;
  if (/^(united states|usa|us)$/i.test(row.value.trim())) return true;
  const digits = row.value.replace(/[^0-9]/g, "");
  if (digits.length >= 12) return true; // epoch ms / oversized id
  return false;
}

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
};

function stateFullName(value: string) {
  const v = value.trim();
  if (!v) return "";
  return US_STATES[v.toUpperCase()] ?? v;
}

function composeSiteAddress(raw?: Record<string, unknown>) {
  const street = rawGet(raw, ["site address", "street address", "address 1", "address line 1", "address"]);
  const city = rawGet(raw, ["site city", "city"]);
  const state = rawGet(raw, ["site state", "state", "st"]);
  const zip = rawGet(raw, ["zip", "zip code", "postal"]).replace(/[^0-9-]/g, "");
  const locality = [city, state].filter(Boolean).join(", ");
  return [street, locality, zip].filter(Boolean).join(", ").replace(/\s+,/g, ",").trim();
}

// Friendly type label per feature category — every popup leads with one.
function typeLabel(feature: MasterFeatureSummary) {
  const t = feature.layerTitle.toLowerCase();
  if (feature.category === "geography") {
    if (t.includes("division")) return "BioMed Division";
    if (t.includes("region")) return "BioMed Region";
    if (t.includes("district")) return "BioMed District";
    if (t.includes("chapter")) return "Chapter";
    if (t.includes("count")) return "County";
    return "Geography";
  }
  if (t.includes("hospital")) return "Hospital";
  if (t.includes("fixed site")) return "Fixed Collection Site";
  if (t.includes("mobile")) return "Mobile Blood Drive";
  if (t.includes("distribution")) return "Distribution Site";
  if (t.includes("manufactur") || t.includes("warehouse") || t.includes("kitting") || t.includes("irl")) return "Manufacturing & Logistics";
  return feature.layerTitle;
}

function cardInsight(feature: MasterFeatureSummary) {
  const t = feature.layerTitle.toLowerCase();
  if (t.includes("fixed site")) return "Fixed donor collection site feeding the BioMed supply chain.";
  if (t.includes("mobile")) return "Mobile BioMed blood drive in the community.";
  if (t.includes("distribution")) return "Distribution anchor routing blood products to hospitals.";
  if (t.includes("hospital")) return "Hospital receiving Red Cross blood products.";
  if (t.includes("manufactur") || t.includes("warehouse") || t.includes("kitting") || t.includes("irl"))
    return "Processing and logistics capacity in the BioMed network.";
  if (feature.category === "geography") return feature.impact;
  return feature.talkingPoint;
}

type CardModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: Array<{ label: string; value: string }>;
  stats: Array<{ label: string; value: string }>;
  insight: string;
  address: string;
  pills: Array<{ label: string; value: string }>;
  facts: Array<{ label: string; value: string }>;
};

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

// One model, filled the same way for every feature type → symmetric popups.
function buildCardModel(feature: MasterFeatureSummary): CardModel {
  const raw = feature.rawAttributes;
  const isGeo = feature.category === "geography";
  const eyebrow = typeLabel(feature);

  const city = rawGet(raw, ["site city", "city"]);
  const stateFull = stateFullName(rawGet(raw, ["site state", "state", "st"]));
  const placeName = rawGet(raw, ["site name donor view", "facility name", "site name", "donation center", "name"]);
  const hospitalName = rawGet(raw, ["hospital name", "hospital"]);
  const venue = rawGet(raw, ["account name", "account"]);
  const division = rawGet(raw, ["biomed division", "division"]);
  const region = rawGet(raw, ["biomed region", "region"]);

  // Title = primary identity; subtitle = supporting descriptor.
  let title: string;
  let subtitle: string;
  if (isGeo) {
    title = feature.title;
    subtitle = !/division/i.test(eyebrow) && division ? `${division} Division` : "";
  } else if (/hospital/i.test(eyebrow)) {
    title = hospitalName || placeName || feature.title;
    subtitle = [city, stateFull].filter(Boolean).join(", ");
  } else {
    title = city && stateFull ? `${city}, ${stateFull}` : placeName || feature.title;
    subtitle = venue;
  }

  // Identity chips.
  const chips: Array<{ label: string; value: string }> = [];
  if (isGeo) {
    if (/region|district|chapter|county/i.test(eyebrow) && division) chips.push({ label: "Division", value: division });
    if (/district|chapter|county/i.test(eyebrow) && region) chips.push({ label: "Region", value: region });
    if (/county/i.test(eyebrow) && stateFull) chips.push({ label: "State", value: stateFull });
  } else {
    const zip = rawGet(raw, ["zip", "zip code", "postal"]).replace(/[^0-9-]/g, "");
    const year = rawGet(raw, ["year"]).replace(/[^0-9]/g, "");
    const tier = rawGet(raw, ["final tier", "tier"]).match(/[123]/)?.[0] ?? "";
    const status = rawGet(raw, ["status"]);
    if (zip) chips.push({ label: "ZIP", value: zip });
    if (year) chips.push({ label: "Year", value: year });
    if (tier) chips.push({ label: "Tier", value: tier });
    if (status) chips.push({ label: "Status", value: status });
  }

  const stats = extractSiteMetrics(raw);
  const address = isGeo ? "" : composeSiteAddress(raw);

  const used = new Set(
    [title, subtitle, address, city, stateFull, ...chips.map((c) => c.value)].filter(Boolean).map(norm),
  );

  const pills = feature.geography
    .filter((row) => row.value && row.value.trim() && !isCodeRow(row))
    .filter((row) => !used.has(norm(row.value)));
  pills.forEach((row) => used.add(norm(row.value)));

  const facts = feature.sourceFields
    .filter((row) => row.value && row.value.trim())
    .filter((row) => !isCodeRow(row) && !isJunkFactRow(row))
    .filter((row) => !used.has(norm(row.value)))
    .filter((row) => !/^(city|state|st|zip|year|status|account name|division|region|district)$/i.test(row.label.trim()))
    .slice(0, 5);

  return { eyebrow, title, subtitle, chips, stats, insight: cardInsight(feature), address, pills, facts };
}

function CleanFeatureCard({
  feature,
  geoStats,
}: {
  feature: MasterFeatureSummary;
  geoStats?: Array<{ label: string; value: string }> | null;
}) {
  const model = buildCardModel(feature);
  const isGeo = feature.category === "geography";
  const stats = isGeo && geoStats && geoStats.length ? geoStats : model.stats;
  const directionsUrl = model.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(model.address)}`
    : "";

  return (
    <div className="jd-card">
      <header className="jd-card__hero">
        <p className="jd-card__eyebrow">{model.eyebrow}</p>
        <h3>{model.title}</h3>
        {model.subtitle && <p className="jd-card__venue">{model.subtitle}</p>}
        {model.chips.length > 0 && (
          <div className="jd-card__chips">
            {model.chips.map((chip) => (
              <span key={chip.label} className="jd-card__chip">
                <em>{chip.label}</em>
                {chip.value}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="jd-card__rule" aria-hidden="true" />

      {stats.length > 0 && (
        <div className="jd-card__rollup">
          {isGeo && <p className="jd-card__rollup-label">FY25 totals in this {model.eyebrow.replace(/^BioMed /, "").toLowerCase()}</p>}
          <div className="jd-card__stats" data-count={stats.length}>
            {stats.map((row, index) => (
              <div key={`${row.label}-${row.value}`} className="jd-card__stat" data-accent={index === 0 ? "true" : "false"}>
                <strong>{row.value}</strong>
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="jd-card__insight">{model.insight}</p>

      {model.address && (
        <div className="jd-card__address">
          <MapPin aria-hidden="true" size={15} />
          <span>{model.address}</span>
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noreferrer">
              Directions ↗
            </a>
          )}
        </div>
      )}

      {model.pills.length > 0 && (
        <div className="jd-card__pills" aria-label="Geographic context">
          {model.pills.map((row) => (
            <span key={`${row.label}-${row.value}`} className="jd-card__pill">
              <em>{row.label}</em>
              {row.value}
            </span>
          ))}
        </div>
      )}

      {model.facts.length > 0 && (
        <dl className="jd-card__facts">
          {model.facts.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {stats.length === 0 && !isGeo && (
        <p className="jd-card__note">No per-site counts on this layer — network counts are in the KPI band above.</p>
      )}
    </div>
  );
}

// Red Cross van driving source → hospital — same loader as the Ops Workbench.
function JdMapLoader() {
  return (
    <div className="jd__loading" role="status" aria-live="polite">
      <svg className="jd__loading-scene" viewBox="0 0 360 180" aria-hidden="true">
        <defs>
          <filter id="jd-loader-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#111827" floodOpacity="0.18" />
          </filter>
        </defs>
        <path className="jd__loading-road" d="M58 124 C118 86 178 88 232 108 S302 104 328 68" />
        <g className="jd__loading-node jd__loading-node--source" transform="translate(38 94)">
          <circle cx="24" cy="24" r="23" />
          <path d="M10 35h28V19L24 10 10 19z" />
          <path d="M15 35V23h8v12M27 35V23h8v12" />
        </g>
        <g className="jd__loading-node jd__loading-node--hospital" transform="translate(292 38)">
          <circle cx="24" cy="24" r="23" />
          <path d="M11 36h27V15H11z" />
          <path d="M21 19h7v6h6v7h-6v6h-7v-6h-6v-7h6z" />
        </g>
        <g className="jd__loading-van" filter="url(#jd-loader-shadow)">
          <rect className="jd__loading-van-body" x="0" y="0" width="64" height="34" rx="6" />
          <path className="jd__loading-van-cab" d="M44 8h13l9 10v16H44z" />
          <path className="jd__loading-van-window" d="M49 12h8l5 7H49z" />
          <path className="jd__loading-cross-h" d="M17 12h14v8H17z" />
          <path className="jd__loading-cross-v" d="M20 9h8v14h-8z" />
          <circle className="jd__loading-wheel" cx="16" cy="36" r="7" />
          <circle className="jd__loading-wheel" cx="51" cy="36" r="7" />
          <circle className="jd__loading-hub" cx="16" cy="36" r="3" />
          <circle className="jd__loading-hub" cx="51" cy="36" r="3" />
        </g>
      </svg>
      <strong>Loading BioMed jurisdiction map…</strong>
      <span>Connecting to the live Red Cross ArcGIS layers.</span>
    </div>
  );
}

/**
 * Branding for the live jurisdiction map engine. Defaults render the
 * Jurisdiction Dashboard; the Explore Regions tile reuses the same engine with
 * a different brand + community-impact content in its About modal.
 */
// A count-of-features KPI: find the operational layer by title tokens, count its
// features in the active geography. Used by the Infrastructure Dashboard instead
// of the FY25 collection sums.
export type InfraKpiDef = {
  key: string;
  label: string;
  hint: string;
  /** OR-of-AND title token groups to locate the layer to count. */
  layerTokens: string[][];
  /** Render as the accent (highlighted) KPI card. */
  accent?: boolean;
};

export type JurisdictionBrand = {
  testId: string;
  appTitle: string;
  signInHeading: string;
  signInCopy: string;
  aboutTitle: string;
  aboutLead: string;
  calloutTitle: string;
  calloutSub: string;
  /** Extra sections injected into the About modal (e.g. community impact). */
  aboutExtra?: ReactNode;
  /** Portal layers to add on top of the web map (defaults to mobile collections). */
  supplementalLayers?: ArcJurisdictionSupplementalLayerSource[];
  /** When set, the KPI band shows these count-of-site cards instead of FY25 sums. */
  infraKpis?: InfraKpiDef[];
  /** Preset applied on first load (defaults to "minimal"). */
  initialPreset?: PresetId;
  /** Heading shown above the filter panel (defaults to "Filter by Geography"). */
  filterHeading?: string;
};

export const DEFAULT_JURISDICTION_BRAND: JurisdictionBrand = {
  testId: "jurisdiction-dashboard",
  appTitle: "Jurisdiction Dashboard",
  signInHeading: "Sign in to load the Jurisdiction Dashboard",
  signInCopy:
    "This dashboard reads live, private Red Cross ArcGIS layers. Sign in to load boundaries, filters, and FY25 counts.",
  aboutTitle: "About the Jurisdiction Dashboard",
  aboutLead:
    "A single, authoritative view of BioMed operational geography — boundaries, territories, fixed and mobile collection sites, and FY25 performance — that anyone can read without GIS training.",
  calloutTitle: "BioMed Operating Picture",
  calloutSub: "Boundaries, territory counts, and clickable sites in one place.",
  supplementalLayers: jurisdictionDashboardSupplementalLayers,
};

export default function JurisdictionDashboardPage({
  brand = DEFAULT_JURISDICTION_BRAND,
}: {
  brand?: JurisdictionBrand;
}) {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  const [mapReady, setMapReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const leftWidth = 380;
  const rightWidth = 380;

  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [options, setOptions] = useState<Record<LevelId, string[]>>({ division: [], region: [], district: [] });
  const [kpis, setKpis] = useState<Record<string, number | null>>({});
  const [kpiLoading, setKpiLoading] = useState(false);
  const [siteCount, setSiteCount] = useState<number | null>(null);

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteQuery, setSiteQuery] = useState("");
  const [activeFeature, setActiveFeature] = useState<MasterFeatureSummary | null>(null);
  const [coincidentHits, setCoincidentHits] = useState<CoincidentHit[]>([]);
  const [activeHitKey, setActiveHitKey] = useState<string | null>(null);
  const [geoStats, setGeoStats] = useState<Array<{ label: string; value: string }> | null>(null);
  const [rightTab, setRightTab] = useState<"sites" | "detail">("sites");
  const [leftTab, setLeftTab] = useState<"search" | "filters" | "layers">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResults, setSearchResults] = useState<BiomedSearchResult[]>([]);
  const searchRunRef = useRef(0);
  const [preset, setPreset] = useState<PresetId>("minimal");
  const [layerSnaps, setLayerSnaps] = useState<BioMedLayerSnapshot[]>([]);
  const [layerGroupsOpen, setLayerGroupsOpen] = useState<Record<string, boolean>>({});
  const [aboutOpen, setAboutOpen] = useState(false);

  // Resolved live layers (refs so effects can read without re-subscribing).
  const sourceLayerRef = useRef<FeatureLayer | null>(null); // KPI + filter backbone (ZIP/FY25 data)
  const siteLayerRef = useRef<FeatureLayer | null>(null); // Fixed sites point layer
  const kpiFieldRef = useRef<Record<string, string>>({});
  // The name field actually chosen for each level (the one that yields names,
  // not codes) on the source layer.
  const chosenFieldRef = useRef<Partial<Record<LevelId, string>>>({});

  // Fail-open loader so a slow ArcGIS init can never leave the loader stuck.
  useEffect(() => {
    if (!isAuthenticated) {
      setMapReady(true);
      return;
    }
    setMapReady(false);
    // Last-resort only: hydrate()'s finally{} is the real reveal. Keep this long
    // so it never reveals an unstyled map mid-load on a slow connection.
    const timer = window.setTimeout(() => setMapReady(true), 20000);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  const selectionWhere = useCallback(
    (layer: FeatureLayer | null | undefined) => (layer ? buildWhereForLayer(layer, selection, chosenFieldRef.current) : "1=1"),
    [selection],
  );

  // The lifted chapter-view BIOMED group exists for popups/data, not the toggle
  // list — its 14 choropleth/dot layers would drown the dashboard's own layers.
  const isLiftedBiomedTitle = (title: string) => {
    const t = title.trim().toLowerCase();
    return (
      t === "biomed" ||
      /^(rbc collections|drives) by (county|chapter|region|division|biomedical district)$/.test(t) ||
      ["blood drives by type", "blood drives planned or completed", "latino blood drives", "total collections (rbc)"].includes(t)
    );
  };

  const refreshLayerSnaps = useCallback(() => {
    setLayerSnaps(
      buildLayerSnapshots(getMapElementMap(mapRef.current)).filter(
        (snap) => !isHsTitle(snap.title) && !isLiftedBiomedTitle(snap.title),
      ),
    );
  }, []);

  const applyPreset = useCallback(
    (nextPreset: PresetId) => {
      setPreset(nextPreset);
      const map = getMapElementMap(mapRef.current);
      if (!map) return;
      collectArcJurisdictionLayers(map).forEach((layer) => {
        const visible = shouldShowLayerForPreset(safeLayerTitle(layer), nextPreset);
        if (layer.visible !== visible) layer.visible = visible;
      });
      refreshLayerSnaps();
    },
    [refreshLayerSnaps],
  );

  const toggleMapLayer = useCallback(
    (layerId: string) => {
      const map = getMapElementMap(mapRef.current);
      if (!map) return;
      const layer = collectArcJurisdictionLayers(map).find((candidate) => candidate.id === layerId);
      if (!layer) return;
      layer.visible = !layer.visible;
      refreshLayerSnaps();
    },
    [refreshLayerSnaps],
  );

  // ---- Discover layers + filter options on first hydrate ----------------
  const discoverLayers = useCallback((map: ArcGISMap) => {
    const featureLayers = collectArcJurisdictionLayers(map).filter(isQueryableFeatureLayer);

    // Source layer: prefer the FY25 ZIP data layer (network-wide totals), then
    // any layer carrying jurisdiction fields + numeric metric fields.
    const byTitle = (tokens: string[]) =>
      featureLayers.find((layer) => {
        const t = safeLayerTitle(layer).toLowerCase();
        return tokens.every((token) => t.includes(token));
      });

    const source =
      byTitle(["fy25"]) ||
      featureLayers.find((layer) => safeLayerTitle(layer).toLowerCase().includes("zip")) ||
      featureLayers.find((layer) => layerHasAnyLevelField(layer) && KPI_DEFS.some((def) => findField(layer.fields ?? [], def.tokens, { numeric: true }))) ||
      null;

    const siteLayer = byTitle(["fixed", "site"]) || byTitle(["fixed site"]) || null;

    sourceLayerRef.current = source;
    siteLayerRef.current = siteLayer ?? source;

    // Resolve KPI field names once.
    if (source) {
      const resolved: Record<string, string> = {};
      KPI_DEFS.forEach((def) => {
        const field = findField(source.fields ?? [], def.tokens, { numeric: true });
        if (field) resolved[def.key] = field.name;
      });
      kpiFieldRef.current = resolved;
    }
    return source;
  }, []);

  const loadOptions = useCallback(async (level: LevelId, parent: Selection) => {
    const layer = sourceLayerRef.current;
    if (!layer) return [] as string[];
    const candidates = levelNameFieldCandidates(layer.fields ?? [], level);
    if (candidates.length === 0) return [] as string[];

    // Try each candidate field; keep the first that returns human NAMES, not
    // codes. Cache that choice so KPI/where queries stay consistent.
    for (const field of candidates) {
      try {
        const query = layer.createQuery();
        query.where = buildWhereForLayer(layer, { ...parent, [level]: "" }, chosenFieldRef.current);
        query.outFields = [field.name];
        query.returnDistinctValues = true;
        query.returnGeometry = false;
        query.orderByFields = [field.name];
        query.num = 2000;
        const result = await layer.queryFeatures(query);
        const values = result.features
          .map((feature) => feature.attributes?.[field.name])
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => value.trim());
        const unique = Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
        if (unique.length === 0) continue;
        const nameLike = unique.filter((value) => !looksLikeCodeValue(value)).length;
        const isLastCandidate = field === candidates[candidates.length - 1];
        if (nameLike >= unique.length / 2 || isLastCandidate) {
          chosenFieldRef.current[level] = field.name;
          return unique;
        }
      } catch {
        // try the next candidate field
      }
    }
    return [] as string[];
  }, []);

  const refreshOptionsFor = useCallback(
    async (changedLevel: LevelId | "all", nextSelection: Selection) => {
      const next: Record<LevelId, string[]> = { division: [], region: [], district: [] };
      next.division = await loadOptions("division", { division: "", region: "", district: "" });
      next.region = nextSelection.division ? await loadOptions("region", { ...nextSelection, region: "", district: "" }) : [];
      next.district = nextSelection.region ? await loadOptions("district", { ...nextSelection, district: "" }) : [];
      setOptions(next);
    },
    [loadOptions],
  );

  // ---- Compute KPIs + site list for the active selection ----------------
  const computeKpis = useCallback(async (sel: Selection) => {
    // Infrastructure mode: count features in named site layers, not FY25 sums.
    if (brand.infraKpis) {
      setKpiLoading(true);
      const map = getMapElementMap(mapRef.current);
      const layers = collectArcJurisdictionLayers(map).filter(isQueryableFeatureLayer);
      // Site layers (hospitals, warehouses, distribution, …) carry NO BioMed
      // jurisdiction fields, so attribute-scoped counts return 0. Scope SPATIALLY
      // instead: count features whose point falls inside the selected boundary
      // polygon. With no selection, count the network nationally.
      const hasSelection = LEVELS.some((level) => sel[level]);
      const boundaryGeom = hasSelection && map ? await queryBoundaryGeometry(map, sel, chosenFieldRef.current) : null;
      const next: Record<string, number | null> = {};
      await Promise.all(
        brand.infraKpis.map(async (def) => {
          const target = layers.find((candidate) => {
            const t = safeLayerTitle(candidate).toLowerCase();
            return def.layerTokens.some((group) => group.every((token) => t.includes(token)));
          });
          if (!target) {
            next[def.key] = null;
            return;
          }
          try {
            if (boundaryGeom) {
              next[def.key] = await target.queryFeatureCount({
                geometry: boundaryGeom,
                spatialRelationship: "intersects",
                where: "1=1",
              } as never);
            } else {
              next[def.key] = await target.queryFeatureCount({ where: "1=1" } as never);
            }
          } catch {
            next[def.key] = null;
          }
        }),
      );
      setKpis(next);
      setKpiLoading(false);
      return;
    }

    const layer = sourceLayerRef.current;
    if (!layer) return;
    setKpiLoading(true);
    const where = buildWhereForLayer(layer, sel, chosenFieldRef.current);
    const fields = kpiFieldRef.current;

    const sums = KPI_DEFS.filter((def) => fields[def.key]).map((def) => ({ def, fieldName: fields[def.key] }));

    try {
      const query = layer.createQuery();
      query.where = where;
      query.returnGeometry = false;
      query.outStatistics = sums.map(({ def, fieldName }) => ({
        statisticType: "sum",
        onStatisticField: fieldName,
        outStatisticFieldName: `s_${def.key}`,
      })) as never;
      const result = await layer.queryFeatures(query);
      const attrs = result.features?.[0]?.attributes ?? {};
      const next: Record<string, number | null> = {};
      KPI_DEFS.forEach((def) => {
        next[def.key] = fields[def.key] ? Number(attrs[`s_${def.key}`] ?? 0) : null;
      });
      setKpis(next);
    } catch {
      setKpis(Object.fromEntries(KPI_DEFS.map((def) => [def.key, null])));
    } finally {
      setKpiLoading(false);
    }

    // Fixed-site count for the selection.
    const siteLayer = siteLayerRef.current;
    if (siteLayer) {
      try {
        const count = await siteLayer.queryFeatureCount({ where: buildWhereForLayer(siteLayer, sel, chosenFieldRef.current) } as never);
        setSiteCount(count);
      } catch {
        setSiteCount(null);
      }
    }
  }, [brand.infraKpis]);

  // FY25 counts scoped to a clicked geography boundary — shown in its popup so
  // a Division/Region/District selection carries its own metrics (like the KPIs).
  const computeGeoStats = useCallback(async (feature: MasterFeatureSummary) => {
    const layer = sourceLayerRef.current;
    const name = feature.title?.trim();
    if (!layer || feature.category !== "geography" || !name) {
      setGeoStats(null);
      return;
    }
    const t = feature.layerTitle.toLowerCase();
    const raw = feature.rawAttributes;
    const sel: Selection = { division: "", region: "", district: "" };
    if (t.includes("division")) {
      sel.division = name;
    } else if (t.includes("district")) {
      sel.district = name;
      sel.region = rawGet(raw, ["biomed region", "region"]);
      sel.division = rawGet(raw, ["biomed division", "division"]);
    } else if (t.includes("region")) {
      sel.region = name;
      sel.division = rawGet(raw, ["biomed division", "division"]);
    } else {
      setGeoStats(null);
      return;
    }

    const fields = kpiFieldRef.current;
    const defs = KPI_DEFS.filter((def) => fields[def.key]);
    try {
      const query = layer.createQuery();
      query.where = buildWhereForLayer(layer, sel, chosenFieldRef.current);
      query.returnGeometry = false;
      query.outStatistics = defs.map((def) => ({
        statisticType: "sum",
        onStatisticField: fields[def.key],
        outStatisticFieldName: `g_${def.key}`,
      })) as never;
      const result = await layer.queryFeatures(query);
      const attrs = result.features?.[0]?.attributes ?? {};
      const out = defs.map((def) => ({
        label: def.label.replace(/^FY25 /, ""),
        value: Math.round(Number(attrs[`g_${def.key}`] ?? 0)).toLocaleString(),
      }));
      const siteLayer = siteLayerRef.current;
      if (siteLayer) {
        try {
          const count = await siteLayer.queryFeatureCount({ where: buildWhereForLayer(siteLayer, sel, chosenFieldRef.current) } as never);
          out.push({ label: "Fixed Sites", value: count.toLocaleString() });
        } catch {
          // site count optional
        }
      }
      setGeoStats(out);
    } catch {
      setGeoStats(null);
    }
  }, []);

  const loadSites = useCallback(async (sel: Selection) => {
    const layer = siteLayerRef.current;
    if (!layer) {
      setSites([]);
      return;
    }
    try {
      const titleField = findField(layer.fields ?? [], SITE_TITLE_TOKENS) ?? layer.fields?.find((field) => field.name === layer.displayField);
      const cityField = findField(layer.fields ?? [], [["city"]]);
      const stateField = findField(layer.fields ?? [], [["state"]]);
      const query = layer.createQuery();
      query.where = buildWhereForLayer(layer, sel, chosenFieldRef.current);
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.num = 250;
      if (titleField) query.orderByFields = [titleField.name];
      const result = await layer.queryFeatures(query);
      const layerTitle = safeLayerTitle(layer);
      const rows: SiteRow[] = result.features.flatMap((graphic, index) => {
        const attrs = graphic.attributes ?? {};
        // Drop unnamed features instead of showing placeholder "Site 1/2/3" rows.
        const title = titleField ? `${attrs[titleField.name] ?? ""}`.trim() : "";
        if (!title) return [];
        const city = cityField ? `${attrs[cityField.name] ?? ""}`.trim() : "";
        const state = stateField ? `${attrs[stateField.name] ?? ""}`.trim() : "";
        const subtitle = [city, state].filter(Boolean).join(", ");
        return [{
          id: `${layer.id}-${index}-${title}`,
          title,
          subtitle,
          graphic,
          layerTitle,
          drives: rawNumber(attrs, SITE_DRIVES_TOKENS),
          volume: rawNumber(attrs, SITE_VOLUME_TOKENS),
        }];
      });
      setSites(rows);
    } catch {
      setSites([]);
    }
  }, []);

  // Red outline around the selected division/region/district boundary.
  const selectionOutlineRef = useRef<Graphic | null>(null);

  // ---- Apply selection to the map (definitionExpression + zoom) ---------
  const applySelectionToMap = useCallback(async (sel: Selection) => {
    const map = getMapElementMap(mapRef.current);
    const view = mapRef.current?.view as MapView | undefined;
    if (!map) return;

    // Outline the selected geography — shared implementation across all maps.
    if (view) {
      selectionOutlineRef.current = (await drawSelectionOutline(
        map,
        view,
        sel,
        chosenFieldRef.current,
        selectionOutlineRef.current,
      )) as Graphic | null;
    }

    // Filter only data layers (sites, ZIP, collection operations) so boundary
    // polygons stay visible for context. Boundary layers are filtered only when
    // they carry a matching jurisdiction field (keeps the selected boundary).
    collectArcJurisdictionLayers(map)
      .filter(isQueryableFeatureLayer)
      .forEach((layer) => {
        const where = buildWhereForLayer(layer, sel, chosenFieldRef.current);
        if (where !== "1=1" && !layerHasAnyLevelField(layer)) return;
        try {
          layer.definitionExpression = where;
        } catch {
          // Some sublayers reject definitionExpression; ignore.
        }
      });

    // Zoom to the LIVE ICONS (point sites) in the selection, clipped to the
    // continental US so Alaska/Hawaii/territory outliers don't blow out the view.
    const layer = sourceLayerRef.current;
    const hasSelection = LEVELS.some((level) => sel[level]);
    if (view && hasSelection) {
      try {
        const iconExtent = await computeSelectionZoomExtent(map, sel, chosenFieldRef.current);
        if (iconExtent) {
          await view.goTo(iconExtent, { duration: 650 });
        } else if (layer) {
          // Fallback: no point icons in scope — use the filtered backbone extent.
          const extentResult = await (layer as FeatureLayer & {
            queryExtent?: (q: unknown) => Promise<{ extent?: Extent | null }>;
          }).queryExtent?.({ where: buildWhereForLayer(layer, sel, chosenFieldRef.current) });
          if (extentResult?.extent) await view.goTo(extentResult.extent.clone().expand(1.15), { duration: 650 });
        }
      } catch {
        // Navigation can be interrupted; selection still applies.
      }
    } else if (view && !hasSelection) {
      try {
        await view.goTo({ center: HOME_CENTER, zoom: ZOOM }, { duration: 650 });
      } catch {
        // ignore
      }
    }
  }, []);

  // React to selection changes (after layers discovered).
  useEffect(() => {
    if (!isAuthenticated || !sourceLayerRef.current) return;
    void computeKpis(selection);
    void loadSites(selection);
    void applySelectionToMap(selection);
  }, [selection, isAuthenticated, computeKpis, loadSites, applySelectionToMap]);

  // Recompute scoped FY25 metrics whenever a geography boundary is selected.
  useEffect(() => {
    if (activeFeature && activeFeature.category === "geography") void computeGeoStats(activeFeature);
    else setGeoStats(null);
  }, [activeFeature, computeGeoStats]);

  const onSelectLevel = useCallback(
    (level: LevelId, value: string) => {
      setSelection((current) => {
        const next: Selection = { ...current, [level]: value };
        // Reset descendants.
        if (level === "division") {
          next.region = "";
          next.district = "";
        } else if (level === "region") {
          next.district = "";
        }
        void refreshOptionsFor(level, next);
        return next;
      });
    },
    [refreshOptionsFor],
  );

  const resetAll = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setCoincidentHits([]);
    setActiveHitKey(null);
    setActiveFeature(null);
    setSiteQuery("");
    setRightTab("sites");
    applyPreset(brand.initialPreset ?? "minimal");
    const layer = sourceLayerRef.current;
    if (layer) void refreshOptionsFor("all", EMPTY_SELECTION);
  }, [refreshOptionsFor, applyPreset, brand.initialPreset]);

  // Enrich one graphic and show it in the detail card. Shared by map clicks and the
  // coincident-feature picker so both produce the same readout.
  const applyGraphicSelection = useCallback(async (graphic: Graphic) => {
    const enriched = await enrichGraphic(graphic);
    const summary = summarizeMasterFeature(enriched, undefined, true);
    setActiveFeature(summary);
    setRightTab("detail");
    setRightOpen(true);
  }, []);

  // Feature search (Search tab) — shared with the Atlas via the same util.
  const selectSearchResult = useCallback(async (result: BiomedSearchResult) => {
    const view = mapRef.current?.view as MapView | undefined;
    const geometry = result.graphic.geometry as Geometry | null | undefined;
    if (view && geometry) {
      try {
        await view.goTo(zoomTargetForGeometry(geometry), { duration: 650 });
      } catch { /* navigation interrupted */ }
    }
    void applyGraphicSelection(result.graphic);
    setRightOpen(true);
  }, [applyGraphicSelection]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchStatus(!isAuthenticated && term.length > 0 ? "blocked" : "idle");
      return;
    }
    if (!isAuthenticated) { setSearchStatus("blocked"); setSearchResults([]); return; }
    searchRunRef.current += 1;
    const runId = searchRunRef.current;
    setSearchStatus("searching");
    const handle = window.setTimeout(async () => {
      const map = getMapElementMap(mapRef.current);
      if (!map) { setSearchStatus("error"); return; }
      try {
        const results = await runBiomedFeatureSearch(map, term);
        if (runId !== searchRunRef.current) return;
        setSearchResults(results);
        setSearchStatus(results.length > 0 ? "ready" : "empty");
      } catch {
        if (runId === searchRunRef.current) setSearchStatus("error");
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchQuery, isAuthenticated]);

  const selectCoincidentHit = useCallback(
    (hit: CoincidentHit) => {
      setActiveHitKey(hit.key);
      void applyGraphicSelection(hit.graphic);
    },
    [applyGraphicSelection],
  );

  const selectSite = useCallback(async (row: SiteRow) => {
    const summary = summarizeMasterFeature(row.graphic, row.layerTitle, true);
    setCoincidentHits([]);
    setActiveHitKey(null);
    setActiveFeature(summary);
    setRightTab("detail");
    setRightOpen(true);
    const view = mapRef.current?.view as MapView | undefined;
    const geometry = row.graphic.geometry as Geometry | null | undefined;
    if (!view || !geometry) return;
    try {
      await view.goTo(zoomTargetForGeometry(geometry), { duration: 600 });
    } catch {
      // ignore interrupted navigation
    }
  }, []);

  // ---- Map hydration: style, popup-off, click → clean card --------------
  useEffect(() => {
    let cancelled = false;
    const handles: WatchHandle[] = [];

    async function hydrate() {
      if (!isAuthenticated) return;
      const mapElement = mapRef.current;
      const view = mapElement?.view as (MapView & { popupEnabled?: boolean; popup?: { close?: () => void } }) | undefined;
      if (!mapElement || !view) {
        setMapReady(true);
        return;
      }

      // Reveal the map ONLY after every step below — loaded, styled, markered,
      // popups off, preset applied — so the user never sees raw default icons or
      // a half-built map. finally{} guarantees the loader never sticks.
      try {
        await view.when?.();
        if (cancelled) return;

        const map = getMapElementMap(mapElement);
        if (!map) return;

        // Add supplemental portal layers (brand-specific; defaults to mobile collections).
        await addArcgisPortalLayers(map, brand.supplementalLayers ?? jurisdictionDashboardSupplementalLayers);
        if (cancelled) return;

        // Load EVERY operational feature layer before styling so none flash with
        // their default ArcGIS symbology while the view is already visible.
        const featureLayers = collectArcJurisdictionLayers(map).filter(isQueryableFeatureLayer);
        await Promise.allSettled(featureLayers.map((layer) => layer.load?.()));
        if (cancelled) return;

        hideBasemapUtilityLayers(map);
        await applyPresentationMapStyle(map, view);
        await applyPresentationMarkers(map);
        if (cancelled) return;

        // Kill default ArcGIS popups everywhere — info goes to the right panel.
        view.popupEnabled = false;
        view.popup?.close?.();
        collectArcJurisdictionLayers(map).forEach((layer) => {
          if ("popupEnabled" in layer) (layer as Layer & { popupEnabled?: boolean }).popupEnabled = false;
          if ("popupTemplate" in layer) (layer as Layer & { popupTemplate?: unknown }).popupTemplate = null;
        });

        discoverLayers(map);

        // Start at the minimal preset and track per-layer visibility changes.
        applyPreset(brand.initialPreset ?? "minimal");
        collectArcJurisdictionLayers(map).forEach((layer) => {
          const handle = (layer as Layer & { watch?: (name: string, cb: () => void) => WatchHandle }).watch?.("visible", refreshLayerSnaps);
          if (handle) handles.push(handle);
        });
        refreshLayerSnaps();

        attachClickHandler(view);

        // Everything is applied — now reveal the finished map.
        if (!cancelled) setMapReady(true);

        // Lift the chapter-view BIOMED layers in as a hidden group (non-blocking —
        // they default off, so this never gates the reveal). Available for the
        // right-panel popups; disable their Esri popups + refresh the snapshot list.
        void addChapterViewBiomedGroup(map).then(({ added }) => {
          if (cancelled || added.length === 0) return;
          collectArcJurisdictionLayers(map).forEach((layer) => {
            if ("popupEnabled" in layer) (layer as Layer & { popupEnabled?: boolean }).popupEnabled = false;
            if ("popupTemplate" in layer) (layer as Layer & { popupTemplate?: unknown }).popupTemplate = null;
            // Lifted layers stay hidden on the dashboards — present for data
            // queries/popups, never as visible overlays here.
            if (isLiftedBiomedTitle(safeLayerTitle(layer))) layer.visible = false;
          });
          discoverLayers(map);
          refreshLayerSnaps();
        });

        // Seed filters/KPIs/sites after reveal (does not gate the map).
        await refreshOptionsFor("all", EMPTY_SELECTION);
        if (cancelled) return;
        await computeKpis(EMPTY_SELECTION);
        await loadSites(EMPTY_SELECTION);
      } catch {
        // swallow — finally still reveals so the loader can't get stuck
      } finally {
        if (!cancelled) setMapReady(true);
      }
    }

    function attachClickHandler(view: MapView & { popup?: { close?: () => void } }) {
      const mapElement = mapRef.current;
      const clickHandle = view.on("click", async (event) => {
        try {
          view.popup?.close?.();
          const hit = await view.hitTest(event);
          // Only real operational layers — drop the cleaned-boundary overlays and
          // basemap so a click never resolves to "... (clean)" with no data.
          // Only real operational layers — drop cleaned-boundary overlays and basemap.
          const opLayerIds = new Set(collectArcJurisdictionLayers(getMapElementMap(mapElement)).map((layer) => String(layer.id)));
          const hits = collectCoincidentHits(hit.results as Array<{ type: string; graphic?: Graphic }>, opLayerIds);
          // Only stacked POINT icons trigger the picker — a single point always sits over
          // county/ZIP polygons, and priority already resolves point-over-polygon.
          const pointHits = hits.filter((entry) => entry.isPoint);
          if (pointHits.length > 1) {
            setCoincidentHits(pointHits);
            setActiveHitKey(null);
            setActiveFeature(null);
            setRightTab("detail");
            setRightOpen(true);
          } else {
            setCoincidentHits([]);
            setActiveHitKey(null);
            if (hits[0]) {
              await applyGraphicSelection(hits[0].graphic);
            } else {
              setActiveFeature(null);
            }
          }
        } catch {
          setCoincidentHits([]);
          setActiveHitKey(null);
          setActiveFeature(null);
        }
      });
      handles.push(clickHandle);
    }

    const mapElement = mapRef.current;
    if (mapElement?.view) void hydrate();
    else mapElement?.addEventListener("arcgisViewReadyChange", hydrate, { once: true } as AddEventListenerOptions);

    return () => {
      cancelled = true;
      handles.forEach((handle) => handle.remove?.());
    };
  }, [isAuthenticated, discoverLayers, refreshOptionsFor, computeKpis, loadSites, applyPreset, refreshLayerSnaps, applyGraphicSelection]);

  const filteredSites = useMemo(() => {
    const term = siteQuery.trim().toLowerCase();
    if (!term) return sites;
    return sites.filter((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes(term));
  }, [sites, siteQuery]);

  // Max per metric across the visible list, so the mini bars compare like-for-like.
  const siteMax = useMemo(
    () => ({
      drives: Math.max(1, ...filteredSites.map((row) => row.drives ?? 0)),
      volume: Math.max(1, ...filteredSites.map((row) => row.volume ?? 0)),
    }),
    [filteredSites],
  );
  const anySiteMetrics = useMemo(
    () => filteredSites.some((row) => row.drives != null || row.volume != null),
    [filteredSites],
  );

  // Zoom the map back out to frame every site in the current list.
  const zoomToSites = useCallback(async () => {
    const view = mapRef.current?.view as MapView | undefined;
    if (!view) return;
    const points = filteredSites
      .map((row) => row.graphic?.geometry as { x?: number; y?: number; spatialReference?: unknown } | null | undefined)
      .filter((geom): geom is { x: number; y: number; spatialReference?: unknown } => typeof geom?.x === "number" && typeof geom?.y === "number");
    if (points.length === 0) return;
    if (points.length === 1) {
      const only = filteredSites.find((row) => row.graphic?.geometry)?.graphic.geometry as Geometry | undefined;
      if (only) await view.goTo(zoomTargetForGeometry(only), { duration: 650 }).catch(() => {});
      return;
    }
    const box = points.reduce(
      (acc, p) => ({
        xmin: Math.min(acc.xmin, p.x),
        ymin: Math.min(acc.ymin, p.y),
        xmax: Math.max(acc.xmax, p.x),
        ymax: Math.max(acc.ymax, p.y),
      }),
      { xmin: Infinity, ymin: Infinity, xmax: -Infinity, ymax: -Infinity },
    );
    const padX = Math.max((box.xmax - box.xmin) * 0.14, 0.4);
    const padY = Math.max((box.ymax - box.ymin) * 0.14, 0.4);
    const extent = new Extent({
      xmin: box.xmin - padX,
      ymin: box.ymin - padY,
      xmax: box.xmax + padX,
      ymax: box.ymax + padY,
      spatialReference: points[0].spatialReference as never,
    });
    await view.goTo(extent, { duration: 650 }).catch(() => {});
  }, [filteredSites]);

  const activeFilterChips = useMemo(
    () => LEVELS.filter((level) => selection[level]).map((level) => ({ level, value: selection[level] })),
    [selection],
  );

  const scopeLabel = useMemo(() => {
    if (selection.district) return selection.district;
    if (selection.region) return selection.region;
    if (selection.division) return selection.division;
    return "National — all BioMed geography";
  }, [selection]);

  const authLabel =
    status === "checking"
      ? "Checking ArcGIS…"
      : status === "signing-in"
        ? "Signing in…"
        : isAuthenticated
          ? `Signed in${userId ? ` · ${userId}` : ""}`
          : "Sign in for live data";

  return (
    <section
      className="jd"
      data-left-open={leftOpen ? "true" : "false"}
      data-right-open={rightOpen ? "true" : "false"}
      style={{ ["--jd-left" as string]: `${leftWidth}px`, ["--jd-right" as string]: `${rightWidth}px` }}
      data-testid={brand.testId}
    >
      <RcAppBar title={brand.appTitle}>
        <span className="rcbar__chip" title="Current geographic scope">
          <MapPin aria-hidden="true" size={15} />
          {scopeLabel}
        </span>
        <label className="rcbar__field">
          Quick View
          <select
            value={preset}
            disabled={!isAuthenticated}
            onChange={(event) => applyPreset(event.target.value as PresetId)}
            data-testid="jd-quickview"
          >
            {PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="rcbar__btn" onClick={resetAll} data-testid="jd-reset">
          <RotateCcw aria-hidden="true" size={15} />
          Reset
        </button>
        <button
          type="button"
          className="rcbar__icon"
          onClick={() => setAboutOpen(true)}
          aria-label="About this tool"
          title="About this tool"
        >
          <HelpCircle aria-hidden="true" size={18} />
        </button>
        <div className="rcbar__auth" data-on={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </RcAppBar>

      {/* KPI band */}
      <div className="jd__kpis" data-testid="jd-kpis">
        {brand.infraKpis
          ? brand.infraKpis.map((def) => (
              <article key={def.key} className={`jd__kpi${def.accent ? " jd__kpi--accent" : ""}`} title={def.hint}>
                <span className="jd__kpi-label">{def.label}</span>
                <strong className="jd__kpi-value" data-loading={kpiLoading ? "true" : "false"}>
                  {kpis[def.key] == null ? "—" : formatNumber(kpis[def.key])}
                </strong>
              </article>
            ))
          : (
            <>
              {KPI_DEFS.map((def) => (
                <article key={def.key} className="jd__kpi" title={def.hint}>
                  <span className="jd__kpi-label">{def.label}</span>
                  <strong className="jd__kpi-value" data-loading={kpiLoading ? "true" : "false"}>
                    {kpis[def.key] == null ? "—" : formatNumber(kpis[def.key])}
                  </strong>
                </article>
              ))}
              <article className="jd__kpi jd__kpi--accent" title="Fixed collection sites in the selected geography">
                <span className="jd__kpi-label">Fixed Sites</span>
                <strong className="jd__kpi-value">{siteCount == null ? "—" : formatNumber(siteCount)}</strong>
              </article>
            </>
          )}
      </div>

      <div className="jd__stage">
        {/* LEFT — filters */}
        <aside className="jd__panel jd__panel--left" aria-label="Filters" data-collapsed={leftOpen ? "false" : "true"}>
          {!leftOpen && (
            <div className="jd__rail">
              <button type="button" className="jd__rail-btn" aria-label="Open filters" title="Show filters" onClick={() => setLeftOpen(true)}>
                <ChevronRight aria-hidden="true" size={18} />
              </button>
              <Link to="/hub" className="jd__rail-home" aria-label="Home" title="Home">
                <Home aria-hidden="true" size={18} />
              </Link>
              <span className="jd__rail-label">Filters</span>
            </div>
          )}
          {leftOpen && (
          <>
            <div className="jd__panel-top">
              <Link to="/hub" className="jd__panel-home" aria-label="Home" title="Home">
                <Home aria-hidden="true" size={16} />
              </Link>
              <MapTabBar
                ariaLabel="Sidebar views"
                active={leftTab}
                onSelect={setLeftTab}
                tabs={[
                  { id: "search", label: "Search", Icon: Search, testId: "jd-tab-search" },
                  { id: "layers", label: "Layers", Icon: Layers, badge: layerSnaps.length > 0 ? layerSnaps.filter((s) => s.visible).length : undefined, testId: "jd-tab-layers" },
                  { id: "filters", label: "Geography", Icon: MapPin, testId: "jd-tab-filters" },
                ]}
              />
              <button type="button" className="jd__collapse-btn" aria-label="Collapse panel" title="Hide panel" onClick={() => setLeftOpen(false)}>
                <ChevronLeft aria-hidden="true" size={16} />
                <span className="jd__btn-label">Hide</span>
              </button>
            </div>

            <div className="jd__panel-subhead">
              <h2>{leftTab === "search" ? "Search" : leftTab === "filters" ? (brand.filterHeading ?? "Filter by Geography") : "Map Layers"}</h2>
              <p>{leftTab === "search" ? "Find a county, region, district, or site." : leftTab === "filters" ? "Drill from division to district." : "Toggle what shows on the map."}</p>
            </div>

            {leftTab === "search" ? (
              <FeatureSearch
                query={searchQuery}
                onQueryChange={setSearchQuery}
                status={searchStatus}
                resultsTestId="jd-search-results"
                results={searchResults.map((result) => ({
                  id: result.id,
                  title: result.title,
                  subtitle: result.layerTitle,
                  onSelect: () => void selectSearchResult(result),
                }))}
              />
            ) : leftTab === "layers" ? (
              !isAuthenticated ? (
                <div className="mshell__layers"><p className="mshell__empty">Sign in to load map layers.</p></div>
              ) : (
                <LayerList
                  testId="jd-layer-list"
                  groups={LAYER_TYPE_GROUPS.map((groupDef) => ({
                    id: groupDef.id,
                    label: groupDef.label,
                    rows: layerSnaps
                      .filter((snap) => groupDef.categories.includes(snap.category))
                      .map((snap) => ({ id: snap.id, title: snap.title, summary: snap.summary, category: snap.category, visible: snap.visible })),
                  }))}
                  openGroups={layerGroupsOpen}
                  onToggleGroup={(groupId) => setLayerGroupsOpen((current) => ({ ...current, [groupId]: !(current[groupId] ?? true) }))}
                  onToggleLayer={toggleMapLayer}
                />
              )
            ) : (
              <>
            <div className="jd__filters">
              {LEVELS.map((level) => {
                const disabled =
                  !isAuthenticated ||
                  (level === "region" && !selection.division) ||
                  (level === "district" && !selection.region);
                return (
                  <label key={level} className="jd__field" data-disabled={disabled ? "true" : "false"}>
                    <span>{levelLabel(level)}</span>
                    <select
                      value={selection[level]}
                      disabled={disabled}
                      onChange={(event) => onSelectLevel(level, event.target.value)}
                      data-testid={`jd-filter-${level}`}
                    >
                      <option value="">{`All ${level === "division" ? "divisions" : level === "region" ? "regions" : "districts"}`}</option>
                      {options[level].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>

            {activeFilterChips.length > 0 && (
              <div className="jd__chips" aria-label="Active filters">
                {activeFilterChips.map((chip) => (
                  <button key={chip.level} type="button" className="jd__chip" onClick={() => onSelectLevel(chip.level, "")}>
                    <em>{levelLabel(chip.level)}</em>
                    {chip.value}
                    <X aria-hidden="true" size={13} />
                  </button>
                ))}
                <button type="button" className="jd__chip jd__chip--clear" onClick={resetAll}>
                  Clear all
                </button>
              </div>
            )}

            <section className="jd__legend" aria-label="Boundary legend">
              <h3>Boundary legend</h3>
              <ul>
                <li><i className="jd__sw jd__sw--division" /> BioMed Division</li>
                <li><i className="jd__sw jd__sw--region" /> BioMed Region</li>
                <li><i className="jd__sw jd__sw--district" /> BioMed District</li>
                <li><i className="jd__sw jd__sw--site" /> Fixed collection site</li>
              </ul>
            </section>

            <MapMarkerLegend
              map={getMapElementMap(mapRef.current)}
              refreshKey={layerSnaps.filter((s) => s.visible).map((s) => s.title).join("|")}
            />

            <p className="jd__disclaimer">
              Boundaries reflect the authoritative BioMed operational source layer and update when the source updates.
              BioMed territories may differ from Humanitarian Services jurisdictions.
            </p>
              </>
            )}
          </>
          )}
        </aside>

        {/* MAP */}
        <div className="jd__map">
          {createElement(
            "arcgis-map",
            {
              key: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "jd-preview",
              ref: mapRef,
              itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
              basemap: isAuthenticated ? undefined : quietOpsBasemapId(),
              center: CENTER,
              zoom: ZOOM,
              className: "jd__arcgis",
              "data-testid": "jd-arcgis",
            },
            [
              createElement("arcgis-home", { key: "home", slot: "top-left" }),
              createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
              createElement("arcgis-search", { key: "search", slot: "top-right", popupDisabled: true, resultGraphicDisabled: true }),
              createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
              createElement(
                "arcgis-expand",
                { key: "basemap", slot: "bottom-right", icon: "basemap", label: "Basemap", mode: "floating" },
                createElement("arcgis-basemap-gallery", {}),
              ),
            ],
          )}

          {isAuthenticated && !mapReady && <JdMapLoader />}
        </div>

        {/* RIGHT — sites + detail */}
        <aside className="jd__panel jd__panel--right" aria-label="Sites and detail" data-collapsed={rightOpen ? "false" : "true"}>
          {!rightOpen && (
            <div className="jd__rail">
              <button type="button" className="jd__rail-btn" aria-label="Open sites" title="Show sites panel" onClick={() => setRightOpen(true)}>
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <span className="jd__rail-label">Sites</span>
            </div>
          )}
          {rightOpen && (
          <>
            <div className="jd__panel-top">
              <MapTabBar
                ariaLabel="Result views"
                active={rightTab}
                onSelect={(id) => { setRightTab(id); if (id === "sites") void zoomToSites(); }}
                tabs={[
                  { id: "sites", label: "Sites", Icon: List, badge: sites.length > 0 ? sites.length : undefined },
                  { id: "detail", label: "Detail", Icon: Info },
                ]}
              />
              <button type="button" className="jd__collapse-btn" aria-label="Collapse sites" title="Hide sites panel" onClick={() => setRightOpen(false)}>
                <span className="jd__btn-label">Hide</span>
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            </div>

            <div className="jd__panel-subhead">
              <h2>{rightTab === "detail" && activeFeature ? activeFeature.title : "Fixed Site List"}</h2>
              <p>{rightTab === "detail" && activeFeature ? activeFeature.layerTitle : "Click a site to fly to it"}</p>
            </div>

            <div className="jd__right-body">
              {rightTab === "sites" ? (
                <>
                  <label className="jd__site-search">
                    <Search aria-hidden="true" size={15} />
                    <input
                      value={siteQuery}
                      onChange={(event) => setSiteQuery(event.target.value)}
                      placeholder="Search sites in this scope"
                      disabled={!isAuthenticated}
                    />
                  </label>
                  {!isAuthenticated ? (
                    <p className="jd__empty">Sign in to load fixed sites.</p>
                  ) : filteredSites.length === 0 ? (
                    <p className="jd__empty">No fixed sites in this selection.</p>
                  ) : (
                    <div className="jd__site-list" data-testid="jd-site-list">
                      {anySiteMetrics && (
                        <div className="jd__site-legend">
                          <span><i className="jd__site-key jd__site-key--drives" />Drives</span>
                          <span><i className="jd__site-key jd__site-key--volume" />Red cell volume</span>
                        </div>
                      )}
                      {filteredSites.map((row) => (
                        <button key={row.id} type="button" className="jd__site" onClick={() => void selectSite(row)}>
                          <span className="jd__site-main">
                            <span className="jd__site-text">
                              <strong>{row.title}</strong>
                              {row.subtitle && <small>{row.subtitle}</small>}
                            </span>
                            {(row.drives != null || row.volume != null) && (
                              <span className="jd__site-bars">
                                <span className="jd__site-bar">
                                  <i className="jd__site-bar-track">
                                    <i className="jd__site-bar-fill jd__site-bar-fill--drives" style={{ width: `${Math.round(((row.drives ?? 0) / siteMax.drives) * 100)}%` }} />
                                  </i>
                                  <b>{row.drives != null ? row.drives.toLocaleString() : "—"}</b>
                                </span>
                                <span className="jd__site-bar">
                                  <i className="jd__site-bar-track">
                                    <i className="jd__site-bar-fill jd__site-bar-fill--volume" style={{ width: `${Math.round(((row.volume ?? 0) / siteMax.volume) * 100)}%` }} />
                                  </i>
                                  <b>{row.volume != null ? row.volume.toLocaleString() : "—"}</b>
                                </span>
                              </span>
                            )}
                          </span>
                          <ChevronRight aria-hidden="true" size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {coincidentHits.length > 1 && (
                    <section className="jd__coincident" data-testid="jd-coincident-picker" aria-label="Overlapping features at this point">
                      <header className="jd__coincident-head">
                        <strong>{coincidentHits.length} features here</strong>
                        <span>Stacked markers — pick one</span>
                      </header>
                      <div className="jd__coincident-list">
                        {coincidentHits.map((hit) => (
                          <button
                            key={hit.key}
                            type="button"
                            className={`jd__coincident-item${hit.key === activeHitKey ? " is-active" : ""}`}
                            aria-pressed={hit.key === activeHitKey}
                            onClick={() => selectCoincidentHit(hit)}
                          >
                            <strong>{hit.title}</strong>
                            <span>{hit.layerTitle}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {activeFeature ? (
                    <CleanFeatureCard feature={activeFeature} geoStats={geoStats} />
                  ) : (
                    <p className="jd__empty">
                      {coincidentHits.length > 1
                        ? "Select one of the stacked features above."
                        : "Click a feature on the map, or pick a site, to see a clean detail card here."}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
          )}
        </aside>
      </div>

      {!isAuthenticated && (
        <div className="jd__signin" role="dialog" aria-label="Sign in required">
          <ShieldCheck aria-hidden="true" size={26} />
          <h2>{brand.signInHeading}</h2>
          <p>{brand.signInCopy}</p>
          <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
            Sign in to ArcGIS
          </button>
          {error && <small>{error}</small>}
        </div>
      )}

      {aboutOpen && (
        <div className="jd__modal" role="dialog" aria-modal="true" aria-label={`About ${brand.appTitle}`} onClick={() => setAboutOpen(false)}>
          <div className="jd__modal-card" onClick={(event) => event.stopPropagation()}>
            <header className="jd__modal-head">
              <span className="jd__modal-mark"><RcMark size={22} /></span>
              <p className="jd__modal-eyebrow">{brand.appTitle}</p>
              <button type="button" className="jd__modal-x" aria-label="Close" onClick={() => setAboutOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="jd__modal-body">
              <p className="jd__modal-meta">Live Red Cross ArcGIS · FY25 reporting</p>
              <h2 className="jd__modal-title">{brand.aboutTitle}</h2>
              <p className="jd__modal-lead">{brand.aboutLead}</p>

              <div className="jd__modal-callout">
                <RcMark size={30} />
                <div>
                  <strong>{brand.calloutTitle}</strong>
                  <span>{brand.calloutSub}</span>
                </div>
              </div>

              <p>
                The map and counts read live from the published Red Cross ArcGIS web map. When the source layers update,
                this dashboard updates with them — there is nothing to refresh by hand.
              </p>

              <h3>How to use it</h3>
              <ul>
                <li><b>KPI band</b> — FY25 totals (red cell drives, collections, SDP, plasma) and fixed-site count, recomputed as you filter.</li>
                <li><b>Filter by geography</b> — drill Division → Region → District; the map flies to the live icons in that scope and the counts follow.</li>
                <li><b>Quick View</b> — preset layer combinations (boundaries, fixed sites, mobile + fixed, FY25 collections, all, clean).</li>
                <li><b>Layers tab</b> — turn individual map layers on and off; the view starts minimal.</li>
                <li><b>Click anything</b> — sites and boundaries open a clean detail card on the right; clicking a Division, Region, or District shows that area’s FY25 totals.</li>
              </ul>

              <div className="jd__modal-cards">
                <div className="jd__modal-stat"><span>Filter</span><strong>Div · Reg · Dist</strong></div>
                <div className="jd__modal-stat"><span>Quick View</span><strong>6 presets</strong></div>
                <div className="jd__modal-stat"><span>Layers</span><strong>Toggle</strong></div>
                <div className="jd__modal-stat"><span>Popups</span><strong>Clean cards</strong></div>
              </div>

              <h3>Data &amp; boundaries</h3>
              <p>{arcJurisdictionMapSource.summary}</p>

              <h3>Definitions</h3>
              <p>
                Counts are summed across the FY25 source layer for the selected geography. Fixed Sites counts physical
                donor-facing collection sites in scope. Geographies are shown by name, never code.
              </p>

              <h3>Known limitations</h3>
              <p>
                BioMed operational territories can differ from Humanitarian Services jurisdictions. Per-site counts appear
                only where the source layer carries them; otherwise see the network totals in the KPI band.
              </p>

              {brand.aboutExtra}

              <p className="jd__modal-foot">
                <span className="jd__modal-foot-q">Question or suggestions?</span>{" "}
                <a
                  href={`mailto:jeff.franzen2@redcross.org?subject=${encodeURIComponent(
                    `${brand.appTitle} — question/suggestion`,
                  )}`}
                >
                  Email Jeff Franzen
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Re-query the source feature for the full attribute record (hit-test graphics
// only carry render/popup fields).
async function enrichGraphic(graphic: Graphic): Promise<Graphic> {
  const layer = graphic.layer as (FeatureLayer & { objectIdField?: string }) | undefined;
  if (!layer || !isQueryableFeatureLayer(layer)) return graphic;
  try {
    await layer.load?.();
    const oidField = layer.objectIdField;
    const oid = oidField ? Number(graphic.attributes?.[oidField]) : NaN;
    if (!Number.isFinite(oid)) return graphic;
    const query = layer.createQuery();
    query.objectIds = [oid];
    query.outFields = ["*"];
    query.returnGeometry = false;
    const result = await layer.queryFeatures(query);
    const full = result.features?.[0]?.attributes;
    if (full) graphic.attributes = { ...graphic.attributes, ...full };
  } catch {
    // keep original attributes
  }
  return graphic;
}
