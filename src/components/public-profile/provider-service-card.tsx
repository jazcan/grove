export type PublicServiceCardModel = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  pricingType: "fixed" | "hourly";
  priceAmount: string;
  currency: string;
  /** Short outcome labels from the canonical template (Stage 6). */
  outcomeTeasers?: string[];
};

type Props = {
  username: string;
  service: PublicServiceCardModel;
};

function formatPriceLine(s: PublicServiceCardModel): string {
  const price =
    s.pricingType === "hourly" ? `from ${s.priceAmount} ${s.currency}` : `${s.priceAmount} ${s.currency}`;
  return `${s.durationMinutes} min · ${price}`;
}

export function ProviderServiceCard({ username, service }: Props) {
  const href = `/${username}/book/${service.id}`;
  const meta = formatPriceLine(service);
  const desc = service.description.trim();

  return (
    <li>
      {/* Native anchor: reliable full navigation to booking flow (App Router hash-only links can misbehave). */}
      <a
        href={href}
        className="group block cursor-pointer touch-manipulation rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-shadow hover:shadow-[0_20px_50px_-18px_rgba(28,27,25,0.16),0_8px_16px_-8px_rgba(28,27,25,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-6"
        aria-label={`Book ${service.name}, ${meta.replace(" · ", ", ")}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)] sm:text-xl">
            {service.name}
          </h3>
          <p className="shrink-0 text-sm font-semibold text-[var(--muted)] sm:text-right sm:text-base">{meta}</p>
        </div>
        {desc ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-base whitespace-pre-wrap break-words">
            {desc}
          </p>
        ) : null}
        {service.outcomeTeasers && service.outcomeTeasers.length > 0 ? (
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[var(--muted)] sm:text-[0.95rem]">
            {service.outcomeTeasers.slice(0, 3).map((o) => (
              <li key={o} className="leading-snug">
                {o}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[color-mix(in_oklab,var(--foreground)_8%,transparent)] pt-4 sm:mt-6">
          <span className="text-sm font-semibold text-[var(--accent)]">View availability</span>
          <span className="text-[var(--accent)] transition group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </div>
      </a>
    </li>
  );
}
