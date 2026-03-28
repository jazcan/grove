import { describe, it, expect } from "vitest";
import { normalizeEmail, normalizePhone } from "./normalize";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("normalizePhone", () => {
  it("returns null for empty input", () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("strips non-digits", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("15551234567");
  });

  it("returns null when no digits remain", () => {
    expect(normalizePhone("abc")).toBeNull();
  });
});
