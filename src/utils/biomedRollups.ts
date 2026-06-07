import type ArcGISMap from "@arcgis/core/Map";
import type Graphic from "@arcgis/core/Graphic";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Point from "@arcgis/core/geometry/Point";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Field from "@arcgis/core/layers/support/Field";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { collectArcJurisdictionLayers, safeLayerTitle } from "./biomedMapSuite";
import { classifyMasterLayer, type MasterFeatureSummary, type MasterLayerCategory } from "./masterMapFeatures";

export type BioMedSpatialRollupStatus = "idle" | "loading" | "ready" | "empty" | "error";

export type BioMedSpatialRollupMetric = {
  label: string;
  value: number;
};

export type BioMedSpatialRollupRow = {
  id: string;
  title: string;
  category: MasterLayerCategory;
  categoryLabel: string;
  count: number;
  metrics: BioMedSpatialRollupMetric[];
};

export type BioMedSpatialRollupSummary = {
  status: BioMedSpatialRollupStatus;
  focusTitle: string;
  focusLayer: string;
  checkedLayers: number;
  matchedLayers: number;
  featureCount: number;
  failedLayers: number;
  categoryRows: BioMedSpatialRollupRow[];
  layerRows: BioMedSpatialRollupRow[];
  message?: string;
};

const categoryLabels: Record<MasterLayerCategory, string> = {
  sites: "Facilities & Sites",
  geography: "Jurisdictions & Regions",
  operations: "Distribution & Operations",
  reference: "Reference",
  hospitals: "Hospitals & Patient Care",
  manufacturing: "Manufacturing"
};

const categorySortOrder: MasterLayerCategory[] = ["hospitals", "sites", "manufacturing", "operations", "geography", "reference"];

const numericFieldTypes = new Set(["small-integer", "integer", "single", "double", "long", "big-integer"]);

const metricHints = [
  "drive",
  "drives",
  "collection",
  "collections",
  "unit",
  "units",
  "rbc",
  "platelet",
  "plasma",
  "product",
  "hospital",
  "donor",
  "appointment",
  "procedure",
  "total"
];

const metricExclusions = [
  "objectid",
  "shape",
  "globalid",
  "latitude",
  "longitude",
  "x coordinate",
  "y coordinate",
  "area",
  "length",
  "rank",
  "score",
  "fips",
  "geoid",
  "zip",
  "postal",
  "phone",
  "fax",
  "year"
];

function isQueryableFeatureLayer(layer: unknown): layer is FeatureLayer {
  const candidate = layer as FeatureLayer;
  return typeof candidate.queryFeatureCount === "function" && typeof candidate.queryFeatures === "function" && typeof candidate.createQuery === "function";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatFieldLabel(field: Field) {
  return (field.alias || field.name)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulMetricField(field: Field) {
  const text = normalize(`${field.name} ${field.alias ?? ""}`);
  if (!numericFieldTypes.has(field.type)) return false;
  if (metricExclusions.some((hint) => text.includes(hint))) return false;
  return metricHints.some((hint) => text.includes(hint));
}

function metricRank(field: Field) {
  const text = normalize(`${field.name} ${field.alias ?? ""}`);
  const index = metricHints.findIndex((hint) => text.includes(hint));
  return index === -1 ? 999 : index;
}

function metricFieldsForLayer(layer: FeatureLayer) {
  return (layer.fields ?? [])
    .filter(isUsefulMetricField)
    .sort((a, b) => metricRank(a) - metricRank(b) || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function statisticFieldName(index: number) {
  return `rollup_sum_${index}`;
}

function formatMetricValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.000001) return 0;
  return Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(1));
}

function getLayerCategory(layerTitle: string) {
  return classifyMasterLayer(layerTitle);
}

function emptyRollup(status: BioMedSpatialRollupStatus, focus: MasterFeatureSummary, message?: string): BioMedSpatialRollupSummary {
  return {
    status,
    focusTitle: focus.title,
    focusLayer: focus.layerTitle,
    checkedLayers: 0,
    matchedLayers: 0,
    featureCount: 0,
    failedLayers: 0,
    categoryRows: [],
    layerRows: [],
    message
  };
}

// Cap for the centroid-assignment path. Counties hold tens of ZIPs; only huge
// selections (divisions) exceed this, where border spillover is negligible and
// downloading every polygon would be wasteful — those fall back to intersects.
const CENTROID_ROLLUP_MAX = 800;

function featureCentroid(geometry: Geometry | null | undefined): Point | null {
  if (!geometry) return null;
  const polygonCentroid = (geometry as Geometry & { centroid?: Point }).centroid;
  if (polygonCentroid) return polygonCentroid;
  const center = (geometry as Geometry & { extent?: { center?: Point } }).extent?.center;
  return center ?? null;
}

// Polygon-vs-polygon rollups (e.g. ZIPs within a county) must assign each
// feature to a single area by its centroid. "intersects" over-counts: a ZIP that
// merely clips the county border would add its full totals to that county.
async function queryPolygonLayerByCentroid(
  layer: FeatureLayer,
  geometry: Geometry,
  metricFields: Field[],
): Promise<BioMedSpatialRollupRow | null> {
  const query = layer.createQuery();
  query.geometry = geometry;
  query.spatialRelationship = "intersects";
  query.returnGeometry = true;
  query.outSpatialReference = geometry.spatialReference;
  query.outFields = metricFields.map((field) => field.name);
  query.maxRecordCountFactor = 5;

  const result = await layer.queryFeatures(query);
  const features = result.features ?? [];
  if (features.length > CENTROID_ROLLUP_MAX) return null; // too big — let caller fall back

  let count = 0;
  const sums = metricFields.map(() => 0);
  for (const feature of features) {
    const centroid = featureCentroid(feature.geometry);
    const intersects = (geometryEngine as unknown as { intersects: (a: Geometry, b: Geometry) => boolean }).intersects;
    if (!centroid || !intersects(geometry, centroid)) continue;
    count += 1;
    metricFields.forEach((field, index) => {
      const value = Number(feature.attributes?.[field.name]);
      if (Number.isFinite(value)) sums[index] += value;
    });
  }

  const metrics: BioMedSpatialRollupMetric[] = [];
  metricFields.forEach((field, index) => {
    const value = formatMetricValue(sums[index]);
    if (value > 0) metrics.push({ label: formatFieldLabel(field), value });
  });

  const title = safeLayerTitle(layer);
  const category = getLayerCategory(title);
  return { id: layer.id, title, category, categoryLabel: categoryLabels[category], count, metrics };
}

async function queryLayerRollup(layer: FeatureLayer, geometry: Geometry): Promise<BioMedSpatialRollupRow> {
  await layer.load?.();

  const metricFieldsAll = metricFieldsForLayer(layer);
  const focusIsPolygon = geometry.type === "polygon";
  if (focusIsPolygon && layer.geometryType === "polygon" && metricFieldsAll.length > 0) {
    const centroidRow = await queryPolygonLayerByCentroid(layer, geometry, metricFieldsAll);
    if (centroidRow) return centroidRow;
  }

  const countQuery = layer.createQuery();
  countQuery.geometry = geometry;
  countQuery.spatialRelationship = "intersects";
  countQuery.returnGeometry = false;
  const count = await layer.queryFeatureCount(countQuery);

  const metrics: BioMedSpatialRollupMetric[] = [];
  const metricFields = count > 0 ? metricFieldsForLayer(layer) : [];

  if (metricFields.length > 0) {
    try {
      const statsQuery = layer.createQuery();
      statsQuery.geometry = geometry;
      statsQuery.spatialRelationship = "intersects";
      statsQuery.returnGeometry = false;
      statsQuery.outFields = [];
      (statsQuery as unknown as { outStatistics: Array<Record<string, string>> }).outStatistics = metricFields.map((field, index) => ({
        statisticType: "sum",
        onStatisticField: field.name,
        outStatisticFieldName: statisticFieldName(index)
      }));

      const result = await layer.queryFeatures(statsQuery);
      const attributes = result.features?.[0]?.attributes ?? {};
      metricFields.forEach((field, index) => {
        const value = formatMetricValue(attributes[statisticFieldName(index)]);
        if (value > 0) {
          metrics.push({
            label: formatFieldLabel(field),
            value
          });
        }
      });
    } catch {
      // Counts are the durable first-pass rollup; source metric sums are opportunistic.
    }
  }

  const title = safeLayerTitle(layer);
  const category = getLayerCategory(title);
  return {
    id: layer.id,
    title,
    category,
    categoryLabel: categoryLabels[category],
    count,
    metrics
  };
}

function aggregateCategoryRows(layerRows: BioMedSpatialRollupRow[]) {
  const rows = new Map<MasterLayerCategory, BioMedSpatialRollupRow>();

  layerRows.forEach((row) => {
    const current = rows.get(row.category);
    if (!current) {
      rows.set(row.category, {
        id: row.category,
        title: categoryLabels[row.category],
        category: row.category,
        categoryLabel: categoryLabels[row.category],
        count: row.count,
        metrics: []
      });
      return;
    }
    current.count += row.count;
  });

  return [...rows.values()].sort(
    (a, b) => categorySortOrder.indexOf(a.category) - categorySortOrder.indexOf(b.category) || b.count - a.count,
  );
}

export async function buildBioMedSpatialRollup(
  map: ArcGISMap,
  focusGraphic: Graphic,
  focus: MasterFeatureSummary,
): Promise<BioMedSpatialRollupSummary> {
  const geometry = focusGraphic.geometry as Geometry | null | undefined;
  if (!geometry) return emptyRollup("idle", focus, "Selected feature has no geometry to query.");

  const focusLayerId = (focusGraphic.layer as FeatureLayer | undefined)?.id;
  const queryableLayers = collectArcJurisdictionLayers(map)
    .filter(isQueryableFeatureLayer)
    .filter((layer) => layer.id !== focusLayerId);

  if (queryableLayers.length === 0) {
    return emptyRollup("empty", focus, "No queryable BioMed layers were available.");
  }

  const settled = await Promise.allSettled(queryableLayers.map((layer) => queryLayerRollup(layer, geometry)));
  const failedLayers = settled.filter((result) => result.status === "rejected").length;
  const layerRows = settled
    .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
    .filter((row) => row.count > 0)
    .sort((a, b) => {
      const categoryDelta = categorySortOrder.indexOf(a.category) - categorySortOrder.indexOf(b.category);
      return categoryDelta || b.count - a.count || a.title.localeCompare(b.title);
    });

  const categoryRows = aggregateCategoryRows(layerRows);
  const featureCount = layerRows.reduce((sum, row) => sum + row.count, 0);

  return {
    status: layerRows.length > 0 ? "ready" : failedLayers === queryableLayers.length ? "error" : "empty",
    focusTitle: focus.title,
    focusLayer: focus.layerTitle,
    checkedLayers: queryableLayers.length,
    matchedLayers: layerRows.length,
    featureCount,
    failedLayers,
    categoryRows,
    layerRows,
    message:
      failedLayers > 0
        ? `${failedLayers} layer${failedLayers === 1 ? "" : "s"} could not be queried.`
        : "Computed from live layer intersections in the app."
  };
}
