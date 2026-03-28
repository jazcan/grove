import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it(
    "hashes and verifies a password round-trip",
    async () => {
      const hash = await hashPassword("correct-horse-battery-staple");
      expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(
        true
      );
      expect(await verifyPassword("wrong", hash)).toBe(false);
    },
    20_000
  );

  it(
    "verifyPassword returns false for malformed hash",
    async () => {
      expect(await verifyPassword("x", "not-a-valid-argon-hash")).toBe(false);
    },
    5_000
  );
});
