import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { BookingPreviewMock } from "./booking-preview-mock";
import { HeroGroveBackdrop } from "./hero-grove-backdrop";
import { LandingCard } from "./landing-card";

const FEATURES = [
  {
    iconSrc: "/brand/hsl-icon-booking.svg",
    title: "Booking & scheduling",
    body: "Let clients book available times without back-and-forth emails.",
  },
  {
    iconSrc: "/brand/hsl-icon-clients.svg",
    title: "Client management",
    body: "Keep client details, notes, and history in one place.",
  },
  {
    iconSrc: "/brand/hsl-icon-payments.svg",
    title: "Payments",
    body: "Track payments your way—no processor required.",
  },
  {
    iconSrc: "/brand/hsl-icon-reminders.svg",
    title: "Reminders & follow-ups",
    body: "Automatically confirm bookings and keep clients on track.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Create your profile",
    body: "Add services, pricing, and the hours you actually want to work.",
  },
  {
    n: "2",
    title: "Let clients book you",
    body: "Clients can book you wherever you share your services.",
  },
  {
    n: "3",
    title: "Get booked and paid",
    body: "Bookings land in your dashboard; you track payment your way.",
  },
] as const;

const PERSONAS = [
  {
    title: "Consultants",
    body: "Sell clarity, not calendar chaos—let clients book you when it works for both of you.",
  },
  {
    title: "Therapists",
    body: "Keep sessions private, organized, and easy for clients to schedule.",
  },
  {
    title: "Freelancers",
    body: `Ship the work; let ${brand.appName} handle the booking admin in the background.`,
  },
] as const;

const FAQ = [
  {
    q: "Do I need a website?",
    a: `No. Your ${brand.appName} profile can be the simple, professional page clients use to learn about you and book. If you already have a site, you can use both.`,
  },
  {
    q: "Can I manage offline payments?",
    a: "Yes. You can record cash, e-transfer, and other offline payments so your books stay clear without adding a card processor.",
  },
  {
    q: "Can I control when I'm available?",
    a: "Yes. You set your hours and availability so clients only see times that work for you.",
  },
  {
    q: `Can clients find me through ${brand.appName}?`,
    a: `If you opt into discovery, clients can find you in the ${brand.appName} marketplace. You can still work with clients who reach you elsewhere.`,
  },
] as const;

export function MarketingHome() {
  return (
    <main id="main-content" className="handshake-landing overflow-x-hidden">
      {/* Hero — min-height lets the map read as a full illustrated field */}
      <section className="hl-rule relative isolate min-h-[420px] overflow-hidden border-b pb-14 pt-10 sm:min-h-[460px] sm:pb-16 sm:pt-12 lg:min-h-[min(560px,78vh)] lg:pb-20 lg:pt-16">
        <HeroGroveBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-12 xl:gap-16">
            <div className="relative z-10 max-w-xl lg:max-w-[34rem]">
              <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)] sm:text-sm [text-shadow:0_1px_0_color-mix(in_oklab,var(--hl-paper)_80%,transparent)]">
                {brand.appName}
              </p>
              <h1 className="hl-display mt-3 text-[2rem] leading-[1.12] text-[var(--foreground)] [text-shadow:0_2px_24px_color-mix(in_oklab,var(--hl-paper)_95%,transparent),0_1px_0_var(--hl-paper)] sm:text-5xl sm:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.06]">
                Run your service business without the scheduling chaos
              </h1>
              <p className="hl-body mt-4 max-w-lg text-base font-medium leading-snug text-[var(--muted)] [text-shadow:0_1px_20px_color-mix(in_oklab,var(--hl-paper)_90%,transparent)] sm:mt-5 sm:text-lg sm:leading-relaxed">
                Let clients book you, manage your schedule, and track payments—without juggling tools.
              </p>

              <nav aria-label="Primary" className="mt-8 sm:mt-9">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link
                    href="/signup"
                    className="ui-btn-primary inline-flex min-h-12 w-full justify-center px-8 py-3.5 text-base sm:w-auto"
                  >
                    Get started
                  </Link>
                  <Link href="/login" className="hl-btn-secondary min-h-12 w-full px-6 py-3 text-base sm:w-auto">
                    Sign in
                  </Link>
                </div>
                <p className="mt-3 text-center text-sm sm:mt-4 sm:text-left">
                  <Link href="/marketplace" className="ui-link font-semibold decoration-2 underline-offset-[0.3rem]">
                    Find a provider
                  </Link>
                </p>
                <p className="mt-5 text-center text-sm font-medium text-[var(--muted)] sm:mt-6 sm:text-left">
                  Set up in minutes. No credit card required.
                </p>
              </nav>
            </div>

            <div className="relative z-20 flex justify-center lg:justify-end">
              <div className="w-full max-w-md drop-shadow-[0_14px_42px_rgba(26,26,26,0.14)] lg:max-w-none">
                <BookingPreviewMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section
        className="hl-rule relative isolate overflow-hidden border-b bg-[color-mix(in_oklab,var(--surface-muted)_48%,var(--background))] py-14 sm:py-16 lg:py-20"
        aria-labelledby="features-heading"
      >
        <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)]">What you actually get</p>
            <h2
              id="features-heading"
              className="hl-display mt-2 text-2xl tracking-tight text-[var(--foreground)] sm:text-3xl"
            >
              Everything clients see—and everything you need behind the scenes
            </h2>
            <div className="mt-3 max-w-lg sm:mt-4" aria-hidden>
              <Image
                src="/brand/hsl-line2.svg"
                alt=""
                width={800}
                height={40}
                unoptimized
                className="h-3 w-full max-w-sm object-left object-contain opacity-[0.72] sm:h-3.5 sm:max-w-md sm:opacity-[0.78]"
              />
            </div>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-6">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <LandingCard className="h-full">
                  <div className="flex h-[104px] w-full items-center justify-center sm:h-[112px]">
                    <Image
                      src={f.iconSrc}
                      alt=""
                      width={112}
                      height={112}
                      unoptimized
                      className="h-[88px] w-[88px] object-contain sm:h-[104px] sm:w-[104px] lg:h-[112px] lg:w-[112px]"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)] sm:mt-5">{f.title}</h3>
                  <p className="hl-body mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
                </LandingCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="hl-rule border-b py-14 sm:py-16 lg:py-20" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)]">How it works</p>
            <h2 id="how-heading" className="hl-display mt-2 text-2xl tracking-tight text-[var(--foreground)] sm:text-3xl">
              From profile to paid—in three clear moves
            </h2>
          </div>

          <div className="relative mt-10 lg:mt-14">
            <div className="hl-rule-thick absolute left-[8%] right-[8%] top-7 hidden lg:block" aria-hidden />
            <ol className="relative grid gap-8 lg:grid-cols-3 lg:gap-6">
              {STEPS.map((s) => (
                <li key={s.n} className="flex flex-col lg:items-center lg:text-center">
                  <span className="relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem_0.85rem_1rem_0.9rem] border-2 border-[var(--hl-ink-faint)] bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)] lg:mx-auto">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--foreground)] lg:mt-6">{s.title}</h3>
                  <p className="hl-body mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)] lg:mx-auto">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section
        className="hl-rule border-b bg-[color-mix(in_oklab,var(--card)_42%,var(--background))] py-14 sm:py-16 lg:py-20"
        aria-labelledby="personas-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)]">Who this is for</p>
            <h2 id="personas-heading" className="hl-display mt-2 text-2xl tracking-tight text-[var(--foreground)] sm:text-3xl">
              Built for people who sell their time—and protect their focus
            </h2>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-12 lg:gap-6">
            {PERSONAS.map((p) => (
              <li key={p.title}>
                <LandingCard className="h-full">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{p.title}</h3>
                  <p className="hl-body mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.body}</p>
                </LandingCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="hl-rule border-b py-14 sm:py-16 lg:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)]">Questions</p>
            <h2 id="faq-heading" className="hl-display mt-2 text-2xl tracking-tight text-[var(--foreground)] sm:text-3xl">
              Straight answers
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-3 lg:mt-12">
            {FAQ.map((item) => (
              <details key={item.q} className="group hl-disclosure px-5 py-1 sm:px-6">
                <summary className="cursor-pointer list-none py-4 text-base font-semibold text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--hl-ink-faint)] bg-[var(--surface-muted)] text-[var(--muted)] transition group-open:rotate-180"
                      aria-hidden
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  </span>
                </summary>
                <p className="hl-body border-t border-[var(--hl-ink-faint)] pb-4 pt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — storefronts frame the panel (mockup-style), decorative only */}
      <section
        className="relative isolate overflow-x-clip px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20"
        aria-labelledby="final-cta-heading"
      >
        <Image
          src="/brand/hsl-storefront-left.svg"
          alt=""
          width={400}
          height={320}
          unoptimized
          className="pointer-events-none absolute left-0 top-1/2 z-0 hidden h-auto w-[min(36vw,280px)] max-w-[300px] -translate-y-[48%] select-none object-contain object-left lg:block xl:left-[max(0px,calc(50%-22rem))] xl:w-[min(32vw,300px)]"
        />
        <Image
          src="/brand/hsl-storefront-right.svg"
          alt=""
          width={400}
          height={320}
          unoptimized
          className="pointer-events-none absolute right-0 top-1/2 z-0 hidden h-auto w-[min(36vw,280px)] max-w-[300px] -translate-y-[48%] select-none object-contain object-right lg:block xl:right-[max(0px,calc(50%-22rem))] xl:w-[min(32vw,300px)]"
        />

        <div className="relative z-10 mx-auto w-full max-w-2xl">
          <div className="hl-cta-panel px-5 py-9 text-center sm:px-8 sm:py-10 lg:px-10 lg:py-11">
            <h2 id="final-cta-heading" className="hl-display text-2xl tracking-tight text-[var(--foreground)] sm:text-3xl">
              Ready to simplify your bookings and get your time back?
            </h2>
            <p className="hl-body mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              Join solo providers who manage bookings, clients, and payments in one place.
            </p>
            <Link
              href="/signup"
              className="ui-btn-primary mx-auto mt-8 inline-flex min-h-12 justify-center px-10 py-3.5 text-base"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
