import {
  bloodSystemMetrics,
  blood101Facts,
  componentBasics,
  donationMethods,
  journeyStages,
  regions,
  mobileMarkets,
  hospitalDistribution,
  futureDemandLenses,
} from "./mockData";

export type Stat = { value: string; label: string; accent?: boolean };

export type SlideBlock =
  | { kind: "stats"; items: Stat[] }
  | { kind: "list"; items: { title: string; detail: string }[] };

export type Slide = {
  id: string;
  kind: "hero" | "content";
  title: string;
  body: string;
  block?: SlideBlock;
};

export type Section = {
  id: string;
  index: string;
  title: string;
  tagline: string;
  cover: string;
  /** Donor-friendly framing question shown on the menu + hero. */
  question: string;
  slides: Slide[];
};

const fmt = (n: number) => n.toLocaleString("en-US");

/* -------------------------------------------------------------------- */
/* 01 — Blood 101                                                         */
/* -------------------------------------------------------------------- */

const blood101: Section = {
  id: "blood-101",
  index: "01",
  title: "Blood 101",
  tagline: "Who we are, and why every appointment matters.",
  question: "Why does blood donation matter?",
  cover: "/covers/blood-101.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "Blood 101",
      body: "Blood cannot be manufactured. Every unit a patient receives starts with a volunteer donor — which is why a steady community of donors is the whole system.",
    },
    {
      id: "why-donors",
      kind: "content",
      title: "Why donors matter",
      body: "A few fundamentals shape everything else about how blood works.",
      block: {
        kind: "list",
        items: blood101Facts.map((fact, i) => ({
          title: ["No substitute", "One donation, many patients", "Always running low", "Match readiness"][i] ?? "Fact",
          detail: fact,
        })),
      },
    },
    {
      id: "system",
      kind: "content",
      title: "The system at a glance",
      body: "The American Red Cross is the backbone of the national blood supply.",
      block: {
        kind: "stats",
        items: bloodSystemMetrics.map((m, i) => ({
          value: m.value,
          label: m.label,
          accent: i === 0,
        })),
      },
    },
    {
      id: "ways-to-give",
      kind: "content",
      title: "Ways to give",
      body: "Different donation types serve different patient needs. Donors can choose the one that fits their schedule and blood type.",
      block: {
        kind: "list",
        items: donationMethods.map((m) => ({
          title: m.title,
          detail: `${m.duration} · ${m.frequency} · best for ${m.idealTypes}. ${m.description}`,
        })),
      },
    },
    {
      id: "components",
      kind: "content",
      title: "What's in a single donation",
      body: "One whole-blood donation is often separated into components, so a single visit can help more than one patient.",
      block: {
        kind: "list",
        items: componentBasics.map((c) => ({
          title: c.title,
          detail: `${c.detail} ${c.storage}`,
        })),
      },
    },
  ],
};

/* -------------------------------------------------------------------- */
/* 02 — Biomed Collections                                               */
/* -------------------------------------------------------------------- */

const collections: Section = {
  id: "collections",
  index: "02",
  title: "Biomed Collections",
  tagline: "Where donors meet the system: fixed sites and mobile drives.",
  question: "Where does blood donation happen?",
  cover: "/covers/biomed-collections.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "Biomed Collections",
      body: "Collections happen two ways: at fixed donation centers, and through mobile blood drives that bring donation into the community.",
    },
    {
      id: "two-channels",
      kind: "content",
      title: "Two ways to reach donors",
      body: "Fixed sites anchor donation in a metro and support time-intensive donations like platelets. Mobile drives extend reach into workplaces, campuses, and rural counties.",
      block: {
        kind: "list",
        items: [
          { title: "Fixed sites", detail: "Permanent donation centers with a stable schedule and a defined trade area that draws donors from surrounding communities." },
          { title: "Mobile drives", detail: "Pop-up drives hosted by partners — employers, schools, faith groups — that rotate through counties to extend collection reach." },
        ],
      },
    },
    {
      id: "reach",
      kind: "content",
      title: "Reach by region",
      body: "Sample regions show how annual products and active donors scale with the communities served.",
      block: {
        kind: "stats",
        items: regions.map((r, i) => ({
          value: `${fmt(r.annualProducts)}`,
          label: `${r.name} — annual products`,
          accent: i === 0,
        })),
      },
    },
    {
      id: "mobile",
      kind: "content",
      title: "Mobile collections at work",
      body: "Mobile programs run hundreds of drives a year with local partners across each chapter.",
      block: {
        kind: "list",
        items: mobileMarkets.map((m) => ({
          title: m.chapter,
          detail: `${fmt(m.drives)} drives · ${fmt(m.products)} products · ${m.partners} community partners. ${m.narrative}`,
        })),
      },
    },
    {
      id: "market",
      kind: "content",
      title: "Who each market serves",
      body: "A market snapshot pairs collection activity with the community behind it — population, age, and diversity all shape donor strategy.",
      block: {
        kind: "stats",
        items: [
          { value: fmt(regions[0].demographics.population), label: `${regions[0].name} population`, accent: true },
          { value: `${regions[0].demographics.medianAge}`, label: "Median age" },
          { value: `${regions[0].demographics.age65PlusPct}%`, label: "Age 65+" },
          { value: `${regions[0].activeDonors.toLocaleString()}`, label: "Active donors" },
        ],
      },
    },
  ],
};

/* -------------------------------------------------------------------- */
/* 03 — Blood Journey                                                    */
/* -------------------------------------------------------------------- */

const journey: Section = {
  id: "journey",
  index: "03",
  title: "Blood Journey",
  tagline: "The path from donor chair to a hospital-ready product.",
  question: "How does blood move from donor to patient?",
  cover: "/covers/blood-journey.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "The journey of a donation",
      body: "From the moment a donor sits down, every donation follows the same careful path to a patient who needs it.",
    },
    ...journeyStages.map((stage, i) => ({
      id: `stage-${i + 1}`,
      kind: "content" as const,
      title: `${i + 1}. ${stage.title}`,
      body: stage.detail,
    })),
  ],
};

/* -------------------------------------------------------------------- */
/* 04 — Hospital Distribution                                            */
/* -------------------------------------------------------------------- */

const distribution: Section = {
  id: "distribution",
  index: "04",
  title: "Hospital Distribution",
  tagline: "Community impact, without exposing sensitive operations.",
  question: "Which communities and hospitals are supported?",
  cover: "/covers/hospital-distribution.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "From our shelves to the bedside",
      body: "Donated blood reaches roughly 2,500 hospitals and transfusion centers nationwide — supporting trauma, surgery, cancer care, childbirth, and chronic illness.",
    },
    {
      id: "reach",
      kind: "content",
      title: "Regional hospital reach",
      body: "Each region delivers across multiple zones to a network of partner hospitals.",
      block: {
        kind: "stats",
        items: hospitalDistribution.map((h, i) => ({
          value: `${h.hospitalsServed}`,
          label: `${h.title.replace(" Hospital Distribution", "")} — hospitals served`,
          accent: i === 0,
        })),
      },
    },
    {
      id: "product-mix",
      kind: "content",
      title: "What hospitals receive",
      body: "The product mix reflects how patient care actually uses blood — red cells lead, with platelets and plasma close behind.",
      block: {
        kind: "stats",
        items: [
          { value: `${hospitalDistribution[0].productMix.redCells}%`, label: "Red blood cells", accent: true },
          { value: `${hospitalDistribution[0].productMix.platelets}%`, label: "Platelets" },
          { value: `${hospitalDistribution[0].productMix.plasma}%`, label: "Plasma" },
        ],
      },
    },
    {
      id: "impact",
      kind: "content",
      title: "What a donation makes possible",
      body: "Behind every delivered unit is a patient and a care team counting on it.",
      block: {
        kind: "list",
        items: [
          { title: "Trauma & emergency", detail: "Accident, injury, and major blood loss where minutes matter." },
          { title: "Surgery & transplant", detail: "Planned procedures that depend on a ready, reliable supply." },
          { title: "Cancer care", detail: "Treatment that frequently needs platelets and red cells over time." },
          { title: "Childbirth & chronic illness", detail: "Maternal care complications and conditions like sickle cell disease." },
        ],
      },
    },
  ],
};

/* -------------------------------------------------------------------- */
/* 05 — Future Demand                                                    */
/* -------------------------------------------------------------------- */

const futureDemand: Section = {
  id: "future-demand",
  index: "05",
  title: "Future Demand",
  tagline: "Why today's donor relationships shape tomorrow's readiness.",
  question: "What pressures make donors matter more over time?",
  cover: "/covers/future-demand.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "The demand ahead",
      body: "An aging population needs more care while the donor base thins. These are directional planning scenarios — not forecasts — that show why donor relationships built today matter for tomorrow.",
    },
    {
      id: "gap",
      kind: "content",
      title: "A widening gap",
      body: "In a stress scenario, supply contracts while clinical demand rises — narrowing how much patient need can be covered.",
      block: {
        kind: "stats",
        items: [
          { value: "100", label: "Coverage today (baseline)" },
          { value: "~50", label: "Modeled coverage by 2045", accent: true },
          { value: "+30%", label: "Modeled demand growth" },
        ],
      },
    },
    {
      id: "lenses",
      kind: "content",
      title: "Four ways to read the pressure",
      body: "Future demand isn't one number. These lenses each tell part of the story.",
      block: {
        kind: "list",
        items: futureDemandLenses.map((l) => ({
          title: l.label,
          detail: l.summary,
        })),
      },
    },
    {
      id: "action",
      kind: "content",
      title: "What keeps the system ready",
      body: "The response is the same across every scenario: more committed donors, a more diverse donor base, and collection that holds up when weather and illness disrupt it.",
      block: {
        kind: "list",
        items: [
          { title: "Convert new donors", detail: "Turn first-time and youth donors into lifelong, repeat donors." },
          { title: "Broaden the base", detail: "Diverse donors improve readiness for rare matches and sickle cell patients." },
          { title: "Build resilience", detail: "Protect collection against weather, seasonal illness, and drive cancellations." },
        ],
      },
    },
  ],
};

export const sections: Section[] = [
  blood101,
  collections,
  journey,
  distribution,
  futureDemand,
];

export const getSection = (id: string | undefined): Section | undefined =>
  sections.find((s) => s.id === id);

export const nextSectionId = (id: string): string | undefined => {
  const i = sections.findIndex((s) => s.id === id);
  return i >= 0 && i < sections.length - 1 ? sections[i + 1].id : undefined;
};
