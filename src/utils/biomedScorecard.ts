// Geography-scoped layer scorecard — the "answer" for the right Detail panel.
// For every visible point layer, count its features within the selected
// division/region/district (attribute-scoped when the layer carries jurisdiction
// fields, spatially-scoped against the boundary polygon otherwise). With no
// selection it counts the whole network. This turns the Detail panel into a live
// readout of "how many of each thing is in the area I've filtered to."

import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { collectArcJurisdictionLayers } from "./biomedMapSuite";
import {
  LEVELS,
  type Selection,
  type LevelId,
  buildWhereForLayer,
  layerHasAnyLevelField,
  isQueryableFeatureLayer,
  queryBoundaryGeometry,
} from "./biomedGeographyFilter";

export type ScorecardEntry = { id: string; title: string; value: number | null };

// Point layers that are reference/data noise rather than countable "things on
// the map" — a count of ZIP centroids or trade-area polygons isn't a metric.
const EXCLUDE_TITLE_RE = /\bzip\b|zip codes|trade.?area|fy25 data/i;

export async function computeLayerScorecard(
  map: ArcGISMap,
  selection: Selection,
  chosen: Partial<Record<LevelId, string>>,
): Promise<ScorecardEntry[]> {
  const hasSelection = LEVELS.some((level) => selection[level]);
  const boundaryGeom = hasSelection ? await queryBoundaryGeometry(map, selection, chosen) : null;

  const layers = collectArcJurisdictionLayers(map)
    .filter(isQueryableFeatureLayer)
    .filter((layer) => layer.geometryType === "point" && layer.visible)
    .filter((layer) => !EXCLUDE_TITLE_RE.test(layer.title ?? ""));

  const seen = new Set<string>();
  const targets: FeatureLayer[] = [];
  layers.forEach((layer) => {
    const title = (layer.title ?? "").trim();
    if (!title || seen.has(title)) return;
    seen.add(title);
    targets.push(layer);
  });

  const entries = await Promise.all(
    targets.map(async (layer): Promise<ScorecardEntry> => {
      const title = (layer.title ?? "Layer").trim();
      let value: number | null = null;
      try {
        if (!hasSelection) {
          value = await layer.queryFeatureCount({ where: "1=1" } as never);
        } else if (boundaryGeom) {
          // Count what's physically inside the selected boundary — the same
          // source of truth the KPI band uses. Attribute fields on some layers
          // are state-style (not BioMed jurisdiction) and would falsely read 0.
          value = await layer.queryFeatureCount({
            geometry: boundaryGeom,
            spatialRelationship: "intersects",
            where: "1=1",
          } as never);
        } else if (layerHasAnyLevelField(layer)) {
          value = await layer.queryFeatureCount({ where: buildWhereForLayer(layer, selection, chosen) } as never);
        } else {
          value = await layer.queryFeatureCount({ where: "1=1" } as never);
        }
      } catch {
        value = null;
      }
      return { id: layer.id ?? title, title, value };
    }),
  );

  // Most-populous first; unknowns (null) sink to the bottom.
  return entries.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
}
