// Infographics displayed at /infographics (lightbox gallery behind the home easter egg).
// Files live in public/infographics/.
export type Infographic = {
  id: string;
  title: string;
  file: string;
};

export const infographics: Infographic[] = [
  {
    id: "future-blood-crisis",
    title: "Future Blood Crisis Analysis",
    file: "IG_Future_Blood_Crisis_Analysis.jpg",
  },
  {
    id: "supply-and-donor-trends",
    title: "Blood Supply and Donor Trends",
    file: "IG_Blood_Supply_and_Donor_Trends.jpg",
  },
  {
    id: "the-future-of-blood",
    title: "The Future of Blood",
    file: "IG_The_Future_of_Blood.jpg",
  },
  {
    id: "addressing-future-supply-demand",
    title: "Addressing Future Blood Supply & Demand",
    file: "IG_Addressing_Future_Blood_Supply_Demand.jpg",
  },
  {
    id: "supply-trends",
    title: "Future of Blood Supply Trends",
    file: "IG_Future_of_Blood_Supply_Trends.jpg",
  },
];

export const igPath = (file: string): string => `/infographics/${file}`;
