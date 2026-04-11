import { describe, expect, it } from "vitest";
import { buildProviderSetupSteps, getNextSetupStepHref, type ProviderSetupState } from "./provider-setup-model";

function state(partial: Partial<ProviderSetupState>): ProviderSetupState {
  return {
    hasIdentity: false,
    hasServices: false,
    hasAvailability: false,
    isPublished: false,
    needsSetup: true,
    activeServiceCount: 0,
    pendingBookingCount: 0,
    todayBookingCount: 0,
    customerCount: 0,
    onboardingWalkthroughCompletedAt: null,
    onboardingTailPending: false,
    ...partial,
  };
}

describe("getNextSetupStepHref", () => {
  it("sends users without identity to onboarding", () => {
    expect(getNextSetupStepHref(state({ hasIdentity: false }))).toBe("/dashboard/onboarding");
  });

  it("sends identity-only providers to first-service onboarding", () => {
    expect(getNextSetupStepHref(state({ hasIdentity: true, hasServices: false }))).toBe(
      "/dashboard/onboarding/first-service"
    );
  });

  it("sends providers with a service but no availability to availability with onboarding flag", () => {
    expect(
      getNextSetupStepHref(state({ hasIdentity: true, hasServices: true, hasAvailability: false }))
    ).toBe("/dashboard/availability?onboarding=1");
  });

  it("sends providers with core done but no customers to onboarding customers when walkthrough incomplete", () => {
    expect(
      getNextSetupStepHref(
        state({
          hasIdentity: true,
          hasServices: true,
          hasAvailability: true,
          customerCount: 0,
          onboardingWalkthroughCompletedAt: null,
        })
      )
    ).toBe("/dashboard/onboarding/customers");
  });

  it("skips customers when at least one exists", () => {
    expect(
      getNextSetupStepHref(
        state({
          hasIdentity: true,
          hasServices: true,
          hasAvailability: true,
          customerCount: 2,
          onboardingWalkthroughCompletedAt: null,
        })
      )
    ).toBe("/dashboard/onboarding/share");
  });

  it("sends providers who completed walkthrough to dashboard even when unpublished", () => {
    expect(
      getNextSetupStepHref(
        state({
          hasIdentity: true,
          hasServices: true,
          hasAvailability: true,
          isPublished: false,
          onboardingWalkthroughCompletedAt: new Date(),
          needsSetup: true,
        })
      )
    ).toBe("/dashboard");
  });

  it("sends fully set up providers to the dashboard home", () => {
    expect(
      getNextSetupStepHref(
        state({
          hasIdentity: true,
          hasServices: true,
          hasAvailability: true,
          isPublished: true,
          needsSetup: false,
          onboardingWalkthroughCompletedAt: new Date(),
        })
      )
    ).toBe("/dashboard");
  });
});

describe("buildProviderSetupSteps", () => {
  it("links the services step to first-service onboarding when identity exists but no services", () => {
    const steps = buildProviderSetupSteps(state({ hasIdentity: true, hasServices: false }));
    const svc = steps.find((s) => s.key === "services");
    expect(svc?.href).toBe("/dashboard/onboarding/first-service");
    expect(svc?.done).toBe(false);
  });

  it("links the services step to identity onboarding when identity is missing", () => {
    const steps = buildProviderSetupSteps(state({ hasIdentity: false, hasServices: false }));
    const svc = steps.find((s) => s.key === "services");
    expect(svc?.href).toBe("/dashboard/onboarding");
  });

  it("links the services step to full services when at least one active service exists", () => {
    const steps = buildProviderSetupSteps(
      state({ hasIdentity: true, hasServices: true, activeServiceCount: 1 })
    );
    const svc = steps.find((s) => s.key === "services");
    expect(svc?.href).toBe("/dashboard/services");
    expect(svc?.done).toBe(true);
  });

  it("marks customers done when walkthrough is completed even with zero customers", () => {
    const steps = buildProviderSetupSteps(
      state({
        hasIdentity: true,
        hasServices: true,
        hasAvailability: true,
        customerCount: 0,
        onboardingWalkthroughCompletedAt: new Date(),
      })
    );
    const cust = steps.find((s) => s.key === "customers");
    const share = steps.find((s) => s.key === "share");
    expect(cust?.done).toBe(true);
    expect(share?.done).toBe(true);
  });
});
