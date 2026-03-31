# Schema health check

## What it does

- Compares a **curated list** of tables and columns (see `getRequiredSchema()` in `src/domain/schema-health.ts`) against **live Postgres metadata** (`information_schema.tables` / `information_schema.columns`).
- Exposes results at **`/admin/schema-health`** (admin users only) and logs to the server console when drift is detected.

## What it does not do

- It does **not** apply migrations or change the database.
- It does **not** guarantee every Drizzle table/column in the repo—only the ones we list as required for core and fragile flows.
- It does **not** replace runtime error handling; the app still degrades gracefully when specific features hit missing columns (e.g. provider dashboard signals).

## Fixing drift

The real fix for missing tables/columns is to run migrations against the target database:

```bash
DATABASE_URL="…" npm run db:migrate
```

Migration SQL files live in `drizzle/`. For example, `provider_dashboard_signals.metadata` is added in `drizzle/0009_provider_dashboard_signals_metadata.sql`.

## Local verification

1. Ensure `DATABASE_URL` in `.env.local` points at your local or staging DB.
2. Sign in as an **admin** user (`users.role = 'admin'`).
3. Open **`/admin/schema-health`** and confirm status matches expectations after migrations.

## For developers

- **`checkSchemaHealth(db?)`** — async; returns `SchemaHealthResult` with `ok`, `missingTables`, `missingColumns`, optional `error`.
- **`formatSchemaHealthSummary(result)`** — plain-text summary for logs or copy/paste.
- **`isRecoverableProviderDashboardSignalsError(e)`** — shared heuristic for graceful handling when the signals table is behind a migration; used by `src/domain/provider-dashboard-signals.ts`.
