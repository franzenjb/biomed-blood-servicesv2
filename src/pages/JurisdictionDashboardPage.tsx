import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type ArcGISMap from "@arcgis/core/Map";
import type Graphic from "@arcgis/core/Graphic";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Extent from "@arcgis/core/geometry/Extent";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Field from "@arcgis/core/layers/support/Field";
import type MapView from "@arcgis/core/views/MapView";
import {
  ChevronRight,
  Droplet,
  Home,
  Info,
  Layers,
  ListFilter,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import RcMark from "../components/RcMark";
import { arcJurisdictionMapSource } from "../config/arcgisLayers";
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
type PresetId = "minimal" | "boundaries" | "fixed" | "mobile-fixed" | "collections" | "all" | "clean";

const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: "minimal", label: "Minimal (boundaries + fixed sites)" },
  { id: "boundaries", label: "Boundaries only" },
  { id: "fixed", label: "Fixed sites" },
  { id: "mobile-fixed", label: "Mobile + fixed sites" },
  { id: "collections", label: "FY25 collections data" },
  { id: "all", label: "All BioMed layers" },
  { id: "clean", label: "Clean map (no overlays)" },
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
  const isCollections = t.includes("zip") || t.includes("fy25") || t.includes("collection operations");

  if (preset === "boundaries") return isBoundary;
  if (preset === "fixed") return isFixed || t.includes("biomed region");
  if (preset === "mobile-fixed") return isMobile || isFixed || t.includes("biomed region");
  if (preset === "collections") return isCollections || t.includes("biomed region");
  // minimal
  return t.includes("biomed division") || t.includes("biomed region") || isFixed;
}

type SiteRow = { id: string; title: string; subtitle: string; graphic: Graphic; layerTitle: string };

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

function CleanFeatureCard({ feature }: { feature: MasterFeatureSummary }) {
  const geo = feature.geography.filter((row) => row.value && row.value.trim()).filter((row) => !isCodeRow(row));
  const metrics = feature.metrics.filter((row) => row.value && row.value.trim()).slice(0, 4);
  const facts = feature.sourceFields
    .filter((row) => row.value && row.value.trim())
    .filter((row) => !isCodeRow(row))
    .filter((row) => !geo.some((g) => g.value === row.value))
    .slice(0, 8);

  return (
    <div className="jd-card">
      <header className="jd-card__head">
        <p className="jd-card__eyebrow">{feature.layerTitle}</p>
        <h3>{feature.title}</h3>
        <p className="jd-card__impact">{feature.talkingPoint}</p>
      </header>

      {metrics.length > 0 && (
        <div className="jd-card__metrics">
          {metrics.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      )}

      {geo.length > 0 && (
        <div className="jd-card__pills" aria-label="Geographic context">
          {geo.map((row) => (
            <span key={`${row.label}-${row.value}`} className="jd-card__pill">
              <em>{row.label}</em>
              {row.value}
            </span>
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <dl className="jd-card__facts">
          {facts.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function JurisdictionDashboardPage() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  const [mapReady, setMapReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(340);
  const [rightWidth, setRightWidth] = useState(380);

  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [options, setOptions] = useState<Record<LevelId, string[]>>({ division: [], region: [], district: [] });
  const [kpis, setKpis] = useState<Record<string, number | null>>({});
  const [kpiLoading, setKpiLoading] = useState(false);
  const [siteCount, setSiteCount] = useState<number | null>(null);

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteQuery, setSiteQuery] = useState("");
  const [activeFeature, setActiveFeature] = useState<MasterFeatureSummary | null>(null);
  const [rightTab, setRightTab] = useState<"sites" | "detail">("sites");
  const [leftTab, setLeftTab] = useState<"filters" | "layers">("filters");
  const [preset, setPreset] = useState<PresetId>("minimal");
  const [layerSnaps, setLayerSnaps] = useState<BioMedLayerSnapshot[]>([]);
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
    const timer = window.setTimeout(() => setMapReady(true), 9000);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  const selectionWhere = useCallback(
    (layer: FeatureLayer | null | undefined) => (layer ? buildWhereForLayer(layer, selection, chosenFieldRef.current) : "1=1"),
    [selection],
  );

  const refreshLayerSnaps = useCallback(() => {
    setLayerSnaps(buildLayerSnapshots(getMapElementMap(mapRef.current)).filter((snap) => !isHsTitle(snap.title)));
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

  // ---- Resizable panels -------------------------------------------------
  const startResize = useCallback(
    (side: "left" | "right") => (event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startW = side === "left" ? leftWidth : rightWidth;
      const move = (e: PointerEvent) => {
        const delta = side === "left" ? e.clientX - startX : startX - e.clientX;
        const next = Math.min(560, Math.max(260, startW + delta));
        if (side === "left") setLeftWidth(next);
        else setRightWidth(next);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [leftWidth, rightWidth],
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
      const rows: SiteRow[] = result.features.map((graphic, index) => {
        const attrs = graphic.attributes ?? {};
        const title = (titleField && `${attrs[titleField.name] ?? ""}`.trim()) || `Site ${index + 1}`;
        const city = cityField ? `${attrs[cityField.name] ?? ""}`.trim() : "";
        const state = stateField ? `${attrs[stateField.name] ?? ""}`.trim() : "";
        const subtitle = [city, state].filter(Boolean).join(", ");
        return { id: `${layer.id}-${index}-${title}`, title, subtitle, graphic, layerTitle };
      });
      setSites(rows);
    } catch {
      setSites([]);
    }
  }, []);

  // ---- Apply selection to the map (definitionExpression + zoom) ---------
  const applySelectionToMap = useCallback(async (sel: Selection) => {
    const map = getMapElementMap(mapRef.current);
    const view = mapRef.current?.view as MapView | undefined;
    if (!map) return;

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

    // Zoom to the extent of the filtered backbone features.
    const layer = sourceLayerRef.current;
    const hasSelection = LEVELS.some((level) => sel[level]);
    if (view && layer && hasSelection) {
      try {
        const extentResult = await (layer as FeatureLayer & {
          queryExtent?: (q: unknown) => Promise<{ extent?: Extent | null }>;
        }).queryExtent?.({ where: buildWhereForLayer(layer, sel, chosenFieldRef.current) });
        if (extentResult?.extent) await view.goTo(extentResult.extent.clone().expand(1.15), { duration: 650 });
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
    setActiveFeature(null);
    setSiteQuery("");
    setRightTab("sites");
    applyPreset("minimal");
    const layer = sourceLayerRef.current;
    if (layer) void refreshOptionsFor("all", EMPTY_SELECTION);
  }, [refreshOptionsFor, applyPreset]);

  const selectSite = useCallback(async (row: SiteRow) => {
    const summary = summarizeMasterFeature(row.graphic, row.layerTitle, true);
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
      if (!mapElement || !view) return;

      await view.when?.();
      if (cancelled) return;
      setMapReady(true);

      const map = getMapElementMap(mapElement);
      if (!map) return;

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

      // Discover backbone layers, seed filter options + first KPI pass.
      const featureLayers = collectArcJurisdictionLayers(map).filter(isQueryableFeatureLayer);
      await Promise.allSettled(featureLayers.map((layer) => layer.load?.()));
      if (cancelled) return;
      discoverLayers(map);

      // Start at the minimal preset and track per-layer visibility changes.
      applyPreset("minimal");
      collectArcJurisdictionLayers(map).forEach((layer) => {
        const handle = (layer as Layer & { watch?: (name: string, cb: () => void) => WatchHandle }).watch?.("visible", refreshLayerSnaps);
        if (handle) handles.push(handle);
      });
      refreshLayerSnaps();

      await refreshOptionsFor("all", EMPTY_SELECTION);
      await computeKpis(EMPTY_SELECTION);
      await loadSites(EMPTY_SELECTION);

      const clickHandle = view.on("click", async (event) => {
        try {
          view.popup?.close?.();
          const hit = await view.hitTest(event);
          const graphics = (hit.results as Array<{ type: string; graphic?: Graphic }>)
            .filter((result) => result.type === "graphic" && result.graphic?.layer)
            .map((result) => result.graphic as Graphic);
          // Prefer point/site features over big boundary polygons.
          const best =
            graphics.find((graphic) => (graphic.layer as FeatureLayer | undefined)?.geometryType === "point") ?? graphics[0];
          if (!best) {
            setActiveFeature(null);
            return;
          }
          const enriched = await enrichGraphic(best);
          const summary = summarizeMasterFeature(enriched, undefined, true);
          setActiveFeature(summary);
          setRightTab("detail");
          setRightOpen(true);
        } catch {
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
  }, [isAuthenticated, discoverLayers, refreshOptionsFor, computeKpis, loadSites, applyPreset, refreshLayerSnaps]);

  const filteredSites = useMemo(() => {
    const term = siteQuery.trim().toLowerCase();
    if (!term) return sites;
    return sites.filter((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes(term));
  }, [sites, siteQuery]);

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
      data-testid="jurisdiction-dashboard"
    >
      <header className="jd__bar">
        <Link to="/hub" className="jd__home" data-testid="jd-home">
          <Home aria-hidden="true" size={18} />
          Home
        </Link>
        <div className="jd__title">
          <RcMark size={28} />
          <div>
            <strong>Jurisdiction Dashboard</strong>
            <span>Explore BioMed operational geography, boundaries &amp; FY25 territory counts</span>
          </div>
        </div>
        <div className="jd__scope" title="Current geographic scope">
          <MapPin aria-hidden="true" size={15} />
          {scopeLabel}
        </div>
        <label className="jd__quickview">
          <span>Quick View</span>
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
        <button type="button" className="jd__ghost" onClick={resetAll} data-testid="jd-reset">
          <RotateCcw aria-hidden="true" size={15} />
          Reset
        </button>
        <button type="button" className="jd__ghost" onClick={() => setAboutOpen(true)}>
          <Info aria-hidden="true" size={15} />
          About boundaries
        </button>
        <div className="jd__auth" data-on={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* KPI band */}
      <div className="jd__kpis" data-testid="jd-kpis">
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
      </div>

      <div className="jd__stage">
        {/* LEFT — filters */}
        {leftOpen ? (
          <aside className="jd__panel jd__panel--left" style={{ width: "var(--jd-left)" }} aria-label="Jurisdiction filters">
            <div className="jd__panel-head">
              {leftTab === "filters" ? <ListFilter aria-hidden="true" size={17} /> : <Layers aria-hidden="true" size={17} />}
              <div>
                <h2>{leftTab === "filters" ? "Filter by geography" : "Map layers"}</h2>
                <p>{leftTab === "filters" ? "Drill from division to district." : "Toggle what shows on the map."}</p>
              </div>
              <button type="button" aria-label="Hide filters" onClick={() => setLeftOpen(false)}>
                <PanelLeftClose aria-hidden="true" size={17} />
              </button>
            </div>

            <div className="jd__tabs jd__tabs--left" role="tablist">
              <button type="button" role="tab" aria-selected={leftTab === "filters"} className={leftTab === "filters" ? "is-active" : ""} onClick={() => setLeftTab("filters")} data-testid="jd-tab-filters">
                <ListFilter aria-hidden="true" size={15} />
                Filters
              </button>
              <button type="button" role="tab" aria-selected={leftTab === "layers"} className={leftTab === "layers" ? "is-active" : ""} onClick={() => setLeftTab("layers")} data-testid="jd-tab-layers">
                <Layers aria-hidden="true" size={15} />
                Layers {layerSnaps.length > 0 && <b>{layerSnaps.filter((snap) => snap.visible).length}</b>}
              </button>
            </div>

            {leftTab === "layers" ? (
              <div className="jd__layers" data-testid="jd-layer-list">
                {!isAuthenticated ? (
                  <p className="jd__empty">Sign in to load map layers.</p>
                ) : layerSnaps.length === 0 ? (
                  <p className="jd__empty">No layers loaded yet.</p>
                ) : (
                  layerSnaps.map((snap) => (
                    <button
                      key={snap.id}
                      type="button"
                      className="jd__layer"
                      aria-pressed={snap.visible}
                      onClick={() => toggleMapLayer(snap.id)}
                    >
                      <span className={`jd__layer-dot jd__layer-dot--${snap.category}`} aria-hidden="true" />
                      <span className="jd__layer-name">
                        <strong>{snap.title}</strong>
                        <small>{snap.summary}</small>
                      </span>
                      <em className="jd__layer-state">{snap.visible ? "On" : "Off"}</em>
                    </button>
                  ))
                )}
              </div>
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

            <p className="jd__disclaimer">
              Boundaries reflect the authoritative BioMed operational source layer and update when the source updates.
              BioMed territories may differ from Humanitarian Services jurisdictions.
            </p>
              </>
            )}
          </aside>
        ) : (
          <button type="button" className="jd__reopen jd__reopen--left" onClick={() => setLeftOpen(true)}>
            <PanelLeftOpen aria-hidden="true" size={16} />
            Filters
          </button>
        )}

        {leftOpen && <div className="jd__resizer jd__resizer--left" onPointerDown={startResize("left")} role="separator" aria-label="Resize filters" />}

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

          {isAuthenticated && !mapReady && (
            <div className="jd__loading" role="status" aria-live="polite">
              <Droplet aria-hidden="true" size={26} />
              <strong>Loading BioMed jurisdiction map…</strong>
              <span>Connecting to the live Red Cross ArcGIS layers.</span>
            </div>
          )}
        </div>

        {rightOpen && <div className="jd__resizer jd__resizer--right" onPointerDown={startResize("right")} role="separator" aria-label="Resize details" />}

        {/* RIGHT — sites + detail */}
        {rightOpen ? (
          <aside className="jd__panel jd__panel--right" style={{ width: "var(--jd-right)" }} aria-label="Sites and detail">
            <div className="jd__panel-head">
              <MapPin aria-hidden="true" size={17} />
              <div>
                <h2>{rightTab === "detail" && activeFeature ? activeFeature.title : "Fixed site list"}</h2>
                <p>{rightTab === "detail" && activeFeature ? activeFeature.layerTitle : "Click a site to fly to it"}</p>
              </div>
              <button type="button" aria-label="Hide details" onClick={() => setRightOpen(false)}>
                <PanelRightClose aria-hidden="true" size={17} />
              </button>
            </div>

            <div className="jd__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={rightTab === "sites"} className={rightTab === "sites" ? "is-active" : ""} onClick={() => setRightTab("sites")}>
                Sites {sites.length > 0 && <b>{sites.length}</b>}
              </button>
              <button type="button" role="tab" aria-selected={rightTab === "detail"} className={rightTab === "detail" ? "is-active" : ""} onClick={() => setRightTab("detail")}>
                Detail
              </button>
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
                      {filteredSites.map((row) => (
                        <button key={row.id} type="button" className="jd__site" onClick={() => void selectSite(row)}>
                          <span>
                            <strong>{row.title}</strong>
                            {row.subtitle && <small>{row.subtitle}</small>}
                          </span>
                          <ChevronRight aria-hidden="true" size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : activeFeature ? (
                <CleanFeatureCard feature={activeFeature} />
              ) : (
                <p className="jd__empty">Click a feature on the map, or pick a site, to see a clean detail card here.</p>
              )}
            </div>
          </aside>
        ) : (
          <button type="button" className="jd__reopen jd__reopen--right" onClick={() => setRightOpen(true)}>
            <PanelRightOpen aria-hidden="true" size={16} />
            Sites
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="jd__signin" role="dialog" aria-label="Sign in required">
          <ShieldCheck aria-hidden="true" size={26} />
          <h2>Sign in to load the Jurisdiction Dashboard</h2>
          <p>This dashboard reads live, private Red Cross ArcGIS layers. Sign in to load boundaries, filters, and FY25 counts.</p>
          <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
            Sign in to ArcGIS
          </button>
          {error && <small>{error}</small>}
        </div>
      )}

      {aboutOpen && (
        <div className="jd__modal" role="dialog" aria-modal="true" aria-label="About these boundaries">
          <div className="jd__modal-card">
            <header>
              <h2>About these boundaries</h2>
              <button type="button" aria-label="Close" onClick={() => setAboutOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <div className="jd__modal-body">
              <h3>Data sources</h3>
              <p>{arcJurisdictionMapSource.summary}</p>
              <h3>Refresh schedule</h3>
              <p>Boundaries and FY25 counts are read live from the published Red Cross ArcGIS web map. When the source layer updates, this dashboard updates.</p>
              <h3>Definitions</h3>
              <p>Counts are summed across the FY25 source layer for the selected division, region, or district. Fixed Sites counts physical donor-facing collection sites in scope.</p>
              <h3>Known limitations</h3>
              <p>BioMed operational territories can differ from Humanitarian Services jurisdictions. Geographies are named, not coded, for clarity.</p>
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
