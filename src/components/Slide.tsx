import type { Section, Slide as SlideData } from "../data/sections";

type Props = {
  section: Section;
  slide: SlideData;
  active: boolean;
};

export default function Slide({ section, slide, active }: Props) {
  const isHero = slide.kind === "hero";

  return (
    <article
      className={`slide ${isHero ? "slide--hero" : "slide--content"} ${
        active ? "is-active" : ""
      }`}
      style={{ backgroundImage: `url(${section.cover})` }}
      aria-hidden={!active}
    >
      <span className="slide__scrim" />
      <div className="slide__inner">
        <p className="eyebrow eyebrow--light slide__eyebrow">
          {section.index} · {section.title}
        </p>
        <h2 className="slide__title">{slide.title}</h2>
        <p className="slide__body">{slide.body}</p>

        {slide.block?.kind === "stats" && (
          <div className="slide__stats">
            {slide.block.items.map((s, i) => (
              <div className="stat" key={i}>
                <div className={`stat__value mono ${s.accent ? "is-accent" : ""}`}>
                  {s.value}
                </div>
                <div className="stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {slide.block?.kind === "list" && (
          <ul className="slide__list">
            {slide.block.items.map((item, i) => (
              <li className="slide__list-item" key={i}>
                <span className="slide__tick" aria-hidden="true" />
                <div>
                  <span className="slide__item-title">{item.title}</span>
                  <span className="slide__item-detail">{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {isHero && <p className="slide__hint mono">Use → or click to advance</p>}
      </div>
    </article>
  );
}
