import JurisdictionDashboardPage, {
  DEFAULT_JURISDICTION_BRAND,
  type JurisdictionBrand,
} from "./JurisdictionDashboardPage";
import {
  jurisdictionDashboardSupplementalLayers,
  supplementalBiomedSourceLayer,
} from "../config/arcgisLayers";

/* Explore Regions — Tile 9 (spec §23–25, §29).

   Reuses the live jurisdiction map engine (real Red Cross ArcGIS layers: Master
   RC Geo 2026, BioMed Collections 22-26, Fixed Site Map Layer) so region
   selection, live FY collection KPIs, and fixed sites are all real — no
   synthetic data. The regional community-impact story (donor diversity, sickle
   cell) lives in the About modal. */

const communityImpact = (
  <>
    <h3>Donor diversity &amp; population representation</h3>
    <p>
      Broadening the donor base isn't optics — it's medicine. The closest-matched blood keeps sickle
      cell patients alive, and those matches come from donors who share their heritage. Recruiting
      African American, Latino, and LGBTQ+ donors is among the highest-leverage moves in transfusion
      medicine.
    </p>

    <h3>Sickle cell &amp; community impact</h3>
    <p>
      About 100,000 Americans live with sickle cell disease and often need transfusions every few
      weeks. Since 2021 the Red Cross has screened 290,000+ diverse donors for the sickle cell trait.
      Explore Regions is where that community need connects to a place and its people.
    </p>
    <p>
      Geography and population context use Red Cross Humanitarian Services geography — illustrative for
      BioMed regional discussion until BioMed-specific regional metrics are finalized.
    </p>
  </>
);

const EXPLORE_REGIONS_BRAND: JurisdictionBrand = {
  ...DEFAULT_JURISDICTION_BRAND,
  testId: "explore-regions-live",
  appTitle: "Explore Regions",
  signInHeading: "Sign in to explore regions",
  signInCopy:
    "Explore Regions reads live, private Red Cross ArcGIS layers. Sign in to select a region and load live FY collection metrics, fixed sites, and boundaries.",
  aboutTitle: "About Explore Regions",
  aboutLead:
    "The local story of BioMed: select a region to see its boundaries, fixed and mobile collection sites, hospitals, and FY collection performance — then connect that footprint to community impact.",
  calloutTitle: "Bring BioMed Home",
  calloutSub: "Region selection, live metrics, and community impact in one place.",
  aboutExtra: communityImpact,
  // Explore Regions carries Troy's Fixed Site Map Layer on top of mobile
  // collections so fixed-site reach is part of the regional drill-down.
  // (Red Cell trade-area polygon layer to be added once its AGOL item id is known.)
  supplementalLayers: [...jurisdictionDashboardSupplementalLayers, supplementalBiomedSourceLayer],
};

export default function RegionsPage() {
  return <JurisdictionDashboardPage brand={EXPLORE_REGIONS_BRAND} />;
}
