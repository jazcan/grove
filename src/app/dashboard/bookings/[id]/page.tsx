import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, canonicalServiceTemplates, customers, providers, serviceCards, services } from "@/db/schema";
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
import { ServiceCardSection } from "@/components/dashboard/bookings/service-card-section";

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
      templateLabel: canonicalServiceTemplates.label,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(canonicalServiceTemplates, eq(bookings.canonicalTemplateId, canonicalServiceTemplates.id))
    .where(and(eq(bookings.id, id), eq(bookings.providerId, u.providerId)))
    .limit(1);

  if (!row) notFound();
  const [provRow] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const timezone = provRow?.timezone ?? "America/Toronto";

  const [existingCard] = await db.select().from(serviceCards).where(eq(serviceCards.bookingId, id)).limit(1);

  const csrf = await getCsrfTokenForForm();
  const { booking, customer, service, templateLabel } = row;

  return (
    <main id="main-content" className="mx-auto max-w-3xl">
      <p className="text-sm">
        <Link href="/dashboard/bookings" className="ui-link font-semibold">
          ← Bookings
        </Link>
      </p>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Booking</h1>
      <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Reference {booking.publicReference.toString()}
      </p>

      <section className="ui-card mt-8 space-y-3 p-5 text-sm sm:p-6">
        <p>
          <strong className="text-[var(--foreground)]">Service:</strong> {service.name}
        </p>
        <p>
          <strong className="text-[var(--foreground)]">Customer:</strong> {customer.fullName} ({customer.email})
        </p>
        <p>
          <strong className="text-[var(--foreground)]">When:</strong> {booking.startsAt.toLocaleString()} →{" "}
          {booking.endsAt.toLocaleString()}
        </p>
        <p>
          <strong className="text-[var(--foreground)]">Customer notes:</strong> {booking.customerNotes || "—"}
        </p>
      </section>

      <div className="mt-8 max-w-lg">
        <ServiceCardSection
          csrf={csrf}
          timezone={timezone}
          bookingId={booking.id}
          customerId={customer.id}
          bookingStartsAt={booking.startsAt}
          serviceName={service.name}
          templateLabel={templateLabel ?? null}
          existing={existingCard ?? null}
        />
        <div className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-4 py-4 text-sm">
          <div className="font-medium text-[var(--foreground)]">Customer follow-up recommendation</div>
          <p className="mt-1 text-xs leading-relaxed text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
            Add a future-facing recommendation on the customer&apos;s profile. It can link back to this visit
            {existingCard ? " and its service record" : ""}—useful for repeat bookings and retention.
          </p>
          <Link
            href={`/dashboard/customers/${customer.id}?bookingId=${booking.id}${existingCard ? `&serviceCardId=${existingCard.id}` : ""}#recommendations`}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_14%,var(--card))]"
          >
            Add recommendation for this customer
          </Link>
        </div>
      </div>

      <section className="mt-8 grid max-w-lg gap-8">
        <div className="ui-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Status</h2>
          <form action={asFormAction(updateBookingStatus)} className="mt-4 flex flex-wrap items-end gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={booking.id} />
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Status</span>
              <select name="status" defaultValue={booking.status} className="ui-input mt-1">
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
                <option value="no_show">no_show</option>
                <option value="rescheduled">rescheduled</option>
              </select>
            </label>
            <button type="submit" className="ui-btn-secondary min-h-10 px-4 text-sm">
              Update
            </button>
          </form>
        </div>

        <div className="ui-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Payment</h2>
          {Number(booking.tipPercent) > 0 ? (
            <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
              Tip recorded at booking: {String(booking.tipPercent)}% (included in the amount below if unchanged).
            </p>
          ) : null}
          <form action={asFormAction(updateBookingPayment)} className="mt-4 grid gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={booking.id} />
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Payment status</span>
              <select
                name="paymentStatus"
                defaultValue={booking.paymentStatus}
                className="ui-input mt-1"
              >
                <option value="unpaid">unpaid</option>
                <option value="partially_paid">partially_paid</option>
                <option value="paid">paid</option>
                <option value="waived">waived</option>
                <option value="refunded">refunded</option>
              </select>
            </label>
            <input name="paymentMethod" placeholder="Method" defaultValue={booking.paymentMethod ?? ""} className="ui-input" />
            <input name="paymentAmount" placeholder="Amount" defaultValue={booking.paymentAmount ?? ""} className="ui-input" />
            <textarea name="paymentNote" placeholder="Payment note" defaultValue={booking.paymentNote ?? ""} className="ui-textarea" rows={2} />
            <button type="submit" className="ui-btn-primary w-fit min-h-10 px-4 text-sm">
              Save payment
            </button>
          </form>
        </div>

        <div className="ui-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Reschedule</h2>
          <form action={asFormAction(rescheduleBooking)} className="mt-4 grid gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={booking.id} />
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">New start (local)</span>
              <input
                name="startsAt"
                type="datetime-local"
                required
                className="ui-input mt-1"
              />
            </label>
            <button type="submit" className="ui-btn-secondary w-fit min-h-10 px-4 text-sm">
              Reschedule
            </button>
          </form>
        </div>

        <div className="ui-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Internal notes</h2>
          <p className="ui-hint mt-1 text-xs">Visible only to you.</p>
          <form action={asFormAction(updateBookingNotes)} className="mt-4 grid gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={booking.id} />
            <textarea
              id="internalNotes"
              name="internalNotes"
              rows={4}
              defaultValue={booking.internalNotes}
              className="ui-textarea"
            />
            <button type="submit" className="ui-btn-secondary w-fit min-h-10 px-4 text-sm">
              Save notes
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
