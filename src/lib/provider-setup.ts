import { and, eq, gte, lte, ne, count } from "drizzle-orm";
import { DateTime } from "luxon";
import type { Database } from "@/db";
import { availabilityRules, bookings, customers, providers, services } from "@/db/schema";
import type { DashboardNextStep } from "@/components/dashboard/dashboard-next-steps";

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

/**
 * Single load of flags and counts for onboarding, dashboard command center, and nav hints.
 */
export async function loadProviderSetupState(
  db: Database,
  providerId: string,
  timezone: string
): Promise<ProviderSetupState> {
  const [prov] = await db
    .select({
      username: providers.username,
      displayName: providers.displayName,
      publicProfileEnabled: providers.publicProfileEnabled,
    })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);

  const hasIdentity = Boolean(prov?.username?.trim() && prov?.displayName?.trim());

  const [svcRow] = await db
    .select({ n: count() })
    .from(services)
    .where(and(eq(services.providerId, providerId), eq(services.isActive, true)));

  const activeServiceCount = Number(svcRow?.n ?? 0);
  const hasServices = activeServiceCount > 0;

  const [ruleRow] = await db
    .select({ id: availabilityRules.id })
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, providerId))
    .limit(1);
  const hasAvailability = !!ruleRow;

  const isPublished = !!prov?.publicProfileEnabled;
  const needsSetup = !hasServices || !hasAvailability || !isPublished || !hasIdentity;

  const [pendingRow] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "pending")));

  const pendingBookingCount = Number(pendingRow?.n ?? 0);

  const startOfToday = DateTime.now().setZone(timezone).startOf("day");
  const endOfToday = DateTime.now().setZone(timezone).endOf("day");

  const [todayRow] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, providerId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    );

  const todayBookingCount = Number(todayRow?.n ?? 0);

  const [custRow] = await db
    .select({ n: count() })
    .from(customers)
    .where(eq(customers.providerId, providerId));

  const customerCount = Number(custRow?.n ?? 0);

  return {
    hasIdentity,
    hasServices,
    hasAvailability,
    isPublished,
    needsSetup,
    activeServiceCount,
    pendingBookingCount,
    todayBookingCount,
    customerCount,
  };
}

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
