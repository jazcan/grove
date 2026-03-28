import { describe, it, expect } from "vitest";
import { isReservedUsername, isValidUsername } from "./reserved-usernames";

describe("isReservedUsername", () => {
  it("matches reserved slugs case-insensitively", () => {
    expect(isReservedUsername("admin")).toBe(true);
    expect(isReservedUsername("ADMIN")).toBe(true);
    expect(isReservedUsername("marketplace")).toBe(true);
  });

  it("returns false for normal names", () => {
    expect(isReservedUsername("jane-doe")).toBe(false);
  });
});

describe("isValidUsername", () => {
  it("rejects too short or too long", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(65))).toBe(false);
  });

  it("rejects reserved names", () => {
    expect(isValidUsername("login")).toBe(false);
  });

  it("accepts 3-letter alphanumeric", () => {
    expect(isValidUsername("abc")).toBe(true);
    expect(isValidUsername("a12")).toBe(true);
  });

  it("accepts hyphenated slugs with letter boundaries", () => {
    expect(isValidUsername("jane-doe")).toBe(true);
  });

  it("rejects invalid patterns", () => {
    expect(isValidUsername("-start")).toBe(false);
    expect(isValidUsername("end-")).toBe(false);
    expect(isValidUsername("bad_underscore")).toBe(false);
    expect(isValidUsername("UPPER")).toBe(false);
  });
});
