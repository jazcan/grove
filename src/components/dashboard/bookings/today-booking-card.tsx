import Link from "next/link";
import { DateTime } from "luxon";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { updateBookingStatus } from "@/actions/booking-dashboard";
import { BookingStatusBadge, type BookingStatus } from "./booking-status-badge";
import { BookingPaymentLabel } from "./booking-payment-label";
import type { InferSelectModel } from "drizzle-orm";
import { bookings } from "@/db/schema";

type PayStatus = InferSelectModel<typeof bookings>["paymentStatus"];

export type TodayBookingCardData = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  paymentStatus: PayStatus;
  serviceName: string;
  customerName: string;
};

export function TodayBookingCard({ row, timezone, csrf }: { row: TodayBookingCardData; timezone: string; csrf: string }) {
  const start = DateTime.fromMillis(row.startsAt.getTime(), { zone: "utc" }).setZone(timezone);
  const end = DateTime.fromMillis(row.endsAt.getTime(), { zone: "utc" }).setZone(timezone);
  const timeRange =
    start.toFormat("h:mm a") === end.toFormat("h:mm a")
      ? start.toFormat("h:mm a")
      : `${start.toFormat("h:mm a")} – ${end.toFormat("h:mm a")}`;

  const canComplete = row.status === "pending" || row.status === "confirmed";
  const canCancel =
    row.status === "pending" || row.status === "confirmed" || row.status === "rescheduled";

  return (
    <article className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_1.5%,var(--card))] p-4 shadow-[var(--shadow-sm)] sm:p-4">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-[var(--foreground)] sm:text-2xl">{timeRange}</p>
          <p className="text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">{row.serviceName}</p>
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">{row.customerName}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <BookingStatusBadge status={row.status} />
            <BookingPaymentLabel status={row.paymentStatus} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={`/dashboard/bookings/${row.id}`}
            className="ui-btn-secondary min-h-11 w-full justify-center px-4 text-center text-sm font-semibold sm:min-h-10 sm:w-auto"
          >
            View details
          </Link>
          {(canComplete || canCancel) && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              {canComplete ? (
                <form action={asFormAction(updateBookingStatus)} className="w-full sm:w-auto">
                  <CsrfField token={csrf} />
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button
                    type="submit"
                    className="ui-btn-ghost min-h-11 w-full text-sm font-medium text-[var(--accent)] sm:min-h-9 sm:w-auto sm:px-3"
                  >
                    Mark complete
                  </button>
                </form>
              ) : null}
              {canCancel ? (
                <form action={asFormAction(updateBookingStatus)} className="w-full sm:w-auto">
                  <CsrfField token={csrf} />
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button
                    type="submit"
                    className="ui-btn-ghost min-h-11 w-full text-sm font-medium text-[color-mix(in_oklab,var(--error)_88%,var(--foreground))] sm:min-h-9 sm:w-auto sm:px-3"
                  >
                    Cancel
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
