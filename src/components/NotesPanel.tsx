import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase, SUPABASE_READY } from "../lib/supabase";
import "./NotesPanel.css";

/* ---------- types + storage ---------- */

type Kind = "note" | "question" | "answer";
type Status = "open" | "resolved";
type Note = {
  id: string;
  page: string;
  author: string;
  text: string;
  ts: number;
  kind: Kind;
  status: Status;
};

const TABLE = "biomed_notes";
const LOCAL_KEY = "biomed-notes-v1";
const KINDS: Kind[] = ["note", "question", "answer"];
const STATUSES: Status[] = ["open", "resolved"];

// Fallback seed used only when Supabase isn't reachable.
const SEED: Note[] = [
  {
    id: "seed-fd-q",
    page: "/s/future-demand",
    author: "Client",
    text: "Verify data accuracy and sources.",
    ts: 1717608000000,
    kind: "question",
    status: "open",
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
    status: "open",
  },
  {
    id: "seed-b101-q",
    page: "/s/blood-101",
    author: "Client",
    text: "Validate content with Marketing & Communications.",
    ts: 1717608000002,
    kind: "question",
    status: "open",
  },
];

function normalizeNote(raw: Partial<Note>): Note | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.page !== "string" || typeof raw.text !== "string") {
    return null;
  }
  return {
    id: raw.id,
    page: raw.page,
    author: typeof raw.author === "string" && raw.author.trim() ? raw.author : "Jeff",
    text: raw.text,
    ts: typeof raw.ts === "number" && Number.isFinite(raw.ts) ? raw.ts : Date.now(),
    kind: raw.kind && KINDS.includes(raw.kind) ? raw.kind : "note",
    status: raw.status && STATUSES.includes(raw.status) ? raw.status : "open",
  };
}

function normalizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const note = normalizeNote(item as Partial<Note>);
    return note ? [note] : [];
  });
}

function readLocal(): Note[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return SEED;
    const parsed = normalizeNotes(JSON.parse(raw));
    return parsed.length > 0 ? parsed : SEED;
  } catch {
    return SEED;
  }
}

function writeLocal(notes: Note[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(notes));
  } catch {
    /* ignore quota errors */
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
  const [mode, setMode] = useState<"shared" | "local">(SUPABASE_READY ? "shared" : "local");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAllPages, setShowAllPages] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch from Supabase. Falls back to local on any failure.
  const refresh = useCallback(async () => {
    if (!supabase) {
      setMode("local");
      setNotes(readLocal());
      return;
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, page, author, text, kind, ts, status")
      .order("ts", { ascending: true });
    if (error) {
      setMode("local");
      setError(error.message);
      setNotes(readLocal());
      return;
    }
    setNotes(normalizeNotes(data ?? []));
    setMode("shared");
    setError(null);
    setLastSyncedAt(Date.now());
  }, []);

  // Initial fetch + realtime subscription for live updates.
  useEffect(() => {
    void refresh();
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel("biomed_notes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh]);

  // Mirror to localStorage so the local fallback always has the latest set.
  useEffect(() => {
    if (mode === "shared") writeLocal(notes);
    else writeLocal(notes);
  }, [mode, notes]);

  const pageNotes = useMemo(
    () => notes.filter((n) => n.page === page).sort((a, b) => a.ts - b.ts),
    [notes, page],
  );
  const openNotes = useMemo(() => notes.filter((n) => n.status === "open"), [notes]);
  const pageOpenNotes = useMemo(() => pageNotes.filter((n) => n.status === "open"), [pageNotes]);
  const visibleNotes = useMemo(
    () =>
      (showAllPages ? notes : pageNotes)
        .filter((n) => !openOnly || n.status === "open")
        .slice()
        .sort((a, b) => a.ts - b.ts),
    [notes, openOnly, pageNotes, showAllPages],
  );

  const pageLabel = PAGE_LABELS[page] ?? page;
  const unreadCount = pageOpenNotes.length;
  const scopeLabel = showAllPages
    ? openOnly
      ? "Open items across pages"
      : "All pages"
    : openOnly
      ? `${pageLabel} open items`
      : pageLabel;
  const syncLabel =
    mode === "shared"
      ? `Shared live${lastSyncedAt ? ` - refreshed ${fmtTime(lastSyncedAt)}` : ""}`
      : "Local fallback - this browser only";

  const add = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: Note = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      page,
      author,
      text: trimmed,
      ts: Date.now(),
      kind,
      status: "open",
    };
    // Optimistic: show the note immediately. The realtime subscription will
    // reconcile shortly; if the insert fails we roll back.
    setNotes((all) => [...all, note]);
    setText("");
    setBusy(true);
    if (supabase) {
      const { error } = await supabase.from(TABLE).insert(note);
      if (error) {
        setError(error.message);
        setMode("local");
        // Keep the optimistic copy; local mode will persist it.
      } else {
        setError(null);
        setMode("shared");
        setLastSyncedAt(Date.now());
      }
    }
    setBusy(false);
  };

  const updateStatus = async (id: string, status: Status) => {
    const prev = notes;
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, status } : n)));
    setBusy(true);
    if (supabase) {
      const { error } = await supabase.from(TABLE).update({ status }).eq("id", id);
      if (error) {
        setError(error.message);
        setMode("local");
        setNotes(prev);
      } else {
        setNotes((all) => all.map((n) => (n.id === id ? { ...n, status } : n)));
        setError(null);
        setMode("shared");
        setLastSyncedAt(Date.now());
      }
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    // Optimistic removal — rolled back if the server delete fails.
    const prev = notes;
    setNotes((all) => all.filter((n) => n.id !== id));
    setBusy(true);
    if (supabase) {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) {
        setError(error.message);
        setMode("local");
        setNotes(prev);
      } else {
        setNotes((all) => all.filter((n) => n.id !== id));
        setError(null);
        setMode("shared");
        setLastSyncedAt(Date.now());
      }
    }
    setBusy(false);
  };

  const copyPage = async () => {
    const lines = visibleNotes.map(
      (n) =>
        `[${fmtTime(n.ts)}] ${PAGE_LABELS[n.page] ?? n.page} - ${n.author} (${n.kind}, ${n.status}):\n${n.text}\n`,
    );
    const body = `Notes for ${scopeLabel}${showAllPages ? "" : ` (${page})`}\n\n${lines.join("\n")}`;
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
      const parsed = normalizeNotes(JSON.parse(raw));
      if (parsed.length === 0) return;
      setBusy(true);
      if (supabase) {
        // Upsert each — server is the source of truth.
        const { error } = await supabase.from(TABLE).upsert(parsed);
        if (error) setError(error.message);
        await refresh();
      } else {
        const byId = new Map<string, Note>();
        [...notes, ...parsed].forEach((n) => byId.set(n.id, n));
        setNotes([...byId.values()]);
      }
      setBusy(false);
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
        onClick={() => {
          setOpen(true);
          void refresh();
        }}
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
                <h2 className="np-title">{scopeLabel}</h2>
                <p className="np-path mono">{page}</p>
                <p className="np-sync mono">{syncLabel}</p>
              </div>
              <button type="button" className="np-close" aria-label="Close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </header>

            <div className="np-actions">
              <button type="button" className="np-btn" onClick={copyPage}>
                {showAllPages ? "Copy all notes" : "Copy page notes"}
              </button>
              <button type="button" className="np-btn" onClick={() => setShowAllPages((value) => !value)}>
                {showAllPages ? "This page" : `All pages (${notes.length})`}
              </button>
              <button
                type="button"
                className={`np-btn ${openOnly ? "np-btn--active" : ""}`}
                onClick={() => {
                  if (openOnly) {
                    setOpenOnly(false);
                  } else {
                    setShowAllPages(true);
                    setOpenOnly(true);
                  }
                }}
              >
                {openOnly ? "All statuses" : `Open only (${openNotes.length})`}
              </button>
              <button type="button" className="np-btn" onClick={exportAll}>
                Export all
              </button>
              <button type="button" className="np-btn" onClick={() => fileRef.current?.click()}>
                Import
              </button>
              <button type="button" className="np-btn" onClick={() => void refresh()} disabled={busy}>
                {busy ? "Working..." : "Refresh"}
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
              {visibleNotes.length === 0 ? (
                <p className="np-empty">
                  {openOnly && showAllPages
                    ? "No open notes across any page."
                    : openOnly
                      ? "No open notes for this page."
                      : showAllPages
                    ? "No shared notes yet. Add the first one below."
                    : "No notes yet for this page. Add the first one below."}
                </p>
              ) : (
                visibleNotes.map((n) => (
                  <article className={`np-note np-note--${n.kind} np-note--${n.status}`} key={n.id}>
                    <header className="np-note__head">
                      <span className="np-note__author">{n.author}</span>
                      <span className="np-note__kind">{n.kind}</span>
                      <span className={`np-note__status np-note__status--${n.status}`}>
                        {n.status === "open" ? "Open" : "Resolved"}
                      </span>
                      {showAllPages && <span className="np-note__page">{PAGE_LABELS[n.page] ?? n.page}</span>}
                      <span className="np-note__ts mono">{fmtTime(n.ts)}</span>
                      <span className="np-note__actions">
                        <button
                          type="button"
                          className="np-note__resolve"
                          aria-label={n.status === "open" ? "Resolve note" : "Reopen note"}
                          onClick={() => void updateStatus(n.id, n.status === "open" ? "resolved" : "open")}
                          disabled={busy}
                        >
                          {n.status === "open" ? "Resolve" : "Reopen"}
                        </button>
                        <button
                          type="button"
                          className="np-note__del"
                          aria-label="Delete note"
                          onClick={() => void remove(n.id)}
                          disabled={busy}
                        >
                          ✕
                        </button>
                      </span>
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
                {busy ? "Saving..." : "Save"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
