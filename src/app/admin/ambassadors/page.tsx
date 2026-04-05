import Link from "next/link";
import { loadAdminAmbassadorSummary } from "@/domain/local-ambassador/dashboard-data";

export default async function AdminAmbassadorsPage() {
  const { totalReferrals, activatedReferrals, topReferrers } = await loadAdminAmbassadorSummary();

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold tracking-tight">Local Ambassador referrals</h1>
      <p className="mt-2 max-w-prose text-sm text-[var(--muted)]">
        High-level view of direct provider referrals. No payouts or multi-level data—attribution only.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total referrals</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{totalReferrals}</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Activated</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{activatedReferrals}</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Top referring providers</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">By number of direct referrals with a linked account.</p>
        {topReferrers.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No referral data yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--card-border)] bg-[var(--surface-muted)]/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Provider</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Public username</th>
                  <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Referrals</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((row) => (
                  <tr key={row.providerId} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--foreground)]">{row.displayName}</td>
                    <td className="px-4 py-3">
                      <Link href={`/${row.username}`} className="ui-link font-medium">
                        {row.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--foreground)]">{row.referralCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
