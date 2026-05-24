import {
  bloodSystemMetrics,
  blood101Facts,
  componentBasics,
  donationMethods,
  journeyStages,
  regions,
  mobileMarkets,
  hospitalDistribution,
} from "./mockData";

export type Stat = { value: string; label: string; accent?: boolean };

export type SlideBlock =
  | { kind: "stats"; items: Stat[] }
  | { kind: "list"; items: { title: string; detail: string }[] }
  | { kind: "quote"; text: string; cite?: string };

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
      id: "at-its-limit",
      kind: "content",
      title: "A system at its limit",
      body: "The need is constant, and the margin is thin. The American Red Cross provides roughly 40% of the nation's blood to about 2,500 hospitals.",
      block: {
        kind: "quote",
        text: "The U.S. blood supply is at its lowest level in over a decade.",
        cite: "Dr. Ruchika Goel, AABB 2025",
      },
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
        items: bloodSystemMetrics.map((m, i) => ({ value: m.value, label: m.label, accent: i === 0 })),
      },
    },
    {
      id: "ways-to-give",
      kind: "content",
      title: "Ways to give",
      body: "Different donation types serve different patient needs. Donors choose the one that fits their schedule and blood type.",
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
        items: componentBasics.map((c) => ({ title: c.title, detail: `${c.detail} ${c.storage}` })),
      },
    },
    {
      id: "universal-type",
      kind: "content",
      title: "Why a diverse donor base matters",
      body: "Some patients need closely matched blood. A broad, diverse donor base is a clinical asset, not just a goal.",
      block: {
        kind: "stats",
        items: [
          { value: "~50%", label: "of Latino & African American donors have Type O — the universal type ERs rely on", accent: true },
          { value: "290,000+", label: "diverse donors screened for sickle cell trait since 2021" },
        ],
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
        items: regions.map((r, i) => ({ value: `${fmt(r.annualProducts)}`, label: `${r.name} — annual products`, accent: i === 0 })),
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
          detail: `${fmt(m.drives)} drives · ${fmt(m.products)} products · ${m.partners} community partners.`,
        })),
      },
    },
    {
      id: "seasonal",
      kind: "content",
      title: "A fragile recruitment base",
      body: "The current supply leans heavily on a narrow, seasonal donor pool — which is exactly why recruitment has to broaden.",
      block: {
        kind: "stats",
        items: [
          { value: "30%", label: "of the supply relies on high-school & college students — summer breaks cause major lulls", accent: true },
          { value: "35%", label: "drop in national supply seen in a single recent month" },
        ],
      },
    },
    {
      id: "generations",
      kind: "content",
      title: "Recruiting every generation",
      body: "Each generation gives for different reasons and answers to different channels. One playbook no longer works.",
      block: {
        kind: "list",
        items: [
          { title: "Baby Boomers", detail: "Motivated by altruism & institutional trust. Reached through local blood drives and faith-based outreach. Routine, community-driven loyalty." },
          { title: "Millennials", detail: "Motivated by social impact & corporate responsibility. Reached through corporate giving and social media. Convenience-driven, digital-first." },
          { title: "Gen Z", detail: "Motivated by personal identity & peer social proof. Reached through mobile apps and influencer campaigns. Gamified, transparent, cause-specific." },
        ],
      },
    },
    {
      id: "inclusive",
      kind: "content",
      title: "Inclusive engagement as supply strategy",
      body: "Reaching diverse communities is how the system stays ready for patients who need closely matched blood — including sickle cell patients.",
      block: {
        kind: "stats",
        items: [
          { value: "290,000+", label: "donors self-identifying as Black, African American, or multiracial screened for sickle cell trait since 2021", accent: true },
          { value: "Partners", label: "like Alpha Phi Alpha bridge community trust and medical need" },
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
    {
      id: "ten-minute-window",
      kind: "content",
      title: "The 10-minute window",
      body: "Reihaneh Hajbeigi, a first-time mother, suffered a postpartum hemorrhage — a leading cause of maternal death — losing 40% of her blood volume.",
      block: {
        kind: "quote",
        text: "It was about 10 minutes from the time I started to feel faint until they had the blood in my system.",
        cite: "Reihaneh Hajbeigi, transfusion recipient",
      },
    },
    {
      id: "why-it-holds",
      kind: "content",
      title: "Why the chain matters",
      body: "Her survival hinged entirely on whether a stranger had donated 56 days earlier — and whether the whole logistical chain held. That is what every step of this journey protects.",
    },
  ],
};

/* -------------------------------------------------------------------- */
/* 04 — Hospital Distribution                                            */
/* -------------------------------------------------------------------- */

const distribution: Section = {
  id: "distribution",
  index: "04",
  title: "Hospital Distribution",
  tagline: "Community impact, and the resilience behind it.",
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
          { title: "Childbirth & chronic illness", detail: "Maternal complications and conditions like sickle cell disease." },
        ],
      },
    },
    {
      id: "ripple",
      kind: "content",
      title: "When the chain is tested",
      body: "Readiness is fragile. When Hurricane Helene knocked out power and water at the Asheville Blood Center, 150 lifesaving units were saved only by a 4-hour hazardous drive from a Charlotte team.",
      block: {
        kind: "stats",
        items: [
          { value: "1,500", label: "blood drives cancelled by extreme weather in FY25", accent: true },
          { value: "40,000", label: "donations uncollected in a single year — directly threatening patient readiness" },
        ],
      },
    },
  ],
};

/* -------------------------------------------------------------------- */
/* 05 — Future Demand (The Future Blood Debt)                            */
/* -------------------------------------------------------------------- */

const futureDemand: Section = {
  id: "future-demand",
  index: "05",
  title: "Future Demand",
  tagline: "Averting the demographic collapse of the blood supply.",
  question: "What pressures make donors matter more over time?",
  cover: "/covers/future-demand.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "The Future Blood Debt",
      body: "An aging population needs more care while the eligible donor base shrinks. On current models, the system trends toward roughly half the capacity it needs. These are directional planning scenarios — and a call to act.",
    },
    {
      id: "two-people",
      kind: "content",
      title: "Two people, one supply",
      body: "Demand for blood rises rapidly as populations age — peak demand sits with patients over 70 — while the eligible youth donor pool shrinks at the same time. That is a structural, mathematical impossibility.",
      block: {
        kind: "stats",
        items: [
          { value: "2 → 1", label: "in ~20 years, two people will rely on a supply sized for one", accent: true },
          { value: "70+", label: "age group driving peak demand" },
        ],
      },
    },
    {
      id: "hourglass",
      kind: "content",
      title: "The demographic hourglass",
      body: "A population pyramid reshaping into an extreme thumbtack form cannot sustain an altruism-based healthcare model. The leading indicator is already here: the Korean Red Cross saw annual donations fall 10% in five years (2.7M → 2.4M).",
      block: {
        kind: "stats",
        items: [
          { value: "+29.5%", label: "projected demand by 2045", accent: true },
          { value: "−35.5%", label: "projected supply by 2045" },
        ],
      },
    },
    {
      id: "symptoms",
      kind: "content",
      title: "Symptoms vs. root cause",
      body: "Short-term shocks grab headlines, but the structural threat is demographic.",
      block: {
        kind: "list",
        items: [
          { title: "Recent crisis", detail: "A 35% drop in national supply in a single month." },
          { title: "Seasonal volatility", detail: "30% of supply relies on high-school and college students; summer breaks cause major lulls." },
          { title: "Demographic squeeze", detail: "Declining birth rates mean fewer young, healthy donors to replace aging adults." },
          { title: "Age limits", detail: "Caps (e.g. age 70) disqualify the fastest-growing demographic — the group that consumes the most." },
        ],
      },
    },
    {
      id: "aging-altruism",
      kind: "content",
      title: "A system reliant on aging altruism",
      body: "Donation is shaped by generational attitudes toward institutional trust and altruism. Older generations donate at significantly higher rates; younger engagement is steadily declining.",
      block: {
        kind: "quote",
        text: "The U.S. blood supply is at its lowest level in over a decade.",
        cite: "Dr. Ruchika Goel, AABB 2025",
      },
    },
    {
      id: "integration",
      kind: "content",
      title: "From altruism to integration",
      body: "The old model — one-way charitable donation relying on pure altruism — is mathematically unsustainable. The new paradigm treats blood donation as a population-health tool, turning donors into active participants in their own preventative healthcare.",
    },
    {
      id: "ecosystem",
      kind: "content",
      title: "The digital donor ecosystem",
      body: "Make giving frictionless, and give something back every visit.",
      block: {
        kind: "list",
        items: [
          { title: "1. Book", detail: "Frictionless scheduling via app." },
          { title: "2. Assess", detail: "Pre-donation vitals check — blood pressure and pulse." },
          { title: "3. Draw", detail: "A standard 56-day whole blood or platelet donation." },
          { title: "4. Analyze", detail: "Post-donation lab testing — sickle cell trait, infectious disease, A1C." },
          { title: "5. Deliver", detail: "Secure delivery of health trends straight to the donor's phone." },
        ],
      },
    },
    {
      id: "dashboard",
      kind: "content",
      title: "A free health screening every visit",
      body: "Every donation becomes an ongoing, longitudinal health record — tracking blood pressure, hemoglobin, pulse, and periodic A1C for prediabetes.",
      block: {
        kind: "stats",
        items: [
          { value: "80,000", label: "donors alerted to concerning A1C levels since March 2025", accent: true },
          { value: "69,000", label: "notified of Stage 2 hypertension — many improved by their next visit" },
          { value: "290,000", label: "screened for sickle cell trait" },
        ],
      },
    },
    {
      id: "young-quote",
      kind: "content",
      title: "Health and supply, together",
      body: "Population-scale diagnostics turn the donor relationship into a public-health asset.",
      block: {
        kind: "quote",
        text: "We have a unique ability to raise awareness about the devastating impacts of chronic illness while advancing the health of our communities.",
        cite: "Dr. Pampee Young",
      },
    },
    {
      id: "invest-now",
      kind: "content",
      title: "Invest now",
      body: "The Future Blood Debt is mathematically guaranteed if we rely on outdated recruitment models. Averting it takes digital infrastructure, targeted generational recruitment, and population-health integration. Blood is not a charity — it is the logistical baseline of the healthcare system.",
      block: {
        kind: "stats",
        items: [
          { value: "16,000", label: "donations a day needed to secure the supply for 2045", accent: true },
          { value: "2045", label: "the deadline we are planning against" },
        ],
      },
    },
  ],
};

export const sections: Section[] = [blood101, collections, journey, distribution, futureDemand];

export const getSection = (id: string | undefined): Section | undefined =>
  sections.find((s) => s.id === id);

export const nextSectionId = (id: string): string | undefined => {
  const i = sections.findIndex((s) => s.id === id);
  return i >= 0 && i < sections.length - 1 ? sections[i + 1].id : undefined;
};
