import Link from "next/link";
import { CopyPublicProfileUrlButton } from "@/components/dashboard/copy-public-profile-url-button";

export type TodayBookingPreview = {
  id: string;
  startsAt: Date;
  customerName: string;
  status: string;
};

type Props = {
  timezone: string;
  todayBookings: TodayBookingPreview[];
  revenueToday: number;
  currencyLabel: string;
  nextBooking: { startsAt: Date; customerName: string } | null;
  hasAnyBooking: boolean;
  published: boolean;
  profileUrl: string;
  username: string | null | undefined;
};

function formatTime(d: Date, tz: string) {
  try {
    return d.toLocaleTimeString(undefined, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "CAD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function TodayOverview({
  timezone,
  todayBookings,
  revenueToday,
  currencyLabel,
  nextBooking,
  hasAnyBooking,
  published,
  profileUrl,
  username,
}: Props) {
  const preview = todayBookings.slice(0, 4);

  return (
    <section aria-labelledby="today-overview-heading" className="ui-card p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="today-overview-heading" className="text-lg font-semibold tracking-tight">
            Today overview
          </h2>
          <p className="ui-hint mt-2">What&apos;s on your calendar and your numbers for today.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4 sm:p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Today&apos;s bookings
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--foreground)]">
            {todayBookings.length}
          </div>
          {!hasAnyBooking ? (
            <div className="mt-4 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
              <p className="text-sm font-semibold text-[var(--foreground)]">Get your first booking</p>
              <p className="ui-hint mt-2 text-xs leading-relaxed">
                Share your profile and run a promotion so clients can find you.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {published && username ? (
                  <>
                    <CopyPublicProfileUrlButton
                      url={profileUrl}
                      className="ui-btn-primary inline-flex min-h-11 justify-center px-5 py-2.5 text-sm font-semibold"
                    >
                      Share profile
                    </CopyPublicProfileUrlButton>
                    <Link
                      href="/dashboard/marketing"
                      className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline"
                    >
                      Generate promotion
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard/profile" className="ui-btn-primary inline-flex min-h-11 justify-center text-sm no-underline">
                      Finish profile
                    </Link>
                    <Link
                      href="/dashboard/marketing"
                      className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline"
                    >
                      Generate promotion
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : preview.length ? (
            <ul className="mt-3 space-y-2">
              {preview.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/dashboard/bookings/${b.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{b.customerName}</span>
                    <span className="shrink-0 tabular-nums text-[var(--muted)]">{formatTime(b.startsAt, timezone)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui-hint mt-3 text-sm leading-relaxed">
              Nothing scheduled today—use quick actions below to fill the week.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4 sm:p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Revenue today
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatMoney(revenueToday, currencyLabel)}
          </div>
          <p className="ui-hint mt-3 text-xs leading-relaxed">
            Paid appointments starting today ({currencyLabel}). Mark payments on each booking to keep this accurate.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4 sm:p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Next up
          </div>
          {nextBooking ? (
            <div className="mt-2">
              <p className="text-lg font-semibold text-[var(--foreground)]">{nextBooking.customerName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                <time dateTime={nextBooking.startsAt.toISOString()}>{formatTime(nextBooking.startsAt, timezone)}</time>
                <span className="mx-1">·</span>
                {nextBooking.startsAt.toLocaleDateString(undefined, {
                  timeZone: timezone,
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ) : !hasAnyBooking ? (
            <p className="ui-hint mt-3 text-sm leading-relaxed">Bookings will show here once clients start choosing times.</p>
          ) : (
            <p className="ui-hint mt-3 text-sm leading-relaxed">No upcoming appointments—open your calendar or share your link.</p>
          )}
        </div>
      </div>
    </section>
  );
}
