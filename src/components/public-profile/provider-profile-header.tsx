import Link from "next/link";

type PrimaryCta = {
  href: string;
  label: string;
};

type Props = {
  displayName: string;
  category: string;
  locationLine: string | null;
  heroTeaser: string | null;
  avatarUrl: string | null;
  initials: string;
  primaryCta: PrimaryCta | null;
};

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}

export function ProviderProfileHeader({
  displayName,
  category,
  locationLine,
  heroTeaser,
  avatarUrl,
  initials,
  primaryCta,
}: Props) {
  const categoryTrim = category.trim();
  const photoAlt = `Photo of ${displayName}`;

  return (
    <header className="relative">
      {/* Future: replace gradient with coverImageUrl when multi-image branding ships */}
      <div
        className="absolute inset-x-0 -top-6 bottom-0 -z-10 h-[min(12rem,28vw)] rounded-b-3xl bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface-muted))] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:-top-8 sm:h-[min(13rem,32vw)]"
        aria-hidden
      />

      <div className="relative pt-6 sm:pt-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="shrink-0">
              {avatarUrl ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-[var(--card)] shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-2 ring-[var(--card)] sm:h-28 sm:w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic S3/CDN host; avoids remotePatterns churn */}
                  <img src={avatarUrl} alt={photoAlt} width={112} height={112} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-xl font-bold tracking-tight text-[var(--accent)] shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-2 ring-[var(--card)] ring-offset-2 ring-offset-[var(--background)] sm:h-28 sm:w-28 sm:text-2xl"
                  aria-hidden="true"
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {categoryTrim ? (
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">{categoryTrim}</p>
              ) : null}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-[2.5rem] md:leading-tight">
                {displayName}
              </h1>
              {locationLine ? (
                <p className="mt-3 flex items-start gap-2 text-sm font-medium text-[var(--muted)] sm:text-base">
                  <IconMapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)] opacity-90" aria-hidden />
                  <span className="break-words">{locationLine}</span>
                </p>
              ) : null}
              {heroTeaser ? (
                <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--foreground)] sm:text-lg">{heroTeaser}</p>
              ) : null}
            </div>
          </div>

          {primaryCta ? (
            <div className="shrink-0 lg:pt-1">
              {primaryCta.href.includes("#") ? (
                <a
                  href={primaryCta.href}
                  className="ui-btn-primary inline-flex min-h-12 w-full min-w-[12rem] cursor-pointer touch-manipulation justify-center px-8 py-3.5 text-base sm:w-auto"
                >
                  {primaryCta.label}
                </a>
              ) : (
                <Link
                  href={primaryCta.href}
                  className="ui-btn-primary inline-flex min-h-12 w-full min-w-[12rem] justify-center px-8 py-3.5 text-base sm:w-auto"
                >
                  {primaryCta.label}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
