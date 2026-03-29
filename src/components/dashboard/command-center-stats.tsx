import Link from "next/link";
import type { ProviderSetupState } from "@/lib/provider-setup";

type Props = {
  setup: ProviderSetupState;
};

/**
 * At-a-glance operational counts for the provider home (Stage 4 command center).
 */
export function CommandCenterStats({ setup }: Props) {
  const tiles = [
    {
      label: "Today",
      value: setup.todayBookingCount,
      sub: "scheduled",
      href: "/dashboard/bookings",
    },
    {
      label: "Pending",
      value: setup.pendingBookingCount,
      sub: "to confirm",
      href: "/dashboard/bookings?filter=pending",
    },
    {
      label: "Services",
      value: setup.activeServiceCount,
      sub: "active",
      href: "/dashboard/services",
    },
    {
      label: "Customers",
      value: setup.customerCount,
      sub: "in CRM",
      href: "/dashboard/customers",
    },
  ] as const;

  return (
    <section aria-labelledby="snapshot-heading" className="space-y-3">
      <div>
        <h2 id="snapshot-heading" className="text-lg font-semibold tracking-tight">
          Business snapshot
        </h2>
        <p className="ui-hint mt-2 text-sm">Tap a tile to open the full view.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="ui-card group flex min-h-[5.5rem] flex-col justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--surface-hover)] sm:min-h-[6rem] sm:p-5"
          >
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {t.label}
            </span>
            <span className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)] sm:text-3xl">
              {t.value}
            </span>
            <span className="mt-0.5 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              {t.sub}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
