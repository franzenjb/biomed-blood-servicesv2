import type { ComponentType } from "react";

/* Shared icon tab bar for the map-app sidebars. Same iconography everywhere;
   each app supplies its own tab set + content. */

export type ShellTab<Id extends string = string> = {
  id: Id;
  label: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  /** Optional count badge (e.g. active-layer count). */
  badge?: number | string;
  testId?: string;
};

export default function MapTabBar<Id extends string>({
  tabs,
  active,
  onSelect,
  ariaLabel,
}: {
  tabs: ShellTab<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
  ariaLabel: string;
}) {
  return (
    <div className="mshell__tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`mshell__tab${active === tab.id ? " is-active" : ""}`}
          onClick={() => onSelect(tab.id)}
          data-testid={tab.testId}
        >
          <tab.Icon aria-hidden="true" size={16} />
          {tab.label}
          {tab.badge != null && tab.badge !== "" && <span className="mshell__tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}
