import { useEffect, useState, type ReactElement } from "react";
import type { Section, Slide as SlideData, SlideBlock, Stat } from "../data/sections";

type Props = {
  section: Section;
  slide: SlideData;
  active: boolean;
};

/* numeric helpers ------------------------------------------------------ */

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** First number found in a string, sign-aware (handles − and -). */
const parseNum = (raw: string) => {
  const m = raw.replace(/−/g, "-").match(/-?[\d,]+(?:\.\d+)?/);
  return m ? parseFloat(m[0].replace(/,/g, "")) : NaN;
};

function CountValue({ raw, active }: { raw: string; active: boolean }) {
  const match = raw.match(/^([~<+\-−$]?)([\d,]+(?:\.\d+)?)([%+]?)$/);
  const hasMatch = !!match;
  const prefix = match ? match[1] : "";
  const suffix = match ? match[3] : "";
  const decimals = match ? (match[2].split(".")[1] || "").length : 0;
  const target = match ? parseFloat(match[2].replace(/,/g, "")) : 0;
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!active || !hasMatch) {
      setValue(target);
      return;
    }
    let raf = 0;
    setValue(0);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setValue(target * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, hasMatch]);
  if (!hasMatch) return <>{raw}</>;
  return (
    <>
      {prefix}
      {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

/* Atmospheric motif (quote/statement accent) -------------------------- */

const MOTIFS: Record<string, ReactElement> = {
  rings: (
    <>
      <circle cx="300" cy="200" r="150" />
      <circle cx="300" cy="200" r="104" />
      <circle cx="300" cy="200" r="58" />
    </>
  ),
  drop: <path d="M300 70 C360 160 392 210 392 252 a92 92 0 1 1 -184 0 C208 210 240 160 300 70 Z" />,
  pulse: <polyline points="20,210 150,210 185,120 225,300 265,180 300,210 440,210" />,
};
const MK = Object.keys(MOTIFS);
function ArtMotif({ id }: { id: string }) {
  const k = MK[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % MK.length];
  return (
    <svg className="slide__art" viewBox="0 0 460 400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {MOTIFS[k]}
    </svg>
  );
}

/* === Infographic kit ================================================== */

/** Clean big-number triad (mixed units — no bars). */
function StatCards({ items, active }: { items: Stat[]; active: boolean }) {
  return (
    <div className="info-stats" data-count={items.length}>
      {items.map((s, i) => (
        <div className={`info-card ${s.accent ? "is-accent" : ""}`} key={i} style={{ animationDelay: `${i * 110}ms` }}>
          <div className="info-card__value mono">{s.accent ? <CountValue raw={s.value} active={active} /> : s.value}</div>
          <div className="info-card__label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Numbered editorial list. */
function StepCards({ items }: { items: { title: string; detail: string }[] }) {
  return (
    <ol className="info-steps">
      {items.map((it, i) => (
        <li className="step" key={i} style={{ animationDelay: `${i * 90}ms` }}>
          <span className="step__num mono">{i + 1}</span>
          <div className="step__body">
            <span className="step__title">{it.title}</span>
            <span className="step__detail">{it.detail}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Two-panel split (e.g. Fixed sites | Mobile drives). */
function SplitPanels({ items }: { items: { title: string; detail: string }[] }) {
  return (
    <div className="viz-split">
      {items.map((it, i) => (
        <div className="splitp" key={i} style={{ animationDelay: `${i * 120}ms` }}>
          <span className="splitp__rule" />
          <span className="splitp__title">{it.title}</span>
          <span className="splitp__detail">{it.detail}</span>
        </div>
      ))}
    </div>
  );
}

/** Same-unit horizontal magnitude compare (real proportion). */
function Magnitude({ items, active }: { items: Stat[]; active: boolean }) {
  const nums = items.map((i) => parseNum(i.value));
  const max = Math.max(0, ...nums.filter((n) => !Number.isNaN(n)));
  return (
    <div className="viz-magnitude">
      {items.map((s, i) => {
        const n = nums[i];
        const pct = max > 0 && !Number.isNaN(n) ? Math.max(8, (n / max) * 100) : 100;
        return (
          <div className={`mag ${s.accent ? "is-accent" : ""}`} key={i} style={{ animationDelay: `${i * 110}ms` }}>
            <span className="mag__val mono">{s.accent ? <CountValue raw={s.value} active={active} /> : s.value}</span>
            <div className="mag__bar">
              <span style={{ width: `${pct}%`, animationDelay: `${i * 110 + 150}ms` }} />
            </div>
            <span className="mag__label">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Radial dial for a true percentage. */
function Dial({ value, active }: { value: string; active: boolean }) {
  const n = parseNum(value);
  const isPct = /%/.test(value) && !Number.isNaN(n);
  const pct = isPct ? Math.max(0, Math.min(100, n)) : 0;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    if (!active) {
      setDraw(false);
      return;
    }
    const t = requestAnimationFrame(() => setDraw(true));
    return () => cancelAnimationFrame(t);
  }, [active]);
  const offset = isPct && draw ? circ * (1 - pct / 100) : circ;
  return (
    <div className="dial">
      <svg viewBox="0 0 128 128" className="dial__svg" aria-hidden="true">
        <circle className="dial__track" cx="64" cy="64" r={r} />
        {isPct && (
          <circle
            className="dial__fill"
            cx="64"
            cy="64"
            r={r}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
          />
        )}
      </svg>
      <span className="dial__val mono">
        <CountValue raw={value} active={active} />
      </span>
    </div>
  );
}

/** Proportion row — dials for %, big number otherwise. */
function Proportion({ items, active }: { items: Stat[]; active: boolean }) {
  return (
    <div className="viz-proportion" data-count={items.length}>
      {items.map((s, i) => (
        <div className={`prop ${s.accent ? "is-accent" : ""}`} key={i} style={{ animationDelay: `${i * 120}ms` }}>
          <Dial value={s.value} active={active} />
          <span className="prop__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Diverging up/down compare — the widening gap. */
function Gap({ items, active }: { items: { value: string; label: string; dir: "up" | "down" }[]; active: boolean }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(parseNum(i.value)) || 0));
  return (
    <div className="viz-gap">
      {items.map((it, i) => {
        const w = Math.max(10, (Math.abs(parseNum(it.value)) / max) * 100);
        return (
          <div className={`gaprow gaprow--${it.dir}`} key={i} style={{ animationDelay: `${i * 130}ms` }}>
            <span className="gaprow__arrow" aria-hidden="true">{it.dir === "up" ? "▲" : "▼"}</span>
            <span className="gaprow__val mono">
              <CountValue raw={it.value} active={active} />
            </span>
            <div className="gaprow__bar">
              <span style={{ width: `${w}%`, animationDelay: `${i * 130 + 120}ms` }} />
            </div>
            <span className="gaprow__label">{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** a → b transformation. */
function Ratio({ from, to, label, note, active }: { from: string; to: string; label: string; note?: string; active: boolean }) {
  const dots = (raw: string, cls: string) => {
    const n = parseNum(raw);
    const count = Number.isNaN(n) ? 1 : Math.max(1, Math.min(6, Math.round(n)));
    return Array.from({ length: count }, (_, i) => <span className={`rdot ${cls}`} key={i} />);
  };
  return (
    <div className="viz-ratio">
      <div className="ratio__main">
        <div className="ratio__side">
          <div className="ratio__dots">{dots(from, "rdot--muted")}</div>
          <span className="ratio__num mono">{from}</span>
        </div>
        <span className="ratio__arrow" aria-hidden="true">→</span>
        <div className="ratio__side">
          <div className="ratio__dots">{dots(to, "rdot--accent")}</div>
          <span className="ratio__num mono is-accent">
            <CountValue raw={to} active={active} />
          </span>
        </div>
      </div>
      <p className="ratio__label">{label}</p>
      {note && <p className="ratio__note">{note}</p>}
    </div>
  );
}

/** One dominant number + context. */
function BigStat({ value, label, context, active }: { value: string; label: string; context?: string; active: boolean }) {
  return (
    <div className="viz-bigstat">
      <span className="bigstat__val mono">
        <CountValue raw={value} active={active} />
      </span>
      <span className="bigstat__label">{label}</span>
      {context && <span className="bigstat__context">{context}</span>}
    </div>
  );
}

/** Time-axis. */
function Timeline({ items }: { items: { time: string; title: string; detail: string }[] }) {
  return (
    <ol className="viz-timeline">
      {items.map((it, i) => (
        <li className="tl" key={i} style={{ animationDelay: `${i * 100}ms` }}>
          <span className="tl__rail" aria-hidden="true">
            <span className="tl__dot" />
          </span>
          <div className="tl__body">
            <span className="tl__time mono">{it.time}</span>
            <span className="tl__title">{it.title}</span>
            <span className="tl__detail">{it.detail}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Numbered stepper rail — current stage highlighted. */
function Pipeline({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="viz-pipeline">
      {steps.map((s, i) => (
        <li
          className={`pl ${i === current ? "is-current" : ""} ${current >= 0 && i < current ? "is-done" : ""}`}
          key={i}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="pl__num mono">{i + 1}</span>
          <span className="pl__title">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function renderViz(block: SlideBlock, active: boolean): ReactElement | null {
  switch (block.kind) {
    case "stats":
      return <StatCards items={block.items} active={active} />;
    case "list":
      return <StepCards items={block.items} />;
    case "split":
      return <SplitPanels items={block.items} />;
    case "magnitude":
      return <Magnitude items={block.items} active={active} />;
    case "proportion":
      return <Proportion items={block.items} active={active} />;
    case "gap":
      return <Gap items={block.items} active={active} />;
    case "ratio":
      return <Ratio from={block.from} to={block.to} label={block.label} note={block.note} active={active} />;
    case "bigstat":
      return <BigStat value={block.value} label={block.label} context={block.context} active={active} />;
    case "timeline":
      return <Timeline items={block.items} />;
    case "pipeline":
      return <Pipeline steps={block.steps} current={block.current} />;
    default:
      return null;
  }
}

/* Slide ---------------------------------------------------------------- */

export default function Slide({ section, slide, active }: Props) {
  const eyebrow = (
    <p className="eyebrow eyebrow--light slide__eyebrow">
      {section.index} · {section.title}
    </p>
  );

  const isHero = slide.kind === "hero";
  const block = slide.block;
  const variant = isHero
    ? "hero"
    : block?.kind === "quote"
    ? "quote"
    : block
    ? "content"
    : "statement";

  const style = isHero ? { backgroundImage: `url(${section.cover})` } : undefined;

  return (
    <article className={`slide slide--${variant} ${active ? "is-active" : ""}`} style={style} aria-hidden={!active}>
      {isHero && <span className="slide__scrim" />}
      {!isHero && (
        <div className="slide__media" style={{ backgroundImage: `url(${section.cover})` }} aria-hidden="true" />
      )}
      {(variant === "quote" || variant === "statement") && <ArtMotif id={slide.id} />}

      {variant === "hero" && (
        <div className="slide__inner">
          {eyebrow}
          <h2 className="slide__title">{slide.title}</h2>
          <span className="red-rule slide__rule" />
          <p className="slide__body">{slide.body}</p>
          {block?.kind === "quote" && (
            <p className="slide__heroquote">
              “{block.text}” {block.cite && <span className="mono">— {block.cite}</span>}
            </p>
          )}
          <p className="slide__hint mono">Use → or click to advance</p>
        </div>
      )}

      {variant === "content" && block && (
        <div className="slide__grid">
          <header className="slide__copy">
            {eyebrow}
            <h2 className="slide__title slide__title--sm">{slide.title}</h2>
            <span className="red-rule slide__rule" />
            <p className="slide__body">{slide.body}</p>
          </header>
          <div className={`slide__info slide__info--${block.kind}`}>{renderViz(block, active)}</div>
        </div>
      )}

      {variant === "quote" && block?.kind === "quote" && (
        <div className="slide__inner slide__inner--quote">
          {eyebrow}
          <h2 className="slide__kicker">{slide.title}</h2>
          <figure className="viz viz--quote">
            <blockquote className="vquote">{block.text}</blockquote>
            {block.cite && <figcaption className="vquote__cite mono">— {block.cite}</figcaption>}
          </figure>
        </div>
      )}

      {variant === "statement" && (
        <div className="slide__inner slide__inner--statement">
          {eyebrow}
          <h2 className="slide__title">{slide.title}</h2>
          <span className="red-rule slide__rule" />
          <p className="slide__body slide__body--lg">{slide.body}</p>
        </div>
      )}
    </article>
  );
}
