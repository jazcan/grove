import Link from "next/link";

export type SmartAction = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

type Props = {
  actions: SmartAction[];
};

export function ActionCenter({ actions }: Props) {
  return (
    <section aria-labelledby="next-best-actions-heading" className="ui-card p-5 sm:p-7">
      <div>
        <h2 id="next-best-actions-heading" className="text-lg font-semibold tracking-tight">
          Next steps
        </h2>
        <p className="ui-hint mt-2">
          Pick one—small moves add up, and you can return for the rest.
        </p>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <li
            key={a.id}
            className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--card-border)] bg-[color-mix(in_oklab,var(--surface-muted)_35%,var(--card))] p-4 sm:p-5"
          >
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{a.title}</h3>
              <p className="ui-hint mt-2 text-sm leading-relaxed">{a.body}</p>
            </div>
            <Link href={a.href} className="ui-btn-primary inline-flex min-h-10 w-fit justify-center px-4 py-2 text-sm font-semibold no-underline">
              {a.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
