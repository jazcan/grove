import Link from "next/link";

export type DashboardNextStep = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  href: string;
  cta: string;
};

export function DashboardNextSteps({ steps }: { steps: DashboardNextStep[] }) {
  const next = steps.find((s) => !s.done) ?? null;

  return (
    <section className="ui-card p-5 sm:p-7" aria-labelledby="next-steps-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 id="next-steps-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Next steps
          </h2>
          <p className="ui-hint mt-2 max-w-prose leading-relaxed">
            Most providers get their first booking by sharing their profile with a few clients.
          </p>
        </div>
        {next ? (
          <Link href={next.href} className="ui-btn-primary shrink-0 px-5 py-2.5 text-sm no-underline sm:py-3">
            {next.cta}
          </Link>
        ) : null}
      </div>

      <ol className="mt-6 space-y-3 sm:mt-7">
        {steps.map((s, index) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={[
                "flex min-h-[3.25rem] flex-col gap-2 rounded-xl px-4 py-4 transition-colors sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4",
                s.done
                  ? "bg-[var(--surface-muted)] ring-1 ring-[var(--card-border)]"
                  : "bg-[var(--card)] shadow-[var(--shadow-sm)] ring-1 ring-[color-mix(in_oklab,var(--accent)_20%,var(--card-border))] hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={[
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    s.done
                      ? "bg-[var(--success-bg)] text-[var(--success)] ring-1 ring-[var(--success-border)]"
                      : "border border-[var(--input-border)] bg-[var(--card)] text-[var(--muted)]",
                  ].join(" ")}
                  aria-hidden
                >
                  {s.done ? "✓" : index + 1}
                </span>
                <div className="min-w-0">
                  <span
                    className={[
                      "block text-sm font-semibold sm:text-base",
                      s.done ? "text-[var(--muted)]" : "text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    {s.label}
                  </span>
                  {s.done ? (
                    <span className="mt-0.5 block text-xs font-semibold text-[var(--success)]">Completed</span>
                  ) : null}
                  {!s.done ? <span className="ui-hint mt-1 block leading-relaxed">{s.hint}</span> : null}
                </div>
              </div>
              <span
                className={[
                  "inline-flex min-h-11 shrink-0 items-center justify-center text-sm font-semibold sm:min-h-0 sm:px-2",
                  s.done ? "text-[var(--accent)]" : "text-[var(--accent)] underline-offset-2 hover:underline",
                ].join(" ")}
              >
                {s.done ? "Review" : "Open"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
