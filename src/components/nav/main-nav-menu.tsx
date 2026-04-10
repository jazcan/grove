"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DASHBOARD_MAIN_MENU_LINKS } from "@/lib/dashboard-nav-links";
import { MainMenuToggleIcon } from "@/components/nav/main-menu-toggle-icon";
import { signOut } from "@/domain/auth/actions";

const DISCOVER_NAV = [
  ["/about-handshake-local", "About Handshake Local"],
  ["/signup", "Become a provider"],
] as const;

export type MainNavMenuProps = {
  variant: "marketing" | "dashboard";
  /** Marketing only — affects Sign in / Get started button styling in the menu. */
  isHome?: boolean;
  /** Marketing only */
  isLoggedIn?: boolean;
  isAdmin?: boolean;
};

function linkBase(active: boolean) {
  return active
    ? "text-[var(--accent)] font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-[0.35rem]"
    : "text-[var(--foreground)] font-medium hover:text-[var(--accent)]";
}

const sectionLabelClass =
  "px-4 pb-1.5 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_oklab,var(--foreground)_50%,transparent)] first:pt-1";

const menuItemClass = (active: boolean) =>
  `block w-full px-4 py-2.5 text-left text-sm font-medium ${linkBase(active)} outline-none transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]`;

function navItemActive(path: string, href: string) {
  if (href === "/dashboard") return path === "/dashboard";
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Shared main menu (hamburger + panel) used on the marketing site and in the dashboard header.
 * Matches marketing positioning, panel styling, and {@link MainMenuToggleIcon}.
 */
export function MainNavMenu({
  variant,
  isHome = false,
  isLoggedIn = false,
  isAdmin = false,
}: MainNavMenuProps) {
  const pathname = usePathname();
  const path = pathname ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        requestAnimationFrame(() => menuBtnRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const place = () => {
      const header = rootRef.current?.closest("header");
      const el = header ?? rootRef.current;
      if (!el) return;
      setMenuTop(el.getBoundingClientRect().bottom + 6);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen, closeMenu]);

  const panelClass =
    "fixed right-4 z-[60] max-h-[min(75vh,32rem)] w-[min(17.5rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-[0_12px_40px_-12px_rgba(28,27,25,0.2)]";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={menuBtnRef}
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_10%,transparent)] transition hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={`${menuId}-panel`}
        aria-label={menuOpen ? "Close main menu" : "Open main menu"}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <MainMenuToggleIcon open={menuOpen} />
      </button>

      {menuOpen ? (
        <div id={`${menuId}-panel`} role="menu" style={{ top: menuTop }} className={panelClass}>
          {variant === "marketing" ? (
            <>
              <div className={sectionLabelClass}>Discover</div>
              {DISCOVER_NAV.map(([href, label]) => {
                const active = path === href || path.startsWith(`${href}/`);
                return (
                  <Link key={href} href={href} role="menuitem" className={menuItemClass(active)} onClick={closeMenu}>
                    {label}
                  </Link>
                );
              })}

              {isLoggedIn ? (
                <>
                  <div className="mt-1 border-t border-[var(--border)]" />
                  <div className={sectionLabelClass}>Your business</div>
                  {DASHBOARD_MAIN_MENU_LINKS.map(([href, label]) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className={menuItemClass(navItemActive(path, href))}
                      onClick={closeMenu}
                    >
                      {label}
                    </Link>
                  ))}
                </>
              ) : null}

              <div className="mt-1 border-t border-[var(--border)]" />
              <div className={sectionLabelClass}>Account</div>
              {isLoggedIn ? (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      role="menuitem"
                      className={menuItemClass(path.startsWith("/admin"))}
                      onClick={closeMenu}
                    >
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    href="/dashboard/profile"
                    role="menuitem"
                    className={menuItemClass(path.startsWith("/dashboard/profile"))}
                    onClick={closeMenu}
                  >
                    Profile
                  </Link>
                  <form action={signOut} className="px-1 pb-1">
                    <button type="submit" role="menuitem" className={`${menuItemClass(false)} w-full`}>
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/help"
                    role="menuitem"
                    className={menuItemClass(path === "/help" || path.startsWith("/help/"))}
                    onClick={closeMenu}
                  >
                    Help
                  </Link>
                  <Link
                    href="/login"
                    role="menuitem"
                    className={
                      isHome
                        ? "hl-btn-secondary mx-2 my-1 flex min-h-10 items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold"
                        : menuItemClass(path.startsWith("/login"))
                    }
                    onClick={closeMenu}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    role="menuitem"
                    className={
                      isHome
                        ? "ui-btn-primary mx-2 mb-2 mt-1 flex min-h-10 items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold"
                        : `${menuItemClass(path.startsWith("/signup"))} mb-2 font-semibold`
                    }
                    onClick={closeMenu}
                  >
                    Get started
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <div className={sectionLabelClass}>Your business</div>
              {DASHBOARD_MAIN_MENU_LINKS.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  className={menuItemClass(navItemActive(path, href))}
                  onClick={closeMenu}
                >
                  {label}
                </Link>
              ))}
              <div className="mt-1 border-t border-[var(--border)]" />
              <div className={sectionLabelClass}>Account</div>
              {isAdmin ? (
                <Link
                  href="/admin"
                  role="menuitem"
                  className={menuItemClass(path.startsWith("/admin"))}
                  onClick={closeMenu}
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/dashboard/profile"
                role="menuitem"
                className={menuItemClass(path.startsWith("/dashboard/profile"))}
                onClick={closeMenu}
              >
                Profile
              </Link>
              <form action={signOut} className="px-1 pb-1">
                <button type="submit" role="menuitem" className={`${menuItemClass(false)} w-full`}>
                  Log out
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
