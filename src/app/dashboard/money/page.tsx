import Link from "next/link";
import { DateTime } from "luxon";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { expenseRecords, incomeRecords, providers } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";
import { formatIncomePaymentMethod, incomeRecordBadge } from "@/domain/money/income-record-label";
import { ExpenseForm } from "@/components/dashboard/money/expense-form";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { serialString } from "@/lib/rsc-serialize";

export default async function MoneyPage() {
  const u = await requireProvider();
  const db = getDb();
  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const tz = prov?.timezone ?? "America/Toronto";

  const now = DateTime.now().setZone(tz);
  const monthStart = now.startOf("month");
  const monthEnd = now.endOf("month");
  /** Boundaries as strings so drizzle/postgres never embed raw `Date` in SQL fragments (avoids postgres.js Buffer.byteLength on Date). */
  const incomeRangeStart = monthStart.toUTC().toISO();
  const incomeRangeEnd = monthEnd.toUTC().toISO();
  const expenseFromStr = monthStart.toFormat("yyyy-MM-dd");
  const expenseToStr = monthEnd.toFormat("yyyy-MM-dd");

  const bucket = sql`coalesce(${incomeRecords.recognizedAt}, ${incomeRecords.createdAt})`;

  const incomeMonthRows = await db
    .select({ amount: incomeRecords.amount })
    .from(incomeRecords)
    .where(
      and(
        eq(incomeRecords.providerId, u.providerId),
        sql`${bucket} >= ${incomeRangeStart}::timestamptz`,
        sql`${bucket} <= ${incomeRangeEnd}::timestamptz`
      )
    );

  const revenueTotal = incomeMonthRows.reduce((acc, r) => acc + Number(r.amount), 0);

  const expenseMonthRows = await db
    .select({ amount: expenseRecords.amount })
    .from(expenseRecords)
    .where(
      and(
        eq(expenseRecords.providerId, u.providerId),
        sql`${expenseRecords.incurredAt} >= ${expenseFromStr}::date`,
        sql`${expenseRecords.incurredAt} <= ${expenseToStr}::date`
      )
    );

  const expenseTotal = expenseMonthRows.reduce((acc, r) => acc + Number(r.amount), 0);
  const net = revenueTotal - expenseTotal;

  const recentIncome = await db
    .select()
    .from(incomeRecords)
    .where(eq(incomeRecords.providerId, u.providerId))
    .orderBy(desc(incomeRecords.recognizedAt), desc(incomeRecords.createdAt))
    .limit(10);

  const recentExpenses = await db
    .select()
    .from(expenseRecords)
    .where(eq(expenseRecords.providerId, u.providerId))
    .orderBy(desc(expenseRecords.incurredAt), desc(expenseRecords.createdAt))
    .limit(10);

  const csrf = await getCsrfTokenForForm();

  return (
    <main id="main-content" className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Money</h1>
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Income from bookings, expenses, and a simple monthly snapshot.
        </p>
      </header>

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          This month ({now.toFormat("LLLL yyyy")})
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">Revenue</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
              ${revenueTotal.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">Expenses</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
              ${expenseTotal.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">Net</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
              ${net.toFixed(2)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Export</h2>
        <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
          Separate CSV files for income and expenses (Excel / Sheets friendly).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/api/money/export/income"
            prefetch={false}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_14%,var(--card))]"
          >
            Export income CSV
          </Link>
          <Link
            href="/api/money/export/expenses"
            prefetch={false}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--foreground)_14%,var(--border))] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,var(--card))]"
          >
            Export expenses CSV
          </Link>
        </div>
      </section>

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Add expense</h2>
        <ExpenseForm csrf={serialString(csrf)} />
      </section>

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Recent income</h2>
        {recentIncome.length === 0 ? (
          <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
            No income yet. Mark bookings as completed or paid to record revenue.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {recentIncome.map((row) => {
              const badge = incomeRecordBadge({
                isCompleted: row.isCompleted,
                isPaid: row.isPaid,
              });
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-1 rounded-lg border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium text-[var(--foreground)] tabular-nums">
                      {row.currency} {row.amount.toString()}
                    </span>
                    {row.bookingId ? (
                      <Link
                        href={`/dashboard/bookings/${row.bookingId}`}
                        className="ui-link ml-2 text-sm font-normal"
                      >
                        View booking
                      </Link>
                    ) : null}
                    <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                      {formatIncomePaymentMethod(row.paymentMethod)}
                      {row.sourceAmountType ? ` · ${row.sourceAmountType.replace("_", " ")}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-[color-mix(in_oklab,var(--foreground)_14%,var(--border))] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Recent expenses</h2>
        {recentExpenses.length === 0 ? (
          <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
            No expenses recorded yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {recentExpenses.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-3 py-2"
              >
                <span className="font-medium text-[var(--foreground)] tabular-nums">${row.amount.toString()}</span>
                <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">{row.category}</span>
                <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                  {row.incurredAt instanceof Date ? row.incurredAt.toISOString().slice(0, 10) : String(row.incurredAt)}
                  {row.description ? ` · ${row.description}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
