import Link from "next/link";
import { and, asc, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { availabilityRules, bookings, customers, providers, services } from "@/db/schema";
import { ActionCenter, type SmartAction } from "@/components/dashboard/action-center";
import { CommandCenterStats } from "@/components/dashboard/command-center-stats";
import { DashboardQuickActionsBar } from "@/components/dashboard/dashboard-quick-actions";
import { NextAppointmentsPanel, type NextAppointmentRow } from "@/components/dashboard/next-appointments-panel";
import { PublicProfileLiveCard } from "@/components/dashboard/public-profile-live-card";
import { TodayOverview, type TodayBookingPreview } from "@/components/dashboard/today-overview";
import { WeeklySnapshot } from "@/components/dashboard/weekly-snapshot";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { getActivePublicBookingFailureSignal } from "@/domain/provider-dashboard-signals";
import { PublicBookingIssueBanner } from "@/components/dashboard/public-booking-issue-banner";
import { computeWeeklyAvailableMinutes } from "@/lib/dashboard-metrics";
import { getEnv } from "@/lib/env";
import { loadProviderSetupState } from "@/lib/provider-setup";
import { requireProvider } from "@/lib/tenancy";

export default async function DashboardHomePage() {
  const u = await requireProvider();
  const db = getDb();
  const csrf = await getCsrfTokenForForm();
  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const setup = await loadProviderSetupState(db, u.providerId, timezone);

  const [anyBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .limit(1);
  const hasAnyBooking = !!anyBooking;

  const [svcCur] = await db
    .select({ currency: services.currency })
    .from(services)
    .where(eq(services.providerId, u.providerId))
    .limit(1);
  const currencyLabel = (svcCur?.currency ?? "CAD").toUpperCase();

  const startOfToday = DateTime.now().setZone(timezone).startOf("day");
  const endOfToday = DateTime.now().setZone(timezone).endOf("day");
  const now = new Date();
  const z = DateTime.now().setZone(timezone);
  const weekStart = z.startOf("week").toJSDate();
  const weekEnd = z.endOf("week").toJSDate();

  const todayRows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    )
    .orderBy(asc(bookings.startsAt));

  const todayBookings: TodayBookingPreview[] = todayRows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt,
    status: r.status,
    customerName: r.customerName,
  }));

  const [revTodayRow] = await db
    .select({
      total: sql<string>`coalesce(sum((${bookings.paymentAmount})::numeric), 0)::text`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        eq(bookings.paymentStatus, "paid"),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    );
  const revenueToday = Number(revTodayRow?.total ?? 0);

  const upcomingRows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(eq(bookings.providerId, u.providerId))
    .orderBy(asc(bookings.startsAt))
    .limit(40);

  const nextUpRows = upcomingRows.filter((b) => b.startsAt >= now);
  const nextAppointments: NextAppointmentRow[] = nextUpRows.slice(0, 3).map((b) => ({
    id: b.id,
    startsAt: b.startsAt,
    status: b.status,
    customerName: b.customerName,
  }));

  const nextForOverview =
    nextUpRows[0] != null
      ? { startsAt: nextUpRows[0].startsAt, customerName: nextUpRows[0].customerName }
      : null;

  const upcoming = await db
    .select()
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .orderBy(desc(bookings.startsAt))
    .limit(5);

  const [wkCountRow] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, weekStart),
        lte(bookings.startsAt, weekEnd)
      )
    );
  const bookingsThisWeek = Number(wkCountRow?.n ?? 0);

  const [wkRevRow] = await db
    .select({
      total: sql<string>`coalesce(sum((${bookings.paymentAmount})::numeric), 0)::text`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        eq(bookings.paymentStatus, "paid"),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, weekStart),
        lte(bookings.startsAt, weekEnd)
      )
    );
  const revenueThisWeek = Number(wkRevRow?.total ?? 0);

  const availRuleRows = await db
    .select({
      dayOfWeek: availabilityRules.dayOfWeek,
      startTimeLocal: availabilityRules.startTimeLocal,
      endTimeLocal: availabilityRules.endTimeLocal,
      isActive: availabilityRules.isActive,
    })
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, u.providerId));

  const weekBookingsForUtil = await db
    .select({
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(eq(bookings.providerId, u.providerId), gte(bookings.startsAt, weekStart), lte(bookings.startsAt, weekEnd))
    );

  const availableWeeklyMinutes = computeWeeklyAvailableMinutes(timezone, availRuleRows, now);
  let bookedWeeklyMinutes = 0;
  for (const b of weekBookingsForUtil) {
    if (b.status === "cancelled") continue;
    bookedWeeklyMinutes += (b.endsAt.getTime() - b.startsAt.getTime()) / 60000;
  }
  const utilizationPercent =
    availableWeeklyMinutes > 0
      ? Math.min(100, Math.round((bookedWeeklyMinutes / availableWeeklyMinutes) * 100))
      : null;

  const published = setup.isPublished;
  const needsSetup = setup.needsSetup;

  const appUrl = getEnv().APP_URL.replace(/\/$/, "");
  const profileUrl = prov?.username ? `${appUrl}/${prov.username}` : appUrl;

  const bookingFailureSignal = await getActivePublicBookingFailureSignal(db, u.providerId);

  const actions: SmartAction[] = [];
  if (!hasAnyBooking) {
    actions.push({
      id: "no-bookings-campaign",
      title: "You have no bookings yet",
      body: "Create a campaign to reach new clients and fill your calendar.",
      href: "/dashboard/marketing",
      cta: "Create campaign",
    });
  }
  if (setup.customerCount === 1 && !actions.some((a) => a.id === "no-bookings-campaign")) {
    actions.push({
      id: "one-customer",
      title: "You have one customer",
      body: "Invite them back with a follow-up, offer, or campaign from Marketing.",
      href: "/dashboard/marketing",
      cta: "Invite them back",
    });
  }
  if (!setup.hasAvailability) {
    actions.push({
      id: "no-availability",
      title: "Your availability is empty",
      body: "Add weekly hours so clients can see open times and book you.",
      href: "/dashboard/availability",
      cta: "Add hours",
    });
  }
  if (setup.pendingBookingCount > 0) {
    actions.push({
      id: "pending",
      title: `${setup.pendingBookingCount} pending booking${setup.pendingBookingCount === 1 ? "" : "s"}`,
      body: "Confirm or adjust these requests before times slip away.",
      href: "/dashboard/bookings?filter=pending",
      cta: "Review pending",
    });
  }
  if (!setup.isPublished && setup.hasServices && setup.hasAvailability) {
    actions.push({
      id: "publish",
      title: "Profile isn’t live",
      body: "Publish your public profile so your booking link works for clients.",
      href: "/dashboard/profile",
      cta: "Publish profile",
    });
  }

  const fillerActions: SmartAction[] = [
    {
      id: "filler-marketing",
      title: "Stay on clients’ minds",
      body: "Send a promotion or reusable message from Marketing.",
      href: "/dashboard/marketing",
      cta: "Open marketing",
    },
    {
      id: "filler-services",
      title: "Tune what you sell",
      body: "Adjust services, timing, and pricing so bookings convert.",
      href: "/dashboard/services",
      cta: "Manage services",
    },
    {
      id: "filler-availability",
      title: "Protect your time",
      body: "Block personal time or extend hours where you want more volume.",
      href: "/dashboard/availability",
      cta: "Edit availability",
    },
    {
      id: "filler-customers",
      title: "Grow your list",
      body: "Add clients you already know so follow-ups stay organized.",
      href: "/dashboard/customers",
      cta: "View customers",
    },
  ];

  const seenIds = new Set(actions.map((a) => a.id));
  const hasMarketingHref = actions.some((a) => a.href === "/dashboard/marketing");
  const hasAvailabilityHref = actions.some((a) => a.href === "/dashboard/availability");
  for (const f of fillerActions) {
    if (actions.length >= 5) break;
    if (f.id === "filler-marketing" && hasMarketingHref) continue;
    if (f.id === "filler-availability" && hasAvailabilityHref) continue;
    if (!seenIds.has(f.id)) {
      actions.push(f);
      seenIds.add(f.id);
    }
  }

  return (
    <main id="main-content">
      <div className="mx-auto max-w-[800px]">
        <header className="pt-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Command center</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {needsSetup
              ? "Finish setup below, then use today’s overview and actions to drive bookings."
              : published
                ? "Run your day from here—bookings, revenue, and the next best move in one place."
                : "You’re close—publish when ready, then share your link to start filling the calendar."}
          </p>
        </header>

        <section className="mt-8 space-y-8 pb-12 sm:mt-10 sm:space-y-10">
          {bookingFailureSignal ? (
            <PublicBookingIssueBanner
              csrfToken={csrf}
              occurrenceCount={bookingFailureSignal.occurrenceCount}
              lastSeenAt={bookingFailureSignal.lastSeenAt}
            />
          ) : null}

          <TodayOverview
            timezone={timezone}
            todayBookings={todayBookings}
            revenueToday={revenueToday}
            currencyLabel={currencyLabel}
            nextBooking={nextForOverview}
            hasAnyBooking={hasAnyBooking}
            published={published}
            profileUrl={profileUrl}
            username={prov?.username}
          />

          <DashboardQuickActionsBar csrf={csrf} />

          <ActionCenter actions={actions.slice(0, 5)} />

          <CommandCenterStats setup={setup} />

          {!needsSetup && published && prov?.username ? (
            <PublicProfileLiveCard username={prov.username} profileUrl={profileUrl} />
          ) : null}

          <NextAppointmentsPanel
            timezone={timezone}
            appointments={nextAppointments}
            published={published}
            profileUrl={profileUrl}
            username={prov?.username}
          />

          <WeeklySnapshot
            bookingsThisWeek={bookingsThisWeek}
            revenueThisWeek={revenueThisWeek}
            currencyLabel={currencyLabel}
            utilizationPercent={utilizationPercent}
            hasAvailabilityRules={availRuleRows.some((r) => r.isActive)}
          />

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
                  ? "Latest movement on your bookings—newest first."
                  : "Once bookings exist, you’ll see a short trail here."}
              </p>
            </div>

            <div className="mt-4">
              {upcoming.length ? (
                <ul className="space-y-2 text-sm text-[var(--foreground)]">
                  {upcoming.map((b) => (
                    <li key={b.id}>
                      <Link href={`/dashboard/bookings/${b.id}`} className="ui-link font-medium">
                        {b.startsAt.toLocaleString(undefined, { timeZone: timezone })} — {b.status}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">No activity yet</p>
                  <p className="ui-hint mt-2 text-sm leading-relaxed">
                    Share your booking link or run a campaign—each new booking will appear here.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {published && prov?.username ? (
                      <Link
                        href={`/${prov.username}`}
                        className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
                      >
                        Open public profile
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/profile"
                        className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
                      >
                        Finish profile
                      </Link>
                    )}
                    <Link
                      href="/dashboard/marketing"
                      className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
                    >
                      Go to marketing
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
