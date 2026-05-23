import "../legacy/legacy-maps.css";
import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import type Graphic from "@arcgis/core/Graphic";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import {
  ChevronRight,
  Presentation,
  Search,
  ShieldCheck,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { arcJurisdictionMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  getMapElementMap,
  getPresenterMode,
  presenterModes,
  previewLayerSnapshots,
  safeLayerTitle,
  shouldShowLayerForPresenterMode,
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
  type BioMedPresenterModeId
} from "../utils/biomedMapSuite";
import {
  isQueryableFeatureLayer,
  summarizeMasterFeature,
  type MasterFeatureSummary
} from "../utils/masterMapFeatures";

type CompactPanel = "search" | null;

type GeoSearchResult = {
  id: string;
  title: string;
  layerTitle: string;
  category: string;
  level: GeoLevel;
  graphic: Graphic;
  summary: MasterFeatureSummary;
};

type GeoLevelId = "division" | "region" | "state" | "chapter" | "county";

type GeoLevel = {
  id: GeoLevelId;
  label: string;
  rank: number;
};

const geoLevels: Record<GeoLevelId, GeoLevel> = {
  division: { id: "division", label: "Division", rank: 1 },
  region: { id: "region", label: "Region", rank: 2 },
  state: { id: "state", label: "State", rank: 3 },
  chapter: { id: "chapter", label: "Chapter", rank: 4 },
  county: { id: "county", label: "County", rank: 5 }
};

const geographyLayerHints = ["region", "division", "chapter", "county", "counties", "state", "district"];
const geographyFieldHints = ["name", "region", "division", "chapter", "county", "state", "district", "abbr", "postal"];

function inferGeoLevel(layerTitle: string, summary: MasterFeatureSummary): GeoLevel {
  const layer = layerTitle.toLowerCase();
  if (layer.includes("division")) return geoLevels.division;
  if (layer.includes("region")) return geoLevels.region;
  if (layer.includes("state")) return geoLevels.state;
  if (layer.includes("chapter")) return geoLevels.chapter;
  if (layer.includes("county") || layer.includes("counties")) return geoLevels.county;

  const fieldLabels = summary.geography.map((item) => item.label.toLowerCase()).join(" ");
  if (fieldLabels.includes("division")) return geoLevels.division;
  if (fieldLabels.includes("region")) return geoLevels.region;
  if (fieldLabels.includes("state")) return geoLevels.state;
  if (fieldLabels.includes("chapter")) return geoLevels.chapter;
  if (fieldLabels.includes("county")) return geoLevels.county;

  const title = summary.title.toLowerCase();
  if (title.includes(" census area") || title.includes(" county") || title.includes(" parish")) return geoLevels.county;
  return geoLevels.region;
}

function applyPresenterRenderer(layer: Layer) {
  const title = safeLayerTitle(layer).toLowerCase();
  const featureLayer = layer as FeatureLayer & { renderer?: unknown; opacity?: number; geometryType?: string };
  const category = title.includes("manufacturing") || title.includes("warehouse") || title.includes("kitting") || title.includes("irl")
    ? "manufacturing"
    : title.includes("fixed") || title.includes("distribution") || title.includes("staging") || title.includes("site")
      ? "sites"
      : title.includes("collection") || title.includes("zip") || title.includes("portfolio")
        ? "operations"
        : "geography";

  featureLayer.opacity = category === "geography" ? 0.62 : 0.82;

  if (featureLayer.geometryType === "point" || title.includes("site") || title.includes("warehouse") || title.includes("irl")) {
    const color = category === "manufacturing" ? [215, 25, 32, 0.88] : category === "sites" ? [34, 92, 153, 0.9] : [70, 120, 75, 0.9];
    featureLayer.renderer = {
      type: "simple",
      symbol: {
        type: "simple-marker",
        style: category === "manufacturing" ? "square" : "circle",
        color,
        size: category === "manufacturing" ? 8 : 7,
        outline: { color: [255, 255, 255, 0.95], width: 1.2 }
      }
    };
    return;
  }

  if (featureLayer.geometryType === "polygon" || title.includes("region") || title.includes("district") || title.includes("division") || title.includes("chapter") || title.includes("county")) {
    const fill = category === "operations" ? [215, 25, 32, 0.1] : [64, 76, 88, 0.1];
    const outline = category === "operations" ? [169, 26, 42, 0.72] : [38, 52, 66, 0.65];
    featureLayer.renderer = {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: fill,
        outline: { color: outline, width: 1 }
      }
    };
  }
}

function selectedFeatureFallback(isAuthenticated: boolean, modeId: BioMedPresenterModeId): MasterFeatureSummary {
  const mode = getPresenterMode(modeId);
  return {
    title: `${mode.label} map view`,
    layerTitle: arcJurisdictionMapSource.title,
    category: "reference",
    impact: isAuthenticated
      ? mode.briefing
      : "Sign in once with ArcGIS Online to load the private FY25 source map. This presenter route stays read-only and never writes back to AGOL.",
    talkingPoint: mode.talkingPoint,
    geography: [
      { label: "View", value: mode.label },
      { label: "Map source", value: "FY25 Jurisdiction" }
    ],
    metrics: [],
    source: arcJurisdictionMapSource.title
  };
}

function queryableLayers(map?: Parameters<typeof collectArcJurisdictionLayers>[0]) {
  return collectArcJurisdictionLayers(map).filter(isQueryableFeatureLayer);
}

export default function BiomedMasterMapV3Page() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const [activeMode, setActiveMode] = useState<BioMedPresenterModeId>("national-reach");
  const [layerSnapshots, setLayerSnapshots] = useState<BioMedLayerSnapshot[]>(previewLayerSnapshots);
  const [selectedFeature, setSelectedFeature] = useState<MasterFeatureSummary | undefined>();
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
  const [detailPanelWidth, setDetailPanelWidth] = useState(390);
  const [compactPanel, setCompactPanel] = useState<CompactPanel>(null);
  const [geoSearchTerm, setGeoSearchTerm] = useState("");
  const [geoSearchResults, setGeoSearchResults] = useState<GeoSearchResult[]>([]);
  const [geoSearchStatus, setGeoSearchStatus] = useState("Search regions, divisions, chapters, counties, districts, or states.");
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();

  const selected = selectedFeature ?? selectedFeatureFallback(isAuthenticated, activeMode);
  const activeModeConfig = getPresenterMode(activeMode);

  const applyMode = useCallback((modeId: BioMedPresenterModeId) => {
    setActiveMode(modeId);
    setSelectedFeature(undefined);
    const map = getMapElementMap(mapRef.current);
    if (!map) return;

    const nextSnapshots = buildLayerSnapshots(map);
    collectArcJurisdictionLayers(map).forEach((layer) => {
      const snapshot = nextSnapshots.find((item) => item.id === layer.id);
      if (!snapshot) return;
      layer.visible = shouldShowLayerForPresenterMode(snapshot, modeId);
    });
    setLayerSnapshots(buildLayerSnapshots(map));
  }, []);

  async function queryLayerCounts(map?: Parameters<typeof collectArcJurisdictionLayers>[0]) {
    const counts = new Map<string, number>();
    await Promise.all(
      queryableLayers(map).map(async (layer) => {
        try {
          await layer.when?.();
          const count = await layer.queryFeatureCount();
          counts.set(layer.id, count);
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
          void layer.when?.().then(() => applyPresenterRenderer(layer)).catch(() => undefined);
        });

        const nextSnapshots = buildLayerSnapshots(map);
        collectArcJurisdictionLayers(map).forEach((layer) => {
          const snapshot = nextSnapshots.find((item) => item.id === layer.id);
          if (!snapshot) return;
          layer.visible = shouldShowLayerForPresenterMode(snapshot, activeMode);
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

            if (result?.graphic) {
              setSelectedFeature(summarizeMasterFeature(result.graphic));
              setIsDetailPanelOpen(true);
            }
          } catch {
            // ArcGIS hit tests can fail during interrupted navigation; the map remains usable.
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
  }, [activeMode, isAuthenticated]);

  async function runGeographySearch() {
    const term = geoSearchTerm.trim();
    const map = getMapElementMap(mapRef.current);
    if (!term) {
      setGeoSearchStatus("Enter a region, division, chapter, county, district, or state.");
      return;
    }
    if (!isAuthenticated || !map) {
      setGeoSearchStatus("Sign in to search private ArcGIS geography layers.");
      return;
    }

    const escapedTerm = term.replace(/'/g, "''").toUpperCase();
    const layers = collectArcJurisdictionLayers(map)
      .filter(isQueryableFeatureLayer)
      .filter((layer) => {
        const title = safeLayerTitle(layer).toLowerCase();
        return geographyLayerHints.some((hint) => title.includes(hint));
      });

    setGeoSearchStatus("Searching live ArcGIS geography layers...");
    const matches: GeoSearchResult[] = [];

    await Promise.all(
      layers.map(async (layer: FeatureLayer) => {
        try {
          await layer.when?.();
          const fieldNames = (layer.fields ?? [])
            .filter((field) => {
              const haystack = `${field.name} ${field.alias ?? ""}`.toLowerCase();
              return geographyFieldHints.some((hint) => haystack.includes(hint));
            })
            .map((field) => field.name)
            .slice(0, 10);

          if (fieldNames.length === 0) return;
          const query = layer.createQuery();
          query.where = fieldNames.map((fieldName) => `UPPER(${fieldName}) LIKE '%${escapedTerm}%'`).join(" OR ");
          query.outFields = ["*"];
          query.returnGeometry = true;
          query.num = 4;

          const result = await layer.queryFeatures(query);
          result.features.slice(0, 4).forEach((graphic, index) => {
            const summary = summarizeMasterFeature(graphic, safeLayerTitle(layer));
            matches.push({
              id: `${layer.id}-${index}-${summary.title}`,
              title: summary.title,
              layerTitle: safeLayerTitle(layer),
              category: summary.category,
              level: inferGeoLevel(safeLayerTitle(layer), summary),
              graphic,
              summary
            });
          });
        } catch {
          // Some private layers may reject ad hoc text queries; keep searching the rest.
        }
      })
    );

    const deduped = matches
      .filter((match, index, all) => all.findIndex((candidate) => `${candidate.layerTitle}-${candidate.title}` === `${match.layerTitle}-${match.title}`) === index)
      .sort((a, b) => a.level.rank - b.level.rank || a.title.localeCompare(b.title))
      .slice(0, 8);

    setGeoSearchResults(deduped);
    setGeoSearchStatus(deduped.length > 0 ? `${deduped.length} geography match${deduped.length === 1 ? "" : "es"} found.` : "No geography matches found in visible source layers.");
  }

  function selectGeoSearchResult(result: GeoSearchResult) {
    setSelectedFeature(result.summary);
    setIsDetailPanelOpen(true);
    const geometry = result.graphic.geometry as { extent?: { expand?: (factor: number) => unknown } } | undefined;
    const target = geometry?.extent?.expand?.(1.7) ?? geometry?.extent ?? result.graphic.geometry;
    if (target) void mapRef.current?.goTo?.(target, { duration: 750 });
  }

  const startDetailResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = window.innerWidth - moveEvent.clientX - 16;
      setDetailPanelWidth(Math.min(620, Math.max(310, nextWidth)));
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }, []);

  const authLabel =
    status === "checking"
      ? "Checking ArcGIS"
      : status === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? `Signed in${userId ? ` as ${userId}` : ""}`
          : "Secure ArcGIS map";

  const shellStyle = {
    "--biomed-detail-width": `${detailPanelWidth}px`
  } as CSSProperties;

  return (
    <section
      className="biomed-master-v3 biomed-master-presenter"
      data-testid="biomed-master-v3"
      data-layer-panel="removed"
      data-detail-panel={isDetailPanelOpen ? "open" : "closed"}
      style={shellStyle}
      aria-label="BioMed Master Map"
    >
      <div className="biomed-master-map-shell" data-testid="biomed-master-map-shell">
        {createElement(
          "arcgis-map",
          {
            key: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : "biomed-master-v3-preview",
            ref: mapRef,
            itemId: isAuthenticated ? arcJurisdictionMapSource.webMapItemId : undefined,
            basemap: isAuthenticated ? undefined : "gray-vector",
            center: "-96.2,38.3",
            zoom: 4,
            className: "biomed-master-arcgis-map",
            "data-testid": "biomed-master-arcgis",
            "aria-label": "BioMed Master Map V3 ArcGIS map"
          },
          [
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-search", { key: "search", slot: "top-right" }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" })
          ]
        )}
        <div className="biomed-master-map-wash" aria-hidden="true" />
      </div>

      <header className="biomed-master-command">
        <Link to="/hub" className="biomed-master-brand" aria-label="Return to map menu">
          <span className="biomed-master-cross">+</span>
          <span>
            <strong>BioMed Blood Map</strong>
            <small>{activeModeConfig.label} · live geography layers</small>
          </span>
        </Link>
        <div className="biomed-master-auth" data-authenticated={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{isAuthenticated ? "Signed in" : authLabel}</strong>
          {!isAuthenticated && (
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <nav className="biomed-master-tabs biomed-master-story-modes" aria-label="BioMed map views">
        {presenterModes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button key={mode.id} type="button" aria-pressed={activeMode === mode.id} onClick={() => applyMode(mode.id)}>
              <Icon aria-hidden="true" size={18} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </nav>

      {!isDetailPanelOpen && (
        <button className="biomed-master-reopen biomed-master-reopen-right" type="button" onClick={() => setIsDetailPanelOpen(true)}>
          <Presentation aria-hidden="true" size={16} />
          Details
        </button>
      )}

      <aside className="biomed-master-right" aria-label="Map feature details">
        <button
          className="biomed-master-detail-resizer"
          type="button"
          aria-label="Resize right insight panel"
          title="Drag to resize right panel"
          onPointerDown={startDetailResize}
        />
        <div className="biomed-master-panel-tools">
          <span>Map detail</span>
          <button type="button" onClick={() => setIsDetailPanelOpen(false)}>
            <ChevronRight aria-hidden="true" size={16} />
            Hide
          </button>
        </div>
        <div className="biomed-master-selected-card">
          <p>
            <Presentation aria-hidden="true" size={16} />
            {selectedFeature ? "Selected geography" : "Map overview"}
          </p>
          <h2>{selected.title}</h2>
          <span className={`biomed-master-type category-${selected.category}`}>{selected.layerTitle}</span>
          <p>{selected.impact}</p>
          {selected.metrics.length > 0 && (
            <div className="biomed-master-metrics">
              {selected.metrics.map((metric) => (
                <article key={`${metric.label}-${metric.value}`}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          )}
          <dl>
            {selected.geography.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="biomed-master-talking-point">
            <strong>Why this matters</strong>
            <span>{selected.talkingPoint}</span>
          </div>
        </div>
      </aside>

      <div className="biomed-master-compact-tools" aria-label="Compact map controls">
        <button type="button" aria-pressed={compactPanel === "search"} onClick={() => setCompactPanel(compactPanel === "search" ? null : "search")}>
          <Search aria-hidden="true" size={15} />
          Search geography
        </button>
      </div>

      {compactPanel && (
        <div className="biomed-master-float-card" data-panel={compactPanel}>
          {compactPanel === "search" && (
            <>
              <div className="biomed-master-float-header">
                <h2>Search geography</h2>
                <button className="biomed-master-float-close" type="button" aria-label="Close search" onClick={() => setCompactPanel(null)}>
                  <X aria-hidden="true" size={16} />
                </button>
              </div>
              <form
                className="biomed-master-geo-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runGeographySearch();
                }}
              >
                <label>
                  <span>Region, division, chapter, county, state</span>
                  <input
                    value={geoSearchTerm}
                    name="biomed-presenter-geography-search"
                    autoComplete="off"
                    onChange={(event) => setGeoSearchTerm(event.target.value)}
                    placeholder="Try Denver, Maine, Southeast, Los Angeles..."
                  />
                </label>
                <button type="submit" disabled={!isAuthenticated || !geoSearchTerm.trim()}>
                  Search map
                </button>
              </form>
              <p>{geoSearchStatus}</p>
              <div className="biomed-master-geo-results">
                {geoSearchResults.map((result) => (
                  <button className={`geo-level-${result.level.id}`} key={result.id} type="button" onClick={() => selectGeoSearchResult(result)}>
                    <span className="biomed-master-geo-level">{result.level.label}</span>
                    <span className="biomed-master-geo-result-text">
                      <strong>{result.title}</strong>
                      <small>{result.layerTitle}</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!isAuthenticated && (
        <div className="biomed-master-signin" role="region" aria-label="ArcGIS sign-in required">
          <div>
            <ShieldCheck aria-hidden="true" size={26} />
            <h2>Sign in to load private BioMed layers</h2>
            <p>
              This map reads the FY25 jurisdiction web map, keeps ArcGIS popups off, and sends feature clicks to the map detail panel.
            </p>
            <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
              Sign in to ArcGIS
            </button>
            {error && <small>{error}</small>}
          </div>
        </div>
      )}

      {loadErrors.length > 0 && (
        <div className="biomed-master-warning" role="status">
          <strong>Layer warnings</strong>
          {loadErrors.slice(0, 2).map((message) => (
            <span key={message}>{message}</span>
          ))}
        </div>
      )}
    </section>
  );
}
