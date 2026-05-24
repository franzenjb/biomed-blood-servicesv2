import type { FeatureInfo } from "./featureInfo";

type Props = {
  feature: FeatureInfo | null;
};

export default function FeatureDetails({ feature }: Props) {
  if (!feature) {
    return <p className="map-empty">Click a feature on the map to see its details here.</p>;
  }

  return (
    <div className="map-details">
      <h2 className="map-details__title">{feature.title}</h2>
      {feature.sections.map((section) => (
        <div className="map-details__section" key={section.layerTitle}>
          <div className="map-details__layer">{section.layerTitle}</div>
          {section.rows.map((row) => (
            <div className="map-row" key={`${section.layerTitle}-${row.label}`}>
              <span className="map-row__label">{row.label}</span>
              <span className="map-row__value mono">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
