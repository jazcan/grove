import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, customers, services } from "@/db/schema";
import { asFormAction } from "@/lib/form-action";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { CsrfField } from "@/components/csrf-field";
import { requireProvider } from "@/lib/tenancy";
import {
  updateBookingStatus,
  updateBookingNotes,
  updateBookingPayment,
  rescheduleBooking,
} from "@/actions/booking-dashboard";

type Props = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const u = await requireProvider();
  const db = getDb();
  const [row] = await db
    .select({
      booking: bookings,
      customer: customers,
      service: services,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(bookings.id, id), eq(bookings.providerId, u.providerId)))
    .limit(1);

  if (!row) notFound();
  const csrf = await getCsrfTokenForForm();
  const { booking, customer, service } = row;

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">Booking</h1>
      <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Reference {booking.publicReference.toString()}
      </p>

      <section className="mt-8 space-y-2 text-sm">
        <p>
          <strong>Service:</strong> {service.name}
        </p>
        <p>
          <strong>Customer:</strong> {customer.fullName} ({customer.email})
        </p>
        <p>
          <strong>When:</strong> {booking.startsAt.toLocaleString()} → {booking.endsAt.toLocaleString()}
        </p>
        <p>
          <strong>Customer notes:</strong> {booking.customerNotes || "—"}
        </p>
      </section>

      <section className="mt-10 max-w-md space-y-6">
        <form action={asFormAction(updateBookingStatus)} className="flex flex-wrap items-end gap-2">
          <CsrfField token={csrf} />
          <input type="hidden" name="id" value={booking.id} />
          <label className="text-sm">
            Status
            <select name="status" defaultValue={booking.status} className="ml-2 rounded border px-2 py-1">
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="no_show">no_show</option>
              <option value="rescheduled">rescheduled</option>
            </select>
          </label>
          <button type="submit" className="rounded border px-3 py-1 text-sm">
            Update
          </button>
        </form>

        <form action={asFormAction(updateBookingPayment)} className="grid gap-2">
          <CsrfField token={csrf} />
          <input type="hidden" name="id" value={booking.id} />
          <label className="text-sm">
            Payment status
            <select
              name="paymentStatus"
              defaultValue={booking.paymentStatus}
              className="mt-1 w-full rounded border px-2 py-2"
            >
              <option value="unpaid">unpaid</option>
              <option value="partially_paid">partially_paid</option>
              <option value="paid">paid</option>
              <option value="waived">waived</option>
              <option value="refunded">refunded</option>
            </select>
          </label>
          <input name="paymentMethod" placeholder="Method" defaultValue={booking.paymentMethod ?? ""} className="rounded border px-2 py-2" />
          <input name="paymentAmount" placeholder="Amount" defaultValue={booking.paymentAmount ?? ""} className="rounded border px-2 py-2" />
          <textarea name="paymentNote" placeholder="Payment note" defaultValue={booking.paymentNote ?? ""} className="rounded border px-2 py-2" rows={2} />
          <button type="submit" className="w-fit rounded bg-[var(--accent)] px-3 py-2 text-sm text-white">
            Save payment
          </button>
        </form>

        <form action={asFormAction(rescheduleBooking)} className="grid gap-2">
          <CsrfField token={csrf} />
          <input type="hidden" name="id" value={booking.id} />
          <label className="text-sm">
            Reschedule start (local)
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="mt-1 w-full rounded border px-2 py-2"
            />
          </label>
          <button type="submit" className="w-fit rounded border px-3 py-2 text-sm">
            Reschedule
          </button>
        </form>

        <form action={asFormAction(updateBookingNotes)} className="grid gap-2">
          <CsrfField token={csrf} />
          <input type="hidden" name="id" value={booking.id} />
          <label className="text-sm font-medium" htmlFor="internalNotes">
            Internal notes (private)
          </label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={4}
            defaultValue={booking.internalNotes}
            className="rounded border px-2 py-2"
          />
          <button type="submit" className="w-fit rounded border px-3 py-2 text-sm">
            Save notes
          </button>
        </form>
      </section>
    </main>
  );
}
