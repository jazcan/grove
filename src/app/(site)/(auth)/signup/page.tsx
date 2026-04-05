import Link from "next/link";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { SignupForm } from "./signup-form";

const BENEFITS = [
  "A public booking page clients can use on their own time",
  "Services, pricing, and availability that reflect how you work",
  "Client details, notes, and history in one place",
  "Payment tracking that fits your real workflow—no required processor",
  "Optional marketplace discovery when you want to be found locally",
] as const;

export default async function SignupPage() {
  const csrf = await getCsrfTokenForForm();

  return (
    <main
      id="main-content"
      className="handshake-landing overflow-x-hidden px-4 py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-20">
        <div className="mx-auto w-full max-w-[min(100%,26rem)] lg:mx-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Create your account
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            Already have an account?{" "}
            <Link href="/login" className="ui-link font-semibold">
              Sign in
            </Link>
          </p>
          <SignupForm csrf={csrf} />
        </div>

        <aside
          className="hl-card mx-auto w-full max-w-lg p-6 sm:p-8 lg:mx-0 lg:max-w-none lg:sticky lg:top-24"
          aria-labelledby="signup-aside-heading"
        >
          <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)]">For providers</p>
          <h2
            id="signup-aside-heading"
            className="hl-display mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl"
          >
            Run bookings and clients from one calm workspace
          </h2>
          <p className="hl-body mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base sm:leading-relaxed">
            Accept bookings, stay organized, manage client context, track payments your way, and get discovered locally
            when you choose—all without duct-taping five tools together.
          </p>
          <ul className="mt-6 space-y-3 border-t border-[var(--hl-ink-faint)] pt-6">
            {BENEFITS.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-snug text-[var(--foreground)]">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent)_22%,var(--hl-ink-faint))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--hl-paper))] text-xs font-bold text-[var(--accent)]"
                  aria-hidden
                >
                  ✓
                </span>
                <span className="hl-body text-[var(--muted)]">{line}</span>
              </li>
            ))}
          </ul>
          <p className="hl-body mt-8 border-t border-[var(--hl-ink-faint)] pt-6 text-sm leading-relaxed text-[var(--muted)]">
            No website required to start. Set up in minutes.{" "}
            <span className="text-[var(--foreground)]">Free while we refine the platform.</span>
          </p>
        </aside>
      </div>
    </main>
  );
}
