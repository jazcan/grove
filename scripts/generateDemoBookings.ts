/**
 * =============================================================================
 * DEMO BOOKING GENERATOR (standalone script)
 * =============================================================================
 *
 * What this does (high level):
 * - Finds one provider by id, login email, or public username.
 * - Inserts fake customers (clearly fake emails) for that provider only.
 * - Creates ~1 month of non-overlapping bookings using that provider’s real
 *   services (duration + buffer match each service row).
 * - Uses the same booking creation path as the app (`createBookingAtomic`) so
 *   overlap rules, pricing fields, and template links stay consistent.
 *
 * What this does NOT do:
 * - It does not change application code or delete any rows.
 * - It is safe to run twice: existing demo customers are reused by email;
 *   new bookings are always inserted (watch for calendar clutter if you re-run).
 *
 * -----------------------------------------------------------------------------
 * PREREQUISITES (read this if you are new to running scripts)
 * -----------------------------------------------------------------------------
 *
 * 1) You need Node.js installed (the same one you use for `npm run dev`).
 *
 * 2) Your database connection string must be available as DATABASE_URL.
 *    This project usually keeps it in a file named `.env` or `.env.local`
 *    in the project root. This script loads those files automatically
 *    (same idea as `scripts/uat-env-check.ts`).
 *
 * 3) From the project root folder (the folder that contains `package.json`),
 *    run the command shown under "How to run" in the comment at the bottom.
 *
 * -----------------------------------------------------------------------------
 * How to run (copy/paste from project root)
 * -----------------------------------------------------------------------------
 *
 *   npx tsx scripts/generateDemoBookings.ts
 *
 * Optional: pass a provider identifier (defaults to clean@tidywithtalia.com):
 *
 *   npx tsx scripts/generateDemoBookings.ts your-provider-username
 *   npx tsx scripts/generateDemoBookings.ts provider-uuid-here
 *
 * =============================================================================
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { bookings, customers, providers, services, users } from "@/db/schema";
import { createBookingAtomic } from "@/domain/bookings/create-booking";
import { computePublicBookingPrice } from "@/domain/pricing/compute-public-booking-price";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

// ---------------------------------------------------------------------------
// Environment loading (beginner-friendly: no need to export DATABASE_URL by hand)
// ---------------------------------------------------------------------------

/** Load `.env.local` then `.env` from the repo root if variables are missing. */
function loadEnvFiles(): void {
  const root = process.cwd();
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function fail(msg: string): never {
  console.error(`[demo-bookings] ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

/** Loose UUID shape check (provider + user ids in this app are UUIDs). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function looksLikeUuid(s: string): boolean {
  return UUID_RE.test(s);
}

type ResolvedProvider = {
  id: string;
  timezone: string;
  paymentCash: boolean;
  paymentEtransfer: boolean;
  paymentInPersonCreditDebit: boolean;
};

/**
 * Resolve a provider from:
 * - providers.id (UUID)
 * - users.id (UUID) → linked provider row
 * - users.email (login email)
 * - providers.username (public handle)
 */
async function resolveProvider(identifier: string): Promise<ResolvedProvider> {
  const db = getDb();
  const raw = identifier.trim();
  if (!raw) fail("Provider identifier is empty.");

  const trySelect = async (condition: SQL) => {
    const rows = await db
      .select({
        id: providers.id,
        timezone: providers.timezone,
        paymentCash: providers.paymentCash,
        paymentEtransfer: providers.paymentEtransfer,
        paymentInPersonCreditDebit: providers.paymentInPersonCreditDebit,
      })
      .from(providers)
      .innerJoin(users, eq(providers.userId, users.id))
      .where(condition)
      .limit(1);
    return rows[0];
  };

  if (looksLikeUuid(raw)) {
    const byProvider = await trySelect(eq(providers.id, raw));
    if (byProvider) return byProvider;
    const byUser = await trySelect(eq(users.id, raw));
    if (byUser) return byUser;
    fail(`No provider found for UUID: ${raw}`);
  }

  if (raw.includes("@")) {
    const norm = normalizeEmail(raw);
    const row = await trySelect(eq(users.email, norm));
    if (!row) fail(`No provider found for login email: ${raw}`);
    return row;
  }

  const row = await trySelect(sql`lower(${providers.username}) = ${raw.toLowerCase()}`);
  if (!row) fail(`No provider found for username: ${raw}`);
  return row;
}

// ---------------------------------------------------------------------------
// Fake customer factory (obviously fake — do not use real people’s data)
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "Fay",
  "Riley",
  "Jordan",
  "Casey",
  "Quinn",
  "Avery",
  "Skyler",
  "Morgan",
  "Jamie",
  "Drew",
  "Blair",
  "Sage",
  "River",
  "Phoenix",
  "Rowan",
  "Emerson",
  "Finley",
  "Hayden",
  "Reese",
  "Parker",
];

const LAST_NAMES = [
  "Demo",
  "Sample",
  "Testperson",
  "Fakename",
  "Placeholder",
  "Mock",
  "Sandbox",
  "Staging",
  "Fixture",
  "Seeddata",
];

/** Stable fake emails so re-runs can reuse the same CRM rows. */
function fakeEmail(index: number): string {
  const n = String(index + 1).padStart(3, "0");
  return `grove.democlient.${n}@demo-booking-fake.invalid`;
}

function fakeFullName(index: number): string {
  const a = FIRST_NAMES[index % FIRST_NAMES.length];
  const b = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${a} ${b} ${index + 1}`;
}

/** Fake phone so services with phoneRequired still validate in the UI. */
function fakePhone(index: number): string {
  const tail = String(5550000 + index).padStart(7, "0");
  return `555-${tail.slice(0, 3)}-${tail.slice(3)}`;
}

// ---------------------------------------------------------------------------
// Scheduling helpers (overlap uses the same idea as createBookingAtomic SQL)
// ---------------------------------------------------------------------------

type BlockedInterval = {
  /** Unix ms when the appointment starts */
  startMs: number;
  /** Unix ms when the appointment ends (service duration only — not buffer) */
  endMs: number;
  /** Buffer after the appointment, copied from services.bufferMinutes */
  bufferAfterMinutes: number;
};

/** End of “blocked” time on the calendar, including cleanup/travel buffer */
function blockEndMs(row: BlockedInterval): number {
  return row.endMs + row.bufferAfterMinutes * 60_000;
}

/** True if two bookings conflict (respecting each row’s buffer-after). */
function intervalsConflict(a: BlockedInterval, b: BlockedInterval): boolean {
  return a.startMs < blockEndMs(b) && b.startMs < blockEndMs(a);
}

function pickPaymentMethod(p: ResolvedProvider): string | null {
  const opts: string[] = [];
  if (p.paymentCash) opts.push("cash");
  if (p.paymentEtransfer) opts.push("etransfer");
  if (p.paymentInPersonCreditDebit) opts.push("in_person_credit_debit");
  if (!opts.length) return null;
  return opts[Math.floor(Math.random() * opts.length)] ?? null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const DEFAULT_PROVIDER_IDENTIFIER = "clean@tidywithtalia.com";
const TARGET_CUSTOMER_COUNT = 55;
/** Aim for a busy but not packed month */
const TARGET_BOOKING_COUNT = 62;
const WINDOW_DAYS = 30;
const MAX_PLACE_ATTEMPTS = 4000;

async function main() {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    fail(
      "DATABASE_URL is not set. Add it to `.env` or `.env.local` in the project root, then try again."
    );
  }

  const identifier = (process.argv[2] ?? DEFAULT_PROVIDER_IDENTIFIER).trim();
  console.log(`[demo-bookings] Resolving provider: ${identifier}`);

  const db = getDb();
  const provider = await resolveProvider(identifier);

  const serviceRows = await db
    .select({
      id: services.id,
      durationMinutes: services.durationMinutes,
      bufferMinutes: services.bufferMinutes,
      notesRequired: services.notesRequired,
      phoneRequired: services.phoneRequired,
    })
    .from(services)
    .where(and(eq(services.providerId, provider.id), eq(services.isActive, true)));

  if (!serviceRows.length) {
    fail("This provider has no active services. Add services in the dashboard first.");
  }

  await ensureDefaultPricingProfile(db, provider.id);

  // --- Customers ---
  let customersInserted = 0;
  const customerIds: string[] = [];

  for (let i = 0; i < TARGET_CUSTOMER_COUNT; i++) {
    const email = fakeEmail(i);
    const fullName = fakeFullName(i);
    const phone = fakePhone(i);
    const emailNorm = normalizeEmail(email);
    const phoneNorm = normalizePhone(phone);

    const [inserted] = await db
      .insert(customers)
      .values({
        providerId: provider.id,
        fullName,
        email,
        emailNormalized: emailNorm,
        phone,
        phoneNormalized: phoneNorm,
      })
      .onConflictDoNothing({
        target: [customers.providerId, customers.emailNormalized],
      })
      .returning({ id: customers.id });

    if (inserted) {
      customersInserted++;
      customerIds.push(inserted.id);
    } else {
      const [existing] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(eq(customers.providerId, provider.id), eq(customers.emailNormalized, emailNorm))
        )
        .limit(1);
      if (!existing) fail(`Expected existing customer for ${email} but none was found.`);
      customerIds.push(existing.id);
    }
  }

  // --- Bookings ---
  const zone = provider.timezone || "America/Toronto";
  const todayStart = DateTime.now().setZone(zone).startOf("day");
  const windowStart = todayStart.minus({ days: WINDOW_DAYS });

  const placed: BlockedInterval[] = [];
  const createdBookingIds: string[] = [];
  const repeatPool: string[] = [];
  let bookingsCreated = 0;

  for (let attempt = 0; attempt < MAX_PLACE_ATTEMPTS && bookingsCreated < TARGET_BOOKING_COUNT; attempt++) {
    // Pick a random day in the window (weighted toward weekdays).
    const dayOffset = Math.floor(Math.random() * WINDOW_DAYS);
    const day = windowStart.plus({ days: dayOffset });
    const weekday = day.weekday; // 1 = Monday ... 7 = Sunday
    const isWeekend = weekday === 6 || weekday === 7;
    if (isWeekend && Math.random() < 0.78) {
      continue;
    }

    // Random “gap” days — not every weekday gets bookings
    if (!isWeekend && Math.random() < 0.12) {
      continue;
    }

    const svc = serviceRows[Math.floor(Math.random() * serviceRows.length)]!;
    const duration = svc.durationMinutes;
    const buffer = svc.bufferMinutes;

    // Business hours: first possible start 9:00, last start so the service ends by 17:00
    const dayStart = day.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    const workEnd = day.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
    const lastStart = workEnd.minus({ minutes: duration });
    if (lastStart < dayStart) {
      continue;
    }

    const slotMinutesTotal = Math.floor(lastStart.diff(dayStart, "minutes").minutes / 15);
    if (slotMinutesTotal < 0) continue;
    const slotIndex = Math.floor(Math.random() * (slotMinutesTotal + 1));
    const startsLocal = dayStart.plus({ minutes: slotIndex * 15 });
    const startsAt = startsLocal.toUTC().toJSDate();
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    const candidate: BlockedInterval = {
      startMs: startsAt.getTime(),
      endMs: endsAt.getTime(),
      bufferAfterMinutes: buffer,
    };

    if (placed.some((p) => intervalsConflict(p, candidate))) {
      continue;
    }

    // Repeat customers: once we have a pool, bias toward reusing some ids
    let customerId: string;
    if (repeatPool.length > 0 && Math.random() < 0.48) {
      customerId = repeatPool[Math.floor(Math.random() * repeatPool.length)]!;
    } else {
      customerId = customerIds[Math.floor(Math.random() * customerIds.length)]!;
    }

    const priced = await computePublicBookingPrice(db, {
      providerId: provider.id,
      serviceId: svc.id,
      positioningTierId: null,
      selectedAddOnIds: [],
      tipPercent: 0,
    });
    if ("error" in priced) {
      fail(
        `Pricing error for service ${svc.id}: ${priced.error}. Check pricing profile / tiers in the app.`
      );
    }

    const isPast = startsAt.getTime() < Date.now();
    const paymentStatus: "paid" | "unpaid" = isPast ? "paid" : "unpaid";

    const notesText =
      svc.notesRequired
        ? "Demo booking — please disregard. (Auto-generated notes for a service that requires them.)"
        : Math.random() < 0.35
          ? ""
          : "Demo note: please ignore.";

    try {
      const created = await createBookingAtomic(db, {
        providerId: provider.id,
        serviceId: svc.id,
        startsAt,
        endsAt,
        bufferAfterMinutes: buffer,
        existingCustomerId: customerId,
        customerName: "",
        customerEmail: "",
        customerNotes: notesText,
        paymentMethod: pickPaymentMethod(provider),
        positioningTierId: priced.tierId,
        selectedAddOnIds: priced.selectedAddOnIds,
        paymentAmount: priced.grandTotal.toFixed(2),
        tipPercent: priced.tipPercent.toFixed(2),
        initialPaymentStatus: paymentStatus,
      });

      placed.push(candidate);
      createdBookingIds.push(created.bookingId);
      if (!repeatPool.includes(customerId)) repeatPool.push(customerId);
      bookingsCreated++;
    } catch (e) {
      if (e instanceof Error && e.message === "SLOT_TAKEN") {
        continue;
      }
      throw e;
    }
  }

  if (bookingsCreated < TARGET_BOOKING_COUNT) {
    console.warn(
      `[demo-bookings] Warning: only placed ${bookingsCreated}/${TARGET_BOOKING_COUNT} bookings after ${MAX_PLACE_ATTEMPTS} attempts. Try increasing MAX_PLACE_ATTEMPTS or WINDOW_DAYS.`
    );
  }

  // Past appointments read better as “completed” in the dashboard; the atomic
  // creator always starts as `pending` (same as real public bookings).
  const nowJs = new Date();
  if (createdBookingIds.length) {
    await db
      .update(bookings)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.providerId, provider.id),
          inArray(bookings.id, createdBookingIds),
          lt(bookings.startsAt, nowJs)
        )
      );

    // Sprinkle a few future ones as “confirmed” so the list isn’t only pending
    const futureIds = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, provider.id),
          inArray(bookings.id, createdBookingIds),
          gte(bookings.startsAt, nowJs)
        )
      );

    const confirmCount = Math.min(8, futureIds.length);
    const shuffled = [...futureIds].sort(() => Math.random() - 0.5);
    const toConfirm = shuffled.slice(0, confirmCount).map((r) => r.id);
    if (toConfirm.length) {
      await db
        .update(bookings)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(and(eq(bookings.providerId, provider.id), inArray(bookings.id, toConfirm)));
    }
  }

  console.log("");
  console.log("[demo-bookings] Done.");
  console.log(`  • Customers inserted (new rows only): ${customersInserted}`);
  console.log(`  • Total demo customer ids available this run: ${customerIds.length}`);
  console.log(`  • Bookings created: ${bookingsCreated}`);
  console.log("");
  console.log("Open the provider dashboard → Bookings / Calendar to review.");
}

main().catch((err) => {
  console.error("[demo-bookings] Fatal error:", err);
  process.exit(1);
});
