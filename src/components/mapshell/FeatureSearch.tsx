import { Search } from "lucide-react";
import type { SearchStatus } from "../../utils/biomedFeatureSearch";

/* Shared feature-search UI — the single "find a county, region, district, or
   site and fly to it" control used by every map tool's Search tab. The page
   owns the query state + search/select logic; this renders the box + results. */

export type FeatureSearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  onSelect: () => void;
};

export default function FeatureSearch({
  query,
  onQueryChange,
  status,
  results,
  placeholder = "Search counties, regions, sites",
  hint = "Search counties, regions, districts, and sites across every BioMed layer.",
  resultsTestId,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status: SearchStatus;
  results: FeatureSearchItem[];
  placeholder?: string;
  hint?: string;
  resultsTestId?: string;
}) {
  return (
    <div className="mshell__search">
      <label className="mshell__search-box">
        <Search aria-hidden="true" size={16} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
      </label>
      {query.trim().length > 0 ? (
        <section className="mshell__results" data-testid={resultsTestId} aria-label="Map search results">
          {status === "idle" && <p className="mshell__results-note">Type at least 2 characters.</p>}
          {status === "blocked" && <p className="mshell__results-note">Sign in to search live map features.</p>}
          {status === "searching" && <p className="mshell__results-note">Searching BioMed layers…</p>}
          {status === "empty" && <p className="mshell__results-note">No matching features found.</p>}
          {status === "error" && <p className="mshell__results-note">Search failed. Try a more specific term.</p>}
          {status === "ready" && (
            <>
              <div className="mshell__results-head">
                <strong>{results.length} result{results.length === 1 ? "" : "s"}</strong>
                <span>Click to fly to it</span>
              </div>
              <div className="mshell__results-list">
                {results.map((result) => (
                  <button key={result.id} type="button" className="mshell__result" onClick={result.onSelect}>
                    <strong>{result.title}</strong>
                    {result.subtitle && <span>{result.subtitle}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <p className="mshell__search-hint">{hint}</p>
      )}
    </div>
  );
}
