import Link from "next/link";
import { eq, asc, ilike, or, and, count, max } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, bookings, providers } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";
import { getCsrfTokenForForm } from "@/lib/csrf";
import {
  AddCustomerModalRoot,
  AddCustomerModalButton,
  AddCustomerEmptyButton,
} from "@/components/dashboard/add-customer-modal";

type Props = { searchParams: Promise<{ q?: string }> };

type CustomerRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  bookingCount: number;
  lastBookingAt: Date | null;
};

function formatShortDate(d: Date | null, tz: string): string {
  if (!d) return "—";
  try {
    return d.toLocaleDateString(undefined, { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
}

function emptyPlaceholder() {
  return (
    <span className="text-[color-mix(in_oklab,var(--muted-foreground)_75%,transparent)]">—</span>
  );
}

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
  const searchCond =
    qTrim.length > 0
      ? and(
          crmCustomersOnly,
          or(
            ilike(customers.fullName, `%${qTrim}%`),
            ilike(customers.email, `%${qTrim}%`),
            ilike(customers.phone, `%${qTrim}%`)
          )
        )
      : crmCustomersOnly;

  const baseList = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
    })
    .from(customers)
    .where(searchCond)
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

  const list: CustomerRow[] = baseList.map((c) => {
    const s = statsMap.get(c.id);
    return {
      ...c,
      bookingCount: s?.cnt ?? 0,
      lastBookingAt: s?.lastAt ?? null,
    };
  });

  const headerCell =
    "px-4 py-3 text-left align-middle text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]";
  const headerCellLast =
    "pl-4 pr-8 py-3 text-left align-middle text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]";
  const bodyCell = "min-w-0 align-middle";
  const linkCell =
    "block min-w-0 w-full max-w-full px-4 py-3.5 text-inherit no-underline outline-offset-2 transition-colors focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring-focus)] cursor-pointer";
  const linkCellLast =
    "block min-w-0 w-full max-w-full pl-4 pr-8 py-3.5 text-inherit no-underline outline-offset-2 transition-colors focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring-focus)] cursor-pointer";
  const textSecondary = "text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]";
  const rowHover = "hover:bg-[color-mix(in_oklab,var(--foreground)_4.5%,var(--card))] transition-[background-color] duration-150";

  return (
    <AddCustomerModalRoot csrf={csrf}>
      <main id="main-content" className="min-w-0 max-w-4xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-2 max-w-xl text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Manage your clients and view their history
            {totalCustomerCount > 0 ? (
              <span className="text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
                {" "}
                · {totalCustomerCount} total
              </span>
            ) : null}
            .
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
          <form className="min-w-0 flex-1" method="get" role="search">
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <input
              id="customer-search"
              name="q"
              defaultValue={qTrim}
              placeholder="Search by name, email, or phone"
              className="ui-input h-12 w-full text-base"
            />
          </form>
          <div className="flex shrink-0 items-center sm:items-stretch">
            <AddCustomerModalButton />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] px-6 py-14 text-center shadow-[var(--shadow-card)] sm:px-10">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">You don&apos;t have any customers yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
              Customers will appear here after their first booking, or you can add them manually.
            </p>
            <AddCustomerEmptyButton className="ui-btn-primary mx-auto mt-8 min-h-12 px-6 text-sm font-semibold" />
          </div>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <table className="hidden w-full min-w-0 table-fixed border-collapse text-sm md:table">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[30%]" />
                <col className="w-[16%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))]">
                  <th scope="col" className={headerCell}>
                    Name
                  </th>
                  <th scope="col" className={headerCell}>
                    Email
                  </th>
                  <th scope="col" className={headerCell}>
                    Phone
                  </th>
                  <th scope="col" className={headerCell}>
                    Last booking
                  </th>
                  <th scope="col" className={`${headerCellLast} text-right`}>
                    Booking count
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const href = `/dashboard/customers/${c.id}`;
                  const rowLabel = `View customer ${c.fullName}`;
                  return (
                    <tr key={c.id} className={`[&:not(:first-child)]:border-t border-[var(--border)] ${rowHover}`}>
                      <td className={`${bodyCell} p-0`}>
                        <Link
                          href={href}
                          prefetch={false}
                          aria-label={rowLabel}
                          title={c.fullName}
                          className={`${linkCell} truncate font-semibold text-[var(--foreground)]`}
                        >
                          {c.fullName}
                        </Link>
                      </td>
                      <td className={`${bodyCell} p-0`}>
                        <Link href={href} tabIndex={-1} className={`${linkCell} break-all ${textSecondary}`}>
                          {c.email}
                        </Link>
                      </td>
                      <td className={`${bodyCell} p-0`}>
                        <Link
                          href={href}
                          prefetch={false}
                          tabIndex={-1}
                          title={c.phone ?? undefined}
                          className={`${linkCell} truncate ${textSecondary}`}
                        >
                          {c.phone ? c.phone : emptyPlaceholder()}
                        </Link>
                      </td>
                      <td className={`${bodyCell} p-0`}>
                        <Link
                          href={href}
                          prefetch={false}
                          tabIndex={-1}
                          title={
                            c.lastBookingAt
                              ? formatShortDate(c.lastBookingAt, timezone)
                              : "No bookings yet"
                          }
                          className={`${linkCell} truncate ${textSecondary} tabular-nums`}
                        >
                          {c.lastBookingAt ? (
                            formatShortDate(c.lastBookingAt, timezone)
                          ) : (
                            <span className="text-[color-mix(in_oklab,var(--muted-foreground)_88%,transparent)]">
                              No bookings yet
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className={`${bodyCell} p-0`}>
                        <Link
                          href={href}
                          prefetch={false}
                          tabIndex={-1}
                          className={`${linkCellLast} text-right tabular-nums ${textSecondary}`}
                        >
                          {c.bookingCount}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="md:hidden">
              {list.map((c) => {
                const href = `/dashboard/customers/${c.id}`;
                return (
                  <li key={c.id} className="border-t border-[var(--border)] first:border-t-0">
                    <Link href={href} prefetch={false} className={`block px-4 py-4 ${rowHover} cursor-pointer`}>
                      <div className="font-semibold text-[var(--foreground)]">{c.fullName}</div>
                      <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--muted-foreground)_92%,transparent)]">
                        {c.lastBookingAt ? formatShortDate(c.lastBookingAt, timezone) : "No bookings yet"}
                      </p>
                      <p className={`mt-3 break-all ${textSecondary}`}>{c.email}</p>
                      <p className={`mt-2 ${textSecondary}`}>{c.phone ? c.phone : emptyPlaceholder()}</p>
                      <p className={`mt-2 tabular-nums ${textSecondary}`}>
                        <span className="text-[color-mix(in_oklab,var(--muted-foreground)_90%,transparent)]">Bookings </span>
                        {c.bookingCount}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </AddCustomerModalRoot>
  );
}
