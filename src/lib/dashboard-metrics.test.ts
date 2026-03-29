import { describe, it, expect } from "vitest";
import { computeWeeklyAvailableMinutes } from "./dashboard-metrics";

const TZ = "America/New_York";

describe("computeWeeklyAvailableMinutes", () => {
  it("returns 0 for empty or all-inactive rules", () => {
    const now = new Date("2025-01-06T15:00:00.000Z");
    expect(computeWeeklyAvailableMinutes(TZ, [], now)).toBe(0);
    expect(
      computeWeeklyAvailableMinutes(
        TZ,
        [
          {
            dayOfWeek: 1,
            startTimeLocal: "09:00",
            endTimeLocal: "12:00",
            isActive: false,
          },
        ],
        now
      )
    ).toBe(0);
  });

  it("sums one active window for the matching weekday in the current Luxon week", () => {
    const now = new Date("2025-01-06T15:00:00.000Z"); // Monday in NY
    const minutes = computeWeeklyAvailableMinutes(
      TZ,
      [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "12:00",
          isActive: true,
        },
      ],
      now
    );
    expect(minutes).toBe(3 * 60);
  });

  it("sums multiple windows on the same day", () => {
    const now = new Date("2025-01-06T15:00:00.000Z");
    const minutes = computeWeeklyAvailableMinutes(
      TZ,
      [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "10:00",
          isActive: true,
        },
        {
          dayOfWeek: 1,
          startTimeLocal: "14:00",
          endTimeLocal: "15:30",
          isActive: true,
        },
      ],
      now
    );
    expect(minutes).toBe(60 + 90);
  });

  it("skips invalid times and end <= start", () => {
    const now = new Date("2025-01-06T15:00:00.000Z");
    expect(
      computeWeeklyAvailableMinutes(
        TZ,
        [
          {
            dayOfWeek: 1,
            startTimeLocal: "bad",
            endTimeLocal: "12:00",
            isActive: true,
          },
          {
            dayOfWeek: 1,
            startTimeLocal: "12:00",
            endTimeLocal: "09:00",
            isActive: true,
          },
        ],
        now
      )
    ).toBe(0);
  });
});
