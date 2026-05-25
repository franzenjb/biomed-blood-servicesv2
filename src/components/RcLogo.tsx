import RcMark from "./RcMark";
import "./RcLogo.css";

type Props = { size?: number };

/** Authentic horizontal lockup: glossy mark + "American Red Cross" wordmark. */
export default function RcLogo({ size = 52 }: Props) {
  return (
    <span className="rc-logo" aria-label="American Red Cross">
      <RcMark size={size} title="" />
      <span className="rc-logo__word" aria-hidden="true">
        American
        <br />
        Red Cross
      </span>
    </span>
  );
}
