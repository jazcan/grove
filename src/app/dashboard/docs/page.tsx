import Link from "next/link";
import { brand } from "@/config/brand";
import { requireProvider } from "@/lib/tenancy";

const toc = [
  ["welcome", "Welcome"],
  ["getting-started", "Getting started"],
  ["services", "Services"],
  ["availability", "Availability"],
  ["bookings", "Bookings"],
  ["customers", "Customers"],
  ["marketing", "Marketing"],
  ["discovery", "Discovery & visibility"],
  ["payments", "Payments"],
  ["analytics", "Analytics"],
  ["faq", "FAQ"],
] as const;

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      <div className="mt-4 max-w-prose space-y-4 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[color-mix(in_oklab,var(--foreground)_45%,transparent)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ProviderDocsPage() {
  await requireProvider();

  return (
    <main id="main-content" className="min-w-0">
      <header className="max-w-prose">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Help</h1>
        <p className="mt-3 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)] sm:text-base">
          Plain-language guide to {brand.appName} for providers. Use the links below to jump to a topic.
        </p>
      </header>

      <nav
        className="ui-card mt-8 p-5 sm:p-6"
        aria-label="On this page"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
          On this page
        </p>
        <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {toc.map(([slug, label]) => (
            <li key={slug}>
              <a href={`#${slug}`} className="ui-link font-medium text-[var(--foreground)]">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="mt-10 space-y-12 pb-8">
        <DocSection id="welcome" title="Welcome">
          <p>
            {brand.appName} helps you offer services, manage bookings, stay organized, and stay in touch with
            customers—whether they book through your public page or you add them yourself.
          </p>
          <p>
            Your dashboard is organized by task: services, pricing, when you work, bookings, people you serve,
            marketing, and a simple analytics view. You can grow into features over time; nothing requires you to
            use everything on day one.
          </p>
        </DocSection>

        <DocSection id="getting-started" title="Getting started">
          <p>A typical setup path looks like this:</p>
          <BulletList
            items={[
              <>
                <strong className="text-[var(--foreground)]">Complete your profile</strong> — name, location, bio, and
                how clients can reach you. Turn on your public profile when you are ready.{" "}
                <Link href="/dashboard/profile" className="ui-link font-semibold">
                  Open Profile
                </Link>
              </>,
              <>
                <strong className="text-[var(--foreground)]">Add services</strong> — what you offer, how long visits
                take, and base pricing.{" "}
                <Link href="/dashboard/services" className="ui-link font-semibold">
                  Services
                </Link>
              </>,
              <>
                <strong className="text-[var(--foreground)]">Refine pricing (optional)</strong> — positioning tiers and
                add-ons if you use them.{" "}
                <Link href="/dashboard/pricing" className="ui-link font-semibold">
                  Pricing
                </Link>
              </>,
              <>
                <strong className="text-[var(--foreground)]">Set availability</strong> — weekly hours, time off, and
                whether you want to pause new bookings.{" "}
                <Link href="/dashboard/availability" className="ui-link font-semibold">
                  Availability
                </Link>
              </>,
              <>
                <strong className="text-[var(--foreground)]">Share your page</strong> — clients can book from your public
                link; if you opt in, you can also allow discovery when it is available in your area (see below).
              </>,
            ]}
          />
          <p>
            The assistant on your home screen highlights useful next steps while you are getting set up.
          </p>
        </DocSection>

        <DocSection id="services" title="Services">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Templates</h3>
          <p>
            Starter templates give you a suggested name, description, duration, and price for common service types. You
            can start from a template and edit everything, or build from scratch.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Creating a service</h3>
          <p>
            Each service has a name, description, duration, optional buffer time after appointments, and pricing style
            (for example fixed price). You can require a phone number or notes from the client when they book, and add
            prep instructions they see before the visit.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Pricing (basics)</h3>
          <p>
            List prices live on the service. The separate Pricing area adds optional tools—like tiers and add-on
            overrides—for when you want more control. Your booking flow uses the prices you have set on active
            services.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Active services</h3>
          <p>
            Only <strong className="text-[var(--foreground)]">active</strong> services can be chosen for new bookings
            (including when you add a booking by hand). Turn a service off if you are not offering it for now.
          </p>
        </DocSection>

        <DocSection id="availability" title="Availability">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Weekly hours</h3>
          <p>
            Set which days you work and your start and end times. You can copy hours across days or use presets to get
            started quickly.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Blocked time</h3>
          <p>
            Block out specific ranges for breaks, travel, or time off. Blocked time prevents new bookings in those
            slots.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Quick block</h3>
          <p>
            Use the quick block controls when you need to mark time busy without opening the full block form—handy for
            short interruptions.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Pause new bookings</h3>
          <p>
            Pausing stops new requests from coming in while keeping your profile and existing appointments intact.
            Turn it off when you are ready to accept bookings again.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Calendar</h3>
          <p>
            The calendar shows your hours, blocks, and existing appointments together so you can see how the next weeks
            look at a glance.
          </p>
        </DocSection>

        <DocSection id="bookings" title="Bookings">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Upcoming and past</h3>
          <p>
            The bookings page lists what is coming up and what already happened. You can filter to focus on confirmed or
            pending visits, and use the day strip to concentrate on the next few days.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Statuses</h3>
          <p>In everyday terms:</p>
          <BulletList
            items={[
              <>
                <strong className="text-[var(--foreground)]">Pending</strong> — waiting for you to confirm or still
                being arranged.
              </>,
              <>
                <strong className="text-[var(--foreground)]">Confirmed</strong> — you are expecting the visit to happen
                as scheduled.
              </>,
              <>
                <strong className="text-[var(--foreground)]">Completed, no-show, rescheduled, cancelled</strong> — use
                these to record how the appointment actually went.
              </>,
            ]}
          />
          <p>The app includes the same status options; pick the one that fits each booking.</p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Opening a booking</h3>
          <p>
            Open any booking to see full details, update status, record payment, reschedule, add internal notes only you
            can see, and (where relevant) connect follow-up recommendations to the customer&apos;s profile.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Adding a booking yourself</h3>
          <p>
            You can create a booking manually when someone books outside the app—useful for phone or repeat clients.
          </p>
        </DocSection>

        <DocSection id="customers" title="Customers">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Who appears here</h3>
          <p>
            Your customer list focuses on people who are set up for ongoing relationship in the app (for example after
            they complete their side of signup, or when you add them). People can also appear after they book, depending
            on how their account is created.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Search</h3>
          <p>Search by name, email, or phone when you have a growing list.</p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Customer profile</h3>
          <p>
            On someone&apos;s page you can see their history with you, keep private notes, track communication
            preferences, and add recommendations for future visits (helpful for retention and personalized follow-up).
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Marketing preference</h3>
          <p>
            Customers can be opted out of marketing emails; respect that flag when you send campaigns (the app only sends
            marketing to people who have not opted out).
          </p>
        </DocSection>

        <DocSection id="marketing" title="Marketing">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Campaigns</h3>
          <p>
            Plan a message with audience, channel, and timing. You can draft the body yourself or use generated copy as
            a starting point, then save and track what you send.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Content generation</h3>
          <p>
            Studio-style tools help you produce post ideas, seasonal angles, and campaign text. Treat suggestions as
            drafts—review and edit so they sound like you.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Reconnecting</h3>
          <p>
            The reconnect area surfaces customers you may want to check in with, with light context (like how long
            since their last visit). You can draft a personal message from there.
          </p>
          <h3 className="pt-2 text-base font-semibold text-[var(--foreground)]">Who receives email</h3>
          <p>
            Marketing email goes only to customers who have not opted out of marketing. A send uses the template and
            audience you choose; daily limits may apply to protect quality and deliverability.
          </p>
        </DocSection>

        <DocSection id="discovery" title="Discovery & visibility">
          <p>
            Most clients reach you through the public link you share. Separately, you can opt in so your profile is
            eligible for location-based discovery when that capability is available in your area.
          </p>
          <p>
            In{" "}
            <Link href="/dashboard/profile#profile-visibility" className="ui-link font-semibold">
              Profile → Visibility
            </Link>
            , two ideas work together:
          </p>
          <BulletList
            items={[
              <>
                <strong className="text-[var(--foreground)]">Publish public profile</strong> — clients can open your
                booking page with your link.
              </>,
              <>
                <strong className="text-[var(--foreground)]">Opt in to discovery</strong> — when search is available nearby,
                new clients may find your public profile through {brand.appName}.
              </>,
            ]}
          />
          <p>
            You can still work entirely with people who contact you directly or use your personal link—discovery is
            optional.
          </p>
          <p className="text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
            Discovery depends on location data and regional rollout; results can vary. Your public page link is the most
            reliable way to send someone straight to you.
          </p>
        </DocSection>

        <DocSection id="payments" title="Payments">
          <p>
            {brand.appName} does not process card payments for you today. Instead, you record what happened in the real
            world on each booking.
          </p>
          <p>On a booking you can set:</p>
          <BulletList
            items={[
              <>Payment status (unpaid, partially paid, paid, waived, refunded)</>,
              <>Payment method (for example cash or e-transfer—whatever you type in)</>,
              <>Amount and a short payment note</>,
            ]}
          />
          <p>
            That information helps you stay organized and feeds simple revenue counts where the app shows paid totals. It
            is not a replacement for your bank, accountant, or payment processor.
          </p>
        </DocSection>

        <DocSection id="analytics" title="Analytics">
          <p>
            The Analytics page offers a simple snapshot: booking counts, completed visits, no-shows, paid bookings, rough
            revenue from recorded paid amounts, and how many customers have booked more than once.
          </p>
          <p>When you have little or no activity yet, you will see a short prompt instead of empty charts.</p>
        </DocSection>

        <DocSection id="faq" title="Frequently asked questions">
          <dl className="space-y-6">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Is Handshake Local free to use?</dt>
              <dd className="mt-2">
                {brand.appName} is currently free for providers and clients while the network grows and the experience
                improves. If that changes, we will say so clearly.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can clients find me through Handshake Local?</dt>
              <dd className="mt-2">
                Yes—share your public link for the path that always works. If you publish your profile and opt in to
                discovery, you may also appear when search is available in your area.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Do I need to use all the features?</dt>
              <dd className="mt-2">
                No. Use profile, services, availability, and bookings first; add pricing tools, marketing, or analytics
                when they help you.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I still work with clients who contact me directly?</dt>
              <dd className="mt-2">
                Yes. Add them as customers or create manual bookings so your calendar and records stay in one place.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Does the app charge my clients&apos; cards?</dt>
              <dd className="mt-2">
                Not at this time. You collect payment however you already do, then mark the booking so your records stay
                clear.
              </dd>
            </div>
          </dl>
        </DocSection>
      </article>
    </main>
  );
}
