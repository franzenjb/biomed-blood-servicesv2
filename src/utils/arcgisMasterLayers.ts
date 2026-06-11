import type ArcGISMap from "@arcgis/core/Map";
import Layer from "@arcgis/core/layers/Layer";
import type GroupLayer from "@arcgis/core/layers/GroupLayer";
import PortalItem from "@arcgis/core/portal/PortalItem";
import { chapterViewBiomedSource, masterMapLayerSources } from "../config/arcgisLayers";

type PortalLayerSource = {
  itemId: string;
  title: string;
  defaultVisible: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Layer could not be added.";
}

function mapAlreadyHasLayer(map: ArcGISMap, itemId: string) {
  return ((map.allLayers?.toArray?.() ?? []) as Layer[]).some((layer) => {
    const portalItem = (layer as Layer & { portalItem?: { id?: string } }).portalItem;
    return portalItem?.id === itemId;
  });
}

export async function addArcgisPortalLayers(map: ArcGISMap | undefined, sources: PortalLayerSource[]) {
  const added: string[] = [];
  const errors: string[] = [];

  if (!map) return { added, errors };

  for (const source of sources) {
    if (mapAlreadyHasLayer(map, source.itemId)) continue;

    try {
      const layer = await Layer.fromPortalItem({
        portalItem: new PortalItem({ id: source.itemId })
      });
      layer.title = source.title;
      layer.visible = source.defaultVisible;
      map.add(layer);
      added.push(source.title);
    } catch (error) {
      errors.push(`${source.title}: ${getErrorMessage(error)}`);
    }
  }

  return { added, errors };
}

export async function addMasterMapSupplementalLayers(map?: ArcGISMap) {
  return addArcgisPortalLayers(map, masterMapLayerSources);
}

// ── Chapter-view BIOMED group ─────────────────────────────────────────────
// "Lift" the 12 styled biomed layers (Blood Drives by Type, RBC Collections by
// County/Chapter/Region/Division, etc.) out of the chapter-view source web map
// (maps.jbf.com/chapter-view) and into the destination map as a single hidden
// "BIOMED" group. We reuse the source layer INSTANCES so their renderers and
// popup templates travel with them — no AGOL edit, no default symbology. The
// group is added hidden; collectArcJurisdictionLayers() reflects every map layer,
// so it surfaces in the workbench layer panel automatically and stays available
// for the side-panel popups in the dashboard / Explore Regions views.

function layerTitleKey(layer: Layer) {
  return (layer.title ?? "").trim().toLowerCase();
}

function detachFromParent(layer: Layer) {
  const parent = (layer as Layer & { parent?: { remove?: (l: Layer) => void } }).parent;
  parent?.remove?.(layer);
}

export async function addChapterViewBiomedGroup(map?: ArcGISMap) {
  const added: string[] = [];
  const errors: string[] = [];
  if (!map) return { added, errors };

  const groupTitle = chapterViewBiomedSource.groupTitle;
  // Idempotent: don't add a second BIOMED group on re-hydrate.
  const existing = (map.allLayers?.toArray?.() ?? []) as Layer[];
  if (existing.some((layer) => layerTitleKey(layer) === groupTitle.toLowerCase())) {
    return { added, errors };
  }

  const wantTitles = new Set(chapterViewBiomedSource.layerTitles.map((t) => t.toLowerCase()));

  try {
    const { default: WebMap } = await import("@arcgis/core/WebMap");
    const { default: GroupLayerCtor } = await import("@arcgis/core/layers/GroupLayer");

    const source = new WebMap({ portalItem: new PortalItem({ id: chapterViewBiomedSource.webMapItemId }) });
    await source.load();

    // Prefer lifting an existing BIOMED group whole (keeps its authored order).
    const topGroup = ((source.layers?.toArray?.() ?? []) as Layer[]).find(
      (layer) => layer.type === "group" && /biomed/i.test(layer.title ?? ""),
    ) as GroupLayer | undefined;

    let lifted: Layer[] = [];
    if (topGroup) {
      await topGroup.load();
      lifted = (topGroup.layers?.toArray?.() ?? []) as Layer[];
    } else {
      // Fall back to a title scan across the fully-loaded source tree.
      await source.loadAll();
      lifted = ((source.allLayers?.toArray?.() ?? []) as Layer[]).filter(
        (layer) => layer.type !== "group" && wantTitles.has(layerTitleKey(layer)),
      );
    }

    if (lifted.length === 0) {
      errors.push("No BIOMED layers found in the chapter-view source web map.");
      return { added, errors };
    }

    // Detach each layer from the throwaway source map, then adopt into a fresh
    // hidden group on the destination map.
    lifted.forEach((layer) => {
      detachFromParent(layer);
      layer.visible = false;
    });

    const group = new GroupLayerCtor({
      title: groupTitle,
      visible: false,
      visibilityMode: "independent",
      layers: lifted,
    });
    map.add(group);
    lifted.forEach((layer) => added.push(layer.title ?? "BIOMED layer"));
  } catch (error) {
    errors.push(getErrorMessage(error));
  }

  return { added, errors };
}
