import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminEmail } from "./env";

describe("isAdminEmail", () => {
  const prev = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
  });

  it("returns false when unset", () => {
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });

  it("matches comma-separated list case-insensitively", () => {
    process.env.ADMIN_EMAILS = " Admin@X.com , other@y.org ";
    expect(isAdminEmail("admin@x.com")).toBe(true);
    expect(isAdminEmail("OTHER@Y.ORG")).toBe(true);
    expect(isAdminEmail("nope@x.com")).toBe(false);
  });
});
