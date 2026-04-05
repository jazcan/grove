"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Filter = "all" | "confirmed" | "pending";

function buildBookingsSearchParams(opts: {
  view: "calendar" | "list";
  dayOff: number;
  filter: Filter;
  openBooking?: boolean;
  customerId?: string | undefined;
}): string {
  const p = new URLSearchParams();
  if (opts.view === "calendar") p.set("view", "calendar");
  if (opts.filter !== "all") p.set("filter", opts.filter);
  if (opts.dayOff > 0) p.set("dayOff", String(opts.dayOff));
  if (opts.openBooking) p.set("openBooking", "1");
  if (opts.customerId?.trim()) p.set("customerId", opts.customerId.trim());
  const q = p.toString();
  return q ? `?${q}` : "";
}

const tabBase =
  "inline-flex min-h-9 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-colors sm:min-h-10 sm:px-4";
const tabIdle =
  "border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))] text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))]";
const tabActive =
  "border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] text-[var(--accent)]";

export function BookingsToolbar({
  view,
  dayOff,
  filter,
  jumpDateMin,
  jumpDateMax,
  currentDateISO,
  openBooking,
  customerId,
}: {
  view: "calendar" | "list";
  dayOff: number;
  filter: Filter;
  jumpDateMin: string;
  jumpDateMax: string;
  /** YYYY-MM-DD — selected list day in provider TZ */
  currentDateISO: string;
  openBooking?: boolean;
  customerId?: string;
}) {
  const router = useRouter();
  const [jump, setJump] = useState(currentDateISO);

  useEffect(() => {
    setJump(currentDateISO);
  }, [currentDateISO]);

  const ctx = { dayOff, openBooking, customerId };

  const hrefCalendar = `/dashboard/bookings${buildBookingsSearchParams({
    view: "calendar",
    ...ctx,
    filter,
  })}`;
  const hrefList = `/dashboard/bookings${buildBookingsSearchParams({
    view: "list",
    ...ctx,
    filter,
  })}`;

  const hrefFilter = (f: Filter) =>
    `/dashboard/bookings${buildBookingsSearchParams({
      view,
      ...ctx,
      filter: f,
    })}`;

  const onJump = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(jump)) return;
      const p = new URLSearchParams();
      p.set("jump", jump);
      if (filter !== "all") p.set("filter", filter);
      if (openBooking) p.set("openBooking", "1");
      if (customerId) p.set("customerId", customerId);
      router.push(`/dashboard/bookings?${p.toString()}#day-schedule`);
    },
    [jump, filter, router, openBooking, customerId]
  );

  const resetHref = `/dashboard/bookings${buildBookingsSearchParams({
    view: "list",
    dayOff: 0,
    filter: "all",
    openBooking,
    customerId,
  })}`;

  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
            <Link href={hrefFilter("all")} className={`${tabBase} ${filter === "all" ? tabActive : tabIdle}`}>
              All
            </Link>
            <Link href={hrefFilter("confirmed")} className={`${tabBase} ${filter === "confirmed" ? tabActive : tabIdle}`}>
              Confirmed
            </Link>
            <Link href={hrefFilter("pending")} className={`${tabBase} ${filter === "pending" ? tabActive : tabIdle}`}>
              Pending
            </Link>
          </nav>

          <div
            className="hidden h-9 w-px shrink-0 bg-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] sm:block"
            aria-hidden
          />

          <nav className="flex flex-wrap gap-2" aria-label="Bookings view">
            <Link href={hrefList} className={`${tabBase} ${view === "list" ? tabActive : tabIdle}`}>
              List
            </Link>
            <Link href={hrefCalendar} className={`${tabBase} ${view === "calendar" ? tabActive : tabIdle}`}>
              Calendar
            </Link>
          </nav>
        </div>

        {view === "list" ? (
          <div className="flex w-full flex-col gap-2 border-t border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] pt-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 md:ml-auto md:w-auto md:border-t-0 md:pt-0">
            <form onSubmit={onJump} className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:flex-initial">
              <label className="grid min-w-0 flex-1 gap-1 sm:w-auto sm:flex-initial">
                <span className="text-xs font-medium text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Go to date</span>
                <input
                  type="date"
                  className="ui-input min-h-10 w-full min-w-[11rem] sm:w-auto"
                  min={jumpDateMin}
                  max={jumpDateMax}
                  value={jump}
                  onChange={(e) => setJump(e.target.value)}
                  aria-label="Pick a date to view bookings"
                />
              </label>
              <button type="submit" className="ui-btn-secondary min-h-10 px-4 text-sm font-semibold">
                Show
              </button>
            </form>
            <Link
              href={resetHref}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))] sm:shrink-0"
            >
              Reset to today
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
