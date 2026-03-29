import Link from "next/link";
import { DateTime } from "luxon";
import { eq, and, gte, lt, desc, asc, count, type InferSelectModel } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, customers, services, providers } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { TodayBookingCard } from "@/components/dashboard/bookings/today-booking-card";
import type { TodayBookingCardData } from "@/components/dashboard/bookings/today-booking-card";
import { UpcomingBookingsGrouped, PastBookingsList } from "@/components/dashboard/bookings/upcoming-past";
import {
  ManualBookingModalRoot,
  ManualBookingHeaderButton,
  ManualBookingEmptyButton,
} from "@/components/dashboard/bookings/add-manual-booking-modal";

type Props = { searchParams: Promise<{ filter?: string }> };

type DbRow = {
  booking: InferSelectModel<typeof bookings>;
  customer: { fullName: string };
  service: { name: string };
};

function toCard(row: DbRow): TodayBookingCardData {
  return {
    id: row.booking.id,
    startsAt: row.booking.startsAt,
    endsAt: row.booking.endsAt,
    status: row.booking.status,
    paymentStatus: row.booking.paymentStatus,
    serviceName: row.service.name,
    customerName: row.customer.fullName,
  };
}

export default async function BookingsPage({ searchParams }: Props) {
  const u = await requireProvider();
  const { filter: filterRaw } = await searchParams;
  const filter =
    filterRaw === "confirmed" || filterRaw === "pending" ? filterRaw : "all";

  const db = getDb();
  const csrf = await getCsrfTokenForForm();

  const [prov] = await db
    .select({
      timezone: providers.timezone,
      username: providers.username,
      bookingHorizonDays: providers.bookingHorizonDays,
    })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const publicProfilePath = prov?.username ? `/${prov.username}` : "/dashboard/profile";
  const horizonDays = Math.max(1, Math.min(Number(prov?.bookingHorizonDays) || 60, 120));
  const dayStart = DateTime.now().setZone(timezone).startOf("day");
  const minDateISO = dayStart.toISODate()!;
  const maxDateISO = dayStart.plus({ days: horizonDays }).toISODate()!;

  const serviceOptions = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.providerId, u.providerId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));

  const customerOptions = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
    })
    .from(customers)
    .where(eq(customers.providerId, u.providerId))
    .orderBy(asc(customers.fullName))
    .limit(500);

  const [totalRow] = await db
    .select({ n: count() })
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId));

  const totalBookings = Number(totalRow?.n ?? 0);

  const statusCond =
    filter === "confirmed"
      ? eq(bookings.status, "confirmed")
      : filter === "pending"
        ? eq(bookings.status, "pending")
        : null;

  const startOfToday = DateTime.now().setZone(timezone).startOf("day");
  const startOfTomorrow = startOfToday.plus({ days: 1 });

  const futureWhere = statusCond
    ? and(
        eq(bookings.providerId, u.providerId),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        statusCond
      )
    : and(eq(bookings.providerId, u.providerId), gte(bookings.startsAt, startOfToday.toJSDate()));

  const pastWhere = statusCond
    ? and(
        eq(bookings.providerId, u.providerId),
        lt(bookings.startsAt, startOfToday.toJSDate()),
        statusCond
      )
    : and(eq(bookings.providerId, u.providerId), lt(bookings.startsAt, startOfToday.toJSDate()));

  const futureRows: DbRow[] = await db
    .select({
      booking: bookings,
      customer: { fullName: customers.fullName },
      service: { name: services.name },
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(futureWhere)
    .orderBy(asc(bookings.startsAt))
    .limit(200);

  const pastRows: DbRow[] = await db
    .select({
      booking: bookings,
      customer: { fullName: customers.fullName },
      service: { name: services.name },
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(pastWhere)
    .orderBy(desc(bookings.startsAt))
    .limit(10);

  const todayCards: TodayBookingCardData[] = [];
  const upcomingCards: TodayBookingCardData[] = [];

  for (const row of futureRows) {
    const t = DateTime.fromMillis(row.booking.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
    const card = toCard(row);
    if (t >= startOfToday && t < startOfTomorrow) {
      todayCards.push(card);
    } else if (t >= startOfTomorrow) {
      upcomingCards.push(card);
    }
  }

  todayCards.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const pastCards = pastRows.map(toCard);

  const tabBase =
    "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors";
  const tabIdle =
    "border-[var(--border)] bg-[var(--card)] text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]";
  const tabActive = "border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] text-[var(--accent)]";

  const buildFilterHref = (f: "all" | "confirmed" | "pending") =>
    f === "all" ? "/dashboard/bookings" : `/dashboard/bookings?filter=${f}`;

  if (totalBookings === 0) {
    return (
      <ManualBookingModalRoot
        csrf={csrf}
        services={serviceOptions}
        customers={customerOptions}
        timezone={timezone}
        minDateISO={minDateISO}
        maxDateISO={maxDateISO}
      >
        <main id="main-content" className="mx-auto max-w-4xl">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Bookings</h1>
              <p className="mt-2 max-w-xl text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                See what&apos;s scheduled and stay on top of your day.
              </p>
            </div>
            <ManualBookingHeaderButton />
          </header>
          <div className="mt-12 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] px-6 py-14 text-center shadow-[var(--shadow-card)] sm:px-10">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">You don&apos;t have any bookings yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
              Share your profile link and clients will be able to book you—or add an appointment yourself.
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <ManualBookingEmptyButton className="ui-btn-primary inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold" />
              <Link
                href={publicProfilePath}
                className="ui-btn-secondary inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold"
              >
                View your public profile
              </Link>
            </div>
          </div>
        </main>
      </ManualBookingModalRoot>
    );
  }

  return (
    <ManualBookingModalRoot
      csrf={csrf}
      services={serviceOptions}
      customers={customerOptions}
      timezone={timezone}
      minDateISO={minDateISO}
      maxDateISO={maxDateISO}
    >
      <main id="main-content" className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Bookings</h1>
              <p className="mt-2 max-w-xl text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                See what&apos;s scheduled and stay on top of your day.
              </p>
            </div>
            <ManualBookingHeaderButton />
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
            <Link
              href={buildFilterHref("all")}
              className={`${tabBase} ${filter === "all" ? tabActive : tabIdle}`}
            >
              All
            </Link>
            <Link
              href={buildFilterHref("confirmed")}
              className={`${tabBase} ${filter === "confirmed" ? tabActive : tabIdle}`}
            >
              Confirmed
            </Link>
            <Link
              href={buildFilterHref("pending")}
              className={`${tabBase} ${filter === "pending" ? tabActive : tabIdle}`}
            >
              Pending
            </Link>
          </nav>
        </header>

      <section className="mt-10" aria-labelledby="bookings-today-heading">
        <h2 id="bookings-today-heading" className="text-lg font-semibold text-[var(--foreground)]">
          Today
        </h2>
        {todayCards.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-4">
            {todayCards.map((row) => (
              <li key={row.id}>
                <TodayBookingCard row={row} timezone={timezone} csrf={csrf} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] px-5 py-10 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">No bookings today</p>
            <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
              You&apos;re all clear for today.
            </p>
            <Link
              href="#upcoming"
              className="mt-6 inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
            >
              View upcoming bookings
            </Link>
          </div>
        )}
      </section>

      <section id="upcoming" className="mt-12 scroll-mt-24" aria-labelledby="bookings-upcoming-heading">
        <h2 id="bookings-upcoming-heading" className="text-lg font-semibold text-[var(--foreground)]">
          Upcoming
        </h2>
        <div className="mt-4">
          <UpcomingBookingsGrouped rows={upcomingCards} timezone={timezone} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="bookings-past-heading">
        <h2 id="bookings-past-heading" className="text-lg font-semibold text-[var(--foreground)]">
          Recent
        </h2>
        <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--muted-foreground)_95%,transparent)]">
          Quick reference — up to 10 most recent.
        </p>
        <div className="mt-4">
          <PastBookingsList rows={pastCards} timezone={timezone} />
        </div>
      </section>
      </main>
    </ManualBookingModalRoot>
  );
}
