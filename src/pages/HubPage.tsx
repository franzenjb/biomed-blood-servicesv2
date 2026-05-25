import { Link } from "react-router-dom";
import { sections } from "../data/sections";
import RcMark from "../components/RcMark";
import ThemeToggle from "../components/ThemeToggle";
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
        <ThemeToggle />
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
            <span className="hub__title">BioMed Blood Map</span>
            <span className="hub__q">Live ArcGIS map of real BioMed data. Red Cross sign-in required.</span>
          </span>
        </Link>

        <Link to="/dashboard" className="hub__card hub__card--map" data-testid="hub-card-dashboard">
          <span className="hub__index mono">07</span>
          <span className="hub__body">
            <span className="hub__title">Jurisdiction Dashboard</span>
            <span className="hub__q">FY25 red cell drives, collections &amp; SDP by Biomed geography.</span>
          </span>
        </Link>
      </nav>

      <footer className="hub__foot">
        <Link to="/" className="hub__foot-link">
          ← Home
        </Link>
      </footer>
    </div>
  );
}
