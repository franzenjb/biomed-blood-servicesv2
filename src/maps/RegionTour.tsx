import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, MapPin, List, Truck, Building2, ArrowLeft } from "lucide-react";
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
    <svg className="rt-chart" viewBox="0 0 320 150" preserveAspectRatio="none" role="img">
      {data.map((v, i) => {
        const bw = 320 / data.length;
        const h = (v / max) * 120;
        return <rect key={i} x={i * bw + 3} y={130 - h} width={bw - 6} height={h} rx={2} fill="#ed1b2e" />;
      })}
      {labels.map((l, i) => {
        const bw = 320 / labels.length;
        return <text key={i} x={i * bw + bw / 2} y={146} textAnchor="middle" className="rt-chart__lbl">{l[0]}</text>;
      })}
    </svg>
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

function Donut({ mix }: { mix: { label: string; value: number }[] }) {
  const palette = ["#ed1b2e", "#1a1a1a", "#d4a017", "#2f6fa3"];
  const total = Math.max(1, mix.reduce((s, m) => s + m.value, 0));
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="rt-donut-wrap">
      <svg className="rt-donut" viewBox="0 0 140 140" role="img">
        <g transform="translate(70,70) rotate(-90)">
          {mix.map((m, i) => {
            const frac = m.value / total;
            const dash = `${frac * C} ${C}`;
            const seg = (
              <circle key={i} r={R} fill="none" stroke={palette[i % palette.length]} strokeWidth={20}
                strokeDasharray={dash} strokeDashoffset={-offset} />
            );
            offset += frac * C;
            return seg;
          })}
        </g>
      </svg>
      <ul className="rt-legend">
        {mix.map((m, i) => (
          <li key={m.label}><span style={{ background: palette[i % palette.length] }} />{m.label} · {m.value}%</li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------- overview slides -------------------------- */
function Slide({ r, index, run, onOpenStory }: {
  r: RegionSummary; index: number; run: boolean; onOpenStory: (s: StoryKind) => void;
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
    return (
      <div className="rt-slide">
        <div className="rt-slabel">Slide 2 · Collection performance</div>
        <div className="rt-kpigrid">
          <Kpi value={r.kpi.goalPct} label="of CY24 collection goal" accent suffix="%" run={run} />
          <Kpi value={r.kpi.growth} label="New-donor growth YoY" decimals={1} suffix="%" run={run} />
        </div>
        <div className="rt-chartbox"><h4>Monthly donors — CY24</h4><BarChart data={r.monthly.data} labels={r.monthly.labels} /></div>
        <div className="rt-chartbox"><h4>Donors by top donation center</h4><HBarChart items={r.topSites.slice(0, 7)} /></div>
        <p className="rt-note">Monthly curve &amp; growth are placeholders; per-site bars use live CY24 donor counts.</p>
      </div>
    );
  }
  return (
    <div className="rt-slide">
      <div className="rt-slabel">Slide 3 · Donor mix &amp; impact</div>
      <div className="rt-chartbox"><h4>Donor mix</h4><Donut mix={r.donorMix} /></div>
      <div className="rt-impact">
        <div className="rt-impact__big">
          <div className="rt-impact__v">{fmt(r.kpi.unitsToHospitals)}</div>
          <div className="rt-impact__l">units delivered to hospitals (placeholder)</div>
        </div>
        <div className="rt-impact__big rt-impact__big--dark">
          <div className="rt-impact__v">{r.kpi.satisfaction}</div>
          <div className="rt-impact__l">donor satisfaction score (placeholder)</div>
        </div>
      </div>
      <div className="rt-cta"><h4>Every donation moves the mission.</h4>
        <p>Swap this panel for the region&apos;s real call-to-action, leadership note, or campaign metrics.</p></div>
    </div>
  );
}

/* -------------------------- mobile story ---------------------------- */
function MobileStorySlide({ r, index, run }: { r: RegionSummary; index: number; run: boolean }) {
  const mobileShare = Math.round((r.mobileDonors / Math.max(1, r.mobileDonors + r.totalDonors)) * 100);
  if (index === 0) {
    return (
      <div className="rt-slide">
        <div className="rt-slabel rt-slabel--story"><Truck size={13} /> Mobile Story · 1 of 2</div>
        <p className="rt-narr"><em>Blood drives in {r.region}.</em> In CY24, mobile blood drives reached {fmt(r.mobileDonors)} donors
          across the region&apos;s {r.districtCount} district{r.districtCount === 1 ? "" : "s"} — {mobileShare}% of all donors,
          extending collection well beyond the {r.siteCount} fixed donation centers.</p>
        <div className="rt-kpigrid">
          <Kpi value={r.mobileDonors} label="CY24 mobile-drive donors" accent run={run} />
          <Kpi value={mobileShare} label="of all regional donors" suffix="%" run={run} />
          <Kpi value={r.districtCount} label="Districts" run={run} />
          <Kpi value={r.population} label="Trade-area population" run={run} />
        </div>
        <p className="rt-note">Mobile donor count is a live value; narrative is a draft pending client story content.</p>
      </div>
    );
  }
  return (
    <div className="rt-slide">
      <div className="rt-slabel rt-slabel--story"><Truck size={13} /> Mobile Story · 2 of 2</div>
      <div className="rt-chartbox"><h4>Mobile drives vs fixed sites — CY24 donors</h4>
        <HBarChart items={[
          { name: "Mobile blood drives", donors: r.mobileDonors },
          { name: "Fixed donation centers", donors: r.totalDonors },
        ]} highlight="Mobile blood drives" />
      </div>
      <div className="rt-impact">
        <div className="rt-impact__big">
          <div className="rt-impact__v">{mobileShare}%</div>
          <div className="rt-impact__l">of the region&apos;s donors gave at a mobile drive</div>
        </div>
      </div>
      <div className="rt-cta"><h4>Mobile drives carry the region&apos;s reach.</h4>
        <p>Draft panel — swap in the region&apos;s mobile-program narrative: sponsor highlights, school &amp; employer drives, rural coverage.</p></div>
      <p className="rt-note">Donor counts are live; story framing is a draft pending client content.</p>
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
          center{r.siteCount === 1 ? "" : "s"} welcomed {fmt(r.totalDonors)} donors in CY24 — {fmt(r.rbcDonors)} of them
          giving red blood cells — with the typical donor traveling about {r.avgDrive.toFixed(1)} miles to give.</p>
        <div className="rt-kpigrid">
          <Kpi value={r.totalDonors} label="CY24 fixed-site donors" accent run={run} />
          <Kpi value={r.siteCount} label="Fixed donation centers" run={run} />
          <Kpi value={r.rbcDonors} label="RBC donors" run={run} />
          <Kpi value={r.avgDrive} label="Avg. donor drive distance" decimals={1} suffix=" mi" run={run} />
        </div>
        <p className="rt-note">All values on this slide are live from the trade-area layer; narrative is a draft pending client story content.</p>
      </div>
    );
  }
  return (
    <div className="rt-slide">
      <div className="rt-slabel rt-slabel--story"><Building2 size={13} /> Fixed Site Story · 2 of 2</div>
      <div className="rt-chartbox rt-chartbox--sites">
        <h4>Donation centers — select one for its site story</h4>
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
      <p className="rt-note">Donor &amp; RBC counts are live CY24 values; site narrative is a draft pending client story content.</p>
    </div>
  );
}

/* --------------------------- main overlay --------------------------- */
type StoryKind = "mobile" | "fixed";
type TourView =
  | { kind: "deck"; slide: number }
  | { kind: "story"; story: StoryKind; slide: number }
  | { kind: "site"; siteName: string };

export interface RegionTourProps {
  activeRegion: string | null;
  onSelectRegion: (name: string) => void;
  onClose: () => void;
  flying?: boolean;
}

export default function RegionTour({ activeRegion, onSelectRegion, onClose, flying }: RegionTourProps) {
  const [view, setView] = useState<TourView>({ kind: "deck", slide: 0 });
  const [pickerOpen, setPickerOpen] = useState(true);
  const lastRegion = useRef<string | null>(null);
  useEffect(() => {
    if (activeRegion && activeRegion !== lastRegion.current) {
      setView({ kind: "deck", slide: 0 });
      lastRegion.current = activeRegion;
    }
  }, [activeRegion]);

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
    if (view.kind === "site") setView({ kind: "story", story: "fixed", slide: 1 });
    else if (view.kind === "story") view.slide === 0 ? backToSummary() : setView({ ...view, slide: view.slide - 1 });
    else setView({ kind: "deck", slide: Math.max(0, view.slide - 1) });
  };
  const navNext = () => {
    if (view.kind === "site") setView({ kind: "story", story: "fixed", slide: 1 });
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
        <span className="rt-topbar__title"><MapPin size={15} /> Explore Regions — Guided Tour</span>
        <button className="rt-topbar__close" onClick={onClose} aria-label="Exit tour"><X size={16} /> Exit tour</button>
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
                onClick={view.kind === "site" ? () => setView({ kind: "story", story: "fixed", slide: 1 }) : backToSummary}>
                <ArrowLeft size={13} /> {view.kind === "site" ? "Back to centers" : "Back to overall summary"}
              </button>
            )}
          </div>
          <div className="rt-panel__body">
            {view.kind === "deck" && <Slide r={r} index={view.slide} run={!flying} onOpenStory={openStory} />}
            {view.kind === "story" && view.story === "mobile" && <MobileStorySlide r={r} index={view.slide} run={!flying} />}
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
