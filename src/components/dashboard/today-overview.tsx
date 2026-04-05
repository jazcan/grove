import Link from "next/link";
import { CopyPublicProfileUrlButton } from "@/components/dashboard/copy-public-profile-url-button";

export type TodayBookingPreview = {
  id: string;
  /** UTC instant from the server (ISO 8601). */
  startsAt: string;
  customerName: string;
  status: string;
};

export type OutreachReminder =
  | { kind: "never" }
  | { kind: "stale"; daysSince: number };

type Props = {
  timezone: string;
  todayBookings: TodayBookingPreview[];
  revenueToday: number;
  currencyLabel: string;
  nextBooking: { startsAt: string; customerName: string; serviceName: string } | null;
  hasAnyBooking: boolean;
  published: boolean;
  profileUrl: string;
  username: string | null | undefined;
  pendingBookingCount: number;
  customerCount: number;
  lastMarketingSentAt: string | null;
  weeklyOpenMinutes: number;
  outreachReminder: OutreachReminder | null;
};

function formatTime(iso: string, tz: string) {
  const d = new Date(iso);
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

/** e.g. Thu, Apr 2 · 12:30 PM — date then time for “Next up”. */
function formatNextUpWhen(iso: string, tz: string) {
  const d = new Date(iso);
  try {
    const datePart = d.toLocaleDateString(undefined, {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${datePart} · ${formatTime(iso, tz)}`;
  } catch {
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(iso, tz)}`;
  }
}

function formatOpenTime(mins: number): string {
  if (mins <= 0) return "No unbooked windows counted this week";
  if (mins < 60) return `About ${Math.round(mins)} min`;
  const h = mins / 60;
  return h % 1 < 0.05 ? `About ${Math.round(h)} hrs` : `About ${h.toFixed(1)} hrs`;
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
  pendingBookingCount,
  customerCount,
  lastMarketingSentAt,
  weeklyOpenMinutes,
  outreachReminder,
}: Props) {
  const preview = todayBookings.slice(0, 4);
  const hasRealTodayActivity = todayBookings.length > 0 || revenueToday > 0;
  const isQuietDay = hasAnyBooking && !hasRealTodayActivity;

  const lastSendLine =
    lastMarketingSentAt != null
      ? (() => {
          const days = Math.floor(
            (Date.now() - new Date(lastMarketingSentAt).getTime()) / (24 * 60 * 60 * 1000)
          );
          if (days <= 0) return "You emailed clients today—nice.";
          if (days === 1) return "Last list email: yesterday";
          return `Last list email: ${days} days ago`;
        })()
      : customerCount >= 1
        ? "You haven’t sent a list email yet."
        : null;

  return (
    <section aria-labelledby="today-overview-heading" className="ui-card p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="today-overview-heading" className="text-lg font-semibold tracking-tight">
            Today
          </h2>
          <p className="ui-hint mt-2">
            Your calendar, revenue, and next moves at a glance.
          </p>
        </div>
      </div>

      {pendingBookingCount > 0 ? (
        <div className="mt-6 rounded-xl border border-[color-mix(in_oklab,var(--accent)_42%,var(--card-border))] bg-[color-mix(in_oklab,var(--accent)_14%,var(--card))] p-4 shadow-[var(--shadow-sm)] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[var(--foreground)]">
              {pendingBookingCount} booking{pendingBookingCount === 1 ? "" : "s"} need your review
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
              Customers are waiting for confirmation—quick replies keep them from booking elsewhere.
            </p>
          </div>
          <Link
            href="/dashboard/bookings?filter=pending"
            className="ui-btn-primary mt-4 inline-flex min-h-11 w-full shrink-0 justify-center px-5 py-2.5 text-sm font-semibold no-underline sm:mt-0 sm:w-auto"
          >
            Review pending
          </Link>
        </div>
      ) : null}

      {outreachReminder ? (
        <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/35 p-4 sm:p-5">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {outreachReminder.kind === "never"
              ? "Send a friendly note when you’re ready"
              : `It’s been about ${outreachReminder.daysSince} days since you emailed your list`}
          </p>
          <p className="ui-hint mt-2 text-sm leading-relaxed">
            {outreachReminder.kind === "never"
              ? "When you have a few clients saved, a short email keeps you top of mind—no pressure, just a nudge."
              : "A quick hello or seasonal reminder goes a long way. Your clients like hearing from you."}
          </p>
          <Link
            href="/dashboard/marketing"
            className="ui-btn-secondary mt-4 inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
          >
            Open marketing
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4 sm:p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {isQuietDay ? "Your day" : "Today’s schedule"}
          </div>
          {!hasAnyBooking ? (
            <>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--foreground)]">
                {todayBookings.length}
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                <p className="text-sm font-semibold text-[var(--foreground)]">Line up your first booking</p>
                <p className="ui-hint mt-2 text-xs leading-relaxed">
                  Share your page and say hello—most folks start with people they already know.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                  {published && username ? (
                    <>
                      <CopyPublicProfileUrlButton
                        url={profileUrl}
                        className="ui-btn-primary inline-flex min-h-11 justify-center px-5 py-2.5 text-sm font-semibold"
                      >
                        Copy profile link
                      </CopyPublicProfileUrlButton>
                      <Link
                        href="/dashboard/marketing"
                        className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline"
                      >
                        Draft a promotion
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard/profile"
                        className="ui-btn-primary inline-flex min-h-11 justify-center text-sm no-underline"
                      >
                        Finish your profile
                      </Link>
                      <Link
                        href="/dashboard/marketing"
                        className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline"
                      >
                        Draft a promotion
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : isQuietDay ? (
            <>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Nothing scheduled today</p>
              <p className="ui-hint mt-3 text-sm leading-relaxed">
                Quiet days happen—use the space to refresh services, adjust hours, or reach out to a few regulars.
              </p>
              {pendingBookingCount > 0 ? (
                <p className="mt-3 text-sm text-[var(--foreground)]">
                  You still have{" "}
                  <Link href="/dashboard/bookings?filter=pending" className="ui-link font-medium">
                    {pendingBookingCount} pending
                  </Link>{" "}
                  to clear.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--foreground)]">
                {todayBookings.length}
              </div>
              {preview.length ? (
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
                  Nothing on the calendar today—your next win is one message or share away.
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4 sm:p-5">
          {!hasAnyBooking ? (
            <>
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                When money lands
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Revenue shows up here</p>
              <p className="ui-hint mt-3 text-xs leading-relaxed">
                After visits roll in, mark payments on bookings so this card reflects what you actually collected.
              </p>
            </>
          ) : isQuietDay ? (
            <>
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                This week
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{formatOpenTime(weeklyOpenMinutes)}</p>
              <p className="ui-hint mt-2 text-xs leading-relaxed">Unbooked time in your usual weekly hours—room to fill.</p>
              {lastSendLine && !outreachReminder ? (
                <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">{lastSendLine}</p>
              ) : null}
              <Link
                href="/dashboard/availability"
                className="ui-btn-secondary mt-4 inline-flex min-h-10 w-full justify-center px-4 py-2 text-sm font-semibold no-underline sm:w-auto"
              >
                Check availability
              </Link>
            </>
          ) : (
            <>
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                Revenue today
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--foreground)]">
                {formatMoney(revenueToday, currencyLabel)}
              </div>
              <p className="ui-hint mt-3 text-xs leading-relaxed">
                {revenueToday > 0
                  ? "Nice—keep marking payments so this stays honest."
                  : todayBookings.length > 0
                    ? "Visits on the books—mark paid when you’re settled up."
                    : "Quiet on earnings so far; it’ll tick up as today’s visits pay out."}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4 sm:p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Next up</div>
          {nextBooking ? (
            <div className="mt-2 space-y-0.5">
              <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{nextBooking.serviceName}</p>
              <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_82%,transparent)]">{nextBooking.customerName}</p>
              <p className="text-xs text-[var(--muted)]">
                <time dateTime={nextBooking.startsAt}>{formatNextUpWhen(nextBooking.startsAt, timezone)}</time>
              </p>
            </div>
          ) : !hasAnyBooking ? (
            <p className="ui-hint mt-3 text-sm leading-relaxed">
              Once someone picks a time, their name and slot land here first.
            </p>
          ) : (
            <p className="ui-hint mt-3 text-sm leading-relaxed">
              No future visit yet—share your link or follow up with someone who’s been meaning to book.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
