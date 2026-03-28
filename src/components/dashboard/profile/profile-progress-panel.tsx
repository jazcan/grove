import Link from "next/link";

type Step = {
  key: string;
  label: string;
  done: boolean;
  href: string;
};

export function ProfileProgressPanel({
  headline,
  subline,
  progressPct,
  steps,
  previewHref,
  previewReady,
}: {
  headline: string;
  subline: string;
  progressPct: number;
  steps: Step[];
  previewHref: string | null;
  previewReady: boolean;
}) {
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;

  return (
    <div className="mt-6 rounded-2xl bg-[var(--card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[var(--foreground)]">{headline}</p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--muted)]">{subline}</p>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]">
              <span>
                {completed} of {total} ready for bookings
              </span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)] ring-1 ring-inset ring-[var(--card-border)]"
              role="progressbar"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={`Booking readiness: ${completed} of ${total} steps`}
            >
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
          {previewReady && previewHref ? (
            <Link href={previewHref} className="ui-btn-secondary inline-flex min-h-11 justify-center px-4 py-2.5 text-sm font-semibold no-underline">
              Preview your profile
            </Link>
          ) : (
            <span className="max-w-xs text-right text-xs leading-relaxed text-[var(--muted)]">
              Preview opens once your profile is published.
            </span>
          )}
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={[
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                s.done
                  ? "bg-[var(--surface-muted)] text-[var(--muted)]"
                  : "bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] text-[var(--foreground)] ring-1 ring-[color-mix(in_oklab,var(--accent)_22%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))]",
              ].join(" ")}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" aria-hidden>
                {s.done ? <span className="text-[var(--success)]">✓</span> : <span className="text-[var(--accent)]">○</span>}
              </span>
              <span className="min-w-0">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        <span className="font-semibold text-[var(--foreground)]">Tip:</span> Display name, category, and city help clients
        choose you—services and availability control what they can book.
      </p>
    </div>
  );
}
