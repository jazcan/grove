/**
 * Compares the live Postgres schema (tables/columns) against what the app expects.
 * Use for admin diagnostics and logging; fixing drift is still `npm run db:migrate` against production.
 */

import { sql } from "drizzle-orm";
import type { Database } from "@/db";
import { getDb } from "@/db";

// —— Types ——

export type RequiredTableSpec = {
  /** Logical area (auth, bookings, …) for maintainers reading the list. */
  feature: string;
  table: string;
  requiredColumns: string[];
};

export type RequiredSchema = {
  tables: RequiredTableSpec[];
};

export type MissingTable = {
  table: string;
};

export type MissingColumn = {
  table: string;
  column: string;
};

export type SchemaHealthResult = {
  ok: boolean;
  /** ISO timestamp when the check ran. */
  checkedAt: string;
  missingTables: MissingTable[];
  missingColumns: MissingColumn[];
  /** Number of table specs evaluated. */
  checkedTables: number;
  /** Total required column checks (sum of required columns per table). */
  checkedColumns: number;
  /** Set when the check could not finish (e.g. no DATABASE_URL, SQL error). */
  error?: string;
};

// —— Required schema (curated: fragile paths + core flows) ——

export function getRequiredSchema(): RequiredSchema {
  return {
    tables: [
      // auth — login/session
      {
        feature: "auth",
        table: "users",
        requiredColumns: ["id", "email", "password_hash", "role", "created_at", "updated_at"],
      },
      {
        feature: "auth",
        table: "sessions",
        requiredColumns: ["id", "user_id", "token_hash", "expires_at", "created_at"],
      },
      // providers — profile, onboarding, dashboard layout
      {
        feature: "providers",
        table: "providers",
        requiredColumns: [
          "id",
          "user_id",
          "username",
          "display_name",
          "public_profile_enabled",
          "discoverable",
          "timezone",
          "bookings_paused",
          "default_service_levels_enabled",
          "username_locked_at",
          "booking_lead_time_minutes",
          "booking_horizon_days",
          "created_at",
          "updated_at",
        ],
      },
      // dashboard signals — migration 0009 adds `metadata`; common production drift
      {
        feature: "dashboard_signals",
        table: "provider_dashboard_signals",
        requiredColumns: [
          "id",
          "provider_id",
          "signal_kind",
          "metadata",
          "first_seen_at",
          "last_seen_at",
          "occurrence_count",
          "dismissed_at",
        ],
      },
      // bookings / CRM — core scheduling
      {
        feature: "bookings",
        table: "bookings",
        requiredColumns: [
          "id",
          "provider_id",
          "service_id",
          "customer_id",
          "starts_at",
          "ends_at",
          "status",
          "payment_status",
          "selected_add_on_ids",
          "buffer_after_minutes",
          "created_at",
        ],
      },
      {
        feature: "crm",
        table: "customers",
        requiredColumns: [
          "id",
          "provider_id",
          "full_name",
          "email",
          "email_normalized",
          "account_ready",
          "account_claimed_at",
          "created_at",
          "updated_at",
        ],
      },
      {
        feature: "service_cards",
        table: "service_cards",
        requiredColumns: [
          "id",
          "provider_id",
          "booking_id",
          "customer_id",
          "service_performed_at",
          "service_name_snapshot",
          "work_summary",
          "created_at",
          "updated_at",
        ],
      },
      {
        feature: "crm",
        table: "customer_recommendations",
        requiredColumns: [
          "id",
          "provider_id",
          "customer_id",
          "title",
          "status",
          "suggested_timeframe",
          "created_at",
          "updated_at",
        ],
      },
      {
        feature: "services",
        table: "services",
        requiredColumns: [
          "id",
          "provider_id",
          "name",
          "duration_minutes",
          "buffer_minutes",
          "is_active",
          "created_at",
        ],
      },
      {
        feature: "availability",
        table: "availability_rules",
        requiredColumns: ["id", "provider_id", "day_of_week", "start_time_local", "end_time_local", "is_active"],
      },
      {
        feature: "audit",
        table: "audit_events",
        requiredColumns: ["id", "actor_type", "entity_type", "entity_id", "action", "metadata", "created_at"],
      },
      {
        feature: "platform_events",
        table: "platform_events",
        requiredColumns: [
          "id",
          "event_name",
          "aggregate_type",
          "aggregate_id",
          "payload",
          "occurred_at",
        ],
      },
    ],
  };
}

// —— Pure evaluation (testable without a database) ——

export function evaluateSchemaAgainstRequirements(
  required: RequiredSchema,
  existingTables: Set<string>,
  columnsByTable: Map<string, Set<string>>
): { missingTables: MissingTable[]; missingColumns: MissingColumn[] } {
  const missingTables: MissingTable[] = [];
  const missingColumns: MissingColumn[] = [];

  for (const spec of required.tables) {
    if (!existingTables.has(spec.table)) {
      missingTables.push({ table: spec.table });
      continue;
    }
    const cols = columnsByTable.get(spec.table);
    if (!cols) {
      missingTables.push({ table: spec.table });
      continue;
    }
    for (const col of spec.requiredColumns) {
      if (!cols.has(col)) {
        missingColumns.push({ table: spec.table, column: col });
      }
    }
  }

  return { missingTables, missingColumns };
}

/** Flatten Error.cause chain (Neon/serverless often wraps the pg error). */
export function collectPostgresErrorText(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let depth = 0; depth < 8 && cur !== null && cur !== undefined; depth++) {
    if (cur instanceof Error) {
      const c = (cur as Error & { code?: string }).code;
      if (c) parts.push(String(c));
      parts.push(cur.message);
      cur = cur.cause;
      continue;
    }
    if (typeof cur === "object" && cur !== null) {
      const o = cur as Record<string, unknown>;
      if (o.code != null) parts.push(String(o.code));
      if (typeof o.message === "string") parts.push(o.message);
      break;
    }
    parts.push(String(cur));
    break;
  }
  return parts.join(" | ");
}

/**
 * Heuristic: likely Postgres undefined_column (42703) or equivalent message, optionally scoped to table/column.
 */
export function isMissingColumnError(
  e: unknown,
  opts?: { table?: string; column?: string }
): boolean {
  const text = collectPostgresErrorText(e);
  const lower = text.toLowerCase();
  const table = opts?.table?.toLowerCase();
  const column = opts?.column?.toLowerCase();

  if (text.includes("42703")) {
    if (!table && !column) return true;
    if (table && lower.includes(table)) return true;
    if (column && lower.includes(column)) return true;
    return true;
  }
  if (/column\s+.+\s+does not exist/i.test(text)) {
    if (column && lower.includes(column)) return true;
    if (table && lower.includes(table)) return true;
    return !table && !column;
  }
  return false;
}

/**
 * Same rules as before in provider-dashboard-signals: tolerate missing columns on signals table,
 * but not a completely missing relation (caller should fix migrations).
 */
export function isRecoverableProviderDashboardSignalsError(e: unknown): boolean {
  const text = collectPostgresErrorText(e);
  if (/relation\s+"?provider_dashboard_signals"?\s+does not exist/i.test(text)) {
    return false;
  }
  if (text.includes("42703")) return true;
  if (/column\s+"?metadata"?\s+does not exist/i.test(text)) return true;
  if (/column\s+.+does not exist/i.test(text) && text.toLowerCase().includes("provider_dashboard_signals")) {
    return true;
  }
  return false;
}

export function formatSchemaHealthSummary(result: SchemaHealthResult): string {
  if (result.error) {
    return `Schema health: FAILED TO RUN (${result.error})`;
  }
  const mt = result.missingTables.map((m) => m.table).join(", ") || "none";
  const mc =
    result.missingColumns.map((m) => `${m.table}.${m.column}`).join(", ") || "none";
  return [
    result.ok ? "Schema health: OK" : "Schema health: DRIFT DETECTED",
    `Checked at: ${result.checkedAt}`,
    `Tables checked: ${result.checkedTables} (column checks: ${result.checkedColumns})`,
    `Missing tables: ${mt}`,
    `Missing columns: ${mc}`,
  ].join("\n");
}

function escapeSqlLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

type InfoSchemaRow = {
  table_name: string;
  column_name: string;
};

/** Load public schema table/column presence from information_schema. */
async function loadLiveSchema(db: Database): Promise<{
  existingTables: Set<string>;
  columnsByTable: Map<string, Set<string>>;
}> {
  const required = getRequiredSchema();
  const tableNames = [...new Set(required.tables.map((t) => t.table))];
  if (tableNames.length === 0) {
    return { existingTables: new Set(), columnsByTable: new Map() };
  }

  const inTables = sql.join(
    tableNames.map((name) => sql.raw(`'${escapeSqlLiteral(name)}'`)),
    sql`, `
  );

  const columnRows = await db.execute(sql`
    SELECT table_name::text AS table_name, column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (${inTables})
  `);

  const tableRows = await db.execute(sql`
    SELECT table_name::text AS table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (${inTables})
  `);

  const existingTables = new Set<string>();
  for (const row of tableRows as unknown as { table_name: string }[]) {
    existingTables.add(row.table_name);
  }

  const columnsByTable = new Map<string, Set<string>>();
  for (const row of columnRows as unknown as InfoSchemaRow[]) {
    const t = row.table_name;
    const c = row.column_name;
    if (!columnsByTable.has(t)) columnsByTable.set(t, new Set());
    columnsByTable.get(t)!.add(c);
  }

  return { existingTables, columnsByTable };
}

/**
 * Verify required tables/columns against Postgres metadata. Safe: never throws; errors become `result.error`.
 */
export async function checkSchemaHealth(db?: Database): Promise<SchemaHealthResult> {
  const checkedAt = new Date().toISOString();
  const required = getRequiredSchema();
  let checkedTables = 0;
  let checkedColumns = 0;
  for (const t of required.tables) {
    checkedTables += 1;
    checkedColumns += t.requiredColumns.length;
  }

  let database: Database;
  try {
    database = db ?? getDb();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[schema-health] Cannot connect (DATABASE_URL missing?)", msg);
    return {
      ok: false,
      checkedAt,
      missingTables: [],
      missingColumns: [],
      checkedTables,
      checkedColumns,
      error: msg,
    };
  }

  try {
    const { existingTables, columnsByTable } = await loadLiveSchema(database);
    const { missingTables, missingColumns } = evaluateSchemaAgainstRequirements(
      required,
      existingTables,
      columnsByTable
    );

    const ok = missingTables.length === 0 && missingColumns.length === 0;
    if (!ok) {
      console.error("[schema-health] Schema drift vs app expectations", {
        checkedAt,
        missingTables,
        missingColumns,
      });
    }

    return {
      ok,
      checkedAt,
      missingTables,
      missingColumns,
      checkedTables,
      checkedColumns,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[schema-health] Check failed", msg, e);
    return {
      ok: false,
      checkedAt,
      missingTables: [],
      missingColumns: [],
      checkedTables,
      checkedColumns,
      error: msg,
    };
  }
}
