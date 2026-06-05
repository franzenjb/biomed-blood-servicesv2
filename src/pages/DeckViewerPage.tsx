import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { deckPage, deckPdf, getBonusDeck } from "../data/bonusDecks";
import "./DeckViewerPage.css";

export default function DeckViewerPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const deck = getBonusDeck(deckId);
  const [index, setIndex] = useState(0);

  const count = deck?.pages ?? 0;

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i < count - 1) return i + 1;
      navigate("/");
      return i;
    });
  }, [count, navigate]);
  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
        case "Escape":
          navigate("/");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, count, navigate]);

  if (!deck) return <Navigate to="/" replace />;

  const atEnd = index === count - 1;
  const nextSrc = index < count - 1 ? deckPage(deck.id, index + 2) : null;

  return (
    <section className="dv" data-testid="deckview">
      <header className="dv__bar">
        <Link to="/" className="dv__home" aria-label="Back to home">
          ← Home
        </Link>
        <span className="dv__title">{deck.title}</span>
        <div className="dv__bar-right">
          <a
            className="dv__download"
            href={deckPdf(deck)}
            download={deck.pdf}
            aria-label="Download PDF"
          >
            ↓ PDF
          </a>
          <span className="dv__counter mono">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="dv__stage" onClick={goNext} role="presentation">
        <img
          key={index}
          className="dv__slide"
          src={deckPage(deck.id, index + 1)}
          alt={`${deck.title} — slide ${index + 1}`}
          draggable={false}
        />
        {/* preload next */}
        {nextSrc && <img className="dv__preload" src={nextSrc} alt="" aria-hidden="true" />}
        <p className="dv__rotate">Rotate your device for full-screen slides ↻</p>
      </div>

      <footer className="dv__controls" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="dv__arrow"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous slide"
        >
          ←
        </button>

        <div className="dv__dots" role="tablist" aria-label="Slides">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`dv__dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === index}
              role="tab"
            />
          ))}
        </div>

        {atEnd ? (
          <Link to="/" className="dv__arrow dv__arrow--next">
            ↩ Home
          </Link>
        ) : (
          <button type="button" className="dv__arrow" onClick={goNext} aria-label="Next slide">
            →
          </button>
        )}
      </footer>
    </section>
  );
}
