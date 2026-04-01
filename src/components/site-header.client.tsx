"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HandshakeBrandLockup } from "@/components/brand/handshake-brand-lockup";
import { signOut } from "@/domain/auth/actions";

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

function linkBase(active: boolean) {
  return active
    ? "text-[var(--accent)] font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-[0.35rem]"
    : "text-[var(--foreground)] font-medium hover:text-[var(--accent)]";
}

export function SiteHeaderClient({ isLoggedIn, isAdmin }: Props) {
  const pathname = usePathname();
  const path = pathname ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = path === "/" || path === "";
  const marketplaceActive = path === "/marketplace" || path.startsWith("/marketplace/");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={
        isHome
          ? "handshake-landing-header sticky top-0 z-50 border-b"
          : "sticky top-0 z-50 border-b border-[color-mix(in_oklab,var(--foreground)_7%,transparent)] bg-[color-mix(in_oklab,var(--card)_97%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_92%,transparent)]"
      }
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <HandshakeBrandLockup href="/" />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 md:flex md:items-center md:gap-1" aria-label="Main">
          <Link href="/marketplace" className={`rounded-md px-3 py-2 text-sm transition-colors ${linkBase(marketplaceActive)}`}>
            Find a provider
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 sm:gap-3 md:flex">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${linkBase(path.startsWith("/dashboard"))}`}
                >
                  Dashboard
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className={`rounded-md px-3 py-2 text-sm transition-colors ${linkBase(path.startsWith("/admin"))}`}
                  >
                    Admin
                  </Link>
                ) : null}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={
                    isHome
                      ? "hl-btn-secondary min-h-10 px-4 py-2 text-sm"
                      : "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_12%,transparent)] transition-colors hover:bg-[var(--surface-hover)]"
                  }
                >
                  Sign in
                </Link>
                <Link href="/signup" className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-5 py-2 text-sm font-semibold">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_10%,transparent)] transition hover:bg-[var(--surface-hover)] md:hidden"
            aria-expanded={menuOpen}
            aria-controls="site-header-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="site-header-mobile-menu"
          className={`border-t border-[color-mix(in_oklab,var(--foreground)_7%,transparent)] px-4 py-4 shadow-[0_8px_24px_-12px_rgba(28,27,25,0.12)] md:hidden ${
            isHome ? "bg-[var(--hl-paper)]" : "bg-[var(--card)]"
          }`}
        >
          <nav className="flex flex-col gap-1" aria-label="Main mobile">
            <Link
              href="/marketplace"
              className={`rounded-lg px-3 py-3 text-sm ${linkBase(marketplaceActive)}`}
              onClick={() => setMenuOpen(false)}
            >
              Find a provider
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={`rounded-lg px-3 py-3 text-sm ${linkBase(path.startsWith("/dashboard"))}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className={`rounded-lg px-3 py-3 text-sm ${linkBase(path.startsWith("/admin"))}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                ) : null}
                <form action={signOut} className="pt-1">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={
                    isHome
                      ? "hl-btn-secondary mt-1 w-full justify-center px-3 py-3 text-sm"
                      : "mt-1 rounded-lg px-3 py-3 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_12%,transparent)]"
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="ui-btn-primary mt-2 inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-sm font-semibold"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
