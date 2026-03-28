"use client";

import type { MarketingGenerationOutput } from "@/lib/marketing/types";

type Props = {
  output: MarketingGenerationOutput;
  busy?: boolean;
  onCopyPrimary: () => void;
  onCopyImagePrompt: () => void;
  onRegenerate: () => void;
  onSave: () => void;
  saveLabel?: string;
};

export function MarketingAiOutput({
  output,
  busy,
  onCopyPrimary,
  onCopyImagePrompt,
  onRegenerate,
  onSave,
  saveLabel = "Save",
}: Props) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">Primary</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{output.primary_text}</p>
      </div>

      {output.alternatives.length > 0 ? (
        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">Alternatives</p>
          <ul className="grid gap-2">
            {output.alternatives.map((alt, i) => (
              <li
                key={i}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]"
              >
                {alt}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Suggested CTA</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{output.cta}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Channel</p>
          <p className="mt-1 text-sm font-medium capitalize text-[var(--foreground)]">
            {output.channel.replaceAll("_", " ")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_6%,var(--card))] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">Image prompt</p>
        <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_85%,transparent)]">
          {output.image_prompt}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" className="ui-btn-primary min-h-11 justify-center px-4 text-sm" disabled={busy} onClick={onCopyPrimary}>
          Copy text
        </button>
        <button
          type="button"
          className="ui-btn-secondary min-h-11 justify-center px-4 text-sm"
          disabled={busy}
          onClick={onCopyImagePrompt}
        >
          Copy image prompt
        </button>
        <button type="button" className="ui-btn-secondary min-h-11 justify-center px-4 text-sm" disabled={busy} onClick={onRegenerate}>
          Regenerate
        </button>
        <button type="button" className="ui-btn-secondary min-h-11 justify-center px-4 text-sm" disabled={busy} onClick={onSave}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
