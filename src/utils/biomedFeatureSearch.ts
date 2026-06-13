// Shared BioMed feature search — find counties, regions, districts, sites,
// hospitals (etc.) across the live map layers by name. One implementation for
// every map tool's Search tab. Extracted from the Atlas workbench so the
// dashboards get the identical search.

import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Field from "@arcgis/core/layers/support/Field";
import type Graphic from "@arcgis/core/Graphic";
import { collectArcJurisdictionLayers, safeLayerTitle } from "./biomedMapSuite";
import { summarizeMasterFeature, type MasterLayerCategory } from "./masterMapFeatures";

export type SearchStatus = "idle" | "searching" | "ready" | "empty" | "blocked" | "error";

export type BiomedSearchResult = {
  id: string;
  title: string;
  layerTitle: string;
  category: MasterLayerCategory;
  layer: FeatureLayer;
  graphic: Graphic;
};

const PER_LAYER_LIMIT = 4;
const TOTAL_LIMIT = 24;
const FIELD_HINTS = [
  "name", "title", "division", "region", "district", "chapter", "county",
  "site", "facility", "zip", "city", "address", "portfolio", "code",
];

function isSearchableFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatures === "function" && typeof (layer as FeatureLayer).createQuery === "function";
}

function isSqlSafe(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ");
}

function isUsefulField(field: Field) {
  if (field.type !== "string" || !isSqlSafe(field.name)) return false;
  const text = normalize(`${field.name} ${field.alias ?? ""} ${field.valueType ?? ""}`);
  return FIELD_HINTS.some((hint) => text.includes(hint));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function searchFields(layer: FeatureLayer) {
  const fields = layer.fields ?? [];
  const displayField = fields.find((field) => field.name === layer.displayField && field.type === "string");
  const preferred = fields.filter(isUsefulField);
  const fallback = fields.filter((field) => field.type === "string" && isSqlSafe(field.name)).slice(0, 10);
  return uniqueStrings([displayField?.name, ...preferred.map((f) => f.name), ...fallback.map((f) => f.name)]).slice(0, 12);
}

function buildWhere(fields: string[], term: string) {
  const escaped = term.trim().replace(/'/g, "''").toUpperCase();
  return fields.map((field) => `UPPER(${field}) LIKE '%${escaped}%'`).join(" OR ");
}

export async function runBiomedFeatureSearch(map: ArcGISMap, term: string): Promise<BiomedSearchResult[]> {
  const featureLayers = collectArcJurisdictionLayers(map).filter(isSearchableFeatureLayer);
  const settled = await Promise.allSettled(
    featureLayers.map(async (layer) => {
      await layer.load?.();
      const fields = searchFields(layer);
      if (fields.length === 0) return [] as BiomedSearchResult[];
      const query = layer.createQuery();
      query.where = buildWhere(fields, term);
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.num = PER_LAYER_LIMIT;
      const featureSet = await layer.queryFeatures(query);
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
          graphic,
        } satisfies BiomedSearchResult;
      });
    }),
  );
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).slice(0, TOTAL_LIMIT);
}
