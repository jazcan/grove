import Link from "next/link";
import { and, eq, count, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";

export default async function AnalyticsPage() {
  const u = await requireProvider();
  const db = getDb();
  const pid = u.providerId;

  const [total] = await db
    .select({ n: count() })
    .from(bookings)
    .where(eq(bookings.providerId, pid));

  const [completed] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.providerId, pid), eq(bookings.status, "completed")));

  const [noShows] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.providerId, pid), eq(bookings.status, "no_show")));

  const [paid] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.providerId, pid), eq(bookings.paymentStatus, "paid")));

  const repeatRows = await db
    .select({ customerId: bookings.customerId, n: count() })
    .from(bookings)
    .where(eq(bookings.providerId, pid))
    .groupBy(bookings.customerId)
    .having(sql`count(*) > 1`);

  const paidRows = await db
    .select({ amount: bookings.paymentAmount })
    .from(bookings)
    .where(and(eq(bookings.providerId, pid), eq(bookings.paymentStatus, "paid")));

  const revenueTotal = paidRows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

  const totalN = Number(total?.n ?? 0);
  const completedN = Number(completed?.n ?? 0);
  const noShowsN = Number(noShows?.n ?? 0);
  const paidN = Number(paid?.n ?? 0);
  const allMetricsZero =
    totalN === 0 &&
    completedN === 0 &&
    noShowsN === 0 &&
    paidN === 0 &&
    revenueTotal === 0 &&
    repeatRows.length === 0;

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">Your business at a glance</h1>

      {allMetricsZero ? (
        <div className="mt-10 max-w-lg rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] px-6 py-12 text-center shadow-[var(--shadow-card)] sm:px-10">
          <p className="text-base leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
            Once you start getting bookings, you&apos;ll see insights here.
          </p>
          <Link
            href="/dashboard/marketing"
            className="ui-btn-primary mx-auto mt-8 inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold"
          >
            Get your first booking
          </Link>
        </div>
      ) : (
        <dl className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
          <div className="rounded border border-[var(--border)] p-4">
            <dt className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">Total bookings</dt>
            <dd className="text-2xl font-semibold">{total?.n ?? 0}</dd>
          </div>
          <div className="rounded border border-[var(--border)] p-4">
            <dt className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">Completed</dt>
            <dd className="text-2xl font-semibold">{completed?.n ?? 0}</dd>
          </div>
          <div className="rounded border border-[var(--border)] p-4">
            <dt className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">No-shows</dt>
            <dd className="text-2xl font-semibold">{noShows?.n ?? 0}</dd>
          </div>
          <div className="rounded border border-[var(--border)] p-4">
            <dt className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">Paid bookings</dt>
            <dd className="text-2xl font-semibold">{paid?.n ?? 0}</dd>
          </div>
          <div className="rounded border border-[var(--border)] p-4 sm:col-span-2">
            <dt className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              Tracked revenue (manual payment amounts)
            </dt>
            <dd className="text-2xl font-semibold">{revenueTotal.toFixed(2)}</dd>
          </div>
          <div className="rounded border border-[var(--border)] p-4 sm:col-span-2">
            <dt className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              Repeat customers (2+ bookings)
            </dt>
            <dd className="text-2xl font-semibold">{repeatRows.length}</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
