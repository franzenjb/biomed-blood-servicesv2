import type ArcGISMap from "@arcgis/core/Map";
import Layer from "@arcgis/core/layers/Layer";
import PortalItem from "@arcgis/core/portal/PortalItem";
import { masterMapLayerSources } from "../config/arcgisLayers";

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

export async function addMasterMapSupplementalLayers(map?: ArcGISMap) {
  const added: string[] = [];
  const errors: string[] = [];

  if (!map) return { added, errors };

  for (const source of masterMapLayerSources) {
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
