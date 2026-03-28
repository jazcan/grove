/**
 * Decorative product preview for the marketing hero (no stock imagery).
 * Entire block is aria-hidden — informational content lives in the hero copy.
 */
export function BookingPreviewMock() {
  return (
    <div
      className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] opacity-90 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 top-1/2 hidden h-48 w-48 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--accent)_18%,var(--card))] opacity-40 blur-3xl lg:block"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-2xl bg-[var(--card)] p-5 shadow-[0_20px_50px_-12px_rgba(28,27,25,0.18),0_8px_16px_-8px_rgba(28,27,25,0.08)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_oklab,var(--foreground)_8%,transparent)] pb-4">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Dashboard preview
            </p>
            <p className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--foreground)]">
              This week
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent-soft-border)]">
            3 booked
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          <li className="flex gap-3 rounded-xl bg-[var(--surface-muted)] p-3 ring-1 ring-[color-mix(in_oklab,var(--foreground)_5%,transparent)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-xs font-bold text-[var(--accent)] shadow-sm">
              Wed
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--foreground)]">10:00 AM</p>
              <p className="text-sm text-[var(--muted)]">Deep tissue · 60 min</p>
            </div>
            <span className="self-center rounded-md bg-[var(--success-bg)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--success)]">
              Confirmed
            </span>
          </li>
          <li className="flex gap-3 rounded-xl bg-[var(--surface-muted)] p-3 ring-1 ring-[color-mix(in_oklab,var(--foreground)_5%,transparent)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-xs font-bold text-[var(--accent)] shadow-sm">
              Thu
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--foreground)]">2:30 PM</p>
              <p className="text-sm text-[var(--muted)]">Intro call · 30 min</p>
            </div>
            <span className="self-center rounded-md bg-[color-mix(in_oklab,var(--muted)_12%,var(--card))] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted)]">
              Pending
            </span>
          </li>
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-3 py-2.5 ring-1 ring-[color-mix(in_oklab,var(--accent)_22%,transparent)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--foreground)]">Your booking experience</p>
            <p className="truncate text-[0.7rem] leading-snug text-[var(--muted)]">
              Works with your services and availability
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-[var(--accent)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--accent-foreground)]">
            Copy
          </span>
        </div>
      </div>
    </div>
  );
}
