import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, desc, sql, count } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, bookings, services, providers, serviceCards, customerRecommendations } from "@/db/schema";
import { asFormAction } from "@/lib/form-action";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { CsrfField } from "@/components/csrf-field";
import { requireProvider } from "@/lib/tenancy";
import {
  updateCustomerNotes,
  setCustomerMarketingOptOut,
  updateCustomerCommunicationNotes,
} from "@/actions/customers";
import { CustomerRecommendationsSection } from "@/components/dashboard/customers/customer-recommendations-section";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string; bookingId?: string; serviceCardId?: string }>;
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
  if (m === "in_person_credit_debit") return "In person credit/debit";
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

function previewSnippet(text: string, max: number): string {
  const t = text.trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
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
    <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_9%,var(--border))] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
      {children}
    </section>
  );
}

export default async function CustomerDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const added = sp?.added;
  const prefilledSource =
    (sp?.bookingId && looksLikeUuid(sp.bookingId)) || (sp?.serviceCardId && looksLikeUuid(sp.serviceCardId))
      ? {
          bookingId: sp?.bookingId && looksLikeUuid(sp.bookingId) ? sp.bookingId : undefined,
          serviceCardId: sp?.serviceCardId && looksLikeUuid(sp.serviceCardId) ? sp.serviceCardId : undefined,
        }
      : undefined;
  const u = await requireProvider();
  const db = getDb();

  const [prov] = await db
    .select({
      timezone: providers.timezone,
      username: providers.username,
      publicProfileEnabled: providers.publicProfileEnabled,
    })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const timezone = prov?.timezone ?? "America/Toronto";
  const publicPreviewHref =
    prov?.publicProfileEnabled && prov.username?.trim() ? `/${prov.username.trim()}` : null;

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

  const serviceRecords = await db
    .select()
    .from(serviceCards)
    .where(and(eq(serviceCards.customerId, id), eq(serviceCards.providerId, u.providerId)))
    .orderBy(desc(serviceCards.servicePerformedAt))
    .limit(40);

  const recommendations = await db
    .select()
    .from(customerRecommendations)
    .where(and(eq(customerRecommendations.customerId, id), eq(customerRecommendations.providerId, u.providerId)))
    .orderBy(desc(customerRecommendations.createdAt))
    .limit(100);

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
        {c.accountReady ? (
          <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
            {c.accountClaimedAt ? (
              <>
                <span className="font-medium text-[var(--foreground)]">Account linked</span>
                <span className="mx-1.5 text-[var(--border)]">·</span>
                They can sign in with the email on this profile.
              </>
            ) : (
              <>
                <span className="font-medium text-[var(--foreground)]">This page</span>
                <span className="mx-1.5 text-[var(--border)]">·</span>
                Keep this customer&apos;s bookings, notes, payments, and follow-ups in one place so nothing slips
                through the cracks.
              </>
            )}
          </p>
        ) : (
          <p className="rounded-lg border border-[color-mix(in_oklab,var(--foreground)_12%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
            <span className="font-medium text-[var(--foreground)]">Walk-in placeholder</span>
            <span className="mx-1.5 text-[var(--border)]">·</span>
            Shared profile for appointments with no named client—not a personal account record.
          </p>
        )}
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
            href={`/dashboard/bookings?openBooking=1&customerId=${encodeURIComponent(id)}`}
            className="ui-btn-primary inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold"
          >
            Book appointment
          </Link>
          {publicPreviewHref ? (
            <Link
              href={publicPreviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-btn-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold"
            >
              View as customer sees
            </Link>
          ) : null}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="ui-btn-secondary inline-flex min-h-11 cursor-not-allowed items-center justify-center px-5 text-sm font-semibold opacity-60"
            title="Messaging is coming soon"
          >
            Send message
          </button>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
          {totalBookings === 0
            ? "Book their first appointment to start a visit history on this page."
            : "Book another visit or add a recommendation from the sections below."}
        </p>
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
                Sum of amounts entered on bookings—not a bank or processor total.
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
              No bookings yet. Book their first appointment to get started.
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
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Service records</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            Completed visits only: each row is a service card you saved on a booking after the appointment happened.
          </p>
          {serviceRecords.length === 0 ? (
            <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              After a visit, save a service card from the booking to see it here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {serviceRecords.map((card) => (
                <li key={card.id}>
                  <Link
                    href={`/dashboard/bookings/${card.bookingId}`}
                    className="block rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] px-4 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]"
                  >
                    <div className="font-medium text-[var(--foreground)]">{card.serviceNameSnapshot}</div>
                    {card.templateLabelSnapshot ? (
                      <div className="mt-0.5 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                        Template: {card.templateLabelSnapshot}
                      </div>
                    ) : null}
                    <div className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
                      {formatDateTime(card.servicePerformedAt, timezone)}
                    </div>
                    {card.workSummary.trim() ? (
                      <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                        {previewSnippet(card.workSummary, 180)}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_48%,transparent)] italic">
                        No work summary yet
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-4 sm:p-5">
        <CustomerRecommendationsSection
          csrf={csrf}
          customerId={c.id}
          recommendations={recommendations}
          prefilledSource={prefilledSource}
        />
      </div>

      {sectionCard(
        <>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Payments</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            What you recorded on each booking—amount, method, and status—not a live bank feed.
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
                    {Number(booking.tipPercent) > 0 ? (
                      <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                        Includes {String(booking.tipPercent)}% tip from booking
                      </div>
                    ) : null}
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
            Private notes about this customer.
          </p>
          <form
            action={asFormAction(updateCustomerNotes)}
            className="mt-3 grid gap-2.5 rounded-lg bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-3 sm:p-4"
          >
            <CsrfField token={csrf} />
            <input type="hidden" name="id" value={c.id} />
            <textarea
              name="notes"
              rows={4}
              defaultValue={c.notes}
              className="ui-textarea border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)]"
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
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            Marketing opt-in and how they like to be reached—helps you stay respectful and prepared.
          </p>
          <form
            action={asFormAction(setCustomerMarketingOptOut)}
            className="mt-3 grid gap-2.5 rounded-lg bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-3 sm:p-4"
          >
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

          <form
            action={asFormAction(updateCustomerCommunicationNotes)}
            className="mt-5 grid gap-2.5 border-t border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] pt-5"
          >
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
              className="ui-textarea border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)]"
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
