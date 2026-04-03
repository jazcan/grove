import Link from "next/link";
import { brand } from "@/config/brand";

export default function AboutHandshakeLocalPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">About {brand.appName}</h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
        {brand.appName} connects people who need local services with independent providers who run their own
        businesses. Providers publish a public profile, list what they offer, set pricing and availability, and accept
        bookings in one place.
      </p>
      <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
        Clients can search the marketplace, compare profiles, see open times, and book without guesswork.
      </p>
      <p className="mt-8">
        <Link href="/marketplace" className="ui-link font-semibold">
          Find a provider
        </Link>
        {" · "}
        <Link href="/signup" className="ui-link font-semibold">
          Become a provider
        </Link>
      </p>
    </main>
  );
}
