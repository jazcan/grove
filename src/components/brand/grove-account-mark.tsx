import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  /** Square size in px; matches GroveLogoMark defaults for header pairing. */
  size?: number;
};

/**
 * Account control mark: same rounded tile + stroke language as GroveLogoMark,
 * with a simple head-and-body glyph using the same accent fill geometry.
 */
export function GroveAccountMark({ size = 36, className, ...rest }: Props) {
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
        <ellipse cx="16" cy="12.25" rx="4.35" ry="4.35" />
        <rect x="9.35" y="16.75" width="13.3" height="10.75" rx="3.25" />
      </g>
    </svg>
  );
}
