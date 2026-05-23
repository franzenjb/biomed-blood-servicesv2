import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sections } from "../data/sections";
import RcMark from "./RcMark";
import "./AppMenu.css";

export default function AppMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Esc closes; lock scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        data-testid="menu-trigger"
      >
        <span className="menu-trigger__bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Explore
      </button>

      {open && (
        <div
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          data-testid="menu-overlay"
        >
          <div className="menu-overlay__bar">
            <Link to="/" className="menu-overlay__brand">
              <RcMark size={26} />
              <span>
                Red Cross <strong>Blood Services</strong>
              </span>
            </Link>
            <button
              type="button"
              className="menu-close"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              data-testid="menu-close"
            >
              Close ✕
            </button>
          </div>

          <nav className="menu-grid" aria-label="Sections">
            {sections.map((s) => (
              <Link
                key={s.id}
                to={`/s/${s.id}`}
                className="menu-card"
                style={{ backgroundImage: `url(${s.cover})` }}
                data-testid={`menu-card-${s.id}`}
              >
                <span className="menu-card__scrim" />
                <span className="menu-card__index mono">{s.index}</span>
                <span className="menu-card__body">
                  <span className="menu-card__title">{s.title}</span>
                  <span className="menu-card__q">{s.question}</span>
                </span>
              </Link>
            ))}

            <button
              type="button"
              className="menu-card menu-card--map"
              onClick={() => navigate("/map")}
              data-testid="menu-card-map"
            >
              <span className="menu-card__index mono">06</span>
              <span className="menu-card__body">
                <span className="menu-card__title">Map &amp; Data</span>
                <span className="menu-card__q">Explore collections and reach on a live map.</span>
              </span>
            </button>
          </nav>

          <div className="menu-overlay__foot">
            <Link to="/" className="menu-foot-link">
              ← Home
            </Link>
            <span className="mono menu-overlay__tag">DONOR EDUCATION · FUNDRAISER DEMO</span>
          </div>
        </div>
      )}
    </>
  );
}
