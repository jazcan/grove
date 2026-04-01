import { DateTime } from "luxon";
import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { saveServiceCard } from "@/actions/service-cards";
import { serviceCards } from "@/db/schema";

type ServiceCardRow = InferSelectModel<typeof serviceCards>;

type Props = {
  csrf: string;
  timezone: string;
  bookingId: string;
  customerId: string;
  bookingStartsAt: Date;
  serviceName: string;
  templateLabel: string | null;
  existing: ServiceCardRow | null;
};

function defaultDatetimeLocal(d: Date, tz: string): string {
  try {
    return DateTime.fromJSDate(d).setZone(tz).toFormat("yyyy-MM-dd'T'HH:mm");
  } catch {
    return DateTime.fromJSDate(d).toFormat("yyyy-MM-dd'T'HH:mm");
  }
}

export function ServiceCardSection({
  csrf,
  timezone,
  bookingId,
  customerId,
  bookingStartsAt,
  serviceName,
  templateLabel,
  existing,
}: Props) {
  const performedDefault = existing
    ? defaultDatetimeLocal(existing.servicePerformedAt, timezone)
    : defaultDatetimeLocal(bookingStartsAt, timezone);

  return (
    <div className="ui-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[var(--foreground)]">Service card</h2>
      <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
        Structured record of this visit—separate from booking notes. One card per appointment.
      </p>
      <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
        <span className="font-medium text-[var(--foreground)]">Service:</span> {serviceName}
        {templateLabel ? (
          <>
            {" "}
            <span className="text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">·</span> Template:{" "}
            {templateLabel}
          </>
        ) : null}
      </p>
      <p className="mt-1 text-sm">
        <Link
          href={`/dashboard/customers/${customerId}`}
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          View customer profile
        </Link>
      </p>

      <form action={asFormAction(saveServiceCard)} className="mt-5 grid gap-4">
        <CsrfField token={csrf} />
        <input type="hidden" name="bookingId" value={bookingId} />
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Service date &amp; time</span>
          <input
            name="servicePerformedAt"
            type="datetime-local"
            required
            defaultValue={performedDefault}
            className="ui-input mt-1"
          />
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Summary of work performed</span>
          <textarea
            name="workSummary"
            rows={3}
            defaultValue={existing?.workSummary ?? ""}
            className="ui-textarea mt-1"
            placeholder="What you did for this client"
          />
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Observations / findings</span>
          <textarea
            name="observations"
            rows={3}
            defaultValue={existing?.observations ?? ""}
            className="ui-textarea mt-1"
            placeholder="What you noticed (condition, measurements, risks, etc.)"
          />
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Recommended follow-up</span>
          <textarea
            name="followUpRecommendation"
            rows={2}
            defaultValue={existing?.followUpRecommendation ?? ""}
            className="ui-textarea mt-1"
            placeholder="Next visit, maintenance, or referrals"
          />
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
            Card internal notes <span className="font-normal">(not shown to customers)</span>
          </span>
          <textarea
            name="cardInternalNotes"
            rows={2}
            defaultValue={existing?.internalNotes ?? ""}
            className="ui-textarea mt-1"
            placeholder="Private context for your team—different from booking internal notes"
          />
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
            Customer-visible summary <span className="font-normal">(optional; for future sharing)</span>
          </span>
          <textarea
            name="customerVisibleSummary"
            rows={2}
            defaultValue={existing?.customerVisibleSummary ?? ""}
            className="ui-textarea mt-1"
            placeholder="Short version you could email or show in a portal later"
          />
        </label>
        <button type="submit" className="ui-btn-primary w-fit min-h-10 px-4 text-sm font-semibold">
          {existing ? "Update service card" : "Save service card"}
        </button>
      </form>
    </div>
  );
}
