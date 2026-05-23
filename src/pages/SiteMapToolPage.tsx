import "../legacy/legacy-maps.css";
import { createElement, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Database,
  ExternalLink,
  Globe2,
  Layers,
  MapPinned,
  RotateCcw,
  Search,
  ShieldCheck
} from "lucide-react";
import type ArcGISMap from "@arcgis/core/Map";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import { standaloneBiomedMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import { addMasterMapSupplementalLayers } from "../utils/arcgisMasterLayers";

type LayerMode = "all" | "collections" | "manufacturing" | "drives" | "geography";

type LayerSnapshot = {
  id: string;
  title: string;
  type: string;
  visible: boolean;
  category: "collections" | "manufacturing" | "drives" | "geography" | "reference";
  status: string;
};

type ArcgisRealMapElement = HTMLElement & {
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

const focusStops = [
  { id: "national", label: "National", center: [-98.5, 39.4], zoom: 4 },
  { id: "midwest", label: "Midwest", center: [-93.7, 41.7], zoom: 6 },
  { id: "southeast", label: "Southeast", center: [-84.5, 33.8], zoom: 6 }
];

const layerModes: Array<{
  id: LayerMode;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  { id: "all", label: "All", description: "Show the full web map.", icon: Layers },
  { id: "collections", label: "Collections", description: "Collection rollups and RBC layers.", icon: BarChart3 },
  { id: "manufacturing", label: "Manufacturing", description: "RBC manufacturing current-state layers.", icon: Database },
  { id: "drives", label: "Drives", description: "Drive and volunteer activity layers.", icon: Activity },
  { id: "geography", label: "Geography", description: "ARC geography and boundary layers.", icon: Globe2 }
];

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

function safeLayerTitle(layer: Layer) {
  return layer.title ?? layer.id ?? "Untitled ArcGIS layer";
}

function isBasemapLayer(title: string) {
  const normalized = normalizeTitle(title);
  return normalized.includes("basemap") || normalized.includes("light gray") || normalized.includes("dark gray");
}

function getLayerCategory(title: string): LayerSnapshot["category"] {
  const normalized = normalizeTitle(title);

  if (normalized.includes("manufacturing")) return "manufacturing";

  if (
    normalized.includes("master rc geo") ||
    normalized.includes("master_arc_geography") ||
    normalized.includes("state") ||
    normalized.includes("county") ||
    normalized.includes("chapter") ||
    normalized.includes("region") ||
    normalized.includes("division")
  ) {
    return "geography";
  }

  if (normalized.includes("drive") || normalized.includes("volunteer") || normalized.includes("mobile")) {
    return "drives";
  }

  if (
    normalized.includes("rbc") ||
    normalized.includes("collection") ||
    normalized.includes("biomed") ||
    normalized.includes("fixed")
  ) {
    return "collections";
  }

  return "reference";
}

function layerMatchesMode(title: string, mode: LayerMode) {
  if (isBasemapLayer(title)) return false;
  if (mode === "all") return true;
  return getLayerCategory(title) === mode;
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
  if (category === "collections") return "Collections";
  if (category === "manufacturing") return "Manufacturing";
  if (category === "drives") return "Drives";
  if (category === "geography") return "Geography";
  return "Reference";
}

export default function SiteMapToolPage() {
  useArcgisComponents();
  const navigate = useNavigate();
  const mapRef = useRef<ArcgisRealMapElement | null>(null);
  const placeSearchRef = useRef<HTMLInputElement | null>(null);
  const {
    status: authStatus,
    userId: authUser,
    error: authError,
    isAuthenticated,
    signIn
  } = useRedCrossArcGISAuth();
  const [activeMode, setActiveMode] = useState<LayerMode>("all");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeStatus, setPlaceStatus] = useState("Search the live map by city, county, state, chapter, or region.");
  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [layerSnapshots, setLayerSnapshots] = useState<LayerSnapshot[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const showSecureMap = isAuthenticated;

  const refreshSnapshots = useCallback(() => {
    const snapshots = buildSnapshots(mapRef.current?.map);
    setLayerSnapshots(snapshots);
    setSelectedLayerId((current) => {
      if (current && snapshots.some((layer) => layer.id === current)) return current;
      return snapshots.find((layer) => layer.visible)?.id ?? snapshots[0]?.id ?? "";
    });
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
  const selectedLayerIndex = layerSnapshots.findIndex((layer) => layer.id === selectedLayer?.id);
  const canSelectPrevious = selectedLayerIndex > 0;
  const canSelectNext = selectedLayerIndex > -1 && selectedLayerIndex < layerSnapshots.length - 1;
  const visibleCount = layerSnapshots.filter((layer) => layer.visible).length;
  const connectionStatus = !isAuthenticated
    ? "Sign in with Red Cross ArcGIS to load the private web map and real operational layers."
    : isMapReady
      ? "Real ArcGIS layers are connected."
      : "Connecting to the private BioMed web map.";
  const authButtonLabel =
    authStatus === "checking"
      ? "Checking ArcGIS"
      : authStatus === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? "Signed in"
          : "Sign in to ArcGIS";

  function selectAdjacentLayer(direction: -1 | 1) {
    if (!layerSnapshots.length) return;
    const nextIndex = Math.min(layerSnapshots.length - 1, Math.max(0, selectedLayerIndex + direction));
    setSelectedLayerId(layerSnapshots[nextIndex].id);
  }

  useEffect(() => {
    function isFormField(target: EventTarget | null) {
      return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isFormField(event.target)) {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        navigate("/maps");
      }

      if (event.key === "ArrowLeft" && canSelectPrevious) {
        event.preventDefault();
        selectAdjacentLayer(-1);
      }

      if (event.key === "ArrowRight" && canSelectNext) {
        event.preventDefault();
        selectAdjacentLayer(1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSelectNext, canSelectPrevious, navigate, selectedLayerIndex, layerSnapshots]);

  async function signInToArcGIS() {
    setLayerSnapshots([]);
    setLoadErrors([]);
    setIsMapReady(false);

    try {
      await signIn();
    } catch {
      setIsMapReady(true);
    }
  }

  function applyMode(mode: LayerMode) {
    const layers = collectLayers(mapRef.current?.map);
    layers.forEach((layer) => {
      layer.visible = layerMatchesMode(safeLayerTitle(layer), mode);
    });
    setActiveMode(mode);
    refreshSnapshots();
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

  function resetView() {
    applyMode("all");
    void mapRef.current?.goTo?.({ center: focusStops[0].center, zoom: focusStops[0].zoom }, { duration: 700 });
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

  return (
    <section className="site-map-tool" data-testid="site-map-tool" aria-label="Collection site map search tool">
      <div className="site-tool-map" data-testid="site-map-canvas">
        {createElement(
          "arcgis-map",
          {
            key: showSecureMap ? standaloneBiomedMapSource.webMapItemId : "site-map-real-preview",
            ref: mapRef,
            itemId: showSecureMap ? standaloneBiomedMapSource.webMapItemId : undefined,
            basemap: showSecureMap ? undefined : "gray-vector",
            center: focusStops[0].center.join(","),
            zoom: focusStops[0].zoom,
            className: "site-tool-arcgis-map",
            "data-testid": "site-map-arcgis",
            "aria-label": "Real BioMed ArcGIS web map"
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
        <div className="site-tool-vignette" aria-hidden="true" />
      </div>

      <button
        className="site-panel-toggle site-panel-toggle-left"
        type="button"
        aria-label={isSearchOpen ? "Hide search filters" : "Show search filters"}
        aria-expanded={isSearchOpen}
        onClick={() => setIsSearchOpen((current) => !current)}
      >
        {isSearchOpen ? <ArrowLeft aria-hidden="true" size={16} /> : <Search aria-hidden="true" size={16} />}
        <span>{isSearchOpen ? "Hide" : "Search"}</span>
      </button>

      <button
        className="site-panel-toggle site-panel-toggle-right"
        type="button"
        aria-label={isDetailOpen ? "Hide layer detail" : "Show layer detail"}
        aria-expanded={isDetailOpen}
        onClick={() => setIsDetailOpen((current) => !current)}
      >
        <span>{isDetailOpen ? "Hide" : "Layers"}</span>
        {isDetailOpen ? <ArrowRight aria-hidden="true" size={16} /> : <Layers aria-hidden="true" size={16} />}
      </button>

      <aside className="site-tool-search" data-collapsed={isSearchOpen ? "false" : "true"} aria-label="Live map controls">
        <div className="site-tool-detail-heading">
          <span className="site-type-badge type-mobile">
            <Database aria-hidden="true" size={15} />
            Real ArcGIS web map
          </span>
          <h1>Mobile & Fixed Site Locations</h1>
          <p>{connectionStatus}</p>
          {authUser && <p className="site-tool-source-note">Signed in as {authUser}.</p>}
        </div>

        <div className="site-tool-mode site-tool-mode-five" role="group" aria-label="Layer mode">
          {layerModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={activeMode === mode.id}
              disabled={!isAuthenticated}
              onClick={() => applyMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <form className="site-tool-query site-tool-query-form" onSubmit={searchPlace}>
          <Search aria-hidden="true" size={16} />
          <input
            ref={placeSearchRef}
            id="site-search"
            name="biomed-location-filter"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Search Dallas, Cook County, Tennessee..."
          />
          <button type="submit" disabled={!isAuthenticated}>
            Go
          </button>
        </form>
        <p className="site-tool-source-note">{placeStatus}</p>

        {!isAuthenticated && (
          <div className="site-tool-auth-card" role="region" aria-label="ArcGIS sign-in required">
            <ShieldCheck aria-hidden="true" size={18} />
            <div>
              <strong>Private Red Cross layers</strong>
              <p>The map item is not public. Sign in to load the real data and layer popups.</p>
              <button
                type="button"
                onClick={signInToArcGIS}
                disabled={authStatus === "checking" || authStatus === "signing-in"}
              >
                {authButtonLabel}
              </button>
              {authError && <small>{authError}</small>}
            </div>
          </div>
        )}

        {isAuthenticated && (
          <div className="site-tool-results" aria-label="Live map layers">
            <div className="site-tool-result-count">
              <Layers aria-hidden="true" size={15} />
              {visibleCount} of {layerSnapshots.length || "..."} layers showing
            </div>
            {layerSnapshots.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={layer.id === selectedLayer?.id ? "is-active" : ""}
                onClick={() => toggleLayer(layer.id)}
              >
                <Database aria-hidden="true" size={17} />
                <span>
                  <strong>{layer.title}</strong>
                  <small>
                    {formatCategory(layer.category)} · {layer.visible ? "visible" : "hidden"}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <aside
        className="site-tool-detail"
        data-testid="selected-site-detail"
        data-collapsed={isDetailOpen ? "false" : "true"}
        aria-label="Selected live layer detail"
      >
        <div className="site-tool-detail-heading">
          <span className="site-type-badge type-fixed">
            <Layers aria-hidden="true" size={15} />
            {selectedLayer ? formatCategory(selectedLayer.category) : "Live map"}
          </span>
          <h2>{selectedLayer?.title ?? "BioMed Blood Map"}</h2>
          <p>
            {selectedLayer
              ? "This panel now reflects the selected layer in the private ArcGIS web map. Use the built-in popup, layer list, and legend for feature-level detail."
              : "Sign in to replace the old synthetic records with the private ArcGIS web map."}
          </p>
        </div>

        <div className="site-tool-metrics">
          <article>
            <span>Source</span>
            <strong>ArcGIS</strong>
          </article>
          <article>
            <span>Visible</span>
            <strong>{selectedLayer?.visible ? "Yes" : "No"}</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>{selectedLayer?.status ?? (isAuthenticated ? "Loading" : "Sign in")}</strong>
          </article>
        </div>

        <div className="site-tool-market">
          <h3>Connected Web Map</h3>
          <dl>
            <div>
              <dt>Item</dt>
              <dd>{standaloneBiomedMapSource.title}</dd>
            </div>
            <div>
              <dt>Layer Type</dt>
              <dd>{selectedLayer?.type ?? "Private"}</dd>
            </div>
            <div>
              <dt>Client ID</dt>
              <dd>3s32R5gBZAwRtMuT</dd>
            </div>
            <div>
              <dt>Redirect</dt>
              <dd>Vercel OAuth callback</dd>
            </div>
          </dl>
        </div>

        <div className="site-tool-snapshot">
          <h3>Map Tools</h3>
          <div className="site-tool-focus-grid" role="group" aria-label="Map focus stops">
            {focusStops.map((stop) => (
              <button
                key={stop.id}
                type="button"
                disabled={!isAuthenticated}
                onClick={() => void mapRef.current?.goTo?.({ center: stop.center, zoom: stop.zoom }, { duration: 700 })}
              >
                {stop.label}
              </button>
            ))}
          </div>
          <div className="site-tool-source-actions">
            <a href={standaloneBiomedMapSource.mapViewerUrl} target="_blank" rel="noreferrer">
              <MapPinned aria-hidden="true" size={16} />
              Open in ArcGIS
            </a>
            <a href={standaloneBiomedMapSource.itemUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" size={16} />
              Item
            </a>
            <button type="button" disabled={!isAuthenticated} onClick={resetView}>
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </button>
          </div>
        </div>

        {loadErrors.length > 0 && (
          <div className="site-tool-auth-card" role="status">
            <ShieldCheck aria-hidden="true" size={18} />
            <div>
              <strong>Layer warnings</strong>
              {loadErrors.slice(0, 3).map((error) => (
                <small key={error}>{error}</small>
              ))}
            </div>
          </div>
        )}
      </aside>

      <nav className="presentation-controls site-tool-controls" aria-label="Map layer navigation">
        <button
          className="presentation-control"
          type="button"
          aria-label="Previous layer"
          disabled={!canSelectPrevious}
          onClick={() => selectAdjacentLayer(-1)}
        >
          <span className="presentation-key" aria-hidden="true">
            <ArrowLeft size={14} />
          </span>
          <span>Back</span>
        </button>
        <Link className="presentation-control presentation-control-home" to="/hub" aria-label="Map Menu">
          <span className="presentation-key" aria-hidden="true">
            <ArrowUp size={14} />
          </span>
          <span>Maps</span>
        </Link>
        <button
          className="presentation-control"
          type="button"
          aria-label="Next layer"
          disabled={!canSelectNext}
          onClick={() => selectAdjacentLayer(1)}
        >
          <span>Next</span>
          <span className="presentation-key" aria-hidden="true">
            <ArrowRight size={14} />
          </span>
        </button>
      </nav>
    </section>
  );
}
