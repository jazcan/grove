import { AttentionSignalCard } from "@/components/dashboard/attention-signal-card";
import type { PresentedProviderSignal } from "@/domain/provider-dashboard-signals.shared";

type Props = {
  signals: PresentedProviderSignal[];
  csrfToken: string;
};

export function AttentionNeededSection({ signals, csrfToken }: Props) {
  if (!signals.length) return null;

  return (
    <section
      id="attention"
      aria-labelledby="attention-heading"
      className="space-y-4 rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--card-border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] p-5 shadow-[var(--shadow-sm)] sm:p-6"
    >
      <div>
        <h2 id="attention-heading" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Attention needed
        </h2>
        <p className="ui-hint mt-2 text-sm leading-relaxed">
          Fix these first—they&apos;re the fastest wins for fewer missed bookings.
        </p>
      </div>

      <ul className="space-y-4">
        {signals.map((s) => (
          <AttentionSignalCard key={s.id} signal={s} csrfToken={csrfToken} />
        ))}
      </ul>
    </section>
  );
}
