"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";

type Props = {
  open: boolean;
  onClose: () => void;
  timezone: string;
  initialStart: Date;
  initialEnd: Date;
  onConfirm: (payload: { startsAt: Date; endsAt: Date; reason: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function toLocalInput(dt: DateTime): string {
  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
}

function fromLocalInput(raw: string, zone: string): DateTime | null {
  const dt = DateTime.fromFormat(raw.trim(), "yyyy-MM-dd'T'HH:mm", { zone });
  return dt.isValid ? dt : null;
}

export function BlockTimeModal({ open, onClose, timezone, initialStart, initialEnd, onConfirm }: Props) {
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const s = DateTime.fromJSDate(initialStart, { zone: timezone });
    const e = DateTime.fromJSDate(initialEnd, { zone: timezone });
    setStartStr(toLocalInput(s));
    setEndStr(toLocalInput(e));
    setReason("");
    setError(null);
    setSaving(false);
  }, [open, initialStart, initialEnd, timezone]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const startDt = useMemo(() => fromLocalInput(startStr, timezone), [startStr, timezone]);
  const endDt = useMemo(() => fromLocalInput(endStr, timezone), [endStr, timezone]);

  const applyPreset = (kind: "30m" | "1h" | "rest" | "full") => {
    const base = startDt ?? DateTime.now().setZone(timezone).startOf("hour");
    if (kind === "30m") {
      setStartStr(toLocalInput(base));
      setEndStr(toLocalInput(base.plus({ minutes: 30 })));
      return;
    }
    if (kind === "1h") {
      setStartStr(toLocalInput(base));
      setEndStr(toLocalInput(base.plus({ hours: 1 })));
      return;
    }
    const day = base.startOf("day");
    if (kind === "rest") {
      setStartStr(toLocalInput(base));
      const endOfCalDay = day.set({ hour: 22, minute: 0 });
      setEndStr(toLocalInput(endOfCalDay > base ? endOfCalDay : base.plus({ hours: 1 })));
      return;
    }
    setStartStr(toLocalInput(day.set({ hour: 5, minute: 0 })));
    setEndStr(toLocalInput(day.set({ hour: 22, minute: 0 })));
  };

  const submit = async () => {
    setError(null);
    if (!startDt || !endDt) {
      setError("Check start and end times.");
      return;
    }
    if (endDt <= startDt) {
      setError("End must be after start.");
      return;
    }
    setSaving(true);
    const r = await onConfirm({
      startsAt: startDt.toJSDate(),
      endsAt: endDt.toJSDate(),
      reason: reason.trim(),
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="block-modal-title">
      <button type="button" className="absolute inset-0 bg-[color-mix(in_oklab,var(--foreground)_35%,transparent)] backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_-12px_40px_-16px_rgba(28,27,25,0.2)] sm:rounded-2xl sm:shadow-xl">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 id="block-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
            Block off time
          </h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            You can adjust times or add a short note.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn-secondary min-h-10 px-3 py-2 text-xs font-semibold sm:text-sm" onClick={() => applyPreset("30m")}>
              30 minutes
            </button>
            <button type="button" className="ui-btn-secondary min-h-10 px-3 py-2 text-xs font-semibold sm:text-sm" onClick={() => applyPreset("1h")}>
              1 hour
            </button>
            <button type="button" className="ui-btn-secondary min-h-10 px-3 py-2 text-xs font-semibold sm:text-sm" onClick={() => applyPreset("rest")}>
              Rest of day
            </button>
            <button type="button" className="ui-btn-secondary min-h-10 px-3 py-2 text-xs font-semibold sm:text-sm" onClick={() => applyPreset("full")}>
              Full day
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="ui-field text-sm">
              <span className="ui-label">Start</span>
              <input type="datetime-local" value={startStr} onChange={(e) => setStartStr(e.target.value)} className="ui-input mt-1" />
            </label>
            <label className="ui-field text-sm">
              <span className="ui-label">End</span>
              <input type="datetime-local" value={endStr} onChange={(e) => setEndStr(e.target.value)} className="ui-input mt-1" />
            </label>
            <label className="ui-field text-sm">
              <span className="ui-label">Reason (optional)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Appointment, travel, break"
                className="ui-input mt-1"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-3 rounded-lg bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)] ring-1 ring-[var(--error-border)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" className="ui-btn-secondary min-h-11 w-full px-4 text-sm font-semibold sm:w-auto" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="ui-btn-primary min-h-11 w-full px-6 text-sm font-semibold sm:w-auto" onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Confirm block"}
          </button>
        </div>
      </div>
    </div>
  );
}
