import { useEffect, useRef, useState } from "react";
import type ArcGISMap from "@arcgis/core/Map";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { collectArcJurisdictionLayers } from "../utils/biomedMapSuite";

/* A legend that explains the point markers actually drawn on the map. Each
   visible point layer carries its own ArcGIS renderer (green/blue circles,
   etc.); we render that layer's real symbol with symbolUtils.renderPreviewHTML
   so the swatch always matches the map — no hand-picked colors to drift. */

type MarkerEntry = { id: string; title: string; symbol: unknown };

function representativeSymbol(renderer: unknown): unknown {
  const r = renderer as {
    type?: string;
    symbol?: unknown;
    defaultSymbol?: unknown;
    uniqueValueInfos?: Array<{ symbol?: unknown }>;
    classBreakInfos?: Array<{ symbol?: unknown }>;
  } | null;
  if (!r) return null;
  return (
    r.symbol ??
    r.uniqueValueInfos?.[0]?.symbol ??
    r.classBreakInfos?.[0]?.symbol ??
    r.defaultSymbol ??
    null
  );
}

function SymbolSwatch({ symbol }: { symbol: unknown }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let cancelled = false;
    const node = ref.current;
    if (!node || !symbol) return;
    void import("@arcgis/core/symbols/support/symbolUtils").then(async (mod) => {
      try {
        const el = await mod.renderPreviewHTML(symbol as never, { size: 16 });
        if (cancelled || !ref.current || !el) return;
        ref.current.replaceChildren(el);
      } catch {
        /* swatch is decorative; skip if a symbol can't preview */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [symbol]);
  return <span className="jd__legend-swatch" ref={ref} aria-hidden="true" />;
}

export default function MapMarkerLegend({
  map,
  refreshKey,
}: {
  map: ArcGISMap | undefined;
  refreshKey: string;
}) {
  const [entries, setEntries] = useState<MarkerEntry[]>([]);

  useEffect(() => {
    if (!map) {
      setEntries([]);
      return;
    }
    const seen = new Set<string>();
    const next: MarkerEntry[] = [];
    collectArcJurisdictionLayers(map)
      .filter((layer): layer is FeatureLayer => (layer as FeatureLayer).geometryType === "point")
      .filter((layer) => layer.visible && layer.listMode !== "hide")
      .forEach((layer) => {
        const title = (layer.title ?? "").trim();
        if (!title || seen.has(title)) return;
        const symbol = representativeSymbol((layer as { renderer?: unknown }).renderer);
        if (!symbol) return;
        seen.add(title);
        next.push({ id: layer.id ?? title, title, symbol });
      });
    setEntries(next);
  }, [map, refreshKey]);

  if (entries.length === 0) return null;

  return (
    <section className="jd__legend" aria-label="Map markers">
      <h3>Map Markers</h3>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <SymbolSwatch symbol={entry.symbol} /> {entry.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
