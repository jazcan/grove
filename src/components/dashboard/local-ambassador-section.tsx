import { ProfileSectionCard } from "@/components/dashboard/profile/profile-section-card";
import { LocalAmbassadorCopyButton } from "@/components/dashboard/local-ambassador-copy-button";
import { LocalAmbassadorInviteHelper } from "@/components/dashboard/local-ambassador-invite-helper";
import { loadLocalAmbassadorDashboard } from "@/domain/local-ambassador/dashboard-data";

function statusBadge(status: "invited" | "signed_up" | "activated") {
  const label =
    status === "activated" ? "Activated" : status === "signed_up" ? "Signed up" : "Invited";
  const cls =
    status === "activated"
      ? "bg-[var(--success-bg)] text-[var(--success)] ring-1 ring-[var(--success-border)]"
      : status === "signed_up"
        ? "bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[var(--accent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_25%,transparent)]"
        : "bg-[var(--surface-muted)] text-[var(--muted)] ring-1 ring-[var(--card-border)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export async function LocalAmbassadorSection({ providerId }: { providerId: string }) {
  const data = await loadLocalAmbassadorDashboard(providerId);
  const hasReferrals = data.total > 0;
  const title = hasReferrals ? "Local Ambassador" : "Become a Local Ambassador";
  const description = hasReferrals
    ? "Invite other local providers to Handshake Local. When they join and get set up, you’ll get credit for helping grow the community."
    : "Know another provider who would be a great fit for Handshake Local? Share your link and help them get started.";

  return (
    <ProfileSectionCard
      id="local-ambassador"
      title={title}
      description={description}
      status="optional"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Your link</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--foreground)]">{data.referralUrl}</p>
          </div>
          <LocalAmbassadorCopyButton
            text={data.referralUrl}
            className="ui-btn-secondary shrink-0 px-4 py-2 text-sm"
          >
            Copy link
          </LocalAmbassadorCopyButton>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Your code</span>
          <span className="font-mono text-sm font-semibold tracking-wide text-[var(--foreground)]">
            {data.referralCode}
          </span>
          <LocalAmbassadorCopyButton
            text={data.referralCode}
            className="ui-btn-secondary px-3 py-1.5 text-xs"
          >
            Copy code
          </LocalAmbassadorCopyButton>
        </div>

        {hasReferrals ? (
          <div className="flex flex-wrap gap-4 border-t border-[var(--card-border)] pt-4 text-sm">
            <div>
              <span className="text-[var(--muted)]">Total </span>
              <span className="font-semibold text-[var(--foreground)]">{data.total}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Signed up </span>
              <span className="font-semibold text-[var(--foreground)]">{data.signedUp}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Activated </span>
              <span className="font-semibold text-[var(--foreground)]">{data.activated}</span>
            </div>
          </div>
        ) : null}

        {hasReferrals && data.referrals.length > 0 ? (
          <div className="border-t border-[var(--card-border)] pt-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Your referrals</p>
            <ul className="mt-3 space-y-2">
              {data.referrals.map((r) => (
                <li
                  key={r.referralId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)]/30 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{r.displayLabel}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {statusBadge(r.status)}
                    <span className="text-xs text-[var(--muted)]">
                      {r.signedUpAt
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(r.signedUpAt)
                        : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <LocalAmbassadorInviteHelper referralUrl={data.referralUrl} />
      </div>
    </ProfileSectionCard>
  );
}
