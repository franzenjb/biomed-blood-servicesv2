import { Link } from "react-router-dom";
import { sections } from "../data/sections";
import RcMark from "../components/RcMark";
import "./HubPage.css";

export default function HubPage() {
  return (
    <div className="hub" data-testid="hub">
      <header className="hub__bar">
        <Link to="/" className="hub__brand">
          <RcMark size={28} />
          <span>
            Red Cross <strong>Blood Services</strong>
          </span>
        </Link>
        <Link to="/" className="hub__home" data-testid="hub-home">
          Home ✕
        </Link>
      </header>

      <nav className="hub__grid" aria-label="Sections">
        {sections.map((s) => (
          <Link
            key={s.id}
            to={`/s/${s.id}`}
            className="hub__card"
            style={{ backgroundImage: `url(${s.cover})` }}
            data-testid={`hub-card-${s.id}`}
          >
            <span className="hub__scrim" />
            <span className="hub__index mono">{s.index}</span>
            <span className="hub__body">
              <span className="hub__title">{s.title}</span>
              <span className="hub__q">{s.question}</span>
            </span>
          </Link>
        ))}

        <Link to="/map" className="hub__card hub__card--map" data-testid="hub-card-map">
          <span className="hub__index mono">06</span>
          <span className="hub__body">
            <span className="hub__title">Map &amp; Data</span>
            <span className="hub__q">Explore collections and reach on a live map.</span>
          </span>
        </Link>
      </nav>

      <footer className="hub__foot">
        <Link to="/" className="hub__foot-link">
          ← Home
        </Link>
        <span className="mono hub__tag">DONOR EDUCATION · FUNDRAISER DEMO</span>
      </footer>
    </div>
  );
}
