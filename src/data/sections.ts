import { componentBasics, donationMethods, journeyStages } from "./mockData";

export type Stat = { value: string; label: string; accent?: boolean };

export type SlideBlock =
  | { kind: "stats"; items: Stat[] }
  | { kind: "list"; items: { title: string; detail: string }[] }
  | { kind: "quote"; text: string; cite?: string }
  | { kind: "gap"; items: { value: string; label: string; dir: "up" | "down" }[] }
  | { kind: "ratio"; from: string; to: string; label: string; note?: string }
  | { kind: "proportion"; items: Stat[] }
  | { kind: "magnitude"; items: Stat[] }
  | { kind: "bigstat"; value: string; label: string; context?: string }
  | { kind: "timeline"; items: { time: string; title: string; detail: string }[] }
  | { kind: "pipeline"; steps: string[]; current: number }
  | { kind: "split"; items: { title: string; detail: string }[] };

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

/* ==================================================================== */
/* 01 — Blood 101 :: "Blood can't be made"                               */
/* ==================================================================== */

const blood101: Section = {
  id: "blood-101",
  index: "01",
  title: "Blood 101",
  tagline: "The quiet backbone of modern medicine.",
  question: "Why does blood donation matter?",
  cover: "/covers/blood-101.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "Blood can't be made.",
      body: "There is no factory and no substitute. Every unit a patient receives began in another person's arm. The entire system — trauma, surgery, cancer, childbirth — runs on volunteers.",
    },
    {
      id: "backbone",
      kind: "content",
      title: "Medicine's quiet backbone",
      body: "Behind nearly every dramatic rescue is something undramatic: a bag of blood someone donated weeks before it was needed. When that backstock thins, everything downstream gets harder.",
      block: {
        kind: "quote",
        text: "The U.S. blood supply is at its lowest level in over a decade.",
        cite: "Dr. Ruchika Goel, AABB 2025",
      },
    },
    {
      id: "the-clock",
      kind: "content",
      title: "A clock that never stops",
      body: "Demand doesn't pause for nights, weekends, or storms. The shelf has to be refilled every single day.",
      block: {
        kind: "stats",
        items: [
          { value: "every 2 seconds", label: "someone in the U.S. needs blood", accent: true },
          { value: "13,000", label: "whole-blood donations needed daily" },
          { value: "~29,000", label: "units of red cells needed daily" },
        ],
      },
    },
    {
      id: "one-gift",
      kind: "content",
      title: "One gift, up to three lives",
      body: "A single whole-blood donation is separated into its components — so one visit can reach three different patients.",
      block: {
        kind: "list",
        items: componentBasics.map((c) => ({ title: c.title, detail: `${c.patientUse} ${c.storage}` })),
      },
    },
    {
      id: "ways",
      kind: "content",
      title: "Choose how you give",
      body: "Different donations serve different patients. The right one depends on your schedule and your blood type.",
      block: {
        kind: "list",
        items: donationMethods.map((m) => ({ title: m.title, detail: `${m.duration} · every ${m.frequency.replace(/^Every\s*/i, "")} · ${m.description}` })),
      },
    },
    {
      id: "the-few",
      kind: "content",
      title: "The rarest resource is the donor",
      body: "Only about 3% of eligible Americans give in a year — and the supply needs all of us. Half of Latino and Black donors carry the universal Type O that emergency rooms reach for first.",
      block: {
        kind: "proportion",
        items: [
          { value: "3%", label: "of eligible Americans donate in a given year", accent: true },
          { value: "~50%", label: "of Latino & Black donors carry universal Type O" },
          { value: "1 → 3", label: "patients helped by a single donation" },
        ],
      },
    },
    {
      id: "carry-the-cure",
      kind: "content",
      title: "You already carry the cure",
      body: "No lab can manufacture what's in your veins. That's why one ordinary hour can be the most extraordinary thing you do all year.",
    },
    {
      id: "volunteer",
      kind: "content",
      title: "Be the chain",
      body: "Blood donation runs on volunteers — and the system needs you in more roles than the chair.",
      block: {
        kind: "list",
        items: [
          { title: "Donate", detail: "Whole blood, platelets, plasma, or Power Red. Schedule at RedCrossBlood.org or the Blood Donor App." },
          { title: "Host a drive", detail: "Workplaces, schools, faith communities, and clubs anchor the calendar — one drive can collect dozens of units." },
          { title: "Spread the word", detail: "Share your appointment, your story, and the reminders that bring first-timers back for their second visit." },
        ],
      },
    },
  ],
};

/* ==================================================================== */
/* 02 — Biomed Collections :: "We bring the chair to you"                */
/* ==================================================================== */

const collections: Section = {
  id: "collections",
  index: "05",
  title: "BioMed Collections",
  tagline: "Meeting donors where they already are.",
  question: "Where does blood donation happen?",
  cover: "/covers/biomed-collections.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "We bring the chair to you.",
      body: "Most donors never walk into a center. The blood drive comes to them — a workplace lobby, a school gym, a church basement, a bus in a parking lot.",
    },
    {
      id: "two-doors",
      kind: "content",
      title: "Two front doors",
      body: "The system meets people two ways — and needs both.",
      block: {
        kind: "split",
        items: [
          { title: "Fixed sites", detail: "Permanent donor centers that anchor a community and support time-intensive donations like platelets." },
          { title: "Mobile drives", detail: "Pop-up drives hosted by employers, schools, and faith groups that carry donation into every county." },
        ],
      },
    },
    {
      id: "engine",
      kind: "content",
      title: "A nationwide collection engine",
      body: "Keeping shelves full takes a relentless, year-round cadence — millions of donations, one appointment at a time.",
      block: {
        kind: "magnitude",
        items: [
          { value: "4.6M", label: "whole-blood donations collected a year", accent: true },
          { value: "1.1M", label: "platelet donations collected a year" },
          { value: "6.4M", label: "blood products delivered to patients a year" },
        ],
      },
    },
    {
      id: "mobile-collections",
      kind: "content",
      title: "Mobile collections: the chair on the move",
      body: "Mobile drives extend the blood mission into communities — through employers, schools, faith groups, and local sponsors. For the national view, the live Jurisdiction Dashboard and Explore Regions let you filter mobile collections by Division, Region, and Chapter.",
      block: {
        kind: "list",
        items: [
          { title: "National reach", detail: "Pop-up drives carry donation into nearly every county, not just where a center stands." },
          { title: "Sponsor-hosted", detail: "Workplaces, campuses, and faith communities host the calendar and rally their own turnout." },
          { title: "Filterable live", detail: "Division, Region, and Chapter views of mobile collections live in the signed-in BioMed maps." },
        ],
      },
    },
    {
      id: "built-on-summer",
      kind: "content",
      title: "A supply built on summer break",
      body: "Nearly a third of donations come from high-school and college students. When campuses empty for summer, the supply thins — exactly when travel and accidents climb.",
      block: {
        kind: "proportion",
        items: [
          { value: "30%", label: "of the supply relies on student donors", accent: true },
          { value: "35%", label: "drop in national supply seen in a single month" },
        ],
      },
    },
    {
      id: "every-generation",
      kind: "content",
      title: "Every generation needs a different ask",
      body: "Why people give — and how to reach them — has changed. One playbook no longer works.",
      block: {
        kind: "list",
        items: [
          { title: "Baby Boomers", detail: "Give out of altruism and institutional trust. Reached through local drives and faith communities." },
          { title: "Millennials", detail: "Give for social impact. Reached through workplaces and social media — convenience-first." },
          { title: "Gen Z", detail: "Give around identity and peer proof. Reached through mobile apps and creators — gamified and transparent." },
        ],
      },
    },
    {
      id: "fixed-sites",
      kind: "content",
      title: "Fixed sites: standing capacity",
      body: "Fixed sites are permanent donor centers that anchor a community and support time-intensive donations like platelets. The Fixed Site Growth Program is a strategic effort to strengthen access, capacity, and reliability — its exact goals are being confirmed with BioMed leadership.",
      block: {
        kind: "list",
        items: [
          { title: "What they are", detail: "Standing locations for blood donation that complement the mobile drive calendar." },
          { title: "Fixed Site Growth Program", detail: "A strategic initiative to expand access, capacity, and community reach over time." },
          { title: "Filterable live", detail: "Division, Region, and Chapter views of fixed sites — and their trade areas — live in Explore Regions." },
        ],
      },
    },
    {
      id: "diversity",
      kind: "content",
      title: "Donor diversity and population representation",
      body: "Who donates matters to the mission. Donor populations and community representation shape both the collection story and patient outcomes. This is a high-level introduction — Explore Regions carries the deeper local story. Language here is drafted for review with Marketing & Communications.",
      block: {
        kind: "list",
        items: [
          { title: "African American donors", detail: "Closest-matched blood for many sickle cell patients — a high-leverage focus for the supply." },
          { title: "Latino donors", detail: "The fastest-growing share of the patient base and a generational opportunity for donation." },
          { title: "LGBTQ+ donors", detail: "Updated eligibility guidance welcomes many donors who were excluded under prior rules." },
        ],
      },
    },
    {
      id: "volunteer",
      kind: "content",
      title: "Volunteers run the door",
      body: "Collections is a people business at every step. Drives don't happen without volunteers planning them, hosting them, and walking donors through the experience.",
      block: {
        kind: "list",
        items: [
          { title: "Drive coordinators", detail: "Recruit sponsors, secure venues, set goals, and rally turnout in their own community." },
          { title: "Donor ambassadors", detail: "Greet, check in, escort donors through the visit, and run the recovery / canteen area." },
          { title: "Mobile crew support", detail: "Help set up and break down pop-up sites — workplace lobbies, school gyms, faith communities." },
        ],
      },
    },
    {
      id: "boundary",
      kind: "content",
      title: "A note on geography",
      body: "BioMed operational boundaries do not always align one-to-one with Humanitarian Services boundaries. Some geographic and operational exceptions exist, including areas where chapter, region, or division relationships may differ. The live maps show geography by name, and the boundary views are provided for orientation with known exceptions.",
      block: {
        kind: "split",
        items: [
          { title: "BioMed operational geography", detail: "Divisions, regions, and districts organized around how blood is collected and moved." },
          { title: "Humanitarian Services geography", detail: "Chapter boundaries shown for orientation — they may not match BioMed boundaries exactly." },
        ],
      },
    },
  ],
};

/* ==================================================================== */
/* 03 — Blood Journey :: "Ten minutes"                                   */
/* ==================================================================== */

const journey: Section = {
  id: "journey",
  index: "02",
  title: "Blood Journey",
  tagline: "Fifty-six days, and ten minutes.",
  question: "How does blood move from donor to patient?",
  cover: "/covers/blood-journey.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "Ten minutes.",
      body: "A first-time mother began hemorrhaging after birth and lost 40% of her blood. What saved her wasn't luck — it was a stranger who had donated 56 days earlier, and a chain that held.",
      block: {
        kind: "quote",
        text: "It was about 10 minutes from the time I started to feel faint until they had the blood in my system.",
        cite: "Reihaneh Hajbeigi, transfusion recipient",
      },
    },
    {
      id: "how-ready",
      kind: "content",
      title: "How the blood was ready in time",
      body: "Her transfusion looked instant. It was actually the end of a long, exacting journey that started weeks earlier in someone else's arm. Here is that path.",
      block: {
        kind: "pipeline",
        steps: journeyStages.map((s) => s.title),
        current: -1,
      },
    },
    ...journeyStages.map((stage, i) => ({
      id: `stage-${i + 1}`,
      kind: "content" as const,
      title: stage.title,
      body: stage.detail,
      block: {
        kind: "pipeline" as const,
        steps: journeyStages.map((s) => s.title),
        current: i,
      },
    })),
    {
      id: "ticking-clock",
      kind: "content",
      title: "The logistics ticking clock",
      body: "Blood can't be stockpiled. Every unit is manufactured and screened within hours of collection to beat strict expiration limits.",
      block: {
        kind: "timeline",
        items: [
          { time: "Hour 0", title: "Collection", detail: "The donation is gathered at a drive or fixed site." },
          { time: "Hour 4", title: "Processing", detail: "Centrifuges separate it into red cells, platelets, and plasma." },
          { time: "Hour 8", title: "Testing", detail: "Samples run a dozen infectious-disease tests and blood typing." },
          { time: "Hour 16", title: "Last mile", detail: "Components are matched and routed to the hospitals that need them most." },
        ],
      },
    },
    {
      id: "safety-gauntlet",
      kind: "content",
      title: "A gauntlet of safety",
      body: "Before a unit reaches a patient it survives a multi-layer screen — donor history, enzyme immunoassays, and molecular testing for HIV, HCV, and HBV.",
      block: {
        kind: "bigstat",
        value: "<1 in 1M",
        label: "estimated HBV transmission risk after screening",
        context: "1.6M Babesia tests run each year in endemic regions",
      },
    },
    {
      id: "frictionless",
      kind: "content",
      title: "A frictionless front door",
      body: "Technology is shrinking the friction between intention and donation — and turning first-timers into regulars.",
      block: {
        kind: "list",
        items: [
          { title: "Clara AI", detail: "An assistant that answers eligibility questions and books the appointment." },
          { title: "RapidPass", detail: "A digital health questionnaire done on your phone — less time in the chair." },
          { title: "Track your blood", detail: "Donors can follow their unit to the hospital that receives it." },
        ],
      },
    },
    {
      id: "she-went-home",
      kind: "content",
      title: "Then she went home",
      body: "She walked out of the hospital with her newborn. Multiply that single moment by millions — that is what every careful step of this journey is for.",
    },
    {
      id: "volunteer",
      kind: "content",
      title: "Volunteers move the journey",
      body: "Every step from arm to bedside leans on people who show up — paid staff and thousands of volunteers side by side.",
      block: {
        kind: "list",
        items: [
          { title: "Donor ambassadors", detail: "Greet, check in, and recover donors at fixed sites and mobile drives." },
          { title: "Transportation specialists", detail: "Hand-deliver blood products from collection through processing to the hospitals that need them." },
          { title: "Drive coordinators", detail: "Plan, host, and run blood drives inside their own communities." },
        ],
      },
    },
  ],
};

/* ==================================================================== */
/* 04 — Hospital Distribution :: "The hard half"                         */
/* ==================================================================== */

const distribution: Section = {
  id: "distribution",
  index: "03",
  title: "Hospital Distribution",
  tagline: "Getting the right unit to the right bedside, in time.",
  question: "Which communities and hospitals are supported?",
  cover: "/covers/hospital-distribution.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "Blood only saves a life where the patient is.",
      body: "Collecting the blood is half the job. The harder half is moving the right unit to the right bedside before the clock runs out — across roughly 2,500 hospitals, every day.",
    },
    {
      id: "relentless",
      kind: "content",
      title: "Demand is relentless — and lumpy",
      body: "Need doesn't arrive evenly. A quiet week can break in a single afternoon: one highway crash can consume an entire shelf.",
      block: {
        kind: "stats",
        items: [
          { value: "up to 100", label: "units a single car-crash patient can require", accent: true },
          { value: "~29,000", label: "units of red cells needed every day" },
          { value: "< 2 days", label: "supply that regional inventories routinely fall to" },
        ],
      },
    },
    {
      id: "what-it-supports",
      kind: "content",
      title: "What a donation makes possible",
      body: "Every delivered unit is a person and a care team counting on it.",
      block: {
        kind: "list",
        items: [
          { title: "Trauma & emergency", detail: "Accidents, injury, and major blood loss where minutes decide everything." },
          { title: "Surgery & transplant", detail: "Planned procedures that can't begin without a ready supply on hand." },
          { title: "Cancer care", detail: "Chemotherapy that depends on steady platelets and red cells over months." },
          { title: "Childbirth", detail: "Maternal hemorrhage — a leading, survivable cause of death when blood is there." },
        ],
      },
    },
    {
      id: "when-tested",
      kind: "content",
      title: "When the chain is tested",
      body: "Hurricane Helene knocked out power and water at the Asheville Blood Center. A Red Cross team drove four hours through hazardous flooding to rescue 150 lifesaving units — and lost none.",
      block: {
        kind: "magnitude",
        items: [
          { value: "1,500", label: "blood drives cancelled by extreme weather in FY25", accent: true },
          { value: "40,000", label: "donations uncollected in a single year" },
        ],
      },
    },
    {
      id: "last-mile",
      kind: "content",
      title: "Closing the last mile",
      body: "Autonomous drone delivery is collapsing the distance — and the wastage — between the shelf and the bedside, with results measured in lives.",
      block: {
        kind: "proportion",
        items: [
          { value: "51%", label: "reduction in maternal mortality from hemorrhage", accent: true },
          { value: "63%", label: "reduction in on-site hospital inventory needs" },
          { value: "40%", label: "reduction in blood wasted" },
        ],
      },
    },
    {
      id: "volunteer",
      kind: "content",
      title: "Volunteers close the last mile",
      body: "Distribution depends on people who can roll on short notice — especially when weather, surge demand, or disaster reshape the route overnight.",
      block: {
        kind: "list",
        items: [
          { title: "Transportation specialists", detail: "Hand-deliver blood products from distribution centers to hospitals, often within hours of the request." },
          { title: "Disaster + emergency teams", detail: "Stand up alternate logistics when normal routes break — the same network that powers Red Cross disaster response." },
          { title: "Community drive hosts", detail: "Refill the shelves at the source so the last mile has something to deliver." },
        ],
      },
    },
  ],
};

/* ==================================================================== */
/* 05 — Future Demand :: "The Future Blood Debt"                         */
/* ==================================================================== */

const futureDemand: Section = {
  id: "future-demand",
  index: "04",
  title: "Future Demand",
  tagline: "Averting the demographic collapse of the blood supply.",
  question: "What pressures make donors matter more over time?",
  cover: "/covers/future-demand.png",
  slides: [
    {
      id: "hero",
      kind: "hero",
      title: "The Future Blood Debt",
      body: "An aging population needs more blood while the eligible donor base shrinks. Left on today's model, the math doesn't balance — and the gap arrives faster than most people think.",
    },
    {
      id: "two-people",
      kind: "content",
      title: "Two people, one supply",
      body: "Demand rises sharply as populations age — peak need sits with patients over 70 — while the youth donor pool shrinks at the same time. That is a structural impossibility, not a bad year.",
      block: {
        kind: "ratio",
        from: "2",
        to: "1",
        label: "in ~20 years, two people will rely on a supply sized for one",
        note: "70+ — the age group driving peak demand",
      },
    },
    {
      id: "hourglass",
      kind: "content",
      title: "The demographic hourglass",
      body: "A population reshaping into a top-heavy hourglass can't sustain a model built on youthful altruism. The warning sign is already abroad: Korea's donations fell 10% in five years.",
      block: {
        kind: "gap",
        items: [
          { value: "+29.5%", label: "projected demand by 2045", dir: "up" },
          { value: "−35.5%", label: "projected supply by 2045", dir: "down" },
        ],
      },
    },
    {
      id: "symptoms",
      kind: "content",
      title: "Symptoms vs. the real disease",
      body: "Shortages make headlines as one-off shocks. The deeper cause is demographic — and it doesn't pass.",
      block: {
        kind: "list",
        items: [
          { title: "The shocks", detail: "A 35% drop in a single month; summer lulls; flu seasons that sideline donors." },
          { title: "The squeeze", detail: "Falling birth rates mean fewer young, healthy donors to replace aging ones." },
          { title: "The cap", detail: "Age limits sideline the fastest-growing group — the one that consumes the most blood." },
        ],
      },
    },
    {
      id: "integration",
      kind: "content",
      title: "From charity to integration",
      body: "The old model — one-way charity on pure altruism — is mathematically unsustainable. The answer is to make donation a two-way relationship: give blood, get back your own health data.",
    },
    {
      id: "dashboard",
      kind: "content",
      title: "A free health screening, every visit",
      body: "Turn each donation into an ongoing health record — blood pressure, hemoglobin, pulse, and periodic A1C — and donors gain a reason to keep coming back.",
      block: {
        kind: "magnitude",
        items: [
          { value: "80,000", label: "donors alerted to concerning A1C levels in a year", accent: true },
          { value: "69,000", label: "notified of Stage 2 hypertension — many improved by their next visit" },
        ],
      },
    },
    {
      id: "predictive",
      kind: "content",
      title: "From reactive to predictive",
      body: "AI forecasting reads weather, illness trends, and scheduled surgeries to collect the right components before shortages hit — replacing paper tracking and guesswork.",
      block: {
        kind: "gap",
        items: [
          { value: "+11%", label: "more blood collected", dir: "up" },
          { value: "−20%", label: "less inventory wasted", dir: "down" },
        ],
      },
    },
    {
      id: "young-quote",
      kind: "content",
      title: "Supply and health, together",
      body: "Done right, the blood system becomes a public-health asset — not just a collection agency.",
      block: {
        kind: "quote",
        text: "We have a unique ability to raise awareness about the devastating impacts of chronic illness while advancing the health of our communities.",
        cite: "Dr. Pampee Young",
      },
    },
    {
      id: "invest-now",
      kind: "content",
      title: "Blood is not a charity — it's infrastructure",
      body: "The Future Blood Debt is guaranteed if we rely on outdated recruitment. Averting it takes investment now: digital infrastructure, every-generation recruitment, and health integration.",
      block: {
        kind: "bigstat",
        value: "16,000",
        label: "donations a day to secure the supply for 2045",
        context: "2045 — the deadline we're planning against",
      },
    },
  ],
};

export const sections: Section[] = [blood101, journey, distribution, futureDemand, collections];

export const getSection = (id: string | undefined): Section | undefined =>
  sections.find((s) => s.id === id);

export const nextSectionId = (id: string): string | undefined => {
  const i = sections.findIndex((s) => s.id === id);
  return i >= 0 && i < sections.length - 1 ? sections[i + 1].id : undefined;
};
