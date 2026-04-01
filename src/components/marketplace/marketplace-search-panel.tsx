type Props = {
  defaultQ?: string;
  /** Postal/ZIP, city, or free-text location */
  defaultLocation?: string;
  defaultCategory?: string;
  defaultRadiusKm?: string;
  /** CA | US — narrows geocoding */
  defaultCountry?: string;
};

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

const RADIUS_OPTIONS = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
] as const;

export function MarketplaceSearchPanel({
  defaultQ = "",
  defaultLocation = "",
  defaultCategory = "",
  defaultRadiusKm = "25",
  defaultCountry = "CA",
}: Props) {
  const radiusValue = RADIUS_OPTIONS.some((o) => o.value === defaultRadiusKm) ? defaultRadiusKm : "25";

  return (
    <section
      className="rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-20px_rgba(28,27,25,0.15),0_4px_14px_-6px_rgba(28,27,25,0.08)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_5%,transparent)] sm:p-6 lg:p-7"
      aria-label="Search your community"
    >
      <div className="mb-5 sm:mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Search your community</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick a service, where you are, and how far to look—results are sorted by distance when you add a location.
        </p>
      </div>

      <form method="get" className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">
          <label className="ui-field min-w-0 flex-1">
            <span className="ui-label">Service</span>
            <div className="relative mt-1">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] opacity-80" />
              <input
                name="q"
                defaultValue={defaultQ}
                placeholder="e.g. cleaning, dog walking, tutoring"
                className="ui-input min-h-12 pl-11 text-base"
                autoComplete="off"
              />
            </div>
          </label>
          <button
            type="submit"
            className="ui-btn-primary min-h-12 w-full shrink-0 px-8 text-base font-semibold shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--accent)_45%,transparent)] lg:min-w-[10.5rem]"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          <label className="ui-field">
            <span className="ui-label">Location</span>
            <div className="relative mt-1">
              <IconMapPin className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] opacity-80" />
              <input
                name="location"
                defaultValue={defaultLocation}
                placeholder="Postal code, ZIP, or city"
                className="ui-input min-h-12 pl-11"
                autoComplete="postal-code"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">We use this to center the map and filter by distance.</p>
          </label>
          <label className="ui-field">
            <span className="ui-label">Country</span>
            <select
              name="country"
              className="ui-input mt-1 min-h-12"
              defaultValue={defaultCountry === "US" ? "US" : "CA"}
            >
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-label">Radius</span>
            <select name="radiusKm" className="ui-input mt-1 min-h-12" defaultValue={radiusValue}>
              {RADIUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--muted)]">Distances are in kilometers.</p>
          </label>
          <label className="ui-field">
            <span className="ui-label">Category</span>
            <div className="relative mt-1">
              <IconTag className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] opacity-80" />
              <input
                name="category"
                defaultValue={defaultCategory}
                placeholder="e.g. cleaning, wellness, tutoring"
                className="ui-input min-h-12 pl-11"
                autoComplete="off"
              />
            </div>
          </label>
        </div>
      </form>
    </section>
  );
}
