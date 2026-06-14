import { ChevronDown, Check } from "lucide-react";

/* Shared layer list — ONE accordion-by-type + ONE checkbox row used by every
   BioMed map tool. Apps build the groups from their own layer snapshots; the
   look, ordering, grouping, and the on/off checkbox are identical everywhere.
   A row may carry a legend marker (the actual map symbol) — when absent, a
   colored category dot is shown instead. */

export type ShellLayerMarker = { url: string; kind: string; label?: string };

export type ShellLayerRow = {
  id: string;
  title: string;
  summary?: string;
  /** Drives the colored category dot when no marker is supplied. */
  category?: string;
  /** The actual map symbol for this layer (preferred over the dot). */
  marker?: ShellLayerMarker;
  visible: boolean;
  disabled?: boolean;
};

export type ShellLayerGroup = {
  id: string;
  label: string;
  rows: ShellLayerRow[];
};

export default function LayerList({
  groups,
  openGroups,
  onToggleGroup,
  onToggleLayer,
  onToggleGroupAll,
  rowsDisabled = false,
  emptyMessage = "No layers loaded yet.",
  testId,
}: {
  groups: ShellLayerGroup[];
  openGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
  onToggleLayer: (layerId: string) => void;
  /** Optional per-group "All on/off" control (Atlas uses it). */
  onToggleGroupAll?: (groupId: string, turnOn: boolean) => void;
  rowsDisabled?: boolean;
  emptyMessage?: string;
  testId?: string;
}) {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <div className="mshell__layers" data-testid={testId}>
      {total === 0 ? (
        <p className="mshell__empty">{emptyMessage}</p>
      ) : (
        groups.map((group) => {
          if (group.rows.length === 0) return null;
          const onCount = group.rows.filter((r) => r.visible).length;
          const allOn = onCount === group.rows.length;
          const open = openGroups[group.id] ?? true;
          return (
            <section key={group.id} className="mshell__layer-group" data-open={open ? "true" : "false"}>
              <div className="mshell__layer-group-row">
                <button
                  type="button"
                  className="mshell__layer-group-head"
                  aria-expanded={open}
                  onClick={() => onToggleGroup(group.id)}
                >
                  <strong>{group.label}</strong>
                  <b>{onCount}/{group.rows.length}</b>
                  <ChevronDown aria-hidden="true" size={16} className="mshell__layer-group-chevron" />
                </button>
                {onToggleGroupAll && (
                  <button
                    type="button"
                    className="mshell__layer-group-all"
                    disabled={rowsDisabled}
                    aria-pressed={allOn}
                    onClick={() => onToggleGroupAll(group.id, !allOn)}
                    title={allOn ? "Turn all off in this group" : "Turn all on in this group"}
                  >
                    {allOn ? "All Off" : "All On"}
                  </button>
                )}
              </div>
              {open &&
                group.rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="mshell__layer"
                    aria-pressed={row.visible}
                    disabled={row.disabled ?? rowsDisabled}
                    onClick={() => onToggleLayer(row.id)}
                  >
                    <span className="mshell__check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                    {row.marker ? (
                      <span
                        className="mshell__layer-marker"
                        data-kind={row.marker.kind}
                        data-testid="ops-layer-legend-marker"
                        title={row.marker.label}
                      >
                        <img src={row.marker.url} alt="" aria-hidden="true" />
                      </span>
                    ) : row.category ? (
                      <span className={`mshell__layer-dot mshell__layer-dot--${row.category}`} aria-hidden="true" />
                    ) : null}
                    <span className="mshell__layer-name">
                      <strong>{row.title}</strong>
                      {row.summary && <small>{row.summary}</small>}
                    </span>
                    <em className="mshell__layer-state">{row.visible ? "On" : "Off"}</em>
                  </button>
                ))}
            </section>
          );
        })
      )}
    </div>
  );
}
