"use client";

import { useEffect, useState } from "react";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { TimeLocalSelect } from "@/components/time-local-select";
import { deleteAvailabilityRule, upsertAvailabilityRule } from "@/actions/availability";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type WeeklyRule = {
  id: string;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export function WeeklyScheduleRow({
  rule,
  csrf,
  compact,
}: {
  rule: WeeklyRule;
  csrf: string;
  /** When true, sits inside a grouped list (no outer card chrome). */
  compact?: boolean;
}) {
  const [active, setActive] = useState(rule.isActive);

  useEffect(() => {
    setActive(rule.isActive);
  }, [rule.id, rule.isActive]);

  const shell = compact
    ? "bg-transparent px-3 py-3 sm:px-4 sm:py-3.5"
    : "rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5";

  return (
    <div className={shell}>
      <form action={asFormAction(upsertAvailabilityRule)} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <CsrfField token={csrf} />
        <input type="hidden" name="id" value={rule.id} />
        <label className="ui-field min-w-[120px] flex-1 text-sm sm:max-w-[140px]">
          <span className="ui-label">Day</span>
          <select name="dayOfWeek" className="ui-input mt-1" defaultValue={rule.dayOfWeek}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field min-w-[140px] flex-1 text-sm sm:max-w-[200px]">
          <span className="ui-label">Start</span>
          <TimeLocalSelect name="startTimeLocal" defaultValue={rule.startTimeLocal} />
        </label>
        <label className="ui-field min-w-[140px] flex-1 text-sm sm:max-w-[200px]">
          <span className="ui-label">End</span>
          <TimeLocalSelect name="endTimeLocal" defaultValue={rule.endTimeLocal} />
        </label>
        <input type="hidden" name="isActive" value={active ? "on" : "off"} />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium sm:pb-0.5">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-[var(--input-border)]" />
          Open
        </label>
        <button type="submit" className="ui-btn-primary min-h-11 w-full px-5 text-sm font-semibold sm:ml-auto sm:w-auto">
          Save
        </button>
      </form>
      <form action={asFormAction(deleteAvailabilityRule)} className={`mt-3 flex justify-end ${compact ? "" : "border-t border-[var(--border)] pt-3"}`}>
        <CsrfField token={csrf} />
        <input type="hidden" name="id" value={rule.id} />
        <button type="submit" className="text-sm font-semibold text-[var(--error)] hover:underline">
          Remove hours
        </button>
      </form>
    </div>
  );
}
