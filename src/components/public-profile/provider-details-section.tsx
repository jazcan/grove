import type { ReactNode } from "react";

export type ProviderDetailsLink = {
  label: string;
  href: string;
};

type Props = {
  city: string;
  serviceArea: string;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentCash: boolean;
  paymentEtransfer: boolean;
  paymentInPersonCreditDebit: boolean;
  etransferDetails: string;
  paymentDueBeforeAppointment: boolean;
  cancellationPolicy: string;
  /** Future: website, socials — pass when profile schema grows */
  extraLinks?: ProviderDetailsLink[];
  /** Optional slot for future blocks (e.g. reviews badge) without layout churn */
  afterContact?: ReactNode;
};

function hasText(s: string): boolean {
  return s.trim().length > 0;
}

export function ProviderDetailsSection({
  city,
  serviceArea,
  contactEmail,
  contactPhone,
  paymentCash,
  paymentEtransfer,
  paymentInPersonCreditDebit,
  etransferDetails,
  paymentDueBeforeAppointment,
  cancellationPolicy,
  extraLinks = [],
  afterContact,
}: Props) {
  const cityOk = hasText(city);
  const areaOk = hasText(serviceArea);
  const hasContact = !!(contactEmail?.trim() || contactPhone?.trim());
  const accepted = [
    paymentCash && "Cash",
    paymentEtransfer && "E-transfer",
    paymentInPersonCreditDebit && "In person credit/debit",
  ].filter(Boolean) as string[];
  const acceptedLine = accepted.length ? accepted.join(", ") : "Ask when you book";
  const etransferOk = paymentEtransfer && hasText(etransferDetails);
  const cancelOk = hasText(cancellationPolicy);
  const hasExtras = extraLinks.length > 0;

  const showLocation = cityOk || areaOk;

  return (
    <section className="mt-12 sm:mt-14" aria-labelledby="details-heading">
      <h2 id="details-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        Details
      </h2>

      <div className="mt-4 grid gap-4 sm:mt-5">
        {showLocation ? (
          <div className="rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Location & coverage</h3>
            <dl className="mt-3 space-y-2 text-sm leading-relaxed sm:text-base">
              {cityOk ? (
                <div>
                  <dt className="font-medium text-[var(--muted)]">Based in</dt>
                  <dd className="mt-0.5 text-[var(--foreground)] break-words">{city.trim()}</dd>
                </div>
              ) : null}
              {areaOk ? (
                <div>
                  <dt className="font-medium text-[var(--muted)]">Service area</dt>
                  <dd className="mt-0.5 text-[var(--foreground)] whitespace-pre-wrap break-words">
                    {serviceArea.trim()}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {hasExtras ? (
          <div className="rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Links</h3>
            <ul className="mt-3 space-y-2">
              {extraLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="ui-link text-sm font-semibold sm:text-base" target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasContact ? (
          <div className="rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm sm:text-base">
              {contactEmail?.trim() ? (
                <li className="break-words">
                  <span className="font-medium text-[var(--muted)]">Email </span>
                  <a className="ui-link break-all font-semibold" href={`mailto:${contactEmail.trim()}`}>
                    {contactEmail.trim()}
                  </a>
                </li>
              ) : null}
              {contactPhone?.trim() ? (
                <li className="break-words">
                  <span className="font-medium text-[var(--muted)]">Phone </span>
                  <a className="ui-link font-semibold" href={`tel:${contactPhone.trim()}`}>
                    {contactPhone.trim()}
                  </a>
                </li>
              ) : null}
            </ul>
            {afterContact}
          </div>
        ) : afterContact ? (
          <div className="contents">{afterContact}</div>
        ) : null}

        <div className="rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Payments</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)] sm:text-base">
            <span className="font-medium text-[var(--muted)]">Accepted: </span>
            {acceptedLine}
          </p>
          {etransferOk ? (
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--foreground)] sm:text-base">
              <span className="font-medium text-[var(--muted)]">E-transfer: </span>
              {etransferDetails.trim()}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            <span className="font-medium text-[var(--foreground)]">Timing: </span>
            {paymentDueBeforeAppointment ? "Due before the appointment" : "Due at the appointment"}
          </p>
          {cancelOk ? (
            <p className="mt-4 border-t border-[color-mix(in_oklab,var(--foreground)_8%,transparent)] pt-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--foreground)] sm:text-base">
              <span className="font-medium text-[var(--muted)]">Cancellation: </span>
              {cancellationPolicy.trim()}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
