import type { FeatureInfo } from "./featureInfo";

type Props = {
  feature: FeatureInfo | null;
};

const toNumber = (v: string) => Number(v.replace(/[^0-9.-]/g, ""));
const isYear = (label: string) => /^20\d{2}$/.test(label.trim());
const isHeadline = (label: string) => /grand total|^total\b|annual total/i.test(label);

export default function FeatureDetails({ feature }: Props) {
  if (!feature) {
    return <p className="map-empty">Click a feature on the map to see its details here.</p>;
  }

  const flat = feature.sections.flatMap((s) => s.rows.map((r) => ({ ...r, layer: s.layerTitle })));
  const years = flat
    .filter((r) => isYear(r.label) && Number.isFinite(toNumber(r.value)))
    .map((r) => ({ year: r.label.trim(), n: toNumber(r.value) }));
  const headline = flat.find((r) => isHeadline(r.label));
  const maxYear = Math.max(1, ...years.map((y) => y.n));

  const hiddenLabels = new Set<string>();
  if (headline) hiddenLabels.add(headline.label);
  years.forEach((y) => hiddenLabels.add(y.year));

  const primaryLayer = feature.sections[0]?.layerTitle ?? "Selected feature";

  return (
    <div className="fd" key={feature.title}>
      <p className="eyebrow fd__eyebrow">{primaryLayer}</p>
      <h2 className="fd__title">{feature.title}</h2>

      {headline && (
        <div className="fd__hero">
          <div className="fd__hero-value mono">{headline.value}</div>
          <div className="fd__hero-label">{headline.label}</div>
        </div>
      )}

      {years.length >= 2 && (
        <div className="fd__chart" role="img" aria-label="Yearly trend">
          {years.map((y, i) => (
            <div className="fd__bar-wrap" key={y.year}>
              <span className="fd__bar-val mono">{y.n.toLocaleString()}</span>
              <div className="fd__bar-track">
                <div
                  className="fd__bar"
                  style={{ height: `${Math.max(4, (y.n / maxYear) * 100)}%`, animationDelay: `${i * 70}ms` }}
                />
              </div>
              <span className="fd__bar-label mono">{y.year}</span>
            </div>
          ))}
        </div>
      )}

      {feature.sections.map((section) => {
        const rows = section.rows.filter((r) => !hiddenLabels.has(r.label));
        if (rows.length === 0) return null;
        return (
          <div className="fd__section" key={section.layerTitle}>
            <div className="fd__section-head">{section.layerTitle}</div>
            {rows.map((row, i) => (
              <div
                className="fd__row"
                key={`${section.layerTitle}-${row.label}`}
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <span className="fd__row-label">{row.label}</span>
                <span className="fd__row-value mono">{row.value}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
