import Link from "next/link";

export function BundleSuggestionCard() {
  return (
    <section
      className="rounded-2xl border border-[color-mix(in_oklab,var(--accent)_22%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_6%,var(--card))] p-5 sm:p-6"
      aria-labelledby="bundle-heading"
    >
      <h2 id="bundle-heading" className="text-lg font-semibold text-[var(--foreground)]">
        Bundle suggestion
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
        Offer shorter and longer options so more people can book what fits.
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <Link
          href="/dashboard/services?prefill=consultation-30#service-form"
          className="ui-btn-primary inline-flex min-h-11 flex-1 items-center justify-center px-5 text-sm font-semibold sm:min-w-[200px] sm:flex-none"
        >
          Add 30 min version
        </Link>
        <Link
          href="/dashboard/services?prefill=consultation-60#service-form"
          className="ui-btn-secondary inline-flex min-h-11 flex-1 items-center justify-center px-5 text-sm font-semibold sm:min-w-[200px] sm:flex-none"
        >
          Duplicate as 60 min
        </Link>
      </div>
    </section>
  );
}
