export type DashboardNextStep = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  href: string;
  cta: string;
  /** Encouraged but not counted toward required “ready to book” assistant progress. */
  optional?: boolean;
};

export type ProviderSetupState = {
  hasIdentity: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  isPublished: boolean;
  /** True when something still blocks “ready to accept bookings” (best-effort). */
  needsSetup: boolean;
  activeServiceCount: number;
  pendingBookingCount: number;
  todayBookingCount: number;
  customerCount: number;
  /** Null until the provider finishes the optional tail (share step) or completes the walkthrough action. */
  onboardingWalkthroughCompletedAt: Date | null;
  /** Core setup is done but the optional tail (customers → share) is not. */
  onboardingTailPending: boolean;
};

/**
 * Next onboarding URL for assistant / suggestions: identity → first service → availability → customers → share → home.
 */
export function getNextSetupStepHref(s: ProviderSetupState): string {
  if (!s.hasIdentity) return "/dashboard/onboarding";
  if (!s.hasServices) return "/dashboard/onboarding/first-service";
  if (!s.hasAvailability) return "/dashboard/availability?onboarding=1";
  if (!s.onboardingWalkthroughCompletedAt) {
    if (s.customerCount === 0) return "/dashboard/onboarding/customers";
    return "/dashboard/onboarding/share";
  }
  return "/dashboard";
}

/** Steps for assistant + setup UI. */
export function buildProviderSetupSteps(s: ProviderSetupState): DashboardNextStep[] {
  const servicesHref = !s.hasServices
    ? s.hasIdentity
      ? "/dashboard/onboarding/first-service"
      : "/dashboard/onboarding"
    : "/dashboard/services";

  const tailDone = s.onboardingWalkthroughCompletedAt != null;

  return [
    {
      key: "services",
      label: s.hasServices ? "Add your services" : "Add your first service",
      hint: s.hasServices
        ? "You can add more offers or fine-tune pricing under Services."
        : "One name, duration, and price is enough—you can refine everything later.",
      done: s.hasServices,
      href: servicesHref,
      cta: "First service",
    },
    {
      key: "availability",
      label: "Set your availability",
      hint: "Turn on at least one day of weekly hours so clients can book real slots.",
      done: s.hasAvailability,
      href: "/dashboard/availability?onboarding=1",
      cta: "Availability",
    },
    {
      key: "customers",
      label: "Add your existing customers",
      hint: "Optional—copy people you already serve from texts or Facebook messages (no automatic import). Name-only rows use the same safe placeholder email as CSV import.",
      done: s.customerCount > 0 || tailDone,
      href: "/dashboard/onboarding/customers",
      cta: "Customers",
    },
    {
      key: "share",
      label: "Share your booking link",
      hint: "Optional: copy your public link to text clients or post online.",
      done: tailDone,
      href: "/dashboard/onboarding/share",
      cta: "Share",
    },
    {
      key: "publish",
      label: "Publish your profile",
      hint: "Turn on your public page so your link resolves for new clients.",
      done: s.isPublished && s.hasIdentity,
      href: "/dashboard/profile",
      cta: "Profile",
    },
  ];
}
