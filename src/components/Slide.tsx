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

/* Atmospheric motif (quote/statement only) ---------------------------- */

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

/* Infographics -------------------------------------------------------- */

function StatCards({ items, active }: { items: Extract<SlideBlock, { kind: "stats" }>["items"]; active: boolean }) {
  const nums = items.map((i) => {
    const m = i.value.match(/[\d,]+(?:\.\d+)?/);
    return m ? parseFloat(m[0].replace(/,/g, "")) : NaN;
  });
  const max = Math.max(0, ...nums.filter((n) => !Number.isNaN(n)));
  return (
    <div className="info-stats">
      {items.map((s, i) => {
        const n = nums[i];
        const pct = max > 0 && !Number.isNaN(n) ? Math.max(6, (n / max) * 100) : 0;
        return (
          <div className={`info-card ${s.accent ? "is-accent" : ""}`} key={i} style={{ animationDelay: `${i * 110}ms` }}>
            <div className="info-card__value mono">{s.accent ? <CountValue raw={s.value} active={active} /> : s.value}</div>
            <div className="info-card__label">{s.label}</div>
            {pct > 0 && (
              <div className="info-card__bar">
                <span style={{ width: `${pct}%`, animationDelay: `${i * 110 + 160}ms` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepCards({ items }: { items: Extract<SlideBlock, { kind: "list" }>["items"] }) {
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

  const style = isHero ? { backgroundImage: `url(${section.cover})` } : undefined;

  return (
    <article className={`slide slide--${variant} ${active ? "is-active" : ""}`} style={style} aria-hidden={!active}>
      {isHero && <span className="slide__scrim" />}
      {(variant === "quote" || variant === "statement") && <ArtMotif id={slide.id} />}

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

      {variant === "content" && (
        <div className="slide__grid">
          <header className="slide__copy">
            {eyebrow}
            <h2 className="slide__title slide__title--sm">{slide.title}</h2>
            <p className="slide__body">{slide.body}</p>
          </header>
          <div className="slide__info">
            {block?.kind === "stats" && <StatCards items={block.items} active={active} />}
            {block?.kind === "list" && <StepCards items={block.items} />}
          </div>
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
          <p className="slide__body slide__body--lg">{slide.body}</p>
        </div>
      )}
    </article>
  );
}
