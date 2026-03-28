import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

export default async function AdminAuditPage() {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(200);

  return (
    <main id="main-content">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((e) => (
          <li key={e.id} className="rounded border border-[var(--border)] px-3 py-2">
            <span className="font-medium">{e.createdAt.toISOString()}</span> — {e.actorType} — {e.action} on{" "}
            {e.entityType}/{e.entityId}
            {e.tenantProviderId ? ` (tenant ${e.tenantProviderId})` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
