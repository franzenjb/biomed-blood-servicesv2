import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";

export type FeatureSection = { layerTitle: string; rows: Array<{ label: string; value: string }> };
export type FeatureInfo = { title: string; sections: FeatureSection[] };

type LayerWithFields = Layer & {
  title?: string;
  fields?: Array<{ name: string; alias?: string }>;
  popupTemplate?: { fieldInfos?: Array<{ fieldName?: string; label?: string; visible?: boolean }> } | null;
};

export function isJunkField(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.startsWith("objectid") ||
    k.includes("globalid") ||
    /(^|_)fid$/.test(k) ||
    k.startsWith("shape_") ||
    k.startsWith("shape__") ||
    k.includes("simptol") ||
    k.includes("simpgnflag") ||
    k.includes("inpoly") ||
    k === "se_anno_cad_data"
  );
}

export function prettyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function prettyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  const raw = `${value}`.trim();
  if (raw === "") return "";
  if (/^-?[\d,]+(\.\d+)?$/.test(raw)) {
    const n = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  }
  return raw;
}

const TITLE_KEYS = [
  "zip", "zip_code", "zipcode", "name", "facility", "facilityname", "sitename", "site_name",
  "chapter", "region", "county", "city", "division", "district", "label"
];

function sectionFromGraphic(graphic: Graphic): FeatureSection | null {
  const attributes = (graphic.attributes ?? {}) as Record<string, unknown>;
  const layer = graphic.layer as LayerWithFields | undefined;
  const layerTitle = layer?.title ?? "Feature";
  const fields = layer?.fields ?? [];
  const fieldInfos = layer?.popupTemplate?.fieldInfos;

  const aliasFor = (name: string) =>
    fields.find((f) => f.name.toLowerCase() === name.toLowerCase())?.alias || prettyLabel(name);
  const labelFor = (name: string) => {
    const fi = fieldInfos?.find((f) => (f.fieldName ?? "").toLowerCase() === name.toLowerCase());
    return fi?.label || aliasFor(name);
  };

  const keys =
    Array.isArray(fieldInfos) && fieldInfos.length
      ? fieldInfos.filter((f) => f.visible !== false && f.fieldName).map((f) => f.fieldName as string)
      : Object.keys(attributes);

  const rows = keys
    .filter((key) => !isJunkField(key))
    .map((key) => ({ label: labelFor(key), value: prettyValue(attributes[key]) }))
    .filter((row) => row.value !== "");

  return rows.length ? { layerTitle, rows } : null;
}

function pickFeatureTitle(sections: FeatureSection[]): string {
  for (const candidate of TITLE_KEYS) {
    const needle = candidate.replace(/[\s_-]/g, "");
    for (const section of sections) {
      const hit = section.rows.find((row) => row.label.toLowerCase().replace(/[\s_-]/g, "").includes(needle));
      if (hit) return candidate.includes("zip") && /^\d/.test(hit.value) ? `ZIP ${hit.value}` : hit.value;
    }
  }
  return sections[0]?.layerTitle ?? "Selected area";
}

/** Merge every layer hit under a click into one card (one section per layer). */
export function buildFeatureInfo(graphics: Graphic[]): FeatureInfo | null {
  const seen = new Set<string>();
  const sections: FeatureSection[] = [];
  for (const graphic of graphics) {
    const layerTitle = (graphic.layer as LayerWithFields | undefined)?.title ?? "";
    if (seen.has(layerTitle)) continue;
    seen.add(layerTitle);
    const section = sectionFromGraphic(graphic);
    if (section) sections.push(section);
  }
  return sections.length ? { title: pickFeatureTitle(sections), sections } : null;
}
