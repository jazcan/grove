import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Soft elevated card for marketing sections—shadow + hairline ring, no heavy border. */
export function LandingCard({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
