import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { infographics, igPath } from "../data/infographics";
import "./InfographicsPage.css";

export default function InfographicsPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const count = infographics.length;
  const open = openIdx !== null;

  const next = useCallback(() => setOpenIdx((i) => (i === null ? 0 : (i + 1) % count)), [count]);
  const prev = useCallback(() => setOpenIdx((i) => (i === null ? 0 : (i - 1 + count) % count)), [count]);
  const close = useCallback(() => setOpenIdx(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Escape":
          close();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, close]);

  const current = openIdx !== null ? infographics[openIdx] : null;

  return (
    <section className="ig" data-testid="infographics">
      <header className="ig__bar">
        <Link to="/" className="ig__home">
          ← Home
        </Link>
        <span className="ig__title">Infographics</span>
        <span className="ig__count mono">{count} items</span>
      </header>

      <div className="ig__grid">
        {infographics.map((ig, i) => (
          <button
            key={ig.id}
            type="button"
            className="ig__tile"
            onClick={() => setOpenIdx(i)}
            aria-label={`Open ${ig.title}`}
          >
            <img className="ig__thumb" src={igPath(ig.file)} alt={ig.title} loading="lazy" />
            <span className="ig__name">{ig.title}</span>
          </button>
        ))}
      </div>

      {current && (
        <div
          className="ig__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={close}
        >
          <div className="ig__lb-bar" onClick={(e) => e.stopPropagation()}>
            <span className="ig__lb-name">{current.title}</span>
            <span className="ig__lb-counter mono">
              {String((openIdx ?? 0) + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
            <div className="ig__lb-actions">
              <a
                className="ig__lb-btn"
                href={igPath(current.file)}
                download={current.file}
                onClick={(e) => e.stopPropagation()}
              >
                ↓ Download
              </a>
              <button type="button" className="ig__lb-btn" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="ig__lb-stage" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ig__lb-nav ig__lb-nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous"
            >
              ←
            </button>
            <img
              key={current.id}
              className="ig__lb-image"
              src={igPath(current.file)}
              alt={current.title}
            />
            <button
              type="button"
              className="ig__lb-nav ig__lb-nav--next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next"
            >
              →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
