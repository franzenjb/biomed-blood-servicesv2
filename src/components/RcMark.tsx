type Props = { size?: number; title?: string };

/** The Red Cross mark — inline SVG per the design system. */
export default function RcMark({ size = 28, title = "American Red Cross" }: Props) {
  return (
    <svg
      className="rc-mark"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <rect x="12" y="4" width="8" height="24" fill="#ED1B2E" />
      <rect x="4" y="12" width="24" height="8" fill="#ED1B2E" />
    </svg>
  );
}
