import Link from "next/link";
import { eq, asc, and, count, max, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, bookings, providers } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";
import { getCsrfTokenForForm } from "@/lib/csrf";
import {
  AddCustomerModalRoot,
  AddCustomerModalButton,
  AddCustomerEmptyButton,
} from "@/components/dashboard/add-customer-modal";
import {
  CustomersListClient,
  type CustomerListRow,
} from "@/components/dashboard/customers/customers-list-client";

type Props = { searchParams: Promise<{ q?: string }> };

type CustomerRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  bookingCount: number;
  lastBookingAt: Date | null;
};

export default async function CustomersPage({ searchParams }: Props) {
  const u = await requireProvider();
  const { q } = await searchParams;
  const qTrim = typeof q === "string" ? q.trim() : "";
  const db = getDb();
  const csrf = await getCsrfTokenForForm();

  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const timezone = prov?.timezone ?? "America/Toronto";

  const crmCustomersOnly = and(eq(customers.providerId, u.providerId), eq(customers.accountReady, true));

  const baseList = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
    })
    .from(customers)
    .where(crmCustomersOnly)
    .orderBy(asc(customers.fullName))
    .limit(200);

  const statsRows = await db
    .select({
      customerId: bookings.customerId,
      cnt: count(),
      lastAt: max(bookings.startsAt),
    })
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .groupBy(bookings.customerId);

  const statsMap = new Map(
    statsRows.map((r) => [r.customerId, { cnt: Number(r.cnt), lastAt: r.lastAt }])
  );

  const [totalCustomers] = await db
    .select({ n: count() })
    .from(customers)
    .where(crmCustomersOnly);
  const totalCustomerCount = Number(totalCustomers?.n ?? 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [addedRecent] = await db
    .select({ n: count() })
    .from(customers)
    .where(and(crmCustomersOnly, gte(customers.createdAt, thirtyDaysAgo)));
  const addedLast30Days = Number(addedRecent?.n ?? 0);

  const list: CustomerRow[] = baseList.map((c) => {
    const s = statsMap.get(c.id);
    return {
      ...c,
      bookingCount: s?.cnt ?? 0,
      lastBookingAt: s?.lastAt ?? null,
    };
  });

  const clientRows: CustomerListRow[] = list.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    bookingCount: c.bookingCount,
    lastBookingAt: c.lastBookingAt ? c.lastBookingAt.toISOString() : null,
  }));

  return (
    <AddCustomerModalRoot csrf={csrf}>
      <main id="main-content" className="min-w-0 max-w-4xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          {totalCustomerCount > 0 ? (
            <div className="mt-2 max-w-xl space-y-1.5 leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
              <p className="text-sm text-[var(--foreground)]">
                You have{" "}
                <span className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
                  {totalCustomerCount}
                </span>{" "}
                {totalCustomerCount === 1 ? "customer" : "customers"}.
              </p>
              {addedLast30Days > 0 ? (
                <p className="text-sm">
                  You&apos;ve added{" "}
                  <span className="font-semibold tabular-nums text-[var(--foreground)]">
                    {addedLast30Days}
                  </span>{" "}
                  new {addedLast30Days === 1 ? "customer" : "customers"} in the last 30 days.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              People show up here after they book—or add someone yourself when you need to.
            </p>
          )}
        </header>

        {totalCustomerCount === 0 ? (
          <>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
              <div className="min-w-0 flex-1" role="search">
                <label htmlFor="customer-search" className="sr-only">
                  Search customers
                </label>
                <input
                  id="customer-search"
                  name="q"
                  defaultValue={qTrim}
                  placeholder="Search by name, email, or phone"
                  className="ui-input h-12 w-full text-base"
                  disabled
                  aria-disabled="true"
                />
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <AddCustomerModalButton />
                <Link
                  href="/dashboard/customers/import"
                  className="ui-btn inline-flex min-h-12 items-center justify-center px-4 text-sm font-semibold no-underline"
                >
                  Import CSV
                </Link>
              </div>
            </div>
            <div className="mt-12 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] px-6 py-14 text-center shadow-[var(--shadow-card)] sm:px-10">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">You don&apos;t have any customers yet</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
                Customers will appear here after their first booking, or you can add them manually.
              </p>
              <div className="mx-auto mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <AddCustomerEmptyButton className="ui-btn-primary min-h-12 px-6 text-sm font-semibold" />
                <Link
                  href="/dashboard/customers/import"
                  className="ui-btn inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold no-underline"
                >
                  Import CSV
                </Link>
              </div>
            </div>
          </>
        ) : (
          <CustomersListClient
            rows={clientRows}
            initialQuery={qTrim}
            timezone={timezone}
            totalCustomerCount={totalCustomerCount}
          />
        )}
      </main>
    </AddCustomerModalRoot>
  );
}
