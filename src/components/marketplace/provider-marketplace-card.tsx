import Link from "next/link";

export type MarketplaceProviderRow = {
  username: string;
  displayName: string;
  category: string;
  city: string;
  serviceArea: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "—";
}

function locationLine(p: MarketplaceProviderRow): string {
  const city = p.city?.trim();
  const area = p.serviceArea?.trim();
  if (city && area) return `${city} · ${area}`;
  return city || area || "Location on profile";
}

function blurbLine(p: MarketplaceProviderRow): string {
  const city = p.city?.trim() ?? "";
  const area = p.serviceArea?.trim() ?? "";
  if (city && area) {
    return "View their services and book directly from their profile.";
  }
  if (area.length > 0) {
    return area.length > 130 ? `${area.slice(0, 127)}…` : area;
  }
  return "View their services and book directly from their profile.";
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

export function ProviderMarketplaceCard({ p }: { p: MarketplaceProviderRow }) {
  const loc = locationLine(p);
  const blurb = blurbLine(p);

  return (
    <li className="h-full">
      <Link
        href={`/${p.username}`}
        className="group flex h-full flex-col rounded-2xl bg-[var(--card)] p-5 shadow-[0_8px_30px_-12px_rgba(28,27,25,0.18),0_2px_8px_-4px_rgba(28,27,25,0.08)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-14px_rgba(28,27,25,0.22),0_4px_12px_-4px_rgba(28,27,25,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-6"
      >
        <div className="flex gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-base font-bold tracking-tight text-[var(--accent)] ring-1 ring-[var(--accent-soft-border)]"
            aria-hidden
          >
            {initials(p.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)] sm:text-xl">
              {p.displayName}
            </h2>
            {p.category?.trim() ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{p.category.trim()}</p>
            ) : (
              <p className="mt-1 text-xs font-medium text-[var(--muted)]">Independent provider</p>
            )}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm text-[var(--muted)]">
          <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span className="leading-snug">{loc}</span>
        </p>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,var(--muted))]">
          {blurb}
        </p>

        <span className="ui-btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center text-sm sm:mt-6 sm:w-auto sm:self-start">
          View profile
        </span>
      </Link>
    </li>
  );
}
