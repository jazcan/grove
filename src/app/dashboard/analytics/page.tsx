import Link from "next/link";
import { DateTime } from "luxon";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, providers, services } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";
import { AnalyticsDashboard, type AnalyticsChartsPayload } from "@/components/dashboard/analytics-dashboard";

function statusBucket(status: string): "pending" | "confirmed" | "completed" | "other" {
  if (status === "pending") return "pending";
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  return "other";
}

export default async function AnalyticsPage() {
  const u = await requireProvider();
  const db = getDb();
  const pid = u.providerId;

  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, pid))
    .limit(1);
  const timezone = prov?.timezone ?? "America/Toronto";

  const [currencyRow] = await db
    .select({ currency: services.currency })
    .from(services)
    .where(and(eq(services.providerId, pid), eq(services.isActive, true)))
    .limit(1);
  const primaryCurrency = currencyRow?.currency ?? "CAD";

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

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const chartBookings = await db
    .select({
      startsAt: bookings.startsAt,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      paymentAmount: bookings.paymentAmount,
    })
    .from(bookings)
    .where(and(eq(bookings.providerId, pid), gte(bookings.startsAt, ninetyDaysAgo)));

  const byDayCount = new Map<string, number>();
  const byDayRevenue = new Map<string, number>();
  const statusLast30: Record<"pending" | "confirmed" | "completed" | "other", number> = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    other: 0,
  };

  for (const row of chartBookings) {
    const dayKey = DateTime.fromJSDate(row.startsAt).setZone(timezone).toISODate();
    if (dayKey) {
      byDayCount.set(dayKey, (byDayCount.get(dayKey) ?? 0) + 1);
      if (row.paymentStatus === "paid" && row.paymentAmount != null) {
        const amt = Number(row.paymentAmount);
        if (!Number.isNaN(amt)) {
          byDayRevenue.set(dayKey, (byDayRevenue.get(dayKey) ?? 0) + amt);
        }
      }
    }
    if (row.startsAt >= thirtyDaysAgo) {
      const b = statusBucket(row.status);
      statusLast30[b] += 1;
    }
  }

  const dailyBookings: { date: string; count: number }[] = [];
  const dailyRevenue: { date: string; total: number }[] = [];
  const end = DateTime.now().setZone(timezone);
  for (let i = 89; i >= 0; i--) {
    const d = end.minus({ days: i }).toISODate()!;
    dailyBookings.push({ date: d, count: byDayCount.get(d) ?? 0 });
    dailyRevenue.push({ date: d, total: byDayRevenue.get(d) ?? 0 });
  }

  const charts: AnalyticsChartsPayload = {
    dailyBookings,
    dailyRevenue,
    statusLast30: [
      { key: "pending", label: "Pending", count: statusLast30.pending },
      { key: "confirmed", label: "Confirmed", count: statusLast30.confirmed },
      { key: "completed", label: "Completed", count: statusLast30.completed },
      { key: "other", label: "Other (cancelled, no-show, etc.)", count: statusLast30.other },
    ],
  };

  return (
    <main id="main-content" className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
          Booking activity, recorded payments, and repeat clients. Tap a card to see the bookings behind each figure.
        </p>
      </header>

      {allMetricsZero ? (
        <div className="ui-card max-w-lg bg-[var(--card)] px-6 py-12 text-center sm:px-10">
          <p className="text-base leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
            Once you start getting bookings, charts and breakdowns will show up here.
          </p>
          <Link
            href="/dashboard/marketing"
            className="ui-btn-primary mx-auto mt-8 inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold"
          >
            Get your first booking
          </Link>
        </div>
      ) : (
        <AnalyticsDashboard
          timezone={timezone}
          currency={primaryCurrency}
          metrics={{
            totalBookings: totalN,
            completed: completedN,
            noShows: noShowsN,
            paidBookings: paidN,
            revenueTotal,
            repeatCustomerCount: repeatRows.length,
          }}
          charts={charts}
        />
      )}
    </main>
  );
}
