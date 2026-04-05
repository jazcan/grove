/** Provider destinations for dashboard + marketing “your business” menu. */
export const DASHBOARD_PROVIDER_NAV_LINKS = [
  ["/dashboard/services", "Services"],
  ["/dashboard/pricing", "Pricing"],
  ["/dashboard/availability", "Availability"],
  ["/dashboard/bookings", "Bookings"],
  ["/dashboard/customers", "Customers"],
  ["/dashboard/marketing", "Marketing"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/money", "Money"],
  ["/dashboard/docs", "Help"],
] as const;

/** Full primary nav for logged-in provider (dashboard hamburger + marketing when signed in). */
export const DASHBOARD_MAIN_MENU_LINKS = [
  ["/dashboard", "Dashboard"],
  ...DASHBOARD_PROVIDER_NAV_LINKS,
] as const;
