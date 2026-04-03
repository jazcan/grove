import Link from "next/link";
import { CopyPublicProfileUrlButton } from "@/components/dashboard/copy-public-profile-url-button";

export type NextAppointmentRow = {
  id: string;
  /** UTC instant from the server (ISO 8601). */
  startsAt: string;
  status: string;
  customerName: string;
};

type Props = {
  timezone: string;
  appointments: NextAppointmentRow[];
  published: boolean;
  profileUrl: string;
  username: string | null | undefined;
};

function capitalizeStatus(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function NextAppointmentsPanel({ timezone, appointments, published, profileUrl, username }: Props) {
  return (
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

      {published && username ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Booking link</div>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-link mt-1 block truncate text-sm font-medium"
            >
              {profileUrl}
            </a>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <CopyPublicProfileUrlButton
              url={profileUrl}
              className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold"
            >
              Copy link
            </CopyPublicProfileUrlButton>
            <Link
              href={`/${username}`}
              className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
            >
              Preview
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {appointments.length ? (
          <ul className="space-y-3">
            {appointments.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="ui-card block px-4 py-3 shadow-none transition-colors hover:bg-[var(--surface-muted)] sm:px-5 sm:py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{b.customerName}</span>
                      <span className="text-sm text-[var(--muted)]"> · {capitalizeStatus(b.status)}</span>
                    </div>
                    <time className="shrink-0 text-sm tabular-nums text-[var(--muted)]" dateTime={b.startsAt}>
                      {new Date(b.startsAt).toLocaleString(undefined, { timeZone: timezone })}
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
              <div className="text-sm font-semibold text-[var(--foreground)]">Nothing on the calendar yet</div>
              <p className="ui-hint mt-2 leading-relaxed">
                Share your link to start getting booked—clients book from your public profile.
              </p>
              {published && username ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={`/${username}`} className="ui-btn-primary inline-flex min-h-11 justify-center text-sm no-underline">
                    Preview your profile
                  </Link>
                  <CopyPublicProfileUrlButton
                    url={profileUrl}
                    className="ui-btn-secondary inline-flex min-h-11 justify-center px-5 py-2.5 text-sm font-semibold"
                  >
                    Copy booking link
                  </CopyPublicProfileUrlButton>
                  <Link
                    href="/dashboard/marketing"
                    className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline"
                  >
                    Promote your business
                  </Link>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/dashboard/profile" className="ui-btn-primary inline-flex min-h-11 justify-center text-sm no-underline">
                    Finish & publish profile
                  </Link>
                  <Link
                    href="/dashboard/marketing"
                    className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline"
                  >
                    Create a campaign
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
