import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { Coordinates } from "../data/mockData";

type StoryShellProps = {
  title: string;
  summary: string;
  sections: Array<{ id: string; label: string; detail?: string }>;
  children: ReactNode;
  aside?: ReactNode;
  deckLabel?: string;
  chapterNumber?: string;
  tone?: "light" | "red" | "ink";
  mapCenter?: Coordinates;
  mapZoom?: number;
  mapLabel?: string;
  coverImage?: string;
  coverAlt?: string;
  returnPath?: string;
  returnLabel?: string;
  returnAriaLabel?: string;
};

export default function StoryShell({
  title,
  summary,
  sections,
  children,
  aside,
  deckLabel = "Blood World",
  chapterNumber,
  tone = "light",
  mapLabel = "Theme cover",
  coverImage,
  coverAlt = "",
  returnPath = "/",
  returnLabel = "Menu",
  returnAriaLabel = "Return to main menu"
}: StoryShellProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState("hero");
  const resolvedChapterNumber =
    chapterNumber ??
    ({
      "Blood 101": "01",
      "Biomed Collections": "02",
      "Blood Journey": "03",
      "Future Demand": "04",
      "Hospital Distribution": "05"
    }[title] ?? "00");

  const slideItems = useMemo(
    () => [{ id: "hero", label: title, detail: "intro" }, ...sections],
    [sections, title]
  );

  const getHeaderOffset = useCallback(() => {
    return document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
  }, []);

  useEffect(() => {
    function handleScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const headerOffset = getHeaderOffset();
      setProgress(scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0);

      const heroNode = document.querySelector(".story-hero");
      const current = [
        {
          id: "hero",
          distance: heroNode ? Math.abs(heroNode.getBoundingClientRect().top - headerOffset) : Number.POSITIVE_INFINITY
        },
        ...sections.map((section) => {
          const node = document.getElementById(section.id);
          return {
            id: section.id,
            distance: node ? Math.abs(node.getBoundingClientRect().top - headerOffset) : Number.POSITIVE_INFINITY
          };
        })
      ]
        .sort((a, b) => a.distance - b.distance)[0];

      if (current?.id) {
        setActiveId(current.id);
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [getHeaderOffset, sections]);

  const activeSectionIndex = useMemo(
    () => sections.findIndex((section) => section.id === activeId),
    [activeId, sections]
  );
  const currentSlideIndex = activeId === "hero" || activeSectionIndex < 0 ? 0 : activeSectionIndex + 1;
  const isLastSlide = currentSlideIndex === slideItems.length - 1;

  const scrollToHero = useCallback(() => {
    window.history.pushState(null, "", window.location.pathname);
    setActiveId("hero");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const getCurrentSlideIndex = useCallback(() => {
    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    const hashSectionIndex = hashId ? sections.findIndex((section) => section.id === hashId) : -1;
    return hashSectionIndex > -1 ? hashSectionIndex + 1 : currentSlideIndex;
  }, [currentSlideIndex, sections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const node = document.getElementById(sectionId);

    if (!node) {
      return;
    }

    window.history.pushState(null, "", `#${sectionId}`);
    setActiveId(sectionId);
    const top = node.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.scrollTo({ top, behavior: "smooth" });
  }, [getHeaderOffset]);

  useEffect(() => {
    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ""));

    if (hashId && sections.some((section) => section.id === hashId)) {
      window.setTimeout(() => scrollToSection(hashId), 0);
    }
  }, [scrollToSection, sections]);

  const goToSlide = useCallback((index: number) => {
    if (index <= 0) {
      scrollToHero();
      return;
    }

    const section = sections[index - 1];
    if (section) {
      scrollToSection(section.id);
    }
  }, [scrollToHero, scrollToSection, sections]);

  const goToPrevious = useCallback(() => {
    const navigationIndex = getCurrentSlideIndex();

    if (navigationIndex <= 0) {
      return;
    }

    goToSlide(navigationIndex - 1);
  }, [getCurrentSlideIndex, goToSlide]);

  const goToReturnTarget = useCallback(() => {
    if (returnPath === window.location.pathname) {
      scrollToHero();
      return;
    }

    navigate(returnPath);
  }, [navigate, returnPath, scrollToHero]);

  const goToNext = useCallback(() => {
    if (slideItems.length === 0) {
      return;
    }

    const navigationIndex = getCurrentSlideIndex();

    if (navigationIndex < slideItems.length - 1) {
      goToSlide(navigationIndex + 1);
      return;
    }

    goToReturnTarget();
  }, [getCurrentSlideIndex, goToReturnTarget, goToSlide, slideItems.length]);

  useEffect(() => {
    function isFormField(target: EventTarget | null) {
      return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isFormField(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        goToNext();
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        navigate("/");
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, navigate]);

  return (
    <div className={`story-page presentation-page tone-${tone}`}>
      <div className="reading-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <nav className="presentation-controls" aria-label="Keyboard chapter navigation">
        <button
          className="presentation-control"
          type="button"
          aria-label="Previous section"
          disabled={currentSlideIndex <= 0}
          onClick={goToPrevious}
        >
          <span className="presentation-key" aria-hidden="true">
            <ArrowLeft size={14} />
          </span>
          <span>Back</span>
        </button>
        <Link className="presentation-control presentation-control-home" to="/" aria-label="Home">
          <span className="presentation-key" aria-hidden="true">
            <ArrowUp size={14} />
          </span>
          <span>Home</span>
        </Link>
        <button
          className="presentation-control"
          type="button"
          aria-label={isLastSlide ? returnAriaLabel : "Next section"}
          onClick={goToNext}
        >
          <span className="presentation-key" aria-hidden="true">
            <ArrowRight size={14} />
          </span>
          <span>{isLastSlide ? returnLabel : "Next"}</span>
        </button>
      </nav>

      <div
        className="slide-position-dots"
        aria-label={`${title} slide ${currentSlideIndex + 1} of ${slideItems.length}`}
        role="group"
      >
        <span className="slide-position-label">
          <b>{resolvedChapterNumber}</b>
          <span>{title}</span>
        </span>
        <span className="slide-position-dot-set">
          {slideItems.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              aria-current={currentSlideIndex === index ? "step" : undefined}
              aria-label={`Go to slide ${index + 1}: ${slide.label}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </span>
      </div>

      <section className="story-hero chapter-field field-hero">
        <div className="story-map-backdrop" aria-hidden="true" data-map-label={mapLabel}>
          {coverImage ? (
            <img
              className="story-cover-image"
              src={coverImage}
              alt={coverAlt}
              data-testid="chapter-cover-image"
              draggable="false"
            />
          ) : null}
          <div className="story-map-vignette" />
        </div>
        <div className="chapter-wrap hero-wrap">
          <span className="chapter-num">00</span>
          <p className="deck-label">{deckLabel}</p>
          <h1>{title}</h1>
          <p className="story-lede">{summary}</p>
        </div>
        <div className="story-hero-aside">{aside}</div>
      </section>

      <div className="story-content">{children}</div>
    </div>
  );
}
