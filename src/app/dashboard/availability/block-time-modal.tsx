"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { getHalfHourTimeOptions, optionForNonStandardTime } from "@/lib/time-options";

type Props = {
  open: boolean;
  onClose: () => void;
  timezone: string;
  initialStart: Date;
  initialEnd: Date;
  onConfirm: (payload: { startsAt: Date; endsAt: Date; reason: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function BlockTimeModal({ open, onClose, timezone, initialStart, initialEnd, onConfirm }: Props) {
  const standardTimes = useMemo(() => getHalfHourTimeOptions(), []);
  const [dateStr, setDateStr] = useState("");
  const [startHm, setStartHm] = useState("09:00");
  const [endHm, setEndHm] = useState("10:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const s = DateTime.fromJSDate(initialStart, { zone: timezone });
    const e = DateTime.fromJSDate(initialEnd, { zone: timezone });
    setDateStr(s.toFormat("yyyy-MM-dd"));
    setStartHm(s.toFormat("HH:mm"));
    setEndHm(e.toFormat("HH:mm"));
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

  const startExtra = useMemo(() => optionForNonStandardTime(startHm, standardTimes), [startHm, standardTimes]);
  const endExtra = useMemo(() => optionForNonStandardTime(endHm, standardTimes), [endHm, standardTimes]);

  const startDt = useMemo(() => {
    if (!dateStr) return null;
    return DateTime.fromFormat(`${dateStr} ${startHm}`, "yyyy-MM-dd HH:mm", { zone: timezone });
  }, [dateStr, startHm, timezone]);

  const endDt = useMemo(() => {
    if (!dateStr) return null;
    return DateTime.fromFormat(`${dateStr} ${endHm}`, "yyyy-MM-dd HH:mm", { zone: timezone });
  }, [dateStr, endHm, timezone]);

  const applyPreset = (kind: "30m" | "1h" | "rest" | "full") => {
    const base = startDt?.isValid ? startDt : DateTime.now().setZone(timezone);
    const day = base.startOf("day");
    if (kind === "30m") {
      setDateStr(base.toFormat("yyyy-MM-dd"));
      setStartHm(base.toFormat("HH:mm"));
      setEndHm(base.plus({ minutes: 30 }).toFormat("HH:mm"));
      return;
    }
    if (kind === "1h") {
      setDateStr(base.toFormat("yyyy-MM-dd"));
      setStartHm(base.toFormat("HH:mm"));
      setEndHm(base.plus({ hours: 1 }).toFormat("HH:mm"));
      return;
    }
    if (kind === "rest") {
      setDateStr(base.toFormat("yyyy-MM-dd"));
      setStartHm(base.toFormat("HH:mm"));
      const last = day.set({ hour: 23, minute: 30, second: 0, millisecond: 0 });
      const end = last > base ? last : base.plus({ hours: 1 });
      setEndHm(end.toFormat("HH:mm"));
      return;
    }
    setDateStr(base.toFormat("yyyy-MM-dd"));
    setStartHm("05:00");
    setEndHm("22:00");
  };

  const submit = async () => {
    setError(null);
    if (!startDt || !endDt || !startDt.isValid || !endDt.isValid) {
      setError("Check the date and times.");
      return;
    }
    if (endDt <= startDt) {
      setError("End time must be after start time.");
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
            Block time
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn-secondary min-h-9 px-3 py-1.5 text-xs font-semibold" onClick={() => applyPreset("30m")}>
              30 min
            </button>
            <button type="button" className="ui-btn-secondary min-h-9 px-3 py-1.5 text-xs font-semibold" onClick={() => applyPreset("1h")}>
              1 hour
            </button>
            <button type="button" className="ui-btn-secondary min-h-9 px-3 py-1.5 text-xs font-semibold" onClick={() => applyPreset("rest")}>
              Rest of day
            </button>
            <button type="button" className="ui-btn-secondary min-h-9 px-3 py-1.5 text-xs font-semibold" onClick={() => applyPreset("full")}>
              Full day
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="ui-field text-sm">
              <span className="ui-label">Date</span>
              <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="ui-input mt-1" />
            </label>
            <label className="ui-field text-sm">
              <span className="ui-label">Start</span>
              <select value={startHm} onChange={(e) => setStartHm(e.target.value)} className="ui-input mt-1">
                {startExtra ? (
                  <option value={startExtra.value}>
                    {startExtra.label}
                  </option>
                ) : null}
                {standardTimes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field text-sm">
              <span className="ui-label">End</span>
              <select value={endHm} onChange={(e) => setEndHm(e.target.value)} className="ui-input mt-1">
                {endExtra ? (
                  <option value={endExtra.value}>
                    {endExtra.label}
                  </option>
                ) : null}
                {standardTimes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field text-sm">
              <span className="ui-label">Note (optional)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Lunch, travel"
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
            {saving ? "Saving…" : "Block"}
          </button>
        </div>
      </div>
    </div>
  );
}
