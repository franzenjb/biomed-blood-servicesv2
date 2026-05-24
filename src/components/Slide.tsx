import { useEffect, useState, type ReactElement } from "react";
import type { Section, Slide as SlideData, SlideBlock } from "../data/sections";

type Props = {
  section: Section;
  slide: SlideData;
  active: boolean;
};

/* Count-up (accent numbers only) -------------------------------------- */

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

function CountValue({ raw, active }: { raw: string; active: boolean }) {
  const match = raw.match(/^([~<+\-−$]?)([\d,]+(?:\.\d+)?)([%+]?)$/);
  const target = match ? parseFloat(match[2].replace(/,/g, "")) : 0;
  const [value, setValue] = useState(active && match ? 0 : target);
  useEffect(() => {
    if (!active || !match) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setValue(target * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, match]);
  if (!match) return <>{raw}</>;
  const decimals = (match[2].split(".")[1] || "").length;
  return (
    <>
      {match[1]}
      {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {match[3]}
    </>
  );
}

/* Vector artwork motifs ------------------------------------------------ */

const MOTIFS: Record<string, ReactElement> = {
  rings: (
    <>
      <circle cx="300" cy="200" r="150" />
      <circle cx="300" cy="200" r="104" />
      <circle cx="300" cy="200" r="58" />
      <circle cx="300" cy="200" r="14" fill="currentColor" stroke="none" />
    </>
  ),
  pulse: (
    <polyline points="20,210 150,210 185,120 225,300 265,180 300,210 380,210" />
  ),
  drop: (
    <>
      <path d="M300 70 C360 160 392 210 392 252 a92 92 0 1 1 -184 0 C208 210 240 160 300 70 Z" />
      <circle cx="300" cy="256" r="150" opacity="0.5" />
    </>
  ),
  grid: (
    <>
      <path d="M120 60 V340 M210 60 V340 M300 60 V340 M390 60 V340 M60 120 H440 M60 210 H440 M60 300 H440" opacity="0.5" />
      <circle cx="300" cy="210" r="16" fill="currentColor" stroke="none" />
      <circle cx="210" cy="120" r="9" fill="currentColor" stroke="none" />
      <circle cx="390" cy="300" r="9" fill="currentColor" stroke="none" />
    </>
  ),
};
const MOTIF_KEYS = Object.keys(MOTIFS);
const pickMotif = (id: string) => MOTIF_KEYS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % MOTIF_KEYS.length];

function ArtMotif({ id }: { id: string }) {
  return (
    <svg className="slide__art" viewBox="0 0 460 400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {MOTIFS[pickMotif(id)]}
    </svg>
  );
}

/* Visuals -------------------------------------------------------------- */

function StatsViz({ items, active }: { items: Extract<SlideBlock, { kind: "stats" }>["items"]; active: boolean }) {
  const nums = items.map((i) => {
    const m = i.value.match(/[\d,]+(?:\.\d+)?/);
    return m ? parseFloat(m[0].replace(/,/g, "")) : NaN;
  });
  const max = Math.max(0, ...nums.filter((n) => !Number.isNaN(n)));
  return (
    <div className="viz viz--stats">
      {items.map((s, i) => {
        const n = nums[i];
        const pct = max > 0 && !Number.isNaN(n) ? Math.max(8, (n / max) * 100) : 0;
        return (
          <div className={`vstat ${s.accent ? "is-accent" : ""}`} key={i} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="vstat__value mono">{s.accent ? <CountValue raw={s.value} active={active} /> : s.value}</div>
            {pct > 0 && (
              <div className="vstat__bar">
                <span style={{ width: `${pct}%`, animationDelay: `${i * 100 + 150}ms` }} />
              </div>
            )}
            <div className="vstat__label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ListViz({ items }: { items: Extract<SlideBlock, { kind: "list" }>["items"] }) {
  return (
    <ul className="viz viz--flow">
      {items.map((it, i) => (
        <li className="vflow" key={i} style={{ animationDelay: `${i * 80}ms` }}>
          <span className="vflow__node" aria-hidden="true" />
          <div className="vflow__text">
            <span className="vflow__title">{it.title}</span>
            <span className="vflow__detail">{it.detail}</span>
          </div>
        </li>
      ))}
    </ul>
  );
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
    : block?.kind === "stats" || block?.kind === "list"
    ? "content"
    : "statement";

  // Photo only on section heroes; everything else is a clean dark canvas.
  const style = isHero ? { backgroundImage: `url(${section.cover})` } : undefined;

  return (
    <article className={`slide slide--${variant} ${active ? "is-active" : ""}`} style={style} aria-hidden={!active}>
      {isHero && <span className="slide__scrim" />}
      {!isHero && <ArtMotif id={slide.id} />}

      {variant === "hero" && (
        <div className="slide__inner">
          {eyebrow}
          <h2 className="slide__title">{slide.title}</h2>
          <p className="slide__body">{slide.body}</p>
          {block?.kind === "quote" && (
            <p className="slide__heroquote">
              “{block.text}” {block.cite && <span className="mono">— {block.cite}</span>}
            </p>
          )}
          <p className="slide__hint mono">Use → or click to advance</p>
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

      {variant === "content" && (
        <div className="slide__layout">
          <header className="slide__copy">
            {eyebrow}
            <h2 className="slide__title slide__title--sm">{slide.title}</h2>
            <p className="slide__body">{slide.body}</p>
          </header>
          <div className="slide__viz">
            {block?.kind === "stats" && <StatsViz items={block.items} active={active} />}
            {block?.kind === "list" && <ListViz items={block.items} />}
          </div>
        </div>
      )}

      {variant === "statement" && (
        <div className="slide__inner slide__inner--statement">
          {eyebrow}
          <h2 className="slide__title">{slide.title}</h2>
          <p className="slide__body slide__body--lg">{slide.body}</p>
        </div>
      )}
    </article>
  );
}
