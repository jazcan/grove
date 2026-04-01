import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Marketing card — ink-outline “paper” panel (styles from `.hl-card` in globals.css). */
export function LandingCard({ children, className = "" }: Props) {
  return <div className={`hl-card p-5 sm:p-6 ${className}`}>{children}</div>;
}
