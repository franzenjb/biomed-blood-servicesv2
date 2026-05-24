import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

type Tab = { id: string; label: string };

type Props = {
  eyebrow: string;
  title: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
};

export default function MapPanel({ eyebrow, title, tabs, activeTab, onTabChange, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(340);

  function startResize(event: ReactPointerEvent) {
    event.preventDefault();
    const onMove = (e: PointerEvent) => {
      setWidth(Math.min(560, Math.max(280, window.innerWidth - e.clientX)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className="map-panel__reopen"
        onClick={() => setCollapsed(false)}
        aria-label="Show panel"
        data-testid="map-panel-open"
      >
        ‹ {tabs.find((t) => t.id === activeTab)?.label ?? "Panel"}
      </button>
    );
  }

  return (
    <aside className="map-panel" style={{ width }} data-testid="map-panel">
      <div className="map-panel__resize" onPointerDown={startResize} role="separator" aria-label="Resize panel" title="Drag to resize" />

      <header className="map-panel__head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="map-panel__title">{title}</h1>
        </div>
        <button
          type="button"
          className="map-panel__collapse"
          onClick={() => setCollapsed(true)}
          aria-label="Hide panel"
          data-testid="map-panel-collapse"
        >
          ›
        </button>
      </header>

      <div className="map-panel__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={`map-panel__tab ${tab.id === activeTab ? "is-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            data-testid={`map-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="map-panel__body">{children}</div>
    </aside>
  );
}
