import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Download, HelpCircle, LogIn, X } from "lucide-react";
import { sections } from "../data/sections";
import { hubDevNotes, hubSectionIndex } from "../data/hubInfo";
import RcMark from "../components/RcMark";
import ThemeToggle from "../components/ThemeToggle";
import "./HubPage.css";

function HubHelpModal({ onClose }: { onClose: () => void }) {
  const [openPanel, setOpenPanel] = useState<"devnotes" | "index" | null>("devnotes");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="jd__modal" role="dialog" aria-modal="true" aria-label="About the Blood Services Hub" onClick={onClose}>
      <div className="jd__modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="jd__modal-head">
          <span className="jd__modal-mark"><RcMark size={22} /></span>
          <p className="jd__modal-eyebrow">Blood Services Hub</p>
          <button type="button" className="jd__modal-x" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="jd__modal-body">
          <p className="jd__modal-meta">American Red Cross · BioMed</p>
          <h2 className="jd__modal-title">About This Hub</h2>
          <p className="jd__modal-lead">
            One front door to Red Cross Blood Services — nine sections: five guided chapters, then four live maps.
          </p>

          <p>
            <b>01–05</b> are chapters on blood donation and supply. <b>06–09</b> are live maps — Jurisdiction
            Dashboard, Ops Workbench, Hospital Network, and Explore Regions.
          </p>

          <div className="jd__modal-callout jd__modal-callout--alert">
            <LogIn size={26} aria-hidden="true" />
            <div>
              <strong>06–09 need a Red Cross ArcGIS sign-in</strong>
              <span>Without a Red Cross ArcGIS account you'll see the sign-in prompt and can't load the layers.</span>
            </div>
          </div>

          <h3>How To Use It</h3>
          <ul>
            <li><b>Click a card</b> — chapters open a slide deck; tools open a live map.</li>
            <li><b>Start anywhere</b> — numbers suggest an order, not a requirement.</li>
            <li><b>Each tool has a “?”</b> — controls and definitions for that view.</li>
          </ul>

          <section className="hub__accordion" data-open={openPanel === "devnotes" ? "true" : "false"}>
            <button type="button" className="hub__accordion-head" onClick={() => setOpenPanel(openPanel === "devnotes" ? null : "devnotes")}>
              <span>Development Notes — for Jennifer &amp; Troy</span>
              <b>{hubDevNotes.reduce((n, g) => n + g.items.length, 0)}</b>
              <ChevronDown aria-hidden="true" size={18} />
            </button>
            {openPanel === "devnotes" && (
              <div className="hub__accordion-body">
                <p className="hub__devnote-intro">
                  Where we are against the review notes — refining, not rebuilding. Updated June 8, 2026.
                </p>
                {hubDevNotes.map((g) => (
                  <div key={g.group} className="hub__devnote" data-tone={g.tone}>
                    <p className="hub__devnote-group">{g.group}</p>
                    <ul className="hub__devnote-list">
                      {g.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <a
                  className="hub__devnote-download"
                  href="/biomed-capabilities-status.pdf"
                  download="BioMed_Capabilities_Status.pdf"
                  data-testid="devnotes-download"
                >
                  <Download aria-hidden="true" size={15} />
                  Download status as PDF
                </a>
              </div>
            )}
          </section>

          <section className="hub__accordion" data-open={openPanel === "index" ? "true" : "false"}>
            <button type="button" className="hub__accordion-head" onClick={() => setOpenPanel(openPanel === "index" ? null : "index")}>
              <span>Section Index</span>
              <b>{hubSectionIndex.length}</b>
              <ChevronDown aria-hidden="true" size={18} />
            </button>
            {openPanel === "index" && (
              <div className="hub__accordion-body">
                {hubSectionIndex.map((item) => (
                  <article key={item.index} className="hub__index-row">
                    <span className="hub__index-num">{item.index}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.blurb}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="jd__modal-foot">
            <span className="jd__modal-foot-q">Question or suggestions?</span>{" "}
            <a href="mailto:jeff.franzen2@redcross.org?subject=Blood%20Services%20Hub%20%E2%80%94%20question%2Fsuggestion">Email Jeff Franzen</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HubPage() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="hub" data-testid="hub">
      <header className="hub__bar">
        <Link to="/" className="hub__brand">
          <RcMark size={28} />
          <span>
            Red Cross <strong>Blood Services</strong>
          </span>
        </Link>
        <div className="hub__bar-actions">
          <button type="button" className="hub__help" onClick={() => setHelpOpen(true)} aria-label="About this hub" title="About this hub">
            <HelpCircle aria-hidden="true" size={20} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <nav className="hub__grid" aria-label="Sections">
        {sections.map((s) => (
          <Link
            key={s.id}
            to={`/s/${s.id}`}
            className="hub__card"
            style={{ backgroundImage: `url(${s.cover})` }}
            data-testid={`hub-card-${s.id}`}
          >
            <span className="hub__scrim" />
            <span className="hub__index mono">{s.index}</span>
            <span className="hub__body">
              <span className="hub__title">{s.title}</span>
              <span className="hub__q">{s.question}</span>
            </span>
          </Link>
        ))}

        <Link
          to="/jurisdiction-dashboard"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/dashboard-preview.svg)" }}
          data-testid="hub-card-map-dashboard"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">06</span>
          <span className="hub__body">
            <span className="hub__title">Jurisdiction Dashboard</span>
            <span className="hub__q">BioMed boundaries, FY25 counts &amp; clickable sites - filter by division, region &amp; district.</span>
          </span>
        </Link>

        <Link
          to="/biomed-ops-workbench"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/ops-workbench.jpg)" }}
          data-testid="hub-card-ops-workbench"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">07</span>
          <span className="hub__body">
            <span className="hub__title">BioMed Ops Workbench</span>
            <span className="hub__q">Internal BioMed layer controls and selected feature review.</span>
          </span>
        </Link>

        <Link
          to="/hospital-network"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/hospital-network.jpg)" }}
          data-testid="hub-card-hospital-network"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">08</span>
          <span className="hub__body">
            <span className="hub__title">Hospital Network</span>
            <span className="hub__q">Tier, distribution sites, portfolio footprint &amp; coverage.</span>
          </span>
        </Link>

        <Link
          to="/ops?tour=1"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/explore-regions-map.png)" }}
          data-testid="hub-card-explore-regions"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">09</span>
          <span className="hub__body">
            <span className="hub__title">Explore Regions</span>
            <span className="hub__q">Guided tour — pick a region, fly there on the live map, and step through its donor story.</span>
          </span>
        </Link>

        <Link
          to="/infrastructure-dashboard"
          className="hub__card hub__card--map"
          style={{ backgroundImage: "url(/covers/tools/dashboard-preview.svg)" }}
          data-testid="hub-card-infrastructure-dashboard"
        >
          <span className="hub__scrim" />
          <span className="hub__index mono">10</span>
          <span className="hub__body">
            <span className="hub__title">Infrastructure Dashboard</span>
            <span className="hub__q">Manufacturing, warehouses, distribution, staging &amp; fixed sites — counts &amp; footprint by division, region &amp; district.</span>
          </span>
        </Link>
      </nav>

      <footer className="hub__foot">
        <Link to="/" className="hub__foot-link">
          ← Home
        </Link>
      </footer>

      {helpOpen && <HubHelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
