"use client";

import { useState, useTransition } from "react";
import { matchPublicServicesByIntent } from "@/actions/public-booking";

type Props = {
  username: string;
  services: { id: string; name: string; durationMinutes: number }[];
};

export function IntentPlanner({ username, services }: Props) {
  const [intent, setIntent] = useState("");
  const [matches, setMatches] = useState<{ serviceId: string; name: string; score: number }[] | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (services.length === 0) return null;

  function runMatch() {
    setError("");
    startTransition(() => {
      matchPublicServicesByIntent({ username, intent }).then((res) => {
        if (res.error) {
          setError(res.error);
          setMatches(null);
          return;
        }
        setMatches(res.matches);
      });
    });
  }

  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="intent-heading">
      <h2 id="intent-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        Start with what you need
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        Describe your goal in a sentence or two. We’ll suggest sessions that fit — then you pick a time.
      </p>

      <div className="mt-5 rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-6">
        <label htmlFor="intent-input" className="ui-label">
          What are you looking for?
        </label>
        <textarea
          id="intent-input"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. deep tissue for shoulder tension, or a quick consultation before committing"
          className="ui-textarea mt-2 min-h-[5.5rem]"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="ui-btn-primary" disabled={pending || !intent.trim()} onClick={runMatch}>
            {pending ? "Finding…" : "Suggest sessions"}
          </button>
          {matches && matches.length > 0 ? (
            <span className="text-sm text-[var(--muted)]">
              {matches.some((m) => m.score > 0)
                ? "Best matches first — open a session to see price and book."
                : "Showing all sessions — try a few keywords for tighter matches."}
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="ui-inline-validation mt-3" role="alert">
            {error}
          </p>
        ) : null}

        {matches && matches.length > 0 ? (
          <ul className="mt-6 space-y-3" role="list">
            {matches.map((m, i) => {
              const meta = services.find((s) => s.id === m.serviceId);
              return (
                <li key={m.serviceId}>
                  <a
                    href={`/${username}/book/${m.serviceId}`}
                    className="flex flex-col gap-1 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_10%,transparent)] bg-[var(--background)] px-4 py-3 transition hover:border-[var(--accent)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-semibold text-[var(--foreground)]">
                      <span className="mr-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        {i + 1}.
                      </span>
                      {m.name}
                    </span>
                    {meta ? (
                      <span className="text-sm text-[var(--muted)]">{meta.durationMinutes} min · Book</span>
                    ) : (
                      <span className="text-sm font-medium text-[var(--accent)]">Book →</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
