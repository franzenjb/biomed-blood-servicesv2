import { Link } from "react-router-dom";
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
              <Link to="/hub" className="btn btn--primary" data-testid="enter-hub">
                Explore the experience
              </Link>
              <Link to="/s/blood-101?present=1" className="btn btn--ghost" data-testid="start-presentation">
                ▶ Start presentation
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
