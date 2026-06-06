import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Extent from "@arcgis/core/geometry/Extent";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Field from "@arcgis/core/layers/support/Field";
import type MapView from "@arcgis/core/views/MapView";
import { ChevronDown, Filter, Layers, MapPinned, PanelLeftOpen, PanelRightOpen, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import RcMark from "../components/RcMark";
import { arcJurisdictionMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  getMapElementMap,
  presenterModes,
  previewLayerSnapshots,
  safeLayerTitle,
  shouldShowLayerForPresenterMode,
  sourceGroups,
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
  type BioMedPresenterModeId,
} from "../utils/biomedMapSuite";
import { summarizeMasterFeature, type MasterFeatureSummary } from "../utils/masterMapFeatures";
import "./BiomedOpsWorkbenchPage.css";

type WorkbenchPreset = BioMedPresenterModeId | "all-layers" | "clean-map";
type WatchHandle = { remove?: () => void };
type ArcgisSearchElement = HTMLElement & {
  popupDisabled?: boolean;
  popupTemplate?: unknown;
  resultGraphicDisabled?: boolean;
  viewModel?: {
    popupEnabled?: boolean;
    popupTemplate?: unknown;
    resultGraphicEnabled?: boolean;
  };
};
type SearchStatus = "idle" | "searching" | "ready" | "empty" | "blocked" | "error";
type FeatureSearchResult = {
  id: string;
  title: string;
  layerTitle: string;
  category: BioMedLayerSnapshot["category"];
  layer: FeatureLayer;
  graphic: Graphic;
};

const HOME_CENTER: [number, number] = [-96.2, 38.3];
const CENTER = HOME_CENTER.join(",");
const ZOOM = 4;
const SEARCH_PER_LAYER_LIMIT = 4;
const SEARCH_TOTAL_LIMIT = 24;
const SEARCH_FIELD_HINTS = [
  "name",
  "title",
  "division",
  "region",
  "district",
  "chapter",
  "county",
  "site",
  "facility",
  "zip",
  "city",
  "address",
  "portfolio",
  "code"
];

function layerMatchesQuery(layer: BioMedLayerSnapshot, query: string) {
  const text = `${layer.title} ${layer.summary} ${layer.useCase} ${layer.category}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function isSearchableFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatures === "function" && typeof (layer as FeatureLayer).createQuery === "function";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ");
}

function isSqlSafeFieldName(fieldName: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName);
}

function isUsefulSearchField(field: Field) {
  if (field.type !== "string" || !isSqlSafeFieldName(field.name)) return false;
  const normalized = normalizeFieldName(`${field.name} ${field.alias ?? ""} ${field.valueType ?? ""}`);
  return SEARCH_FIELD_HINTS.some((hint) => normalized.includes(hint));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function getFeatureSearchFields(layer: FeatureLayer) {
  const fields = layer.fields ?? [];
  const displayField = fields.find((field) => field.name === layer.displayField && field.type === "string");
  const preferred = fields.filter(isUsefulSearchField);
  const fallback = fields.filter((field) => field.type === "string" && isSqlSafeFieldName(field.name)).slice(0, 10);
  return uniqueStrings([displayField?.name, ...preferred.map((field) => field.name), ...fallback.map((field) => field.name)]).slice(0, 12);
}

function escapeSqlLikeTerm(term: string) {
  return term.trim().replace(/'/g, "''").toUpperCase();
}

function buildSearchWhere(fields: string[], term: string) {
  const escapedTerm = escapeSqlLikeTerm(term);
  return fields.map((field) => `UPPER(${field}) LIKE '%${escapedTerm}%'`).join(" OR ");
}

function zoomTargetForGeometry(geometry: Geometry) {
  const extent = geometry.extent as Extent | null | undefined;
  if (extent) return extent.clone().expand(1.35);
  return {
    target: geometry,
    zoom: 9
  };
}

function shouldShowLayerForPreset(layer: BioMedLayerSnapshot, nextPreset: WorkbenchPreset) {
  if (nextPreset === "clean-map") return false;
  if (nextPreset === "all-layers") return true;
  return shouldShowLayerForPresenterMode(layer, nextPreset);
}

export default function BiomedOpsWorkbenchPage() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const searchRef = useRef<ArcgisSearchElement | null>(null);
  const searchRunRef = useRef(0);
  const [preset, setPreset] = useState<WorkbenchPreset>("all-layers");
  const [layers, setLayers] = useState<BioMedLayerSnapshot[]>(previewLayerSnapshots);
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResults, setSearchResults] = useState<FeatureSearchResult[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sourceGroups.map((group) => [group.id, true])),
  );
  const [selectedFeature, setSelectedFeature] = useState<MasterFeatureSummary | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  const filteredLayers = useMemo(
    () => layers.filter((layer) => layerMatchesQuery(layer, query)),
    [layers, query],
  );

  const layerCounts = useMemo(
    () =>
      layers.reduce(
        (counts, layer) => {
          counts.total += 1;
          if (layer.visible) counts.visible += 1;
          return counts;
        },
        { total: 0, visible: 0 },
      ),
    [layers],
  );

  const refreshLayers = useCallback(() => {
    setLayers(buildLayerSnapshots(getMapElementMap(mapRef.current)));
  }, []);

  const closeSearchPopup = useCallback(() => {
    const view = mapRef.current?.view as (MapView & { popup?: { close?: () => void } }) | undefined;
    view?.popup?.close?.();
  }, []);

  const disableSearchPopup = useCallback(() => {
    const searchElement = searchRef.current;
    if (!searchElement) return;
    searchElement.popupDisabled = true;
    searchElement.popupTemplate = null;
    searchElement.resultGraphicDisabled = true;
    if (searchElement.viewModel) {
      searchElement.viewModel.popupEnabled = false;
      searchElement.viewModel.popupTemplate = null;
      searchElement.viewModel.resultGraphicEnabled = false;
    }
  }, []);

  const runFeatureSearch = useCallback(
    async (term: string, runId: number) => {
      const map = getMapElementMap(mapRef.current);
      if (!map || !isAuthenticated) {
        setSearchResults([]);
        setSearchStatus(isAuthenticated ? "idle" : "blocked");
        return;
      }

      const featureLayers = collectArcJurisdictionLayers(map).filter(isSearchableFeatureLayer);
      const settled = await Promise.allSettled(
        featureLayers.map(async (layer) => {
          await layer.load?.();
          const fields = getFeatureSearchFields(layer);
          if (fields.length === 0) return [];

          const searchQuery = layer.createQuery();
          searchQuery.where = buildSearchWhere(fields, term);
          searchQuery.outFields = ["*"];
          searchQuery.returnGeometry = true;
          searchQuery.num = SEARCH_PER_LAYER_LIMIT;

          const featureSet = await layer.queryFeatures(searchQuery);
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
              graphic
            } satisfies FeatureSearchResult;
          });
        }),
      );

      if (runId !== searchRunRef.current) return;

      const results = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])).slice(0, SEARCH_TOTAL_LIMIT);
      setSearchResults(results);
      setSearchStatus(results.length > 0 ? "ready" : "empty");
    },
    [isAuthenticated],
  );

  const applyPreset = useCallback(
    (nextPreset: WorkbenchPreset) => {
      setPreset(nextPreset);
      const map = getMapElementMap(mapRef.current);
      const mapLayers = collectArcJurisdictionLayers(map);
      if (!map || mapLayers.length === 0) {
        setLayers((current) => current.map((layer) => ({ ...layer, visible: shouldShowLayerForPreset(layer, nextPreset) })));
        return;
      }

      const nextSnapshots = buildLayerSnapshots(map);
      mapLayers.forEach((layer) => {
        const snapshot = nextSnapshots.find((item) => item.id === layer.id);
        if (!snapshot) return;
        layer.visible = shouldShowLayerForPreset(snapshot, nextPreset);
      });
      refreshLayers();
    },
    [refreshLayers],
  );

  useEffect(() => {
    const term = query.trim();
    searchRunRef.current += 1;
    const runId = searchRunRef.current;

    if (term.length < 2) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    if (!isAuthenticated) {
      setSearchResults([]);
      setSearchStatus("blocked");
      return;
    }

    setSearchStatus("searching");
    const timeout = window.setTimeout(() => {
      void runFeatureSearch(term, runId).catch(() => {
        if (runId !== searchRunRef.current) return;
        setSearchResults([]);
        setSearchStatus("error");
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, query, runFeatureSearch]);

  useEffect(() => {
    const searchElement = searchRef.current;
    if (!searchElement) return;

    const cleanupSearchPopup = () => {
      disableSearchPopup();
      closeSearchPopup();
      window.setTimeout(closeSearchPopup, 0);
      window.setTimeout(closeSearchPopup, 150);
    };

    cleanupSearchPopup();
    searchElement.addEventListener("arcgisReady", cleanupSearchPopup);
    searchElement.addEventListener("arcgisSelectResult", cleanupSearchPopup);
    searchElement.addEventListener("arcgisSearchComplete", cleanupSearchPopup);
    searchElement.addEventListener("arcgisSearchClear", cleanupSearchPopup);

    return () => {
      searchElement.removeEventListener("arcgisReady", cleanupSearchPopup);
      searchElement.removeEventListener("arcgisSelectResult", cleanupSearchPopup);
      searchElement.removeEventListener("arcgisSearchComplete", cleanupSearchPopup);
      searchElement.removeEventListener("arcgisSearchClear", cleanupSearchPopup);
    };
  }, [closeSearchPopup, disableSearchPopup, isAuthenticated]);

  useEffect(() => {
    if (!query.trim()) return;
    const groupsToOpen = new Set<string>();
    filteredLayers.forEach((layer) => groupsToOpen.add(layer.category));
    searchResults.forEach((result) => groupsToOpen.add(result.category));
    if (groupsToOpen.size === 0) return;

    setExpandedGroups((current) => {
      let changed = false;
      const next = { ...current };
      groupsToOpen.forEach((groupId) => {
        if (!next[groupId]) {
          next[groupId] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [filteredLayers, query, searchResults]);

  useEffect(() => {
    let cancelled = false;
    const handles: WatchHandle[] = [];

    async function hydrateMap() {
      if (!isAuthenticated) {
        setLayers(previewLayerSnapshots().map((layer) => ({ ...layer, visible: shouldShowLayerForPreset(layer, preset) })));
        setSelectedFeature(null);
        return;
      }

      const mapElement = mapRef.current;
      const view = mapElement?.view as (MapView & { popupEnabled?: boolean; popup?: { close?: () => void } }) | undefined;
      if (!mapElement || !view) return;

      await view.when?.();
      if (cancelled) return;

      const map = getMapElementMap(mapElement);
      collectArcJurisdictionLayers(map).forEach((layer) => {
        if ("popupEnabled" in layer) {
          (layer as Layer & { popupEnabled?: boolean }).popupEnabled = false;
        }
        if ("popupTemplate" in layer) {
          (layer as Layer & { popupTemplate?: unknown }).popupTemplate = null;
        }
        const handle = (layer as Layer & { watch?: (name: string, callback: () => void) => WatchHandle }).watch?.(
          "visible",
          refreshLayers,
        );
        if (handle) handles.push(handle);
      });

      view.popupEnabled = false;
      view.popup?.close?.();
      disableSearchPopup();
      applyPreset(preset);
      refreshLayers();

      const clickHandle = view.on("click", async (event) => {
        try {
          view.popup?.close?.();
          const hit = await view.hitTest(event);
          const result = hit.results.find((candidate: unknown) => {
            const graphic = (candidate as { graphic?: Graphic }).graphic;
            const title = graphic?.layer ? safeLayerTitle(graphic.layer as Layer) : "";
            return Boolean(graphic?.attributes) && !title.toLowerCase().includes("light gray");
          }) as { graphic?: Graphic } | undefined;
          setSelectedFeature(result?.graphic ? summarizeMasterFeature(result.graphic) : null);
          if (result?.graphic) setRightOpen(true);
        } catch {
          setSelectedFeature(null);
        }
      });
      handles.push(clickHandle);
    }

    const mapElement = mapRef.current;
    if (mapElement?.view) void hydrateMap();
    else mapElement?.addEventListener("arcgisViewReadyChange", hydrateMap, { once: true } as AddEventListenerOptions);

    return () => {
      cancelled = true;
      handles.forEach((handle) => handle.remove?.());
    };
  }, [applyPreset, disableSearchPopup, isAuthenticated, preset, refreshLayers]);

  function toggleLayer(layerId: string) {
    const map = getMapElementMap(mapRef.current);
    if (!map) return;
    const layer = collectArcJurisdictionLayers(map).find((candidate) => candidate.id === layerId);
    if (!layer) return;
    layer.visible = !layer.visible;
    refreshLayers();
  }

  async function selectSearchResult(result: FeatureSearchResult) {
    result.layer.visible = true;
    refreshLayers();
    setSelectedFeature(summarizeMasterFeature(result.graphic, result.layerTitle));
    setExpandedGroups((current) => ({ ...current, [result.category]: true }));
    setRightOpen(true);

    const view = mapRef.current?.view as MapView | undefined;
    const geometry = result.graphic.geometry as Geometry | null | undefined;
    if (!view || !geometry) return;

    try {
      await view.goTo(zoomTargetForGeometry(geometry), { duration: 650 });
    } catch {
      // Navigation can be interrupted by user pan/zoom; the selected feature still updates.
    }
  }

  async function resetMap() {
    setPreset("clean-map");
    setQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSelectedFeature(null);
    closeSearchPopup();
    applyPreset("clean-map");

    const view = mapRef.current?.view as MapView | undefined;
    if (!view) return;

    try {
      await view.goTo({ center: HOME_CENTER, zoom: ZOOM }, { duration: 650 });
    } catch {
      // Navigation can be interrupted by user pan/zoom; reset still clears layers.
    }
  }

  const authLabel =
    status === "checking"
      ? "Checking ArcGIS"
      : status === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? `Signed in${userId ? ` as ${userId}` : ""}`
          : "Sign in for live map";

  return (
    <section
      className="opsv2"
      data-left-open={leftOpen ? "true" : "false"}
      data-right-open={rightOpen ? "true" : "false"}
      data-testid="biomed-ops-workbench"
      aria-label="BioMed Ops Workbench"
    >
      <header className="opsv2__bar">
        <Link to="/hub" className="opsv2__brand">
          <RcMark size={30} />
          <strong>BioMed Ops Workbench</strong>
        </Link>
        <label className="opsv2__preset">
          <span>Quick View</span>
          <select value={preset} onChange={(event) => applyPreset(event.target.value as WorkbenchPreset)}>
            <option value="all-layers">All BioMed layers</option>
            <option value="clean-map">Clean map</option>
            {presenterModes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="opsv2__button" onClick={() => void resetMap()}>
          <RotateCcw aria-hidden="true" size={16} />
          Reset map
        </button>
        <div className="opsv2__auth" data-authenticated={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="opsv2__map-shell">
        {createElement(
          "arcgis-map",
          {
            key: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "opsv2-preview",
            ref: mapRef,
            itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
            basemap: isAuthenticated ? undefined : "gray-vector",
            center: CENTER,
            zoom: ZOOM,
            className: "opsv2__arcgis",
            "data-testid": "biomed-ops-arcgis",
          },
          [
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-search", {
              key: "search",
              ref: searchRef,
              slot: "top-right",
              popupDisabled: true,
              popupTemplate: null,
              resultGraphicDisabled: true,
            }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
            createElement(
              "arcgis-expand",
              { key: "basemap", slot: "bottom-right", icon: "basemap", label: "Basemap", mode: "floating" },
              createElement("arcgis-basemap-gallery", {}),
            ),
          ],
        )}
      </div>

      {leftOpen ? (
        <aside className="opsv2__panel opsv2__panel--left" aria-label="Layer controls">
          <div className="opsv2__panel-head">
            <Layers aria-hidden="true" size={18} />
            <div>
              <h2>Layer controls</h2>
              <p>{layerCounts.visible} active of {layerCounts.total} layers.</p>
            </div>
            <button type="button" aria-label="Hide layer controls" onClick={() => setLeftOpen(false)}>
              <PanelLeftOpen aria-hidden="true" size={17} />
            </button>
          </div>
          <label className="opsv2__search">
            <Search aria-hidden="true" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search counties, regions, sites" />
            <Filter aria-hidden="true" size={16} />
          </label>
          {query.trim().length > 0 && (
            <section className="opsv2__results" data-testid="ops-search-results" aria-label="Map search results">
              {searchStatus === "idle" && <p>Type at least 2 characters.</p>}
              {searchStatus === "blocked" && <p>Sign in to search live map features.</p>}
              {searchStatus === "searching" && <p>Searching BioMed layers...</p>}
              {searchStatus === "empty" && <p>No matching features found.</p>}
              {searchStatus === "error" && <p>Search failed. Try a more specific term.</p>}
              {searchStatus === "ready" && (
                <>
                  <div className="opsv2__results-head">
                    <strong>{searchResults.length} results</strong>
                    <span>Click to zoom</span>
                  </div>
                  <div className="opsv2__results-list">
                    {searchResults.map((result) => (
                      <button key={result.id} type="button" className="opsv2__result" onClick={() => void selectSearchResult(result)}>
                        <strong>{result.title}</strong>
                        <span>{result.layerTitle}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
          <div className="opsv2__layer-groups">
            {sourceGroups.map((group) => {
              const groupLayers = filteredLayers.filter((layer) => layer.category === group.id);
              if (groupLayers.length === 0) return null;
              const Icon = group.icon;
              const activeCount = groupLayers.filter((layer) => layer.visible).length;
              const isExpanded = expandedGroups[group.id] ?? true;
              return (
                <section key={group.id} className="opsv2__layer-group" data-expanded={isExpanded ? "true" : "false"}>
                  <header>
                    <button
                      type="button"
                      className="opsv2__layer-group-toggle"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedGroups((current) => ({ ...current, [group.id]: !isExpanded }))}
                    >
                      <Icon aria-hidden="true" size={17} />
                      <span>
                        <strong>{group.label}</strong>
                        <small>{group.description}</small>
                      </span>
                      <b>{activeCount}/{groupLayers.length}</b>
                      <ChevronDown aria-hidden="true" className="opsv2__group-chevron" size={18} />
                    </button>
                  </header>
                  {isExpanded && (
                    <div className="opsv2__layer-list">
                      {groupLayers.map((layer) => (
                        <button
                          key={layer.id}
                          type="button"
                          className="opsv2__layer"
                          aria-pressed={layer.visible}
                          disabled={!isAuthenticated}
                          onClick={() => toggleLayer(layer.id)}
                        >
                          <span className={`opsv2__swatch opsv2__swatch--${layer.category}`} />
                          <span>
                            <span className="opsv2__layer-title-row">
                              <strong>{layer.title}</strong>
                              <em>{layer.visible ? "On" : "Off"}</em>
                            </span>
                            <small>{layer.summary}</small>
                            <small className="opsv2__layer-use">{layer.useCase}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </aside>
      ) : (
        <button type="button" className="opsv2__reopen opsv2__reopen--left" onClick={() => setLeftOpen(true)}>
          <PanelRightOpen aria-hidden="true" size={16} />
          Layers
        </button>
      )}

      {rightOpen ? (
        <aside className="opsv2__panel opsv2__panel--right" aria-label="Selected feature">
          <div className="opsv2__panel-head">
            <MapPinned aria-hidden="true" size={18} />
            <div>
              <h2>Selected feature</h2>
              <p>Click a point or boundary.</p>
            </div>
            <button type="button" aria-label="Hide selected feature" onClick={() => setRightOpen(false)}>
              <PanelRightOpen aria-hidden="true" size={17} />
            </button>
          </div>
          <section className="opsv2__selected-card">
            <p className="opsv2__eyebrow">Selected feature</p>
            {selectedFeature ? (
              <h1>{selectedFeature.title}</h1>
            ) : (
              <p className="opsv2__empty">No feature selected.</p>
            )}
          </section>
        </aside>
      ) : (
        <button type="button" className="opsv2__reopen opsv2__reopen--right" onClick={() => setRightOpen(true)}>
          <PanelLeftOpen aria-hidden="true" size={16} />
          Feature
        </button>
      )}

      {!isAuthenticated && (
        <div className="opsv2__signin" role="dialog" aria-label="Sign in required">
          <ShieldCheck aria-hidden="true" size={24} />
          <h2>Sign in to inspect live workbench layers</h2>
          <p>Layer inventory is visible. Counts, toggles, and selected features require the private Red Cross ArcGIS web map.</p>
          <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
            Sign in to ArcGIS
          </button>
          {error && <small>{error}</small>}
        </div>
      )}
    </section>
  );
}
