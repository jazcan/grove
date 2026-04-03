import Link from "next/link";

export type FiveDayStripDay = {
  /** Days from today in provider TZ (0 = today). */
  offsetFromToday: number;
  /** e.g. "Today", "Thu" */
  shortLabel: string;
  /** Day of month */
  dayOfMonth: number;
  isoDate: string;
  total: number;
  hasPending: boolean;
};

type Filter = "all" | "confirmed" | "pending";

function buildBookingsHref(opts: {
  filter: Filter;
  dayOff: number;
  view: "calendar" | "list";
}) {
  const params = new URLSearchParams();
  if (opts.filter !== "all") params.set("filter", opts.filter);
  if (opts.dayOff > 0) params.set("dayOff", String(opts.dayOff));
  if (opts.view === "list") params.set("view", "list");
  const q = params.toString();
  return `/dashboard/bookings${q ? `?${q}` : ""}#day-schedule`;
}

export function BookingsFiveDayStrip({
  days,
  selectedDayOff,
  filter,
  view,
  canPrevWindow,
  canNextWindow,
  prevWindowDayOff,
  nextWindowDayOff,
}: {
  days: FiveDayStripDay[];
  /** Selected day as offset from today. */
  selectedDayOff: number;
  filter: Filter;
  view: "calendar" | "list";
  canPrevWindow: boolean;
  canNextWindow: boolean;
  prevWindowDayOff: number;
  nextWindowDayOff: number;
}) {
  const arrowBase =
    "flex h-full min-h-[4.5rem] w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-sm)] transition hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] sm:min-h-[5.25rem] sm:w-10";
  const arrowDisabled = "pointer-events-none opacity-35";

  return (
    <div className="flex items-stretch gap-2 sm:gap-2.5">
      {canPrevWindow ? (
        <Link
          href={buildBookingsHref({ filter, dayOff: prevWindowDayOff, view })}
          className={arrowBase}
          scroll={true}
          aria-label="Previous dates"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
      ) : (
        <span className={`${arrowBase} ${arrowDisabled}`} aria-hidden>
          <svg className="h-5 w-5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </span>
      )}

      <div
        className="min-w-0 flex-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Upcoming days"
      >
        <div className="flex min-w-0 gap-2 sm:gap-2.5">
          {days.map((d) => {
            const selected = d.offsetFromToday === selectedDayOff;
            const base =
              "flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors sm:min-w-[5.25rem] sm:px-3 sm:py-3";
            const idle =
              "border-[var(--border)] bg-[var(--card)] hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]";
            const active =
              "border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))] shadow-[var(--shadow-sm)]";

            const bookingLabel =
              d.total === 0 ? "No bookings" : d.total === 1 ? "1 booking" : `${d.total} bookings`;

            return (
              <Link
                key={d.isoDate}
                href={buildBookingsHref({ filter, dayOff: d.offsetFromToday, view })}
                scroll={true}
                role="tab"
                aria-selected={selected}
                aria-label={`${d.shortLabel}, ${bookingLabel}`}
                className={`${base} ${selected ? active : idle}`}
              >
                <span
                  className={`text-[0.65rem] font-semibold uppercase tracking-[0.06em] ${
                    selected ? "text-[var(--accent)]" : "text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]"
                  }`}
                >
                  {d.shortLabel}
                </span>
                <span className="text-lg font-semibold tabular-nums leading-none text-[var(--foreground)] sm:text-xl">
                  {d.dayOfMonth}
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span
                    className={`max-w-[5.5rem] text-center text-[0.65rem] font-medium leading-tight sm:max-w-none sm:text-xs ${
                      selected
                        ? "text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]"
                        : "text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]"
                    }`}
                  >
                    {bookingLabel}
                  </span>
                  {d.hasPending ? (
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--accent)_65%,var(--foreground))]"
                      title="Includes pending"
                      aria-label="Includes pending booking"
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {canNextWindow ? (
        <Link
          href={buildBookingsHref({ filter, dayOff: nextWindowDayOff, view })}
          className={arrowBase}
          scroll={true}
          aria-label="Next dates"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      ) : (
        <span className={`${arrowBase} ${arrowDisabled}`} aria-hidden>
          <svg className="h-5 w-5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      )}
    </div>
  );
}
