import { describe, it, expect } from "vitest";
import { interpolateTemplate } from "./template-interpolate";

describe("interpolateTemplate", () => {
  it("replaces all placeholders", () => {
    expect(
      interpolateTemplate("Hi {{name}}, visit {{url}}", {
        name: "Ada",
        url: "https://example.com",
      })
    ).toBe("Hi Ada, visit https://example.com");
  });

  it("leaves unknown keys unchanged", () => {
    expect(interpolateTemplate("{{a}} {{missing}}", { a: "1" })).toBe(
      "1 {{missing}}"
    );
  });

  it("handles empty vars", () => {
    expect(interpolateTemplate("plain", {})).toBe("plain");
  });
});
