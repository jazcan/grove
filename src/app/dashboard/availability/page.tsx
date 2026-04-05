import { eq, asc, and, lt, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { availabilityRules, blockedTimes, bookings, customers, providers, services } from "@/db/schema";
import { asFormAction } from "@/lib/form-action";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { CsrfField } from "@/components/csrf-field";
import { TimeLocalSelect } from "@/components/time-local-select";
import { requireProvider } from "@/lib/tenancy";
import { AvailabilityCalendar } from "@/app/dashboard/availability/availability-calendar";
import { AvailabilityQuickBlockBar } from "@/app/dashboard/availability/availability-quick-block-bar";
import { BlockedTimeList } from "@/app/dashboard/availability/blocked-time-list";
import { WeeklyScheduleRow } from "@/app/dashboard/availability/weekly-schedule-row";
import {
  applyHoursToWeekdays,
  applyWorkingHoursPreset,
  setBookingsPaused,
  upsertAvailabilityRule,
} from "@/actions/availability";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = { searchParams: Promise<{ saved?: string }> };

export default async function AvailabilityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const saved = sp.saved === "hours" || sp.saved === "blocked" || sp.saved === "pause";
  const u = await requireProvider();
  const db = getDb();
  const [prov] = await db
    .select({
      timezone: providers.timezone,
      publicProfileEnabled: providers.publicProfileEnabled,
      username: providers.username,
      bookingsPaused: providers.bookingsPaused,
    })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, u.providerId))
    .orderBy(asc(availabilityRules.dayOfWeek));
  const blocks = await db
    .select()
    .from(blockedTimes)
    .where(eq(blockedTimes.providerId, u.providerId))
    .orderBy(asc(blockedTimes.startsAt));

  const now = new Date();
  const rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const appts = await db
    .select({
      booking: bookings,
      serviceName: services.name,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        lt(bookings.startsAt, rangeEnd),
        gt(bookings.endsAt, rangeStart)
      )
    )
    .orderBy(asc(bookings.startsAt));

  const csrf = await getCsrfTokenForForm();

  const hasAvailability = rules.some((r) => r.isActive);
  const activeDayCount = new Set(rules.filter((r) => r.isActive).map((r) => r.dayOfWeek)).size;
  const suggestMoreDays = activeDayCount > 0 && activeDayCount < 2;

  const tz = prov?.timezone ?? "UTC";
  const bookingsPaused = !!prov?.bookingsPaused;

  const calendarProps = {
    timezone: tz,
    rules: rules.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      startTimeLocal: r.startTimeLocal,
      endTimeLocal: r.endTimeLocal,
      isActive: r.isActive,
    })),
    blocked: blocks
      .filter((b) => b.endsAt > rangeStart && b.startsAt < rangeEnd)
      .map((b) => ({
        id: b.id,
        startsAtISO: b.startsAt.toISOString(),
        endsAtISO: b.endsAt.toISOString(),
        reason: b.reason ?? null,
      })),
    bookings: appts
      .filter((r) => r.booking.endsAt > rangeStart && r.booking.startsAt < rangeEnd)
      .map((r) => ({
        id: r.booking.id,
        startsAtISO: r.booking.startsAt.toISOString(),
        endsAtISO: r.booking.endsAt.toISOString(),
        status: r.booking.status,
        paymentStatus: r.booking.paymentStatus,
        bufferAfterMinutes: r.booking.bufferAfterMinutes,
        serviceName: r.serviceName,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
        customerPhone: r.customerPhone ?? null,
        publicReference: r.booking.publicReference,
      })),
  } as const;

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
          Stay in control of your time.
        </p>
        {saved ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--background))] px-4 py-3 text-sm"
          >
            <div className="font-medium">Saved</div>
            <div className="mt-0.5 text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
              {sp.saved === "pause"
                ? bookingsPaused
                  ? "New public bookings are paused. Existing appointments are unchanged."
                  : "You’re accepting new bookings again."
                : "Your availability has been updated."}
            </div>
          </div>
        ) : null}

        {!hasAvailability ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_12%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--background))] px-4 py-3 text-sm"
          >
            <div className="font-medium text-[var(--foreground)]">Tip</div>
            <p className="mt-1 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
              Add at least two days of weekly hours (or use a preset) so clients see more options.
            </p>
          </div>
        ) : suggestMoreDays ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_12%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--background))] px-4 py-3 text-sm"
          >
            <div className="font-medium text-[var(--foreground)]">Tip</div>
            <p className="mt-1 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
              You only have one active day. Add another weekday for more booking slots.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-4 sm:p-5">
            <div className="text-sm font-semibold text-[var(--foreground)]">Pause new bookings</div>
            <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              Temporarily stop new bookings while keeping your schedule intact.
            </p>
            <form action={asFormAction(setBookingsPaused)} className="mt-4">
              <CsrfField token={csrf} />
              <input type="hidden" name="paused" value={bookingsPaused ? "false" : "true"} />
              <button type="submit" className={bookingsPaused ? "ui-btn-primary min-h-11 w-full text-sm font-semibold sm:w-auto" : "ui-btn-secondary min-h-11 w-full text-sm font-semibold sm:w-auto"}>
                {bookingsPaused ? "Resume accepting bookings" : "Pause new bookings"}
              </button>
            </form>
            {bookingsPaused ? (
              <p className="mt-2 text-xs font-medium text-[var(--accent)]">Paused — no times on your public page.</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-4 sm:p-5">
            <div className="text-sm font-semibold text-[var(--foreground)]">Working hours presets</div>
            <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              Replaces weekly hours only (not blocked time).
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <form action={asFormAction(applyWorkingHoursPreset)} className="min-w-0 flex-1 sm:min-w-[200px]">
                <CsrfField token={csrf} />
                <input type="hidden" name="preset" value="nine_to_five" />
                <button type="submit" className="ui-btn-secondary min-h-11 w-full px-4 text-sm font-semibold">
                  9–5 weekdays
                </button>
              </form>
              <form action={asFormAction(applyWorkingHoursPreset)} className="min-w-0 flex-1 sm:min-w-[200px]">
                <CsrfField token={csrf} />
                <input type="hidden" name="preset" value="evenings_only" />
                <button type="submit" className="ui-btn-secondary min-h-11 w-full px-4 text-sm font-semibold">
                  Evenings (5–9pm)
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <AvailabilityCalendar
          csrf={csrf}
          {...calendarProps}
          quickBlock={<AvailabilityQuickBlockBar csrf={csrf} timezone={tz} />}
        />
      </section>

      <section id="weekly-schedule" className="mt-14 scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Weekly hours</h2>
        <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
          Turn days on or off and set start and end times. Use Apply to Mon–Fri for a quick batch update.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <form
            action={asFormAction(applyHoursToWeekdays)}
            className="border-b border-[color-mix(in_oklab,var(--foreground)_5%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--background))] px-4 py-3 sm:px-5"
          >
            <CsrfField token={csrf} />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
              <p className="text-sm font-semibold text-[var(--foreground)] sm:shrink-0">Apply to Mon–Fri</p>
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3">
                <label className="ui-field min-w-[120px] flex-1 text-sm sm:max-w-[160px]">
                  <span className="ui-label">Start</span>
                  <TimeLocalSelect name="startTimeLocal" defaultValue="09:00" />
                </label>
                <label className="ui-field min-w-[120px] flex-1 text-sm sm:max-w-[160px]">
                  <span className="ui-label">End</span>
                  <TimeLocalSelect name="endTimeLocal" defaultValue="17:00" />
                </label>
                <button type="submit" className="ui-btn-primary min-h-10 w-full px-5 text-sm font-semibold sm:w-auto">
                  Apply
                </button>
              </div>
            </div>
          </form>

          <div className="px-0 py-0 sm:px-1">
            {rules.length ? (
              rules.map((r) => (
                <WeeklyScheduleRow
                  key={r.id}
                  csrf={csrf}
                  compact
                  rule={{
                    id: r.id,
                    dayOfWeek: r.dayOfWeek,
                    startTimeLocal: r.startTimeLocal,
                    endTimeLocal: r.endTimeLocal,
                    isActive: r.isActive,
                  }}
                />
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                No weekly rows yet — use a preset or add a window below.
              </p>
            )}
          </div>
        </div>

        <form action={asFormAction(upsertAvailabilityRule)} className="mt-6 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <CsrfField token={csrf} />
          <p className="text-sm font-semibold text-[var(--foreground)]">Add a window</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="ui-field min-w-[140px] flex-1 text-sm sm:max-w-[180px]">
              <span className="ui-label">Day</span>
              <select name="dayOfWeek" className="ui-input mt-1">
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field min-w-[140px] flex-1 text-sm sm:max-w-[200px]">
              <span className="ui-label">Start</span>
              <TimeLocalSelect name="startTimeLocal" defaultValue="09:00" />
            </label>
            <label className="ui-field min-w-[140px] flex-1 text-sm sm:max-w-[200px]">
              <span className="ui-label">End</span>
              <TimeLocalSelect name="endTimeLocal" defaultValue="17:00" />
            </label>
            <input type="hidden" name="isActive" value="on" />
            <button type="submit" className="ui-btn-primary min-h-11 w-full px-6 text-sm font-semibold sm:ml-auto sm:w-auto">
              Add
            </button>
          </div>
        </form>
      </section>

      <section id="blocked-time-list" className="mt-16 scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Blocked time</h2>
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">Remove blocks you no longer need.</p>
        <div className="mt-6">
          <BlockedTimeList
            timezone={tz}
            csrf={csrf}
            blocks={blocks.map((b) => ({
              id: b.id,
              startsAt: b.startsAt,
              endsAt: b.endsAt,
              reason: b.reason,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
