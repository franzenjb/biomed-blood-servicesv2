type Props = { size?: number; title?: string };

/** American Red Cross mark — glossy white sphere with the red cross. */
export default function RcMark({ size = 28, title = "American Red Cross" }: Props) {
  return (
    <svg
      className="rc-mark"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id="rcSphere" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="58%" stopColor="#f1f2f3" />
          <stop offset="100%" stopColor="#c4c8cb" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#rcSphere)" stroke="#bcc0c3" strokeWidth="0.6" />
      <ellipse cx="42" cy="30" rx="30" ry="16" fill="#ffffff" opacity="0.45" />
      <rect x="42" y="22" width="16" height="56" rx="1" fill="#ed1b2e" />
      <rect x="22" y="42" width="56" height="16" rx="1" fill="#ed1b2e" />
    </svg>
  );
}
