import Link from "next/link";

export type FiveDayStripDay = {
  offset: number;
  /** e.g. "Today", "Thu" */
  shortLabel: string;
  /** Day of month */
  dayOfMonth: number;
  isoDate: string;
  total: number;
  hasPending: boolean;
};

type Props = {
  days: FiveDayStripDay[];
  selectedOffset: number;
  filter: "all" | "confirmed" | "pending";
};

function buildBookingsHref(filter: Props["filter"], dayOffset: number) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (dayOffset !== 0) params.set("day", String(dayOffset));
  const q = params.toString();
  return `/dashboard/bookings${q ? `?${q}` : ""}#day-schedule`;
}

export function BookingsFiveDayStrip({ days, selectedOffset, filter }: Props) {
  return (
    <div
      className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Next five days"
    >
      <div className="flex min-w-0 gap-2 sm:gap-2.5">
        {days.map((d) => {
          const selected = d.offset === selectedOffset;
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
              href={buildBookingsHref(filter, d.offset)}
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
  );
}
