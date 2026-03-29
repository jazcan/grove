import { describe, it, expect } from "vitest";
import {
  formatTemplateTagLabel,
  partitionSmartAndRest,
  SMART_TEMPLATE_SLUGS,
  templateUiTags,
} from "./service-template-ui";
import type { ServiceTemplate } from "./service-templates";

function stubTemplate(id: string): ServiceTemplate {
  return {
    id,
    label: id,
    descriptionShort: "",
    description: "",
    service: {
      name: id,
      description: "",
      category: "",
      durationMinutes: 30,
      bufferMinutes: 0,
      pricingType: "fixed",
      priceAmount: "0",
      currency: "USD",
      prepInstructions: "",
    },
    outcomes: [],
    stepTitles: [],
  };
}

describe("templateUiTags", () => {
  it("returns curated tags for known slugs", () => {
    expect(templateUiTags("simple").length).toBeGreaterThan(0);
    expect(templateUiTags("consultation-30")).toContain("most-popular");
  });

  it("returns empty array for unknown slug", () => {
    expect(templateUiTags("nonexistent-slug")).toEqual([]);
  });
});

describe("formatTemplateTagLabel", () => {
  it("maps tag keys to display labels", () => {
    expect(formatTemplateTagLabel("most-popular")).toBe("Most popular");
    expect(formatTemplateTagLabel("fast-setup")).toBe("Fast setup");
  });
});

describe("partitionSmartAndRest", () => {
  it("orders smart list by SMART_TEMPLATE_SLUGS and excludes them from rest", () => {
    const templates = [
      stubTemplate("other"),
      stubTemplate("consultation-30"),
      stubTemplate("simple"),
    ];
    const { smart, rest } = partitionSmartAndRest(templates);
    expect(smart.map((t) => t.id)).toEqual([
      SMART_TEMPLATE_SLUGS[0],
      SMART_TEMPLATE_SLUGS[1],
    ]);
    expect(rest.map((t) => t.id)).toEqual(["other"]);
  });

  it("omits missing smart slugs from smart array", () => {
    const templates = [stubTemplate("simple")];
    const { smart, rest } = partitionSmartAndRest(templates);
    expect(smart.map((t) => t.id)).toEqual(["simple"]);
    expect(rest).toEqual([]);
  });
});
