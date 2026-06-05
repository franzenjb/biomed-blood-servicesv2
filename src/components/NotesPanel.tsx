import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./NotesPanel.css";

/* ---------- types + storage ---------- */

type Kind = "note" | "question" | "answer";
type Note = {
  id: string;
  page: string;
  author: string;
  text: string;
  ts: number;
  kind: Kind;
};

const LOCAL_KEY = "biomed-notes-v1";
const POLL_MS = 20_000;

// First-load seed used only when the API isn't reachable (offline fallback).
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

function readLocal(): Note[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return SEED;
    return JSON.parse(raw) as Note[];
  } catch {
    return SEED;
  }
}

function writeLocal(notes: Note[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(notes));
  } catch {
    /* ignore */
  }
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/hub": "Hub",
  "/regions": "Explore Regions",
  "/map": "BioMed Blood Map",
  "/dashboard": "Jurisdiction Dashboard",
  "/infographics": "Infographics",
  "/decks": "Bonus Decks",
  "/s/blood-101": "Blood 101",
  "/s/journey": "Blood Journey",
  "/s/distribution": "Hospital Distribution",
  "/s/future-demand": "Future Demand",
  "/s/collections": "Biomed Collections",
};

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/* ---------- component ---------- */

export default function NotesPanel() {
  const location = useLocation();
  const page = location.pathname;
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>(() => readLocal());
  const [author, setAuthor] = useState<string>("Jeff");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("note");
  const [mode, setMode] = useState<"shared" | "local">("local");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/notes", { cache: "no-store" });
      if (!r.ok) {
        if (r.status === 503) {
          setMode("local");
          setError(null);
          setNotes(readLocal());
          return;
        }
        throw new Error(`GET /api/notes ${r.status}`);
      }
      const data = (await r.json()) as Note[];
      setNotes(Array.isArray(data) ? data : []);
      setMode("shared");
      setError(null);
    } catch (e) {
      setMode("local");
      setError(e instanceof Error ? e.message : "Network error");
      setNotes(readLocal());
    }
  }, []);

  // Initial fetch + polling while the panel is open.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [open, refresh]);

  // Whenever notes change AND we're in local mode, persist to localStorage.
  useEffect(() => {
    if (mode === "local") writeLocal(notes);
  }, [mode, notes]);

  const pageNotes = useMemo(
    () => notes.filter((n) => n.page === page).sort((a, b) => a.ts - b.ts),
    [notes, page],
  );

  const pageLabel = PAGE_LABELS[page] ?? page;
  const unreadCount = pageNotes.length;

  const add = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (mode === "shared") {
      try {
        const r = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, author, text: trimmed, kind }),
        });
        if (!r.ok) throw new Error(`POST ${r.status}`);
        const saved = (await r.json()) as Note;
        setNotes((all) => [...all, saved]);
        setText("");
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
        setMode("local");
        // fall through to local
      }
    }
    const n: Note = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      page,
      author,
      text: trimmed,
      ts: Date.now(),
      kind,
    };
    setNotes((all) => [...all, n]);
    setText("");
  };

  const remove = async (id: string) => {
    if (mode === "shared") {
      try {
        const r = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!r.ok) throw new Error(`DELETE ${r.status}`);
        setNotes((all) => all.filter((n) => n.id !== id));
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
        setMode("local");
      }
    }
    setNotes((all) => all.filter((n) => n.id !== id));
  };

  const copyPage = async () => {
    const lines = pageNotes.map(
      (n) => `[${fmtTime(n.ts)}] ${n.author} (${n.kind}):\n${n.text}\n`,
    );
    const body = `Notes for ${pageLabel} (${page})\n\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* clipboard blocked; ignore */
    }
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biomed-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Note[];
      if (!Array.isArray(parsed)) return;
      const byId = new Map<string, Note>();
      [...notes, ...parsed].forEach((n) => byId.set(n.id, n));
      setNotes([...byId.values()]);
    } catch {
      /* invalid file — ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        className="np-fab"
        aria-label={`Notes — ${pageLabel}`}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="14 3 14 9 20 9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        {unreadCount > 0 && <span className="np-fab__count mono">{unreadCount}</span>}
      </button>

      {open && (
        <div className="np-overlay" role="dialog" aria-label="Notes" onClick={() => setOpen(false)}>
          <aside className="np-panel" onClick={(e) => e.stopPropagation()}>
            <header className="np-header">
              <div>
                <p className="np-eyebrow">
                  Notes &amp; questions
                  <span className={`np-mode np-mode--${mode}`}>
                    {mode === "shared" ? "shared (live)" : "local (this device)"}
                  </span>
                </p>
                <h2 className="np-title">{pageLabel}</h2>
                <p className="np-path mono">{page}</p>
              </div>
              <button type="button" className="np-close" aria-label="Close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </header>

            <div className="np-actions">
              <button type="button" className="np-btn" onClick={copyPage}>
                Copy page notes
              </button>
              <button type="button" className="np-btn" onClick={exportAll}>
                Export all
              </button>
              <button type="button" className="np-btn" onClick={() => fileRef.current?.click()}>
                Import
              </button>
              <button type="button" className="np-btn" onClick={() => void refresh()}>
                Refresh
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importAll(f);
                  e.target.value = "";
                }}
              />
            </div>

            {error && <p className="np-error mono">⚠ {error}</p>}

            <div className="np-list">
              {pageNotes.length === 0 ? (
                <p className="np-empty">No notes yet for this page. Add the first one below.</p>
              ) : (
                pageNotes.map((n) => (
                  <article className={`np-note np-note--${n.kind}`} key={n.id}>
                    <header className="np-note__head">
                      <span className="np-note__author">{n.author}</span>
                      <span className="np-note__kind">{n.kind}</span>
                      <span className="np-note__ts mono">{fmtTime(n.ts)}</span>
                      <button
                        type="button"
                        className="np-note__del"
                        aria-label="Delete note"
                        onClick={() => void remove(n.id)}
                      >
                        ✕
                      </button>
                    </header>
                    <p className="np-note__text">{n.text}</p>
                  </article>
                ))
              )}
            </div>

            <form
              className="np-form"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <div className="np-form__row">
                <label className="np-label">
                  Author
                  <select value={author} onChange={(e) => setAuthor(e.target.value)}>
                    <option>Jeff</option>
                    <option>Client</option>
                    <option>M&amp;C</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="np-label">
                  Kind
                  <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                    <option value="note">Note</option>
                    <option value="question">Question</option>
                    <option value="answer">Answer</option>
                  </select>
                </label>
              </div>
              <textarea
                className="np-text"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Add a ${kind} for ${pageLabel}…`}
              />
              <button type="submit" className="np-submit" disabled={!text.trim()}>
                Save
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
