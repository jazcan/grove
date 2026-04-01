import { describe, expect, it } from "vitest";
import { haversineKm } from "./haversine";

describe("haversineKm", () => {
  it("is ~0 for identical points", () => {
    expect(haversineKm(45.96, -66.64, 45.96, -66.64)).toBeLessThan(0.001);
  });

  it("returns plausible distance for short hop", () => {
    const km = haversineKm(45.9636, -66.6431, 45.97, -66.65);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(5);
  });
});
