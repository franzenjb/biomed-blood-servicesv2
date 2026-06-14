import type { ScorecardEntry } from "../../utils/biomedScorecard";

/* The right-panel "answer": a count per visible layer, scoped to the geography
   filter on the left. Shared by the Atlas and the dashboards so the Detail tab
   reads the same everywhere. */

export default function LayerScorecard({
  entries,
  scopeLabel,
  loading,
  emptyHint,
  testId,
}: {
  entries: ScorecardEntry[];
  scopeLabel: string;
  loading?: boolean;
  emptyHint?: string;
  testId?: string;
}) {
  return (
    <section className="mshell__scorecard" aria-label="Layer counts for the current filter" data-testid={testId}>
      <p className="mshell__scorecard-scope">{scopeLabel}</p>
      {loading ? (
        <p className="mshell__scorecard-empty">Counting…</p>
      ) : entries.length === 0 ? (
        <p className="mshell__scorecard-empty">{emptyHint ?? "Turn on layers to see their counts here."}</p>
      ) : (
        <ul className="mshell__scorecard-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="mshell__scorecard-row"
              data-zero={entry.value === 0 || entry.value == null ? "true" : "false"}
            >
              <span className="mshell__scorecard-name">{entry.title}</span>
              <strong className="mshell__scorecard-value">
                {entry.value == null ? "—" : entry.value.toLocaleString()}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
