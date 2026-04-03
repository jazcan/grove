"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/** Shared with marketing site header when a provider is signed in. */
export const DASHBOARD_PROVIDER_NAV_LINKS = [
  ["/dashboard", "Home"],
  ["/dashboard/services", "Services"],
  ["/dashboard/pricing", "Pricing"],
  ["/dashboard/availability", "Availability"],
  ["/dashboard/bookings", "Bookings"],
  ["/dashboard/customers", "Customers"],
  ["/dashboard/marketing", "Marketing"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/docs", "Help"],
] as const;

const LINKS = DASHBOARD_PROVIDER_NAV_LINKS;

function linkClass(active: boolean) {
  return active
    ? "bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[var(--accent)]"
    : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]";
}

export function DashboardNav() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, close]);

  return (
    <>
      <nav
        className="[grid-area:nav] hidden min-w-0 flex-wrap gap-x-1 gap-y-2 text-sm font-medium sm:gap-x-0.5 md:flex"
        aria-label="Dashboard"
      >
        {LINKS.map(([href, label]) => {
          const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-2.5 py-2 sm:px-3 ${linkClass(active)}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div ref={rootRef} className="[grid-area:nav] relative md:hidden">
        <button
          ref={btnRef}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-sm)]"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          <span>Menu</span>
          <svg className="h-5 w-5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-[0_12px_40px_-12px_rgba(28,27,25,0.2)]"
          >
            {LINKS.map(([href, label]) => {
              const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  className={`block px-4 py-3 text-sm font-medium ${linkClass(active)}`}
                  onClick={close}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
