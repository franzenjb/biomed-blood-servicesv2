import RcMark from "./RcMark";
import "./ChainOfCare.css";

const NODES = [
  { key: "donors", label: "Donors", sub: "appointments, drives" },
  { key: "readiness", label: "Readiness", sub: "stocked shelf, matching" },
  { key: "access", label: "Access", sub: "delivery, distribution" },
  { key: "care", label: "Care", sub: "trauma, surgery, cancer" },
];

export default function ChainOfCare() {
  return (
    <div className="chain" aria-label="Chain of care diagram">
      <div className="chain__core">
        <RcMark size={34} />
      </div>
      {NODES.map((n) => (
        <div key={n.key} className={`chain__node chain__node--${n.key}`}>
          <span className="chain__label">{n.label}</span>
          <span className="chain__sub">{n.sub}</span>
        </div>
      ))}
      <svg className="chain__rings" viewBox="0 0 320 320" aria-hidden="true">
        <circle cx="160" cy="160" r="150" />
        <circle cx="160" cy="160" r="100" />
      </svg>
    </div>
  );
}
