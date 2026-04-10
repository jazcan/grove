"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandshakeBrandLockup } from "@/components/brand/handshake-brand-lockup";
import { MainNavMenu } from "@/components/nav/main-nav-menu";

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

export function SiteHeaderClient({ isLoggedIn, isAdmin }: Props) {
  const pathname = usePathname();
  const path = pathname ?? "";

  const isHome = path === "/" || path === "";

  return (
    <header
      className={
        isHome
          ? "handshake-landing-header sticky top-0 z-50 border-b"
          : "sticky top-0 z-50 bg-[color-mix(in_oklab,var(--card)_97%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_92%,transparent)]"
      }
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:gap-4 lg:px-8">
        <HandshakeBrandLockup href="/" />

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          {isHome ? (
            <nav aria-label="Quick links" className="hidden min-w-0 items-center lg:flex lg:gap-4">
              {!isLoggedIn ? (
                <>
                  <Link
                    href="/login"
                    className="hl-btn-secondary !min-h-10 whitespace-nowrap px-3 py-2 text-sm font-semibold leading-tight"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="ui-btn-primary !min-h-10 whitespace-nowrap px-4 py-2 text-sm font-semibold leading-tight"
                  >
                    Get started
                  </Link>
                </>
              ) : null}
            </nav>
          ) : null}

          <MainNavMenu variant="marketing" isHome={isHome} isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
