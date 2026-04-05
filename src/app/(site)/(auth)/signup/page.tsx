import Link from "next/link";
import { cookies } from "next/headers";
import { normalizeReferralCodeInput } from "@/domain/local-ambassador/referral-code";
import { getReferrerDisplayNameForCode } from "@/domain/local-ambassador/referrer-display-name";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { REFERRAL_COOKIE_NAME } from "@/lib/local-ambassador-cookie";
import { SignupForm } from "./signup-form";

const PLACE_BULLETS = [
  "see what you offer",
  "book with you directly",
  "and return without starting from scratch",
] as const;

const BENEFIT_BULLETS = [
  "Your own booking link you can share anywhere",
  "Set your services and availability once",
  "Keep track of clients and past work",
  "Accept payment the way you already do (cash, e-transfer, or in person)",
  "Optionally be found by new clients locally",
] as const;

type PageProps = { searchParams: Promise<{ ref?: string }> };

export default async function SignupPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const fromUrl = typeof sp.ref === "string" ? normalizeReferralCodeInput(sp.ref) : "";
  const fromCookie = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? "";
  const initialReferralCode = fromUrl || fromCookie || "";
  const referrerDisplayName =
    initialReferralCode.length > 0 ? await getReferrerDisplayNameForCode(initialReferralCode) : null;
  const csrf = await getCsrfTokenForForm();

  const subheadline = referrerDisplayName
    ? `${referrerDisplayName} thought this would be a good fit for you.`
    : "Someone in your community thought this would be a good fit for how you run your business.";

  return (
    <main
      id="main-content"
      className="handshake-landing overflow-x-hidden px-4 py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-20">
        <div className="mx-auto w-full max-w-[min(100%,26rem)] lg:mx-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            You’ve been invited to join Handshake Local
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--foreground)]">{subheadline}</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Already have an account?{" "}
            <Link
              href={
                typeof sp.ref === "string" && sp.ref.length > 0
                  ? `/login?ref=${encodeURIComponent(sp.ref)}`
                  : "/login"
              }
              className="text-[var(--foreground)] underline decoration-[color-mix(in_oklab,var(--foreground)_35%,transparent)] underline-offset-[0.2em] hover:decoration-[var(--foreground)]"
            >
              Sign in
            </Link>
          </p>
          <SignupForm csrf={csrf} initialReferralCode={initialReferralCode} />
        </div>

        <aside
          className="hl-card mx-auto w-full max-w-lg p-6 sm:p-8 lg:mx-0 lg:max-w-none lg:sticky lg:top-24"
          aria-labelledby="signup-aside-heading"
        >
          <h2
            id="signup-aside-heading"
            className="hl-display text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl"
          >
            Run your bookings and client work in one place
          </h2>
          <p className="hl-body mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base sm:leading-relaxed">
            Most providers we work with were handling bookings through text, Facebook, or memory. It works, but it
            takes time and things slip through.
          </p>
          <p className="hl-body mt-4 text-sm font-medium leading-relaxed text-[var(--foreground)] sm:text-base">
            This gives you a single place where people can:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            {PLACE_BULLETS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <ul className="mt-6 space-y-3 border-t border-[var(--hl-ink-faint)] pt-6">
            {BENEFIT_BULLETS.map((line) => (
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
            Most providers are set up in about 10–15 minutes.
            <br />
            If you need a hand, we can walk through it with you.
          </p>
        </aside>
      </div>
    </main>
  );
}
