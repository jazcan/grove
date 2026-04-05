import Link from "next/link";
import { DateTime } from "luxon";
import { BookingStatusBadge } from "./booking-status-badge";
import type { TodayBookingCardData } from "./today-booking-card";

export function UpcomingBookingsGrouped({
  rows,
  timezone,
}: {
  rows: TodayBookingCardData[];
  timezone: string;
}) {
  const groups = new Map<string, TodayBookingCardData[]>();
  for (const row of rows) {
    const dt = DateTime.fromMillis(row.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
    const key = dt.toISODate() ?? "";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const keys = [...groups.keys()].sort();

  if (keys.length === 0) {
    return (
      <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">No upcoming bookings.</p>
    );
  }

  const nowYear = DateTime.now().setZone(timezone).year;

  return (
    <div className="space-y-8">
      {keys.map((key) => {
        const day = DateTime.fromISO(key, { zone: timezone });
        const weekday = day.toFormat("cccc");
        const dateLine =
          day.year === nowYear ? day.toFormat("LLLL d") : day.toFormat("LLLL d, yyyy");
        const items = groups.get(key) ?? [];
        return (
          <section
            key={key}
            className="overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[var(--card)] shadow-[var(--shadow-sm)]"
          >
            <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
                  {weekday}
                </p>
                <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">{dateLine}</h3>
              </div>
              <p className="shrink-0 pt-0.5 text-xs font-medium tabular-nums text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                {items.length === 1 ? "1 booking" : `${items.length} bookings`}
              </p>
            </header>
            <ul className="space-y-2 p-3 sm:space-y-2.5 sm:p-4">
              {items.map((row) => {
                const start = DateTime.fromMillis(row.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
                return (
                  <li key={row.id}>
                    <Link
                      href={`/dashboard/bookings/${row.id}`}
                      prefetch={false}
                      className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_5%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_1.5%,var(--card))] px-3 py-2.5 transition-colors hover:border-[color-mix(in_oklab,var(--foreground)_9%,var(--border))] hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
                    >
                      <div className="min-w-0 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                          {start.toFormat("h:mm a")}
                        </span>
                        <span className="text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                          <span className="font-medium text-[var(--foreground)]">{row.serviceName}</span>
                          <span className="text-[color-mix(in_oklab,var(--foreground)_45%,transparent)]"> — </span>
                          {row.customerName}
                        </span>
                      </div>
                      <BookingStatusBadge status={row.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function PastBookingsList({ rows, timezone }: { rows: TodayBookingCardData[]; timezone: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">No past bookings yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const start = DateTime.fromMillis(row.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
        return (
          <li key={row.id}>
            <Link
              href={`/dashboard/bookings/${row.id}`}
              prefetch={false}
              className="flex flex-col gap-2 rounded-lg border border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_1.5%,var(--card))] px-4 py-3 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="font-medium tabular-nums text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
                  {start.toFormat("LLL d, yyyy · h:mm a")}
                </span>
                <span className="mt-1 block text-[var(--foreground)]">
                  {row.serviceName}
                  <span className="text-[color-mix(in_oklab,var(--foreground)_45%,transparent)]"> — </span>
                  <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">{row.customerName}</span>
                </span>
              </div>
              <BookingStatusBadge status={row.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
