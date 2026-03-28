type Props = {
  username: string;
  serviceCount: number;
  /** Required when serviceCount === 1 */
  singleServiceId?: string;
};

export function ProviderBottomCta({ username, serviceCount, singleServiceId }: Props) {
  if (serviceCount <= 0) return null;

  const single = serviceCount === 1;
  if (single && !singleServiceId) return null;

  const href = single ? `/${username}/book/${singleServiceId}` : `/${username}#services`;
  const label = single ? "Book a session" : "View services";

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="bottom-cta-heading">
      <div className="rounded-2xl bg-[color-mix(in_oklab,var(--accent)_9%,var(--card))] px-6 py-10 text-center shadow-[0_12px_40px_-18px_rgba(28,27,25,0.12),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--accent)_22%,transparent)] sm:px-10 sm:py-12">
        <h2 id="bottom-cta-heading" className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Ready to book?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          {single
            ? "Pick a time that works for you—availability is shown on the next step."
            : "Choose a service above to see open times and complete your booking."}
        </p>
        <a
          href={href}
          className="ui-btn-primary mt-6 inline-flex min-h-12 cursor-pointer touch-manipulation justify-center px-10 py-3.5 text-base"
        >
          {label}
        </a>
      </div>
    </section>
  );
}
