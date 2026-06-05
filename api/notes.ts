// Shared notes API backed by Vercel KV.
// Endpoints:
//   GET    /api/notes           -> all notes (array)
//   POST   /api/notes           -> add a note ({ page, author, text, kind })
//   DELETE /api/notes?id=<id>   -> remove a note by id
//
// Requires Vercel KV env vars (auto-populated when a KV store is linked to the
// Vercel project): KV_REST_API_URL, KV_REST_API_TOKEN.

import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const KEY = "biomed-notes-v1";

type Kind = "note" | "question" | "answer";
type Note = {
  id: string;
  page: string;
  author: string;
  text: string;
  ts: number;
  kind: Kind;
};

// First-load seed — mirrors the local UX so an empty store doesn't look broken.
const SEED: Note[] = [
  {
    id: "seed-fd-q",
    page: "/s/future-demand",
    author: "Client",
    text: "Verify data accuracy and sources.",
    ts: 1717608000000,
    kind: "question",
  },
  {
    id: "seed-fd-a",
    page: "/s/future-demand",
    author: "Jeff",
    text:
      "Sources behind this chapter's stats:\n" +
      "• +29.5% demand / −35.5% supply / 2 → 1 ratio: Averting the Future Blood Debt (demographic projection through 2045).\n" +
      "• 13,000 daily / 35% single-month shock / 30% student dependency / 16,000 per day: AABB + Red Cross operating data (FY24–FY25).\n" +
      "• +11% collections / −20% waste: Red Cross AI forecasting pilot.\n" +
      "• 80,000 A1C alerts / 69,000 hypertension alerts: donor health screening program.\n" +
      "Marketing & Communications should review before final release.",
    ts: 1717608000001,
    kind: "answer",
  },
  {
    id: "seed-b101-q",
    page: "/s/blood-101",
    author: "Client",
    text: "Validate content with Marketing & Communications.",
    ts: 1717608000002,
    kind: "question",
  },
];

const MAX_NOTES = 500;
const MAX_TEXT = 4000;
const MAX_AUTHOR = 40;
const MAX_PAGE = 200;

const trim = (s: unknown, max: number) =>
  String(s ?? "").trim().slice(0, max);

const validKind = (k: unknown): Kind =>
  k === "question" || k === "answer" ? k : "note";

async function readAll(): Promise<Note[]> {
  const stored = (await kv.get<Note[]>(KEY)) ?? null;
  if (stored && Array.isArray(stored)) return stored;
  // First request — seed the store and return the seed.
  await kv.set(KEY, SEED);
  return SEED;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // No KV creds configured yet — fail loud so the client can fall back to
  // local-only storage and we know what's wrong.
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res
      .status(503)
      .json({ error: "Vercel KV is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN." });
  }

  try {
    if (req.method === "GET") {
      const notes = await readAll();
      return res.status(200).json(notes);
    }

    if (req.method === "POST") {
      const body = (req.body || {}) as Partial<Note>;
      const text = trim(body.text, MAX_TEXT);
      const page = trim(body.page, MAX_PAGE);
      if (!text || !page) {
        return res.status(400).json({ error: "page and text are required" });
      }
      const note: Note = {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        page,
        author: trim(body.author, MAX_AUTHOR) || "Anonymous",
        text,
        ts: Date.now(),
        kind: validKind(body.kind),
      };
      const notes = await readAll();
      notes.push(note);
      // Cap total to avoid runaway storage.
      const trimmed = notes.length > MAX_NOTES ? notes.slice(-MAX_NOTES) : notes;
      await kv.set(KEY, trimmed);
      return res.status(200).json(note);
    }

    if (req.method === "DELETE") {
      const id = trim(req.query.id, 200);
      if (!id) return res.status(400).json({ error: "id query param required" });
      const notes = await readAll();
      const filtered = notes.filter((n) => n.id !== id);
      await kv.set(KEY, filtered);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
