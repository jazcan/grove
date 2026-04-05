import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";

export default function AboutHandshakeLocalPage() {
  return (
    <main id="main-content" className="handshake-landing">
      {/* Hero */}
      <section className="hl-rule border-b py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)] sm:text-sm">{brand.appName}</p>
            <h1 className="hl-display mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              Local service businesses deserve tools that match how they work
            </h1>
            <div className="mt-4 max-w-lg sm:mt-5" aria-hidden>
              <Image
                src="/brand/hsl-line2.svg"
                alt=""
                width={800}
                height={40}
                unoptimized
                className="h-3 w-full max-w-sm object-left object-contain opacity-[0.72] sm:h-3.5 sm:max-w-md sm:opacity-[0.78]"
              />
            </div>
            <p className="hl-body mt-6 text-base leading-relaxed text-[var(--muted)] sm:text-lg sm:leading-relaxed">
              {brand.appName} is a platform for independent providers who run on appointments, relationships, and
              reputation—not on a patchwork of inboxes and single-purpose apps. We bring bookings, client context,
              visibility, and day-to-day operations into one calm workspace so you can spend less time coordinating and
              more time doing the work clients pay you for.
            </p>
          </div>
        </div>
      </section>

      {/* Platform */}
      <section className="hl-rule border-b bg-[color-mix(in_oklab,var(--surface-muted)_48%,var(--background))] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="hl-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              A single home for bookings, clients, and operations
            </h2>
            <p className="hl-body mt-4 text-base leading-relaxed text-[var(--muted)] sm:mt-5">
              Providers publish a profile clients can trust: what you offer, how you price, and when you are actually
              available. Bookings land in one place instead of scattered across text threads. You keep notes, history,
              and follow-ups next to each customer, and you can track payments your way—without being forced into a
              processor you did not choose.
            </p>
            <p className="hl-body mt-4 text-base leading-relaxed text-[var(--muted)]">
              When you want more demand, you can opt into discovery so nearby clients can find you in the marketplace—
              while still serving everyone who already knows your name.
            </p>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="hl-rule border-b py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="hl-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Building better infrastructure for service commerce—starting local
            </h2>
            <p className="hl-body mt-4 text-base leading-relaxed text-[var(--muted)] sm:mt-5">
              Service commerce is still fragmented: too much still lives in DMs, voicemails, and improvised spreadsheets.
              We are focused on practical software that reduces friction where it hurts most—scheduling, records, and
              clarity for both sides of the appointment.
            </p>
            <p className="hl-body mt-4 text-base leading-relaxed text-[var(--muted)]">
              We start local because geography and trust still drive how many independent businesses grow. That grounding
              keeps the product honest. Longer term, we are working toward deeper infrastructure for how services are
              sold, scheduled, and run—without losing the straightforward experience providers need day to day.
            </p>
          </div>
        </div>
      </section>

      {/* Handshake Collective */}
      <section className="hl-rule border-b bg-[color-mix(in_oklab,var(--card)_42%,var(--background))] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="hl-overline text-xs font-bold uppercase text-[var(--accent)]">Handshake Collective</p>
            <h2 className="hl-display mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Professional services when you want hands-on help
            </h2>
            <p className="hl-body mt-4 text-base leading-relaxed text-[var(--muted)] sm:mt-5">
              Handshake Collective is the professional services arm of our company. We offer paid implementations,
              structured onboarding, and ongoing support for teams that want to move faster than self-serve setup—or need
              help aligning staff, services, and client workflows around a single system.
            </p>
            <p className="hl-body mt-4 text-base leading-relaxed text-[var(--muted)]">
              We are also expanding how we support commerce-heavy businesses: expect growing capability around Shopify
              and related channels for providers whose work spans in-person services and online storefronts. If you are
              planning a deeper rollout or an agency-style engagement, Collective is the path to a staffed, accountable
              project—not a ticket queue.
            </p>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-base font-medium text-[var(--foreground)]">Explore the product</p>
            <p className="hl-body mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Browse providers in the marketplace or create an account to set up your profile.
            </p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold">
              <Link href="/marketplace" className="ui-link">
                Find a provider
              </Link>
              <span className="text-[var(--hl-ink-faint)]" aria-hidden>
                ·
              </span>
              <Link href="/signup" className="ui-link">
                Become a provider
              </Link>
              <span className="text-[var(--hl-ink-faint)]" aria-hidden>
                ·
              </span>
              <Link href="/help" className="ui-link font-medium">
                Help
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
