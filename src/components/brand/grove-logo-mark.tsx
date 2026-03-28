import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  /** Square size in px (default 36 to match header h-9). */
  size?: number;
};

/**
 * Grove wordmark icon: rounded tile + abstract grove (shared canopy, two trunks).
 * Uses theme CSS variables so it matches light UI; favicon uses app/icon.svg with fixed hex.
 */
export function GroveLogoMark({ size = 36, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
      {...rest}
    >
      <rect
        width="32"
        height="32"
        rx="8"
        className="fill-[var(--accent-soft)] stroke-[var(--accent-soft-border)]"
        strokeWidth={1}
      />
      <g className="fill-[var(--accent)]">
        {/* Shared canopy + twin trunks — abstract grove, works small */}
        <ellipse cx="16" cy="11.75" rx="9.25" ry="5.4" />
        <rect x="10.35" y="11.25" width="3" height="12.25" rx="1.5" />
        <rect x="18.65" y="11.25" width="3" height="12.25" rx="1.5" />
      </g>
    </svg>
  );
}
