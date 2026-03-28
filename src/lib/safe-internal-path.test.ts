import { describe, expect, it } from "vitest";
import { isSafeInternalPath } from "./safe-internal-path";

describe("isSafeInternalPath", () => {
  it("allows root-relative paths and queries", () => {
    expect(isSafeInternalPath("/shopify/attach?shop=x&t=y")).toBe(true);
    expect(isSafeInternalPath("/dashboard")).toBe(true);
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath("/\\evil.com")).toBe(false);
  });

  it("rejects userinfo", () => {
    expect(isSafeInternalPath("//user@host")).toBe(false);
    expect(isSafeInternalPath("/path@evil")).toBe(false);
  });
});
