"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onBlockNextHour: () => void;
  onBlockToday: () => void;
  onCustom: () => void;
};

export function QuickBlockModal({ open, onClose, busy, onBlockNextHour, onBlockToday, onCustom }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="quick-block-title">
      <button type="button" className="absolute inset-0 bg-[color-mix(in_oklab,var(--foreground)_35%,transparent)] backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative z-[1] w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_-12px_40px_-16px_rgba(28,27,25,0.2)] sm:rounded-2xl sm:shadow-xl">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 id="quick-block-title" className="text-lg font-semibold text-[var(--foreground)]">
            Quick block
          </h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            One tap for common cases. Your calendar updates right away.
          </p>
        </div>
        <div className="flex flex-col gap-2 px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={busy}
            className="ui-btn-primary min-h-12 w-full text-left text-sm font-semibold"
            onClick={() => onBlockNextHour()}
          >
            <span className="block">Block next 1 hour</span>
            <span className="mt-0.5 block text-xs font-normal opacity-90">From now, rounded to the nearest quarter hour</span>
          </button>
          <button
            type="button"
            disabled={busy}
            className="ui-btn-secondary min-h-12 w-full text-left text-sm font-semibold"
            onClick={() => onBlockToday()}
          >
            <span className="block">Block rest of today</span>
            <span className="mt-0.5 block text-xs font-normal text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              Until midnight in your timezone
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            className="ui-btn-secondary min-h-12 w-full text-left text-sm font-semibold"
            onClick={() => onCustom()}
          >
            Custom…
            <span className="mt-0.5 block text-xs font-normal text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              Pick exact start and end
            </span>
          </button>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-3 sm:px-6">
          <button type="button" className="w-full py-2 text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] hover:underline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
