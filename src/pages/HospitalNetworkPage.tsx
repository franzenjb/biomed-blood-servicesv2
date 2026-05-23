import "../legacy/legacy-maps.css";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Crosshair,
  ExternalLink,
  GitBranch,
  Hospital,
  Layers,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  Truck
} from "lucide-react";
import Graphic from "@arcgis/core/Graphic";
import type ArcGISMap from "@arcgis/core/Map";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";
import { hospitalPortfolioMapSource } from "../config/arcgisLayers";
import { useArcgisComponents } from "../hooks/useArcgisComponents";
import {
  hospitalNetworkRecords,
  hospitalNetworkRegions,
  hospitalTierColors,
  hospitalTierLabels,
  type HospitalNetworkRecord,
  type HospitalNetworkRegion,
  type HospitalTier,
  type NetworkRecordType
} from "../data/hospitalNetworkData";
import type { Coordinates } from "../data/mockData";
import { checkRedCrossArcGISSignIn, ensureRedCrossOAuth, signInToRedCrossArcGIS } from "../utils/arcgisOAuth";

type NetworkLens = "reach" | "tiers" | "distribution" | "opportunity";
type AuthStatus = "checking" | "signed-out" | "signing-in" | "signed-in" | "error";

type DisplayHospitalRecord = HospitalNetworkRecord & {
  attributes?: Record<string, unknown>;
  geometry?: unknown;
  layerTitle?: string;
  source?: "preview" | "live";
  sourceLayerId?: string;
};

type LiveLayerCategory = NetworkRecordType | "footprint" | "reference";

type LiveLayerSnapshot = {
  id: string;
  title: string;
  category: LiveLayerCategory;
  featureCount?: number;
  status: string;
  visible: boolean;
};

type ArcgisHospitalMapElement = HTMLElement & {
  goTo?: (target: unknown, options?: { duration?: number }) => Promise<void>;
  loadErrorSources?: Array<{ loadError?: { message?: string }; source?: { title?: string } }>;
  map?: ArcGISMap;
  view?: MapView;
};

const formatNumber = new Intl.NumberFormat("en-US").format;

const lensOptions: Array<{
  id: NetworkLens;
  label: string;
  icon: typeof Layers;
  description: string;
}> = [
  {
    id: "reach",
    label: "Reach",
    icon: GitBranch,
    description: "Hospitals, footprints, and service routes together."
  },
  {
    id: "tiers",
    label: "Tiers",
    icon: Hospital,
    description: "Tier 1, 2, and 3 hospital clusters."
  },
  {
    id: "distribution",
    label: "Sites",
    icon: Truck,
    description: "Distribution anchors and delivery corridors."
  },
  {
    id: "opportunity",
    label: "Best Locations",
    icon: Crosshair,
    description: "Candidate locations and coverage gaps."
  }
];

function getRecordColor(record: HospitalNetworkRecord): [number, number, number, number] {
  if (record.type === "distribution") return [194, 31, 50, 0.96];
  if (record.type === "opportunity") return [214, 166, 79, 0.95];
  return hospitalTierColors[record.tier ?? "tier3"];
}

function getRecordLabel(record: HospitalNetworkRecord) {
  if (record.type === "distribution") return "Distribution Site";
  if (record.type === "opportunity") return "Best Location";
  return hospitalTierLabels[record.tier ?? "tier3"];
}

function getVisibleRecords(records: DisplayHospitalRecord[], regionId: string, lens: NetworkLens) {
  const regionRecords =
    regionId === "national"
      ? records
      : records.filter((record) => record.regionId === regionId);

  if (lens === "tiers") return regionRecords.filter((record) => record.type === "hospital");
  if (lens === "distribution") return regionRecords.filter((record) => record.type !== "opportunity");
  if (lens === "opportunity") return regionRecords.filter((record) => record.type !== "hospital");
  return regionRecords;
}

function findNearestDistribution(record: DisplayHospitalRecord, records: DisplayHospitalRecord[]) {
  const candidates = records.filter((candidate) => candidate.type === "distribution" && candidate.regionId === record.regionId);
  return candidates.reduce<DisplayHospitalRecord | undefined>((closest, candidate) => {
    if (!closest) return candidate;
    const candidateDistance = Math.hypot(
      candidate.coordinates[0] - record.coordinates[0],
      candidate.coordinates[1] - record.coordinates[1]
    );
    const closestDistance = Math.hypot(
      closest.coordinates[0] - record.coordinates[0],
      closest.coordinates[1] - record.coordinates[1]
    );
    return candidateDistance < closestDistance ? candidate : closest;
  }, undefined);
}

function getRegionStats(regionId: string, records: DisplayHospitalRecord[], liveDataActive: boolean) {
  if (liveDataActive) {
    const selectedRecords = regionId === "national" ? records : records.filter((record) => record.regionId === regionId);

    return selectedRecords.reduce(
      (totals, record) => {
        if (record.type === "hospital") {
          totals.hospitals += 1;
          if (record.tier) totals[record.tier] += 1;
        }
        if (record.type === "distribution") totals.distributionSites += 1;
        return totals;
      },
      { hospitals: 0, distributionSites: 0, tier1: 0, tier2: 0, tier3: 0 }
    );
  }

  const selectedRegions =
    regionId === "national"
      ? hospitalNetworkRegions
      : hospitalNetworkRegions.filter((region) => region.id === regionId);

  return selectedRegions.reduce(
    (totals, region) => {
      totals.hospitals += region.hospitalsServed;
      totals.distributionSites += region.distributionSites;
      totals.tier1 += region.tierMix.tier1;
      totals.tier2 += region.tierMix.tier2;
      totals.tier3 += region.tierMix.tier3;
      return totals;
    },
    { hospitals: 0, distributionSites: 0, tier1: 0, tier2: 0, tier3: 0 }
  );
}

function getRegionByRecord(record?: DisplayHospitalRecord) {
  return record ? hospitalNetworkRegions.find((region) => region.id === record.regionId) : undefined;
}

function polygonGraphic(region: HospitalNetworkRegion, selected: boolean) {
  return new Graphic({
    geometry: {
      type: "polygon",
      rings: [region.footprint]
    },
    attributes: {
      recordType: "footprint",
      regionId: region.id,
      name: `${region.name} footprint`
    },
    symbol: {
      type: "simple-fill",
      color: selected ? [194, 31, 50, 0.14] : [47, 118, 109, 0.1],
      outline: {
        color: selected ? [194, 31, 50, 0.72] : [23, 25, 29, 0.32],
        width: selected ? 2 : 1.2
      }
    },
    popupTemplate: {
      title: region.name,
      content: region.summary
    }
  });
}

function routeGraphic(from: Coordinates, to: Coordinates, selected: boolean) {
  return new Graphic({
    geometry: {
      type: "polyline",
      paths: [[from, to]]
    },
    symbol: {
      type: "simple-line",
      color: selected ? [194, 31, 50, 0.72] : [29, 79, 115, 0.34],
      style: selected ? "solid" : "short-dot",
      width: selected ? 2.6 : 1.6
    }
  });
}

function pointGraphic(record: DisplayHospitalRecord, selected: boolean) {
  const color = getRecordColor(record);

  return new Graphic({
    geometry: {
      type: "point",
      longitude: record.coordinates[0],
      latitude: record.coordinates[1]
    },
    attributes: {
      id: record.id,
      recordType: record.type,
      name: record.name
    },
    symbol: {
      type: "simple-marker",
      style: record.type === "distribution" ? "square" : record.type === "opportunity" ? "diamond" : "circle",
      color,
      outline: {
        color: selected ? [255, 255, 255, 1] : [23, 25, 29, 0.74],
        width: selected ? 2.8 : 1.2
      },
      size: selected ? 18 : record.type === "distribution" ? 14 : 11
    },
    popupTemplate: {
      title: record.name,
      content: `${getRecordLabel(record)} · ${record.market}`
    }
  });
}

function getHospitalMap(mapElement?: ArcgisHospitalMapElement | null) {
  return mapElement?.map ?? mapElement?.view?.map ?? undefined;
}

function safeLayerTitle(layer: Layer) {
  return layer.title ?? layer.id ?? "Untitled source layer";
}

function classifyLiveLayer(title: string): LiveLayerCategory {
  const normalized = title.toLowerCase();
  if (normalized.includes("best location")) return "opportunity";
  if (normalized.includes("distribution site")) return "distribution";
  if (normalized.includes("footprint")) return "footprint";
  if (normalized.includes("hospital portfolio")) return "hospital";
  return "reference";
}

function isPortfolioSourceLayer(title: string) {
  return ["opportunity", "distribution", "hospital", "footprint"].includes(classifyLiveLayer(title));
}

function isQueryFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatures === "function";
}

function collectLiveSourceLayers(map?: ArcGISMap): FeatureLayer[] {
  return ((map?.allLayers?.toArray?.() ?? []) as Layer[])
    .filter((layer) => isPortfolioSourceLayer(safeLayerTitle(layer)))
    .filter(isQueryFeatureLayer);
}

function liveLayerVisibleForLens(title: string, lens: NetworkLens) {
  const category = classifyLiveLayer(title);
  if (category === "reference") return true;
  if (lens === "reach") return category === "hospital" || category === "distribution" || category === "footprint";
  if (lens === "tiers") return category === "hospital" || category === "footprint";
  if (lens === "distribution") return category === "distribution" || category === "hospital" || category === "footprint";
  return category === "opportunity" || category === "distribution" || category === "footprint";
}

function getAttributeValue(attributes: Record<string, unknown>, candidates: string[]) {
  const entries = Object.entries(attributes);

  for (const candidate of candidates) {
    const exact = entries.find(([key]) => key.toLowerCase() === candidate.toLowerCase());
    if (exact?.[1] != null && `${exact[1]}`.trim()) return exact[1];
  }

  for (const candidate of candidates) {
    const partial = entries.find(([key, value]) => key.toLowerCase().includes(candidate.toLowerCase()) && value != null);
    if (partial?.[1] != null && `${partial[1]}`.trim()) return partial[1];
  }

  return undefined;
}

function getStringAttribute(attributes: Record<string, unknown>, candidates: string[], fallback = "") {
  const value = getAttributeValue(attributes, candidates);
  if (value == null) return fallback;
  return `${value}`.trim() || fallback;
}

function getNumberAttribute(attributes: Record<string, unknown>, candidates: string[], fallback: number) {
  const value = getAttributeValue(attributes, candidates);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeTier(value: unknown): HospitalTier | undefined {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("1") || normalized.includes("tier 1")) return "tier1";
  if (normalized.includes("2") || normalized.includes("tier 2")) return "tier2";
  if (normalized.includes("3") || normalized.includes("tier 3")) return "tier3";
  return undefined;
}

function coordinatesFromGeometry(geometry: unknown): Coordinates | undefined {
  const candidate = geometry as {
    extent?: { center?: unknown };
    latitude?: number;
    longitude?: number;
    spatialReference?: { wkid?: number };
    type?: string;
    x?: number;
    y?: number;
  };

  if (!candidate) return undefined;
  if (typeof candidate.longitude === "number" && typeof candidate.latitude === "number") {
    return [candidate.longitude, candidate.latitude];
  }
  if (candidate.extent?.center) return coordinatesFromGeometry(candidate.extent.center);
  if (typeof candidate.x !== "number" || typeof candidate.y !== "number") return undefined;

  const wkid = candidate.spatialReference?.wkid;
  if (wkid === 3857 || wkid === 102100 || Math.abs(candidate.x) > 180 || Math.abs(candidate.y) > 90) {
    const lon = (candidate.x / 20037508.34) * 180;
    const mercatorLat = (candidate.y / 20037508.34) * 180;
    const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((mercatorLat * Math.PI) / 180)) - Math.PI / 2);
    return [lon, lat];
  }

  return [candidate.x, candidate.y];
}

function objectIdFromAttributes(layer: FeatureLayer, attributes: Record<string, unknown>, fallback: number) {
  const objectIdField = layer.objectIdField;
  const objectId = objectIdField ? attributes[objectIdField] : undefined;
  return objectId == null ? fallback : objectId;
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

function liveRecordFromGraphic(layer: FeatureLayer, graphic: Graphic, index: number): DisplayHospitalRecord | undefined {
  const title = safeLayerTitle(layer);
  const type = classifyLiveLayer(title);
  if (type !== "hospital" && type !== "distribution" && type !== "opportunity") return undefined;

  const attributes = (graphic.attributes ?? {}) as Record<string, unknown>;
  const objectId = objectIdFromAttributes(layer, attributes, index + 1);
  const coordinates = coordinatesFromGeometry(graphic.geometry);
  if (!coordinates) return undefined;

  const name = getStringAttribute(
    attributes,
    [
      "Hospital_Name",
      "HospitalName",
      "Facility_Name",
      "Facility",
      "Location_Name",
      "Site_Name",
      "SiteName",
      "SITE_NAME",
      "Customer_Name",
      "Customer",
      "Name"
    ],
    `${title} ${objectId}`
  );
  const city = getStringAttribute(attributes, ["City", "CITY", "Market", "County", "Location"], "");
  const state = getStringAttribute(attributes, ["State", "STATE", "ST", "StateName"], "");
  const market = getStringAttribute(
    attributes,
    ["Market", "City", "CITY", "County", "Chapter", "Region", "Division", "ZIP", "Zip"],
    [city, state].filter(Boolean).join(", ") || title
  );
  const tier = type === "hospital" ? normalizeTier(getAttributeValue(attributes, ["Final_Tier", "Final Tier", "Tier", "TIER"])) : undefined;
  const annualUnits = getNumberAttribute(
    attributes,
    ["AnnualUnits", "Annual_Units", "Units", "Volume", "RBC", "Total", "Collections", "Demand"],
    0
  );

  return {
    id: `${layer.id}-${objectId}`,
    type,
    regionId: "live",
    name,
    market,
    state,
    coordinates,
    tier,
    annualUnits,
    distanceMinutes: 0,
    reliability: 0,
    narrative: `Live feature from ${title}. Open the popup on the map for the full source attributes.`,
    attributes,
    geometry: graphic.geometry,
    layerTitle: title,
    source: "live",
    sourceLayerId: layer.id
  };
}

async function queryLiveRecords(layers: FeatureLayer[]) {
  const records: DisplayHospitalRecord[] = [];
  const counts: Record<string, number> = {};

  for (const layer of layers) {
    const title = safeLayerTitle(layer);
    const category = classifyLiveLayer(title);
    if (category !== "hospital" && category !== "distribution" && category !== "opportunity") continue;

    await layer.load();
    const query = layer.createQuery();
    query.where = "1=1";
    query.outFields = ["*"];
    query.returnGeometry = true;
    query.num = 2500;

    const result = await layer.queryFeatures(query);
    const layerRecords = result.features
      .map((graphic, index) => liveRecordFromGraphic(layer, graphic, index))
      .filter((record): record is DisplayHospitalRecord => Boolean(record));
    counts[layer.id] = layerRecords.length;
    records.push(...layerRecords);
  }

  return { counts, records };
}

export default function HospitalNetworkPage() {
  useArcgisComponents();
  const mapRef = useRef<ArcgisHospitalMapElement | null>(null);
  const [activeLens, setActiveLens] = useState<NetworkLens>("reach");
  const [selectedRegionId, setSelectedRegionId] = useState("national");
  const [selectedRecordId, setSelectedRecordId] = useState("hosp-nyc-tier1");
  const [isMapReady, setIsMapReady] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authUser, setAuthUser] = useState("");
  const [authError, setAuthError] = useState("");
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [sourceLayerSnapshots, setSourceLayerSnapshots] = useState<LiveLayerSnapshot[]>([]);
  const [liveRecords, setLiveRecords] = useState<DisplayHospitalRecord[]>([]);
  const [liveDataStatus, setLiveDataStatus] = useState("Sign in to query the private map layers.");
  const [liveDataError, setLiveDataError] = useState("");
  const liveDataActive = liveRecords.length > 0;
  const activeRecords = liveDataActive ? liveRecords : (hospitalNetworkRecords as DisplayHospitalRecord[]);

  const selectedRegion = useMemo(() => {
    if (selectedRegionId === "national") {
      return {
        id: "national",
        name: liveDataActive ? "Live ArcGIS Portfolio View" : "National Portfolio View",
        center: [-96.2, 38.3] as Coordinates,
        zoom: 4,
        summary: liveDataActive
          ? "Live records are being queried from the private Hospital Portfolio web map in this browser session."
          : "Use the national view to make the hospital network legible before drilling into regions."
      };
    }

    return hospitalNetworkRegions.find((region) => region.id === selectedRegionId) ?? hospitalNetworkRegions[0];
  }, [liveDataActive, selectedRegionId]);

  const visibleRecords = useMemo(
    () => getVisibleRecords(activeRecords, selectedRegionId, activeLens),
    [activeLens, activeRecords, selectedRegionId]
  );
  const selectedRecord =
    visibleRecords.find((record) => record.id === selectedRecordId) ??
    activeRecords.find((record) => record.id === selectedRecordId) ??
    visibleRecords[0] ??
    activeRecords[0];
  const selectedRecordRegion = getRegionByRecord(selectedRecord);
  const regionStats = getRegionStats(selectedRegionId, activeRecords, liveDataActive);

  const goToMap = useCallback(async (target: unknown, options?: { duration?: number }) => {
    const mapElement = mapRef.current;
    const view = mapElement?.view;

    try {
      await view?.when?.();
      await (view?.goTo?.(target as Parameters<MapView["goTo"]>[0], options) ?? mapElement?.goTo?.(target, options));
    } catch {
      // ArcGIS can reject navigation while the map view is mounting or interrupting another animation.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    ensureRedCrossOAuth();
    void checkRedCrossArcGISSignIn()
      .then((credential) => {
        if (cancelled) return;
        setAuthUser(credential.userId ?? "Red Cross ArcGIS");
        setAuthStatus("signed-in");
        setShowLiveMap(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthStatus("signed-out");
        setShowLiveMap(false);
        setLiveDataStatus("Sign in to query the private map layers.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (visibleRecords.length > 0 && !visibleRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(visibleRecords[0].id);
    }
  }, [selectedRecordId, visibleRecords]);

  useEffect(() => {
    if (liveDataActive && selectedRegionId !== "national") {
      setSelectedRegionId("national");
    }
  }, [liveDataActive, selectedRegionId]);

  useEffect(() => {
    if (!isMapReady) return;
    void goToMap({ center: selectedRegion.center, zoom: selectedRegion.zoom }, { duration: 700 });
  }, [goToMap, isMapReady, selectedRegion.center, selectedRegion.zoom]);

  useEffect(() => {
    if (!showLiveMap) return undefined;

    let cancelled = false;

    async function hydrateLiveMap() {
      const mapElement = mapRef.current;
      const view = mapElement?.view;
      if (!mapElement || !view || cancelled) return;

      setIsMapReady(false);
      setLiveDataStatus("Loading private Hospital Portfolio web map...");
      setLiveDataError("");

      try {
        await view.when();
        if (cancelled) return;

        const map = getHospitalMap(mapElement);
        const layers = collectLiveSourceLayers(map);
        layers.forEach((layer) => {
          layer.visible = liveLayerVisibleForLens(safeLayerTitle(layer), activeLens);
        });
        setSourceLayerSnapshots(
          layers.map((layer) => ({
            id: layer.id,
            title: safeLayerTitle(layer),
            category: classifyLiveLayer(safeLayerTitle(layer)),
            status: layer.loadStatus ?? "ready",
            visible: layer.visible
          }))
        );

        if (layers.length === 0) {
          setLiveDataStatus("The web map loaded, but the expected hospital portfolio source layers were not exposed.");
          setIsMapReady(true);
          return;
        }

        setLiveDataStatus("Querying live hospital portfolio features...");
        const { counts, records } = await queryLiveRecords(layers);
        if (cancelled) return;

        setLiveRecords(records);
        setSourceLayerSnapshots(
          layers.map((layer) => ({
            id: layer.id,
            title: safeLayerTitle(layer),
            category: classifyLiveLayer(safeLayerTitle(layer)),
            featureCount: counts[layer.id],
            status: layer.loadStatus ?? "ready",
            visible: layer.visible
          }))
        );
        setLiveDataStatus(
          records.length > 0
            ? `Using ${formatNumber(records.length)} live features from the private Hospital Portfolio map.`
            : "The private map loaded, but point features were not returned from the portfolio layers."
        );
        setSelectedRegionId("national");
        setIsMapReady(true);
      } catch (error) {
        if (cancelled) return;
        setLiveRecords([]);
        setSourceLayerSnapshots([]);
        setLiveDataError(getErrorMessage(error));
        setLiveDataStatus("Could not query the private map layers. The preview remains available.");
        setIsMapReady(true);
      }
    }

    if (mapRef.current?.view) {
      void hydrateLiveMap();
    } else {
      mapRef.current?.addEventListener("arcgisViewReadyChange", hydrateLiveMap, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, [showLiveMap]);

  useEffect(() => {
    if (!showLiveMap || !isMapReady) return;

    const layers = collectLiveSourceLayers(getHospitalMap(mapRef.current));
    layers.forEach((layer) => {
      layer.visible = liveLayerVisibleForLens(safeLayerTitle(layer), activeLens);
    });
    setSourceLayerSnapshots((current) =>
      current.map((snapshot) => {
        const liveLayer = layers.find((layer) => layer.id === snapshot.id);
        return liveLayer ? { ...snapshot, visible: liveLayer.visible } : snapshot;
      })
    );
  }, [activeLens, isMapReady, showLiveMap]);

  useEffect(() => {
    let cancelled = false;
    let layer: GraphicsLayer | undefined;
    let clickHandle: { remove?: () => void } | undefined;

    async function hydrate() {
      if (showLiveMap) return;
      const mapElement = mapRef.current;
      const view = mapElement?.view;
      if (!view?.map || cancelled) return;

      await view.when?.();
      if (cancelled) return;

      layer = new GraphicsLayer({
        id: "hospital-network-showcase-overlay",
        title: "Hospital network showcase overlay"
      });

      const selectedRegionIds = selectedRegionId === "national" ? hospitalNetworkRegions.map((region) => region.id) : [selectedRegionId];
      const footprintGraphics = hospitalNetworkRegions
        .filter((region) => selectedRegionIds.includes(region.id))
        .map((region) => polygonGraphic(region, region.id === selectedRecord.regionId));

      const routeGraphics =
        activeLens === "tiers" || activeLens === "opportunity"
          ? []
          : visibleRecords
              .filter((record) => record.type !== "distribution")
              .map((record) => {
                const nearest = findNearestDistribution(record, activeRecords);
                return nearest ? routeGraphic(nearest.coordinates, record.coordinates, record.id === selectedRecord.id) : undefined;
              })
              .filter((graphic): graphic is Graphic => Boolean(graphic));

      const pointGraphics = visibleRecords.map((record) => pointGraphic(record, record.id === selectedRecord.id));

      layer.addMany([...footprintGraphics, ...routeGraphics, ...pointGraphics]);
      view.map.add?.(layer);
      clickHandle = view.on?.("click", async (event) => {
        const response = await view.hitTest?.(event);
        const results = (response?.results ?? []) as Array<{ graphic?: Graphic }>;
        const hit = results.find((result) => result.graphic?.layer === layer)?.graphic;
        const id = hit?.attributes?.id as string | undefined;
        if (id) setSelectedRecordId(id);
      });
      setIsMapReady(true);
    }

    if (showLiveMap) {
      return undefined;
    }

    if (mapRef.current?.view) {
      void hydrate();
    } else {
      mapRef.current?.addEventListener("arcgisViewReadyChange", hydrate, { once: true });
    }

    return () => {
      cancelled = true;
      clickHandle?.remove?.();
      if (layer && mapRef.current?.view?.map?.remove) {
        mapRef.current.view.map.remove(layer);
      }
      layer?.destroy?.();
    };
  }, [activeLens, activeRecords, selectedRecord.id, selectedRecord.regionId, selectedRegionId, showLiveMap, visibleRecords]);

  async function signInToArcGIS() {
    ensureRedCrossOAuth();
    setAuthStatus("signing-in");
    setAuthError("");
    setLiveDataError("");
    setLiveDataStatus("Opening ArcGIS sign-in...");
    setIsMapReady(false);

    try {
      const credential = await signInToRedCrossArcGIS();
      setAuthUser(credential.userId ?? "Red Cross ArcGIS");
      setAuthStatus("signed-in");
      setShowLiveMap(true);
    } catch (error) {
      setAuthError(getErrorMessage(error));
      setAuthStatus("error");
      setShowLiveMap(false);
      setLiveDataStatus("Sign-in did not complete. The preview remains available.");
      setIsMapReady(true);
    }
  }

  const selectRecord = useCallback((record: DisplayHospitalRecord) => {
    setSelectedRecordId(record.id);
    void goToMap({ center: record.coordinates, zoom: 7.8 }, { duration: 650 });
  }, [goToMap]);

  return (
    <section className="hospital-network-tool" data-testid="hospital-network-tool" aria-label="Hospital network reach showcase">
      <div className="hospital-network-map-shell">
        {createElement(
          "arcgis-map",
          {
            key: showLiveMap ? hospitalPortfolioMapSource.webMapItemId : "hospital-network-preview",
            ref: mapRef,
            itemId: showLiveMap ? hospitalPortfolioMapSource.webMapItemId : undefined,
            basemap: showLiveMap ? undefined : "gray-vector",
            center: selectedRegion.center.join(","),
            zoom: selectedRegion.zoom,
            className: "hospital-network-arcgis-map",
            "data-testid": "hospital-network-arcgis",
            "aria-label": "Hospital network ArcGIS SDK map"
          },
          [
            createElement("arcgis-zoom", { key: "zoom", slot: "top-left" }),
            createElement("arcgis-home", { key: "home", slot: "top-left" }),
            createElement("arcgis-scale-bar", { key: "scale", slot: "bottom-left", unit: "dual" }),
            createElement("arcgis-basemap-toggle", {
              key: "basemap",
              slot: "bottom-right",
              nextBasemap: "hybrid"
            })
          ]
        )}
        <div className="hospital-network-vignette" aria-hidden="true" />
        <div className="hospital-network-mobile-preview" aria-hidden="true">
          {visibleRecords.slice(0, 14).map((record, index) => (
            <span
              key={record.id}
              className={`preview-node type-${record.type} ${record.tier ? `tier-${record.tier}` : ""} ${
                record.id === selectedRecord.id ? "is-selected" : ""
              }`}
              style={{
                left: `${16 + ((index * 17) % 66)}%`,
                top: `${18 + ((index * 23) % 58)}%`
              }}
            >
              <i />
              {record.id === selectedRecord.id && <b>{record.market}</b>}
            </span>
          ))}
        </div>
      </div>

      <header className="hospital-network-command" aria-label="Hospital network command panel">
        <Link className="hospital-network-back" to="/hub">
          <ArrowLeft aria-hidden="true" size={16} />
          Map Menu
        </Link>
        <div className="hospital-network-title-block">
          <h1>Hospital Network Reach</h1>
          <p>
            A cleaner ArcGIS SDK showcase for hospital tiers, distribution sites, portfolio footprint, and best-location
            opportunities.
          </p>
        </div>
        <div className="hospital-network-actions" aria-label="Hospital source links">
          <a href={hospitalPortfolioMapSource.mapViewerUrl} target="_blank" rel="noreferrer">
            <MapPinned aria-hidden="true" size={16} />
            Source Map
          </a>
          <Link to="/s/distribution">
            <ExternalLink aria-hidden="true" size={16} />
            Story
          </Link>
        </div>
      </header>

      <aside className="hospital-network-left" aria-label="Hospital network controls">
        <div className="hospital-network-start-card">
          <div className="hospital-network-status-line">
            <span className={isMapReady && (liveDataActive || !showLiveMap) ? "is-live" : ""} />
            {liveDataActive ? "Live ArcGIS data" : isMapReady ? "Preview map ready" : "Loading ArcGIS"}
          </div>
          <h2>{selectedRegion.name}</h2>
          <p>{selectedRegion.summary}</p>
          <small>
            {liveDataActive
              ? liveDataStatus
              : `Preview overlay. Sign in to use the real ${hospitalPortfolioMapSource.title} layers.`}
          </small>
          {authUser && <small>Signed in as {authUser}.</small>}
          {(authStatus === "signed-out" || authStatus === "error") && (
            <button type="button" onClick={signInToArcGIS}>
              <ShieldCheck aria-hidden="true" size={16} />
              Sign in for real data
            </button>
          )}
          {authStatus === "signing-in" && (
            <button type="button" disabled>
              <ShieldCheck aria-hidden="true" size={16} />
              Signing in...
            </button>
          )}
          {(authError || liveDataError) && <small className="hospital-network-error">{authError || liveDataError}</small>}
        </div>

        {!liveDataActive && (
          <label className="hospital-network-region-select" htmlFor="hospital-region-select">
            <span>Region</span>
            <select id="hospital-region-select" value={selectedRegionId} onChange={(event) => setSelectedRegionId(event.target.value)}>
              <option value="national">National Portfolio View</option>
              {hospitalNetworkRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="hospital-network-panel">
          <div className="hospital-network-panel-heading">
            <Layers aria-hidden="true" size={18} />
            <div>
              <h2>Showcase lens</h2>
              <p>Switch from clutter to a presentation-ready question.</p>
            </div>
          </div>
          <div className="hospital-network-lens-grid" role="group" aria-label="Hospital network lens">
            {lensOptions.map((lens) => {
              const Icon = lens.icon;
              return (
                <button
                  key={lens.id}
                  type="button"
                  aria-pressed={activeLens === lens.id}
                  onClick={() => setActiveLens(lens.id)}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>
                    <strong>{lens.label}</strong>
                    <small>{lens.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hospital-network-panel">
          <div className="hospital-network-panel-heading">
            <ShieldCheck aria-hidden="true" size={18} />
            <div>
              <h2>Source layers to replace the prototype</h2>
              <p>{liveDataActive ? "These layer counts are coming from the signed-in web map." : "These are the useful layers from the current working copy."}</p>
            </div>
          </div>
          <div className="hospital-network-source-list">
            {(sourceLayerSnapshots.length > 0 ? sourceLayerSnapshots : hospitalPortfolioMapSource.operationalLayers).map((layer) => (
              <span key={layer.title}>
                <strong>{layer.title}</strong>
                <small>
                  {"role" in layer
                    ? layer.role
                    : `${layer.category} · ${layer.featureCount == null ? layer.status : `${formatNumber(layer.featureCount)} features`} · ${
                        layer.visible ? "visible" : "hidden"
                      }`}
                </small>
              </span>
            ))}
          </div>
        </div>
      </aside>

      <aside className="hospital-network-right" aria-label="Selected hospital network detail">
        <div className="hospital-network-metric-stack">
          <article>
            <span>Hospitals</span>
            <strong>{formatNumber(regionStats.hospitals)}</strong>
          </article>
          <article>
            <span>Distribution Sites</span>
            <strong>{formatNumber(regionStats.distributionSites)}</strong>
          </article>
          <article>
            <span>Tier 1</span>
            <strong>{formatNumber(regionStats.tier1)}</strong>
          </article>
        </div>

        <div className="hospital-network-selected">
          <p>
            <Sparkles aria-hidden="true" size={16} />
            Selected feature
          </p>
          <h2>{selectedRecord.name}</h2>
          <span className={`hospital-network-type type-${selectedRecord.type}`}>
            {getRecordLabel(selectedRecord)}
            {selectedRecord.source === "live"
              ? ` · ${selectedRecord.layerTitle ?? "live source"}`
              : selectedRecordRegion
                ? ` · ${selectedRecordRegion.name}`
                : ""}
          </span>
          <p>{selectedRecord.narrative}</p>
          <dl>
            <div>
              <dt>Market</dt>
              <dd>{selectedRecord.market}</dd>
            </div>
            <div>
              <dt>Annual units</dt>
              <dd>{selectedRecord.annualUnits > 0 ? formatNumber(selectedRecord.annualUnits) : "Source field"}</dd>
            </div>
            <div>
              <dt>Reach time</dt>
              <dd>{selectedRecord.distanceMinutes > 0 ? `${selectedRecord.distanceMinutes} min` : "Map popup"}</dd>
            </div>
            <div>
              <dt>Reliability</dt>
              <dd>{selectedRecord.reliability > 0 ? `${selectedRecord.reliability}%` : "Map popup"}</dd>
            </div>
          </dl>
        </div>

        <div className="hospital-network-feature-list" aria-label="Visible features">
          {visibleRecords.map((record) => {
            const Icon = record.type === "distribution" ? Truck : record.type === "opportunity" ? Crosshair : Building2;
            return (
              <button
                key={record.id}
                type="button"
                className={record.id === selectedRecord.id ? "is-selected" : ""}
                aria-pressed={record.id === selectedRecord.id}
                onClick={() => selectRecord(record)}
              >
                <Icon aria-hidden="true" size={16} />
                <span>
                  <strong>{record.name}</strong>
                  <small>
                    {getRecordLabel(record)} · {record.market}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="hospital-network-legend" aria-label="Hospital network legend">
        <span>
          <i className="legend-red" />
          Tier 1 / distribution
        </span>
        <span>
          <i className="legend-blue" />
          Tier 2
        </span>
        <span>
          <i className="legend-green" />
          Tier 3
        </span>
        <span>
          <i className="legend-gold" />
          Best location
        </span>
      </div>
    </section>
  );
}
