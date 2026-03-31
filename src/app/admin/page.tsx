export default function AdminHomePage() {
  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-4 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Use the audit log to review sensitive actions. AI gateway controls are a stub until features are enabled via
        flags and environment. Schema health runs a read-only check that the database has tables and columns the app
        expects (helpful after deploys or migration drift).
      </p>
    </main>
  );
}
