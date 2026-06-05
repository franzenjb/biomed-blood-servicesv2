import { Link } from "react-router-dom";
import "./RegionsPage.css";

export default function RegionsPage() {
  return (
    <section className="regions" data-testid="regions">
      <header className="regions__bar">
        <Link to="/hub" className="regions__back" data-testid="regions-back">
          ← Hub
        </Link>
        <span className="regions__title">Explore Regions</span>
      </header>

      <div className="regions__inner">
        <p className="eyebrow eyebrow--light">09 · LOCAL STORY &amp; COMMUNITY IMPACT</p>
        <h1 className="regions__h1">Bring BioMed home.</h1>
        <span className="red-rule" />
        <p className="regions__lede">
          National numbers move the conversation; local stories close it. This view will
          surface, region by region and chapter by chapter, how BioMed touches the
          communities you serve — drives, partners, hospitals, donors, and the patients on
          the other end.
        </p>
        <p className="regions__note mono">Coming soon · target geography view in development</p>
      </div>
    </section>
  );
}
