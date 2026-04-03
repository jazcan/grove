"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { GroveAccountMark } from "@/components/brand/grove-account-mark";
import { signOut } from "@/domain/auth/actions";

type Props = {
  userEmail: string;
  /** When set (e.g. S3 public URL), shown as the menu trigger avatar. */
  profileImageUrl?: string | null;
};

export function DashboardAccountMenu({ userEmail, profileImageUrl }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        requestAnimationFrame(() => buttonRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const first = menu.querySelector<HTMLElement>("[data-dashboard-menu-item]");
    first?.focus();
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menu = menuRef.current;
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll<HTMLElement>("[data-dashboard-menu-item]"));
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  const itemClass =
    "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        id={`${menuId}-trigger`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${menuId}-menu`}
        aria-label={`Account menu, signed in as ${userEmail}`}
        className="overflow-hidden rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        onClick={() => setOpen((o) => !o)}
      >
        {profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic storage URL
          <img
            src={profileImageUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        ) : (
          <GroveAccountMark size={32} />
        )}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={`${menuId}-menu`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`${menuId}-trigger`}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11.5rem] rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-[0_8px_24px_-12px_rgba(28,27,25,0.15)]"
          onKeyDown={onMenuKeyDown}
        >
          <Link
            href="/dashboard/profile"
            role="menuitem"
            data-dashboard-menu-item
            className={itemClass}
            onClick={close}
          >
            Profile
          </Link>
          <Link
            href="/dashboard/docs"
            role="menuitem"
            data-dashboard-menu-item
            className={itemClass}
            onClick={close}
          >
            Help
          </Link>
          <form action={signOut} className="mt-0.5 px-1 pb-1">
            <button type="submit" role="menuitem" data-dashboard-menu-item className={itemClass}>
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
