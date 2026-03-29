type Props = {
  bookingsThisWeek: number;
  revenueThisWeek: number;
  currencyLabel: string;
  utilizationPercent: number | null;
  hasAvailabilityRules: boolean;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "CAD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function WeeklySnapshot({
  bookingsThisWeek,
  revenueThisWeek,
  currencyLabel,
  utilizationPercent,
  hasAvailabilityRules,
}: Props) {
  return (
    <section aria-labelledby="weekly-snapshot-heading" className="ui-card p-5 sm:p-7">
      <div>
        <h2 id="weekly-snapshot-heading" className="text-lg font-semibold tracking-tight">
          Weekly snapshot
        </h2>
        <p className="ui-hint mt-2">This calendar week at a glance.</p>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/30 p-4">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Bookings</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{bookingsThisWeek}</dd>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/30 p-4">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Revenue</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatMoney(revenueThisWeek, currencyLabel)}
          </dd>
          <p className="ui-hint mt-2 text-xs">Paid visits starting this week.</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/30 p-4">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Utilization</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {utilizationPercent !== null ? `${utilizationPercent}%` : "—"}
          </dd>
          <p className="ui-hint mt-2 text-xs leading-relaxed">
            {hasAvailabilityRules
              ? "Booked time vs. your recurring weekly hours (blocks not subtracted)."
              : "Add weekly hours under Availability to see utilization."}
          </p>
        </div>
      </dl>
    </section>
  );
}
