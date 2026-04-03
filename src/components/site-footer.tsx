import Link from "next/link";
import { brand } from "@/config/brand";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color-mix(in_oklab,var(--foreground)_8%,transparent)] bg-[color-mix(in_oklab,var(--card)_88%,var(--background))] py-10 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div className="max-w-sm">
          <div className="font-semibold text-[var(--foreground)]">{brand.appName}</div>
          <p className="mt-2 leading-relaxed text-[var(--muted)]">
            Local service providers, clear availability, and bookings you can trust.
          </p>
        </div>
        <nav className="flex flex-col gap-2 sm:items-end" aria-label="Footer">
          <Link href="/about-handshake-local" className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
            About {brand.appName}
          </Link>
          <Link href="/marketplace" className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
            Find a provider
          </Link>
          <Link href="/signup" className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
            Become a provider
          </Link>
          <Link href="/help" className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
            Help
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-[var(--muted)] sm:px-6 lg:px-8">
        © {year} {brand.appName}
      </p>
    </footer>
  );
}
