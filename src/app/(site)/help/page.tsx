import Link from "next/link";
import { brand } from "@/config/brand";

export default function HelpPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Help</h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
        Need a hand with {brand.appName}? Start with the links below. Providers signed in can also open{" "}
        <Link href="/dashboard/docs" className="ui-link font-semibold">
          Help
        </Link>{" "}
        from the dashboard menu.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Common topics</h2>
        <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
          <li>
            <Link href="/about-handshake-local" className="ui-link font-medium text-[var(--foreground)]">
              About {brand.appName}
            </Link>{" "}
            — how the platform fits solo and small service businesses.
          </li>
          <li>
            <Link href="/signup" className="ui-link font-medium text-[var(--foreground)]">
              Become a provider
            </Link>{" "}
            — create an account and set up your public profile.
          </li>
          <li>
            <Link href="/login" className="ui-link font-medium text-[var(--foreground)]">
              Sign in
            </Link>{" "}
            — access your dashboard, bookings, and customers.
          </li>
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Handshake Collective</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">Handshake Collective</strong> is the consulting and services arm
          behind {brand.appName}. We help teams and independents design offers, pricing, and client experience—and we
          build provider-ready profiles when you want a guided launch.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Think of Collective as the human layer: workshops, implementation support, and hands-on setup so your public
          profile, services, and booking flow match how you actually work.
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          To learn more about consulting and provider onboarding packages, mention Handshake Collective when you reach
          out through your usual Handshake contact channel, or start by{" "}
          <Link href="/signup" className="ui-link font-semibold">
            creating a provider account
          </Link>{" "}
          and completing your profile—we&apos;ll meet you there.
        </p>
      </section>
    </main>
  );
}
