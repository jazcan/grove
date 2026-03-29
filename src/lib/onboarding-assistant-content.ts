export type AssistantRouteId =
  | "dashboard"
  | "profile"
  | "services"
  | "pricing"
  | "availability"
  | "bookings"
  | "customers"
  | "marketing"
  | "analytics"
  | "onboarding"
  | "other";

export type PageGuide = {
  /** Shown under “Grove guide” */
  contextTitle: string;
  /** Concise, actionable copy for this screen */
  body: string;
};

/**
 * Maps the dashboard URL to a guide bucket. Detail routes (e.g. booking id) use the parent section.
 */
export function getAssistantRouteId(pathname: string | null): AssistantRouteId {
  if (!pathname) return "dashboard";
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === "/dashboard") return "dashboard";
  if (p.startsWith("/dashboard/onboarding")) return "onboarding";
  if (p.startsWith("/dashboard/profile")) return "profile";
  if (p.startsWith("/dashboard/services")) return "services";
  if (p.startsWith("/dashboard/pricing")) return "pricing";
  if (p.startsWith("/dashboard/availability")) return "availability";
  if (p.startsWith("/dashboard/bookings")) return "bookings";
  if (p.startsWith("/dashboard/customers")) return "customers";
  if (p.startsWith("/dashboard/marketing")) return "marketing";
  if (p.startsWith("/dashboard/analytics")) return "analytics";
  return "other";
}

const GUIDES: Record<AssistantRouteId, PageGuide> = {
  dashboard: {
    contextTitle: "Command center",
    body: "Use today’s snapshot to see revenue and what’s next. The highlighted action below matches where you are in setup or growth.",
  },
  profile: {
    contextTitle: "Public profile",
    body: "This is what clients see before they book. Turn on your public page when services and hours are ready, and keep your bio clear and specific.",
  },
  services: {
    contextTitle: "Services",
    body: "Start from a template so name, duration, and price are filled in—then tweak. You need at least one active service before clients can book.",
  },
  pricing: {
    contextTitle: "Pricing",
    body: "Align prices with duration and positioning here. Changes apply to what clients see on your public page and at checkout.",
  },
  availability: {
    contextTitle: "Availability",
    body: "Set weekly hours first, then use quick blocks or the calendar for exceptions. Two or more active days usually converts better than a single slot.",
  },
  bookings: {
    contextTitle: "Bookings",
    body: "Confirm pending requests quickly, open a booking for full context, and use filters when the list grows.",
  },
  customers: {
    contextTitle: "Customers",
    body: "Your client list powers follow-ups and campaigns. Add people you already know so history stays in one place.",
  },
  marketing: {
    contextTitle: "Marketing",
    body: "Reach clients with campaigns and reusable messages. Pair this with your public link for the fastest path to new bookings.",
  },
  analytics: {
    contextTitle: "Analytics",
    body: "Track trends over time. Use this alongside Bookings and Command center when you want a longer view than today’s numbers.",
  },
  onboarding: {
    contextTitle: "Welcome",
    body: "Pick a username and display name clients will recognize. You can refine your public profile and catalog right after this step.",
  },
  other: {
    contextTitle: "Dashboard",
    body: "Use the navigation above to open the area you need. The guide stays here if you want a quick next step.",
  },
};

export function getPageGuide(routeId: AssistantRouteId): PageGuide {
  return GUIDES[routeId] ?? GUIDES.other;
}
