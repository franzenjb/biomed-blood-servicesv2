import { Link } from "react-router-dom";
import { sections } from "../data/sections";
import RcMark from "../components/RcMark";
import ChainOfCare from "../components/ChainOfCare";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home">
      {/* Hero ----------------------------------------------------------- */}
      <section className="home-hero">
        <div className="home-hero__bg" aria-hidden="true" />
        <div className="home-hero__grid">
          <div className="home-hero__copy">
            <div className="home-brand">
              <RcMark size={30} />
              <span>
                American Red Cross · <strong>Biomedical Services</strong>
              </span>
            </div>
            <p className="eyebrow eyebrow--light">Donor education &amp; fundraiser experience</p>
            <h1 className="home-hero__title">
              Every donation starts a<br />
              <em>chain of care</em>.
            </h1>
            <p className="home-hero__lede">
              See where blood donation happens, why steady appointments matter, and how a
              single donation becomes patient-ready products for hospitals and the people who
              need them.
            </p>
            <div className="home-hero__cta">
              <Link to="/s/blood-101?present=1" className="btn btn--primary" data-testid="start-presentation">
                ▶ Start presentation
              </Link>
              <Link to="/map" className="btn btn--ghost" data-testid="hero-map">
                Explore the map
              </Link>
            </div>
            <p className="home-hero__note mono">
              Self-guided for donors · presentation-ready for fundraisers
            </p>
          </div>
          <div className="home-hero__art">
            <ChainOfCare />
          </div>
        </div>
      </section>

      {/* Sections ------------------------------------------------------- */}
      <section className="home-sections">
        <div className="home-section-head">
          <div className="red-rule" />
          <h2>Five chapters</h2>
          <p>
            Walk through the whole story, or jump to any chapter. Each works on its own as a
            short, guided slideshow.
          </p>
        </div>

        <div className="home-cards">
          {sections.map((s) => (
            <Link
              key={s.id}
              to={`/s/${s.id}`}
              className="home-card"
              data-testid={`home-card-${s.id}`}
            >
              <div
                className="home-card__cover"
                style={{ backgroundImage: `url(${s.cover})` }}
              >
                <span className="home-card__index mono">{s.index}</span>
              </div>
              <div className="home-card__body">
                <h3>{s.title}</h3>
                <p className="home-card__q">{s.question}</p>
                <span className="home-card__go">Open chapter →</span>
              </div>
            </Link>
          ))}

          <Link to="/map" className="home-card home-card--map" data-testid="home-card-map">
            <div className="home-card__cover home-card__cover--map">
              <span className="home-card__index mono">06</span>
            </div>
            <div className="home-card__body">
              <h3>Map &amp; Data</h3>
              <p className="home-card__q">Explore collection reach and hospital distribution on a live map.</p>
              <span className="home-card__go">Open map →</span>
            </div>
          </Link>
        </div>
      </section>

      <footer className="home-foot">
        <div className="home-foot__inner">
          <div className="home-brand home-brand--dark">
            <RcMark size={24} />
            <span>
              Red Cross <strong>Blood Services</strong>
            </span>
          </div>
          <p className="mono">
            Donor education prototype · public-safe, generalized data · scenarios are
            directional, not forecasts
          </p>
        </div>
      </footer>
    </div>
  );
}
