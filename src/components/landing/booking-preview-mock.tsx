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
        className="pointer-events-none absolute -inset-3 rounded-[1.25rem] border border-[var(--hl-ink-faint)] opacity-70"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1rem_0.85rem_1.05rem_0.92rem] border border-[var(--hl-ink-mid)] bg-[var(--card)] p-5 shadow-[0_3px_14px_rgba(26,26,26,0.06)] sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hl-ink-faint)] pb-4">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Dashboard preview
            </p>
            <p className="mt-1 truncate font-semibold tracking-tight text-[var(--foreground)]" style={{ fontSize: "1.125rem" }}>
              This week
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-[var(--accent-soft-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
            3 booked
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          <li className="flex gap-3 rounded-[0.75rem] border border-[var(--hl-ink-faint)] bg-[var(--surface-muted)] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--hl-ink-faint)] bg-[var(--card)] text-xs font-bold text-[var(--accent)]">
              Wed
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--foreground)]">10:00 AM</p>
              <p className="text-sm text-[var(--muted)]">Deep tissue · 60 min</p>
            </div>
            <span className="self-center text-[0.65rem] font-bold uppercase tracking-wide text-[var(--hl-accent)]">
              Confirmed
            </span>
          </li>
          <li className="flex gap-3 rounded-[0.75rem] border border-[var(--hl-ink-faint)] bg-[var(--surface-muted)] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--hl-ink-faint)] bg-[var(--card)] text-xs font-bold text-[var(--accent)]">
              Thu
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--foreground)]">2:30 PM</p>
              <p className="text-sm text-[var(--muted)]">Intro call · 30 min</p>
            </div>
            <span className="self-center text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted)]">Pending</span>
          </li>
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[0.75rem] border border-[color-mix(in_oklab,var(--hl-accent)_28%,var(--hl-ink-faint))] bg-[color-mix(in_oklab,var(--hl-accent)_7%,var(--card))] px-3 py-2.5 sm:py-3">
          <div className="min-w-0 pr-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Marketing</p>
            <p className="mt-0.5 text-xs font-semibold leading-tight text-[var(--foreground)]">Fill 3 open spots</p>
            <p className="mt-1 text-[0.7rem] leading-snug text-[var(--muted)]">
              Send a last-minute email to past clients.
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-[var(--hl-ink-mid)] bg-[var(--foreground)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--card)]">
            Send
          </span>
        </div>
      </div>
    </div>
  );
}
