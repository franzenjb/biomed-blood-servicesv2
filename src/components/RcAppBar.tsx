import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import "./RcAppBar.css";

type Props = {
  title: string;
  subtitle?: string;
  homeTo?: string;
  children?: ReactNode;
};

// Shared American Red Cross app bar — white bar, official logo, heavy title +
// "American Red Cross" subtitle. Matches livessaved.jbf.com. Right-side controls
// are passed as children and should use the .rcbar__* control classes.
export default function RcAppBar({ title, subtitle = "American Red Cross", homeTo = "/hub", children }: Props) {
  return (
    <header className="rcbar">
      <div className="rcbar__brand">
        <Link to={homeTo} className="rcbar__home" aria-label="Home" title="Home">
          <Home aria-hidden="true" size={18} />
        </Link>
        <img className="rcbar__logo" src="/assets/red-cross-logo.png" alt="American Red Cross" />
        <div className="rcbar__titles">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {children && <div className="rcbar__right">{children}</div>}
    </header>
  );
}
