import { and, count, eq } from "drizzle-orm";
import { brand } from "@/config/brand";
import { getDb } from "@/db";
import { availabilityRules, customers, providers, services, users } from "@/db/schema";
import { asFormAction } from "@/lib/form-action";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { CsrfField } from "@/components/csrf-field";
import { ProfileProgressPanel } from "@/components/dashboard/profile/profile-progress-panel";
import { ProfileSectionCard } from "@/components/dashboard/profile/profile-section-card";
import { requireProvider } from "@/lib/tenancy";
import { updateProviderProfile, updateUsername } from "@/actions/provider-profile";
import { ProfileShell } from "@/app/dashboard/profile/profile-shell";
import { ProfileImageField } from "@/components/dashboard/profile/profile-image-field";
import { LocalAmbassadorCopyButton } from "@/components/dashboard/local-ambassador-copy-button";
import { LocalAmbassadorSection } from "@/components/dashboard/local-ambassador-section";
import { getPublicSiteOriginForUserFacingLinks } from "@/lib/server/public-site-origin";

type Props = { searchParams: Promise<{ saved?: string }> };

const inputClass = "mt-2 ui-input w-full";
const textareaClass = "mt-2 ui-textarea w-full min-h-[10rem] sm:min-h-[12rem]";
const textareaSmClass = "mt-2 ui-textarea w-full min-h-[6rem]";

export default async function ProfilePage({ searchParams }: Props) {
  const sp = await searchParams;
  const saved =
    sp.saved === "profile" ||
    sp.saved === "username" ||
    sp.saved === "visibility" ||
    sp.saved === "discovery";
  const u = await requireProvider();
  const db = getDb();
  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const [userRow] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  const [anyService] = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.providerId, u.providerId))
    .limit(1);
  const [activeRule] = await db
    .select({ id: availabilityRules.id })
    .from(availabilityRules)
    .where(and(eq(availabilityRules.providerId, u.providerId), eq(availabilityRules.isActive, true)))
    .limit(1);
  const [crmCustomersRow] = await db
    .select({ n: count() })
    .from(customers)
    .where(and(eq(customers.providerId, u.providerId), eq(customers.accountReady, true)));
  const crmCustomerCount = Number(crmCustomersRow?.n ?? 0);
  const csrf = await getCsrfTokenForForm();

  const hasServices = !!anyService;
  const hasAvailability = !!activeRule;
  const published = !!prov?.publicProfileEnabled;

  const profileDetailsDone =
    !!prov?.username?.trim() &&
    !!prov?.displayName?.trim() &&
    !!prov?.category?.trim() &&
    !!prov?.city?.trim() &&
    !!prov?.postalCode?.trim() &&
    !!prov?.countryCode?.trim();

  const readinessSteps = [
    {
      key: "profile",
      label: "Profile name & location",
      done: profileDetailsDone,
      href: "/dashboard/profile#profile-identity",
    },
    {
      key: "services",
      label: "Services you offer",
      done: hasServices,
      href: "/dashboard/services",
    },
    {
      key: "availability",
      label: "Times clients can book",
      done: hasAvailability,
      href: "/dashboard/availability",
    },
    {
      key: "customers",
      label: "Bring in existing customers",
      done: crmCustomerCount > 0,
      href: "/dashboard/onboarding/customers",
      optional: true,
    },
    {
      key: "publish",
      label: "Profile published",
      done: published,
      href: "/dashboard/profile#profile-visibility",
    },
  ];

  const requiredReadiness = readinessSteps.filter((s) => s.optional !== true);
  const completedReadiness = requiredReadiness.filter((s) => s.done).length;
  const progressPct = Math.round((completedReadiness / requiredReadiness.length) * 100);
  const allReady = requiredReadiness.length > 0 && completedReadiness === requiredReadiness.length;

  const missingLabels = readinessSteps
    .filter((s) => !s.done && s.optional !== true)
    .map((s) => s.label.toLowerCase());
  const subline = allReady
    ? "You’re set—keep your services and availability up to date as you grow."
    : missingLabels.length === 1
      ? `Next up: ${missingLabels[0]}.`
      : `Still to do: ${missingLabels.slice(0, 2).join(" · ")}${missingLabels.length > 2 ? "…" : ""}`;

  const aboutComplete = (prov?.bio?.trim().length ?? 0) >= 20;
  const previewHref = published && prov?.username ? `/${prov.username}` : null;
  const usernameLocked = prov?.usernameLockedAt != null;

  const usernameForUrl = prov?.username?.trim() ?? "";
  const publicSiteOrigin = await getPublicSiteOriginForUserFacingLinks();
  /** Host + path only (e.g. handshakelocal.com/your-name), from APP_URL or request host. */
  const publicProfileUrl = usernameForUrl.length
    ? (() => {
        const path = `/${encodeURIComponent(usernameForUrl)}`;
        const u = new URL(path, `${publicSiteOrigin}/`);
        return `${u.hostname}${u.pathname}`;
      })()
    : null;

  return (
    <main id="main-content">
      <ProfileShell usernameLocked={usernameLocked}>
        <div className="mx-auto max-w-[720px]">
          <header className="pt-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
            <p className="mt-3 max-w-prose text-base leading-relaxed text-[var(--muted)]">
              Set up your business presence—this is what clients see before they book.
            </p>
            {saved ? (
              <div className="ui-alert-success mt-6" role="status">
                <div className="font-semibold text-[var(--foreground)]">Saved</div>
                <div className="ui-hint mt-1 text-[var(--foreground)]">Your changes were applied.</div>
              </div>
            ) : null}

            {!userRow?.emailVerifiedAt ? (
              <div className="ui-card-flat mt-6 border-l-4 border-l-[var(--accent)] px-4 py-4">
                <div className="font-semibold text-[var(--foreground)]">Email not verified</div>
                <div className="ui-hint mt-1 leading-relaxed">
                  You can still publish your profile for now, but you’ll need to verify your email after April 1, 2026.
                </div>
              </div>
            ) : null}

            <ProfileProgressPanel
              headline={allReady ? "Your profile is ready" : "You’re almost ready to accept bookings"}
              subline={subline}
              progressPct={progressPct}
              steps={[...readinessSteps]}
              previewHref={previewHref}
              previewReady={!!previewHref}
            />
          </header>

          <div className="mt-10 flex flex-col gap-8 sm:mt-12 sm:gap-10">
            <ProfileImageField
              csrf={csrf}
              profileImageKey={prov?.profileImageKey ?? null}
              displayName={prov?.displayName ?? "Your business"}
            />
            {/* —— Public profile: page address —— */}
            <section id="profile-identity" className="scroll-mt-24 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                    Public profile (identity)
                  </h2>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--muted)]">
                    This is what clients will see on your public page.
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex shrink-0 items-center self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                    profileDetailsDone
                      ? "bg-[var(--success-bg)] text-[var(--success)] ring-1 ring-[var(--success-border)]"
                      : "bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[var(--accent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_25%,transparent)]",
                  ].join(" ")}
                >
                  {profileDetailsDone ? "Complete" : "Missing info"}
                </span>
              </div>

              <form id="username-form" action={asFormAction(updateUsername)} className="rounded-2xl bg-[var(--card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-7">
                <CsrfField token={csrf} />
                <input type="hidden" name="returnTo" value="/dashboard/profile#username-form" />
                <h3 className="text-base font-semibold text-[var(--foreground)]">Page address</h3>
                <p className="ui-hint mt-1">
                  Your public page lives at this path (for example, yourdomain.com/your-name).
                </p>
                {usernameLocked ? (
                  <p className="ui-hint mt-3 text-sm leading-relaxed">
                    Your page address is permanent and cannot be changed after it is set. It stays the same for
                    your clients and any links you have shared.
                  </p>
                ) : (
                  <p className="ui-hint mt-3 text-sm leading-relaxed">
                    Choose carefully—you will not be able to change this address after you save it here or finish
                    onboarding.
                  </p>
                )}
                <div className="mt-4">
                  <label className="text-sm font-medium" htmlFor="username">
                    Username (URL)
                  </label>
                  <input
                    id="username"
                    name="username"
                    defaultValue={prov?.username}
                    className={[inputClass, usernameLocked ? "cursor-not-allowed opacity-90" : ""].join(" ")}
                    required={!usernameLocked}
                    readOnly={usernameLocked}
                    aria-readonly={usernameLocked}
                  />
                </div>
                {publicProfileUrl ? (
                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--background))] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Public profile URL
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-[var(--foreground)]">{publicProfileUrl}</p>
                    </div>
                    <LocalAmbassadorCopyButton
                      text={publicProfileUrl}
                      className="ui-btn-secondary shrink-0 px-4 py-2 text-sm font-semibold"
                    >
                      Copy URL
                    </LocalAmbassadorCopyButton>
                  </div>
                ) : null}
              </form>
            </section>

            {/* —— Main profile form in grouped cards —— */}
            <form id="profile-form" action={asFormAction(updateProviderProfile)} className="flex flex-col gap-8 sm:gap-10">
              <CsrfField token={csrf} />
              <input type="hidden" name="returnTo" value="/dashboard/profile#profile-form" />

              <ProfileSectionCard
                id="profile-name-location"
                title="Name & location"
                description="These show on your public page and help the right clients find you."
                status={profileDetailsDone ? "complete" : "incomplete"}
              >
                <div className="grid gap-5 sm:gap-6">
                  <div>
                    <label htmlFor="displayName" className="text-sm font-medium">
                      Display name
                    </label>
                    <input
                      id="displayName"
                      name="displayName"
                      defaultValue={prov?.displayName}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="businessName" className="text-sm font-medium">
                      Business name
                    </label>
                    <input
                      id="businessName"
                      name="businessName"
                      defaultValue={prov?.businessName ?? ""}
                      className={inputClass}
                    />
                    <p className="ui-hint mt-1.5">Optional. Use if you trade under a different name.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="category" className="text-sm font-medium">
                        Category
                      </label>
                      <input id="category" name="category" defaultValue={prov?.category} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="city" className="text-sm font-medium">
                        City
                      </label>
                      <input id="city" name="city" defaultValue={prov?.city} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="countryCode" className="text-sm font-medium">
                        Country
                      </label>
                      <select
                        id="countryCode"
                        name="countryCode"
                        className={inputClass}
                        defaultValue={prov?.countryCode ?? "CA"}
                      >
                        <option value="CA">Canada</option>
                        <option value="US">United States</option>
                      </select>
                      <p className="ui-hint mt-1.5">Used for location-based discovery and geocoding.</p>
                    </div>
                    <div>
                      <label htmlFor="region" className="text-sm font-medium">
                        Province / state
                      </label>
                      <input
                        id="region"
                        name="region"
                        defaultValue={prov?.region ?? ""}
                        className={inputClass}
                        placeholder="e.g. ON, BC, CA"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="text-sm font-medium">
                      Postal code / ZIP
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      defaultValue={prov?.postalCode ?? ""}
                      className={inputClass}
                      placeholder="e.g. K1A 0A6 or 90210"
                      autoComplete="postal-code"
                    />
                    <p className="ui-hint mt-1.5">
                      Helps clients find you nearby. We use it to place your profile on the map—never shared as a full
                      street address.
                    </p>
                  </div>
                </div>
              </ProfileSectionCard>

              <ProfileSectionCard
                id="profile-visibility"
                title="Visibility"
                description="Control who can see your page and find you in search."
                status={published ? "complete" : "incomplete"}
              >
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                    <input
                      type="checkbox"
                      name="publicProfileEnabled"
                      value="on"
                      defaultChecked={prov?.publicProfileEnabled}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-[var(--foreground)]">Publish public profile</span>
                      <span className="mt-0.5 block text-[var(--muted)]">
                        Lets clients open your page and book from it.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                    <input
                      type="checkbox"
                      name="discoverable"
                      value="on"
                      defaultChecked={prov?.discoverable}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-[var(--foreground)]">Opt in to discovery</span>
                      <span className="mt-0.5 block text-[var(--muted)]">
                        When available in your area, helps new clients find your public profile through {brand.appName}.
                      </span>
                    </span>
                  </label>
                </div>
              </ProfileSectionCard>

              <ProfileSectionCard
                id="profile-about"
                title="About & details"
                description="Help clients understand how you work and where you serve."
                status={aboutComplete ? "complete" : "incomplete"}
              >
                <div className="grid gap-5 sm:gap-6">
                  <div>
                    <label htmlFor="websiteUrl" className="text-sm font-medium">
                      Website
                    </label>
                    <input
                      id="websiteUrl"
                      name="websiteUrl"
                      type="url"
                      defaultValue={prov?.websiteUrl ?? ""}
                      className={inputClass}
                      placeholder="https://your-site.com"
                    />
                    <p className="ui-hint mt-1.5">Optional. Shown on your public profile when set.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="socialFacebookUrl" className="text-sm font-medium">
                        Facebook page
                      </label>
                      <input
                        id="socialFacebookUrl"
                        name="socialFacebookUrl"
                        type="url"
                        defaultValue={prov?.socialFacebookUrl ?? ""}
                        className={inputClass}
                        placeholder="https://facebook.com/…"
                      />
                    </div>
                    <div>
                      <label htmlFor="socialInstagramUrl" className="text-sm font-medium">
                        Instagram
                      </label>
                      <input
                        id="socialInstagramUrl"
                        name="socialInstagramUrl"
                        type="url"
                        defaultValue={prov?.socialInstagramUrl ?? ""}
                        className={inputClass}
                        placeholder="https://instagram.com/…"
                      />
                    </div>
                    <div>
                      <label htmlFor="socialYoutubeUrl" className="text-sm font-medium">
                        YouTube
                      </label>
                      <input
                        id="socialYoutubeUrl"
                        name="socialYoutubeUrl"
                        type="url"
                        defaultValue={prov?.socialYoutubeUrl ?? ""}
                        className={inputClass}
                        placeholder="https://youtube.com/…"
                      />
                    </div>
                    <div>
                      <label htmlFor="socialTiktokUrl" className="text-sm font-medium">
                        TikTok
                      </label>
                      <input
                        id="socialTiktokUrl"
                        name="socialTiktokUrl"
                        type="url"
                        defaultValue={prov?.socialTiktokUrl ?? ""}
                        className={inputClass}
                        placeholder="https://tiktok.com/…"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={8}
                      defaultValue={prov?.bio}
                      className={textareaClass}
                      placeholder="A few sentences about what you offer and who you help."
                    />
                    <p className="ui-hint mt-2">
                      A clear bio builds trust—mention your style, experience, or what a first session looks like.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="serviceArea" className="text-sm font-medium">
                      Service area
                    </label>
                    <textarea
                      id="serviceArea"
                      name="serviceArea"
                      rows={4}
                      defaultValue={prov?.serviceArea}
                      className={textareaSmClass}
                      placeholder="Neighborhoods, remote, travel radius—whatever fits."
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contactEmail" className="text-sm font-medium">
                        Contact email
                      </label>
                      <input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        defaultValue={prov?.contactEmail ?? ""}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="contactPhone" className="text-sm font-medium">
                        Contact phone
                      </label>
                      <input
                        id="contactPhone"
                        name="contactPhone"
                        defaultValue={prov?.contactPhone ?? ""}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </ProfileSectionCard>

              <ProfileSectionCard
                id="profile-booking"
                title="Booking settings"
                description="Control when and how clients can book you."
                status="optional"
              >
                <div className="grid gap-5 sm:gap-6">
                  <div>
                    <label htmlFor="timezone" className="text-sm font-medium">
                      Timezone
                    </label>
                    <input id="timezone" name="timezone" defaultValue={prov?.timezone} className={inputClass} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="bookingLeadTimeMinutes" className="text-sm font-medium">
                        Minimum lead time (minutes)
                      </label>
                      <input
                        id="bookingLeadTimeMinutes"
                        name="bookingLeadTimeMinutes"
                        type="number"
                        min={0}
                        defaultValue={prov?.bookingLeadTimeMinutes}
                        className={inputClass}
                      />
                      <p className="ui-hint mt-1.5">How soon someone can book from “now.”</p>
                    </div>
                    <div>
                      <label htmlFor="bookingHorizonDays" className="text-sm font-medium">
                        Booking horizon (days)
                      </label>
                      <input
                        id="bookingHorizonDays"
                        name="bookingHorizonDays"
                        type="number"
                        min={1}
                        max={365}
                        defaultValue={prov?.bookingHorizonDays}
                        className={inputClass}
                      />
                      <p className="ui-hint mt-1.5">How far ahead your calendar stays open.</p>
                    </div>
                  </div>
                </div>
              </ProfileSectionCard>

              <ProfileSectionCard
                id="profile-payments"
                title="Payments & policies"
                description="What clients see about paying you and changing plans. Adjust anytime."
                status="optional"
                subdued
              >
                <div className="space-y-6">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-[var(--foreground)]">Payment methods</legend>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                      <input type="checkbox" name="paymentCash" defaultChecked={prov?.paymentCash} className="mt-0.5" />
                      <span>Cash</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                      <input
                        type="checkbox"
                        name="paymentEtransfer"
                        defaultChecked={prov?.paymentEtransfer}
                        className="mt-0.5"
                      />
                      <span>E-transfer</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                      <input
                        type="checkbox"
                        name="paymentInPersonCreditDebit"
                        defaultChecked={prov?.paymentInPersonCreditDebit}
                        className="mt-0.5"
                      />
                      <span>In person credit/debit</span>
                    </label>
                  </fieldset>

                  <div>
                    <label htmlFor="etransferDetails" className="text-sm font-medium">
                      E-transfer instructions
                    </label>
                    <textarea
                      id="etransferDetails"
                      name="etransferDetails"
                      rows={3}
                      defaultValue={prov?.etransferDetails}
                      className={textareaSmClass}
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                    <input
                      type="checkbox"
                      name="paymentDueBefore"
                      defaultChecked={prov?.paymentDueBeforeAppointment}
                      className="mt-0.5"
                    />
                    <span>Payment due before appointment</span>
                  </label>

                  <div>
                    <label htmlFor="cancellationPolicy" className="text-sm font-medium">
                      Cancellation policy
                    </label>
                    <textarea
                      id="cancellationPolicy"
                      name="cancellationPolicy"
                      rows={5}
                      defaultValue={prov?.cancellationPolicy}
                      className={textareaSmClass}
                    />
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-[var(--foreground)]">Reminders</legend>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                      <input type="checkbox" name="reminder24h" defaultChecked={prov?.reminder24h} className="mt-0.5" />
                      <span>24 hours before</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                      <input type="checkbox" name="reminder2h" defaultChecked={prov?.reminder2h} className="mt-0.5" />
                      <span>2 hours before</span>
                    </label>
                  </fieldset>
                </div>
              </ProfileSectionCard>
            </form>

            <LocalAmbassadorSection providerId={u.providerId} />
          </div>
        </div>
      </ProfileShell>
    </main>
  );
}
