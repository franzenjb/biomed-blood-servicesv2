import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./VideoDemoPage.css";

type Variant = {
  key: string;
  label: string;
  file: string;
  note: string;
};

const VARIANTS: Variant[] = [
  { key: "raw", label: "Raw 4K", file: "/video/hero.mp4", note: "3840 × 2160 · 15.8 MB · source, no filter" },
  { key: "sharp", label: "Sharp", file: "/video/hero-sharp.mp4", note: "ffmpeg unsharp 7:7:1.3 + +6% contrast · 19.6 MB" },
  { key: "sharp-plus", label: "Sharp+", file: "/video/hero-sharp-plus.mp4", note: "ffmpeg unsharp 9:9:1.8 + +8% contrast · 21.3 MB" },
];

export default function VideoDemoPage() {
  const [params] = useSearchParams();
  const key = params.get("v") ?? "raw";
  const v = VARIANTS.find((x) => x.key === key) ?? VARIANTS[0];
  const ref = useRef<HTMLVideoElement>(null);

  // Force reload when src changes (otherwise <video> can keep the old buffer).
  useEffect(() => {
    if (ref.current) ref.current.load();
  }, [v.file]);

  return (
    <section className="vd" data-testid="video-demo">
      <Link to="/" className="vd__back">
        ← Home
      </Link>

      <div className="vd__pills" role="group" aria-label="Video variant">
        {VARIANTS.map((x) => (
          <Link key={x.key} to={`/video-demo?v=${x.key}`} data-on={x.key === v.key}>
            {x.label}
          </Link>
        ))}
      </div>

      <p className="vd__caption mono">{v.note}</p>

      <video
        ref={ref}
        className="vd__video"
        autoPlay
        muted
        loop
        playsInline
        controls
      >
        <source src={v.file} type="video/mp4" />
      </video>
    </section>
  );
}
