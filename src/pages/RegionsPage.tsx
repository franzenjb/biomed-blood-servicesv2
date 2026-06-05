import { Link } from "react-router-dom";
import "./RegionsPage.css";

type Stat = { value: string; label: string; accent?: boolean };
type Region = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  stats?: Stat[];
};

const sections: Region[] = [
  {
    id: "your-type",
    eyebrow: "Why representation is medicine",
    title: "Whoever you are, a patient shares your type.",
    body:
      "Broadening the donor base isn't optics — it's medicine. The closest-matched blood is what keeps sickle cell patients alive, and that match comes from donors who look like them.",
    stats: [
      { value: "290,000+", label: "diverse donors screened for sickle cell trait since 2021", accent: true },
      { value: "100,000", label: "Americans live with sickle cell disease today" },
    ],
  },
  {
    id: "african-american",
    eyebrow: "African American donors",
    title: "Closest-matched blood for sickle cell patients.",
    body:
      "About 1 in 13 African American babies is born with the sickle cell trait. Patients with sickle cell disease often need transfusions every few weeks — and the closest antigen matches come from donors of the same heritage. Recruiting and retaining African American donors is one of the highest-leverage moves in transfusion medicine.",
  },
  {
    id: "latino",
    eyebrow: "Latino donors",
    title: "The fastest-growing share of the U.S. patient base.",
    body:
      "Latinos are the fastest-growing demographic in the U.S. and carry universal Type O at one of the highest rates of any group. They are over-represented among patients but historically under-represented among donors. Closing that gap is a generational opportunity for the supply.",
  },
  {
    id: "lgbtq",
    eyebrow: "LGBTQ+ donors",
    title: "A donor pool the rules used to exclude.",
    body:
      "Eligibility guidance now lets many LGBTQ+ adults donate for the first time in decades. Local Red Cross teams are partnering with Pride networks and community organizations to reach donors who were turned away under prior rules — and turn first visits into long-term relationships.",
  },
];

export default function RegionsPage() {
  return (
    <section className="regions" data-testid="regions">
      <header className="regions__bar">
        <Link to="/hub" className="regions__back" data-testid="regions-back">
          ← Hub
        </Link>
        <span className="regions__title">Explore Regions</span>
      </header>

      <div className="regions__scroll">
        <div className="regions__hero">
          <p className="eyebrow eyebrow--light">09 · LOCAL STORY &amp; COMMUNITY IMPACT</p>
          <h1 className="regions__h1">Bring BioMed home.</h1>
          <span className="red-rule" />
          <p className="regions__lede">
            National numbers move the conversation; local stories close it. This view will
            surface, region by region and chapter by chapter, how BioMed touches the
            communities you serve — drives, partners, hospitals, donors, and the patients
            on the other end. We start with the populations the supply most depends on.
          </p>
        </div>

        {sections.map((s) => (
          <article className="regions__section" key={s.id} id={s.id}>
            <p className="eyebrow eyebrow--light">{s.eyebrow}</p>
            <h2 className="regions__h2">{s.title}</h2>
            <p className="regions__body">{s.body}</p>
            {s.stats && (
              <div className="regions__stats">
                {s.stats.map((stat, i) => (
                  <div className={`regions__stat ${stat.accent ? "is-accent" : ""}`} key={i}>
                    <span className="regions__stat-value mono">{stat.value}</span>
                    <span className="regions__stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}

        <p className="regions__note mono">More regional + community stories coming soon.</p>
      </div>
    </section>
  );
}
