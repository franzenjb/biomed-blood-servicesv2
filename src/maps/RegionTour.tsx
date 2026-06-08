import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { REGION_BY_NAME, type RegionSummary } from "../data/regionSummaries";
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

function HBarChart({ items }: { items: { name: string; donors: number }[] }) {
  const max = Math.max(1, ...items.map((s) => s.donors));
  return (
    <div className="rt-hbars">
      {items.map((s) => (
        <div className="rt-hbar" key={s.name}>
          <span className="rt-hbar__name" title={s.name}>{s.name.replace(/ Blood Donation Center$/, "")}</span>
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

/* ----------------------------- slides ------------------------------- */
function Slide({ r, index, run }: { r: RegionSummary; index: number; run: boolean }) {
  if (index === 0) {
    return (
      <div className="rt-slide">
        <div className="rt-slabel">Slide 1 · Regional snapshot</div>
        <p className="rt-narr"><em>{r.region}.</em> {r.narrative}</p>
        <div className="rt-kpigrid">
          <Kpi value={r.totalDonors} label="CY24 donors" accent run={run} />
          <Kpi value={r.siteCount} label="Fixed donation centers" run={run} />
          <Kpi value={r.population} label="Trade-area population" run={run} />
          <Kpi value={r.avgDrive} label="Avg. donor drive distance" decimals={1} suffix=" mi" run={run} />
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

/* --------------------------- main overlay --------------------------- */
export interface RegionTourProps {
  activeRegion: string | null;
  onSelectRegion: (name: string) => void;
  onClose: () => void;
  flying?: boolean;
}

export default function RegionTour({ activeRegion, onSelectRegion, onClose, flying }: RegionTourProps) {
  const [slide, setSlide] = useState(0);
  const lastRegion = useRef<string | null>(null);
  useEffect(() => {
    if (activeRegion && activeRegion !== lastRegion.current) { setSlide(0); lastRegion.current = activeRegion; }
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

  return (
    <div className="rt-root">
      <div className="rt-topbar">
        <span className="rt-topbar__title"><MapPin size={15} /> Explore Regions — Guided Tour</span>
        <button className="rt-topbar__close" onClick={onClose} aria-label="Exit tour"><X size={16} /> Exit tour</button>
      </div>

      <aside className="rt-picker">
        <div className="rt-picker__hd">Pick a region <span>{Object.keys(REGION_BY_NAME).length}</span></div>
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
        <section className="rt-panel" key={r.region}>
          <div className="rt-panel__hd">
            <div className="rt-panel__div" style={{ color: divColor(r.division) }}>{r.division.toUpperCase()}</div>
            <h2>{r.region}{flying ? <span className="rt-flying">flying to region…</span> : null}</h2>
          </div>
          <div className="rt-panel__body">
            <Slide r={r} index={slide} run={!flying} />
          </div>
          <div className="rt-panel__nav">
            <div className="rt-dots">
              {[0, 1, 2].map((d) => (
                <button key={d} className={`rt-dot2${d === slide ? " on" : ""}`} onClick={() => setSlide(d)} aria-label={`Slide ${d + 1}`} />
              ))}
            </div>
            <div className="rt-navbtns">
              <button className="rt-nav rt-nav--ghost" disabled={slide === 0} onClick={() => setSlide((s) => Math.max(0, s - 1))}>
                <ChevronLeft size={15} /> Back
              </button>
              <button className="rt-nav rt-nav--solid" onClick={() => (slide === 2 ? onClose() : setSlide((s) => Math.min(2, s + 1)))}>
                {slide === 2 ? "Done" : "Next"} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
