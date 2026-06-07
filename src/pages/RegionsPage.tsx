import { Link } from "react-router-dom";
import { AboutTheData } from "../components/DataSourcesModal";
import "./RegionsPage.css";

/* Explore Regions — Tile 9. The local story of BioMed (spec §23–25, §29).

   Live regional drill-down (region selection, real collection KPIs, fixed-site
   trade areas) loads from the private Red Cross ArcGIS layers and is being wired
   onto this page. The national community-impact content below is real, sourced
   context — no synthetic regional numbers are shown. */

/* Real, sourced national community-impact context. Lives in Explore Regions
   because it is about community need and donor representation (spec §29). */
const sickleCards = [
  { value: "100,000", label: "Americans live with sickle cell disease today" },
  { value: "290,000+", label: "diverse donors screened for sickle cell trait since 2021" },
  { value: "1 in 13", label: "African American babies born with the sickle cell trait" },
];

const diversityNarrative = [
  {
    eyebrow: "African American donors",
    title: "Closest-Matched Blood for Sickle Cell Patients",
    body:
      "Patients with sickle cell disease often need transfusions every few weeks — and the closest antigen matches come from donors of the same heritage. Recruiting and retaining African American donors is one of the highest-leverage moves in transfusion medicine.",
  },
  {
    eyebrow: "Latino donors",
    title: "The Fastest-Growing Share of the Patient Base",
    body:
      "Latinos are the fastest-growing demographic in the U.S. and carry universal Type O at one of the highest rates of any group. They are over-represented among patients but historically under-represented among donors. Closing that gap is a generational opportunity for the supply.",
  },
  {
    eyebrow: "LGBTQ+ donors",
    title: "A Donor Pool the Rules Used to Exclude",
    body:
      "Eligibility guidance now lets many LGBTQ+ adults donate for the first time in decades. Local Red Cross teams partner with Pride networks and community organizations to reach donors who were turned away under prior rules — and turn first visits into long-term relationships.",
  },
];

export default function RegionsPage() {
  return (
    <section className="regions" data-testid="regions">
      <header className="regions__bar">
        <Link to="/hub" className="regions__back" data-testid="regions-back">
          ← Hub
        </Link>
        <span className="regions__title">Explore Regions</span>
        <AboutTheData section="sources" label="About the Data" className="regions__about" />
      </header>

      <div className="regions__scroll">
        <div className="regions__hero">
          <p className="regions__eyebrow">09 · Local Story &amp; Community Impact</p>
          <h1 className="regions__h1">Bring BioMed Home.</h1>
          <span className="regions__rule" />
          <p className="regions__lede">
            National numbers move the conversation; local stories close it. Explore Regions is where
            BioMed touches the communities you serve — donors, hospitals, fixed sites, diversity, and
            the patients on the other end.
          </p>
        </div>

        {/* Live regional drill-down (real Red Cross layers) */}
        <article className="regions__panel" data-testid="region-live">
          <p className="regions__sec-eyebrow">Live Regional Drill-Down</p>
          <h2 className="regions__h2">Region Selection &amp; Fixed-Site Trade Areas</h2>
          <p className="regions__body">
            Region selection, live collection metrics, and fixed-site trade-area polygons draw from the
            private Red Cross ArcGIS layers — Master RC Geography 2026, BioMed Collections 22-26, the
            Fixed Site Map Layer, and the Red Cell Fixed Sites Trade Area. They require a Red Cross
            ArcGIS sign-in.
          </p>
          <div className="regions__livecta">
            <Link to="/jurisdiction-dashboard" className="regions__livebtn" data-testid="region-live-link">
              Open live regional data →
            </Link>
            <span className="regions__livenote">
              Geography and population context use Red Cross Humanitarian Services geography —
              illustrative for BioMed regional discussion until BioMed regional metrics are finalized.
            </span>
          </div>
        </article>

        {/* Donor diversity & population representation */}
        <article className="regions__panel">
          <p className="regions__sec-eyebrow">Donor Diversity &amp; Population Representation</p>
          <h2 className="regions__h2">Who the Supply Serves</h2>
          <div className="regions__cards">
            {diversityNarrative.map((c) => (
              <div className="regions__card" key={c.eyebrow}>
                <p className="regions__card-eyebrow">{c.eyebrow}</p>
                <h3 className="regions__card-title">{c.title}</h3>
                <p className="regions__card-body">{c.body}</p>
              </div>
            ))}
          </div>
        </article>

        {/* Sickle cell & community impact */}
        <article className="regions__panel">
          <p className="regions__sec-eyebrow">Sickle Cell &amp; Community Impact</p>
          <h2 className="regions__h2">Representation Is Medicine</h2>
          <p className="regions__body">
            Broadening the donor base isn't optics — it's medicine. The closest-matched blood is what
            keeps sickle cell patients alive, and that match comes from donors who share their heritage.
            Explore Regions is where that need connects to a place and its people.
          </p>
          <div className="regions__stats">
            {sickleCards.map((s) => (
              <div className="regions__stat" key={s.label}>
                <span className="regions__stat-value">{s.value}</span>
                <span className="regions__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </article>

        <p className="regions__foot">
          Explore Regions is the local home for community impact, diversity, sickle cell, and fixed-site
          trade areas. Live region selection and trade-area polygons are wired to the real Red Cross
          ArcGIS layers — see About the Data for sources and status.
        </p>
      </div>
    </section>
  );
}
