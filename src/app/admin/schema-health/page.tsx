import { checkSchemaHealth, formatSchemaHealthSummary } from "@/domain/schema-health";

export default async function AdminSchemaHealthPage() {
  const result = await checkSchemaHealth();

  return (
    <main id="main-content" className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Schema health</h1>
      <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Read-only check against Postgres <code className="text-xs">information_schema</code>. This does not modify
        the database. If something is missing, run migrations against this environment (see{" "}
        <code className="text-xs">drizzle/</code> and <code className="text-xs">npm run db:migrate</code>).
      </p>

      <div
        className={`mt-8 rounded-xl border px-4 py-3 text-sm font-medium ${
          result.error
            ? "border-[color-mix(in_oklab,var(--error)_40%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] text-[var(--foreground)]"
            : result.ok
              ? "border-[color-mix(in_oklab,var(--success)_35%,var(--border))] bg-[color-mix(in_oklab,var(--success)_8%,var(--card))] text-[var(--foreground)]"
              : "border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_6%,var(--card))] text-[var(--foreground)]"
        }`}
        role="status"
      >
        {result.error
          ? "Check could not complete"
          : result.ok
            ? "Schema matches required tables/columns"
            : "Schema drift detected"}
      </div>

      <dl className="mt-6 grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-[var(--muted)]">Checked at</dt>
          <dd className="mt-1 font-mono text-xs text-[var(--foreground)]">{result.checkedAt}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--muted)]">Scope</dt>
          <dd className="mt-1 text-[var(--foreground)]">
            {result.checkedTables} table(s), {result.checkedColumns} required column check(s)
          </dd>
        </div>
        {result.error ? (
          <div>
            <dt className="font-medium text-[var(--error)]">Error</dt>
            <dd className="mt-1 font-mono text-xs text-[var(--foreground)]">{result.error}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-[var(--muted)]">Missing tables</dt>
          <dd className="mt-1">
            {result.missingTables.length === 0 ? (
              <span className="text-[var(--foreground)]">None</span>
            ) : (
              <ul className="list-inside list-disc font-mono text-xs text-[var(--foreground)]">
                {result.missingTables.map((m) => (
                  <li key={m.table}>{m.table}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--muted)]">Missing columns</dt>
          <dd className="mt-1">
            {result.missingColumns.length === 0 ? (
              <span className="text-[var(--foreground)]">None</span>
            ) : (
              <ul className="list-inside list-disc font-mono text-xs text-[var(--foreground)]">
                {result.missingColumns.map((m) => (
                  <li key={`${m.table}.${m.column}`}>
                    {m.table}.{m.column}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <section className="mt-10" aria-labelledby="schema-raw-heading">
        <h2 id="schema-raw-heading" className="text-sm font-semibold text-[var(--foreground)]">
          Summary (copy/paste)
        </h2>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] p-4 font-mono text-xs leading-relaxed text-[var(--foreground)]">
          {formatSchemaHealthSummary(result)}
        </pre>
      </section>
    </main>
  );
}
