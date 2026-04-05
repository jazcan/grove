"use client";

import Link from "next/link";
import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import { customerRecommendations } from "@/db/schema";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import {
  createCustomerRecommendation,
  updateCustomerRecommendationStatus,
} from "@/actions/customer-recommendations";
import { CUSTOMER_RECOMMENDATION_TIMEFRAMES } from "@/platform/enums";

type Row = InferSelectModel<typeof customerRecommendations>;

const TIMEFRAME_LABEL: Record<string, string> = {
  asap: "ASAP",
  within_30_days: "Within 30 days",
  next_visit: "Next visit",
  seasonal: "Seasonal",
  custom: "Custom",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  booked: "Booked",
  completed: "Completed",
  declined: "Declined",
  archived: "Archived",
};

type Props = {
  csrf: string;
  customerId: string;
  recommendations: Row[];
  /** When opening from a booking or service card context */
  prefilledSource?: { bookingId?: string; serviceCardId?: string };
};

export function CustomerRecommendationsSection({
  csrf,
  customerId,
  recommendations,
  prefilledSource,
}: Props) {
  const srcBooking = prefilledSource?.bookingId ?? "";
  const srcCard = prefilledSource?.serviceCardId ?? "";
  const openByDefault = Boolean(srcBooking || srcCard);
  const [formOpen, setFormOpen] = useState(openByDefault);

  return (
    <section id="recommendations" className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Recommendations &amp; follow-ups</h2>
      <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
        Suggest their next service and when to book it—your plan between visits, not automatic outreach.
      </p>

      <details
        className="mt-5 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)]"
        open={formOpen}
        onToggle={(e) => setFormOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-offset-2 [&::-webkit-details-marker]:hidden sm:px-5 sm:py-3.5">
          <span className="text-[var(--accent)]">Add recommendation</span>
          <span className="mt-0.5 block text-xs font-normal text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
            Optional: log the next visit you have in mind and a rough timeframe.
          </span>
        </summary>

        <div className="border-t border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <form action={asFormAction(createCustomerRecommendation)} className="grid max-w-lg gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="customerId" value={customerId} />
            {srcBooking ? <input type="hidden" name="sourceBookingId" value={srcBooking} /> : null}
            {srcCard ? <input type="hidden" name="sourceServiceCardId" value={srcCard} /> : null}

            {(srcBooking || srcCard) && (
              <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                {srcBooking ? (
                  <>
                    Linked to{" "}
                    <Link href={`/dashboard/bookings/${srcBooking}`} className="text-[var(--accent)] underline-offset-2 hover:underline">
                      a booking
                    </Link>
                  </>
                ) : null}
                {srcBooking && srcCard ? " · " : null}
                {srcCard ? "Linked to a service record from that visit." : null}
                {!srcBooking && srcCard ? "Linked to a service record." : null}
              </p>
            )}

            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">Title</span>
              <input name="title" required className="ui-input mt-1" placeholder="e.g. Follow-up trim, seasonal tune-up" />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">What to book / do</span>
              <textarea name="description" rows={3} className="ui-textarea mt-1" placeholder="Short description of the suggested service or next step" />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">Why (rationale)</span>
              <textarea name="reason" rows={2} className="ui-textarea mt-1" placeholder="Why this matters for them—professional context" />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">Suggested timing</span>
              <select name="suggestedTimeframe" className="ui-input mt-1" defaultValue="next_visit">
                {CUSTOMER_RECOMMENDATION_TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {TIMEFRAME_LABEL[tf] ?? tf}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">Timing detail (optional)</span>
              <input
                name="timeframeDetail"
                className="ui-input mt-1"
                placeholder="e.g. Before winter, when budget allows"
              />
            </label>
            <button type="submit" className="ui-btn-primary w-fit min-h-10 px-4 text-sm font-semibold">
              Save recommendation
            </button>
          </form>
        </div>
      </details>

      <div className="mt-4 rounded-lg border border-dashed border-[color-mix(in_oklab,var(--foreground)_12%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] px-3 py-2.5 text-xs text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        <span className="font-medium text-[var(--foreground)]">Book this later:</span> use{" "}
        <Link href="/dashboard/availability" className="text-[var(--accent)] underline-offset-2 hover:underline">
          availability
        </Link>{" "}
        to schedule, then mark the recommendation as <strong className="font-medium text-[var(--foreground)]">Booked</strong> or{" "}
        <strong className="font-medium text-[var(--foreground)]">Completed</strong> here.
      </div>

      {recommendations.length === 0 ? (
        <p className="mt-5 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
          No recommendations yet. Expand <span className="font-medium text-[var(--foreground)]">Add recommendation</span> when you’re ready, or add one from a booking’s service card flow.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {recommendations.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_7%,var(--border))] px-3 py-3 sm:px-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-[var(--foreground)]">{r.title}</div>
                  <div className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                    {TIMEFRAME_LABEL[r.suggestedTimeframe] ?? r.suggestedTimeframe}
                    {r.timeframeDetail.trim() ? ` · ${r.timeframeDetail.trim()}` : null}
                  </div>
                  {r.description.trim() ? (
                    <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">{r.description}</p>
                  ) : null}
                  {r.reason.trim() ? (
                    <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                      <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">Why:</span>{" "}
                      {r.reason}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color-mix(in_oklab,var(--foreground)_50%,transparent)]">
                    {r.sourceBookingId ? (
                      <Link
                        href={`/dashboard/bookings/${r.sourceBookingId}`}
                        className="text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Source booking
                      </Link>
                    ) : null}
                    {r.sourceServiceCardId && r.sourceBookingId ? (
                      <Link
                        href={`/dashboard/bookings/${r.sourceBookingId}`}
                        className="text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Source service record (visit)
                      </Link>
                    ) : null}
                  </div>
                </div>
                <form action={asFormAction(updateCustomerRecommendationStatus)} className="flex shrink-0 flex-wrap items-center gap-2">
                  <CsrfField token={csrf} />
                  <input type="hidden" name="id" value={r.id} />
                  <label className="sr-only" htmlFor={`rec-status-${r.id}`}>
                    Status
                  </label>
                  <select id={`rec-status-${r.id}`} name="status" defaultValue={r.status} className="ui-input py-1.5 text-sm">
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="ui-btn-secondary min-h-9 px-3 text-xs font-semibold">
                    Update
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
