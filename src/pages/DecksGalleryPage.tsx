import { Link } from "react-router-dom";
import { bonusDecks, deckPage, deckPdf } from "../data/bonusDecks";
import "./DecksGalleryPage.css";

export default function DecksGalleryPage() {
  return (
    <section className="dg" data-testid="decks-gallery">
      <header className="dg__bar">
        <Link to="/" className="dg__home">
          ← Home
        </Link>
        <span className="dg__title">Bonus Decks</span>
        <span className="dg__count mono">{bonusDecks.length} decks</span>
      </header>

      <div className="dg__grid">
        {bonusDecks.map((d) => (
          <article className="dg__tile" key={d.id}>
            <Link to={`/deck/${d.id}`} className="dg__link" aria-label={`Open ${d.title}`}>
              <img
                className="dg__thumb"
                src={deckPage(d.id, 1)}
                alt={`${d.title} — cover`}
                loading="lazy"
              />
              <span className="dg__meta">
                <span className="dg__name">{d.title}</span>
                <span className="dg__pages mono">{d.pages} slides</span>
              </span>
            </Link>
            <a
              className="dg__download"
              href={deckPdf(d)}
              download={d.pdf}
              aria-label={`Download ${d.title} PDF`}
            >
              ↓ PDF
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
