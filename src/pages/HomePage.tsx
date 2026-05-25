import { Link } from "react-router-dom";
import RcMark from "../components/RcMark";
import RcLogo from "../components/RcLogo";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home">
      <section className="home-hero">
        <video
          className="home-hero__video"
          autoPlay
          muted
          loop
          playsInline
          poster="/covers/blood-101.png"
          aria-hidden="true"
        >
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
        <div className="home-hero__scrim" aria-hidden="true" />

        <div className="home-hero__inner">
          <div className="home-brand">
            <RcLogo size={50} />
            <span className="home-brand__sub">Biomedical Services</span>
          </div>

          <h1 className="home-hero__title">
            Every donation starts a<br />
            <em>chain of care</em>.
          </h1>

          <p className="home-hero__lede">
            The Red Cross provides roughly <strong>40% of the nation's blood</strong> — and
            someone needs it <strong>every two seconds</strong>.
          </p>

          <Link to="/hub" className="btn btn--primary home-hero__cta" data-testid="enter-hub">
            Explore the experience
          </Link>

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
      </section>

      <footer className="home-foot">
        <div className="home-foot__inner">
          <div className="home-brand home-brand--dark">
            <RcMark size={22} />
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
