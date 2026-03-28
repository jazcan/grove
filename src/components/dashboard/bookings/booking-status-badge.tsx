import type { InferSelectModel } from "drizzle-orm";
import { bookings } from "@/db/schema";

export type BookingStatus = InferSelectModel<typeof bookings>["status"];

const label: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
  rescheduled: "Rescheduled",
};

const classFor: Record<BookingStatus, string> = {
  confirmed:
    "border-[color-mix(in_oklab,var(--success)_32%,var(--border))] bg-[color-mix(in_oklab,var(--success)_10%,var(--card))] text-[var(--success)]",
  pending:
    "border-[color-mix(in_oklab,#b45309_30%,var(--border))] bg-[color-mix(in_oklab,#d97706_12%,var(--card))] text-[#92400e]",
  completed:
    "border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]",
  cancelled:
    "border-[color-mix(in_oklab,var(--error)_25%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] text-[var(--error)]",
  no_show:
    "border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))] text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]",
  rescheduled:
    "border-[color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] text-[var(--accent)]",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${classFor[status]}`}
    >
      {label[status]}
    </span>
  );
}
