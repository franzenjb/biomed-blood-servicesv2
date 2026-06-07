import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ChevronLeft, ChevronRight, HelpCircle, Home, X } from "lucide-react";
import { Link } from "react-router-dom";
import RcAppBar from "../components/RcAppBar";
import RcMark from "../components/RcMark";
import type ArcGISMap from "@arcgis/core/Map";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import { checkRedCrossArcGISSignIn, ensureRedCrossOAuth, signInToRedCrossArcGIS } from "../utils/arcgisOAuth";
import { addMasterMapSupplementalLayers } from "../utils/arcgisMasterLayers";
import {
  buildLayerSnapshots,
  collectArcJurisdictionLayers,
  getMapElementMap,
  safeLayerTitle,
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
} from "../utils/biomedMapSuite";
import { buildFeatureInfo, type FeatureInfo } from "./featureInfo";
import LayerList from "./LayerList";
import FeatureDetails from "./FeatureDetails";
import { applyPresentationMarkers } from "./presentationMarkers";
import "./mapShell.css";

type AboutPoint = { label: string; text: string };

type Props = {
  eyebrow?: string;
  title: string;
  webMapItemId: string;
  /** Optional About-modal copy. Sensible defaults are derived from the title. */
  aboutMeta?: string;
  aboutLead?: string;
  aboutPoints?: AboutPoint[];
};

type AuthStatus = "checking" | "signed-out" | "signing-in" | "signed-in" | "error";
type WatchHandle = { remove?: () => void };

const CENTER: [number, number] = [-96, 38.5];
const ZOOM = 4;

type QueryableLayer = Layer & {
  objectIdField?: string;
  queryFeatures?: (query: {
    objectIds: number[];
    outFields: string[];
    returnGeometry: boolean;
  }) => Promise<{ features?: Array<{ attributes?: Record<string, unknown> }> }>;
};

// The hit-test graphic only carries render/popup fields. Re-query the source
// feature for the COMPLETE attribute record.
async function enrichGraphic(graphic: Graphic): Promise<Graphic> {
  const layer = graphic.layer as QueryableLayer | undefined;
  const oidField = layer?.objectIdField;
  const oidRaw = oidField ? (graphic.attributes ?? {})[oidField] : undefined;
  const oid = Number(oidRaw);
  if (!layer?.queryFeatures || !Number.isFinite(oid)) return graphic;
  try {
    const result = await layer.queryFeatures({ objectIds: [oid], outFields: ["*"], returnGeometry: false });
    const full = result?.features?.[0]?.attributes;
    if (full) graphic.attributes = { ...graphic.attributes, ...full };
  } catch {
    // keep the original attributes
  }
  return graphic;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : `${error}`;
  if (/abort|cancel|closed/i.test(message)) return "Sign-in was closed before it completed.";
  return "ArcGIS sign-in did not complete. Try again.";
}

export default function MapShell({
  eyebrow = "Live ArcGIS map",
  title,
  webMapItemId,
  aboutMeta = "Live Red Cross ArcGIS",
  aboutLead,
  aboutPoints,
}: Props) {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const viewRef = useRef<MapView | null>(null);

  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState("");
  const [showSecureMap, setShowSecureMap] = useState(false);
  const [snapshots, setSnapshots] = useState<BioMedLayerSnapshot[]>([]);
  const [activeFeature, setActiveFeature] = useState<FeatureInfo | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeStatus, setPlaceStatus] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const isAuthenticated = authStatus === "signed-in";

  const authLabel =
    authStatus === "checking"
      ? "Checking ArcGIS…"
      : authStatus === "signing-in"
        ? "Signing in…"
        : isAuthenticated
          ? "Signed in"
          : "Sign in for live data";

  const aboutLeadCopy =
    aboutLead ??
    `${title} reads live from the published Red Cross ArcGIS web map. When the source layers update, this view updates with them — there is nothing to refresh by hand.`;

  const aboutPointsCopy: AboutPoint[] =
    aboutPoints ?? [
      { label: "Layers tab", text: "Turn individual map layers on and off, grouped by category." },
      { label: "Find a place", text: "Jump the map to any city, county, or state." },
      { label: "Click anything", text: "Sites and boundaries open a clean detail card in the side panel — never a raw Esri popup." },
      { label: "Map controls", text: "Home, zoom, scale bar, and a basemap gallery sit on the map itself." },
    ];

  const refreshSnapshots = useCallback(() => {
    setSnapshots(buildLayerSnapshots(getMapElementMap(mapRef.current)));
  }, []);

  // Check existing ArcGIS session on mount.
  useEffect(() => {
    let cancelled = false;
    ensureRedCrossOAuth();
    checkRedCrossArcGISSignIn()
      .then(() => {
        if (cancelled) return;
        setAuthStatus("signed-in");
        setShowSecureMap(true);
      })
      .catch(() => {
        if (!cancelled) setAuthStatus("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate the secure web map once signed in.
  useEffect(() => {
    if (!showSecureMap) return undefined;
    let cancelled = false;
    const handles: WatchHandle[] = [];

    async function hydrate() {
      const mapElement = mapRef.current;
      if (!mapElement || cancelled) return;
      await (mapElement.view as MapView | undefined)?.when?.();
      if (cancelled) return;

      await addMasterMapSupplementalLayers(getMapElementMap(mapElement));
      if (cancelled) return;

      await applyPresentationMarkers(getMapElementMap(mapElement));
      if (cancelled) return;

      // Manufacturing belongs on the bottom Z so points/geography draw above it.
      const baseMap = getMapElementMap(mapElement) as (ArcGISMap & { reorder?: (layer: Layer, index: number) => void }) | undefined;
      if (baseMap) {
        collectArcJurisdictionLayers(baseMap)
          .filter((layer) => safeLayerTitle(layer).toLowerCase().includes("manufacturing"))
          .forEach((layer) => baseMap.reorder?.(layer, 0));
      }

      const view = mapElement.view as MapView | undefined;
      viewRef.current = view ?? null;
      if (view) {
        view.popupEnabled = false;
        view.closePopup?.();
        const clickHandle = view.on("click", async (event) => {
          try {
            const response = await view.hitTest(event);
            const results = response.results as Array<{ type: string; graphic?: Graphic }>;
            const graphics = results
              .filter((result) => result.type === "graphic" && result.graphic?.layer)
              .map((result) => result.graphic as Graphic);
            const enriched = await Promise.all(graphics.map(enrichGraphic));
            const info = buildFeatureInfo(enriched);
            setActiveFeature(info);
            if (info) setRightOpen(true);
          } catch {
            setActiveFeature(null);
          }
        });
        handles.push(clickHandle);
      }

      refreshSnapshots();
      collectArcJurisdictionLayers(getMapElementMap(mapElement)).forEach((layer) => {
        const handle = (layer as Layer & { watch?: (p: string, cb: () => void) => WatchHandle }).watch?.(
          "visible",
          refreshSnapshots
        );
        if (handle) handles.push(handle);
      });
    }

    const mapElement = mapRef.current;
    if (mapElement?.view) void hydrate();
    else mapElement?.addEventListener("arcgisViewReadyChange", hydrate, { once: true } as AddEventListenerOptions);

    return () => {
      cancelled = true;
      handles.forEach((handle) => handle.remove?.());
    };
  }, [showSecureMap, refreshSnapshots]);

  async function signIn() {
    ensureRedCrossOAuth();
    setAuthStatus("signing-in");
    setAuthError("");
    try {
      await signInToRedCrossArcGIS();
      setAuthStatus("signed-in");
      setShowSecureMap(true);
    } catch (error) {
      setAuthError(errorMessage(error));
      setAuthStatus("error");
    }
  }

  function toggleLayer(layerId: string, visible: boolean) {
    const layer = collectArcJurisdictionLayers(getMapElementMap(mapRef.current)).find(
      (candidate) => candidate.id === layerId
    );
    if (!layer) return;
    layer.visible = visible;
    refreshSnapshots();
  }

  async function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = placeQuery.trim();
    if (!query) return;
    setPlaceStatus("Searching…");
    try {
      const params = new URLSearchParams({ SingleLine: query, countryCode: "USA", maxLocations: "1", f: "json" });
      const response = await fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params.toString()}`
      );
      const data = (await response.json()) as {
        candidates?: Array<{ address?: string; location?: { x: number; y: number } }>;
      };
      const candidate = data.candidates?.[0];
      if (!candidate?.location) {
        setPlaceStatus("No place found. Try adding a state.");
        return;
      }
      await mapRef.current?.goTo?.({ center: [candidate.location.x, candidate.location.y], zoom: 9 }, { duration: 600 });
      setPlaceStatus(`Showing ${candidate.address ?? query}`);
    } catch {
      setPlaceStatus("Search is unavailable right now.");
    }
  }

  return (
    <section
      className="map-shell"
      data-testid="map-shell"
      aria-label={title}
      data-left-open={leftOpen ? "true" : "false"}
      data-right-open={rightOpen ? "true" : "false"}
    >
      <RcAppBar title={title}>
        <button
          type="button"
          className="rcbar__icon"
          onClick={() => setAboutOpen(true)}
          aria-label="About this tool"
          title="About this tool"
          data-testid="map-about"
        >
          <HelpCircle aria-hidden="true" size={18} />
        </button>
        <div className="rcbar__auth" data-on={isAuthenticated ? "true" : "false"}>
          <span />
          <strong>{authLabel}</strong>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={signIn}
              disabled={authStatus === "checking" || authStatus === "signing-in"}
            >
              Sign in
            </button>
          )}
        </div>
      </RcAppBar>

      <div className="map-shell__stage">
        <aside
          className="map-shell__panel map-shell__panel--left"
          data-collapsed={leftOpen ? "false" : "true"}
          aria-label="Layer controls"
        >
          {!leftOpen && (
            <div className="map-shell__rail">
              <button type="button" className="map-shell__rail-btn" aria-label="Open layer controls" onClick={() => setLeftOpen(true)}>
                <ChevronRight aria-hidden="true" size={18} />
              </button>
              <Link to="/hub" className="map-shell__rail-home" aria-label="Home" title="Home">
                <Home aria-hidden="true" size={18} />
              </Link>
              <span className="map-shell__rail-label">Layers</span>
            </div>
          )}
          {leftOpen && (
            <>
              <div className="map-shell__panel-head">
                <Link to="/hub" className="map-shell__panel-home" aria-label="Home" title="Home">
                  <Home aria-hidden="true" size={16} />
                </Link>
                <div className="map-shell__panel-head-text">
                  <h2>Layers</h2>
                  <p>{eyebrow}</p>
                </div>
                <button type="button" className="map-shell__rail-btn" aria-label="Collapse layer controls" onClick={() => setLeftOpen(false)}>
                  <ChevronLeft aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="map-shell__panel-body">
                <form className="map-search" onSubmit={searchPlace}>
                  <input
                    type="search"
                    className="map-filter"
                    placeholder="Find a place (city, county, state)"
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    aria-label="Find a place"
                  />
                  <button type="submit" className="btn btn--outline map-search__go">Go</button>
                </form>
                {placeStatus && <p className="map-search__status mono">{placeStatus}</p>}
                <LayerList snapshots={snapshots} onToggle={toggleLayer} />
              </div>
            </>
          )}
        </aside>

        <div className="map-shell__map">
          {createElement(
            "arcgis-map",
            {
              key: showSecureMap ? webMapItemId : "preview",
              ref: mapRef,
              itemId: showSecureMap ? webMapItemId : undefined,
              basemap: showSecureMap ? undefined : "osm",
              center: CENTER.join(","),
              zoom: ZOOM,
              className: "map-shell__arcgis",
              "data-testid": "map-shell-arcgis",
            },
            [
              createElement("arcgis-home", { key: "home", slot: "top-left" }),
              createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
              createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
              createElement(
                "arcgis-expand",
                { key: "basemap", slot: "bottom-right", icon: "basemap", label: "Basemap", mode: "floating" },
                createElement("arcgis-basemap-gallery", {})
              ),
            ]
          )}

          {!isAuthenticated && (
            <div className="map-gate" role="dialog" aria-label="Sign in required" data-testid="map-gate">
              <div className="map-gate__card">
                <p className="eyebrow">Red Cross ArcGIS</p>
                <h2>Sign in to view the map</h2>
                <p className="map-gate__copy">This map uses private Red Cross ArcGIS data. Sign in to load the live layers.</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={signIn}
                  disabled={authStatus === "checking" || authStatus === "signing-in"}
                  data-testid="map-signin"
                >
                  {authStatus === "signing-in" ? "Signing in…" : authStatus === "checking" ? "Checking…" : "Sign in to ArcGIS"}
                </button>
                {authError && <p className="map-gate__error">{authError}</p>}
              </div>
            </div>
          )}
        </div>

        <aside
          className="map-shell__panel map-shell__panel--right"
          data-collapsed={rightOpen ? "false" : "true"}
          aria-label="Feature details"
        >
          {!rightOpen && (
            <div className="map-shell__rail">
              <button type="button" className="map-shell__rail-btn" aria-label="Open details" onClick={() => setRightOpen(true)}>
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <span className="map-shell__rail-label">Details</span>
            </div>
          )}
          {rightOpen && (
            <>
              <div className="map-shell__panel-head">
                <div className="map-shell__panel-head-text">
                  <h2>Details</h2>
                  <p>Click a feature on the map.</p>
                </div>
                <button type="button" className="map-shell__rail-btn" aria-label="Collapse details" onClick={() => setRightOpen(false)}>
                  <ChevronRight aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="map-shell__panel-body">
                <FeatureDetails feature={activeFeature} />
              </div>
            </>
          )}
        </aside>
      </div>

      {aboutOpen && (
        <div
          className="map-about"
          role="dialog"
          aria-modal="true"
          aria-label={`About ${title}`}
          onClick={() => setAboutOpen(false)}
        >
          <div className="map-about__card" onClick={(event) => event.stopPropagation()}>
            <header className="map-about__head">
              <span className="map-about__mark"><RcMark size={22} /></span>
              <p className="map-about__eyebrow">{title}</p>
              <button type="button" className="map-about__x" aria-label="Close" onClick={() => setAboutOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="map-about__body">
              <p className="map-about__meta">{aboutMeta}</p>
              <h2 className="map-about__title">About {title}</h2>
              <p className="map-about__lead">{aboutLeadCopy}</p>

              <h3>How to use it</h3>
              <ul>
                {aboutPointsCopy.map((point) => (
                  <li key={point.label}><b>{point.label}</b> — {point.text}</li>
                ))}
              </ul>

              <p className="map-about__foot">
                <span className="map-about__foot-q">Question or suggestions?</span>{" "}
                <a href={`mailto:jeff.franzen2@redcross.org?subject=${encodeURIComponent(`${title} — question/suggestion`)}`}>
                  Email Jeff Franzen
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
