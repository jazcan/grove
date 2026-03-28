import { getDb } from "@/db";
import { aiUsageLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function AdminAiPage() {
  const enabled = await isFeatureEnabled("ai_gateway");
  const db = getDb();
  const rows = await db
    .select()
    .from(aiUsageLogs)
    .orderBy(desc(aiUsageLogs.createdAt))
    .limit(50);

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">AI gateway</h1>
      <p className="mt-2 text-sm">
        Feature flag <code className="rounded bg-[var(--border)] px-1">ai_gateway</code>:{" "}
        <strong>{enabled ? "on" : "off"}</strong>
      </p>
      <p className="mt-4 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        All LLM calls must go through a server-side gateway with quotas and logging. No public AI endpoints ship in
        Grove v1; this page surfaces usage once recorded.
      </p>
      <h2 className="mt-8 text-lg font-medium">Recent usage</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.length ? (
          rows.map((r) => (
            <li key={r.id} className="rounded border px-3 py-2">
              {r.createdAt.toISOString()} — {r.feature} / {r.model} — prompt {r.promptTokens} / completion{" "}
              {r.completionTokens}
            </li>
          ))
        ) : (
          <li className="text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">No usage logged yet.</li>
        )}
      </ul>
    </main>
  );
}
