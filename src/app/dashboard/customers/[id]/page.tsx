import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, desc, sql, count } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, bookings, services, providers } from "@/db/schema";
import { asFormAction } from "@/lib/form-action";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { CsrfField } from "@/components/csrf-field";
import { requireProvider } from "@/lib/tenancy";
import {
  updateCustomerNotes,
  setCustomerMarketingOptOut,
  updateCustomerCommunicationNotes,
} from "@/actions/customers";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
};

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

function paymentStatusLabel(status: string): string {
  const m: Record<string, string> = {
    unpaid: "Unpaid",
    partially_paid: "Partially paid",
    paid: "Paid",
    waived: "Waived",
    refunded: "Refunded",
  };
  return m[status] ?? status;
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method?.trim()) return "—";
  const m = method.trim().toLowerCase();
  if (m === "cash") return "Cash";
  if (m === "etransfer" || m === "e-transfer" || m === "interac") return "E-transfer";
  return method.trim();
}

function formatMoney(amount: string | null | undefined, currency: string): string {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "CAD" }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDateTime(d: Date, tz: string): string {
  try {
    return d.toLocaleString(undefined, {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

function sectionCard(children: ReactNode) {
  return (
    <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      {children}
    </section>
  );
}

export default async function CustomerDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { added } = await searchParams;
  const u = await requireProvider();
  const db = getDb();

  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const timezone = prov?.timezone ?? "America/Toronto";

  const [c] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.providerId, u.providerId)))
    .limit(1);
  if (!c) notFound();

  const history = await db
    .select({ booking: bookings, service: services })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(bookings.customerId, id), eq(bookings.providerId, u.providerId)))
    .orderBy(desc(bookings.startsAt))
    .limit(80);

  const [agg] = await db
    .select({
      totalBookings: count(),
      revenue: sql<string>`coalesce(sum((${bookings.paymentAmount})::numeric), 0)::text`,
    })
    .from(bookings)
    .where(and(eq(bookings.customerId, id), eq(bookings.providerId, u.providerId)));

  const totalBookings = Number(agg?.totalBookings ?? 0);
  const revenueTotal = agg?.revenue ?? "0";
  const lastBookingAt = history[0]?.booking.startsAt ?? null;
  const primaryCurrency = history[0]?.service.currency ?? "CAD";

  const csrf = await getCsrfTokenForForm();

  return (
    <main id="main-content" className="max-w-3xl space-y-12">
      <div>
        <Link
          href="/dashboard/customers"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          ← Back to customers
        </Link>
      </div>

      {added === "1" ? (
        <div
          role="status"
          className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--background))] px-4 py-3 text-sm"
        >
          <span className="font-medium">Added</span>
          <span className="mt-0.5 block text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
            You can add appointments and notes anytime.
          </span>
        </div>
      ) : null}

      <header className="space-y-4 pb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{c.fullName}</h1>
        <div className="flex flex-col gap-1 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          <a href={`mailto:${encodeURIComponent(c.email)}`} className="w-fit hover:text-[var(--accent)] hover:underline">
            {c.email}
          </a>
          {c.phone ? (
            <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="w-fit hover:text-[var(--accent)] hover:underline">
              {c.phone}
            </a>
          ) : (
            <span className="text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">No phone on file</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard/availability"
            className="ui-btn-primary inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold"
          >
            Book appointment
          </Link>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] px-5 text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_45%,transparent)]"
            title="Messaging is coming soon"
          >
            Send message
          </button>
        </div>
      </header>

      {sectionCard(
        <>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Overview</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_50%,transparent)]">
                Total bookings
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{totalBookings}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_50%,transparent)]">
                Last booking
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {lastBookingAt ? formatDateTime(lastBookingAt, timezone) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_50%,transparent)]">
                Payments recorded
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">
                {formatMoney(revenueTotal, primaryCurrency)}
              </dd>
              <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                Sum of amounts entered on bookings (if you track them there).
              </p>
            </div>
          </dl>
        </>
      )}

      {sectionCard(
        <>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Bookings</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              No appointments yet. When they book you, you&apos;ll see each visit here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.map(({ booking, service }) => (
                <li key={booking.id}>
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="block rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] px-4 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]"
                  >
                    <div className="font-medium text-[var(--foreground)]">{service.name}</div>
                    <div className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
                      {formatDateTime(booking.startsAt, timezone)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--accent)]">{bookingStatusLabel(booking.status)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {sectionCard(
        <>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Payments</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            Pulled from each booking&apos;s payment fields.
          </p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">—</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {history.map(({ booking, service }) => (
                <li
                  key={`pay-${booking.id}`}
                  className="flex flex-col gap-1 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium text-[var(--foreground)]">
                      {formatMoney(booking.paymentAmount?.toString() ?? null, service.currency)}
                    </div>
                    <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                      {service.name} · {formatDateTime(booking.startsAt, timezone)}
                    </div>
                  </div>
                  <div className="text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                    <span>{paymentMethodLabel(booking.paymentMethod)}</span>
                    <span className="mx-2 text-[var(--border)]">·</span>
                    <span>{paymentStatusLabel(booking.paymentStatus)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {sectionCard(
        <>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Notes</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            For your eyes only—great for visit summaries, follow-ups, or context.
          </p>
          <form action={asFormAction(updateCustomerNotes)} className="mt-4 grid gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={c.id} />
            <textarea
              name="notes"
              rows={5}
              defaultValue={c.notes}
              className="ui-textarea"
              placeholder="What should you remember about this person?"
            />
            <button type="submit" className="ui-btn-primary w-fit min-h-10 px-4 text-sm font-semibold">
              Save notes
            </button>
          </form>
        </>
      )}

      {sectionCard(
        <>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Preferences</h2>
          <form action={asFormAction(setCustomerMarketingOptOut)} className="mt-4 grid gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={c.id} />
            <label className="flex items-start gap-3 text-sm leading-snug">
              <input
                type="checkbox"
                name="acceptsMarketing"
                defaultChecked={!c.marketingOptOut}
                className="mt-1"
              />
              <span>Accepts marketing emails</span>
            </label>
            <button type="submit" className="ui-btn-secondary w-fit min-h-10 px-4 text-sm font-semibold">
              Save preferences
            </button>
          </form>

          <form action={asFormAction(updateCustomerCommunicationNotes)} className="mt-6 grid gap-3 border-t border-[var(--border)] pt-6">
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={c.id} />
            <label htmlFor="communicationNotes" className="text-sm font-medium text-[var(--foreground)]">
              How they like to communicate
            </label>
            <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
              Text vs. call, best times to reach them, language—whatever helps you stay in sync.
            </p>
            <textarea
              id="communicationNotes"
              name="communicationNotes"
              rows={3}
              defaultValue={c.communicationNotes}
              className="ui-textarea"
              placeholder="e.g. Prefers text, weekday afternoons"
            />
            <button type="submit" className="ui-btn-secondary w-fit min-h-10 px-4 text-sm font-semibold">
              Save communication notes
            </button>
          </form>
        </>
      )}
    </main>
  );
}
