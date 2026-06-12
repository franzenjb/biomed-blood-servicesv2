import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, List, Truck, Building2, ArrowLeft } from "lucide-react";
import { REGION_BY_NAME, type RegionSummary, type RegionSite } from "../data/regionSummaries";
import "./RegionTour.css";

const DIV_COLORS: Record<string, string> = {
  "Central Atlantic": "#2f6fa3",
  "North Central": "#2e7d32",
  Northeast: "#7048b6",
  Pacific: "#0f9aa8",
  "Southeast and Caribbean": "#d4a017",
  "Southwest and Rocky Mountain": "#cc6a00",
};
const divColor = (d: string) => DIV_COLORS[d] ?? "#737373";
const fmt = (n: number) => n.toLocaleString("en-US");
const shortSite = (name: string) => name.replace(/ Blood Don(?:ation|or) Center$/, "");

/* ----------------------------- count-up ----------------------------- */
function useCountUp(target: number, run: boolean, decimals = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 950;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(target * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return decimals ? val.toFixed(decimals) : fmt(Math.round(val));
}

function Kpi({ value, label, accent, decimals, suffix, run }: {
  value: number; label: string; accent?: boolean; decimals?: number; suffix?: string; run: boolean;
}) {
  const shown = useCountUp(value, run, decimals);
  return (
    <div className={`rt-kpi${accent ? " rt-kpi--accent" : ""}`}>
      <div className="rt-kpi__v">{shown}{suffix ? <small>{suffix}</small> : null}</div>
      <div className="rt-kpi__l">{label}</div>
    </div>
  );
}

/* ----------------------------- charts ------------------------------- */
function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="rt-chartwrap">
      {/* Axis labels live OUTSIDE the svg: preserveAspectRatio="none" stretches
          svg text into illegibility, HTML text stays crisp. */}
      <svg className="rt-chart" viewBox="0 0 320 132" preserveAspectRatio="none" role="img">
        {data.map((v, i) => {
          const bw = 320 / data.length;
          const h = (v / max) * 120;
          return <rect key={i} x={i * bw + 3} y={128 - h} width={bw - 6} height={h} rx={2} fill="#ed1b2e" />;
        })}
      </svg>
      <div className="rt-chart__axis" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={i}>{labels.length <= 6 ? l : l[0]}</span>
        ))}
      </div>
    </div>
  );
}

function HBarChart({ items, highlight }: { items: { name: string; donors: number }[]; highlight?: string }) {
  const max = Math.max(1, ...items.map((s) => s.donors));
  return (
    <div className="rt-hbars">
      {items.map((s) => (
        <div className={`rt-hbar${highlight === s.name ? " rt-hbar--hl" : ""}`} key={s.name}>
          <span className="rt-hbar__name" title={s.name}>{shortSite(s.name)}</span>
          <span className="rt-hbar__track"><span className="rt-hbar__fill" style={{ width: `${(s.donors / max) * 100}%` }} /></span>
          <span className="rt-hbar__val">{fmt(s.donors)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------- overview slides -------------------------- */
function Slide({ r, index, run, onOpenStory, stats }: {
  r: RegionSummary; index: number; run: boolean; onOpenStory: (s: StoryKind) => void;
  stats?: TourMobileStats | null;
}) {
  if (index === 0) {
    return (
      <div className="rt-slide">
        <div className="rt-slabel">Slide 1 · Overall summary</div>
        <p className="rt-narr"><em>{r.region}.</em> {r.narrative}</p>
        <div className="rt-kpigrid">
          <Kpi value={r.totalDonors} label="CY24 fixed-site donors" accent run={run} />
          <Kpi value={r.siteCount} label="Fixed donation centers" run={run} />
          <Kpi value={r.population} label="Trade-area population" run={run} />
          <Kpi value={r.avgDrive} label="Avg. donor drive distance" decimals={1} suffix=" mi" run={run} />
        </div>
        <div className="rt-storybtns">
          <button type="button" className="rt-storybtn" onClick={() => onOpenStory("mobile")}>
            <Truck size={16} /><strong>Mobile Story</strong><ChevronRight size={15} />
          </button>
          <button type="button" className="rt-storybtn" onClick={() => onOpenStory("fixed")}>
            <Building2 size={16} /><strong>Fixed Site Story</strong><ChevronRight size={15} />
          </button>
        </div>
        <p className="rt-note">Donors, sites, population &amp; drive distance are live values from the trade-area layer.</p>
      </div>
    );
  }
  if (index === 1) {
    const years = stats?.years ?? null;
    return (
      <div className="rt-slide">
        <div className="rt-slabel">Slide 2 · Collection performance</div>
        {(stats?.drivesYoyPct != null || stats?.unitsYoyPct != null) && (
          <div className="rt-kpigrid">
            {stats?.unitsYoyPct != null && (
              <Kpi value={stats.unitsYoyPct} label="Units collected YoY (CY24 vs CY23)" accent decimals={1} suffix="%" run={run} />
            )}
            {stats?.drivesYoyPct != null && (
              <Kpi value={stats.drivesYoyPct} label="Blood drives YoY (CY24 vs CY23)" decimals={1} suffix="%" run={run} />
            )}
          </div>
        )}
        {years && years.length > 0 ? (
          <div className="rt-chartbox"><h4>Blood Drives by Year</h4>
            <BarChart data={years.map((y) => y.drives)} labels={years.map((y) => y.year)} />
          </div>
        ) : null}
        <div className="rt-chartbox"><h4>Donors by Top Donation Center</h4><HBarChart items={r.topSites.slice(0, years ? 5 : 7)} /></div>
        <p className="rt-note">
          {years ? "Drive, unit & donor values are live from the monthly BioMed services." : "Per-site bars use live CY24 donor counts; sign in for live drive & unit trends."}
        </p>
      </div>
    );
  }
  return (
    <div className="rt-slide">
      <div className="rt-slabel">Slide 3 · Drive mix &amp; districts</div>
      {stats?.drivesByType?.length ? (
        <div className="rt-chartbox"><h4>CY24 Blood Drives by Sponsor Type</h4>
          <HBarChart items={stats.drivesByType.slice(0, 5)} highlight={stats.drivesByType[0]?.name} />
        </div>
      ) : null}
      {stats?.topDistricts?.length ? (
        <div className="rt-chartbox"><h4>Top Biomedical Districts — CY24 Drives</h4>
          <HBarChart items={stats.topDistricts.slice(0, 4)} />
        </div>
      ) : null}
      {!stats?.drivesByType?.length && !stats?.topDistricts?.length && (
        <p className="rt-narr"><em>Live drive mix.</em> Sign in to load this region&apos;s CY24 drive mix by sponsor
          type and its top Biomedical Districts — all live from the monthly BioMed services.</p>
      )}
      <div className="rt-cta"><h4>Every donation moves the mission.</h4>
        <p>This space is reserved for the region&apos;s leadership message, call-to-action, or campaign priorities.</p></div>
      <p className="rt-note">Drive mix &amp; district counts are live monthly values.</p>
    </div>
  );
}

/* -------------------------- mobile story ---------------------------- */
export type TourMobileStats = {
  serviceRegion: string;
  drives2024: number | null;
  units2024: number | null;
  sponsors2024?: number | null;
  drivesByType?: Array<{ name: string; donors: number }> | null;
  /** Live yearly series from the monthly-reloaded region service. */
  years?: Array<{ year: string; drives: number; units: number }> | null;
  /** Units YoY %, latest complete year vs prior (e.g. CY24 vs CY23). */
  unitsYoyPct?: number | null;
  /** Drives YoY %, latest complete year vs prior. */
  drivesYoyPct?: number | null;
  /** Region's top Biomedical Districts by CY24 drives (live). */
  topDistricts?: Array<{ name: string; donors: number }> | null;
};

function MobileStorySlide({ r, index, run, stats }: {
  r: RegionSummary; index: number; run: boolean; stats?: TourMobileStats | null;
}) {
  const mobileShare = Math.round((r.mobileDonors / Math.max(1, r.mobileDonors + r.totalDonors)) * 100);
  if (index === 0) {
    return (
      <div className="rt-slide">
        <div className="rt-slabel rt-slabel--story"><Truck size={13} /> Mobile Story · 1 of 2</div>
        <p className="rt-narr"><em>Blood drives in {r.region}.</em> In CY24, mobile blood drives reached {fmt(r.mobileDonors)} donors
          across the region&apos;s {r.districtCount} district{r.districtCount === 1 ? "" : "s"} — {mobileShare}% of all donors,
          extending collection well beyond the {r.siteCount} fixed donation centers.</p>
        <div className="rt-kpigrid">
          {stats?.drives2024 != null && <Kpi value={stats.drives2024} label="CY24 blood drives" accent run={run} />}
          {stats?.units2024 != null && <Kpi value={stats.units2024} label="CY24 units collected" run={run} />}
          {stats?.sponsors2024 != null && <Kpi value={stats.sponsors2024} label="CY24 drive sponsors" run={run} />}
          <Kpi value={r.mobileDonors} label="CY24 mobile-drive donors" accent={stats?.drives2024 == null} run={run} />
          {stats?.sponsors2024 == null && <Kpi value={mobileShare} label="of all regional donors" suffix="%" run={run} />}
          {stats?.drives2024 == null && <Kpi value={r.districtCount} label="Districts" run={run} />}
          {stats?.units2024 == null && <Kpi value={r.population} label="Trade-area population" run={run} />}
        </div>
        <p className="rt-note">Map shows CY24 blood-drive locations, colored by drive type. Drive, unit, sponsor &amp; donor counts are live monthly values.</p>
      </div>
    );
  }
  return (
    <div className="rt-slide">
      <div className="rt-slabel rt-slabel--story"><Truck size={13} /> Mobile Story · 2 of 2</div>
      {stats?.drivesByType?.length ? (
        <div className="rt-chartbox"><h4>CY24 Blood Drives by Sponsor Type</h4>
          <HBarChart items={stats.drivesByType} highlight={stats.drivesByType[0]?.name} />
        </div>
      ) : (
        <div className="rt-chartbox"><h4>Mobile Drives vs Fixed Sites — CY24 Donors</h4>
          <HBarChart items={[
            { name: "Mobile blood drives", donors: r.mobileDonors },
            { name: "Fixed donation centers", donors: r.totalDonors },
          ]} highlight="Mobile blood drives" />
        </div>
      )}
      <div className="rt-impact">
        <div className="rt-impact__big">
          <div className="rt-impact__v">{mobileShare}%</div>
          <div className="rt-impact__l">of the region&apos;s donors gave at a mobile drive</div>
        </div>
      </div>
      <div className="rt-cta"><h4>Mobile drives carry the region&apos;s reach.</h4>
        <p>Narrative forthcoming from regional leadership: sponsor highlights, school &amp; employer drives, rural coverage.</p></div>
      <p className="rt-note">Map shades counties by drive activity — darker means more drives. Donor counts are live; narrative finalizes with regional leadership input.</p>
    </div>
  );
}

/* ------------------------- fixed-site story ------------------------- */
function FixedStorySlide({ r, index, run, onOpenSite }: {
  r: RegionSummary; index: number; run: boolean; onOpenSite: (name: string) => void;
}) {
  if (index === 0) {
    return (
      <div className="rt-slide">
        <div className="rt-slabel rt-slabel--story"><Building2 size={13} /> Fixed Site Story · 1 of 2</div>
        <p className="rt-narr"><em>Donation centers in {r.region}.</em> The region&apos;s {r.siteCount} fixed donation
          center{r.siteCount === 1 ? "" : "s"} welcomed {fmt(r.totalDonors)} donors in CY24. Select a center to fly the
          map to it and open its site story.</p>
        <div className="rt-chartbox rt-chartbox--sites">
          <h4>Donation Centers — Select One for Its Site Story</h4>
          <div className="rt-sites">
            {r.topSites.map((s) => (
              <button type="button" className="rt-sitebtn" key={s.name} onClick={() => onOpenSite(s.name)}>
                <span className="rt-sitebtn__name" title={s.name}>{shortSite(s.name)}</span>
                <span className="rt-sitebtn__n">{fmt(s.donors)} donors</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>
        <p className="rt-note">Per-site donor counts are live CY24 values from the trade-area layer.</p>
      </div>
    );
  }
  return (
    <div className="rt-slide">
      <div className="rt-slabel rt-slabel--story"><Building2 size={13} /> Fixed Site Story · 2 of 2</div>
      <p className="rt-narr"><em>Regional rollup.</em> Across {r.region}, fixed sites welcomed {fmt(r.totalDonors)} donors
        in CY24 — {fmt(r.rbcDonors)} giving red blood cells — with the typical donor traveling about
        {" "}{r.avgDrive.toFixed(1)} miles to give.</p>
      <div className="rt-kpigrid">
        <Kpi value={r.totalDonors} label="CY24 fixed-site donors" accent run={run} />
        <Kpi value={r.siteCount} label="Fixed donation centers" run={run} />
        <Kpi value={r.rbcDonors} label="RBC donors" run={run} />
        <Kpi value={r.avgDrive} label="Avg. donor drive distance" decimals={1} suffix=" mi" run={run} />
      </div>
      <p className="rt-note">All values on this slide are live from the trade-area layer; narrative finalizes with regional leadership input.</p>
    </div>
  );
}

/* --------------------------- site story ----------------------------- */
function SiteStory({ r, site, run }: { r: RegionSummary; site: RegionSite; run: boolean }) {
  const rank = r.topSites.findIndex((s) => s.name === site.name) + 1;
  const share = Math.round((site.donors / Math.max(1, r.totalDonors)) * 100);
  return (
    <div className="rt-slide">
      <div className="rt-slabel rt-slabel--story"><Building2 size={13} /> Site Story</div>
      <h3 className="rt-sitename">{shortSite(site.name)}</h3>
      <p className="rt-narr">{shortSite(site.name)} welcomed {fmt(site.donors)} donors in CY24 — {share}% of all
        fixed-site donors in {r.region} — ranking #{rank} of the region&apos;s {r.siteCount} donation centers.</p>
      <div className="rt-kpigrid rt-kpigrid--four">
        <Kpi value={site.donors} label="CY24 donors" accent run={run} />
        <Kpi value={site.rbc} label="RBC donors" run={run} />
        <Kpi value={share} label="Region share" suffix="%" run={run} />
        <Kpi value={rank} label={`Rank of ${r.siteCount}`} run={run} />
      </div>
      <div className="rt-chartbox"><h4>Centers in {r.region}</h4>
        <HBarChart
          items={r.topSites.slice(0, 5).some((s) => s.name === site.name)
            ? r.topSites.slice(0, 5)
            : [...r.topSites.slice(0, 4), site]}
          highlight={site.name} />
      </div>
      <p className="rt-note">Donor &amp; RBC counts are live CY24 values; site narrative finalizes with regional leadership input.</p>
    </div>
  );
}

/* --------------------------- main overlay --------------------------- */
type StoryKind = "mobile" | "fixed";
type TourView =
  | { kind: "deck"; slide: number }
  | { kind: "story"; story: StoryKind; slide: number }
  | { kind: "site"; siteName: string };

export type TourSlideContext =
  | { kind: "deck"; slide: number }
  | { kind: "story"; story: StoryKind; slide: number }
  | { kind: "site" };

export interface RegionTourProps {
  activeRegion: string | null;
  onSelectRegion: (name: string) => void;
  onSelectSite?: (siteName: string | null) => void;
  onSlideChange?: (ctx: TourSlideContext) => void;
  flying?: boolean;
  mobileStats?: TourMobileStats | null;
}

export default function RegionTour({ activeRegion, onSelectRegion, onSelectSite, onSlideChange, flying, mobileStats }: RegionTourProps) {
  const [view, setView] = useState<TourView>({ kind: "deck", slide: 0 });
  const [pickerOpen, setPickerOpen] = useState(true);
  const lastRegion = useRef<string | null>(null);
  useEffect(() => {
    if (activeRegion && activeRegion !== lastRegion.current) {
      setView({ kind: "deck", slide: 0 });
      lastRegion.current = activeRegion;
    }
  }, [activeRegion]);

  // Tell the host map when a site story opens (zoom to site) or closes (restore region).
  const activeSiteName = view.kind === "site" ? view.siteName : null;
  const lastSite = useRef<string | null>(null);
  useEffect(() => {
    if (activeSiteName !== lastSite.current) {
      lastSite.current = activeSiteName;
      onSelectSite?.(activeSiteName);
    }
  }, [activeSiteName, onSelectSite]);

  // Tell the host which slide is showing so it can swap map layers per story page
  // (drive dots for the Mobile Story, county choropleths for performance views).
  useEffect(() => {
    if (!activeRegion) return;
    onSlideChange?.(
      view.kind === "deck"
        ? { kind: "deck", slide: view.slide }
        : view.kind === "story"
          ? { kind: "story", story: view.story, slide: view.slide }
          : { kind: "site" },
    );
  }, [view, activeRegion, onSlideChange]);

  const groups = useMemo(() => {
    const byDiv = new Map<string, RegionSummary[]>();
    Object.values(REGION_BY_NAME).forEach((r) => {
      const list = byDiv.get(r.division) ?? []; list.push(r); byDiv.set(r.division, list);
    });
    return [...byDiv.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([div, regs]) => ({ div, regs: regs.sort((a, b) => a.region.localeCompare(b.region)) }));
  }, []);

  const r = activeRegion ? REGION_BY_NAME[activeRegion] : null;
  const site = r && view.kind === "site" ? r.topSites.find((s) => s.name === view.siteName) ?? null : null;

  const openStory = (story: StoryKind) => setView({ kind: "story", story, slide: 0 });
  const backToSummary = () => setView({ kind: "deck", slide: 0 });

  /* nav state per view */
  const dotCount = view.kind === "deck" ? 3 : view.kind === "story" ? 2 : 0;
  const dotIndex = view.kind === "deck" ? view.slide : view.kind === "story" ? view.slide : 0;
  const setDot = (d: number) =>
    setView(view.kind === "story" ? { ...view, slide: d } : { kind: "deck", slide: d });

  const navBack = () => {
    if (view.kind === "site") setView({ kind: "story", story: "fixed", slide: 0 });
    else if (view.kind === "story") view.slide === 0 ? backToSummary() : setView({ ...view, slide: view.slide - 1 });
    else setView({ kind: "deck", slide: Math.max(0, view.slide - 1) });
  };
  const navNext = () => {
    if (view.kind === "site") setView({ kind: "story", story: "fixed", slide: 0 });
    else if (view.kind === "story") view.slide >= 1 ? backToSummary() : setView({ ...view, slide: view.slide + 1 });
    else if (view.slide === 2) {
      // End of deck returns to the region picker — never exits the tour/app.
      setView({ kind: "deck", slide: 0 });
      setPickerOpen(true);
    } else setView({ kind: "deck", slide: Math.min(2, view.slide + 1) });
  };
  const nextLabel = view.kind === "site" ? "Back to centers"
    : view.kind === "story" ? (view.slide >= 1 ? "Overall summary" : "Next")
    : view.slide === 2 ? "Pick another region" : "Next";

  const viewKey = view.kind === "deck" ? "deck" : view.kind === "story" ? `story-${view.story}` : `site`;

  return (
    <div className="rt-root">
      <div className="rt-topbar">
        <span className="rt-topbar__title"><MapPin size={15} /> Regional Story Explorer — Guided Tour</span>
      </div>

      {!pickerOpen && (
        <button type="button" className="rt-picker-pill" title="Show region list" onClick={() => setPickerOpen(true)}>
          <List size={15} /> Regions <ChevronRight size={14} />
        </button>
      )}

      <aside className="rt-picker" data-collapsed={pickerOpen ? "false" : "true"}>
        <div className="rt-picker__hd">
          <span className="rt-picker__hd-label">Pick a region <span>{Object.keys(REGION_BY_NAME).length}</span></span>
          <button type="button" className="rt-picker__hide" title="Hide region list" aria-label="Hide region list" onClick={() => setPickerOpen(false)}>
            <ChevronLeft size={14} /> Hide
          </button>
        </div>
        <div className="rt-picker__list">
          {groups.map(({ div, regs }) => (
            <div key={div}>
              <div className="rt-divname"><span className="rt-dot" style={{ background: divColor(div) }} />{div}</div>
              {regs.map((reg) => (
                <button key={reg.region}
                  className={`rt-regbtn${activeRegion === reg.region ? " rt-regbtn--on" : ""}`}
                  onClick={() => onSelectRegion(reg.region)}>
                  <span>{reg.region}</span><span className="rt-regbtn__n">{reg.siteCount} sites</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {r && (
        <section className="rt-panel" key={`${r.region}:${viewKey}`}>
          <div className="rt-panel__hd">
            <div className="rt-panel__div" style={{ color: divColor(r.division) }}>{r.division.toUpperCase()}</div>
            <h2>{r.region}{flying ? <span className="rt-flying">flying to region…</span> : null}</h2>
            {view.kind !== "deck" && (
              <button type="button" className="rt-backlink"
                onClick={view.kind === "site" ? () => setView({ kind: "story", story: "fixed", slide: 0 }) : backToSummary}>
                <ArrowLeft size={13} /> {view.kind === "site" ? "Back to centers" : "Back to overall summary"}
              </button>
            )}
          </div>
          <div className="rt-panel__body">
            {view.kind === "deck" && <Slide r={r} index={view.slide} run={!flying} onOpenStory={openStory} stats={mobileStats} />}
            {view.kind === "story" && view.story === "mobile" && <MobileStorySlide r={r} index={view.slide} run={!flying} stats={mobileStats} />}
            {view.kind === "story" && view.story === "fixed" && (
              <FixedStorySlide r={r} index={view.slide} run={!flying}
                onOpenSite={(siteName) => setView({ kind: "site", siteName })} />
            )}
            {view.kind === "site" && site && <SiteStory r={r} site={site} run={!flying} />}
          </div>
          <div className="rt-panel__nav">
            <div className="rt-dots">
              {Array.from({ length: dotCount }, (_, d) => (
                <button key={d} className={`rt-dot2${d === dotIndex ? " on" : ""}`} onClick={() => setDot(d)} aria-label={`Slide ${d + 1}`} />
              ))}
            </div>
            <div className="rt-navbtns">
              <button className="rt-nav rt-nav--ghost" disabled={view.kind === "deck" && view.slide === 0} onClick={navBack}>
                <ChevronLeft size={15} /> Back
              </button>
              <button className="rt-nav rt-nav--solid" onClick={navNext}>
                {nextLabel} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
