export type ServicePerformanceStat = {
  bookingCount: number;
  revenuePaid: string;
};

type ServicePerformanceRow = { id: string; name: string; currency: string };

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return amount;
  const cur = (currency || "CAD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

export function ServicePerformanceSection({
  services,
  statsByServiceId,
}: {
  services: ServicePerformanceRow[];
  statsByServiceId: Record<string, ServicePerformanceStat>;
}) {
  if (!services.length) return null;

  return (
    <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-6 sm:p-8" aria-labelledby="service-performance-heading">
      <h2 id="service-performance-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
        Service performance
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Bookings and paid revenue by service. Cancelled bookings are excluded; revenue counts payments marked paid.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold tabular-nums">Bookings</th>
              <th className="px-4 py-3 font-semibold tabular-nums">Revenue (paid)</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const st = statsByServiceId[s.id] ?? { bookingCount: 0, revenuePaid: "0" };
              return (
                <tr key={s.id} className="border-b border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] last:border-b-0">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{s.name}</td>
                  <td className="px-4 py-3 tabular-nums text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">{st.bookingCount}</td>
                  <td className="px-4 py-3 tabular-nums text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
                    {formatMoney(st.revenuePaid, s.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
