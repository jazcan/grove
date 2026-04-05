import Link from "next/link";
import { DateTime } from "luxon";
import { eq, and, gte, lt, lte, desc, asc, count, type InferSelectModel } from "drizzle-orm";
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
import { BookingsCalendarPanel } from "@/components/dashboard/bookings/bookings-calendar-panel";
import type { BookingsCalendarEvent } from "@/components/dashboard/bookings/bookings-calendar-panel";
import { BookingsToolbar } from "@/components/dashboard/bookings/bookings-toolbar";

type Props = {
  searchParams: Promise<{
    filter?: string;
    day?: string;
    dayOff?: string;
    view?: string;
    jump?: string;
    openBooking?: string;
    customerId?: string;
  }>;
};

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

/** Legacy `day` was 0–4 from today only. */
function parseLegacyDay(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(4, Math.max(0, n));
}

export default async function BookingsPage({ searchParams }: Props) {
  const u = await requireProvider();
  const {
    filter: filterRaw,
    day: dayLegacyRaw,
    dayOff: dayOffRaw,
    view: viewRaw,
    jump: jumpRaw,
    openBooking: openBookingRaw,
    customerId: customerIdRaw,
  } = await searchParams;
  const autoOpenBooking = openBookingRaw === "1" || openBookingRaw === "true";
  const filter =
    filterRaw === "confirmed" || filterRaw === "pending" ? filterRaw : "all";
  const view = viewRaw === "calendar" ? "calendar" : "list";

  const db = getDb();
  const csrf = await getCsrfTokenForForm();

  const [prov] = await db
    .select({
      timezone: providers.timezone,
      username: providers.username,
      bookingHorizonDays: providers.bookingHorizonDays,
      paymentCash: providers.paymentCash,
      paymentEtransfer: providers.paymentEtransfer,
      paymentInPersonCreditDebit: providers.paymentInPersonCreditDebit,
    })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const publicProfilePath = prov?.username ? `/${prov.username}` : "/dashboard/profile";
  const horizonDays = Math.max(1, Math.min(Number(prov?.bookingHorizonDays) || 60, 120));
  const maxDayOff = horizonDays;
  const dayStart = DateTime.now().setZone(timezone).startOf("day");
  const minDateISO = dayStart.toISODate()!;
  const maxDateISO = dayStart.plus({ days: horizonDays }).toISODate()!;

  const serviceOptions = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceAmount: services.priceAmount,
      pricingType: services.pricingType,
      currency: services.currency,
    })
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

  const preselectCustomerId =
    customerIdRaw && customerOptions.some((c) => c.id === customerIdRaw)
      ? customerIdRaw
      : undefined;

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

  let dayOff = 0;
  if (jumpRaw && /^\d{4}-\d{2}-\d{2}$/.test(jumpRaw)) {
    const j = DateTime.fromISO(jumpRaw, { zone: timezone }).startOf("day");
    dayOff = Math.round(j.diff(startOfToday, "days").days);
  } else if (dayOffRaw !== undefined && dayOffRaw !== "") {
    const n = Number.parseInt(dayOffRaw, 10);
    if (!Number.isNaN(n)) dayOff = n;
  } else {
    const legacy = parseLegacyDay(dayLegacyRaw);
    if (legacy !== null) dayOff = legacy;
  }
  dayOff = Math.max(0, Math.min(maxDayOff, dayOff));

  const stripBase = Math.floor(dayOff / 5) * 5;
  const visibleCount = Math.min(5, maxDayOff - stripBase + 1);
  const canPrevWindow = stripBase >= 5;
  const canNextWindow = stripBase + 5 <= maxDayOff;
  const prevWindowDayOff = Math.max(0, stripBase - 5);
  const nextWindowDayOff = Math.min(maxDayOff, stripBase + 5);

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
    .limit(400);

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

  const stripRangeStart = startOfToday.plus({ days: stripBase });
  const stripRangeEndExclusive = stripRangeStart.plus({ days: visibleCount });

  const stripStatRows = await db
    .select({
      startsAt: bookings.startsAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        gte(bookings.startsAt, stripRangeStart.toJSDate()),
        lt(bookings.startsAt, stripRangeEndExclusive.toJSDate())
      )
    );

  const stripDayBuckets = new Map<string, { total: number; hasPending: boolean }>();
  for (let i = 0; i < visibleCount; i++) {
    const iso = startOfToday.plus({ days: stripBase + i }).toISODate()!;
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
  for (let i = 0; i < visibleCount; i++) {
    const offsetFromToday = stripBase + i;
    const d = startOfToday.plus({ days: offsetFromToday });
    const iso = d.toISODate()!;
    const bucket = stripDayBuckets.get(iso) ?? { total: 0, hasPending: false };
    const shortLabel =
      offsetFromToday === 0 ? "Today" : offsetFromToday === 1 ? "Tomorrow" : d.toFormat("EEE");
    stripDays.push({
      offsetFromToday,
      shortLabel,
      dayOfMonth: d.day,
      isoDate: iso,
      total: bucket.total,
      hasPending: bucket.hasPending,
    });
  }

  const selectedDayStart = startOfToday.plus({ days: dayOff });
  const selectedIso = selectedDayStart.toISODate()!;

  const firstUpcomingDay = stripRangeStart.plus({ days: visibleCount });

  const selectedDayCards: TodayBookingCardData[] = [];
  const upcomingCards: TodayBookingCardData[] = [];

  for (const row of futureRows) {
    const t = DateTime.fromMillis(row.booking.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
    const card = toCard(row);
    const rowIso = t.toISODate();
    if (rowIso === selectedIso) {
      selectedDayCards.push(card);
    }
    if (t.startOf("day") >= firstUpcomingDay.startOf("day")) {
      upcomingCards.push(card);
    }
  }

  selectedDayCards.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  upcomingCards.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const pastCards = pastRows.map(toCard);

  const nowInTz = DateTime.now().setZone(timezone);
  const selectedDayEyebrow =
    dayOff === 0 ? "Today" : dayOff === 1 ? "Tomorrow" : selectedDayStart.toFormat("cccc");
  const selectedDayTitle =
    selectedDayStart.year !== nowInTz.year
      ? selectedDayStart.toFormat("LLLL d, yyyy")
      : selectedDayStart.toFormat("LLLL d");

  const filterEmptyHint =
    filter === "confirmed"
      ? "confirmed "
      : filter === "pending"
        ? "pending "
        : "";

  const selectedWeekdayName = selectedDayStart.toFormat("cccc");

  const emptyWhenPhrase =
    dayOff === 0 ? "today" : dayOff === 1 ? "tomorrow" : `on ${selectedWeekdayName}`;

  const horizonEnd = startOfToday.plus({ days: horizonDays }).endOf("day");

  const calWhereParts = [
    eq(bookings.providerId, u.providerId),
    gte(bookings.startsAt, startOfToday.toJSDate()),
    lte(bookings.startsAt, horizonEnd.toJSDate()),
  ];
  if (statusCond) calWhereParts.push(statusCond);

  const calRows = await db
    .select({
      booking: bookings,
      customer: { fullName: customers.fullName },
      service: { name: services.name },
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(...calWhereParts))
    .orderBy(asc(bookings.startsAt))
    .limit(500);

  const calendarEvents: BookingsCalendarEvent[] = calRows.map((r) => ({
    id: r.booking.id,
    startsAtISO: r.booking.startsAt.toISOString(),
    endsAtISO: r.booking.endsAt.toISOString(),
    status: r.booking.status,
    serviceName: r.service.name,
    customerName: r.customer.fullName,
  }));

  const modalProps = {
    csrf,
    services: serviceOptions,
    customers: customerOptions,
    timezone,
    minDateISO,
    maxDateISO,
    paymentCash: prov?.paymentCash ?? true,
    paymentEtransfer: prov?.paymentEtransfer ?? false,
    paymentInPersonCreditDebit: prov?.paymentInPersonCreditDebit ?? false,
    autoOpen: autoOpenBooking,
    preselectCustomerId,
  };

  if (totalBookings === 0) {
    return (
      <ManualBookingModalRoot {...modalProps}>
        <main id="main-content" className="mx-auto max-w-4xl">
          <header className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-4 shadow-[var(--shadow-sm)] sm:flex sm:items-start sm:justify-between sm:gap-6 sm:p-5">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Bookings</h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                Your schedule at a glance—add a visit anytime or share your link so clients can book you.
              </p>
            </div>
            <div className="mt-4 shrink-0 sm:mt-0">
              <ManualBookingHeaderButton />
            </div>
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
    <ManualBookingModalRoot {...modalProps}>
      <main id="main-content" className="mx-auto max-w-4xl">
        <header className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-4 shadow-[var(--shadow-sm)] sm:flex sm:items-start sm:justify-between sm:gap-6 sm:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Bookings</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
              Your schedule at a glance—filter by status, switch layouts, or open a day to work the list.
            </p>
            <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{totalBookings}</span>
              {" "}
              appointment{totalBookings !== 1 ? "s" : ""} on file
            </p>
          </div>
          <div className="mt-4 shrink-0 sm:mt-0">
            <ManualBookingHeaderButton />
          </div>
        </header>

        <div className="mt-6">
          <BookingsToolbar
            view={view}
            dayOff={dayOff}
            filter={filter}
            jumpDateMin={minDateISO}
            jumpDateMax={maxDateISO}
            currentDateISO={selectedIso}
            openBooking={autoOpenBooking}
            customerId={customerIdRaw}
          />
        </div>

        {view === "calendar" ? (
          <div className="mt-8">
            <BookingsCalendarPanel
              timezone={timezone}
              events={calendarEvents}
              initialDateISO={selectedIso}
            />
          </div>
        ) : (
          <>
            <div className="mt-7">
              <BookingsFiveDayStrip
                days={stripDays}
                selectedDayOff={dayOff}
                filter={filter}
                view={view}
                canPrevWindow={canPrevWindow}
                canNextWindow={canNextWindow}
                prevWindowDayOff={prevWindowDayOff}
                nextWindowDayOff={nextWindowDayOff}
              />
            </div>

            <section
              id="day-schedule"
              className="mt-10 scroll-mt-24"
              aria-labelledby="bookings-day-heading"
            >
              <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[var(--card)] px-4 py-4 shadow-[var(--shadow-sm)] sm:px-5 sm:py-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
                      {selectedDayEyebrow}
                    </p>
                    <h2 id="bookings-day-heading" className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                      {selectedDayTitle}
                    </h2>
                  </div>
                  {selectedDayCards.length > 0 ? (
                    <p className="text-xs font-medium tabular-nums text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                      {selectedDayCards.length === 1 ? "1 booking" : `${selectedDayCards.length} bookings`}
                    </p>
                  ) : null}
                </div>
                {filter !== "all" ? (
                  <p className="mt-3 text-xs leading-relaxed text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                    {filter === "confirmed"
                      ? "Showing confirmed only—use All or Pending in the bar above to widen the list."
                      : "Showing pending only—use All or Confirmed in the bar above to widen the list."}
                  </p>
                ) : null}
              </div>
              {selectedDayCards.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-3 sm:gap-3.5">
                  {selectedDayCards.map((row) => (
                    <li key={row.id}>
                      <TodayBookingCard row={row} timezone={timezone} csrf={csrf} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--foreground)_12%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] px-5 py-8 text-center sm:py-9">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    No {filterEmptyHint}bookings {emptyWhenPhrase}
                  </p>
                  <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                    That day is open—share your booking link or follow up with someone who&apos;s been meaning to book.
                  </p>
                  {dayOff < maxDayOff ? (
                    <Link
                      href={`/dashboard/bookings?${new URLSearchParams({
                        ...(filter !== "all" ? { filter } : {}),
                        dayOff: String(dayOff + 1),
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

            <section id="upcoming" className="mt-14 scroll-mt-24" aria-labelledby="bookings-upcoming-heading">
              <h2 id="bookings-upcoming-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Later upcoming
              </h2>
              <p className="mt-1.5 text-sm text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                Past the five-day strip, with the same status filter.
              </p>
              <div className="mt-4">
                <UpcomingBookingsGrouped rows={upcomingCards} timezone={timezone} />
              </div>
            </section>
          </>
        )}

        {view === "list" ? (
          <section className="mt-14" aria-labelledby="bookings-past-heading">
            <h2 id="bookings-past-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Recent
            </h2>
            <p className="mt-1.5 text-sm text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              Up to the 10 most recent past appointments.
            </p>
            <div className="mt-4">
              <PastBookingsList rows={pastCards} timezone={timezone} />
            </div>
          </section>
        ) : (
          <section className="mt-14" aria-labelledby="bookings-past-heading">
            <h2 id="bookings-past-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Recent
            </h2>
            <p className="mt-1.5 text-sm text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              List view groups by day; here&apos;s a short history either way.
            </p>
            <div className="mt-4">
              <PastBookingsList rows={pastCards} timezone={timezone} />
            </div>
          </section>
        )}
      </main>
    </ManualBookingModalRoot>
  );
}
