import { describe, expect, it } from "vitest";
import { resolveCanonicalTemplateCategoryBucket } from "./service-templates";

describe("resolveCanonicalTemplateCategoryBucket", () => {
  it("maps current top-level categories", () => {
    expect(resolveCanonicalTemplateCategoryBucket("Home Services")).toBe("Home Services");
    expect(resolveCanonicalTemplateCategoryBucket("Personal Services")).toBe("Personal Services");
    expect(resolveCanonicalTemplateCategoryBucket("Professional Services")).toBe("Professional Services");
  });

  it("maps legacy canonical seed labels for backward compatibility", () => {
    expect(resolveCanonicalTemplateCategoryBucket("Cleaning")).toBe("Home Services");
    expect(resolveCanonicalTemplateCategoryBucket("Lawn Care")).toBe("Home Services");
    expect(resolveCanonicalTemplateCategoryBucket("Pet Care")).toBe("Personal Services");
    expect(resolveCanonicalTemplateCategoryBucket("Fitness")).toBe("Personal Services");
    expect(resolveCanonicalTemplateCategoryBucket("Consultation")).toBe("Professional Services");
    expect(resolveCanonicalTemplateCategoryBucket("Tutoring")).toBe("Professional Services");
    expect(resolveCanonicalTemplateCategoryBucket("General")).toBe("Professional Services");
  });

  it("returns null for unknown values", () => {
    expect(resolveCanonicalTemplateCategoryBucket("Custom label")).toBeNull();
    expect(resolveCanonicalTemplateCategoryBucket("")).toBeNull();
  });
});
