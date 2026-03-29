export type DashboardNextStep = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  href: string;
  cta: string;
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
};

/** Steps for first-run setup: services (templates + pricing) → availability → publish. */
export function buildProviderSetupSteps(s: ProviderSetupState): DashboardNextStep[] {
  return [
    {
      key: "services",
      label: "Add your services",
      hint: "Start from a template, set duration and price—every offer is template-backed.",
      done: s.hasServices,
      href: "/dashboard/services",
      cta: "Services",
    },
    {
      key: "availability",
      label: "Set your availability",
      hint: "Weekly hours and one-off blocks control which slots clients can book.",
      done: s.hasAvailability,
      href: "/dashboard/availability",
      cta: "Availability",
    },
    {
      key: "publish",
      label: "Publish your profile",
      hint: "Turn on your public page so your link works and clients can book.",
      done: s.isPublished && s.hasIdentity,
      href: "/dashboard/profile",
      cta: "Profile",
    },
  ];
}
