import Link from "next/link";
import { BookingPreviewMock } from "./booking-preview-mock";
import { HeroGroveBackdrop } from "./hero-grove-backdrop";
import { LandingCard } from "./landing-card";

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconBanknote({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H18.75v-.75m0 7.5h.375c.621 0 1.125-.504 1.125-1.125v-9.75c0-.621-.504-1.125-1.125-1.125h-.375m0 0H21" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: IconCalendar,
    title: "Booking & scheduling",
    body: "Let clients book available times without back-and-forth emails.",
  },
  {
    icon: IconUsers,
    title: "Client management",
    body: "Keep client details, notes, and history in one place.",
  },
  {
    icon: IconBanknote,
    title: "Payments",
    body: "Track payments your way—no processor required.",
  },
  {
    icon: IconBell,
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
    body: "Ship the work; let Grove handle the booking admin in the background.",
  },
] as const;

const FAQ = [
  {
    q: "Do I need a website?",
    a: "No. Your Grove profile can be the simple, professional page clients use to learn about you and book. If you already have a site, you can use both.",
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
    q: "Can clients find me through Grove?",
    a: "If you opt into discovery, clients can find you in the Grove marketplace. You can still work with clients who reach you elsewhere.",
  },
] as const;

export function MarketingHome() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-[color-mix(in_oklab,var(--foreground)_7%,transparent)] pb-14 pt-10 sm:pb-16 sm:pt-12 lg:pb-20 lg:pt-16">
        <HeroGroveBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-12 xl:gap-16">
            <div className="max-w-xl lg:max-w-[34rem]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] sm:text-sm">
                Grove
              </p>
              <h1 className="mt-3 text-[2rem] font-semibold leading-[1.12] tracking-tight text-[var(--foreground)] sm:text-5xl sm:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.06]">
                Run your service business without the scheduling chaos
              </h1>
              <p className="mt-4 max-w-lg text-base font-medium leading-snug text-[var(--muted)] sm:mt-5 sm:text-lg sm:leading-relaxed">
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
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] shadow-md ring-1 ring-[color-mix(in_oklab,var(--foreground)_10%,transparent)] transition hover:bg-[var(--surface-hover)] sm:w-auto"
                  >
                    Sign in
                  </Link>
                </div>
                <p className="mt-3 text-center text-sm sm:mt-4 sm:text-left">
                  <Link href="/marketplace" className="ui-link font-semibold">
                    Find a provider
                  </Link>
                </p>
                <p className="mt-5 text-center text-sm font-medium text-[var(--muted)] sm:mt-6 sm:text-left">
                  Set up in minutes. No credit card required.
                </p>
              </nav>
            </div>

            <div className="flex justify-center lg:justify-end">
              <BookingPreviewMock />
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-[color-mix(in_oklab,var(--surface-muted)_55%,var(--background))] py-14 sm:py-16 lg:py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">What you actually get</p>
            <h2 id="features-heading" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Everything clients see—and everything you need behind the scenes
            </h2>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-6">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <LandingCard className="h-full">
                  <f.icon className="h-7 w-7 text-[var(--accent)]" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
                </LandingCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-16 lg:py-20" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">How it works</p>
            <h2 id="how-heading" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              From profile to paid—in three clear moves
            </h2>
          </div>

          <div className="relative mt-10 lg:mt-14">
            <div
              className="absolute left-[8%] right-[8%] top-7 hidden h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--foreground)_14%,var(--background))] to-transparent lg:block"
              aria-hidden
            />
            <ol className="relative grid gap-8 lg:grid-cols-3 lg:gap-6">
              {STEPS.map((s) => (
                <li key={s.n} className="flex flex-col lg:items-center lg:text-center">
                  <span className="relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)] ring-2 ring-[var(--card)] ring-offset-2 ring-offset-[var(--background)] lg:mx-auto">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--foreground)] lg:mt-6">{s.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)] lg:mx-auto">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section
        className="border-t border-[color-mix(in_oklab,var(--foreground)_7%,transparent)] bg-[color-mix(in_oklab,var(--card)_35%,var(--background))] py-14 sm:py-16 lg:py-20"
        aria-labelledby="personas-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Who this is for</p>
            <h2 id="personas-heading" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Built for people who sell their time—and protect their focus
            </h2>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-12 lg:gap-6">
            {PERSONAS.map((p) => (
              <li key={p.title}>
                <LandingCard className="h-full">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.body}</p>
                </LandingCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 sm:py-16 lg:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Questions</p>
            <h2 id="faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Straight answers
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-3 lg:mt-12">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl bg-[var(--card)] px-5 py-1 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:px-6"
              >
                <summary className="cursor-pointer list-none py-4 text-base font-semibold text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] transition group-open:rotate-180"
                      aria-hidden
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  </span>
                </summary>
                <p className="border-t border-[color-mix(in_oklab,var(--foreground)_8%,transparent)] pb-4 pt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-14 pt-4 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20" aria-labelledby="final-cta-heading">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-[color-mix(in_oklab,var(--foreground)_7%,var(--surface-muted))] px-6 py-12 text-center shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--card)_40%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_10%,transparent)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <h2 id="final-cta-heading" className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Ready to simplify your bookings and get your time back?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
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
