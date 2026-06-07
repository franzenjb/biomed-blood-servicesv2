import { useMemo, useState } from "react";
import type { MasterLayerCategory } from "../utils/masterMapFeatures";
import type { BioMedLayerSnapshot } from "../utils/biomedMapSuite";

type Props = {
  snapshots: BioMedLayerSnapshot[];
  onToggle: (layerId: string, visible: boolean) => void;
};

const CATEGORY_LABELS: Record<MasterLayerCategory, string> = {
  sites: "Facilities & Sites",
  geography: "Jurisdictions & Geography",
  operations: "Operations & Distribution",
  manufacturing: "Manufacturing",
  hospitals: "Hospitals & Patient Care",
  reference: "Reference",
};

const CATEGORY_ORDER: MasterLayerCategory[] = [
  "hospitals", "sites", "geography", "operations", "manufacturing", "reference",
];

export default function LayerList({ snapshots, onToggle }: Props) {
  const [filter, setFilter] = useState("");

  const groups = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const filtered = term ? snapshots.filter((s) => s.title.toLowerCase().includes(term)) : snapshots;
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      layers: filtered.filter((s) => s.category === category),
    })).filter((group) => group.layers.length > 0);
  }, [snapshots, filter]);

  if (snapshots.length === 0) {
    return <p className="map-empty">No layers loaded yet.</p>;
  }

  return (
    <div className="map-layers">
      <input
        type="search"
        className="map-filter"
        placeholder="Filter layers"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter layers"
      />

      {groups.map((group) => (
        <div className="map-layers__group" key={group.category}>
          <div className="map-layers__heading">{group.label}</div>
          {group.layers.map((layer) => (
            <label className="map-check" key={layer.id}>
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => onToggle(layer.id, e.target.checked)}
              />
              <span className="map-check__label">{layer.title}</span>
            </label>
          ))}
        </div>
      ))}

      {groups.length === 0 && <p className="map-empty">No layers match "{filter}".</p>}
    </div>
  );
}
