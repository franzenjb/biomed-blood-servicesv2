import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
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
  type ArcgisMapElement,
  type BioMedLayerSnapshot,
} from "../utils/biomedMapSuite";
import { buildFeatureInfo, type FeatureInfo } from "./featureInfo";
import MapPanel from "./MapPanel";
import LayerList from "./LayerList";
import FeatureDetails from "./FeatureDetails";
import "./mapShell.css";

type Props = {
  eyebrow?: string;
  title: string;
  webMapItemId: string;
};

type AuthStatus = "checking" | "signed-out" | "signing-in" | "signed-in" | "error";
type WatchHandle = { remove?: () => void };

const CENTER: [number, number] = [-96, 38.5];
const ZOOM = 4;

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : `${error}`;
  if (/abort|cancel|closed/i.test(message)) return "Sign-in was closed before it completed.";
  return "ArcGIS sign-in did not complete. Try again.";
}

export default function MapShell({ eyebrow = "Live ArcGIS map", title, webMapItemId }: Props) {
  useArcgisComponents();
  const mapRef = useRef<ArcgisMapElement | null>(null);
  const viewRef = useRef<MapView | null>(null);

  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState("");
  const [showSecureMap, setShowSecureMap] = useState(false);
  const [snapshots, setSnapshots] = useState<BioMedLayerSnapshot[]>([]);
  const [activeFeature, setActiveFeature] = useState<FeatureInfo | null>(null);
  const [activeTab, setActiveTab] = useState("layers");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeStatus, setPlaceStatus] = useState("");

  const isAuthenticated = authStatus === "signed-in";

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
            const info = buildFeatureInfo(graphics);
            setActiveFeature(info);
            if (info) setActiveTab("details");
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
    <section className="map-shell" data-testid="map-shell" aria-label={title}>
      <div className="map-shell__canvas">
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
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-search", { key: "search", slot: "top-right" }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
            createElement(
              "arcgis-expand",
              { key: "basemap", slot: "bottom-right", icon: "basemap", label: "Basemap", mode: "floating" },
              createElement("arcgis-basemap-gallery", {})
            ),
          ]
        )}
      </div>

      <Link to="/hub" className="map-shell__back" data-testid="map-back">
        ← Maps
      </Link>

      <MapPanel
        eyebrow={eyebrow}
        title={title}
        tabs={[
          { id: "layers", label: "Layers" },
          { id: "details", label: "Details" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
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

        {activeTab === "layers" ? (
          <LayerList snapshots={snapshots} onToggle={toggleLayer} />
        ) : (
          <FeatureDetails feature={activeFeature} />
        )}
      </MapPanel>

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
    </section>
  );
}
