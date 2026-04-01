import Link from "next/link";
import { brand } from "@/config/brand";

/**
 * Static next steps shown on first-run onboarding (templates → pricing → availability → publish).
 */
export function OnboardingRoadmap() {
  return (
    <section
      className="ui-card mt-10 p-6 sm:p-7"
      aria-labelledby="onboarding-roadmap-heading"
    >
      <h2 id="onboarding-roadmap-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
        What comes next
      </h2>
      <p className="ui-hint mt-2 max-w-prose">
        {brand.appName} is built so services come from templates, pricing lives on your offers, and availability drives what
        clients can book.
      </p>
      <ol className="mt-6 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
        <li>
          <strong className="font-semibold text-[var(--foreground)]">Services</strong> — Pick a template or quick
          start, then set your price and duration.{" "}
          <Link href="/dashboard/services" className="font-semibold text-[var(--accent)] underline underline-offset-2">
            Open services
          </Link>
        </li>
        <li>
          <strong className="font-semibold text-[var(--foreground)]">Availability</strong> — Add weekly hours and
          block time off.{" "}
          <Link
            href="/dashboard/availability"
            className="font-semibold text-[var(--accent)] underline underline-offset-2"
          >
            Set availability
          </Link>
        </li>
        <li>
          <strong className="font-semibold text-[var(--foreground)]">Publish</strong> — Turn on your public profile
          when you&apos;re ready for clients to book.{" "}
          <Link href="/dashboard/profile" className="font-semibold text-[var(--accent)] underline underline-offset-2">
            Profile settings
          </Link>
        </li>
      </ol>
    </section>
  );
}
