import type { InferSelectModel } from "drizzle-orm";
import { bookings } from "@/db/schema";

type PayStatus = InferSelectModel<typeof bookings>["paymentStatus"];

const copy: Record<PayStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  waived: "Waived",
  refunded: "Refunded",
};

export function BookingPaymentLabel({ status }: { status: PayStatus }) {
  return (
    <span className="text-xs text-[color-mix(in_oklab,var(--muted-foreground)_92%,transparent)]">
      Payment: <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">{copy[status]}</span>
    </span>
  );
}
