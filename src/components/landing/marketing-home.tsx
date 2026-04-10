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
    body: "Let clients book available times—no back-and-forth.",
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
    title: "Reminders",
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
    title: "Home service providers",
    body: "Cleaning, lawn care, and home upkeep—let people nearby book you without the back and forth.",
  },
  {
    title: "Personal & wellness services",
    body: "From fitness to beauty, make it easy for clients to book and come back again.",
  },
  {
    title: "Pet care & everyday services",
    body: "Walks, sitting, and daily help—stay organized and visible to people nearby.",
  },
] as const;

const FAQ = [
  {
    q: "Is Handshake Local free to use?",
    a: "Handshake Local is currently free for providers and clients as we grow the network and refine the experience.",
  },
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
    a: `Clients book through the link you share. If you opt into discovery, we can surface your profile when we roll out search in your area. You can still work with everyone who reaches you directly.`,
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
              <div
                className="pointer-events-none absolute inset-y-[-0.35rem] -left-4 right-[8%] z-0 sm:inset-y-[-0.5rem] sm:-left-6 sm:right-[4%] lg:right-[-12%]"
                style={{
                  background:
                    "linear-gradient(to right, color-mix(in oklab, var(--hl-paper) 88%, transparent) 0%, color-mix(in oklab, var(--hl-paper) 38%, transparent) 52%, transparent 100%)",
                }}
                aria-hidden
              />
              <div className="relative z-[1]">
                <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)] sm:text-sm [text-shadow:0_1px_0_color-mix(in_oklab,var(--hl-paper)_80%,transparent)]">
                  {brand.appName}
                </p>
                <h1 className="hl-display mt-3 text-[2rem] leading-[1.12] text-[color-mix(in_oklab,var(--foreground)_97%,black)] [text-shadow:0_1px_2px_color-mix(in_oklab,var(--hl-paper)_55%,transparent),0_2px_28px_color-mix(in_oklab,var(--hl-paper)_92%,transparent),0_1px_0_color-mix(in_oklab,var(--hl-paper)_75%,transparent)] sm:text-5xl sm:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.06]">
                  Run your service business without the back-and-forth
                </h1>
                <p className="hl-body mt-4 max-w-lg text-base font-medium leading-snug text-[color-mix(in_oklab,var(--muted)_94%,var(--foreground))] [text-shadow:0_1px_2px_color-mix(in_oklab,var(--hl-paper)_45%,transparent),0_1px_22px_color-mix(in_oklab,var(--hl-paper)_88%,transparent)] sm:mt-5 sm:text-lg sm:leading-relaxed">
                  Let clients book you, manage your schedule, and track payments—all in one place.
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
                  <p className="mt-5 text-center text-sm font-medium text-[var(--muted)] sm:mt-6 sm:text-left">
                    Set up in minutes. No credit card required.
                  </p>
                </nav>
              </div>
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
                  <div className="flex h-[142px] w-full items-center justify-center sm:h-[162px] lg:h-[176px]">
                    <Image
                      src={f.iconSrc}
                      alt=""
                      width={200}
                      height={200}
                      unoptimized
                      className="h-[128px] w-[128px] object-contain sm:h-[150px] sm:w-[150px] lg:h-[168px] lg:w-[168px]"
                    />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--foreground)] sm:mt-6">{f.title}</h3>
                  <p className="hl-body mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
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
            <div className="hl-rule-thick absolute left-[8%] right-[8%] top-8 hidden lg:block" aria-hidden />
            <ol className="relative grid gap-8 lg:grid-cols-3 lg:gap-6">
              {STEPS.map((s) => (
                <li key={s.n} className="flex flex-col lg:items-center lg:text-center">
                  <span className="relative z-[1] flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent)_20%,var(--hl-ink-faint))] bg-[color-mix(in_oklab,var(--accent)_11%,var(--hl-paper))] text-xl font-bold tabular-nums text-[var(--accent)] shadow-[inset_0_1px_0_color-mix(in_oklab,white_42%,transparent)] lg:mx-auto">
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
