import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Info, X } from "lucide-react";
import RcMark from "./RcMark";
import {
  datasets,
  references,
  definitions,
  methodology,
  limitations,
  stewards,
  sectionTitles,
  type DataSourcesSectionId,
} from "../data/dataSources";
import "./DataSourcesModal.css";

const SECTION_ORDER: DataSourcesSectionId[] = [
  "sources",
  "references",
  "refresh",
  "definitions",
  "methodology",
  "limitations",
  "stewards",
];

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  maintained: "Maintained",
  pending: "Pending",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Accordion section to expand on open. Defaults to Data Sources. */
  initialSection?: DataSourcesSectionId;
};

/** The application-wide credibility layer (spec §30–32). */
export function DataSourcesModal({ open, onClose, initialSection = "sources" }: ModalProps) {
  const [openSection, setOpenSection] = useState<DataSourcesSectionId>(initialSection);

  useEffect(() => {
    if (open) setOpenSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (id: DataSourcesSectionId) =>
    setOpenSection((prev) => (prev === id ? prev : id));

  return (
    <div
      className="dsm"
      role="dialog"
      aria-modal="true"
      aria-label="Data Sources and Methodology"
      onClick={onClose}
    >
      <div className="dsm__card" onClick={(e) => e.stopPropagation()}>
        <header className="dsm__head">
          <span className="dsm__mark">
            <RcMark size={22} />
          </span>
          <p className="dsm__eyebrow">BioMed Capabilities</p>
          <button type="button" className="dsm__x" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="dsm__body">
          <p className="dsm__meta">Source transparency · the credibility layer behind every number</p>
          <h2 className="dsm__title">Data Sources &amp; Methodology</h2>
          <p className="dsm__lead">
            Every meaningful statistic in this application traces back to a documented source. Open a
            section to see where the data comes from, how current it is, what the terms mean, and where
            the numbers have known limits.
          </p>

          <div className="dsm__callout">
            <RcMark size={30} />
            <div>
              <strong>Defensible by Design</strong>
              <span>If someone asks “where did that come from?”, the answer is here.</span>
            </div>
          </div>

          <div className="dsm__accordion">
            {SECTION_ORDER.map((id) => {
              const isOpen = openSection === id;
              return (
                <section key={id} className={`dsm__acc${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="dsm__acc-trigger"
                    aria-expanded={isOpen}
                    onClick={() => toggle(id)}
                  >
                    <span>{sectionTitles[id]}</span>
                    <span className="dsm__acc-chevron" aria-hidden="true">
                      {isOpen ? "–" : "+"}
                    </span>
                  </button>
                  {isOpen && <div className="dsm__acc-panel">{renderSection(id)}</div>}
                </section>
              );
            })}
          </div>

          <p className="dsm__foot">
            <span className="dsm__foot-q">Question or suggestions?</span>{" "}
            <a href="mailto:jeff.franzen2@redcross.org?subject=BioMed%20Capabilities%20%E2%80%94%20data%20sources%20question%2Fsuggestion">
              Email Jeff Franzen
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function renderSection(id: DataSourcesSectionId) {
  switch (id) {
    case "sources":
      return (
        <div className="dsm__datasets">
          {datasets.map((d) => (
            <article key={d.id} className="dsm__dataset">
              <header>
                <h4>{d.name}</h4>
                <span className={`dsm__pill dsm__pill--${d.status}`}>{STATUS_LABEL[d.status]}</span>
              </header>
              <p>{d.description}</p>
              <dl>
                <div>
                  <dt>Used in</dt>
                  <dd>{d.usedIn}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{d.sourceSystem}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{d.owner}</dd>
                </div>
                {d.link && (
                  <div>
                    <dt>Item</dt>
                    <dd>
                      <a href={d.link} target="_blank" rel="noreferrer">
                        Open source item
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {d.notes && <p className="dsm__note">{d.notes}</p>}
            </article>
          ))}
        </div>
      );
    case "references":
      return (
        <ol className="dsm__refs">
          {references.map((source) => (
            <li key={source.title}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              ) : (
                <span>{source.title}</span>
              )}
              <em className="dsm__ref-kind">{source.kind}</em>
            </li>
          ))}
        </ol>
      );
    case "refresh":
      return (
        <dl className="dsm__deflist">
          {datasets.map((d) => (
            <div key={d.id}>
              <dt>{d.name}</dt>
              <dd>{d.refresh}</dd>
            </div>
          ))}
        </dl>
      );
    case "definitions":
      return (
        <dl className="dsm__deflist">
          {definitions.map((d) => (
            <div key={d.term}>
              <dt>{d.term}</dt>
              <dd>{d.def}</dd>
            </div>
          ))}
        </dl>
      );
    case "methodology":
      return (
        <dl className="dsm__deflist">
          {methodology.map((m) => (
            <div key={m.topic}>
              <dt>{m.topic}</dt>
              <dd>{m.detail}</dd>
            </div>
          ))}
        </dl>
      );
    case "limitations":
      return (
        <ul className="dsm__bullets">
          {limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      );
    case "stewards":
      return (
        <dl className="dsm__deflist">
          {stewards.map((s) => (
            <div key={s.role}>
              <dt>{s.role}</dt>
              <dd>{s.who}</dd>
            </div>
          ))}
        </dl>
      );
    default:
      return null;
  }
}

/**
 * Inline "About the Data" trigger — a subtle info button that opens the modal.
 * Drop near any data-heavy chart/section; pass `section` to deep-link the
 * matching accordion open (e.g. Future Demand → methodology).
 */
export function AboutTheData({
  section,
  label = "About the Data",
  className,
}: {
  section?: DataSourcesSectionId;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`dsm-trigger${className ? ` ${className}` : ""}`}
        onClick={() => setOpen(true)}
        data-testid="about-the-data"
      >
        <Info aria-hidden="true" size={14} />
        <span>{label}</span>
      </button>
      <DataSourcesModal open={open} onClose={() => setOpen(false)} initialSection={section} />
    </>
  );
}

/** Routes that already carry their own "?" / About modal — skip the global dock there. */
const DOCK_HIDDEN_PREFIXES = [
  "/jurisdiction",
  "/ops",
  "/biomed-ops-workbench",
  "/biomed-layer-atlas",
  "/hospital-network",
  "/map",
  "/dashboard",
  "/regions", // Explore Regions carries its own "About the Data" in the header
];

/**
 * App-wide subtle dock launcher, mounted once in the shell. Hidden on the map
 * tiles, which already expose a "?" About modal, to avoid stacking controls.
 */
export function GlobalAboutTheData() {
  const { pathname } = useLocation();
  if (DOCK_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  // Future Demand was the tile Jennifer flagged for sourcing — open straight to methodology there.
  const section: DataSourcesSectionId | undefined =
    pathname === "/s/future-demand" ? "methodology" : undefined;
  return <AboutTheData section={section} className="dsm-trigger--dock" />;
}
