type Props = {
  defaultQ?: string;
  defaultCity?: string;
  defaultCategory?: string;
};

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M18 21V6.75A2.25 2.25 0 0015.75 4.5h-7.5A2.25 2.25 0 006 6.75V21M9 9h.008v.008H9V9zm0 3h.008v.008H9V12zm0 3h.008v.008H9V15zm0 3h.008v.008H9V18zm3-9h.008v.008H12V9zm0 3h.008v.008H12V12zm0 3h.008v.008H12V15zm0 3h.008v.008H12V18zm3-9h.008v.008H15V9zm0 3h.008v.008H15V12zm0 3h.008v.008H15V15zm0 3h.008v.008H15V18z" />
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

export function MarketplaceSearchPanel({ defaultQ = "", defaultCity = "", defaultCategory = "" }: Props) {
  return (
    <section
      className="rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-20px_rgba(28,27,25,0.15),0_4px_14px_-6px_rgba(28,27,25,0.08)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_5%,transparent)] sm:p-6 lg:p-7"
      aria-label="Search for a provider"
    >
      <div className="mb-5 sm:mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Search for a provider</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search by service, city, or category to find the right provider.
        </p>
      </div>

      <form method="get" className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">
          <label className="ui-field min-w-0 flex-1">
            <span className="ui-label">Keyword</span>
            <div className="relative mt-1">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] opacity-80" />
              <input
                name="q"
                defaultValue={defaultQ}
                placeholder="Search services or providers"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <label className="ui-field">
            <span className="ui-label">City</span>
            <div className="relative mt-1">
              <IconBuilding className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] opacity-80" />
              <input
                name="city"
                defaultValue={defaultCity}
                placeholder="City or neighborhood"
                className="ui-input min-h-12 pl-11"
                autoComplete="address-level2"
              />
            </div>
          </label>
          <label className="ui-field">
            <span className="ui-label">Category</span>
            <div className="relative mt-1">
              <IconTag className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] opacity-80" />
              <input
                name="category"
                defaultValue={defaultCategory}
                placeholder="e.g. wellness, tutoring, home"
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
