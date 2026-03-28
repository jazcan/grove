import Link from "next/link";

export type SetupStep = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
};

export function SetupProgress(props: {
  title?: string;
  subtitle?: string;
  steps: SetupStep[];
  compact?: boolean;
}) {
  const { title = "Finish setting up your business", subtitle, steps, compact } = props;
  const next = steps.find((s) => !s.done) ?? null;
  const allDone = steps.every((s) => s.done);
  const completedCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <section className="ui-card p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {allDone ? "Setup complete" : title}
          </h2>
          <p className="ui-hint mt-2 max-w-prose text-[var(--muted)]">
            {allDone
              ? "You’re ready to accept bookings — keep the momentum going."
              : subtitle ?? "You’re progressing toward something real: your first booking."}
          </p>
          {!allDone ? (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]">
                <span>
                  {completedCount} of {total} completed
                </span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)] ring-1 ring-inset ring-[var(--card-border)]"
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`Setup progress: ${completedCount} of ${total} steps complete`}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        {next && !allDone ? (
          <Link href={next.href} className="ui-btn-primary shrink-0 px-5">
            {next.cta}
          </Link>
        ) : null}
      </div>

      <ul className={compact ? "mt-5 space-y-2" : "mt-6 space-y-3"}>
        {steps.map((s, index) => (
          <li
            key={s.key}
            className={[
              "flex flex-col gap-3 rounded-xl border px-4 py-4 transition-colors sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4",
              s.done
                ? "border-[var(--card-border)] bg-[var(--surface-muted)]"
                : "border-[color-mix(in_oklab,var(--accent)_22%,var(--card-border))] bg-[var(--card)] shadow-[var(--shadow-sm)]",
            ].join(" ")}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className={[
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  s.done
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent-soft-border)]"
                    : "border border-[var(--input-border)] bg-[var(--card)] text-[var(--muted)]",
                ].join(" ")}
                aria-hidden
              >
                {s.done ? "✓" : String(index + 1)}
              </span>
              <div className="min-w-0">
                <div
                  className={[
                    "text-sm font-semibold sm:text-base",
                    s.done ? "text-[var(--muted)]" : "text-[var(--foreground)]",
                  ].join(" ")}
                >
                  {s.label}
                </div>
                {s.done ? (
                  <div className="ui-hint mt-0.5 font-medium text-[var(--success)]">Done</div>
                ) : null}
              </div>
            </div>
            <Link
              href={s.href}
              className={[
                "inline-flex min-h-[2.75rem] w-full shrink-0 items-center justify-center px-4 text-sm font-semibold sm:w-auto",
                s.done ? "ui-btn-secondary" : "ui-btn-primary",
              ].join(" ")}
            >
              {s.done ? "View" : s.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
