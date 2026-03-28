import Link from "next/link";

export type MarketplaceMapMarker = {
  username: string;
  displayName: string;
  topPct: number;
  leftPct: number;
};

type Props = {
  markers: MarketplaceMapMarker[];
};

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

/**
 * Lightweight map-style preview (no tile SDK). Replace with Leaflet/Google when lat/lng exist.
 */
export function MarketplaceMapPreview({ markers }: Props) {
  return (
    <aside
      className="relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--surface-muted)_70%,var(--card))] shadow-[0_12px_40px_-20px_rgba(28,27,25,0.2)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_7%,transparent)] sm:min-h-[320px] lg:min-h-[480px]"
      aria-label="Map view"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--accent) 25%, transparent) 0%, transparent 45%),
            radial-gradient(circle at 70% 60%, color-mix(in oklab, var(--accent) 15%, transparent) 0%, transparent 40%),
            linear-gradient(color-mix(in oklab, var(--foreground) 4%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in oklab, var(--foreground) 4%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 24px 24px, 24px 24px",
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold text-[var(--muted)]">Map view</p>
        <p className="text-xs text-[var(--muted)]">
          {markers.length > 0 ? `${markers.length} pinned` : "Preview"}
        </p>
      </div>

      <div className="relative z-[1] min-h-[220px] flex-1 sm:min-h-[260px]">
        {markers.length === 0 ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center p-6 text-center">
            <p className="max-w-xs text-sm font-medium leading-relaxed text-[var(--muted)]">
              No providers to show on the map yet. Try adjusting your search or check back soon.
            </p>
          </div>
        ) : (
          <>
            {markers.map((m) => (
              <Link
                key={m.username}
                href={`/${m.username}`}
                title={m.displayName}
                className="group absolute z-[2] flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 outline-none transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                style={{ top: `${m.topPct}%`, left: `${m.leftPct}%` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md ring-2 ring-white">
                  <MapPinIcon className="h-5 w-5" />
                </span>
                <span className="max-w-[7rem] truncate rounded-md bg-[var(--card)]/95 px-1.5 py-0.5 text-center text-[0.65rem] font-semibold text-[var(--foreground)] shadow-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:max-w-[9rem] sm:text-xs">
                  {m.displayName}
                </span>
                <span className="sr-only">View {m.displayName}&apos;s profile</span>
              </Link>
            ))}
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 z-[1] px-4 text-center text-[0.65rem] leading-snug text-[var(--muted)] sm:text-xs">
              Preview layout — real map and geocoding can plug in when coordinates are available.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
