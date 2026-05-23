import "../legacy/legacy-maps.css";
import { createElement, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Database,
  ExternalLink,
  Globe2,
  Layers,
  MapPinned,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import type ArcGISMap from "@arcgis/core/Map";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import { standaloneBiomedMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { checkRedCrossArcGISSignIn, ensureRedCrossOAuth, signInToRedCrossArcGIS } from "../utils/arcgisOAuth";
import { addMasterMapSupplementalLayers } from "../utils/arcgisMasterLayers";

type LayerPreset =
  | "all"
  | "drives"
  | "collections"
  | "states"
  | "counties"
  | "chapters"
  | "regions"
  | "divisions"
  | "manufacturing"
  | "cities";

type LayerSnapshot = {
  id: string;
  title: string;
  type: string;
  visible: boolean;
  category: "drives" | "collections" | "manufacturing" | "geography" | "reference";
  status: string;
};

type AuthStatus = "checking" | "signed-out" | "signing-in" | "signed-in" | "error";

type ArcgisLiveMapElement = HTMLElement & {
  goTo?: (target: unknown, options?: { duration?: number }) => Promise<void>;
  loadErrorSources?: Array<{ loadError?: { message?: string }; source?: { title?: string } }>;
  map?: ArcGISMap;
  view?: MapView;
};

type WatchHandle = {
  remove?: () => void;
};

type WatchableLayer = Layer & {
  fullExtent?: unknown;
  loadStatus?: string;
  url?: string;
  watch?: (propertyName: string, callback: () => void) => WatchHandle;
};

const dataPresets: Array<{
  id: LayerPreset;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  {
    id: "all",
    label: "Everything",
    description: "Show the full BioMed map.",
    icon: Layers
  },
  {
    id: "drives",
    label: "Blood drives",
    description: "Where drives are happening.",
    icon: Activity
  },
  {
    id: "collections",
    label: "RBC collections",
    description: "Collection totals by area.",
    icon: BarChart3
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    description: "RBC manufacturing current state.",
    icon: Database
  }
];

const geographyPresets: Array<{
  id: LayerPreset;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  {
    id: "states",
    label: "States",
    description: "Start broad.",
    icon: Globe2
  },
  {
    id: "counties",
    label: "Counties",
    description: "Compare local areas.",
    icon: Globe2
  },
  {
    id: "chapters",
    label: "Chapters",
    description: "See chapter coverage.",
    icon: Globe2
  },
  {
    id: "regions",
    label: "Regions",
    description: "View regional boundaries.",
    icon: Globe2
  },
  {
    id: "divisions",
    label: "Divisions",
    description: "Roll up to division level.",
    icon: Globe2
  },
  {
    id: "cities",
    label: "Cities",
    description: "Type a city above.",
    icon: Globe2
  }
];

const focusStops = [
  {
    id: "national",
    label: "National",
    detail: "Whole map",
    center: [-98.5, 39.4],
    zoom: 4
  },
  {
    id: "tract",
    label: "Dallas",
    detail: "Local detail",
    center: [-96.8, 32.88],
    zoom: 10
  },
  {
    id: "midwest",
    label: "Midwest",
    detail: "Regional view",
    center: [-93.7, 41.7],
    zoom: 6
  }
];

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

function safeLayerTitle(layer: Layer) {
  return layer.title ?? layer.id ?? "Untitled BioMed layer";
}

function isBasemapLayer(title: string) {
  const normalized = normalizeTitle(title);
  return normalized.includes("light gray") || normalized.includes("dark gray") || normalized.includes("base");
}

function getLayerCategory(title: string): LayerSnapshot["category"] {
  const normalized = normalizeTitle(title);
  if (normalized.includes("manufacturing")) return "manufacturing";
  if (normalized.includes("master rc geo") || normalized.includes("master_arc_geography")) return "geography";
  if (normalized.includes("drive") || normalized.includes("latino")) return "drives";
  if (
    normalized.includes("rbc") ||
    normalized.includes("total collections") ||
    normalized.includes("biomed collections") ||
    normalized.includes("zip codes")
  ) {
    return "collections";
  }
  return "reference";
}

function layerMatchesPreset(title: string, preset: LayerPreset) {
  if (isBasemapLayer(title)) return false;
  if (preset === "all" || preset === "cities") return true;
  if (preset === "manufacturing") return getLayerCategory(title) === "manufacturing";

  const normalized = normalizeTitle(title);
  if (normalized === "biomed") return preset === "drives" || preset === "collections";
  if (preset === "states") return normalized.includes("state");
  if (preset === "counties") return normalized.includes("county") || normalized.includes("counties");
  if (preset === "chapters") return normalized.includes("chapter");
  if (preset === "regions") return normalized.includes("region");
  if (preset === "divisions") return normalized.includes("division");

  return getLayerCategory(title) === preset;
}

function collectLayers(map?: ArcGISMap): WatchableLayer[] {
  return ((map?.allLayers?.toArray?.() ?? []) as WatchableLayer[]).filter((layer) => {
    const title = safeLayerTitle(layer);
    return title && !isBasemapLayer(title);
  });
}

function buildSnapshots(map?: ArcGISMap): LayerSnapshot[] {
  return collectLayers(map).map((layer) => ({
    id: layer.id,
    title: safeLayerTitle(layer),
    type: layer.type,
    visible: layer.visible,
    category: getLayerCategory(safeLayerTitle(layer)),
    status: layer.loadStatus ?? "ready"
  }));
}

function formatCategory(category: LayerSnapshot["category"]) {
  if (category === "drives") return "Drive";
  if (category === "collections") return "RBC";
  if (category === "manufacturing") return "Manufacturing";
  if (category === "geography") return "Geo";
  return "Ref";
}

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "";
  if (/aborted/i.test(message)) return "ArcGIS sign-in was closed or blocked before it completed.";
  if (message) return message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "ArcGIS sign-in did not complete.";
}

export default function BiomedLiveMapToolPage() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisLiveMapElement | null>(null);
  const placeSearchRef = useRef<HTMLInputElement | null>(null);
  const leftPanelRef = useRef<HTMLElement | null>(null);
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const [showSecureMap, setShowSecureMap] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authUser, setAuthUser] = useState("");
  const [authError, setAuthError] = useState("");
  const [activePreset, setActivePreset] = useState<LayerPreset>("all");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeStatus, setPlaceStatus] = useState("Search by city, state, county, chapter, region, or division.");
  const [layerSnapshots, setLayerSnapshots] = useState<LayerSnapshot[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const isAuthenticated = authStatus === "signed-in";

  const refreshSnapshots = useCallback(() => {
    const snapshots = buildSnapshots(mapRef.current?.map);
    setLayerSnapshots(snapshots);
    setSelectedLayerId((current) => {
      if (current && snapshots.some((layer) => layer.id === current)) return current;
      return snapshots.find((layer) => layer.visible)?.id ?? snapshots[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    leftPanelRef.current?.scrollTo({ top: 0 });
    rightPanelRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    let cancelled = false;

    ensureRedCrossOAuth();
    void checkRedCrossArcGISSignIn()
      .then((credential) => {
        if (cancelled) return;
        setAuthUser(credential.userId ?? "Red Cross ArcGIS");
        setAuthStatus("signed-in");
        setShowSecureMap(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthStatus("signed-out");
        setShowSecureMap(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handles: WatchHandle[] = [];

    async function hydrateMap() {
      const mapElement = mapRef.current;
      if (!mapElement || cancelled) return;

      await mapElement.view?.when?.();
      if (cancelled) return;

      const supplemental = await addMasterMapSupplementalLayers(mapElement.map ?? mapElement.view?.map ?? undefined);
      if (cancelled) return;

      setIsMapReady(true);
      setLoadErrors(
        [
          ...(mapElement.loadErrorSources ?? [])
          .map((entry) => entry.loadError?.message || entry.source?.title)
          .filter((message): message is string => Boolean(message)),
          ...supplemental.errors
        ]
      );
      refreshSnapshots();

      collectLayers(mapElement.map).forEach((layer) => {
        const handle = layer.watch?.("visible", refreshSnapshots);
        if (handle) handles.push(handle);
      });
    }

    if (!showSecureMap) {
      setIsMapReady(false);
      setLayerSnapshots([]);
      setLoadErrors([]);
      return undefined;
    }

    const mapElement = mapRef.current;
    if (mapElement?.view) {
      void hydrateMap();
    } else {
      mapElement?.addEventListener("arcgisViewReadyChange", hydrateMap, { once: true });
    }

    return () => {
      cancelled = true;
      handles.forEach((handle) => handle.remove?.());
    };
  }, [refreshSnapshots, showSecureMap]);

  const selectedLayer = useMemo(
    () => layerSnapshots.find((layer) => layer.id === selectedLayerId) ?? layerSnapshots[0],
    [layerSnapshots, selectedLayerId]
  );
  const layerStatusTitle = selectedLayer?.title ?? (isAuthenticated ? "Waiting for ArcGIS layers" : "Sign in required");
  const layerStatusFallback = isAuthenticated ? "loading" : "signed out";
  const connectionStatus = !isAuthenticated
    ? "Sign in with the Red Cross ArcGIS account flow to view the private BioMed map."
    : isMapReady
      ? "BioMed layers are connected."
      : "Connecting to the secure BioMed map.";
  const authButtonLabel =
    authStatus === "checking"
      ? "Checking ArcGIS"
      : authStatus === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? "Signed in"
          : "Sign in to ArcGIS";

  const visibleCount = layerSnapshots.filter((layer) => layer.visible).length;
  const categoryCounts = useMemo(() => {
    return layerSnapshots.reduce<Record<LayerSnapshot["category"], number>>(
      (counts, layer) => {
        counts[layer.category] += 1;
        return counts;
      },
      { drives: 0, collections: 0, manufacturing: 0, geography: 0, reference: 0 }
    );
  }, [layerSnapshots]);

  function focusMapSearch() {
    placeSearchRef.current?.focus();
  }

  function applyPreset(preset: LayerPreset) {
    const layers = collectLayers(mapRef.current?.map);
    layers.forEach((layer) => {
      layer.visible = layerMatchesPreset(safeLayerTitle(layer), preset);
    });
    setActivePreset(preset);
    if (preset === "cities") focusMapSearch();
    refreshSnapshots();
  }

  function resetView() {
    applyPreset("all");
    void mapRef.current?.goTo?.({ center: focusStops[0].center, zoom: focusStops[0].zoom }, { duration: 700 });
  }

  async function signInToArcGIS() {
    ensureRedCrossOAuth();
    setAuthStatus("signing-in");
    setAuthError("");
    setLayerSnapshots([]);
    setLoadErrors([]);
    setIsMapReady(false);

    try {
      const credential = await signInToRedCrossArcGIS();
      setAuthUser(credential.userId ?? "Red Cross ArcGIS");
      setAuthStatus("signed-in");
      setShowSecureMap(true);
    } catch (error) {
      setAuthError(getErrorMessage(error));
      setAuthStatus("error");
      setShowSecureMap(false);
    }
  }

  async function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = placeQuery.trim();
    if (!query) {
      placeSearchRef.current?.focus();
      return;
    }

    setPlaceStatus("Searching...");
    try {
      const params = new URLSearchParams({
        SingleLine: query,
        countryCode: "USA",
        maxLocations: "1",
        outFields: "LongLabel,Place_addr,Addr_type",
        f: "json"
      });
      const response = await fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params.toString()}`
      );
      const data = (await response.json()) as {
        candidates?: Array<{
          address?: string;
          location?: { x: number; y: number };
          attributes?: { LongLabel?: string; Place_addr?: string };
        }>;
      };
      const candidate = data.candidates?.[0];

      if (!candidate?.location) {
        setPlaceStatus("No place found. Try adding a state abbreviation.");
        return;
      }

      await mapRef.current?.goTo?.(
        { center: [candidate.location.x, candidate.location.y], zoom: 10 },
        { duration: 700 }
      );
      setPlaceStatus(`Showing ${candidate.attributes?.LongLabel ?? candidate.address ?? query}`);
    } catch {
      setPlaceStatus("Place search is unavailable right now.");
    }
  }

  function toggleLayer(layerId: string) {
    const layer = collectLayers(mapRef.current?.map).find((candidate) => candidate.id === layerId);
    if (!layer) return;

    layer.visible = !layer.visible;
    setSelectedLayerId(layerId);
    if (layer.visible && layer.fullExtent) {
      void mapRef.current?.goTo?.(layer.fullExtent, { duration: 650 });
    }
    refreshSnapshots();
  }

  return (
    <section className="biomed-live-tool" data-testid="biomed-live-tool" aria-label="Live BioMed operations atlas">
      <div className="biomed-live-map-shell" data-testid="biomed-live-map-shell">
        {createElement(
          "arcgis-map",
          {
            key: showSecureMap ? standaloneBiomedMapSource.webMapItemId : "biomed-preview-map",
            ref: mapRef,
            itemId: showSecureMap ? standaloneBiomedMapSource.webMapItemId : undefined,
            basemap: showSecureMap ? undefined : "gray-vector",
            center: focusStops[0].center.join(","),
            zoom: focusStops[0].zoom,
            className: "biomed-live-arcgis-map",
            "data-testid": "biomed-live-arcgis",
            "aria-label": "Standalone BioMed ArcGIS web map"
          },
          [
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-fullscreen", { key: "fullscreen", slot: "top-left" }),
            createElement(
              "arcgis-expand",
              {
                key: "layer-list",
                slot: "top-right",
                icon: "layers",
                label: "Layer list",
                mode: "floating"
              },
              createElement("arcgis-layer-list", {
                filterPlaceholder: "Filter BioMed layers",
                headingLevel: 3,
                showFilter: true
              })
            ),
            createElement(
              "arcgis-expand",
              {
                key: "legend",
                slot: "bottom-left",
                icon: "legend",
                label: "Legend",
                mode: "floating"
              },
              createElement("arcgis-legend", {
                headingLevel: 3,
                hideLayersNotInCurrentView: true
              })
            ),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
            createElement("arcgis-basemap-toggle", {
              key: "basemap",
              slot: "bottom-right",
              nextBasemap: "hybrid"
            })
          ]
        )}
        <div className="biomed-live-vignette" aria-hidden="true" />
      </div>

      <header className="biomed-live-command" aria-label="BioMed atlas command panel">
        <Link className="biomed-live-back" to="/hub">
          <ArrowLeft aria-hidden="true" size={16} />
          Map Menu
        </Link>
        <div className="biomed-live-title-block">
          <h1>BioMed Blood Map</h1>
          <p>Find a state, county, chapter, region, division, or city and inspect the BioMed data behind it.</p>
        </div>
        <div className="biomed-live-actions" aria-label="Source links">
          {isAuthenticated && (
            <button type="button" disabled>
              <Database aria-hidden="true" size={16} />
              Signed in
            </button>
          )}
          <a href={standaloneBiomedMapSource.mapViewerUrl} target="_blank" rel="noreferrer">
            <MapPinned aria-hidden="true" size={16} />
            Open in ArcGIS
          </a>
          <a href={standaloneBiomedMapSource.itemUrl} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" size={16} />
            Item
          </a>
        </div>
      </header>

      {!isAuthenticated && (
        <div className="biomed-live-signin-overlay" role="region" aria-label="ArcGIS sign-in required">
          <div className="biomed-live-signin-card">
            <div className="biomed-live-signin-mark" aria-hidden="true">
              +
            </div>
            <h2>Sign in to view the map</h2>
            <p>{connectionStatus}</p>
            <button
              type="button"
              onClick={signInToArcGIS}
              disabled={authStatus === "checking" || authStatus === "signing-in"}
            >
              {authButtonLabel}
            </button>
            {authError && <small>{authError}</small>}
            <Link to="/map-v3">Open Master Map</Link>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <aside ref={leftPanelRef} className="biomed-live-left" aria-label="Presentation controls">
          <div className="biomed-live-start-card">
            <div className="biomed-live-status-line">
              <span className={isMapReady ? "is-live" : ""} />
              {isMapReady ? "Ready" : "Signed in"}
            </div>
            <h2>{isMapReady ? "Map is ready" : "Start with the live layers"}</h2>
            <p>{connectionStatus}</p>
            {authUser && <small className="biomed-live-source-note">Signed in as {authUser}.</small>}
            <small className="biomed-live-source-note">Sources: CM - Volunteers and Biomed Collections 22-26.</small>
            <small className="biomed-live-source-note">Click any shaded area or marker to see its data.</small>
          </div>

          <form className="biomed-live-place-search" onSubmit={searchPlace}>
            <label htmlFor="biomed-place-search">Find a place</label>
            <div>
              <input
                ref={placeSearchRef}
                id="biomed-place-search"
                value={placeQuery}
                onChange={(event) => setPlaceQuery(event.target.value)}
                placeholder="Dallas, TX or Cook County, IL"
              />
              <button type="submit">Search</button>
            </div>
            <small>{placeStatus}</small>
          </form>

          <div className="biomed-live-panel">
            <div className="biomed-live-panel-heading">
              <Layers aria-hidden="true" size={18} />
              <div>
                <h2>Choose data</h2>
                <p>Pick the BioMed data to show.</p>
              </div>
            </div>
            <div className="biomed-live-presets data" role="group" aria-label="BioMed data presets">
              {dataPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={activePreset === preset.id}
                    onClick={() => applyPreset(preset.id)}
                  >
                    <Icon aria-hidden="true" size={17} />
                    <span>
                      <strong>{preset.label}</strong>
                      <small>{preset.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="biomed-live-panel">
            <div className="biomed-live-panel-heading">
              <Globe2 aria-hidden="true" size={18} />
              <div>
                <h2>Choose place type</h2>
                <p>Switch the map to the geography your user understands.</p>
              </div>
            </div>
            <div className="biomed-live-presets area" role="group" aria-label="Place type presets">
              {geographyPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={activePreset === preset.id}
                    onClick={() => applyPreset(preset.id)}
                  >
                    <Icon aria-hidden="true" size={17} />
                    <span>
                      <strong>{preset.label}</strong>
                      <small>{preset.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="biomed-live-footnote">
            <ShieldCheck aria-hidden="true" size={16} />
            <span>Need the V1 comparison version?</span>
            <Link to="/map-v3">Open Master Map</Link>
          </div>
        </aside>
      )}

      {isAuthenticated && (
        <aside ref={rightPanelRef} className="biomed-live-right" aria-label="Live layer status">
          <div className="biomed-live-layer-summary">
            <div>
              <span>Layers showing</span>
              <strong>
                {visibleCount}
                <small> / {layerSnapshots.length || "..."}</small>
              </strong>
            </div>
            <button type="button" onClick={resetView}>
              <RotateCcw aria-hidden="true" size={15} />
              Reset
            </button>
          </div>

          <div className="biomed-live-category-strip" aria-label="Layer category counts">
            <span>Drives {categoryCounts.drives}</span>
            <span>RBC {categoryCounts.collections}</span>
            <span>Mfg {categoryCounts.manufacturing}</span>
            <span>Areas {categoryCounts.geography}</span>
          </div>

          <div className="biomed-live-selected-layer">
            <p>
              <Database aria-hidden="true" size={16} />
              Current layer
            </p>
            <h2>{layerStatusTitle}</h2>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{selectedLayer?.type ?? layerStatusFallback}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedLayer?.status ?? layerStatusFallback}</dd>
              </div>
              <div>
                <dt>Visible</dt>
                <dd>{selectedLayer?.visible ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </div>

          {loadErrors.length > 0 && (
            <div className="biomed-live-errors" role="status">
              <strong>Layer warnings</strong>
              {loadErrors.slice(0, 3).map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
