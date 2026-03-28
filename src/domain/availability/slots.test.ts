import { describe, it, expect } from "vitest";
import { generateSlots } from "./slots";

/** Monday 2025-01-06 in America/New_York (EST, UTC-5). */
const TZ = "America/New_York";
const MONDAY = "2025-01-06";

function mondayRule() {
  return {
    dayOfWeek: 1,
    startTimeLocal: "09:00",
    endTimeLocal: "12:00",
    isActive: true,
  };
}

describe("generateSlots", () => {
  it("returns empty array for invalid dateISO", () => {
    const slots = generateSlots({
      dateISO: "not-a-date",
      timezone: TZ,
      rules: [mondayRule()],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toEqual([]);
  });

  it("returns empty when no rule matches weekday", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [{ ...mondayRule(), dayOfWeek: 2 }],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toEqual([]);
  });

  it("returns empty for inactive rules", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [{ ...mondayRule(), isActive: false }],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toEqual([]);
  });

  it("generates hourly slots inside the availability window", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [mondayRule()],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toHaveLength(3);
    expect(slots[0].start.toISOString()).toBe("2025-01-06T14:00:00.000Z");
    expect(slots[1].start.toISOString()).toBe("2025-01-06T15:00:00.000Z");
    expect(slots[2].start.toISOString()).toBe("2025-01-06T16:00:00.000Z");
  });

  it("excludes dates before today in provider timezone", () => {
    const slots = generateSlots({
      dateISO: "2025-01-05",
      timezone: TZ,
      rules: [mondayRule()],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toEqual([]);
  });

  it("excludes dates beyond horizon from now", () => {
    const slots = generateSlots({
      dateISO: "2025-02-10",
      timezone: TZ,
      rules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "10:00",
          isActive: true,
        },
      ],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 7,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toEqual([]);
  });

  it("respects lead time: no slot starts before now + lead", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [mondayRule()],
      blocked: [],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 60,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2025-01-06T15:00:00.000Z",
      "2025-01-06T16:00:00.000Z",
    ]);
  });

  it("removes slots overlapping blocked intervals", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [mondayRule()],
      blocked: [
        {
          startsAt: new Date("2025-01-06T15:00:00.000Z"),
          endsAt: new Date("2025-01-06T16:00:00.000Z"),
        },
      ],
      existingBookings: [],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2025-01-06T14:00:00.000Z",
      "2025-01-06T16:00:00.000Z",
    ]);
  });

  it("removes slots overlapping existing bookings including buffer after", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [mondayRule()],
      blocked: [],
      existingBookings: [
        {
          startsAt: new Date("2025-01-06T14:00:00.000Z"),
          endsAt: new Date("2025-01-06T15:00:00.000Z"),
          bufferAfterMinutes: 30,
        },
      ],
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 60,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].start.toISOString()).toBe("2025-01-06T16:00:00.000Z");
  });

  it("uses at least 5 minutes for slot step when configured lower", () => {
    const slots = generateSlots({
      dateISO: MONDAY,
      timezone: TZ,
      rules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "09:30",
          isActive: true,
        },
      ],
      blocked: [],
      existingBookings: [],
      durationMinutes: 15,
      bufferMinutes: 0,
      slotStepMinutes: 1,
      leadTimeMinutes: 0,
      horizonDays: 30,
      now: new Date("2025-01-06T14:00:00.000Z"),
    });
    expect(slots.length).toBeGreaterThan(0);
    const deltas = [];
    for (let i = 1; i < slots.length; i++) {
      deltas.push(
        (slots[i].start.getTime() - slots[i - 1].start.getTime()) / 60_000
      );
    }
    expect(Math.min(...deltas)).toBeGreaterThanOrEqual(5);
  });
});
