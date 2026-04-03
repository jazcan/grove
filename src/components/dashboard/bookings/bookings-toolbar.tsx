"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type Filter = "all" | "confirmed" | "pending";

function buildBookingsSearchParams(opts: {
  view: "calendar" | "list";
  dayOff: number;
  filter: Filter;
  openBooking?: boolean;
  customerId?: string | undefined;
}): string {
  const p = new URLSearchParams();
  if (opts.view !== "calendar") p.set("view", opts.view);
  if (opts.filter !== "all") p.set("filter", opts.filter);
  if (opts.dayOff > 0) p.set("dayOff", String(opts.dayOff));
  if (opts.openBooking) p.set("openBooking", "1");
  if (opts.customerId?.trim()) p.set("customerId", opts.customerId.trim());
  const q = p.toString();
  return q ? `?${q}` : "";
}

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

  const hrefCalendar = `/dashboard/bookings${buildBookingsSearchParams({
    view: "calendar",
    dayOff,
    filter,
    openBooking,
    customerId,
  })}`;
  const hrefList = `/dashboard/bookings${buildBookingsSearchParams({
    view: "list",
    dayOff,
    filter,
    openBooking,
    customerId,
  })}`;

  const onJump = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(jump)) return;
      const p = new URLSearchParams();
      p.set("view", "list");
      p.set("jump", jump);
      if (filter !== "all") p.set("filter", filter);
      if (openBooking) p.set("openBooking", "1");
      if (customerId) p.set("customerId", customerId);
      router.push(`/dashboard/bookings?${p.toString()}#day-schedule`);
    },
    [jump, filter, router, openBooking, customerId]
  );

  const resetHref = `/dashboard/bookings${buildBookingsSearchParams({
    view: "calendar",
    dayOff: 0,
    filter: "all",
    openBooking,
    customerId,
  })}`;

  const tabBase =
    "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors";
  const idle =
    "border-[var(--border)] bg-[var(--card)] text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]";
  const active = "border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] text-[var(--accent)]";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <nav className="flex flex-wrap gap-2" aria-label="Bookings view">
        <Link href={hrefCalendar} className={`${tabBase} ${view === "calendar" ? active : idle}`}>
          Calendar
        </Link>
        <Link href={hrefList} className={`${tabBase} ${view === "list" ? active : idle}`}>
          List
        </Link>
      </nav>

      {view === "list" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <form onSubmit={onJump} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
              Go to date
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
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]"
          >
            Reset to today
          </Link>
        </div>
      ) : null}
    </div>
  );
}
