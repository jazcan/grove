import { getCsrfTokenForForm } from "@/lib/csrf";
import { appUrl } from "@/lib/email";
import { SeedProviderForm } from "./seed-form";

export default async function AdminNewSeededProviderPage() {
  const csrf = await getCsrfTokenForForm();
  const appBaseUrl = appUrl();

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">Seed provider account</h1>
      <p className="mt-3 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Create a provider login with a temporary email, a full profile, and optional starter services. Use the handoff
        flow when the real provider is ready to take over.
      </p>
      <div className="mt-8">
        <SeedProviderForm csrfToken={csrf} appBaseUrl={appBaseUrl} />
      </div>
    </main>
  );
}
