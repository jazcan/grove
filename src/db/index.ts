import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Reuse one pool per Node process. In dev, HMR re-evaluates this module and
 * would otherwise create new pools without closing old ones → "too many clients already".
 */
const globalForDb = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>;
  drizzleDb?: Database;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const isDev = process.env.NODE_ENV === "development";
  return postgres(connectionString, {
    // Fewer connections in dev; hot reload used to multiply pools before global reuse.
    max: isDev ? 3 : 10,
    idle_timeout: isDev ? 20 : 0,
    max_lifetime: isDev ? 60 * 30 : 0,
  });
}

export function getDb(): Database {
  if (globalForDb.drizzleDb) {
    return globalForDb.drizzleDb;
  }
  const client = createClient();
  globalForDb.postgresClient = client;
  globalForDb.drizzleDb = drizzle(client, { schema });
  return globalForDb.drizzleDb;
}
