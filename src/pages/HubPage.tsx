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

        <Link
          to="/regions"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/regions.jpg)" }}
          data-testid="hub-card-explore-regions"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">06</span>
          <span className="hub__body">
            <span className="hub__title">Explore Regions</span>
            <span className="hub__q">Local story and community impact — by Red Cross region and chapter.</span>
          </span>
        </Link>

        <Link
          to="/biomed-ops-workbench"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/ops-workbench.jpg)" }}
          data-testid="hub-card-ops-workbench"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">07</span>
          <span className="hub__body">
            <span className="hub__title">BioMed Ops Workbench</span>
            <span className="hub__q">Internal BioMed layer controls and selected feature review.</span>
          </span>
        </Link>

        <Link
          to="/hospital-network"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/hospital-network.jpg)" }}
          data-testid="hub-card-hospital-network"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">08</span>
          <span className="hub__body">
            <span className="hub__title">Hospital Network</span>
            <span className="hub__q">Tier, distribution sites, portfolio footprint &amp; coverage.</span>
          </span>
        </Link>

        <Link
          to="/biomed-layer-atlas"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/ops-workbench.jpg)" }}
          data-testid="hub-card-layer-atlas"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">09</span>
          <span className="hub__body">
            <span className="hub__title">Atlas Map</span>
            <span className="hub__q">Inspect the full BioMed layer atlas with live map controls.</span>
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
