"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AddCustomerModalButton,
} from "@/components/dashboard/add-customer-modal";

export type CustomerListRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  bookingCount: number;
  /** ISO string from server (safe across the client boundary). */
  lastBookingAt: string | null;
};

type Props = {
  rows: CustomerListRow[];
  initialQuery: string;
  timezone: string;
  totalCustomerCount: number;
};

function formatShortDate(iso: string | null, tz: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
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

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function rowMatchesQuery(row: CustomerListRow, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;

  if (row.fullName.toLowerCase().includes(q)) return true;
  if (row.email.toLowerCase().includes(q)) return true;

  const phone = row.phone ?? "";
  if (phone.toLowerCase().includes(q)) return true;

  const qDigits = normalizeDigits(raw);
  if (qDigits.length >= 2) {
    const phoneDigits = normalizeDigits(phone);
    if (phoneDigits.includes(qDigits)) return true;
  }

  return false;
}

const DEBOUNCE_MS = 275;

export function CustomersListClient({ rows, initialQuery, timezone, totalCustomerCount }: Props) {
  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const filtered = useMemo(() => {
    return rows.filter((r) => rowMatchesQuery(r, debouncedSearch));
  }, [rows, debouncedSearch]);

  const searching = search !== debouncedSearch;

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
  const rowHover =
    "group [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--border)] transition-[background-color,box-shadow] duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))] hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]";

  const list = filtered;

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
        <div className="min-w-0 flex-1" role="search">
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <input
            id="customer-search"
            name="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="ui-input h-12 w-full text-base"
            autoComplete="off"
            spellCheck={false}
            aria-busy={searching}
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

      <div
        className={`mt-4 min-h-[120px] min-w-0 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] transition-opacity duration-150 ${
          searching ? "opacity-[0.88]" : "opacity-100"
        }`}
      >
        {list.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-8">
            <p className="text-sm font-medium text-[var(--foreground)]">No customers found</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
              Try a different name, email, or phone.
            </p>
          </div>
        ) : (
          <>
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
                    <tr key={c.id} className={`[&:not(:first-child)]:border-t ${rowHover}`}>
                      <td className={`${bodyCell} p-0`}>
                        <Link
                          href={href}
                          prefetch={false}
                          aria-label={rowLabel}
                          title={c.fullName}
                          className={`${linkCell} truncate font-semibold text-[var(--foreground)] group-hover:text-[var(--foreground)]`}
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
                    <Link
                      href={href}
                      prefetch={false}
                      className={`block px-4 py-4 ${rowHover} cursor-pointer active:bg-[color-mix(in_oklab,var(--foreground)_7%,var(--card))]`}
                    >
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
          </>
        )}
      </div>

      {totalCustomerCount > 0 && debouncedSearch.trim() ? (
        <p className="mt-3 text-xs text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
          {list.length} match{list.length === 1 ? "" : "es"} ({totalCustomerCount} total)
        </p>
      ) : null}
    </>
  );
}
