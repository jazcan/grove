type Props = {
  /** When true, renders the close (X) icon; otherwise the hamburger. */
  open: boolean;
  className?: string;
};

/**
 * Hamburger / close icons aligned with the marketing site header (size, stroke, spacing).
 */
export function MainMenuToggleIcon({ open, className = "h-[1.5625rem] w-[1.5625rem]" }: Props) {
  if (open) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M5 7.25h14M5 12h14M5 16.75h14" />
    </svg>
  );
}
