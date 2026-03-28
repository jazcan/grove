import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { availabilityRules, bookings, providers, services } from "@/db/schema";
import { CopyPublicProfileUrlButton } from "@/components/dashboard/copy-public-profile-url-button";
import { DashboardNextSteps } from "@/components/dashboard/dashboard-next-steps";
import { PublicProfileLiveCard } from "@/components/dashboard/public-profile-live-card";
import { getEnv } from "@/lib/env";
import { requireProvider } from "@/lib/tenancy";

export default async function DashboardHomePage() {
  const u = await requireProvider();
  const db = getDb();
  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const [anyService] = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.providerId, u.providerId))
    .limit(1);

  const [anyRule] = await db
    .select({ id: availabilityRules.id })
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, u.providerId))
    .limit(1);

  const [anyBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .limit(1);

  const upcoming = await db
    .select()
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .orderBy(desc(bookings.startsAt))
    .limit(5);

  const now = new Date();
  const soon = await db
    .select()
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .orderBy(bookings.startsAt)
    .limit(20);

  const nextUp = soon.filter((b) => b.startsAt >= now).slice(0, 3);
  const published = !!prov?.publicProfileEnabled;
  const hasServices = !!anyService;
  const hasAvailability = !!anyRule;
  const needsSetup = !published || !hasServices || !hasAvailability;
  const profileBasicsComplete = !!prov?.username && !!prov?.displayName;
  const hasAnyBooking = !!anyBooking;

  const appUrl = getEnv().APP_URL.replace(/\/$/, "");
  const profileUrl = prov?.username ? `${appUrl}/${prov.username}` : appUrl;

  const nextSteps = [
    {
      key: "services",
      label: "Add your services",
      hint: "List what you offer, how long it takes, and your price.",
      done: hasServices,
      href: "/dashboard/services",
      cta: "Add services",
    },
    {
      key: "availability",
      label: "Set your availability",
      hint: "Choose the times clients can book you on your schedule.",
      done: hasAvailability,
      href: "/dashboard/availability",
      cta: "Set availability",
    },
    {
      key: "share",
      label: "Start sharing your profile",
      hint: "Turn on your public profile and reach out to a few clients.",
      done: published && profileBasicsComplete,
      href: "/dashboard/profile",
      cta: "Open profile",
    },
  ] as const;

  return (
    <main id="main-content">
      <div className="mx-auto max-w-[800px]">
        <header className="pt-1">
          {!hasAnyBooking ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {needsSetup ? "Let’s finish your setup" : "You’re ready—let’s get your first booking"}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
                {needsSetup
                  ? "Complete the steps below so clients can see your services and book time with you."
                  : "You’ve set up your profile. Now let clients find you and start booking."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
                {published
                  ? "Here’s what’s happening with your business."
                  : "You’re almost ready to start accepting bookings."}
              </p>
            </>
          )}
        </header>

        <section className="mt-8 space-y-8 pb-12 sm:mt-10 sm:space-y-10">
          {!hasAnyBooking ? <DashboardNextSteps steps={[...nextSteps]} /> : null}

          {!needsSetup && published && prov?.username ? (
            <PublicProfileLiveCard username={prov.username} profileUrl={profileUrl} />
          ) : null}

          <section aria-labelledby="upcoming-heading" className="ui-card p-5 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <h2 id="upcoming-heading" className="text-lg font-semibold tracking-tight">
                  Next appointments
                </h2>
                <p className="ui-hint mt-2">Your upcoming schedule at a glance.</p>
              </div>
              <Link href="/dashboard/bookings" className="ui-link shrink-0 text-sm font-semibold">
                View all
              </Link>
            </div>

            <div className="mt-6">
              {nextUp.length ? (
                <ul className="space-y-3">
                  {nextUp.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/dashboard/bookings/${b.id}`}
                        className="ui-card block px-4 py-3 shadow-none transition-colors hover:bg-[var(--surface-muted)] sm:px-5 sm:py-4"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold capitalize text-[var(--foreground)]">
                            {b.status}
                          </span>
                          <time className="text-sm text-[var(--muted)]" dateTime={b.startsAt.toISOString()}>
                            {b.startsAt.toLocaleString()}
                          </time>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ui-empty-state flex flex-col items-center px-5 py-8 text-center sm:flex-row sm:items-start sm:text-left">
                  <div
                    className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent-soft-border)] sm:mb-0 sm:mr-5"
                    aria-hidden
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--foreground)]">No bookings yet</div>
                    <p className="ui-hint mt-2 leading-relaxed">
                      When clients book you, your upcoming appointments will appear here.
                    </p>
                    {published && prov?.username ? (
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Link href={`/${prov.username}`} className="ui-btn-primary inline-flex min-h-11 justify-center text-sm no-underline">
                          Preview your profile
                        </Link>
                        <CopyPublicProfileUrlButton
                          url={profileUrl}
                          className="ui-btn-secondary inline-flex min-h-11 justify-center px-5 py-2.5 text-sm font-semibold"
                        >
                          Share with clients
                        </CopyPublicProfileUrlButton>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            aria-labelledby="recent-heading"
            className={[
              "rounded-xl border border-dashed border-[var(--card-border)] bg-[color-mix(in_oklab,var(--surface-muted)_40%,var(--card))] p-4 sm:p-5",
              !hasAnyBooking ? "opacity-95" : "",
            ].join(" ")}
          >
            <div>
              <h2 id="recent-heading" className="text-base font-medium tracking-tight text-[var(--muted)]">
                Recent activity
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {hasAnyBooking
                  ? "Updates from your latest bookings."
                  : "When bookings come in, a short history will show here."}
              </p>
            </div>

            <div className="mt-4">
              {upcoming.length ? (
                <ul className="space-y-2 text-sm text-[var(--foreground)]">
                  {upcoming.map((b) => (
                    <li key={b.id}>
                      <Link href={`/dashboard/bookings/${b.id}`} className="ui-link font-medium">
                        {b.startsAt.toLocaleString()} — {b.status}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted)]">Nothing to show yet—bookings will list here.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
