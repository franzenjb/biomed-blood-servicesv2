import { useEffect, useState } from "react";

let arcgisComponentsPromise: Promise<void> | undefined;

export function loadArcgisComponents() {
  if (!arcgisComponentsPromise) {
    arcgisComponentsPromise = Promise.all([
      import("@arcgis/core/config"),
      import("@arcgis/core/assets/esri/themes/light/main.css"),
      import("@arcgis/map-components/components/arcgis-basemap-toggle"),
      import("@arcgis/map-components/components/arcgis-expand"),
      import("@arcgis/map-components/components/arcgis-fullscreen"),
      import("@arcgis/map-components/components/arcgis-home"),
      import("@arcgis/map-components/components/arcgis-layer-list"),
      import("@arcgis/map-components/components/arcgis-legend"),
      import("@arcgis/map-components/components/arcgis-map"),
      import("@arcgis/map-components/components/arcgis-scale-bar"),
      import("@arcgis/map-components/components/arcgis-search"),
      import("@arcgis/map-components/components/arcgis-zoom")
    ]).then(([configModule]) => {
      configModule.default.portalUrl = "https://arc-nhq-gis.maps.arcgis.com";
    });
  }

  return arcgisComponentsPromise;
}

export function useArcgisComponents() {
  const [isReady, setIsReady] = useState(() => Boolean(globalThis.customElements?.get("arcgis-map")));

  useEffect(() => {
    let cancelled = false;

    void loadArcgisComponents().then(() => {
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return isReady;
}
