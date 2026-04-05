import Link from "next/link";
import { listSeededProvidersForAdmin } from "@/lib/admin-seeded-queries";

function statusLabel(s: string): string {
  switch (s) {
    case "seeded":
      return "Seeded";
    case "invited":
      return "Invited";
    case "claimed":
      return "Claimed";
    default:
      return s;
  }
}

export default async function AdminSeededProvidersListPage() {
  const rows = await listSeededProvidersForAdmin();

  return (
    <main id="main-content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Seeded provider accounts</h1>
          <p className="mt-2 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Internal list of accounts created through the seeding tool and their handoff status.
          </p>
        </div>
        <Link
          href="/admin/providers/new-seeded"
          className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm"
        >
          Seed provider account
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <th className="px-3 py-2 font-medium">Business / display</th>
              <th className="px-3 py-2 font-medium">Login email</th>
              <th className="px-3 py-2 font-medium">Handoff target</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Claimed</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[var(--muted)]">
                  No seeded accounts yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.providerId} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.businessName || r.displayName}</div>
                    <div className="text-xs text-[var(--muted)]">{r.displayName}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.loginEmail}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.handoffTargetEmail ?? "—"}</td>
                  <td className="px-3 py-2">{statusLabel(r.handoffStatus)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{r.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {r.claimedAt ? r.claimedAt.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/providers/${r.providerId}/handoff`}
                        className="text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Handoff
                      </Link>
                      <Link
                        href={`/${r.username}`}
                        className="text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Public
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
