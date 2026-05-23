import "../legacy/legacy-maps.css";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import { Database, ExternalLink, Layers, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { arcJurisdictionMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  formatCount,
  getMapElementMap,
  previewLayerSnapshots,
  safeLayerTitle,
  type ArcgisMapElement,
  type BioMedLayerSnapshot
} from "../utils/biomedMapSuite";
import { isQueryableFeatureLayer, summarizeMasterFeature, type MasterFeatureSummary } from "../utils/masterMapFeatures";

type LayerFieldSummary = {
  layerId: string;
  fields: Array<{ name: string; alias?: string; type?: string }>;
};

export default function BiomedLayerExplorerPage() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const [layerSnapshots, setLayerSnapshots] = useState<BioMedLayerSnapshot[]>(previewLayerSnapshots);
  const [fieldSummaries, setFieldSummaries] = useState<LayerFieldSummary[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<MasterFeatureSummary | undefined>();
  const [query, setQuery] = useState("");
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  const filteredLayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return layerSnapshots;
    return layerSnapshots.filter((layer) => `${layer.title} ${layer.role} ${layer.category}`.toLowerCase().includes(needle));
  }, [layerSnapshots, query]);

  async function hydrateCountsAndFields(map?: Parameters<typeof collectArcJurisdictionLayers>[0]) {
    const layers = collectArcJurisdictionLayers(map).filter(isQueryableFeatureLayer);
    const counts = new Map<string, number>();
    const fields: LayerFieldSummary[] = [];

    await Promise.all(
      layers.map(async (layer) => {
        try {
          await layer.when?.();
          counts.set(layer.id, await layer.queryFeatureCount());
          fields.push({
            layerId: layer.id,
            fields: ((layer as FeatureLayer).fields ?? []).slice(0, 30).map((field) => ({
              name: field.name,
              alias: field.alias ?? undefined,
              type: `${field.type}`
            }))
          });
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
    setFieldSummaries(fields.sort((left, right) => left.layerId.localeCompare(right.layerId)));
  }

  useEffect(() => {
    let cancelled = false;
    let clickHandle: { remove?: () => void } | undefined;

    async function hydrateMap() {
      const mapElement = mapRef.current;
      if (!mapElement || !isAuthenticated) {
        setLayerSnapshots(previewLayerSnapshots());
        setFieldSummaries([]);
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
        view && (view.popupEnabled = false);
        view?.popup?.close?.();

        setLayerSnapshots(buildLayerSnapshots(map));
        setLoadErrors(
          (mapElement.loadErrorSources ?? [])
            .map((entry) => entry.loadError?.message || entry.source?.title)
            .filter((message): message is string => Boolean(message))
        );
        void hydrateCountsAndFields(map);

        clickHandle = view?.on?.("click", async (event) => {
          try {
            view.popup?.close?.();
            const hit = await view.hitTest(event);
            const result = hit.results.find((candidate: unknown) => {
              const graphic = (candidate as { graphic?: Graphic }).graphic;
              const title = graphic?.layer ? safeLayerTitle(graphic.layer as Layer) : "";
              return Boolean(graphic?.attributes) && !title.toLowerCase().includes("light gray");
            }) as { graphic?: Graphic } | undefined;
            if (result?.graphic) setSelectedFeature(summarizeMasterFeature(result.graphic, undefined, true));
          } catch {
            // Explorer remains usable even if a hit test gets interrupted.
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
  }, [isAuthenticated]);

  const authLabel =
    status === "checking"
      ? "Checking ArcGIS"
      : status === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? `Signed in${userId ? ` as ${userId}` : ""}`
          : "Sign in for fields and raw attributes";

  return (
    <section className="biomed-suite-app biomed-layer-explorer" data-testid="biomed-layer-explorer" aria-label="BioMed layer explorer">
      <div className="biomed-suite-map-shell">
        {createElement(
          "arcgis-map",
          {
            key: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "biomed-layer-explorer-preview",
            ref: mapRef,
            itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
            basemap: isAuthenticated ? undefined : "gray-vector",
            center: "-96.2,38.3",
            zoom: 4,
            className: "biomed-suite-arcgis-map",
            "data-testid": "biomed-layer-explorer-arcgis"
          },
          [
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" })
          ]
        )}
      </div>

      <header className="biomed-suite-command">
        <Link to="/hub" className="biomed-suite-brand">
          <span>+</span>
          <strong>BioMed Layer Explorer</strong>
        </Link>
        <div className="biomed-suite-actions">
          <Link to="/map-v3">Presenter Map</Link>
          <Link to="/ops">Ops Workbench</Link>
          <a href={arcJurisdictionMapSource.mapViewerUrl} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" size={16} />
            ArcGIS Source
          </a>
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

      <aside className="biomed-explorer-inventory">
        <div className="biomed-suite-panel-heading">
          <Layers aria-hidden="true" size={18} />
          <div>
            <h2>Raw source inventory</h2>
            <p>No synthetic records. These are configured FY25 source layers.</p>
          </div>
        </div>
        <label className="biomed-master-search">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            name="biomed-layer-explorer-search"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search layers or roles"
          />
        </label>
        <div className="biomed-explorer-layer-list">
          {filteredLayers.map((layer) => {
            const fields = fieldSummaries.find((summary) => summary.layerId === layer.id)?.fields ?? [];
            return (
              <article key={layer.id}>
                <header>
                  <span className={`biomed-master-swatch category-${layer.category}`} />
                  <div>
                    <h3>{layer.title}</h3>
                    <p>{layer.role}</p>
                  </div>
                  <strong>{formatCount(layer.count)}</strong>
                </header>
                <dl>
                  <div>
                    <dt>Category</dt>
                    <dd>{layer.category}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{layer.status}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{layer.type}</dd>
                  </div>
                </dl>
                <details>
                  <summary>Fields {fields.length > 0 ? `(${fields.length})` : "(after sign-in)"}</summary>
                  {fields.length > 0 ? (
                    <ul>
                      {fields.map((field) => (
                        <li key={`${layer.id}-${field.name}`}>
                          <code>{field.name}</code>
                          <span>{field.alias || field.type || "field"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Field list loads after ArcGIS sign-in.</p>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      </aside>

      <aside className="biomed-explorer-raw">
        <section className="biomed-suite-card">
          <p className="biomed-suite-eyebrow">
            <Database aria-hidden="true" size={16} />
            Selected-feature raw attributes
          </p>
          {selectedFeature ? (
            <>
              <h2>{selectedFeature.title}</h2>
              <p>{selectedFeature.layerTitle}</p>
              <div className="biomed-explorer-attrs">
                {Object.entries(selectedFeature.rawAttributes ?? {}).slice(0, 80).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{`${value ?? ""}`}</dd>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2>No feature selected</h2>
              <p>Click a live ArcGIS feature after sign-in to inspect raw attributes here. The presenter map intentionally hides this detail.</p>
            </>
          )}
        </section>
        <section className="biomed-suite-card">
          <p className="biomed-suite-eyebrow">Source checks</p>
          <div className="biomed-suite-count-list">
            <div>
              <span>Configured layers</span>
              <strong>{arcJurisdictionMapSource.operationalLayers.length}</strong>
            </div>
            <div>
              <span>Loaded inventory</span>
              <strong>{layerSnapshots.length}</strong>
            </div>
            <div>
              <span>Warnings</span>
              <strong>{loadErrors.length}</strong>
            </div>
          </div>
          {loadErrors.length > 0 && (
            <ul className="biomed-suite-warning-list">
              {loadErrors.slice(0, 5).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      {!isAuthenticated && (
        <div className="biomed-suite-signin">
          <ShieldCheck aria-hidden="true" size={24} />
          <h2>Sign in to load fields and raw attributes</h2>
          <p>The configured layer list is visible now; live fields, counts, and selected-feature attributes require ArcGIS access.</p>
          <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
            Sign in to ArcGIS
          </button>
          {error && <small>{error}</small>}
        </div>
      )}
    </section>
  );
}
