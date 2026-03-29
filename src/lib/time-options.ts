/** Local wall-clock times for booking UI: 30-minute steps, 24h HH:MM storage. */

const HM = /^(\d{1,2}):(\d{2})$/;

/** Pad to HH:MM for `<select>` value matching. */
export function normalizeTimeLocalForSelect(raw: string): string {
  const p = parseHm(raw);
  if (!p) return raw.trim();
  return `${String(p.h).padStart(2, "0")}:${String(p.m).padStart(2, "0")}`;
}

export function parseHm(hhmm: string): { h: number; m: number } | null {
  const m = HM.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/** Display label like "9:00 AM" (12-hour, no leading zero on hour). */
export function formatTimeLocal12h(hhmm: string): string {
  const p = parseHm(hhmm);
  if (!p) return hhmm.trim();
  const { h, m } = p;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export type TimeOption = { value: string; label: string };

/** Every 30 minutes from 12:00 AM to 11:30 PM. */
export function getHalfHourTimeOptions(): TimeOption[] {
  const out: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (const minute of [0, 30]) {
      const value = `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      out.push({ value, label: formatTimeLocal12h(value) });
    }
  }
  return out;
}

/** If `hhmm` is missing from the standard half-hour list, return an extra option (e.g. :15 or :45). */
export function optionForNonStandardTime(hhmm: string, standard: TimeOption[]): TimeOption | null {
  const t = parseHm(hhmm);
  if (!t) return null;
  const value = `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`;
  if (standard.some((o) => o.value === value)) return null;
  return { value, label: formatTimeLocal12h(value) };
}
