import Link from "next/link";
import { HandshakeLogo } from "@/components/brand/handshake-logo";
import { brand } from "@/config/brand";

type Props = {
  href: string;
  /** Extra classes (e.g. grid placement for dashboard header). */
  className?: string;
};

/**
 * Single brand lockup for marketing header and logged-in dashboard header:
 * square mark (`HandshakeLogo`) + app wordmark.
 */
export function HandshakeBrandLockup({ href, className }: Props) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg text-[var(--foreground)] outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${className ?? ""}`}
    >
      <HandshakeLogo size={40} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
      <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">{brand.appName}</span>
    </Link>
  );
}
