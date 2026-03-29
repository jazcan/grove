"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventInput, DatesSetArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addBlockedTimeInline } from "@/actions/availability";

type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

type BlockedTime = {
  id: string;
  startsAtISO: string;
  endsAtISO: string;
  reason: string | null;
};

type BookingEvent = {
  id: string;
  startsAtISO: string;
  endsAtISO: string;
  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show"
    | "rescheduled";
  paymentStatus: "unpaid" | "partially_paid" | "paid" | "waived" | "refunded";
  bufferAfterMinutes: number;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  publicReference: string;
};

type Selected =
  | { kind: "booking"; booking: BookingEvent }
  | { kind: "blocked"; block: BlockedTime }
  | null;

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

const MINUTES_PER_DAY = 24 * 60;

function hmStringToMinutes(s: string): number | null {
  const p = parseHm(s);
  if (!p) return null;
  return p.h * 60 + p.m;
}

function minutesToSlotMinTime(totalMinutes: number): string {
  const c = Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.floor(totalMinutes)));
  const h = Math.floor(c / 60);
  const m = c % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Upper bound for the time axis; allows 24:00:00 when the axis should include midnight. */
function minutesToSlotMaxTime(totalMinutes: number): string {
  if (totalMinutes >= MINUTES_PER_DAY) return "24:00:00";
  const c = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(c / 60);
  const m = c % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Scrollable time range + initial scroll: focused on weekly hours (or 9–5), with padding so users
 * can scroll earlier/later. Union with booking/block local times so nothing is clipped.
 */
function deriveTimeGridBounds(
  rules: AvailabilityRule[],
  bookings: BookingEvent[],
  blocked: BlockedTime[],
  timezone: string
): { slotMinTime: string; slotMaxTime: string; scrollTime: string } {
  const active = rules.filter((r) => r.isActive);
  const DEFAULT_START = 9 * 60;
  const DEFAULT_END = 17 * 60;
  /** Extra hours shown above/below the focus window (scrollable). */
  const FOCUS_PAD_MIN = 90;
  const FOCUS_PAD_MAX = 120;
  /** Margin when merging appointments/blocks into the axis. */
  const EVENT_PAD = 30;

  let focusStartM = DEFAULT_START;
  let focusEndM = DEFAULT_END;

  if (active.length > 0) {
    let earliest = MINUTES_PER_DAY;
    let latest = 0;
    let any = false;
    for (const r of active) {
      const s = hmStringToMinutes(r.startTimeLocal);
      const e = hmStringToMinutes(r.endTimeLocal);
      if (s == null || e == null) continue;
      if (e <= s) continue;
      earliest = Math.min(earliest, s);
      latest = Math.max(latest, e);
      any = true;
    }
    if (any && earliest < latest) {
      focusStartM = earliest;
      focusEndM = latest;
    }
  }

  let slotMinM = focusStartM - FOCUS_PAD_MIN;
  let slotMaxM = focusEndM + FOCUS_PAD_MAX;

  const swallowEventRange = (startIso: string, endIso: string) => {
    const s = DateTime.fromISO(startIso, { zone: "utc" }).setZone(timezone);
    const e = DateTime.fromISO(endIso, { zone: "utc" }).setZone(timezone);
    const sm = s.hour * 60 + s.minute;
    const em = e.hour * 60 + e.minute;
    if (e.toISODate() !== s.toISODate() || em <= sm) {
      slotMinM = Math.min(slotMinM, sm - EVENT_PAD);
      slotMaxM = MINUTES_PER_DAY;
      return;
    }
    slotMinM = Math.min(slotMinM, sm - EVENT_PAD);
    slotMaxM = Math.max(slotMaxM, em + EVENT_PAD);
  };

  for (const b of bookings) swallowEventRange(b.startsAtISO, b.endsAtISO);
  for (const b of blocked) swallowEventRange(b.startsAtISO, b.endsAtISO);

  slotMinM = Math.max(0, slotMinM);
  slotMaxM = Math.min(MINUTES_PER_DAY, slotMaxM);
  if (slotMaxM <= slotMinM) {
    slotMaxM = Math.min(MINUTES_PER_DAY, slotMinM + 8 * 60);
  }

  const desiredScroll = focusStartM - 30;
  const scrollTimeM = Math.max(slotMinM, Math.min(desiredScroll, Math.max(slotMinM, slotMaxM - 45)));

  return {
    slotMinTime: minutesToSlotMinTime(slotMinM),
    slotMaxTime: minutesToSlotMaxTime(slotMaxM),
    scrollTime: minutesToSlotMinTime(scrollTimeM),
  };
}

function bookingColors(status: BookingEvent["status"]): { bg: string; border: string; text: string } {
  switch (status) {
    case "confirmed":
      return { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" };
    case "pending":
      return { bg: "#f59e0b", border: "#d97706", text: "#111827" };
    case "completed":
      return { bg: "#16a34a", border: "#15803d", text: "#ffffff" };
    case "rescheduled":
      return { bg: "#7c3aed", border: "#6d28d9", text: "#ffffff" };
    case "no_show":
      return { bg: "#ef4444", border: "#dc2626", text: "#ffffff" };
    case "cancelled":
      return { bg: "#9ca3af", border: "#6b7280", text: "#111827" };
  }
}

type BlockResult = { ok: true } | { ok: false; error: string };

export function AvailabilityCalendar(props: {
  csrf: string;
  timezone: string;
  rules: AvailabilityRule[];
  blocked: BlockedTime[];
  bookings: BookingEvent[];
}) {
  const { csrf, timezone, rules, blocked, bookings } = props;
  const router = useRouter();
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [optimisticBlocked, setOptimisticBlocked] = useState<BlockedTime[]>([]);
  const [blockError, setBlockError] = useState<string | null>(null);

  const blockedSyncKey = useMemo(() => blocked.map((b) => `${b.id}:${b.startsAtISO}`).join("|"), [blocked]);

  useEffect(() => {
    setOptimisticBlocked([]);
  }, [blockedSyncKey]);

  const timeGridBounds = useMemo(
    () => deriveTimeGridBounds(rules, bookings, blocked, timezone),
    [rules, bookings, blocked, timezone]
  );

  /** Remount when weekly hours or timezone change so slot axis + scroll apply cleanly; not on every booking/block tweak. */
  const calendarLayoutKey = useMemo(
    () =>
      `${timezone}|${rules
        .filter((r) => r.isActive)
        .map((r) => `${r.dayOfWeek}:${r.startTimeLocal}-${r.endTimeLocal}`)
        .sort()
        .join(";")}`,
    [rules, timezone]
  );

  const submitBlockRange = useCallback(
    async (startsAt: Date, endsAt: Date, reason: string): Promise<BlockResult> => {
      const s = startsAt;
      let e = endsAt;
      if (e <= s) {
        e = new Date(s.getTime() + 60 * 60 * 1000);
      }
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimisticRow: BlockedTime = {
        id: tempId,
        startsAtISO: s.toISOString(),
        endsAtISO: e.toISOString(),
        reason: reason || null,
      };
      setOptimisticBlocked((p) => [...p, optimisticRow]);
      const fd = new FormData();
      fd.set("csrf", csrf);
      fd.set("startsAt", s.toISOString());
      fd.set("endsAt", e.toISOString());
      fd.set("reason", reason);
      const r = await addBlockedTimeInline(fd);
      if (!r.ok) {
        setOptimisticBlocked((p) => p.filter((x) => x.id !== tempId));
        return { ok: false as const, error: r.error };
      }
      setOptimisticBlocked((p) => p.filter((x) => x.id !== tempId));
      router.refresh();
      return { ok: true as const };
    },
    [csrf, router]
  );

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    setRange({ start: arg.start, end: arg.end });
    setBlockError(null);
  }, []);

  const onSelect = useCallback(
    (info: DateSelectArg) => {
      if (info.view.type !== "timeGridWeek" && info.view.type !== "timeGridDay") {
        info.view.calendar.unselect();
        return;
      }
      setBlockError(null);
      void (async () => {
        const r = await submitBlockRange(info.start, info.end, "");
        if (!r.ok) setBlockError(r.error);
        info.view.calendar.unselect();
      })();
    },
    [submitBlockRange]
  );

  const onDateClick = useCallback(
    (arg: DateClickArg) => {
      if (arg.view.type !== "timeGridWeek" && arg.view.type !== "timeGridDay") return;
      const start = arg.date;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setBlockError(null);
      void (async () => {
        const r = await submitBlockRange(start, end, "");
        if (!r.ok) setBlockError(r.error);
      })();
    },
    [submitBlockRange]
  );

  const blockedEvents: EventInput[] = useMemo(() => {
    const merged = [...blocked, ...optimisticBlocked];
    return merged.map((b) => {
      const isOpt = b.id.startsWith("optimistic-");
      const base = {
        id: `blocked:${b.id}`,
        start: b.startsAtISO,
        end: b.endsAtISO,
        extendedProps: { kind: "blocked", blockId: b.id },
      };
      if (isOpt) {
        return {
          ...base,
          title: "Blocking…",
          backgroundColor: "rgba(248, 113, 113, 0.55)",
          borderColor: "rgba(185, 28, 28, 0.55)",
          textColor: "#1f2937",
          classNames: ["availability-block-pending"],
        };
      }
      return {
        ...base,
        title: b.reason ? `Blocked: ${b.reason}` : "Blocked",
        display: "background" as const,
        backgroundColor: "rgba(239, 68, 68, 0.35)",
      };
    });
  }, [blocked, optimisticBlocked]);

  const bookingEvents: EventInput[] = useMemo(
    () =>
      bookings.map((b) => {
        const c = bookingColors(b.status);
        const title = `${b.serviceName} • ${b.customerName}`;
        return {
          id: `booking:${b.id}`,
          title,
          start: b.startsAtISO,
          end: b.endsAtISO,
          backgroundColor: c.bg,
          borderColor: c.border,
          textColor: c.text,
          extendedProps: { kind: "booking", bookingId: b.id },
        };
      }),
    [bookings]
  );

  const availabilityEvents: EventInput[] = useMemo(() => {
    if (!range) return [];
    const out: EventInput[] = [];
    const start = DateTime.fromJSDate(range.start, { zone: timezone }).startOf("day");
    const end = DateTime.fromJSDate(range.end, { zone: timezone }).startOf("day");
    const activeRules = rules.filter((r) => r.isActive);

    for (let d = start; d < end; d = d.plus({ days: 1 })) {
      const jsDow = d.weekday === 7 ? 0 : d.weekday;
      for (const r of activeRules) {
        if (r.dayOfWeek !== jsDow) continue;
        const s = parseHm(r.startTimeLocal);
        const e = parseHm(r.endTimeLocal);
        if (!s || !e) continue;

        const startDt = d.set({ hour: s.h, minute: s.m, second: 0, millisecond: 0 });
        const endDt = d.set({ hour: e.h, minute: e.m, second: 0, millisecond: 0 });
        if (endDt <= startDt) continue;

        out.push({
          id: `avail:${r.id}:${d.toISODate()}`,
          start: startDt.toJSDate(),
          end: endDt.toJSDate(),
          display: "background",
          backgroundColor: "rgba(34, 197, 94, 0.18)",
          extendedProps: { kind: "availability" },
        });
      }
    }

    return out;
  }, [range, rules, timezone]);

  const events: EventInput[] = useMemo(
    () => [...availabilityEvents, ...blockedEvents, ...bookingEvents],
    [availabilityEvents, blockedEvents, bookingEvents]
  );

  const byBookingId = useMemo(() => new Map(bookings.map((b) => [b.id, b])), [bookings]);
  const byBlockId = useMemo(() => {
    const m = new Map(blocked.map((b) => [b.id, b]));
    for (const o of optimisticBlocked) m.set(o.id, o);
    return m;
  }, [blocked, optimisticBlocked]);

  const onEventClick = (arg: EventClickArg) => {
    const kind = (arg.event.extendedProps as { kind?: string }).kind;
    if (kind === "booking") {
      const bookingId = (arg.event.extendedProps as { bookingId?: string }).bookingId;
      const b = bookingId ? byBookingId.get(bookingId) : undefined;
      if (b) setSelected({ kind: "booking", booking: b });
      return;
    }
    if (kind === "blocked") {
      const blockId = (arg.event.extendedProps as { blockId?: string }).blockId;
      const b = blockId ? byBlockId.get(blockId) : undefined;
      if (b) setSelected({ kind: "blocked", block: b });
      return;
    }
    setSelected(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
      <div className="availabilityCalendar rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div className="mb-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
            Calendar
          </div>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            Click or drag to block; saves right away. Times shown in 12-hour format.
          </p>
        </div>

        {blockError ? (
          <div
            role="alert"
            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2.5 text-sm text-[var(--error)]"
          >
            <span>{blockError}</span>
            <button type="button" className="shrink-0 font-semibold underline underline-offset-2" onClick={() => setBlockError(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <FullCalendar
          key={calendarLayoutKey}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          contentHeight="clamp(300px, 40dvh, 480px)"
          nowIndicator
          selectable
          selectMirror
          selectMinDistance={6}
          longPressDelay={400}
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          select={onSelect}
          dateClick={onDateClick}
          eventClick={onEventClick}
          datesSet={onDatesSet}
          timeZone={timezone}
          slotMinTime={timeGridBounds.slotMinTime}
          slotMaxTime={timeGridBounds.slotMaxTime}
          scrollTime={timeGridBounds.scrollTime}
          scrollTimeReset
          allDaySlot={false}
          expandRows={false}
          events={events}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit" }}
        />
      </div>

      <aside className="h-fit rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--background)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-sm font-medium text-[var(--foreground)]">Legend</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md px-2 py-1" style={{ background: "rgba(34, 197, 94, 0.18)" }}>
            Available
          </span>
          <span className="rounded-md px-2 py-1" style={{ background: "rgba(239, 68, 68, 0.35)" }}>
            Blocked
          </span>
          <span className="rounded-md px-2 py-1 text-white" style={{ background: bookingColors("confirmed").bg }}>
            Booked
          </span>
        </div>

        <button
          type="button"
          className="ui-btn-secondary mt-6 min-h-11 w-full text-sm font-semibold"
          onClick={() => document.getElementById("weekly-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          Weekly hours
        </button>

        <div className="mt-8 border-t border-[var(--border)] pt-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Details</h3>
          {!selected ? (
            <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">Select a booking or block to see details.</p>
          ) : selected.kind === "booking" ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{selected.booking.serviceName}</div>
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: bookingColors(selected.booking.status).bg,
                    color: bookingColors(selected.booking.status).text,
                  }}
                >
                  {selected.booking.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">When</div>
                <div>
                  {DateTime.fromISO(selected.booking.startsAtISO).setZone(timezone).toLocaleString(DateTime.DATETIME_MED)}{" "}
                  → {DateTime.fromISO(selected.booking.endsAtISO).setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Customer</div>
                <div>{selected.booking.customerName}</div>
                <div className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                  {selected.booking.customerEmail}
                  {selected.booking.customerPhone ? ` • ${selected.booking.customerPhone}` : ""}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Payment</div>
                <div>{selected.booking.paymentStatus.replace("_", " ")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Reference</div>
                <div className="font-mono text-xs">{selected.booking.publicReference}</div>
              </div>
              <button type="button" className="ui-btn-secondary mt-2 w-full text-sm" onClick={() => setSelected(null)}>
                Clear
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="font-medium">Blocked</div>
              <div>
                {DateTime.fromISO(selected.block.startsAtISO).setZone(timezone).toFormat("MMM d · h:mm a")} –{" "}
                {DateTime.fromISO(selected.block.endsAtISO).setZone(timezone).toFormat("h:mm a")}
              </div>
              {selected.block.reason ? (
                <div className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">{selected.block.reason}</div>
              ) : null}
              <button type="button" className="ui-btn-secondary mt-2 w-full text-sm" onClick={() => setSelected(null)}>
                Clear
              </button>
            </div>
          )}
        </div>
      </aside>

    </div>
  );
}
