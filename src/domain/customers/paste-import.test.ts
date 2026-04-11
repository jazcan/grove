import { describe, expect, it } from "vitest";
import { looksLikePhone, parseContactPaste, parseContactPasteLine } from "./paste-import";

describe("looksLikePhone", () => {
  it("accepts typical local numbers", () => {
    expect(looksLikePhone("555-0100")).toBe(true);
    expect(looksLikePhone("+1 416 555 0100")).toBe(true);
  });

  it("rejects short digit strings", () => {
    expect(looksLikePhone("12345")).toBe(false);
  });
});

describe("parseContactPasteLine", () => {
  it("parses tab-separated name email phone", () => {
    const r = parseContactPasteLine("Jamie Lee\tjamie@example.com\t555-0101", 1);
    expect(r).toEqual({
      lineNumber: 1,
      fullName: "Jamie Lee",
      email: "jamie@example.com",
      phone: "555-0101",
    });
  });

  it("parses comma-separated with quoted name", () => {
    const r = parseContactPasteLine('"Rivera, Sam",sam@example.com,555-0202', 2);
    expect(r).toMatchObject({
      lineNumber: 2,
      fullName: "Rivera, Sam",
      email: "sam@example.com",
      phone: "555-0202",
    });
  });

  it("returns null for blank", () => {
    expect(parseContactPasteLine("   ", 1)).toBeNull();
  });
});

describe("parseContactPaste", () => {
  it("skips empty lines", () => {
    const rows = parseContactPaste("Alex\talex@t.test\n\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fullName).toBe("Alex");
  });
});
