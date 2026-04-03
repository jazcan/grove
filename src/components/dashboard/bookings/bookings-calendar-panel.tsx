"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { bookingStatusCalendarColors } from "@/lib/booking-calendar-colors";

export type BookingsCalendarEvent = {
  id: string;
  startsAtISO: string;
  endsAtISO: string;
  status: Parameters<typeof bookingStatusCalendarColors>[0];
  serviceName: string;
  customerName: string;
};

export function BookingsCalendarPanel({
  timezone,
  events,
  initialDateISO,
}: {
  timezone: string;
  events: BookingsCalendarEvent[];
  /** YYYY-MM-DD — calendar opens near this month */
  initialDateISO: string;
}) {
  const router = useRouter();

  const fcEvents: EventInput[] = useMemo(
    () =>
      events.map((b) => {
        const c = bookingStatusCalendarColors(b.status);
        const title = `${b.serviceName} · ${b.customerName}`;
        return {
          id: b.id,
          title,
          start: b.startsAtISO,
          end: b.endsAtISO,
          backgroundColor: c.bg,
          borderColor: c.border,
          textColor: c.text,
          url: `/dashboard/bookings/${b.id}`,
        };
      }),
    [events]
  );

  const onEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    const id = info.event.id;
    if (id) router.push(`/dashboard/bookings/${id}`);
  };

  return (
    <div className="availabilityCalendar bookings-calendar-panel rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_9%,var(--border))] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Calendar</h2>
          <p className="mt-0.5 text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
            Click a booking to open it. Colors match status (pending, confirmed, etc.).
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[0.65rem] font-medium text-[var(--foreground)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#f59e0b" }} aria-hidden />
            Pending
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#2563eb" }} aria-hidden />
            Confirmed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#16a34a" }} aria-hidden />
            Completed
          </span>
        </div>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        timeZone={timezone}
        initialView="dayGridMonth"
        initialDate={initialDateISO}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        height="auto"
        events={fcEvents}
        eventClick={onEventClick}
        dayMaxEvents={3}
        navLinks
        eventDisplay="block"
      />
    </div>
  );
}
