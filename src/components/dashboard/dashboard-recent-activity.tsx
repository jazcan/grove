import Link from "next/link";

export type DashboardActivityItem = {
  kind: "booking" | "campaign" | "signal";
  id: string;
  at: Date;
  label: string;
  href: string;
};

type Props = {
  items: DashboardActivityItem[];
  timezone: string;
  hasAnyBooking: boolean;
  published: boolean;
  username: string | null | undefined;
};

function formatWhen(d: Date, timezone: string) {
  try {
    return d.toLocaleString(undefined, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
}

export function DashboardRecentActivity({
  items,
  timezone,
  hasAnyBooking,
  published,
  username,
}: Props) {
  return (
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
          Bookings, campaigns sent, and signals—newest first.
        </p>
      </div>

      <div className="mt-4">
        {items.length ? (
          <ul className="space-y-2 text-sm text-[var(--foreground)]">
            {items.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={row.href} className="ui-link min-w-0 font-medium">
                  {row.label}
                </Link>
                <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                  {formatWhen(row.at, timezone)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">No activity yet</p>
            <p className="ui-hint mt-2 text-sm leading-relaxed">
              Share your booking link or run a campaign—bookings and sends will show up here.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {published && username ? (
                <Link
                  href={`/${username}`}
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
  );
}
