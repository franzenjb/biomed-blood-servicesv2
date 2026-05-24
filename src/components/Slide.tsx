import type { Section, Slide as SlideData, SlideBlock } from "../data/sections";

type Props = {
  section: Section;
  slide: SlideData;
  active: boolean;
};

/* Visuals -------------------------------------------------------------- */

function StatsViz({ items }: { items: Extract<SlideBlock, { kind: "stats" }>["items"] }) {
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
            <div className="vstat__value mono">{s.value}</div>
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

  return (
    <article
      className={`slide slide--${variant} ${active ? "is-active" : ""}`}
      style={{ backgroundImage: `url(${section.cover})` }}
      aria-hidden={!active}
    >
      <span className="slide__scrim" />

      {variant === "hero" && (
        <div className="slide__inner">
          {eyebrow}
          <h2 className="slide__title">{slide.title}</h2>
          <p className="slide__body">{slide.body}</p>
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
            {block?.kind === "stats" && <StatsViz items={block.items} />}
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
