import "../legacy/legacy-maps.css";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import {
  BarChart3,
  ChevronLeft,
  ExternalLink,
  Filter,
  Home,
  Layers,
  RotateCcw,
  Search,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { arcJurisdictionDashboardSource, arcJurisdictionMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  focusStops,
  formatCount,
  getMapElementMap,
  presenterModes,
  previewLayerSnapshots,
  safeLayerTitle,
  shouldShowLayerForPresenterMode,
  sourceGroups,
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
  type BioMedPresenterModeId
} from "../utils/biomedMapSuite";
import { isQueryableFeatureLayer, summarizeMasterFeature, type MasterFeatureSummary } from "../utils/masterMapFeatures";

type WorkbenchPreset = BioMedPresenterModeId | "all-layers";

export default function BiomedOpsWorkbenchPage() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const [preset, setPreset] = useState<WorkbenchPreset>("all-layers");
  const [layerSnapshots, setLayerSnapshots] = useState<BioMedLayerSnapshot[]>(previewLayerSnapshots);
  const [query, setQuery] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<MasterFeatureSummary | undefined>();
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  const filteredLayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return layerSnapshots;
    return layerSnapshots.filter((layer) => `${layer.title} ${layer.role} ${layer.category}`.toLowerCase().includes(needle));
  }, [layerSnapshots, query]);

  const layerCounts = useMemo(
    () =>
      layerSnapshots.reduce(
        (counts, layer) => {
          counts.total += 1;
          if (layer.visible) counts.visible += 1;
          counts[layer.category] = (counts[layer.category] ?? 0) + 1;
          return counts;
        },
        { total: 0, visible: 0 } as Record<string, number>
      ),
    [layerSnapshots]
  );

  const refreshSnapshots = useCallback(() => {
    setLayerSnapshots(buildLayerSnapshots(getMapElementMap(mapRef.current)));
  }, []);

  const applyPreset = useCallback((nextPreset: WorkbenchPreset) => {
    setPreset(nextPreset);
    const map = getMapElementMap(mapRef.current);
    if (!map) return;

    const nextSnapshots = buildLayerSnapshots(map);
    collectArcJurisdictionLayers(map).forEach((layer) => {
      const snapshot = nextSnapshots.find((item) => item.id === layer.id);
      if (!snapshot) return;
      layer.visible = nextPreset === "all-layers" ? true : shouldShowLayerForPresenterMode(snapshot, nextPreset);
    });
    setLayerSnapshots(buildLayerSnapshots(map));
  }, []);

  async function queryLayerCounts(map?: Parameters<typeof collectArcJurisdictionLayers>[0]) {
    const counts = new Map<string, number>();
    await Promise.all(
      collectArcJurisdictionLayers(map)
        .filter(isQueryableFeatureLayer)
        .map(async (layer) => {
          try {
            await layer.when?.();
            counts.set(layer.id, await layer.queryFeatureCount());
          } catch {
            counts.set(layer.id, undefined as unknown as number);
          }
        })
    );

    setLayerSnapshots((current) =>
      current.map((snapshot) => ({
        ...snapshot,
        count: counts.get(snapshot.id) ?? snapshot.count
      }))
    );
  }

  useEffect(() => {
    let cancelled = false;
    let clickHandle: { remove?: () => void } | undefined;

    async function hydrateMap() {
      const mapElement = mapRef.current;
      if (!mapElement || !isAuthenticated) {
        setLayerSnapshots(previewLayerSnapshots());
        return;
      }

      try {
        const view = mapElement.view as (MapView & { popupEnabled?: boolean; popup?: { close?: () => void } }) | undefined;
        await view?.when?.();
        if (cancelled) return;

        const map = getMapElementMap(mapElement);
        collectArcJurisdictionLayers(map).forEach((layer) => {
          if ("popupEnabled" in layer) {
            (layer as Layer & { popupEnabled?: boolean }).popupEnabled = false;
          }
          if ("popupTemplate" in layer) {
            (layer as Layer & { popupTemplate?: unknown }).popupTemplate = null;
          }
        });

        const nextSnapshots = buildLayerSnapshots(map);
        collectArcJurisdictionLayers(map).forEach((layer) => {
          const snapshot = nextSnapshots.find((item) => item.id === layer.id);
          if (!snapshot) return;
          layer.visible = preset === "all-layers" ? true : shouldShowLayerForPresenterMode(snapshot, preset);
        });

        if (view) {
          view.popupEnabled = false;
          view.popup?.close?.();
        }

        setLayerSnapshots(buildLayerSnapshots(map));
        setLoadErrors(
          (mapElement.loadErrorSources ?? [])
            .map((entry) => entry.loadError?.message || entry.source?.title)
            .filter((message): message is string => Boolean(message))
        );
        void queryLayerCounts(map);

        clickHandle = view?.on?.("click", async (event) => {
          try {
            view.popup?.close?.();
            const hit = await view.hitTest(event);
            const result = hit.results.find((candidate: unknown) => {
              const graphic = (candidate as { graphic?: Graphic }).graphic;
              const title = graphic?.layer ? safeLayerTitle(graphic.layer as Layer) : "";
              return Boolean(graphic?.attributes) && !title.toLowerCase().includes("light gray");
            }) as { graphic?: Graphic } | undefined;
            if (result?.graphic) setSelectedFeature(summarizeMasterFeature(result.graphic));
          } catch {
            // Keep the workbench usable if a click is interrupted.
          }
        });
      } catch (mapError) {
        const message = mapError instanceof Error ? mapError.message : "ArcGIS web map could not be loaded.";
        setLoadErrors([message]);
      }
    }

    void hydrateMap();
    return () => {
      cancelled = true;
      clickHandle?.remove?.();
    };
  }, [isAuthenticated, preset]);

  function toggleLayer(layerId: string) {
    const map = getMapElementMap(mapRef.current);
    if (!map) return;
    const layer = collectArcJurisdictionLayers(map).find((candidate) => candidate.id === layerId);
    if (!layer) return;
    layer.visible = !layer.visible;
    refreshSnapshots();
  }

  function goToFocus(center: number[], zoom: number) {
    void mapRef.current?.goTo?.({ center, zoom }, { duration: 700 });
  }

  const authLabel =
    status === "checking"
      ? "Checking ArcGIS"
      : status === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? `Signed in${userId ? ` as ${userId}` : ""}`
          : "Sign in for live counts";

  return (
    <section className="biomed-suite-app biomed-ops-workbench" data-testid="biomed-ops-workbench" aria-label="BioMed ops workbench">
      <div className="biomed-suite-map-shell">
        {createElement(
          "arcgis-map",
          {
            key: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "biomed-ops-preview",
            ref: mapRef,
            itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
            basemap: isAuthenticated ? undefined : "gray-vector",
            center: "-96.2,38.3",
            zoom: 4,
            className: "biomed-suite-arcgis-map",
            "data-testid": "biomed-ops-arcgis"
          },
          [
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-search", { key: "search", slot: "top-right" }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" })
          ]
        )}
      </div>

      <header className="biomed-suite-command">
        <Link to="/hub" className="biomed-suite-brand">
          <span>+</span>
          <strong>BioMed Ops Workbench</strong>
        </Link>
        <label>
          <span>Visibility preset</span>
          <select value={preset} onChange={(event) => applyPreset(event.target.value as WorkbenchPreset)}>
            <option value="all-layers">All Layers</option>
            {presenterModes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <div className="biomed-suite-actions">
          <Link to="/map-v3">
            <PresentationIcon />
            Presenter
          </Link>
          <Link to="/layers">
            <Layers aria-hidden="true" size={16} />
            Layer Explorer
          </Link>
          <a href={arcJurisdictionMapSource.mapViewerUrl} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" size={16} />
            ArcGIS
          </a>
          <button type="button" onClick={() => applyPreset("all-layers")}>
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        </div>
        <div className="biomed-suite-auth" data-authenticated={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <aside className="biomed-suite-left">
        <div className="biomed-suite-panel-heading">
          <Layers aria-hidden="true" size={18} />
          <div>
            <h2>Layer controls</h2>
            <p>Internal visibility, counts, and source warnings.</p>
          </div>
        </div>
        <label className="biomed-master-search">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            name="biomed-workbench-layer-search"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search source layers"
          />
          <Filter aria-hidden="true" size={16} />
        </label>
        <div className="biomed-suite-count-grid">
          <article>
            <span>Visible</span>
            <strong>{layerCounts.visible}</strong>
          </article>
          <article>
            <span>Total</span>
            <strong>{layerCounts.total}</strong>
          </article>
          <article>
            <span>Operations</span>
            <strong>{layerCounts.operations ?? 0}</strong>
          </article>
          <article>
            <span>Sites</span>
            <strong>{layerCounts.sites ?? 0}</strong>
          </article>
        </div>
        <div className="biomed-master-layer-groups">
          {sourceGroups.map((group) => {
            const Icon = group.icon;
            const groupLayers = filteredLayers.filter((layer) => layer.category === group.id);
            if (groupLayers.length === 0) return null;
            return (
              <section key={group.id} className="biomed-master-layer-group">
                <div>
                  <Icon aria-hidden="true" size={17} />
                  <span>
                    <strong>{group.label}</strong>
                    <small>{group.description}</small>
                  </span>
                  <b>{groupLayers.length}</b>
                </div>
                {groupLayers.map((layer) => (
                  <button key={layer.id} type="button" aria-pressed={layer.visible} disabled={!isAuthenticated} onClick={() => toggleLayer(layer.id)}>
                    <span className={`biomed-master-swatch category-${layer.category}`} />
                    <span>
                      <strong>{layer.title}</strong>
                      <small>
                        {layer.role} · {formatCount(layer.count)}
                      </small>
                    </span>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      </aside>

      <aside className="biomed-suite-right">
        <section className="biomed-suite-card">
          <p className="biomed-suite-eyebrow">
            <BarChart3 aria-hidden="true" size={16} />
            Counts and checks
          </p>
          <div className="biomed-suite-count-list">
            <div>
              <span>Feature counts</span>
              <strong>{isAuthenticated ? "Live when loaded" : "Sign in required"}</strong>
            </div>
            <div>
              <span>Source warnings</span>
              <strong>{loadErrors.length}</strong>
            </div>
            <div>
              <span>Dashboard reference</span>
              <a href={arcJurisdictionDashboardSource.dashboardUrl} target="_blank" rel="noreferrer">Open</a>
            </div>
          </div>
          {loadErrors.length > 0 && (
            <ul className="biomed-suite-warning-list">
              {loadErrors.slice(0, 4).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="biomed-suite-card">
          <p className="biomed-suite-eyebrow">
            <Home aria-hidden="true" size={16} />
            Focus bookmarks
          </p>
          <div className="biomed-suite-bookmarks">
            {focusStops.map((stop) => (
              <button key={stop.id} type="button" disabled={!isAuthenticated} onClick={() => goToFocus(stop.center, stop.zoom)}>
                {stop.label}
              </button>
            ))}
          </div>
        </section>

        {selectedFeature && (
          <section className="biomed-suite-card">
            <p className="biomed-suite-eyebrow">Selected feature</p>
            <h2>{selectedFeature.title}</h2>
            <p>{selectedFeature.impact}</p>
            <div className="biomed-master-metrics">
              {selectedFeature.metrics.map((metric) => (
                <article key={`${metric.label}-${metric.value}`}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          </section>
        )}
      </aside>

      {!isAuthenticated && (
        <div className="biomed-suite-signin">
          <ShieldCheck aria-hidden="true" size={24} />
          <h2>Sign in to inspect live workbench layers</h2>
          <p>Layer inventory is real. Counts, toggles, and feature selection require the private FY25 ArcGIS web map.</p>
          <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
            Sign in to ArcGIS
          </button>
          {error && <small>{error}</small>}
        </div>
      )}
    </section>
  );
}

function PresentationIcon() {
  return <ChevronLeft aria-hidden="true" size={16} />;
}
