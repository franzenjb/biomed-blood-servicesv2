import { useEffect, useState } from "react";
import type { Section, Slide as SlideData, SlideBlock } from "../data/sections";

type Props = {
  section: Section;
  slide: SlideData;
  active: boolean;
};

/* Count-up ------------------------------------------------------------- */

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

function useCountUp(target: number, run: boolean, duration = 1000) {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return value;
}

function CountValue({ raw, active }: { raw: string; active: boolean }) {
  const match = raw.match(/^([~<+\-−$]?)([\d,]+(?:\.\d+)?)([%+]?)$/);
  const target = match ? parseFloat(match[2].replace(/,/g, "")) : 0;
  const value = useCountUp(target, active && !!match);
  if (!match) return <>{raw}</>;
  const decimals = (match[2].split(".")[1] || "").length;
  const shown = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <>
      {match[1]}
      {shown}
      {match[3]}
    </>
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
          <div className={`vstat ${s.accent ? "is-accent" : ""}`} key={i} style={{ animationDelay: `${i * 90}ms` }}>
            <div className="vstat__value mono">
              <CountValue raw={s.value} active={active} />
            </div>
            {pct > 0 && (
              <div className="vstat__bar">
                <span style={{ width: `${pct}%`, animationDelay: `${i * 90 + 200}ms` }} />
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

function QuoteViz({ text, cite }: { text: string; cite?: string }) {
  return (
    <figure className="viz viz--quote">
      <blockquote className="vquote">{text}</blockquote>
      {cite && <figcaption className="vquote__cite mono">— {cite}</figcaption>}
    </figure>
  );
}

function Visual({ block, active }: { block: SlideBlock | undefined; active: boolean }) {
  if (!block) return null;
  if (block.kind === "stats") return <StatsViz items={block.items} active={active} />;
  if (block.kind === "list") return <ListViz items={block.items} />;
  return <QuoteViz text={block.text} cite={block.cite} />;
}

/* Slide ---------------------------------------------------------------- */

export default function Slide({ section, slide, active }: Props) {
  const isHero = slide.kind === "hero";
  const hasViz = Boolean(slide.block);

  return (
    <article
      className={`slide ${isHero ? "slide--hero" : hasViz ? "slide--content" : "slide--statement"} ${
        active ? "is-active" : ""
      }`}
      style={{ backgroundImage: `url(${section.cover})` }}
      aria-hidden={!active}
    >
      <span className="slide__scrim" />

      {isHero ? (
        <div className="slide__inner">
          <p className="eyebrow eyebrow--light slide__eyebrow">
            {section.index} · {section.title}
          </p>
          <h2 className="slide__title">{slide.title}</h2>
          <p className="slide__body">{slide.body}</p>
          {slide.block?.kind === "quote" && <QuoteViz text={slide.block.text} cite={slide.block.cite} />}
          <p className="slide__hint mono">Use → or click to advance</p>
        </div>
      ) : hasViz ? (
        <div className="slide__layout">
          <header className="slide__copy">
            <p className="eyebrow eyebrow--light slide__eyebrow">
              {section.index} · {section.title}
            </p>
            <h2 className="slide__title slide__title--sm">{slide.title}</h2>
            <p className="slide__body">{slide.body}</p>
          </header>
          <div className="slide__viz">
            <Visual block={slide.block} active={active} />
          </div>
        </div>
      ) : (
        <div className="slide__inner slide__inner--statement">
          <p className="eyebrow eyebrow--light slide__eyebrow">
            {section.index} · {section.title}
          </p>
          <h2 className="slide__title">{slide.title}</h2>
          <p className="slide__body slide__body--lg">{slide.body}</p>
        </div>
      )}
    </article>
  );
}
