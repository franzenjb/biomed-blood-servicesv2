import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSection, nextSectionId } from "../data/sections";
import SlideDeck from "../components/SlideDeck";

export default function SectionDeckPage() {
  const { sectionId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const section = getSection(sectionId);
  if (!section) return <Navigate to="/" replace />;

  const present = params.get("present") === "1";
  const nextId = nextSectionId(section.id);
  const next = nextId ? getSection(nextId) : undefined;

  // Advancing past the final slide always leaves the deck: present mode chains
  // to the next section (then the hub); normal mode returns to the hub.
  const onAdvancePastEnd = () => {
    if (present && nextId) navigate(`/s/${nextId}?present=1`);
    else navigate("/hub");
  };

  return (
    <SlideDeck
      key={section.id}
      section={section}
      present={present}
      nextLabel={present ? (next ? next.title : "Finish") : undefined}
      onAdvancePastEnd={onAdvancePastEnd}
    />
  );
}
