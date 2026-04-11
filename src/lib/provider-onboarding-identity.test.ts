import { describe, expect, it } from "vitest";
import {
  buildOnboardingUsernameCandidates,
  isProvisionalProviderUsername,
  slugifyDisplayNameToUsernameHint,
} from "@/lib/provider-onboarding-identity";

describe("provider-onboarding-identity", () => {
  it("slugifies display names for URL hints", () => {
    expect(slugifyDisplayNameToUsernameHint("Tidy with Talia")).toBe("tidy-with-talia");
    expect(slugifyDisplayNameToUsernameHint("  Café Noir!! ")).toBe("cafe-noir");
  });

  it("detects provisional signup usernames", () => {
    expect(isProvisionalProviderUsername("prov-0123456789ab")).toBe(true);
    expect(isProvisionalProviderUsername("prov-0123456789abc")).toBe(false);
    expect(isProvisionalProviderUsername("tidy-with-talia")).toBe(false);
  });

  it("builds display-derived candidates first", () => {
    const c = buildOnboardingUsernameCandidates("Tidy with Talia", {
      providerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    expect(c[0]).toBe("tidy-with-talia");
    expect(c.includes("tidy-with-talia-2")).toBe(true);
    expect(c.some((u) => /^prov-[a-f0-9]{10}$/.test(u))).toBe(true);
  });
});
