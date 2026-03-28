"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg, DateSelectArg, EventClickArg, EventInput, DatesSetArg } from "@fullcalendar/core";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addBlockedTimeInline } from "@/actions/availability";
import { BlockTimeModal } from "./block-time-modal";

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
  const [coarsePointer, setCoarsePointer] = useState(false);
  const tapAnchorRef = useRef<Date | null>(null);
  const [tapHint, setTapHint] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStart, setModalStart] = useState<Date>(new Date());
  const [modalEnd, setModalEnd] = useState<Date>(new Date());
  const [optimisticBlocked, setOptimisticBlocked] = useState<BlockedTime[]>([]);

  const blockedSyncKey = useMemo(() => blocked.map((b) => `${b.id}:${b.startsAtISO}`).join("|"), [blocked]);

  useEffect(() => {
    setOptimisticBlocked([]);
  }, [blockedSyncKey]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarsePointer(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const clearTapAnchor = useCallback(() => {
    tapAnchorRef.current = null;
    setTapHint(false);
  }, []);

  const openBlockModal = useCallback((start: Date, end: Date) => {
    const s = start;
    let e = end;
    if (e <= s) {
      e = new Date(s.getTime() + 60 * 60 * 1000);
    }
    setModalStart(s);
    setModalEnd(e);
    setModalOpen(true);
  }, []);

  const onQuickBlock = useCallback(() => {
    const now = DateTime.now().setZone(timezone);
    const rounded = now.set({
      minute: Math.floor(now.minute / 15) * 15,
      second: 0,
      millisecond: 0,
    });
    const start = rounded.toJSDate();
    const end = rounded.plus({ hours: 1 }).toJSDate();
    openBlockModal(start, end);
  }, [timezone, openBlockModal]);

  const onDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setRange({ start: arg.start, end: arg.end });
      clearTapAnchor();
    },
    [clearTapAnchor]
  );

  const onSelect = useCallback(
    (info: DateSelectArg) => {
      if (coarsePointer) return;
      if (info.view.type !== "timeGridWeek" && info.view.type !== "timeGridDay") {
        info.view.calendar.unselect();
        return;
      }
      openBlockModal(info.start, info.end);
      info.view.calendar.unselect();
    },
    [coarsePointer, openBlockModal]
  );

  const onDateClick = useCallback(
    (arg: DateClickArg) => {
      if (!coarsePointer) return;
      if (arg.view.type !== "timeGridWeek" && arg.view.type !== "timeGridDay") return;
      const d = arg.date;
      if (!tapAnchorRef.current) {
        tapAnchorRef.current = d;
        setTapHint(true);
        return;
      }
      setTapHint(false);
      const a = tapAnchorRef.current;
      tapAnchorRef.current = null;
      let start = a;
      let end = d;
      if (end < start) [start, end] = [end, start];
      if (end.getTime() === start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      openBlockModal(start, end);
    },
    [coarsePointer, openBlockModal]
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

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    clearTapAnchor();
  }, [clearTapAnchor]);

  const confirmBlock = useCallback(
    async (payload: { startsAt: Date; endsAt: Date; reason: string }) => {
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimisticRow: BlockedTime = {
        id: tempId,
        startsAtISO: payload.startsAt.toISOString(),
        endsAtISO: payload.endsAt.toISOString(),
        reason: payload.reason || null,
      };
      setOptimisticBlocked((p) => [...p, optimisticRow]);
      const fd = new FormData();
      fd.set("csrf", csrf);
      fd.set("startsAt", payload.startsAt.toISOString());
      fd.set("endsAt", payload.endsAt.toISOString());
      fd.set("reason", payload.reason);
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
      <div className="availabilityCalendar rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              Calendar
            </div>
            {tapHint ? (
              <p className="mt-1 text-sm font-medium text-[var(--accent)]">Tap the end time to finish.</p>
            ) : (
              <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                {coarsePointer ? "Tap start, then end, to block." : "Drag on the grid to block time."}
              </p>
            )}
          </div>
          <button type="button" className="ui-btn-primary min-h-11 w-full shrink-0 px-5 text-sm font-semibold sm:w-auto" onClick={onQuickBlock}>
            Block off time
          </button>
        </div>
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          height="auto"
          nowIndicator
          selectable={!coarsePointer}
          selectMirror
          longPressDelay={400}
          select={onSelect}
          dateClick={onDateClick}
          eventClick={onEventClick}
          datesSet={onDatesSet}
          timeZone={timezone}
          slotMinTime="05:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          expandRows
          events={events}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit" }}
        />
      </div>

      <aside className="h-fit rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--background)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          Click or drag on the calendar to block time.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
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

      <BlockTimeModal
        open={modalOpen}
        onClose={handleModalClose}
        timezone={timezone}
        initialStart={modalStart}
        initialEnd={modalEnd}
        onConfirm={confirmBlock}
      />
    </div>
  );
}
