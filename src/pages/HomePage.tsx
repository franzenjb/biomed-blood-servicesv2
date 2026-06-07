import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RcLogo from "../components/RcLogo";
import "./HomePage.css";

const VIDEO_VERSIONS = [
  { key: "default", label: "Default" },
  { key: "b", label: "B · Dark" },
  { key: "a", label: "A · Faded" },
  { key: "c", label: "C · Blur" },
];

// Playback speed per sample variant. Default = current production look.
const HERO_SPEED: Record<string, number> = {
  default: 1,
  a: 0.55, // faded + slow
  b: 0.45, // opaque dark cover — slowed for production
  c: 0.5,  // soft blur
};

export default function HomePage() {
  const [params] = useSearchParams();
  const explicit = params.get("hero");
  // Variant B (dark cover, slower) is the default everywhere.
  const heroRaw = explicit ?? "b";
  const hero = heroRaw in HERO_SPEED ? heroRaw : "default";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [eggOpen, setEggOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = HERO_SPEED[hero];
  }, [hero]);

  return (
    <div className="home">
      <section className="home-hero" data-hero={hero}>
        <video
          ref={videoRef}
          className="home-hero__video"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/video/hero-sharp-plus.mp4" type="video/mp4" />
        </video>
        <div className="home-hero__scrim" aria-hidden="true" />

        {/* Hidden easter egg — black dot, far bottom-left */}
        <button
          type="button"
          className="home-egg"
          aria-label="Extras"
          aria-expanded={eggOpen}
          onClick={() => setEggOpen((o) => !o)}
        />
        {eggOpen && (
          <div className="egg-panel" role="dialog" aria-label="Extras">
            <button
              type="button"
              className="egg-panel__close"
              aria-label="Close"
              onClick={() => setEggOpen(false)}
            >
              ×
            </button>

            <p className="egg-panel__group">Infographics</p>
            <ul className="egg-panel__decks">
              <li>
                <Link to="/infographics">Open gallery</Link>
              </li>
            </ul>

            <p className="egg-panel__group">Bonus decks</p>
            <ul className="egg-panel__decks">
              <li>
                <Link to="/decks">Open gallery</Link>
              </li>
            </ul>

            <p className="egg-panel__group">Maps &amp; Dashboards</p>
            <ul className="egg-panel__decks">
              <li>
                <a
                  href="https://arc-nhq-gis.maps.arcgis.com/apps/dashboards/14e506c8c992485a99f2cf8dca5b6153"
                  target="_blank"
                  rel="noreferrer"
                >
                  Service Delivery Site 2 Hour
                </a>
              </li>
            </ul>

            <p className="egg-panel__group">Video version</p>
            <div className="egg-panel__row">
              {VIDEO_VERSIONS.map((v) => (
                <Link
                  key={v.key}
                  to={v.key === "default" ? "/?hero=default" : `/?hero=${v.key}`}
                  data-on={hero === v.key}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          </div>
        )}

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
            Inside BioMed Capabilities
          </Link>

          <div className="home-hero__stats">
            <div className="home-stat">
              <div className="home-stat__value">~40%</div>
              <div className="home-stat__label">of the U.S. blood supply</div>
            </div>
            <div className="home-stat">
              <div className="home-stat__value">~2,500</div>
              <div className="home-stat__label">hospitals served</div>
            </div>
            <div className="home-stat">
              <div className="home-stat__value">every 2 seconds</div>
              <div className="home-stat__label">a patient needs blood</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
