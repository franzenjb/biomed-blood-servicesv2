import type Graphic from "@arcgis/core/Graphic";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type { ArcJurisdictionLayerCategory } from "../config/arcgisLayers";

export type MasterLayerCategory = ArcJurisdictionLayerCategory | "hospitals" | "manufacturing";

export type MasterFeatureSummary = {
  title: string;
  layerTitle: string;
  category: MasterLayerCategory;
  impact: string;
  talkingPoint: string;
  geography: Array<{ label: string; value: string }>;
  metrics: Array<{ label: string; value: string }>;
  sourceFields: Array<{ label: string; value: string }>;
  sourceFieldCount: number;
  source: string;
  rawAttributes?: Record<string, unknown>;
};

const layerCategoryRules: Array<{ category: MasterLayerCategory; patterns: string[] }> = [
  {
    category: "manufacturing",
    patterns: ["manufacturing", "warehouse", "kitting", "irl"]
  },
  {
    category: "sites",
    patterns: ["fixed site", "distribution site", "mobile staging", "site"]
  },
  {
    category: "operations",
    patterns: ["collection operations", "fy25 data", "zip", "drd", "portfolio"]
  },
  {
    category: "geography",
    patterns: ["district", "region", "division", "chapter", "county", "counties"]
  }
];

const titleFields = [
  "Division",
  "DIVISION",
  "Biomed_Division",
  "BIOMED_DIVISION",
  "Div_Name",
  "Region",
  "REGION",
  "Biomed_Region",
  "BIOMED_REGION",
  "RegionName",
  "District",
  "DISTRICT",
  "Biomed_District",
  "BIOMED_DISTRICT",
  "Chapter",
  "CHAPTER",
  "HS_Chapter",
  "ChapterName",
  "County",
  "COUNTY",
  "CountyName",
  "CNTY_NAME",
  "Name",
  "NAME",
  "SiteName",
  "SITE_NAME",
  "Site_Name",
  "Facility",
  "FACILITY",
  "FacilityName",
  "ZIP",
  "ZIP_CODE",
  "ZipCode"
];

const geographyFields = [
  ["Division", ["Division", "DIVISION", "Biomed_Division", "BIOMED_DIVISION", "Div_Name"]],
  ["Region", ["Region", "REGION", "Biomed_Region", "BIOMED_REGION", "RegionName"]],
  ["District", ["District", "DISTRICT", "Biomed_District", "BIOMED_DISTRICT"]],
  ["Chapter", ["Chapter", "CHAPTER", "HS_Chapter", "ChapterName"]],
  ["County", ["County", "COUNTY", "CountyName", "CNTY_NAME"]],
  ["ZIP", ["ZIP", "ZIP_CODE", "ZipCode", "POSTAL"]]
] as const;

const metricNameHints = [
  "collection",
  "collections",
  "drive",
  "drives",
  "unit",
  "units",
  "rbc",
  "red",
  "platelet",
  "plasma",
  "sponsor",
  "apo",
  "total"
];

const sourceFieldPriority = [
  "division",
  "region",
  "district",
  "chapter",
  "county",
  "zip",
  "name",
  "site",
  "facility",
  "city",
  "state",
  "address",
  "collection",
  "collections",
  "unit",
  "units",
  "hospital",
  "portfolio"
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ");
}

function formatFieldLabel(fieldName: string) {
  return fieldName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function isJunkAttributeField(fieldName: string) {
  const normalized = fieldName.toLowerCase();
  return (
    normalized.startsWith("objectid") ||
    normalized.includes("globalid") ||
    /(^|_)fid$/.test(normalized) ||
    normalized.startsWith("shape_") ||
    normalized.startsWith("shape__") ||
    normalized.includes("simptol") ||
    normalized.includes("simpgnflag") ||
    normalized.includes("inpoly") ||
    normalized === "se_anno_cad_data"
  );
}

function isCodeLikeField(fieldName: string) {
  return /zip|postal|fips|geoid|(^|_)id$|^id|code|phone|fax/i.test(fieldName);
}

function formatMetricValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) >= 1000 ? value.toLocaleString() : `${value}`;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed) && value.trim() !== "") {
      return Math.abs(parsed) >= 1000 ? parsed.toLocaleString() : `${parsed}`;
    }
    return value.trim();
  }
  return "";
}

function formatSourceValue(fieldName: string, value: unknown) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (isCodeLikeField(fieldName)) return `${value}`;
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  const raw = `${value}`.trim();
  if (raw === "") return "";
  if (!isCodeLikeField(fieldName) && /^-?[\d,]+(\.\d+)?$/.test(raw)) {
    const parsed = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      return Number.isInteger(parsed) ? parsed.toLocaleString() : parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  }
  return raw;
}

function sourceFieldRank(fieldName: string) {
  const normalized = normalize(fieldName);
  const index = sourceFieldPriority.findIndex((hint) => normalized.includes(hint));
  return index === -1 ? 999 : index;
}

function attributeLabel(graphic: Graphic, fieldName: string) {
  const fields = ((graphic.layer as FeatureLayer | undefined)?.fields ?? []) as FeatureLayer["fields"];
  const match = fields?.find((field) => field.name.toLowerCase() === fieldName.toLowerCase());
  return match?.alias || formatFieldLabel(fieldName);
}

function getAttribute(attributes: Record<string, unknown>, candidates: readonly string[]) {
  const entries = Object.entries(attributes);
  for (const candidate of candidates) {
    const exact = entries.find(([key]) => key.toLowerCase() === candidate.toLowerCase());
    if (exact && exact[1] != null && `${exact[1]}`.trim()) return exact[1];
  }
  for (const candidate of candidates) {
    const partial = entries.find(([key, value]) => normalize(key).includes(normalize(candidate)) && value != null);
    if (partial && `${partial[1]}`.trim()) return partial[1];
  }
  return undefined;
}

export function classifyMasterLayer(title: string): MasterLayerCategory {
  const normalized = normalize(title);
  for (const rule of layerCategoryRules) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern))) return rule.category;
  }
  return "reference";
}

export function getMasterLayerImpact(layerTitle: string, category: MasterLayerCategory) {
  if (category === "manufacturing") return "Shows where operational capacity turns donor generosity into patient-ready products.";
  if (category === "sites") return "Shows the physical access points and logistics anchors that make collection and distribution possible.";
  if (category === "operations") return "Connects FY25 collection activity to the geography and teams responsible for donor reach.";
  if (category === "geography") return "Frames the jurisdiction story so a donor audience can understand local reach without raw operational clutter.";
  if (category === "hospitals") return "Connects the BioMed network to patient care and hospital readiness.";
  return "Adds source context for the BioMed operating map.";
}

export function getMasterTalkingPoint(category: MasterLayerCategory, layerTitle: string) {
  if (category === "manufacturing") return "Manufacturing and processing capacity.";
  if (category === "sites") return "Collection access, staging, logistics, and distribution infrastructure.";
  if (category === "operations") return "Collection activity and accountable operating geography.";
  if (category === "geography") return "BioMed scale, stewardship, and local ownership.";
  if (category === "hospitals") return "Hospital and patient-care readiness context.";
  return `${layerTitle} source context.`;
}

export function summarizeMasterFeature(graphic: Graphic, layerTitle?: string, includeRawAttributes = false): MasterFeatureSummary {
  const attributes = (graphic.attributes ?? {}) as Record<string, unknown>;
  const graphicWithSource = graphic as Graphic & { sourceLayer?: Layer };
  const resolvedLayerTitle =
    layerTitle ||
    ((graphic.layer as Layer | undefined)?.title ?? graphicWithSource.sourceLayer?.title) ||
    "BioMed source layer";
  const category = classifyMasterLayer(resolvedLayerTitle);
  const titleValue = getAttribute(attributes, titleFields);
  const title = titleValue ? `${titleValue}` : resolvedLayerTitle;

  const geography: Array<{ label: string; value: string }> = [];
  geographyFields.forEach(([label, candidates]) => {
    const value = getAttribute(attributes, candidates);
    if (value && geography.length < 5) {
      geography.push({ label, value: `${value}` });
    }
  });

  const metrics = Object.entries(attributes)
    .filter(([key, value]) => {
      if (value == null || value === "") return false;
      if (typeof value !== "number" && Number.isNaN(Number(`${value}`.replace(/,/g, "")))) return false;
      const normalizedKey = normalize(key);
      return metricNameHints.some((hint) => normalizedKey.includes(hint));
    })
    .slice(0, 3)
    .map(([key, value]) => ({
      label: formatFieldLabel(key),
      value: formatMetricValue(value)
    }))
    .filter((item) => item.value);

  const sourceFieldEntries = Object.entries(attributes)
    .map(([key, value], index) => ({
      key,
      label: attributeLabel(graphic, key),
      value: formatSourceValue(key, value),
      rank: sourceFieldRank(`${key} ${attributeLabel(graphic, key)}`),
      index
    }))
    .filter((item) => item.value !== "" && !isJunkAttributeField(item.key))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const sourceFields = sourceFieldEntries.slice(0, 12).map((item) => ({
    label: item.label,
    value: item.value
  }));

  return {
    title,
    layerTitle: resolvedLayerTitle,
    category,
    impact: getMasterLayerImpact(resolvedLayerTitle, category),
    talkingPoint: getMasterTalkingPoint(category, resolvedLayerTitle),
    geography,
    metrics,
    sourceFields,
    sourceFieldCount: sourceFieldEntries.length,
    source: resolvedLayerTitle,
    rawAttributes: includeRawAttributes ? attributes : undefined
  };
}

export function isQueryableFeatureLayer(layer: Layer): layer is FeatureLayer {
  return typeof (layer as FeatureLayer).queryFeatureCount === "function";
}
