# Grove

Service-commerce platform for solo and small providers: public profiles, services, availability, bookings, offline payment tracking, notifications (email + queue), lightweight CRM, marketplace discovery, analytics, and admin audit tooling.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Optional: Redis (for BullMQ notification worker)

## Setup

1. Copy [`.env.example`](./.env.example) to `.env` and set `DATABASE_URL`, `SESSION_SECRET` (32+ chars), `CSRF_SECRET` (16+ chars), and `APP_URL`.

2. Install and migrate:

```bash
npm install
npx drizzle-kit push
npm run db:seed
```

- **`drizzle-kit push`** updates the database schema only (columns, tables, types).
- It does **not** run the `INSERT` blocks inside numbered migration files under `drizzle/` (for example the canonical template rows in `0004_canonical_service_templates.sql`).
- **Repair:** run **`npm run db:seed`** against the target database, or rely on **automatic backfill on first read** (any code path that uses `listCanonicalTemplatesForUi`, `getServiceDefaultsForCanonicalSlug`, or `getCanonicalTemplateRowBySlug` calls `ensureCanonicalTemplates` first—e.g. opening **Dashboard → Services**).

3. Run the app:

```bash
npm run dev
```

If the site returns **HTTP 500** locally after switching branches, running `build` alongside `dev`, or seeing errors like `Cannot find module './….js'` under `.next`, reset the Next cache and restart:

```bash
npm run clean && npm run dev
```

4. Optional — process notification jobs (requires `REDIS_URL`):

```bash
npm run worker
```

## Production database (e.g. Vercel + Neon)

The app expects your **production** Postgres schema to match [`src/db/schema.ts`](./src/db/schema.ts). If deploys work but pages error with `column "…" does not exist`, migrations were not applied to that database.

**Recommended:** from your machine, point at the production URL (Vercel → Settings → Environment Variables → `DATABASE_URL`, or Neon’s connection string) and sync the schema:

```bash
DATABASE_URL="postgresql://…" npx drizzle-kit push
```

Use the **pooled** or **direct** Neon URL your project already uses; no need to commit secrets.

**Alternative:** in Neon (or any SQL client), run the statements in order from [`drizzle/`](./drizzle/) for migrations you have not applied yet—for example [`drizzle/0007_bookings_paused.sql`](./drizzle/0007_bookings_paused.sql) adds `bookings_paused` on `providers`.

## Scripts

| Script        | Description                          |
| ------------- | ------------------------------------ |
| `npm run dev` | Next.js dev server                   |
| `npm run clean` | Delete `.next` (fixes stale dev/build cache) |
| `npm run build` / `start` | Production build / server |
| `npm run lint` | ESLint                              |
| `npm run test` | Vitest                              |
| `npm run db:push` | Apply schema (`drizzle-kit push`) |
| `npm run db:seed` | Default message templates + flags |
| `npm run worker` | BullMQ worker for email jobs   |
| `npm run audit` | `npm audit --audit-level=high`   |
| `npm run uat:env` | Check required env vars for manual UAT |
| `npm run playwright:install` | Download Chromium into `.playwright-browsers/` for UAT e2e |
| `npm run uat:e2e` | Playwright checks aligned with [docs/UAT.md](./docs/UAT.md) |

## UAT

Step-by-step acceptance checklists live in [docs/UAT.md](./docs/UAT.md). With Postgres migrated and seeded, run `npm run playwright:install` once (downloads Chromium into `.playwright-browsers/`, gitignored), then `npm run uat:env`, start the app (`npm run dev`) or let Playwright start it, then `npm run uat:e2e`. Optional admin coverage: set `UAT_ADMIN_EMAIL` and `UAT_ADMIN_PASSWORD` for an account that was created while its email was listed in `ADMIN_EMAILS`. To use an already-running dev server only: `UAT_SKIP_WEBSERVER=1 npm run uat:e2e`.

## Admin users

Set `ADMIN_EMAILS` to a comma-separated list of emails. New sign-ups matching those emails receive the `admin` role (no provider tenant).

## Architecture notes

- Multi-tenant boundaries are enforced in server actions (`providerId` from session, never from the client).
- Public routes use usernames; reserved slugs are blocked in [`src/lib/reserved-usernames.ts`](./src/lib/reserved-usernames.ts).
- Booking creation uses a transaction with `FOR UPDATE` overlap checks and buffer-aware intervals.
- CSRF uses a signed cookie set in the root layout plus hidden form fields.

## License

Private / unlicensed unless you add one.
