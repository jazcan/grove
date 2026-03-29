"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { dismissPublicBookingFailureSignalAction } from "@/actions/dashboard-signals";

function DismissButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="ui-btn-secondary min-h-10 shrink-0 px-4 py-2 text-sm font-semibold"
      disabled={pending}
    >
      {pending ? "Dismissing…" : "Dismiss"}
    </button>
  );
}

type Props = {
  csrfToken: string;
  occurrenceCount: number;
  lastSeenAt: Date;
};

export function PublicBookingIssueBanner({ csrfToken, occurrenceCount, lastSeenAt }: Props) {
  const when = lastSeenAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--card-border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] p-4 shadow-[var(--shadow-sm)] sm:p-5"
      role="region"
      aria-labelledby="booking-issue-banner-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <h2
              id="booking-issue-banner-title"
              className="text-base font-semibold tracking-tight text-[var(--foreground)]"
            >
              A customer may have had trouble booking
            </h2>
            <p className="ui-hint mt-2 text-sm leading-relaxed text-[var(--foreground)]">
              Someone using your public page hit an error while completing a booking. This does not always mean
              something is wrong on your side, but it is worth a quick check so you do not miss appointments.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Suggested next steps</p>
            <ul className="ui-hint mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-[var(--foreground)]">
              <li>
                Review your{" "}
                <Link href="/dashboard/availability" className="ui-link font-medium">
                  availability
                </Link>{" "}
                and recent changes to open times.
              </li>
              <li>
                Check{" "}
                <Link href="/dashboard/profile" className="ui-link font-medium">
                  booking settings
                </Link>{" "}
                (lead time, horizon, payment options, and whether new bookings are paused).
              </li>
              <li>
                Confirm your{" "}
                <Link href="/dashboard/services" className="ui-link font-medium">
                  services
                </Link>{" "}
                are active and priced correctly.
              </li>
              <li>If this keeps happening, contact support with the time below so we can help trace it.</li>
            </ul>
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Last reported {when}
            {occurrenceCount > 1 ? ` · ${occurrenceCount} reports on record` : null}. You can dismiss this
            reminder; it will come back if another issue is detected.
          </p>
        </div>
        <form action={dismissPublicBookingFailureSignalAction} className="flex shrink-0 flex-col gap-2 sm:items-end">
          <input type="hidden" name="csrf" value={csrfToken} />
          <DismissButton />
        </form>
      </div>
    </div>
  );
}
