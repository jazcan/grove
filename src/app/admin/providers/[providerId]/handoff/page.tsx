import { notFound } from "next/navigation";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { appUrl } from "@/lib/email";
import { getSeededProviderHandoffDetail } from "@/lib/admin-seeded-queries";
import { HandoffClient } from "./handoff-client";

type Props = { params: Promise<{ providerId: string }> };

export default async function AdminProviderHandoffPage({ params }: Props) {
  const { providerId } = await params;
  const row = await getSeededProviderHandoffDetail(providerId);
  if (!row) notFound();

  const csrf = await getCsrfTokenForForm();
  const appBaseUrl = appUrl();

  const detail = {
    providerId: row.providerId,
    username: row.username,
    displayName: row.displayName,
    businessName: row.businessName,
    loginEmail: row.loginEmail,
    handoffTargetEmail: row.handoffTargetEmail,
    handoffStatus: row.handoffStatus,
    handoffSentAt: row.handoffSentAt?.toISOString() ?? null,
    claimedAt: row.claimedAt?.toISOString() ?? null,
    internalAdminNotes: row.internalAdminNotes,
  };

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">Handoff provider account</h1>
      <p className="mt-3 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Transfer a seeded account to the real provider by setting their email and sending a password link.
      </p>
      <div className="mt-8">
        <HandoffClient csrfToken={csrf} appBaseUrl={appBaseUrl} detail={detail} />
      </div>
    </main>
  );
}
