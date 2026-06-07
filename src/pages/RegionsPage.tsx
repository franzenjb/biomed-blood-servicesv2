import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AboutTheData } from "../components/DataSourcesModal";
import { regions, fixedSites, mobileMarkets, type FixedSite } from "../data/mockData";
import "./RegionsPage.css";

/* Explore Regions — Tile 9. The local story of BioMed: pick a region, read its
   footprint, drill into a fixed site's trade area, and connect community impact,
   diversity, and sickle cell to that place. (Spec §23–25, §29.)

   Region/fixed-site numbers here are illustrative sample data pending Troy's
   live regional metrics — surfaced through the "About the Data" modal, never
   presented as confirmed fact. */

const fmt = (n: number) => n.toLocaleString("en-US");

/* National community-impact context. Lives in Explore Regions because it is
   about community need and donor representation, not collection operations. */
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
  const [regionId, setRegionId] = useState(regions[0].id);
  const [siteId, setSiteId] = useState<string | null>(null);

  const region = useMemo(() => regions.find((r) => r.id === regionId) ?? regions[0], [regionId]);
  const regionSites = useMemo(() => fixedSites.filter((s) => s.regionId === region.id), [region.id]);
  const regionMobile = useMemo(() => mobileMarkets.filter((m) => m.regionId === region.id), [region.id]);
  const site: FixedSite | null = useMemo(
    () => regionSites.find((s) => s.id === siteId) ?? null,
    [regionSites, siteId],
  );

  const onRegionChange = (id: string) => {
    setRegionId(id);
    setSiteId(null);
  };

  const kpis = [
    { label: "Population Served", value: fmt(region.demographics.population) },
    { label: "Active Donors", value: fmt(region.activeDonors) },
    { label: "Products / Year", value: fmt(region.annualProducts) },
    { label: "Hospital Partners", value: fmt(region.hospitalPartners) },
    { label: "Fixed Sites", value: String(regionSites.length) },
    { label: "Mobile Markets", value: String(regionMobile.length) },
  ];

  const demo = [
    { label: "African American", value: `${region.demographics.africanAmericanPct}%` },
    { label: "Hispanic / Latino", value: `${region.demographics.hispanicLatinoPct}%` },
    { label: "Age 65+", value: `${region.demographics.age65PlusPct}%` },
    { label: "Median Age", value: String(region.demographics.medianAge) },
  ];

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
            National numbers move the conversation; local stories close it. Pick a region to see how
            BioMed touches the communities you serve — donors, hospitals, fixed sites, diversity, and
            the patients on the other end.
          </p>
          <p className="regions__disclaimer">
            Regional figures below are <strong>illustrative sample data</strong> pending live regional
            metrics. See <em>About the Data</em> for sources and status.
          </p>
        </div>

        {/* Region selector — the primary control */}
        <div className="regions__control" data-testid="region-selector">
          <label htmlFor="region-select">Region</label>
          <select
            id="region-select"
            value={region.id}
            onChange={(e) => onRegionChange(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <span className="regions__chapter">{region.chapter}</span>
        </div>

        {/* Regional summary */}
        <article className="regions__panel">
          <h2 className="regions__h2">{region.name}</h2>
          <p className="regions__summary">{region.summary}</p>
          <div className="regions__kpis" data-testid="region-kpis">
            {kpis.map((k) => (
              <div className="regions__kpi" key={k.label}>
                <span className="regions__kpi-value">{k.value}</span>
                <span className="regions__kpi-label">{k.label}</span>
              </div>
            ))}
          </div>
        </article>

        {/* Donor diversity & population representation */}
        <article className="regions__panel">
          <p className="regions__sec-eyebrow">Donor Diversity &amp; Population Representation</p>
          <h2 className="regions__h2">Who the Supply Serves Here</h2>
          <div className="regions__demo">
            {demo.map((d) => (
              <div className="regions__demo-card" key={d.label}>
                <span className="regions__demo-value">{d.value}</span>
                <span className="regions__demo-label">{d.label}</span>
              </div>
            ))}
          </div>
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

        {/* Fixed-site trade area drill-down */}
        <article className="regions__panel">
          <p className="regions__sec-eyebrow">Fixed-Site Trade Area</p>
          <h2 className="regions__h2">From Points to Markets</h2>
          {regionSites.length === 0 ? (
            <p className="regions__empty" data-testid="region-empty-sites">
              No fixed sites are currently shown for {region.name}. Regional collection and community
              metrics above remain available.
            </p>
          ) : (
            <>
              <p className="regions__body">
                A point tells you where a site is. A trade area tells you whom it reaches. Select a
                fixed site to see its donor-reach market.
              </p>
              <div className="regions__sites" data-testid="region-sites">
                {regionSites.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`regions__site${site?.id === s.id ? " is-active" : ""}`}
                    onClick={() => setSiteId(s.id)}
                  >
                    <span className="regions__site-name">{s.name}</span>
                    <span className="regions__site-meta">
                      {s.city}, {s.state}
                    </span>
                  </button>
                ))}
              </div>

              {site && (
                <div className="regions__market" data-testid="region-market">
                  <h3 className="regions__market-title">Fixed Site Market Reach</h3>
                  <p className="regions__market-where">
                    {site.name} · {site.county}, {site.state} · {site.chapter}
                  </p>
                  <div className="regions__market-cards">
                    <div className="regions__market-card">
                      <span className="regions__market-value">{fmt(site.annualCollections)}</span>
                      <span className="regions__market-label">Annual Collections</span>
                    </div>
                    <div className="regions__market-card">
                      <span className="regions__market-value">{site.plateletSharePct}%</span>
                      <span className="regions__market-label">Platelet Share</span>
                    </div>
                    <div className="regions__market-card">
                      <span className="regions__market-value">{site.donorRetentionPct}%</span>
                      <span className="regions__market-label">Donor Retention</span>
                    </div>
                  </div>
                  <p className="regions__market-trade">
                    <strong>Trade area —</strong> {site.tradeArea}
                  </p>
                  <p className="regions__market-narrative">{site.narrative}</p>
                  <p className="regions__market-note">
                    Trade areas shown are red-cell fixed-site reach. Live polygons and platelet areas
                    arrive with the source layer — see About the Data.
                  </p>
                </div>
              )}
            </>
          )}
        </article>

        <p className="regions__foot">
          Explore Regions is the local home for community impact, diversity, sickle cell, and fixed-site
          trade areas. Live regional metrics and trade-area polygons are pending source layers from BioMed.
        </p>
      </div>
    </section>
  );
}
