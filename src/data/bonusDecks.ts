// Bonus slide decks (NotebookLM exports) surfaced behind the home easter egg.
// Each deck = page images at public/decks/<id>/p-01.jpg … p-NN.jpg (2-digit, 16:9).
// `pdf` is the SD_-prefixed source PDF in public/decks/ for direct download.
export type BonusDeck = {
  id: string;
  title: string;
  pages: number;
  pdf: string;
};

export const bonusDecks: BonusDeck[] = [
  { id: "blood-ledger",            title: "The Blood Ledger",            pages: 21, pdf: "SD_The_Blood_Ledger.pdf" },
  { id: "future-blood-debt",       title: "The Future Blood Debt",       pages: 14, pdf: "SD_The_Future_Blood_Debt.pdf" },
  { id: "biological-supply-chain", title: "The Biological Supply Chain", pages: 14, pdf: "SD_The_Biological_Supply_Chain.pdf" },
  { id: "vital-pipeline",          title: "The Vital Pipeline",          pages: 14, pdf: "SD_The_Vital_Pipeline.pdf" },
  { id: "networked-lifeline",      title: "The Networked Lifeline",      pages: 14, pdf: "SD_The_Networked_Lifeline.pdf" },
];

export const getBonusDeck = (id: string | undefined): BonusDeck | undefined =>
  bonusDecks.find((d) => d.id === id);

/** Image path for a 1-based page number. */
export const deckPage = (id: string, page: number): string =>
  `/decks/${id}/p-${String(page).padStart(2, "0")}.jpg`;

/** Public path for the deck's downloadable PDF. */
export const deckPdf = (deck: BonusDeck): string => `/decks/${deck.pdf}`;
