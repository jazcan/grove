import { describe, expect, it } from "vitest";
import { parseCsvWithHeaders } from "@/lib/csv-parse";

describe("parseCsvWithHeaders", () => {
  it("parses simple comma-separated headers and rows", () => {
    const r = parseCsvWithHeaders("Name,Email\nJane Doe,jane@example.com\n");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.headers).toEqual(["Name", "Email"]);
    expect(r.rows).toEqual([["Jane Doe", "jane@example.com"]]);
  });

  it("handles quoted commas", () => {
    const r = parseCsvWithHeaders('"Last, First",email@test.com\n');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.headers[0]).toBe("Last, First");
    expect(r.headers[1]).toBe("email@test.com");
  });

  it("skips fully empty rows", () => {
    const r = parseCsvWithHeaders("A,B\n1,2\n\n3,4\n");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});
