import Link from "next/link";

/**
 * Secondary hint on identity onboarding — matches the live dashboard sequence.
 */
export function OnboardingRoadmap() {
  return (
    <section
      className="ui-card mt-8 p-5 sm:p-6"
      aria-labelledby="onboarding-roadmap-heading"
    >
      <h2 id="onboarding-roadmap-heading" className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
        What comes next
      </h2>
      <p className="ui-hint mt-2 max-w-prose text-sm">
        After you save: first bookable service → weekly hours → optional customers → ideas for sharing your link →
        dashboard. You can always resume from the home page.
      </p>
      <p className="mt-3 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
        <Link href="/dashboard/services" className="font-medium text-[var(--accent)] underline underline-offset-2">
          Full services
        </Link>
        {" · "}
        <Link href="/dashboard/availability" className="font-medium text-[var(--accent)] underline underline-offset-2">
          Availability
        </Link>
      </p>
    </section>
  );
}
