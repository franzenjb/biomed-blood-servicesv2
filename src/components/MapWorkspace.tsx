import { useEffect, useMemo, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import "@arcgis/core/assets/esri/themes/light/main.css";

import {
  regions,
  fixedSites,
  mobileMarkets,
  hospitalDistribution,
  futureDemandProjections,
} from "../data/mockData";
import {
  hospitalNetworkRecords,
  hospitalNetworkRegions,
  hospitalTierColors,
} from "../data/hospitalNetworkData";
import "./MapWorkspace.css";

type LayerId = "collections" | "hospitals" | "future";
type RegionFilter = "all" | string;

const LAYER_DEFS: { id: LayerId; label: string; hint: string }[] = [
  { id: "collections", label: "Collections", hint: "Donor centers & mobile drives" },
  { id: "hospitals", label: "Hospital reach", hint: "Distribution sites & hospital clusters" },
  { id: "future", label: "Future demand", hint: "2045 coverage pressure (directional)" },
];

const RED: [number, number, number] = [237, 27, 46];
const BLUE: [number, number, number] = [30, 74, 109];
const GREEN: [number, number, number] = [45, 90, 39];

export default function MapWorkspace() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const layersRef = useRef<Record<LayerId, GraphicsLayer>>(
    {} as Record<LayerId, GraphicsLayer>
  );

  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>({
    collections: true,
    hospitals: true,
    future: false,
  });
  const [region, setRegion] = useState<RegionFilter>("all");

  /* Build the map once. */
  useEffect(() => {
    if (!mapNodeRef.current) return;

    // Public OpenStreetMap basemap — no API key, no sign-in, fully anonymous.
    const map = new Map({ basemap: "osm" });

    const collections = new GraphicsLayer({ title: "Collections" });
    const hospitals = new GraphicsLayer({ title: "Hospital reach" });
    const future = new GraphicsLayer({ title: "Future demand", visible: false });
    layersRef.current = { collections, hospitals, future };
    map.addMany([hospitals, future, collections]);

    // ---- Collections: fixed sites + mobile markets -------------------
    fixedSites.forEach((s) => {
      collections.add(
        new Graphic({
          geometry: new Point({ longitude: s.coordinates[0], latitude: s.coordinates[1] }),
          symbol: {
            type: "simple-marker",
            style: "circle",
            color: [...RED, 0.9],
            size: 11,
            outline: { color: [255, 255, 255, 0.9], width: 1.5 },
          },
          attributes: { regionId: s.regionId, kind: "Fixed site", name: s.name },
          popupTemplate: {
            title: "{name}",
            content: `Fixed donor center · ${s.city}, ${s.state}<br>${s.annualCollections.toLocaleString()} annual collections · ${s.donorRetentionPct}% donor retention`,
          },
        })
      );
    });
    mobileMarkets.forEach((m) => {
      collections.add(
        new Graphic({
          geometry: new Point({ longitude: m.coordinates[0], latitude: m.coordinates[1] }),
          symbol: {
            type: "simple-marker",
            style: "diamond",
            color: [...RED, 0.55],
            size: 16,
            outline: { color: RED, width: 1.5 },
          },
          attributes: { regionId: m.regionId, kind: "Mobile drives", name: m.chapter },
          popupTemplate: {
            title: "{name}",
            content: `Mobile collections · ${m.county}, ${m.state}<br>${m.drives.toLocaleString()} drives · ${m.products.toLocaleString()} products · ${m.partners} partners`,
          },
        })
      );
    });

    // ---- Hospital reach: footprints + records ------------------------
    hospitalNetworkRegions.forEach((r) => {
      hospitals.add(
        new Graphic({
          geometry: new Polygon({
            rings: [r.footprint.map((c) => [c[0], c[1]])],
          }),
          symbol: {
            type: "simple-fill",
            color: [...BLUE, 0.07],
            outline: { color: [...BLUE, 0.45], width: 1 },
          },
          attributes: { kind: "Region footprint", name: r.name },
        })
      );
    });
    hospitalNetworkRecords.forEach((h) => {
      const color =
        h.type === "distribution"
          ? BLUE
          : h.type === "opportunity"
          ? GREEN
          : (hospitalTierColors[h.tier ?? "tier3"].slice(0, 3) as [number, number, number]);
      hospitals.add(
        new Graphic({
          geometry: new Point({ longitude: h.coordinates[0], latitude: h.coordinates[1] }),
          symbol: {
            type: "simple-marker",
            style: h.type === "distribution" ? "square" : "circle",
            color: [...color, 0.85],
            size: h.type === "distribution" ? 12 : 9,
            outline: { color: [255, 255, 255, 0.85], width: 1 },
          },
          attributes: { kind: h.type, name: h.name },
          popupTemplate: {
            title: "{name}",
            content: `${h.market}, ${h.state}<br>${h.annualUnits.toLocaleString()} annual units · ~${h.distanceMinutes} min reach · ${h.reliability}% reliability`,
          },
        })
      );
    });

    // ---- Future demand: region coverage pressure (2045) -------------
    futureDemandProjections
      .filter((p) => p.year === "2045")
      .forEach((p) => {
        const r = regions.find((rg) => rg.id === p.regionId);
        if (!r) return;
        const size = 18 + (130 - p.coverageIndex) * 0.7; // lower coverage = bigger ring
        future.add(
          new Graphic({
            geometry: new Point({ longitude: r.center[0], latitude: r.center[1] }),
            symbol: {
              type: "simple-marker",
              style: "circle",
              color: [...RED, 0.18],
              size,
              outline: { color: RED, width: 2 },
            },
            attributes: { regionId: r.id, kind: "Future demand", name: r.name },
            popupTemplate: {
              title: "{name} — 2045 scenario",
              content: `${p.primarySignal}. Modeled coverage ${p.coverageIndex} of 100 baseline.<br><em>Directional planning scenario, not a forecast.</em>`,
            },
          })
        );
      });

    const view = new MapView({
      container: mapNodeRef.current,
      map,
      center: [-92, 39],
      zoom: 4,
      constraints: { snapToZoom: false },
      ui: { components: ["zoom", "attribution"] },
      popup: { dockEnabled: false },
    });
    viewRef.current = view;

    view.when(() => setReady(true));

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  /* Toggle layer visibility. */
  useEffect(() => {
    (Object.keys(enabled) as LayerId[]).forEach((id) => {
      const layer = layersRef.current[id];
      if (layer) layer.visible = enabled[id];
    });
  }, [enabled, ready]);

  /* Region focus. */
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready) return;
    if (region === "all") {
      view.goTo({ center: [-92, 39], zoom: 4 }, { duration: 700 }).catch(() => {});
      return;
    }
    const r = regions.find((rg) => rg.id === region);
    if (r) view.goTo({ center: r.center, zoom: r.zoom }, { duration: 700 }).catch(() => {});
  }, [region, ready]);

  /* Info panel content. */
  const info = useMemo(() => {
    if (region === "all") {
      return {
        title: "National overview",
        sub: "Sample regions shown — generalized, public-safe data.",
        stats: [
          { value: `${(regions.reduce((a, r) => a + r.annualProducts, 0) / 1000).toFixed(0)}K`, label: "Annual products (sample)", accent: true },
          { value: `${hospitalDistribution.reduce((a, h) => a + h.hospitalsServed, 0)}`, label: "Hospitals served (sample)" },
          { value: `${mobileMarkets.reduce((a, m) => a + m.drives, 0).toLocaleString()}`, label: "Mobile drives (sample)" },
          { value: "~2,500", label: "Hospitals nationwide" },
        ],
      };
    }
    const r = regions.find((rg) => rg.id === region)!;
    const dist = hospitalDistribution.find((h) => h.regionId === region);
    const fut = futureDemandProjections.find((p) => p.regionId === region && p.year === "2045");
    return {
      title: r.name,
      sub: r.chapter,
      stats: [
        { value: r.annualProducts.toLocaleString(), label: "Annual products", accent: true },
        { value: r.activeDonors.toLocaleString(), label: "Active donors" },
        { value: `${dist?.hospitalsServed ?? r.hospitalPartners}`, label: "Hospitals served" },
        { value: `${fut?.coverageIndex ?? 100}`, label: "2045 coverage (directional)" },
      ],
    };
  }, [region]);

  return (
    <div className="mapws" data-testid="map-workspace">
      <div className="mapws__map" ref={mapNodeRef} data-testid="map-canvas" />

      <aside className="mapws__panel">
        <div className="mapws__head">
          <p className="eyebrow">Map &amp; Data</p>
          <h1>Collection reach &amp; hospital distribution</h1>
          <p className="mapws__lede">
            A public, generalized view of where donation happens and where blood goes. No
            sensitive operational detail.
          </p>
        </div>

        <div className="mapws__group">
          <h2 className="mapws__h2">Layers</h2>
          {LAYER_DEFS.map((l) => (
            <label key={l.id} className="mapws__toggle" data-testid={`toggle-${l.id}`}>
              <input
                type="checkbox"
                checked={enabled[l.id]}
                onChange={(e) =>
                  setEnabled((prev) => ({ ...prev, [l.id]: e.target.checked }))
                }
              />
              <span className={`mapws__swatch swatch--${l.id}`} aria-hidden="true" />
              <span className="mapws__toggle-text">
                <span className="mapws__toggle-label">{l.label}</span>
                <span className="mapws__toggle-hint">{l.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mapws__group">
          <h2 className="mapws__h2">Focus a region</h2>
          <div className="mapws__regions">
            <button
              className={`mapws__pill ${region === "all" ? "is-active" : ""}`}
              onClick={() => setRegion("all")}
              data-testid="region-all"
            >
              All
            </button>
            {regions.map((r) => (
              <button
                key={r.id}
                className={`mapws__pill ${region === r.id ? "is-active" : ""}`}
                onClick={() => setRegion(r.id)}
                data-testid={`region-${r.id}`}
              >
                {r.name.replace(" Region", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="mapws__group mapws__info">
          <h2 className="mapws__h2">{info.title}</h2>
          <p className="mapws__info-sub">{info.sub}</p>
          <div className="mapws__stats">
            {info.stats.map((s, i) => (
              <div className="mapws__stat" key={i}>
                <div className={`mapws__stat-value mono ${s.accent ? "is-accent" : ""}`}>
                  {s.value}
                </div>
                <div className="mapws__stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="mapws__foot mono">
          Basemap: OpenStreetMap · overlays are generalized sample data
        </p>
      </aside>

      {!ready && (
        <div className="mapws__loading" data-testid="map-loading">
          Loading map…
        </div>
      )}
    </div>
  );
}
