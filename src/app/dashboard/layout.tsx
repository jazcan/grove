import Link from "next/link";
import { GroveLogoMark } from "@/components/brand/grove-logo-mark";
import { requireUser } from "@/lib/tenancy";
import { signOut } from "@/domain/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await requireUser();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_88%,transparent)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]"
            >
              <GroveLogoMark size={32} className="shrink-0" />
              <span className="text-[var(--accent)]">Grove</span>
            </Link>
            <nav
              className="flex max-w-full flex-wrap gap-x-1 gap-y-2 text-sm font-medium sm:gap-x-0.5"
              aria-label="Dashboard"
            >
              {(
                [
                  ["/dashboard", "Home"],
                  ["/dashboard/profile", "Profile"],
                  ["/dashboard/services", "Services"],
                  ["/dashboard/availability", "Availability"],
                  ["/dashboard/bookings", "Bookings"],
                  ["/dashboard/customers", "Customers"],
                  ["/dashboard/marketing", "Marketing"],
                  ["/dashboard/analytics", "Analytics"],
                ] as const
              ).map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-2.5 py-2 text-[var(--foreground)] hover:bg-[var(--surface-hover)] sm:px-3"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--card-border)] pt-3 text-sm sm:border-t-0 sm:pt-0">
            <span className="max-w-[min(100%,220px)] truncate text-[var(--muted)] sm:max-w-[280px]">
              {u.email}
            </span>
            <form action={signOut}>
              <button type="submit" className="ui-btn-secondary min-h-10 px-4 py-2 text-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">{children}</div>
    </div>
  );
}
