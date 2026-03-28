import { DateTime } from "luxon";

export type Slot = { start: Date; end: Date };

type Rule = {
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

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** @param now - current instant for lead time / horizon checks */
export function generateSlots(input: {
  dateISO: string;
  timezone: string;
  rules: Rule[];
  blocked: { startsAt: Date; endsAt: Date }[];
  /** Service end time plus buffer minutes (scheduling block). */
  existingBookings: { startsAt: Date; endsAt: Date; bufferAfterMinutes: number }[];
  durationMinutes: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  leadTimeMinutes: number;
  horizonDays: number;
  now: Date;
}): Slot[] {
  const {
    dateISO,
    timezone,
    rules,
    blocked,
    existingBookings,
    durationMinutes,
    bufferMinutes,
    slotStepMinutes,
    leadTimeMinutes,
    horizonDays,
    now,
  } = input;

  const day = DateTime.fromISO(dateISO, { zone: timezone });
  if (!day.isValid) return [];

  const jsDow = luxonToJsWeekday(day);
  const activeRules = rules.filter((r) => r.isActive && r.dayOfWeek === jsDow);
  if (!activeRules.length) return [];

  const nowZ = DateTime.fromJSDate(now, { zone: "utc" }).setZone(timezone);
  const horizonEnd = nowZ.plus({ days: horizonDays });
  if (day > horizonEnd.startOf("day")) return [];
  if (day < nowZ.startOf("day")) return [];

  const leadCutoff = nowZ.plus({ minutes: leadTimeMinutes });

  const step = Math.max(5, slotStepMinutes);
  const blockSpan = durationMinutes + bufferMinutes;
  const slots: Slot[] = [];

  for (const rule of activeRules) {
    const startP = parseHm(rule.startTimeLocal);
    const endP = parseHm(rule.endTimeLocal);
    if (!startP || !endP) continue;

    let cursor = day.set({
      hour: startP.h,
      minute: startP.m,
      second: 0,
      millisecond: 0,
    });
    const windowEnd = day.set({
      hour: endP.h,
      minute: endP.m,
      second: 0,
      millisecond: 0,
    });
    if (cursor >= windowEnd) continue;

    while (cursor.plus({ minutes: blockSpan }) <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = cursor.plus({ minutes: durationMinutes });

      const startUtc = slotStart.toUTC();
      const endUtc = slotEnd.toUTC();
      if (slotStart < leadCutoff) {
        cursor = cursor.plus({ minutes: step });
        continue;
      }

      const s = startUtc.toJSDate();
      const e = endUtc.toJSDate();

      const overlapsBlocked = blocked.some((b) =>
        rangesOverlap(s.getTime(), e.getTime(), b.startsAt.getTime(), b.endsAt.getTime())
      );
      const taken = existingBookings.some((b) => {
        const blockEnd = b.endsAt.getTime() + b.bufferAfterMinutes * 60_000;
        return rangesOverlap(s.getTime(), e.getTime(), b.startsAt.getTime(), blockEnd);
      });

      if (!overlapsBlocked && !taken) {
        slots.push({ start: s, end: e });
      }

      cursor = cursor.plus({ minutes: step });
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}
