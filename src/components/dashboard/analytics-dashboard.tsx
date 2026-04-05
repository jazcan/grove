"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DateTime } from "luxon";
import {
  fetchAnalyticsModalData,
  type AnalyticsModalMetric,
  type AnalyticsBookingDetailRow,
  type AnalyticsRepeatDetailRow,
} from "@/actions/analytics";

export type AnalyticsChartsPayload = {
  dailyBookings: { date: string; count: number }[];
  dailyRevenue: { date: string; total: number }[];
  statusLast30: { key: string; label: string; count: number }[];
};

type Props = {
  timezone: string;
  currency: string;
  metrics: {
    totalBookings: number;
    completed: number;
    noShows: number;
    paidBookings: number;
    revenueTotal: number;
    repeatCustomerCount: number;
  };
  charts: AnalyticsChartsPayload;
};

const METRIC_META: Record<
  AnalyticsModalMetric,
  { title: string; cardLabel: string; cardHint?: string }
> = {
  total: { title: "Bookings in range", cardLabel: "Total bookings", cardHint: "All time — tap for a date range" },
  completed: { title: "Completed visits in range", cardLabel: "Completed", cardHint: "All time" },
  no_show: { title: "No-shows in range", cardLabel: "No-shows", cardHint: "All time" },
  paid: { title: "Paid bookings in range", cardLabel: "Paid bookings", cardHint: "All time" },
  revenue: { title: "Paid revenue in range", cardLabel: "Tracked revenue", cardHint: "From recorded payment amounts" },
  repeat: {
    title: "Repeat customers in range",
    cardLabel: "Repeat customers",
    cardHint: "Lifetime: people with 2+ bookings ever — list uses the range you pick",
  },
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "CAD" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDateTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function bookingStatusLabel(status: string): string {
  const m: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
    rescheduled: "Rescheduled",
  };
  return m[status] ?? status;
}

function SimpleColumnChart({
  title,
  subtitle,
  points,
  valueLabel,
}: {
  title: string;
  subtitle?: string;
  points: { label: string; value: number }[];
  valueLabel: (n: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const showLabels = points.length <= 18;

  return (
    <div className="ui-card bg-[var(--card)] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">{subtitle}</p>
      ) : null}
      <div className="mt-5 flex h-36 items-end gap-0.5 sm:gap-1" role="img" aria-label={title}>
        {points.map((p) => {
          const h = `${Math.round((p.value / max) * 100)}%`;
          return (
            <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full min-h-[2px] rounded-t-md bg-[color-mix(in_oklab,var(--accent)_78%,var(--foreground))]"
                style={{ height: h }}
                title={`${p.label}: ${valueLabel(p.value)}`}
              />
              {showLabels ? (
                <span className="max-w-full truncate text-[0.65rem] text-[color-mix(in_oklab,var(--foreground)_45%,transparent)]">
                  {DateTime.fromISO(p.label).toFormat("MMM d")}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {!showLabels ? (
        <p className="mt-2 text-xs text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
          Last {points.length} days — hover a bar for the exact date and value.
        </p>
      ) : null}
    </div>
  );
}

function HorizontalBars({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="ui-card bg-[var(--card)] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">{subtitle}</p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">{r.label}</span>
              <span className="tabular-nums text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">{r.count}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,var(--border))]">
              <div
                className="h-full rounded-full bg-[color-mix(in_oklab,var(--accent)_70%,var(--foreground))]"
                style={{ width: `${Math.round((r.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsDashboard({ timezone, currency, metrics, charts }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMetric, setModalMetric] = useState<AnalyticsModalMetric | null>(null);
  const [rangePreset, setRangePreset] = useState<"7" | "30" | "custom">("30");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rowsBookings, setRowsBookings] = useState<AnalyticsBookingDetailRow[]>([]);
  const [rowsRepeat, setRowsRepeat] = useState<AnalyticsRepeatDetailRow[]>([]);
  const [modalKind, setModalKind] = useState<"bookings" | "repeat">("bookings");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const setPresetRange = useCallback(
    (preset: "7" | "30") => {
      const end = DateTime.now().setZone(timezone);
      const days = preset === "7" ? 6 : 29;
      const start = end.minus({ days });
      setFromDay(start.toISODate()!);
      setToDay(end.toISODate()!);
    },
    [timezone]
  );

  const openModal = (m: AnalyticsModalMetric) => {
    setModalMetric(m);
    setModalOpen(true);
    setRangePreset("30");
    setFetchError(null);
    const end = DateTime.now().setZone(timezone);
    const start = end.minus({ days: 29 });
    const f = start.toISODate()!;
    const t = end.toISODate()!;
    setFromDay(f);
    setToDay(t);
    setCustomFrom(f);
    setCustomTo(t);
  };

  useEffect(() => {
    if (!modalOpen || !modalMetric || !fromDay || !toDay) return;
    let cancelled = false;
    setLoadingModal(true);
    setFetchError(null);
    void fetchAnalyticsModalData(modalMetric, fromDay, toDay).then((res) => {
      if (cancelled) return;
      setLoadingModal(false);
      if (!res.ok) {
        setFetchError(res.error);
        setRowsBookings([]);
        setRowsRepeat([]);
        return;
      }
      if (res.kind === "repeat") {
        setModalKind("repeat");
        setRowsRepeat(res.rows);
        setRowsBookings([]);
      } else {
        setModalKind("bookings");
        setRowsBookings(res.rows);
        setRowsRepeat([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, modalMetric, fromDay, toDay]);

  const closeModal = () => {
    setModalOpen(false);
    setModalMetric(null);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const bookingPoints = charts.dailyBookings.map((d) => ({
    label: d.date,
    value: d.count,
  }));
  const revenuePoints = charts.dailyRevenue.map((d) => ({
    label: d.date,
    value: d.total,
  }));

  return (
    <div className="space-y-10">
      <section aria-label="Summary metrics">
        <h2 className="sr-only">Summary metrics</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["total", metrics.totalBookings],
              ["completed", metrics.completed],
              ["no_show", metrics.noShows],
              ["paid", metrics.paidBookings],
              ["revenue", metrics.revenueTotal],
              ["repeat", metrics.repeatCustomerCount],
            ] as const
          ).map(([key, value]) => {
            const meta = METRIC_META[key];
            const display =
              key === "revenue"
                ? formatMoney(typeof value === "number" ? value : 0, currency)
                : String(value);
            return (
              <div key={key}>
                <dt className="sr-only">{meta.cardLabel}</dt>
                <dd className="m-0">
                  <button
                    type="button"
                    onClick={() => openModal(key)}
                    className="ui-card group flex h-full w-full flex-col bg-[var(--card)] p-5 text-left shadow-[var(--shadow-card)] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-6"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                      {meta.cardLabel}
                    </span>
                    <span className="mt-2 text-3xl font-semibold tabular-nums text-[var(--foreground)]">{display}</span>
                    {meta.cardHint ? (
                      <span className="mt-2 text-xs leading-snug text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                        {meta.cardHint}
                      </span>
                    ) : null}
                    <span className="mt-3 text-xs font-medium text-[var(--accent)]">View details</span>
                  </button>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleColumnChart
          title="Bookings over time"
          subtitle="Last 90 days by day"
          points={bookingPoints}
          valueLabel={(n) => `${n} bookings`}
        />
        <SimpleColumnChart
          title="Revenue over time"
          subtitle="Paid booking amounts recorded in the app (last 90 days)"
          points={revenuePoints}
          valueLabel={(n) => formatMoney(n, currency)}
        />
      </div>

      <HorizontalBars
        title="Bookings by status"
        subtitle="Last 30 days — pending, confirmed, completed, and everything else grouped"
        rows={charts.statusLast30.map((r) => ({ label: r.label, count: r.count }))}
      />

      {modalOpen && modalMetric ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analytics-modal-title"
        >
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={closeModal} />
          <div className="relative z-[1] flex max-h-[min(92vh,42rem)] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] sm:max-h-[min(90vh,40rem)] sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="min-w-0">
                <h2 id="analytics-modal-title" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  {METRIC_META[modalMetric].title}
                </h2>
                <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                  Choose a range, then review the rows behind this number (up to 500 bookings).
                </p>
              </div>
              <button type="button" className="ui-btn-secondary shrink-0 px-3 py-2 text-sm" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="border-b border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                Time range
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["7", "Last 7 days"],
                    ["30", "Last 30 days"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={
                      rangePreset === val
                        ? "rounded-lg bg-[color-mix(in_oklab,var(--foreground)_8%,var(--card))] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]"
                        : "rounded-lg px-3 py-1.5 text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_65%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))]"
                    }
                    onClick={() => {
                      setRangePreset(val);
                      setPresetRange(val);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className={
                    rangePreset === "custom"
                      ? "rounded-lg bg-[color-mix(in_oklab,var(--foreground)_8%,var(--card))] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]"
                      : "rounded-lg px-3 py-1.5 text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_65%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))]"
                  }
                  onClick={() => {
                    setRangePreset("custom");
                    setCustomFrom(fromDay);
                    setCustomTo(toDay);
                    setFromDay(fromDay);
                    setToDay(toDay);
                  }}
                >
                  Custom
                </button>
              </div>
              {rangePreset === "custom" ? (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="ui-field min-w-[10rem]">
                    <span className="ui-label text-xs">From</span>
                    <input
                      type="date"
                      className="ui-input h-10 text-sm"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                  </label>
                  <label className="ui-field min-w-[10rem]">
                    <span className="ui-label text-xs">To</span>
                    <input
                      type="date"
                      className="ui-input h-10 text-sm"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="ui-btn-secondary mb-0.5 min-h-10 px-3 text-sm"
                    onClick={() => {
                      setFromDay(customFrom);
                      setToDay(customTo);
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {fetchError ? (
                <p className="text-sm text-[var(--error)]" role="alert">
                  {fetchError}
                </p>
              ) : null}
              {loadingModal && !fetchError ? (
                <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">Loading…</p>
              ) : null}
              {!loadingModal && modalKind === "bookings" && rowsBookings.length === 0 && !fetchError ? (
                <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">No rows in this range.</p>
              ) : null}
              {!loadingModal && modalKind === "repeat" && rowsRepeat.length === 0 && !fetchError ? (
                <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                  No customers with two or more bookings in this range.
                </p>
              ) : null}

              {modalKind === "bookings" && rowsBookings.length > 0 ? (
                <ul className="space-y-2">
                  {rowsBookings.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/dashboard/bookings/${r.id}`}
                        className="block rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] px-3 py-2.5 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]"
                      >
                        <div className="font-medium text-[var(--foreground)]">{r.serviceName}</div>
                        <div className="mt-0.5 text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                          {r.customerName} · {formatDateTime(r.startsAt, timezone)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                          <span>{bookingStatusLabel(r.status)}</span>
                          {r.paymentStatus === "paid" && r.paymentAmount ? (
                            <span>{formatMoney(Number(r.paymentAmount), r.currency)}</span>
                          ) : (
                            <span className="capitalize">{r.paymentStatus.replace(/_/g, " ")}</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {!loadingModal && modalKind === "repeat" && rowsRepeat.length > 0 ? (
                <ul className="space-y-2">
                  {rowsRepeat.map((r) => (
                    <li
                      key={r.customerId}
                      className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] px-3 py-2.5 text-sm"
                    >
                      <Link
                        href={`/dashboard/customers/${r.customerId}`}
                        className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        {r.customerName}
                      </Link>
                      <div className="mt-0.5 text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                        {r.bookingCount} bookings in range
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
