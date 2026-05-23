import "../legacy/legacy-maps.css";
import { ArrowRight, Database, Hospital, LayoutDashboard, Map, RadioTower, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import StoryShell from "../components/StoryShell";
import { arcJurisdictionDashboardSource } from "../config/arcgisLayers";
import { useRedCrossArcGISAuth } from "../hooks/useRedCrossArcGISAuth";

const sections = [
  { id: "arc-jurisdiction-dashboard", label: "FY25 Dashboard", detail: "jurisdiction map" },
  { id: "biomed-presenter-map", label: "Presenter Map", detail: "donor-facing BioMed map" },
  { id: "biomed-ops-workbench", label: "Ops Workbench", detail: "internal layer controls" },
  { id: "biomed-layer-explorer", label: "Layer Explorer", detail: "raw source inventory" },
  { id: "hospital-network-map", label: "Hospital Network", detail: "portfolio reach map" },
  { id: "map-app-v1", label: "Map App V1", detail: "synthetic comparison tool" },
  { id: "map-app-v2", label: "Map App V2", detail: "live BioMed atlas" }
];

const mapSlides = [
  {
    id: "arc-jurisdiction-dashboard",
    number: "01",
    icon: LayoutDashboard,
    title: arcJurisdictionDashboardSource.title,
    status: "Authoritative dashboard",
    href: arcJurisdictionDashboardSource.dashboardUrl,
    action: "Open Dashboard",
    embedUrl: arcJurisdictionDashboardSource.dashboardUrl,
    previewAlt: "Embedded FY25 ARC jurisdiction dashboard",
    summary:
      "This is the strongest immediate presentation asset: a signed-in ArcGIS Dashboard covering FY25 Biomed jurisdictions, fixed sites, collection operations, products collected, and national rollups.",
    bullets: [
      "Embed this slide directly when you need the real jurisdiction view without rebuilding every layer first.",
      "Use it as the source of truth while the master map is consolidated from separate Biomed layers.",
      "The dashboard item is private to the Red Cross organization, so it may ask for ArcGIS sign-in inside the frame."
    ]
  },
  {
    id: "biomed-presenter-map",
    number: "02",
    icon: Sparkles,
    title: "BioMed Presenter Map",
    status: "Donor presentation map",
    href: "/map-v3",
    action: "Open Presenter Map",
    preview: "/map-previews/map-app-v3.svg",
    previewAlt: "Preview of the clean BioMed presenter map with a right-side insight panel",
    summary:
      "This is the clean donor-facing ArcGIS SDK build: the FY25 jurisdiction web map as the base, curated story modes, no ArcGIS popups, and one right-side presenter insight panel.",
    bullets: [
      "Use it as the primary map in the slide deck when the audience needs the story, not a raw layer manager.",
      "Best pieces to keep: story modes, hideable and resizable side-panel insight, and compact legend/focus/source controls.",
      "The first version reads private ArcGIS layers after sign-in and does not write changes back to ArcGIS Online."
    ]
  },
  {
    id: "biomed-ops-workbench",
    number: "03",
    icon: SlidersHorizontal,
    title: "BioMed Ops Workbench",
    status: "Internal layer controls",
    href: "/ops",
    action: "Open Ops Workbench",
    preview: "/map-previews/map-app-v3.svg",
    previewAlt: "Preview of the BioMed operations workbench with layer controls and count panels",
    summary:
      "This route keeps the heavy controls out of the presenter map: layer toggles, counts, visibility presets, focus bookmarks, and source warnings all live here.",
    bullets: [
      "Use it before a presentation to decide which layers support the story and where the source map needs cleanup.",
      "It is intentionally denser than the presenter map because it is an internal preparation tool.",
      "The workbench reads ArcGIS data only; it does not publish or edit AGOL items."
    ]
  },
  {
    id: "biomed-layer-explorer",
    number: "04",
    icon: Database,
    title: "BioMed Layer Explorer",
    status: "Raw source inventory",
    href: "/layers",
    action: "Open Layer Explorer",
    preview: "/map-previews/map-app-v3.svg",
    previewAlt: "Preview of the BioMed layer explorer with raw source inventory and attributes",
    summary:
      "This is the analyst-only source inspection route: raw layer inventory, field lists, feature-count checks, selected-feature attributes, and source links.",
    bullets: [
      "Use it to understand what is actually in the FY25 web map before deciding what belongs in donor-facing views.",
      "Raw fields stay here so the presenter map can remain concise and safe.",
      "No synthetic records are presented as real data."
    ]
  },
  {
    id: "hospital-network-map",
    number: "05",
    icon: Hospital,
    title: "Hospital Network Map",
    status: "In progress",
    href: "/dashboard",
    action: "Open Hospital Network",
    preview: "/map-previews/hospital-network.svg",
    previewAlt: "Preview of the hospital network map with service footprints and source sidebars",
    summary:
      "This map shows how hospitals, distribution sites, portfolio footprints, service tiers, and best-location candidates relate across the network.",
    bullets: [
      "Use it to review portfolio reach by region and see where distribution anchors support hospital demand.",
      "The selected-feature panel explains the source layer, market, tier, and reliability context for the point or footprint in view.",
      "Best pieces to keep: live layer querying, hospital-tier storytelling, and the right-side source detail panel."
    ]
  },
  {
    id: "map-app-v1",
    number: "06",
    icon: Map,
    title: "Map App V1",
    status: "Comparison build",
    href: "/map-tool",
    action: "Open Map App V1",
    preview: "/map-previews/map-app-v1.svg",
    previewAlt: "Preview of the fixed and mobile site search map with dark docked sidebars",
    summary:
      "This map tests the working search experience for fixed sites and mobile collection markets, with a simple left filter panel and a right detail panel.",
    bullets: [
      "Use it to compare how a non-GIS user searches by geography, narrows the map, and understands a selected site or market.",
      "The current shell is now pointed toward the real BioMed web map instead of the old synthetic site list.",
      "Best pieces to keep: docked sidebars, clear search language, and the fast comparison layout."
    ]
  },
  {
    id: "map-app-v2",
    number: "07",
    icon: RadioTower,
    title: "Map App V2",
    status: "Live ArcGIS build",
    href: "/map",
    action: "Open Map App V2",
    preview: "/map-previews/map-app-v2.svg",
    previewAlt: "Preview of the live BioMed atlas with docked controls and ArcGIS layer detail",
    summary:
      "This map loads the private BioMed ArcGIS web map and gives signed-in users one place to inspect live layers, search locations, and understand source context.",
    bullets: [
      "Use it when the priority is real data: layer list, legend, place search, OAuth sign-in, and source-map transparency.",
      "It should become the base for the consolidated production map once the layer names and popups are cleaned up.",
      "Best pieces to add from the others: V1's simpler search wording and the hospital map's selected-feature storytelling."
    ]
  }
];

export default function MapsPage() {
  const { status, userId, error, isAuthenticated, signIn } = useRedCrossArcGISAuth();
  const authLabel =
    status === "checking"
      ? "Checking ArcGIS"
      : status === "signing-in"
        ? "Signing in..."
        : isAuthenticated
          ? `Signed in${userId ? ` as ${userId}` : ""}`
          : "Sign in once for all maps";

  return (
    <StoryShell
      title="Maps"
      summary="The map builds are grouped here while they are still in progress. The five main story themes stay clean, and each map gets its own slide for review."
      sections={sections}
      aside={<Map aria-hidden="true" className="hero-icon" />}
      chapterNumber="06"
      mapLabel="In-progress map workspace"
      coverImage="/theme-covers/hospital-distribution.png"
      coverAlt="Editorial medical logistics image representing in-progress map tools"
      returnPath="/maps"
      returnLabel="Maps"
      returnAriaLabel="Return to map menu"
    >
      {mapSlides.map((slide) => {
        const Icon = slide.icon;
        return (
          <section className="chapter-field field-white two-column maps-progress-slide" id={slide.id} key={slide.id}>
            <div className="chapter-wrap">
              <span className="chapter-num">{slide.number}</span>
              <p className="section-label">
                <Icon aria-hidden="true" size={15} />
                {slide.status}
              </p>
              <h2>{slide.title}</h2>
              <p className="maps-purpose-label">What this map does</p>
              <p className="chapter-copy">{slide.summary}</p>
              <ul className="beat-list compact">
                {slide.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="maps-auth-inline" data-authenticated={isAuthenticated ? "true" : "false"}>
                <ShieldCheck aria-hidden="true" size={17} />
                <span>{authLabel}</span>
                {!isAuthenticated && (
                  <button type="button" onClick={() => void signIn()} disabled={status === "checking" || status === "signing-in"}>
                    Sign in
                  </button>
                )}
              </div>
              {error && <p className="maps-auth-error">{error}</p>}
              {"embedUrl" in slide ? (
                <a href={slide.href} className="spatial-primary-action maps-progress-action" target="_blank" rel="noreferrer">
                  {slide.action}
                  <ArrowRight aria-hidden="true" size={17} />
                </a>
              ) : (
                <Link to={slide.href} className="spatial-primary-action maps-progress-action">
                  {slide.action}
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              )}
            </div>
            <div
              className={`chapter-media maps-progress-panel ${"embedUrl" in slide ? "maps-dashboard-panel" : ""}`}
              aria-label={`${slide.title} preview`}
            >
              {"embedUrl" in slide ? (
                <iframe
                  title={slide.title}
                  src={slide.embedUrl}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <img src={slide.preview} alt={slide.previewAlt} />
              )}
              <div className="maps-preview-caption">
                <span>{slide.number}</span>
                <strong>{slide.title}</strong>
                <p>{slide.status}</p>
              </div>
            </div>
          </section>
        );
      })}
    </StoryShell>
  );
}
