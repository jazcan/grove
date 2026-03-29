import { DateTime } from "luxon";

export type AvailabilityRuleSlice = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function luxonToJsWeekday(dt: DateTime): number {
  return dt.weekday === 7 ? 0 : dt.weekday;
}

/** Total open minutes from recurring weekly rules across the current calendar week (Luxon `week`). */
export function computeWeeklyAvailableMinutes(
  timezone: string,
  rules: AvailabilityRuleSlice[],
  now: Date = new Date()
): number {
  const z = DateTime.fromJSDate(now, { zone: "utc" }).setZone(timezone);
  const wkStart = z.startOf("week");
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const day = wkStart.plus({ days: i });
    const jsDow = luxonToJsWeekday(day);
    const dayRules = rules.filter((r) => r.isActive && r.dayOfWeek === jsDow);
    for (const r of dayRules) {
      const startP = parseHm(r.startTimeLocal);
      const endP = parseHm(r.endTimeLocal);
      if (!startP || !endP) continue;
      const startMin = startP.h * 60 + startP.m;
      const endMin = endP.h * 60 + endP.m;
      if (endMin <= startMin) continue;
      total += endMin - startMin;
    }
  }
  return total;
}
