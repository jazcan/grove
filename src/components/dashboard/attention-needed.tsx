import Link from "next/link";
import { dismissPublicBookingFailureSignalAction } from "@/actions/dashboard-signals";
import { BOOKING_FAILED_SIGNAL_KIND, type PresentedProviderSignal } from "@/domain/provider-dashboard-signals";
import { SignalDismissButton } from "@/components/dashboard/signal-dismiss-button";

type Props = {
  signals: PresentedProviderSignal[];
  csrfToken: string;
};

export function AttentionNeededSection({ signals, csrfToken }: Props) {
  if (!signals.length) return null;

  return (
    <section
      id="attention"
      aria-labelledby="attention-heading"
      className="space-y-4 rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--card-border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] p-5 shadow-[var(--shadow-sm)] sm:p-6"
    >
      <div>
        <h2 id="attention-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Attention needed
        </h2>
        <p className="ui-hint mt-2 text-sm leading-relaxed">
          Issues that may affect bookings or revenue—address these first.
        </p>
      </div>

      <ul className="space-y-4">
        {signals.map((s) => {
          const meta = s.metadata ?? {};
          const contactEmail = typeof meta.email === "string" ? meta.email : undefined;
          const contactPhone = typeof meta.phone === "string" ? meta.phone : undefined;

          return (
          <li
            key={s.id}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{s.title}</h3>
            <p className="ui-hint mt-2 text-sm leading-relaxed">{s.description}</p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
              <span>
                <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                  {s.occurrenceCount}
                </span>{" "}
                {s.occurrenceCount === 1 ? "occurrence" : "occurrences"}
              </span>
              <span>
                Last seen{" "}
                {new Date(s.lastSeenAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            {(contactEmail || contactPhone) && (
              <p className="mt-3 text-sm text-[var(--foreground)]">
                {contactEmail ? (
                  <span>
                    Email:{" "}
                    <a href={`mailto:${encodeURIComponent(contactEmail)}`} className="ui-link font-medium">
                      {contactEmail}
                    </a>
                  </span>
                ) : null}
                {contactEmail && contactPhone ? <span className="mx-2 text-[var(--muted)]">·</span> : null}
                {contactPhone ? (
                  <span>
                    Phone:{" "}
                    <a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`} className="ui-link font-medium">
                      {contactPhone}
                    </a>
                  </span>
                ) : null}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {s.cta ? (
                s.cta.href.startsWith("mailto:") || s.cta.href.startsWith("tel:") ? (
                  <a
                    href={s.cta.href}
                    className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
                  >
                    {s.cta.label}
                  </a>
                ) : (
                  <Link
                    href={s.cta.href}
                    className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
                  >
                    {s.cta.label}
                  </Link>
                )
              ) : null}
              {s.signalKind === BOOKING_FAILED_SIGNAL_KIND ? (
                <form action={dismissPublicBookingFailureSignalAction} className="inline-flex">
                  <input type="hidden" name="csrf" value={csrfToken} />
                  <SignalDismissButton />
                </form>
              ) : null}
            </div>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
