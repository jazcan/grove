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
import {
  BookingsFiveDayStrip,
  type FiveDayStripDay,
} from "@/components/dashboard/bookings/bookings-five-day-strip";

type Props = { searchParams: Promise<{ filter?: string; day?: string }> };

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

function parseDayOffset(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(4, Math.max(0, n));
}

export default async function BookingsPage({ searchParams }: Props) {
  const u = await requireProvider();
  const { filter: filterRaw, day: dayRaw } = await searchParams;
  const filter =
    filterRaw === "confirmed" || filterRaw === "pending" ? filterRaw : "all";
  const selectedDayOffset = parseDayOffset(dayRaw);

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

  /** Schedule totals for the strip (all statuses) so counts match what’s on the calendar. */
  const fiveDayEndExclusive = startOfToday.plus({ days: 5 });
  const stripStatRows = await db
    .select({
      startsAt: bookings.startsAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lt(bookings.startsAt, fiveDayEndExclusive.toJSDate())
      )
    );

  const stripDayBuckets = new Map<string, { total: number; hasPending: boolean }>();
  for (let o = 0; o < 5; o++) {
    const iso = startOfToday.plus({ days: o }).toISODate()!;
    stripDayBuckets.set(iso, { total: 0, hasPending: false });
  }
  for (const r of stripStatRows) {
    const t = DateTime.fromMillis(r.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
    const iso = t.toISODate();
    if (!iso) continue;
    const b = stripDayBuckets.get(iso);
    if (!b) continue;
    b.total += 1;
    if (r.status === "pending") b.hasPending = true;
  }

  const stripDays: FiveDayStripDay[] = [];
  for (let offset = 0; offset < 5; offset++) {
    const d = startOfToday.plus({ days: offset });
    const iso = d.toISODate()!;
    const bucket = stripDayBuckets.get(iso) ?? { total: 0, hasPending: false };
    const shortLabel =
      offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toFormat("EEE");
    stripDays.push({
      offset,
      shortLabel,
      dayOfMonth: d.day,
      isoDate: iso,
      total: bucket.total,
      hasPending: bucket.hasPending,
    });
  }

  const selectedDayStart = startOfToday.plus({ days: selectedDayOffset });
  const selectedIso = selectedDayStart.toISODate()!;

  const selectedDayCards: TodayBookingCardData[] = [];
  const upcomingCards: TodayBookingCardData[] = [];

  for (const row of futureRows) {
    const t = DateTime.fromMillis(row.booking.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
    const card = toCard(row);
    const rowIso = t.toISODate();
    if (rowIso === selectedIso) {
      selectedDayCards.push(card);
    }
    if (t >= fiveDayEndExclusive) {
      upcomingCards.push(card);
    }
  }

  selectedDayCards.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  upcomingCards.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const pastCards = pastRows.map(toCard);

  const tabBase =
    "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors";
  const tabIdle =
    "border-[var(--border)] bg-[var(--card)] text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]";
  const tabActive = "border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] text-[var(--accent)]";

  const buildFilterHref = (f: "all" | "confirmed" | "pending") => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    if (selectedDayOffset !== 0) params.set("day", String(selectedDayOffset));
    const q = params.toString();
    return q ? `/dashboard/bookings?${q}` : "/dashboard/bookings";
  };

  const selectedDayHeading =
    selectedDayOffset === 0
      ? "Today"
      : selectedDayOffset === 1
        ? "Tomorrow"
        : selectedDayStart.toFormat("cccc, LLL d");

  const filterEmptyHint =
    filter === "confirmed"
      ? "confirmed "
      : filter === "pending"
        ? "pending "
        : "";

  const selectedWeekdayName = selectedDayStart.toFormat("cccc");

  const emptyWhenPhrase =
    selectedDayOffset === 0
      ? "today"
      : selectedDayOffset === 1
        ? "tomorrow"
        : `on ${selectedWeekdayName}`;

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
                See what&apos;s coming up and stay organized.
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
                See what&apos;s coming up and stay organized.
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

      <div className="mt-8">
        <BookingsFiveDayStrip days={stripDays} selectedOffset={selectedDayOffset} filter={filter} />
      </div>

      <section
        id="day-schedule"
        className="mt-8 scroll-mt-24"
        aria-labelledby="bookings-day-heading"
      >
        <h2 id="bookings-day-heading" className="text-lg font-semibold text-[var(--foreground)]">
          {selectedDayHeading}
        </h2>
        <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--muted-foreground)_95%,transparent)]">
          {filter === "all"
            ? "Bookings on this day in your time zone."
            : filter === "confirmed"
              ? "Showing confirmed bookings only—change the filter above to see other statuses."
              : "Showing pending bookings only—change the filter above to see other statuses."}
        </p>
        {selectedDayCards.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-4">
            {selectedDayCards.map((row) => (
              <li key={row.id}>
                <TodayBookingCard row={row} timezone={timezone} csrf={csrf} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] px-5 py-8 text-center sm:py-9">
            <p className="text-sm font-medium text-[var(--foreground)]">
              No {filterEmptyHint}bookings {emptyWhenPhrase}
            </p>
            <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
              That day is open—share your booking link or ping someone who&apos;s been meaning to get on the calendar.
            </p>
            {selectedDayOffset < 4 ? (
              <Link
                href={`/dashboard/bookings?${new URLSearchParams({
                  ...(filter !== "all" ? { filter } : {}),
                  day: String(selectedDayOffset + 1),
                }).toString()}#day-schedule`}
                className="mt-6 inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
              >
                See the next day
              </Link>
            ) : (
              <Link
                href="#upcoming"
                className="mt-6 inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
              >
                See further out
              </Link>
            )}
          </div>
        )}
      </section>

      <section id="upcoming" className="mt-12 scroll-mt-24" aria-labelledby="bookings-upcoming-heading">
        <h2 id="bookings-upcoming-heading" className="text-lg font-semibold text-[var(--foreground)]">
          Upcoming
        </h2>
        <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--muted-foreground)_95%,transparent)]">
          After the next five days—same filters as above.
        </p>
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
