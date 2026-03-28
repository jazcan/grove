import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "./crypto-token";

describe("crypto-token", () => {
  it("generateToken returns URL-safe base64url-looking string", () => {
    const t = generateToken();
    expect(t.length).toBeGreaterThan(40);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashToken is deterministic sha256 hex", () => {
    expect(hashToken("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("tokens are unique across calls", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});
