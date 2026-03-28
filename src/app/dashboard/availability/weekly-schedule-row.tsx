"use client";

import { useEffect, useState } from "react";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { deleteAvailabilityRule, upsertAvailabilityRule } from "@/actions/availability";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type WeeklyRule = {
  id: string;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export function WeeklyScheduleRow({ rule, csrf }: { rule: WeeklyRule; csrf: string }) {
  const [active, setActive] = useState(rule.isActive);

  useEffect(() => {
    setActive(rule.isActive);
  }, [rule.id, rule.isActive]);

  return (
    <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <form action={asFormAction(upsertAvailabilityRule)} className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <CsrfField token={csrf} />
        <input type="hidden" name="id" value={rule.id} />
        <label className="ui-field min-w-[140px] flex-1 text-sm lg:max-w-[160px]">
          <span className="ui-label">Day</span>
          <select name="dayOfWeek" className="ui-input mt-1" defaultValue={rule.dayOfWeek}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field min-w-[120px] flex-1 text-sm lg:max-w-[140px]">
          <span className="ui-label">Start</span>
          <input name="startTimeLocal" className="ui-input mt-1" defaultValue={rule.startTimeLocal} />
        </label>
        <label className="ui-field min-w-[120px] flex-1 text-sm lg:max-w-[140px]">
          <span className="ui-label">End</span>
          <input name="endTimeLocal" className="ui-input mt-1" defaultValue={rule.endTimeLocal} />
        </label>
        <input type="hidden" name="isActive" value={active ? "on" : "off"} />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium lg:pb-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-[var(--input-border)]" />
          Open for bookings
        </label>
        <button type="submit" className="ui-btn-primary min-h-11 w-full px-6 text-sm font-semibold lg:w-auto">
          Save
        </button>
      </form>
      <form action={asFormAction(deleteAvailabilityRule)} className="mt-4 flex justify-end border-t border-[var(--border)] pt-4">
        <CsrfField token={csrf} />
        <input type="hidden" name="id" value={rule.id} />
        <button type="submit" className="text-sm font-semibold text-[var(--error)] hover:underline">
          Remove hours
        </button>
      </form>
    </div>
  );
}
