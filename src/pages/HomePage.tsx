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
            <p className="eyebrow eyebrow--light">Blood is the baseline of modern medicine</p>
            <h1 className="home-hero__title">
              Every donation starts a<br />
              <em>chain of care</em>.
            </h1>
            <p className="home-hero__lede">
              The American Red Cross supplies roughly <strong>40% of the nation's blood</strong>,
              connecting volunteer donors to about <strong>2,500 hospitals</strong>. Someone needs
              that blood every two seconds — in trauma bays, cancer wards, and delivery rooms.
              This is how that lifeline works, and why it runs entirely on donors.
            </p>
            <div className="home-hero__cta">
              <Link to="/hub" className="btn btn--primary" data-testid="enter-hub">
                Explore the experience
              </Link>
            </div>
            <div className="home-hero__stats">
              <div className="home-stat">
                <div className="home-stat__value mono">~40%</div>
                <div className="home-stat__label">of the U.S. blood supply</div>
              </div>
              <div className="home-stat">
                <div className="home-stat__value mono">~2,500</div>
                <div className="home-stat__label">hospitals served</div>
              </div>
              <div className="home-stat">
                <div className="home-stat__value mono">every 2s</div>
                <div className="home-stat__label">a patient needs blood</div>
              </div>
            </div>
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
          <p className="mono">Connecting volunteer donors to patients, every day, nationwide.</p>
        </div>
      </footer>
    </div>
  );
}
