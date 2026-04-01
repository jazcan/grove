import { DateTime } from "luxon";

export type ReconnectStatsInput = {
  lastBookingAt: string | null;
  bookingCount: number;
  lastMarketingSentAt: string | null;
};

/** Higher = more important to reach out first. */
export function scoreReconnectCustomer(input: ReconnectStatsInput, nowMs: number = Date.now()): number {
  let score = 0;
  const { lastBookingAt, bookingCount, lastMarketingSentAt } = input;

  if (bookingCount === 0) score += 100;
  else if (bookingCount === 1) score += 55;
  else if (bookingCount === 2) score += 28;
  else score += 12;

  if (lastBookingAt) {
    const days = (nowMs - new Date(lastBookingAt).getTime()) / 86_400_000;
    if (days > 120) score += 45;
    else if (days > 90) score += 38;
    else if (days > 60) score += 30;
    else if (days > 30) score += 22;
    else if (days > 14) score += 12;
    else if (days > 7) score += 4;
  }

  if (lastMarketingSentAt) {
    const daysSince = (nowMs - new Date(lastMarketingSentAt).getTime()) / 86_400_000;
    if (daysSince > 90) score += 35;
    else if (daysSince > 60) score += 22;
    else if (daysSince > 30) score += 12;
    else if (daysSince > 14) score += 4;
    else score -= 8;
  } else {
    score += 18;
  }

  return score;
}

function relativeVisitLabel(iso: string | null, timezone: string): string | null {
  if (!iso) return null;
  try {
    const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
    const now = DateTime.now().setZone(timezone);
    const days = Math.floor(now.diff(dt, "days").days);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 14) return "about a week ago";
    if (days < 30) return `${Math.round(days / 7)} weeks ago`;
    if (days < 60) return "over a month ago";
    return `${Math.round(days / 30)} months ago`;
  } catch {
    return null;
  }
}

/** Short, human-readable line for reconnect rows (no schema changes). */
export function buildReconnectContextLine(input: ReconnectStatsInput, timezone: string): string {
  const { lastBookingAt, bookingCount } = input;
  const rel = relativeVisitLabel(lastBookingAt, timezone);

  if (bookingCount === 0) {
    return "New — hasn’t booked yet";
  }

  if (bookingCount === 1) {
    if (!lastBookingAt) return "1 visit";
    const days = lastBookingAt
      ? Math.floor(
          (Date.now() - new Date(lastBookingAt).getTime()) / 86_400_000
        )
      : 999;
    if (days > 45) return "1 visit · hasn’t been back in a while";
    if (rel) return `1 visit · last visit ${rel}`;
    return "1 visit";
  }

  const visits = `${bookingCount} visits`;
  if (!lastBookingAt) return visits;

  const days = Math.floor((Date.now() - new Date(lastBookingAt).getTime()) / 86_400_000);
  if (days <= 10 && bookingCount >= 2) {
    return "Regular · visited recently";
  }
  if (days >= 21 && bookingCount >= 3) {
    return rel ? `${visits} · last visit ${rel}` : `${visits} · due for a check-in`;
  }
  if (rel) return `${visits} · last visit ${rel}`;
  return visits;
}
