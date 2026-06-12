// Shared BioMed geography drill-down helpers — division → region → district.
// Extracted from the Jurisdiction Dashboard so the Workbench can offer the same
// "Filter by Geography" control. Pure functions only (no React/state); callers
// own their selection/options/refs.

import type ArcGISMap from "@arcgis/core/Map";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Field from "@arcgis/core/layers/support/Field";
import type MapView from "@arcgis/core/views/MapView";
import Extent from "@arcgis/core/geometry/Extent";
import { collectArcJurisdictionLayers } from "./biomedMapSuite";

export const LEVELS = ["division", "region", "district"] as const;
export type LevelId = (typeof LEVELS)[number];
export type Selection = Record<LevelId, string>;
export const EMPTY_SELECTION: Selection = { division: "", region: "", district: "" };

export function isSqlSafeField(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
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
export function looksLikeCodeValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 6 && !/\s/.test(trimmed) && !/[a-z]{3,}/.test(trimmed);
}

export function levelNameFieldCandidates(fields: Field[], level: LevelId): Field[] {
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

export function findLevelField(fields: Field[], level: LevelId) {
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

export function isQueryableFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatures === "function" && typeof (layer as FeatureLayer).createQuery === "function";
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

// Build a WHERE clause for THIS layer using its own jurisdiction NAME fields.
export function buildWhereForLayer(layer: FeatureLayer, selection: Selection, chosen: Partial<Record<LevelId, string>> = {}) {
  const clauses: string[] = [];
  LEVELS.forEach((level) => {
    const value = selection[level];
    if (!value) return;
    const field = resolveLevelField(layer, level, chosen);
    if (field) clauses.push(`${field.name} = '${escapeSql(value)}'`);
  });
  return clauses.length ? clauses.join(" AND ") : "1=1";
}

export function layerHasAnyLevelField(layer: FeatureLayer) {
  const fields = layer.fields ?? [];
  return LEVELS.some((level) => findLevelField(fields, level));
}

export function levelLabel(level: LevelId) {
  if (level === "division") return "BioMed Division";
  if (level === "region") return "BioMed Region";
  return "BioMed District";
}

export function levelAllLabel(level: LevelId) {
  return `All ${level === "division" ? "divisions" : level === "region" ? "regions" : "districts"}`;
}

// Distinct NAME values for one level, queried from `layer` within the parent
// selection. Returns the values plus the field that produced them (so callers
// can cache it as the "chosen" field for consistent WHERE clauses).
export async function loadLevelOptions(
  layer: FeatureLayer | null | undefined,
  level: LevelId,
  parent: Selection,
  chosen: Partial<Record<LevelId, string>> = {},
): Promise<{ values: string[]; field: string | null }> {
  if (!layer) return { values: [], field: null };
  const candidates = levelNameFieldCandidates(layer.fields ?? [], level);
  if (candidates.length === 0) return { values: [], field: null };

  for (const field of candidates) {
    try {
      const query = layer.createQuery();
      query.where = buildWhereForLayer(layer, { ...parent, [level]: "" }, chosen);
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
        return { values: unique, field: field.name };
      }
    } catch {
      // try the next candidate field
    }
  }
  return { values: [], field: null };
}

// ── Selection outline ────────────────────────────────────────────────────
// One implementation of the "red outline around the selected geography" so the
// Dashboard, Infrastructure, Hospital, Atlas, and Story Explorer all behave
// identically: deepest selected level wins, boundary queried from the matching
// "Biomed <level>" layer, outline drawn as a non-filled red ring.

type GraphicsView = Pick<MapView, "graphics">;

export async function drawSelectionOutline(
  map: ArcGISMap,
  view: GraphicsView,
  selection: Selection,
  chosen: Partial<Record<LevelId, string>>,
  previous: Graphic | null,
): Promise<Graphic | null> {
  if (previous) view.graphics.remove(previous);
  const level = selection.district ? "district" : selection.region ? "region" : selection.division ? "division" : null;
  if (!level) return null;
  try {
    const boundary = collectArcJurisdictionLayers(map)
      .filter(isQueryableFeatureLayer)
      .find((candidate) => (candidate.title ?? "").toLowerCase().includes(`biomed ${level}`));
    if (!boundary) return null;
    await boundary.load?.();
    const query = boundary.createQuery();
    query.where = buildWhereForLayer(boundary, selection, chosen);
    query.returnGeometry = true;
    query.outFields = [];
    query.num = 1;
    const result = await boundary.queryFeatures(query);
    const geometry = result.features[0]?.geometry;
    if (!geometry) return null;
    const [{ default: Graphic }, { default: SimpleFillSymbol }] = await Promise.all([
      import("@arcgis/core/Graphic"),
      import("@arcgis/core/symbols/SimpleFillSymbol"),
    ]);
    const outline = new Graphic({
      geometry,
      symbol: new SimpleFillSymbol({
        style: "none",
        outline: { color: [237, 27, 46, 0.95], width: 2.5 },
      }),
    });
    view.graphics.add(outline);
    return outline;
  } catch {
    // outline is decorative; selection filtering still applies
    return null;
  }
}

// Continental US bounding box (lon/lat). Used to drop AK/HI/territory outliers
// so a division zooms to its live lower-48 icons, not its full polygon extent.
const CONUS_BBOX = { xmin: -125, ymin: 24, xmax: -66.5, ymax: 49.7 };

// Extent (in lon/lat) of the visible point "icon" layers for a selection,
// clipped to the continental US. Returns an Extent ready for view.goTo, or null.
export async function computeLiveIconExtent(
  map: ArcGISMap,
  selection: Selection,
  chosen: Partial<Record<LevelId, string>>,
) {
  const hasSelection = LEVELS.some((level) => selection[level]);
  const pointLayers = collectArcJurisdictionLayers(map)
    .filter(isQueryableFeatureLayer)
    .filter((layer) => layer.geometryType === "point" && layer.visible);

  let box: { xmin: number; ymin: number; xmax: number; ymax: number } | null = null;
  for (const layer of pointLayers) {
    try {
      const query = layer.createQuery();
      query.where = buildWhereForLayer(layer, selection, chosen);
      // A layer with no usable jurisdiction fields can't be scoped — including
      // its NATIONAL points would balloon the extent to the whole country and
      // make the zoom a no-op. Skip it; scopable layers define the frame.
      if (hasSelection && query.where === "1=1") continue;
      query.returnGeometry = true;
      query.outFields = [];
      (query as { outSpatialReference?: unknown }).outSpatialReference = { wkid: 4326 };
      query.num = 4000;
      const result = await layer.queryFeatures(query);
      for (const feature of result.features) {
        const point = feature.geometry as { x?: number; y?: number } | null | undefined;
        const x = point?.x;
        const y = point?.y;
        if (typeof x !== "number" || typeof y !== "number") continue;
        if (x < CONUS_BBOX.xmin || x > CONUS_BBOX.xmax || y < CONUS_BBOX.ymin || y > CONUS_BBOX.ymax) continue;
        box = box
          ? { xmin: Math.min(box.xmin, x), ymin: Math.min(box.ymin, y), xmax: Math.max(box.xmax, x), ymax: Math.max(box.ymax, y) }
          : { xmin: x, ymin: y, xmax: x, ymax: y };
      }
    } catch {
      // skip this layer
    }
  }

  if (!box) return null;
  const padX = Math.max((box.xmax - box.xmin) * 0.12, 0.45);
  const padY = Math.max((box.ymax - box.ymin) * 0.12, 0.45);
  return new Extent({
    xmin: box.xmin - padX,
    ymin: box.ymin - padY,
    xmax: box.xmax + padX,
    ymax: box.ymax + padY,
    spatialReference: { wkid: 4326 },
  });
}

// Extent of the selected geography's BOUNDARY polygon — the zoom fallback when
// no scopable point layer is visible (e.g. boundaries-only presets).
export async function queryBoundaryExtent(
  map: ArcGISMap,
  selection: Selection,
  chosen: Partial<Record<LevelId, string>>,
): Promise<Extent | null> {
  const level = selection.district ? "district" : selection.region ? "region" : selection.division ? "division" : null;
  if (!level) return null;
  try {
    const boundary = collectArcJurisdictionLayers(map)
      .filter(isQueryableFeatureLayer)
      .find((candidate) => (candidate.title ?? "").toLowerCase().includes(`biomed ${level}`));
    if (!boundary) return null;
    await boundary.load?.();
    const result = await (boundary as FeatureLayer & {
      queryExtent?: (q: unknown) => Promise<{ extent?: Extent | null }>;
    }).queryExtent?.({ where: buildWhereForLayer(boundary, selection, chosen) });
    return result?.extent ? result.extent.clone().expand(1.15) : null;
  } catch {
    return null;
  }
}
