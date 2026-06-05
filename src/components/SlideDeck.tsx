import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Section } from "../data/sections";
import Slide from "./Slide";
import ThemeToggle from "./ThemeToggle";
import "./SlideDeck.css";

type Props = {
  section: Section;
  present?: boolean;
  /** Label for the chained next step (e.g. next section title). */
  nextLabel?: string;
  /** Called when the user advances past the final slide. */
  onAdvancePastEnd?: () => void;
};

export default function SlideDeck({
  section,
  present = false,
  nextLabel,
  onAdvancePastEnd,
}: Props) {
  const [index, setIndex] = useState(0);
  const count = section.slides.length;
  const atEnd = index === count - 1;

  // Reset to first slide whenever the section changes.
  useEffect(() => {
    setIndex(0);
  }, [section.id]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i < count - 1) return i + 1;
      onAdvancePastEnd?.();
      return i;
    });
  }, [count, onAdvancePastEnd]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't steal keys while the user is typing in a form control or an
      // open dialog (e.g. the Notes panel). Without this, Space and the
      // arrows advance the deck while the user is composing a note.
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          t.isContentEditable ||
          t.closest("[role='dialog']")
        ) {
          return;
        }
      }
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          goPrev();
          break;
        case "Home":
          setIndex(0);
          break;
        case "End":
          setIndex(count - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, count]);

  const current = section.slides[index];

  return (
    <section className="deck" data-testid="deck" data-section={section.id}>
      {/* Top bar */}
      <header className="deck__bar">
        <Link to="/hub" className="deck__home" aria-label="Back to chapters">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v9h5v-6h4v6h5v-9" />
          </svg>
        </Link>
        <div className="deck__title">
          <span className="mono deck__index">{section.index}</span>
          <span className="deck__name">{section.title}</span>
        </div>
        <div className="deck__right">
          <ThemeToggle />
          <div className="deck__counter mono" data-testid="deck-counter">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </div>
        </div>
      </header>

      {/* Slide stage — click anywhere to advance */}
      <div
        className="deck__stage"
        onClick={goNext}
        data-testid="deck-stage"
        role="presentation"
      >
        <Slide key={current.id} section={section} slide={current} active />
      </div>

      {/* Controls */}
      <footer className="deck__controls" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="deck__arrow"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous slide"
          data-testid="deck-prev"
        >
          ←
        </button>

        <div className="deck__dots" role="tablist" aria-label="Slides">
          {section.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`deck__dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === index}
              role="tab"
            />
          ))}
        </div>

        {atEnd && present && nextLabel ? (
          <button
            type="button"
            className="deck__arrow deck__arrow--next"
            onClick={() => onAdvancePastEnd?.()}
            data-testid="deck-next-section"
          >
            {nextLabel} →
          </button>
        ) : atEnd ? (
          <Link
            to="/hub"
            className="deck__arrow deck__arrow--next"
            data-testid="deck-to-hub"
          >
            ↩ Chapters
          </Link>
        ) : (
          <button
            type="button"
            className="deck__arrow"
            onClick={goNext}
            aria-label="Next slide"
            data-testid="deck-next"
          >
            →
          </button>
        )}
      </footer>
    </section>
  );
}
