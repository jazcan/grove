/**
 * Demo provider: massage therapy / wellness practice (Handshake Local).
 * Dense appointment calendar, repeat clients, accounting — Florenceville-Bristol, NB.
 *
 * Run: npm run db:seed:demo:massage
 *
 * Idempotent: deletes and recreates ONLY the user identified by DEMO_EMAIL (no other demos touched).
 *
 * "Demo today" is fixed to 2026-04-05 (America/Moncton) so results are reproducible.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { count, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { closeDbConnection, getDb } from "@/db";
import { ensureCanonicalTemplates } from "@/db/ensure-canonical-templates";
import {
  assistantEvents,
  assistantPreferences,
  assistantSuggestions,
  availabilityRules,
  blockedTimes,
  bookings,
  canonicalServiceTemplates,
  customerRecommendations,
  customers,
  expenseRecords,
  incomeRecords,
  marketingCampaigns,
  marketingSavedContents,
  providerDashboardSignals,
  providers,
  serviceAddOnOverrides,
  serviceCards,
  services,
  users,
} from "@/db/schema";
import { syncIncomeRecordFromBooking } from "@/domain/money/sync-income-from-booking";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { allocateUniqueReferralCode } from "@/domain/local-ambassador/referral-code";
import { BOOKING_FAILED_SIGNAL_KIND } from "@/domain/provider-dashboard-signals.shared";
import { hashPassword } from "@/lib/password";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

const DEMO_EMAIL = "massage.demo@handshakelocal.test";
const DEMO_PASSWORD = "MassageDemo2026!";
const DEMO_USERNAME = "riverbend-wellness-massage";
const TZ = "America/Moncton";

/** Fixed anchor: past bookings end before this instant; future bookings start on or after. */
const DEMO_TODAY_START = DateTime.fromObject({ year: 2026, month: 4, day: 5 }, { zone: TZ }).startOf("day");
const RANGE_START = DateTime.fromObject({ year: 2026, month: 1, day: 1 }, { zone: TZ }).startOf("day");
const RANGE_END = DateTime.fromObject({ year: 2026, month: 6, day: 30 }, { zone: TZ }).endOf("day");

function assertValidDate(value: Date, label: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`Invalid date for ${label}: ${String(value)}`);
  }
}

/** Start of a calendar day in the demo timezone (for `date` columns and local demos). */
function localCalendarDate(year: number, month: number, day: number): Date {
  const dt = DateTime.fromObject({ year, month, day }, { zone: TZ }).startOf("day");
  if (!dt.isValid) {
    throw new Error(
      `Invalid calendar date: ${year}-${month}-${day} (${dt.invalidReason ?? "unknown"}: ${dt.invalidExplanation ?? ""})`
    );
  }
  const js = dt.toJSDate();
  assertValidDate(js, `localCalendarDate(${year}-${month}-${day})`);
  return js;
}

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

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function localDateTimeToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  zone: string
): Date {
  const local = DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: mi, second: 0 }, { zone });
  if (!local.isValid) {
    throw new Error(
      `Invalid local datetime: ${y}-${mo}-${d} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")} (${local.invalidExplanation ?? local.invalidReason})`
    );
  }
  const js = local.toUTC().toJSDate();
  assertValidDate(js, `localDateTimeToUtc(${y}-${mo}-${d} ${h}:${mi})`);
  return js;
}

type ServiceRow = typeof services.$inferSelect;
type BookingStatus = (typeof bookings.$inferSelect)["status"];
type PaymentStatus = (typeof bookings.$inferSelect)["paymentStatus"];

type PlannedBooking = {
  customerIdx: number;
  service: ServiceRow;
  start: Date;
  end: Date;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  positioningTierId: string | null;
  selectedAddOnIds: string[];
  internalNotes: string;
  customerNotes: string;
  createdAt: Date;
  forceUnpaid?: boolean;
  tipPercent?: string;
};

function assertPlannedBookingDates(p: PlannedBooking, label: string): void {
  assertValidDate(p.start, `${label}.start`);
  assertValidDate(p.end, `${label}.end`);
  assertValidDate(p.createdAt, `${label}.createdAt`);
}

function paymentForBooking(service: ServiceRow, tierMultiplier: number, addOnCents: number): string {
  const base = Number(service.priceAmount);
  const total = base * tierMultiplier + addOnCents / 100;
  return total.toFixed(2);
}

function pickPastStatus(rng: () => number): BookingStatus {
  const r = rng();
  if (r < 0.86) return "completed";
  if (r < 0.92) return "cancelled";
  if (r < 0.97) return "no_show";
  return "rescheduled";
}

function overlaps(
  intervals: { startMin: number; endMin: number }[],
  startMin: number,
  endMin: number
): boolean {
  for (const iv of intervals) {
    if (startMin < iv.endMin && endMin > iv.startMin) return true;
  }
  return false;
}

const FIRST_NAMES = [
  "Avery",
  "Blake",
  "Casey",
  "Drew",
  "Emery",
  "Finley",
  "Gray",
  "Harper",
  "Indigo",
  "Jules",
  "Kai",
  "Logan",
  "Morgan",
  "Noel",
  "Parker",
  "Quinn",
  "Reese",
  "Sage",
  "Tegan",
  "Val",
] as const;

const LAST_NAMES = [
  "Mercier",
  "Chen",
  "LeBlanc",
  "Cormier",
  "Robichaud",
  "Arsenault",
  "Landry",
  "Gallant",
  "Lavoie",
  "Bouchard",
  "Thibault",
  "Roy",
  "Martel",
  "Doucet",
  "Gaudet",
  "Boudreau",
  "Poirier",
  "Melanson",
  "Levesque",
  "Savoie",
] as const;

type Segment = "loyal" | "regular" | "biweekly" | "occasional" | "new2026" | "lapsed";

function segmentForIndex(i: number): Segment {
  if (i < 12) return "loyal";
  if (i < 28) return "regular";
  if (i < 42) return "biweekly";
  if (i < 52) return "occasional";
  if (i < 57) return "new2026";
  return "lapsed";
}

function massageCardSnippet(rng: () => number): {
  work: string;
  obs: string;
  follow: string;
  customer: string;
} {
  const pool = [
    {
      work: "Upper back and shoulders — moderate pressure; heat pack on trapezius to start.",
      obs: "Right levator noticeably tighter; no acute nerve symptoms reported.",
      follow: "Book 60 min in ~3 weeks; home stretch for pec minor daily.",
      customer: "Shoulders feel lighter — slept better after last visit.",
    },
    {
      work: "Hips and low back; sideline positioning; glute work with consent.",
      obs: "Desk posture pattern; QL guarded on left.",
      follow: "Consider 75 min next if schedule allows — more time for hips.",
      customer: "Walking felt easier the next day — appreciate the clear aftercare.",
    },
    {
      work: "Relaxation focus — slow Swedish strokes, scalp and feet included.",
      obs: "Stress load high; breathing softened by mid-session.",
      follow: "Monthly maintenance slot held — text if migraines spike.",
      customer: "Left feeling grounded — exactly what I needed this week.",
    },
    {
      work: "Prenatal sideline and semi-reclined; bolstering; light leg work.",
      obs: "Second trimester; no contraindications noted; comfortable face-down alternative offered.",
      follow: "Return every 3–4 weeks or sooner if low back ramps up.",
      customer: "Felt safe and supported — booking next trimester visits.",
    },
    {
      work: "Deep tissue neck and suboccipitals; slower pace due to sensitivity.",
      obs: "Screen-time headache pattern; SCM referral tenderness.",
      follow: "Micro-breaks hourly; same time in two weeks if headache persists.",
      customer: "Headache frequency down — will keep the posture tweaks.",
    },
  ];
  return pool[Math.floor(rng() * pool.length)]!;
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[seed-demo-massage-provider] DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = getDb();
  await ensureCanonicalTemplates(db);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing[0]) {
    await db.delete(users).where(eq(users.id, existing[0].id));
    console.log("[seed-demo-massage-provider] Removed existing massage demo user and cascaded data.");
  }

  const rng = mulberry32(202604051);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userId = randomUUID();

  console.log("Seeding user and provider…");
  await db.insert(users).values({
    id: userId,
    email: DEMO_EMAIL,
    passwordHash,
    emailVerifiedAt: new Date(),
    role: "provider",
  });

  const massageReferralCode = await allocateUniqueReferralCode(db);
  await db.insert(providers).values({
    userId,
    username: DEMO_USERNAME,
    referralCode: massageReferralCode,
    displayName: "Elena Whitmore",
    businessName: "Riverbend Therapeutic Massage",
    bio: `I’m Elena — a registered massage therapist based in Florenceville-Bristol. My practice is built on steady, repeat relationships: clear communication, unhurried sessions, and treatment plans that fit real life. Whether you’re managing desk tension, training soreness, pregnancy comfort, or simply need to reset your nervous system, you’ll get a calm studio space and evidence-informed care. Most of my clients book ahead — many on a standing rhythm — because massage here isn’t a one-off treat; it’s part of how they stay well.`,
    category: "Personal Services",
    city: "Florenceville-Bristol",
    countryCode: "CA",
    region: "NB",
    postalCode: "E7L 2H3",
    serviceArea: "Florenceville-Bristol, Bristol, and nearby Saint John River Valley communities",
    contactEmail: "hello@riverbendwellness.test",
    contactPhone: "(506) 555-0288",
    publicProfileEnabled: true,
    discoverable: true,
    timezone: TZ,
    paymentCash: true,
    paymentEtransfer: true,
    paymentInPersonCreditDebit: true,
    etransferDetails: "Send to hello@riverbendwellness.test — include your name and appointment date in the memo.",
    paymentDueBeforeAppointment: false,
    cancellationPolicy:
      "Please give 24 hours notice when you can so another client can use the time. Late cancellations may be charged at discretion.",
    usernameLockedAt: localDateTimeToUtc(2026, 1, 8, 9, 0, TZ),
    defaultServiceLevelsEnabled: true,
    bookingLeadTimeMinutes: 90,
    bookingHorizonDays: 120,
  });

  const [prov] = await db.select({ id: providers.id }).from(providers).where(eq(providers.userId, userId)).limit(1);
  if (!prov) throw new Error("Provider not created");
  const providerId = prov.id;

  const { tiers } = await ensureDefaultPricingProfile(db, providerId);
  const standardTierId = tiers.find((t) => t.label === "Standard")?.id ?? tiers[0]?.id;
  const premiumTierId = tiers.find((t) => t.label === "Premium")?.id ?? tiers[tiers.length - 1]?.id;
  const enhancedTierId = tiers.find((t) => t.label === "Enhanced")?.id ?? standardTierId;
  if (!standardTierId || !premiumTierId) throw new Error("Pricing tiers missing");

  const mult = (id: string) => Number(tiers.find((t) => t.id === id)?.multiplier ?? 1);

  const slugList = ["massage-therapy-60", "consultation-30"] as const;
  const tmplRows = await db
    .select()
    .from(canonicalServiceTemplates)
    .where(inArray(canonicalServiceTemplates.slug, [...slugList]));

  const bySlug = Object.fromEntries(tmplRows.map((r) => [r.slug, r])) as Record<
    (typeof slugList)[number],
    (typeof tmplRows)[number]
  >;
  for (const s of slugList) {
    if (!bySlug[s]) throw new Error(`Missing canonical template slug: ${s}`);
  }

  const massageT = bySlug["massage-therapy-60"];
  const consultT = bySlug["consultation-30"];

  type Def = {
    name: string;
    description: string;
    durationMinutes: number;
    priceAmount: string;
    bufferMinutes: number;
    sortOrder: number;
    tierId: string;
    category: string;
  };

  const defs: Def[] = [
    {
      name: "Focused treatment (30 min)",
      description: "Targeted work on one or two areas — great for maintenance between longer sessions.",
      durationMinutes: 30,
      priceAmount: "58.00",
      bufferMinutes: 15,
      sortOrder: 10,
      tierId: standardTierId,
      category: "Personal Services",
    },
    {
      name: "Massage therapy (45 min)",
      description: "Balanced full-body or regional session with time for shoulders, back, and neck.",
      durationMinutes: 45,
      priceAmount: "78.00",
      bufferMinutes: 15,
      sortOrder: 20,
      tierId: standardTierId,
      category: "Personal Services",
    },
    {
      name: "Massage therapy (60 min)",
      description: "Therapeutic massage with time for focused work and overall relaxation.",
      durationMinutes: 60,
      priceAmount: "98.00",
      bufferMinutes: 15,
      sortOrder: 30,
      tierId: standardTierId,
      category: "Personal Services",
    },
    {
      name: "Massage therapy (75 min)",
      description: "Extra time for multiple areas or a slower pace through full-body work.",
      durationMinutes: 75,
      priceAmount: "118.00",
      bufferMinutes: 15,
      sortOrder: 40,
      tierId: enhancedTierId,
      category: "Personal Services",
    },
    {
      name: "Massage therapy (90 min)",
      description: "Deeply restorative session — ideal for athletes, chronic tension, or seasonal resets.",
      durationMinutes: 90,
      priceAmount: "138.00",
      bufferMinutes: 20,
      sortOrder: 50,
      tierId: premiumTierId,
      category: "Personal Services",
    },
    {
      name: "Prenatal massage (60 min)",
      description: "Side-lying comfort positioning; gentle, informed care through pregnancy.",
      durationMinutes: 60,
      priceAmount: "108.00",
      bufferMinutes: 20,
      sortOrder: 60,
      tierId: standardTierId,
      category: "Personal Services",
    },
    {
      name: "Relaxation massage (60 min)",
      description: "Slower Swedish-style flow to calm the nervous system and soften muscle holding.",
      durationMinutes: 60,
      priceAmount: "95.00",
      bufferMinutes: 15,
      sortOrder: 70,
      tierId: standardTierId,
      category: "Personal Services",
    },
    {
      name: "Deep tissue massage (60 min)",
      description: "Deeper pressure where appropriate — communication-led pacing and check-ins.",
      durationMinutes: 60,
      priceAmount: "105.00",
      bufferMinutes: 15,
      sortOrder: 80,
      tierId: enhancedTierId,
      category: "Personal Services",
    },
    {
      name: "Session with warm stones (75 min)",
      description: "Therapeutic massage incorporating heated stones for key areas — booked as one extended session.",
      durationMinutes: 75,
      priceAmount: "132.00",
      bufferMinutes: 20,
      sortOrder: 90,
      tierId: premiumTierId,
      category: "Personal Services",
    },
    {
      name: "Deep tissue with cupping (60 min)",
      description: "Focused deep work with silicone cupping where indicated — consent and comfort first.",
      durationMinutes: 60,
      priceAmount: "112.00",
      bufferMinutes: 15,
      sortOrder: 100,
      tierId: enhancedTierId,
      category: "Personal Services",
    },
    {
      name: "Initial wellness assessment (30 min)",
      description: "Health history, goals, and plan — ideal for first visits or returning after a long break.",
      durationMinutes: 30,
      priceAmount: "55.00",
      bufferMinutes: 15,
      sortOrder: 110,
      tierId: standardTierId,
      category: "Professional Services",
    },
    {
      name: "Follow-up treatment (45 min)",
      description: "Continued care after your assessment — focused work aligned to your plan.",
      durationMinutes: 45,
      priceAmount: "82.00",
      bufferMinutes: 15,
      sortOrder: 120,
      tierId: standardTierId,
      category: "Personal Services",
    },
  ];

  console.log("Seeding services…");
  const insertedServices: ServiceRow[] = [];
  for (const d of defs) {
    const tmpl = d.name.includes("assessment") ? consultT : massageT;
    const [row] = await db
      .insert(services)
      .values({
        providerId,
        canonicalTemplateId: tmpl.id,
        canonicalTemplateVersion: tmpl.version,
        name: d.name,
        description: d.description,
        category: d.category,
        durationMinutes: d.durationMinutes,
        pricingType: "fixed",
        priceAmount: d.priceAmount,
        currency: "CAD",
        bufferMinutes: d.bufferMinutes,
        prepInstructions: tmpl.prepInstructions,
        serviceLevelsEnabled: false,
        positioningTierId: d.tierId,
        sortOrder: d.sortOrder,
        isActive: true,
      })
      .returning();
    if (row) insertedServices.push(row);
  }

  const svcByName = Object.fromEntries(insertedServices.map((s) => [s.name, s])) as Record<string, ServiceRow>;
  const svcInitial = svcByName["Initial wellness assessment (30 min)"]!;
  const meetAddOn = consultT.addOns.find((a) => a.id === "extra-15");
  if (meetAddOn?.id) {
    await db.insert(serviceAddOnOverrides).values({
      serviceId: svcInitial.id,
      addOnId: meetAddOn.id,
      enabled: true,
      priceOverride: "28.00",
    });
  }

  const servicePool = insertedServices;
  const weightFor = (s: ServiceRow): number => {
    if (s.durationMinutes === 60) return 0.32;
    if (s.durationMinutes === 45) return 0.22;
    if (s.durationMinutes === 75) return 0.12;
    if (s.durationMinutes === 90) return 0.06;
    if (s.durationMinutes === 30) return 0.14;
    return 0.14;
  };
  const weights = servicePool.map(weightFor);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const normWeights = weights.map((w) => w / wSum);

  function pickService(): ServiceRow {
    const x = rng();
    let c = 0;
    for (let i = 0; i < servicePool.length; i++) {
      c += normWeights[i]!;
      if (x < c) return servicePool[i]!;
    }
    return svcByName["Massage therapy (60 min)"]!;
  }

  console.log("Seeding availability and blocked times…");
  await db.insert(availabilityRules).values([
    { providerId, dayOfWeek: 1, startTimeLocal: "09:00", endTimeLocal: "19:00", isActive: true },
    { providerId, dayOfWeek: 2, startTimeLocal: "09:00", endTimeLocal: "19:00", isActive: true },
    { providerId, dayOfWeek: 3, startTimeLocal: "09:00", endTimeLocal: "19:00", isActive: true },
    { providerId, dayOfWeek: 4, startTimeLocal: "09:00", endTimeLocal: "19:00", isActive: true },
    { providerId, dayOfWeek: 5, startTimeLocal: "09:00", endTimeLocal: "19:00", isActive: true },
    { providerId, dayOfWeek: 6, startTimeLocal: "09:00", endTimeLocal: "14:00", isActive: true },
  ]);

  await db.insert(blockedTimes).values({
    providerId,
    startsAt: localDateTimeToUtc(2026, 3, 9, 0, 0, TZ),
    endsAt: localDateTimeToUtc(2026, 3, 13, 23, 59, TZ),
    reason: "Professional development week — limited hours (email for urgent care)",
  });

  const CUSTOMER_COUNT = 60;
  type CustSeed = {
    fullName: string;
    email: string;
    phone: string;
    notes: string;
    communicationNotes: string;
    marketingOptOut: boolean;
    segment: Segment;
  };

  const custSeeds: CustSeed[] = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]!;
    const fullName = `${fn} ${ln}`;
    const seg = segmentForIndex(i);
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@gmail.com`;
    const phone = `(506) 555-${String(1000 + i).slice(-4)}`;
    let notes = "";
    if (seg === "loyal") notes = "Standing rhythm client — prefers same weekday when possible.";
    else if (seg === "regular") notes = "Books monthly; occasional upgrade to 75–90 min.";
    else if (seg === "biweekly") notes = "Biweekly maintenance — desk job tension.";
    else if (seg === "occasional") notes = "Books as-needed; referral from a neighbour.";
    else if (seg === "new2026") notes = "New this year — referral from community group.";
    else notes = "Has not rebooked recently — gentle re-engagement.";
    custSeeds.push({
      fullName,
      email,
      phone,
      notes,
      communicationNotes: rng() < 0.25 ? "Text reminder the day before." : "",
      marketingOptOut: rng() < 0.08,
      segment: seg,
    });
  }

  console.log("Seeding customers…");
  const custRows: (typeof customers.$inferSelect)[] = [];
  for (const c of custSeeds) {
    const emailNorm = normalizeEmail(c.email);
    const [row] = await db
      .insert(customers)
      .values({
        providerId,
        fullName: c.fullName,
        email: c.email,
        emailNormalized: emailNorm,
        phone: c.phone,
        phoneNormalized: normalizePhone(c.phone),
        notes: c.notes,
        communicationNotes: c.communicationNotes,
        marketingOptOut: c.marketingOptOut,
        accountReady: true,
      })
      .returning();
    if (row) custRows.push(row);
  }

  const planned: PlannedBooking[] = [];

  console.log("Generating bookings (sample calendar Jan–Jun 2026)…");

  /** Ordinal day from RANGE_START for repeat spacing */
  const dayIndex = (d: DateTime): number => Math.floor(d.diff(RANGE_START, "days").days);

  const lastBookingDay = new Map<number, number>();

  function pickCustomerIdx(day: DateTime, preferRepeat: boolean): number {
    const di = dayIndex(day);
    const month = day.month;
    const isMayJun = month >= 5;

    const score = (i: number): number => {
      const seg = custSeeds[i]!.segment;
      let w = 1;
      if (seg === "lapsed" && month > 2) w = 0.05;
      if (seg === "new2026" && month < 2) w = 0.3;
      if (seg === "new2026" && month >= 2) w = 2;
      if (preferRepeat && (seg === "loyal" || seg === "regular" || seg === "biweekly")) w *= 4;
      if (isMayJun && (seg === "loyal" || seg === "regular" || seg === "biweekly")) w *= 5;
      const last = lastBookingDay.get(i) ?? -999;
      const gap = di - last;
      if (preferRepeat && gap >= 10 && gap <= 35 && (seg === "regular" || seg === "biweekly")) w *= 3;
      if (gap < 2) w *= 0.02;
      return w * (0.5 + rng());
    };

    let best = 0;
    let bestS = -1;
    for (let i = 0; i < custRows.length; i++) {
      const s = score(i);
      if (s > bestS) {
        bestS = s;
        best = i;
      }
    }
    return best;
  }

  function targetDensity(day: DateTime): number {
    if (day.weekday === 7) return 0;
    const m = day.month;
    const w = day.weekday === 6;
    if (w) {
      if (rng() > 0.38) return 0;
      return 2 + Math.floor(rng() * 3);
    }
    let base = 4;
    if (m === 1) base = 4;
    else if (m === 2) base = 5;
    else if (m === 3) base = 6;
    else if (m === 4) base = 6;
    else base = 7;
    const jitter = Math.floor(rng() * 3) - 1;
    if (rng() < 0.12) return Math.max(2, base + jitter - 2);
    return Math.max(3, Math.min(8, base + jitter));
  }

  for (let d = RANGE_START; d <= RANGE_END; d = d.plus({ days: 1 })) {
    if (d.weekday === 7) continue;

    const isFuture = d >= DEMO_TODAY_START;
    const isSat = d.weekday === 6;
    const dayEndMin = isSat ? 14 * 60 : 19 * 60;
    const occupied: { startMin: number; endMin: number }[] = [];
    const density = targetDensity(d);
    if (density === 0) continue;

    let placed = 0;
    let attempts = 0;
    while (placed < density && attempts < 140) {
      attempts++;
      const svc = pickService();
      const dm = svc.durationMinutes;
      const bm = svc.bufferMinutes;
      if (
        typeof dm !== "number" ||
        !Number.isFinite(dm) ||
        dm <= 0 ||
        typeof bm !== "number" ||
        !Number.isFinite(bm) ||
        bm < 0
      ) {
        throw new Error(
          `Invalid duration/buffer for service ${svc.name}: durationMinutes=${String(dm)} bufferMinutes=${String(bm)}`
        );
      }
      const h = isSat ? 9 + Math.floor(rng() * 4) : 9 + Math.floor(rng() * 9);
      const minute = rng() < 0.55 ? 0 : 30;
      const startMin = h * 60 + minute;
      const block = dm + bm;
      const endMin = startMin + block;
      if (endMin > dayEndMin || startMin < 9 * 60) continue;
      if (overlaps(occupied, startMin, endMin)) continue;

      const preferRepeat = d.month >= 2 || rng() < 0.55;
      const custIdx = pickCustomerIdx(d, preferRepeat);
      const seg = custSeeds[custIdx]!.segment;
      if (seg === "lapsed" && d.month > 2 && rng() < 0.85) continue;

      const dayKey = `${custIdx}-${d.toISODate()}`;
      if (planned.some((p) => `${p.customerIdx}-${DateTime.fromJSDate(p.start).setZone(TZ).toISODate()}` === dayKey))
        continue;

      const startLocal = d.set({ hour: Math.floor(startMin / 60), minute: startMin % 60, second: 0, millisecond: 0 });
      if (!startLocal.isValid) {
        throw new Error(`Invalid booking start (local): ${d.toISODate()} at ${startMin} min — ${startLocal.invalidExplanation}`);
      }
      const start = startLocal.toUTC().toJSDate();
      const end = startLocal.plus({ minutes: dm }).toUTC().toJSDate();
      assertValidDate(start, "generated.start");
      assertValidDate(end, "generated.end");

      let status: BookingStatus;
      let paymentStatus: PaymentStatus;
      let paymentMethod: string | null;
      let forceUnpaid = false;

      if (isFuture) {
        status = rng() < 0.92 ? "confirmed" : "pending";
        paymentStatus = rng() < 0.88 ? "unpaid" : "partially_paid";
        paymentMethod = paymentStatus === "partially_paid" ? "etransfer" : null;
      } else {
        status = pickPastStatus(rng);
        if (status === "completed") {
          paymentStatus = rng() < 0.82 ? "paid" : rng() < 0.92 ? "unpaid" : rng() < 0.97 ? "partially_paid" : "waived";
          if (paymentStatus === "paid" || paymentStatus === "partially_paid") {
            const roll = rng();
            paymentMethod =
              roll < 0.38 ? "etransfer" : roll < 0.68 ? "cash" : roll < 0.9 ? "in_person_credit_debit" : "etransfer";
          } else {
            paymentMethod = null;
          }
          if (paymentStatus === "unpaid" && rng() < 0.35) forceUnpaid = true;
        } else {
          paymentStatus = "unpaid";
          paymentMethod = null;
        }
      }

      const tierId =
        svc.positioningTierId === premiumTierId ? premiumTierId : rng() < 0.1 ? enhancedTierId : standardTierId;

      const addOns: string[] =
        svc.id === svcInitial.id && !isFuture && rng() < 0.28 ? ["extra-15"] : [];

      const tip =
        status === "completed" && paymentStatus === "paid" && rng() < 0.22
          ? rng() < 0.6
            ? "10.00"
            : "15.00"
          : "0";

      const internalNotes =
        status === "completed" && rng() < 0.14
          ? "Repeat client — prefers firm pressure on shoulders."
          : status === "cancelled"
            ? rng() < 0.5
              ? "Cancelled — schedule conflict."
              : "Cancelled — feeling unwell; will rebook."
            : "";

      const customerNotes =
        isFuture && rng() < 0.35
          ? "Please save my usual Thursday if it opens up."
          : !isFuture && rng() < 0.08
            ? "First time — slight sensitivity on left hip."
            : "";

      const createdAtLuxon = startLocal
        .minus({ days: 1 + Math.floor(rng() * 10) })
        .minus({ hours: Math.floor(rng() * 8) });
      if (!createdAtLuxon.isValid) {
        throw new Error(`Invalid booking createdAt: ${startLocal.toISO()} — ${createdAtLuxon.invalidExplanation}`);
      }
      const createdAt = createdAtLuxon.toUTC().toJSDate();
      assertValidDate(createdAt, "generated.createdAt");

      planned.push({
        customerIdx: custIdx,
        service: svc,
        start,
        end,
        status,
        paymentStatus,
        paymentMethod,
        positioningTierId: tierId,
        selectedAddOnIds: addOns,
        internalNotes,
        customerNotes,
        createdAt,
        forceUnpaid,
        tipPercent: tip,
      });

      occupied.push({ startMin, endMin });
      lastBookingDay.set(custIdx, dayIndex(d));
      placed++;
    }
  }

  // Dedupe same customer same calendar day (generator only)
  const seen = new Set<string>();
  const dedupedBase: PlannedBooking[] = [];
  for (const p of planned.sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const key = `${p.customerIdx}-${DateTime.fromJSDate(p.start).setZone(TZ).toISODate()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedBase.push(p);
  }

  function dayKeyOf(p: PlannedBooking): string {
    return `${p.customerIdx}-${DateTime.fromJSDate(p.start).setZone(TZ).toISODate()}`;
  }

  // --- Explicit story rows (replace any generated row for same customer+day) ---
  const explicitStory: PlannedBooking[] = [
    {
      customerIdx: 3,
      service: svcByName["Massage therapy (60 min)"]!,
      start: localDateTimeToUtc(2026, 2, 4, 14, 0, TZ),
      end: localDateTimeToUtc(2026, 2, 4, 15, 0, TZ),
      status: "cancelled",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: standardTierId,
      selectedAddOnIds: [],
      internalNotes: "Late cancellation — work emergency.",
      customerNotes: "",
      createdAt: localDateTimeToUtc(2026, 2, 1, 10, 0, TZ),
    },
    {
      customerIdx: 8,
      service: svcByName["Deep tissue massage (60 min)"]!,
      start: localDateTimeToUtc(2026, 3, 18, 10, 30, TZ),
      end: localDateTimeToUtc(2026, 3, 18, 11, 30, TZ),
      status: "no_show",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: enhancedTierId,
      selectedAddOnIds: [],
      internalNotes: "Did not arrive; left voicemail.",
      customerNotes: "",
      createdAt: localDateTimeToUtc(2026, 3, 16, 14, 0, TZ),
    },
    {
      customerIdx: 0,
      service: svcInitial,
      start: localDateTimeToUtc(2026, 1, 6, 13, 0, TZ),
      end: localDateTimeToUtc(2026, 1, 6, 13, 30, TZ),
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "etransfer",
      positioningTierId: standardTierId,
      selectedAddOnIds: ["extra-15"],
      internalNotes: "First visit intake — goals: sleep and upper back.",
      customerNotes: "Happy to complete health form next time.",
      createdAt: localDateTimeToUtc(2026, 1, 2, 9, 0, TZ),
      tipPercent: "0",
    },
  ];

  const replaceKeys = new Set(explicitStory.map(dayKeyOf));
  const deduped: PlannedBooking[] = [
    ...dedupedBase.filter((p) => !replaceKeys.has(dayKeyOf(p))),
    ...explicitStory,
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const insertedBookingIds: { id: string; plan: PlannedBooking; customerId: string }[] = [];

  console.log(`Seeding ${deduped.length} bookings…`);
  let bookingInsertIdx = 0;
  for (const p of deduped) {
    assertPlannedBookingDates(p, `booking[${bookingInsertIdx}]`);
    bookingInsertIdx++;
    const cust = custRows[p.customerIdx]!;
    const tierId = p.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const addOnCents =
      p.selectedAddOnIds.includes("extra-15") && p.service.id === svcInitial.id ? 2800 : 0;
    const payAmt = paymentForBooking(p.service, tierMul, addOnCents);
    const tipRaw = p.tipPercent ?? "0";
    const [row] = await db
      .insert(bookings)
      .values({
        providerId,
        serviceId: p.service.id,
        canonicalTemplateId: p.service.canonicalTemplateId,
        customerId: cust.id,
        startsAt: p.start,
        endsAt: p.end,
        status: p.status,
        paymentStatus: p.forceUnpaid ? "unpaid" : p.paymentStatus,
        paymentMethod: p.paymentMethod,
        paymentAmount:
          p.status === "completed" || p.status === "confirmed" || p.status === "pending" ? payAmt : null,
        tipPercent: tipRaw,
        positioningTierId: tierId,
        selectedAddOnIds: p.selectedAddOnIds,
        internalNotes: p.internalNotes,
        customerNotes: p.customerNotes,
        bufferAfterMinutes: p.service.bufferMinutes,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      })
      .returning({ id: bookings.id });
    if (row) insertedBookingIds.push({ id: row.id, plan: p, customerId: cust.id });
  }

  console.log("Syncing income records from bookings…");
  for (const row of insertedBookingIds) {
    await syncIncomeRecordFromBooking(db, row.id);
  }

  console.log("Seeding service cards (subset of completed visits)…");
  // Service cards (subset of completed)
  for (const row of insertedBookingIds) {
    if (row.plan.status !== "completed") continue;
    if (rng() > 0.65) continue;
    const sn = massageCardSnippet(rng);
    await db.insert(serviceCards).values({
      providerId,
      bookingId: row.id,
      customerId: row.customerId,
      servicePerformedAt: row.plan.start,
      serviceNameSnapshot: row.plan.service.name,
      templateLabelSnapshot: tmplRows.find((t) => t.id === row.plan.service.canonicalTemplateId)?.label ?? null,
      workSummary: sn.work,
      observations: sn.obs,
      followUpRecommendation: sn.follow,
      internalNotes: rng() < 0.15 ? "Receipt emailed." : "",
      customerVisibleSummary: sn.customer,
      createdByUserId: userId,
      createdAt: row.plan.end,
      updatedAt: row.plan.end,
    });
  }

  const loyal = custRows[0]!;
  const lapsed = custRows[58]!;

  await db.insert(customerRecommendations).values([
    {
      providerId,
      customerId: lapsed.id,
      sourceBookingId: null,
      sourceServiceCardId: null,
      fulfillmentBookingId: null,
      title: "Gentle rebook — we have openings in May",
      description:
        "It’s been a while since your last visit. If stress or tension crept back, a 60-minute reset can help.",
      reason: "No visit in several months — supportive outreach.",
      suggestedTimeframe: "within_30_days",
      timeframeDetail: "Reply with two windows that work evenings.",
      status: "open",
      createdByUserId: userId,
    },
    {
      providerId,
      customerId: loyal.id,
      sourceBookingId: null,
      sourceServiceCardId: null,
      fulfillmentBookingId: null,
      title: "Try 75 minutes before summer travel",
      description: "Extra time lets us address hips and shoulders in one session before your trip.",
      reason: "High-frequency loyal client — seasonal upgrade.",
      suggestedTimeframe: "seasonal",
      timeframeDetail: "Late spring",
      status: "open",
      createdByUserId: userId,
    },
  ]);

  await db.insert(providerDashboardSignals).values({
    providerId,
    signalKind: BOOKING_FAILED_SIGNAL_KIND,
    metadata: {
      email: "almost.booked@example.com",
      phone: "(506) 555-0777",
      errorSnippet: "slot_taken",
      attempts: [
        {
          seenAt: new Date("2026-03-20T18:00:00.000Z").toISOString(),
          email: "almost.booked@example.com",
          phone: "(506) 555-0777",
          errorSnippet: "Requested time unavailable",
        },
      ],
    },
    firstSeenAt: new Date("2026-03-20T18:00:00.000Z"),
    lastSeenAt: new Date("2026-03-22T12:00:00.000Z"),
    occurrenceCount: 1,
    dismissedAt: null,
  });

  await db.insert(assistantPreferences).values({
    providerId,
    disabledSuggestionTypes: [],
    quietMode: false,
  });

  await db.insert(assistantSuggestions).values({
    providerId,
    dedupeKey: "seed:massage:repeat_rhythm",
    type: "seed_demo",
    title: "Your May calendar is filling with repeats",
    summary:
      "Several biweekly clients pre-booked into June — consider holding one emergency slot per week for new referrals.",
    priorityScore: 38,
    urgencyLevel: "low",
    status: "new",
    surfaceMode: "drawer_card",
    reasonJson: { source: "seed_massage" },
    actionPayloadJson: { href: "/dashboard/bookings", actions: ["view"] },
  });

  await db.insert(assistantEvents).values([
    {
      providerId,
      eventType: "seed.demo_ready",
      payload: { message: "Massage demo account refreshed" },
      relatedEntityType: "provider",
      relatedEntityId: providerId,
    },
  ]);

  console.log("Seeding marketing campaigns and assistant content…");
  await db.insert(marketingCampaigns).values([
    {
      providerId,
      title: "Spring reset — book your longer session",
      campaignType: "seasonal",
      targetAudience: "repeat_clients",
      channel: "email",
      sendTiming: "scheduled",
      scheduledAt: localDateTimeToUtc(2026, 4, 18, 9, 30, TZ),
      messageBody:
        "Hi {{name}}, spring is a great time to upgrade to 75–90 minutes. Reply with your preferred weekday.",
      status: "scheduled",
    },
    {
      providerId,
      title: "We’d love to see you again",
      campaignType: "reconnect",
      targetAudience: "lapsed_45d",
      channel: "email",
      sendTiming: "draft",
      messageBody:
        "Hi {{name}}, it’s been a little while — if muscle tension or stress is back, I can hold a time that fits.",
      status: "draft",
    },
  ]);

  await db.insert(marketingSavedContents).values({
    providerId,
    source: "seed",
    title: "Calm, local massage — May tone",
    primaryText:
      "Riverbend Therapeutic Massage still has a few new-client assessments in May — gentle pacing, clear plans.",
    alternatives: [
      "Repeat clients: your follow-up rhythm keeps May beautifully full.",
      "Prefer evenings? Ask about Thursday blocks.",
    ],
    cta: "Book online",
    channel: "email",
    context: { demo: true, vertical: "massage" },
  });

  // --- Expenses (realistic overhead + supplies) ---
  console.log("Seeding expenses…");
  const expenseRows: {
    amount: string;
    category: string;
    description: string;
    incurredAt: Date;
  }[] = [];

  for (const m of [1, 2, 3, 4, 5, 6]) {
    expenseRows.push({
      amount: "780.00",
      category: "rent",
      description: "Studio share / treatment room rent",
      incurredAt: localCalendarDate(2026, m, 1),
    });
    expenseRows.push({
      amount: "118.00",
      category: "other",
      description: "Liability insurance (monthly portion)",
      incurredAt: localCalendarDate(2026, m, 3),
    });
    expenseRows.push({
      amount: "52.00",
      category: "other",
      description: "Scheduling & booking software subscription",
      incurredAt: localCalendarDate(2026, m, 5),
    });
    expenseRows.push({
      amount: "48.00",
      category: "other",
      description: "Phone & internet (business portion)",
      incurredAt: localCalendarDate(2026, m, 6),
    });
    expenseRows.push({
      amount: "42.00",
      category: "other",
      description: "Professional association membership (monthly)",
      incurredAt: localCalendarDate(2026, m, 8),
    });
  }

  expenseRows.push({
    amount: "385.00",
    category: "other",
    description: "Continuing education — advanced prenatal techniques (workshop)",
    incurredAt: localCalendarDate(2026, 3, 10),
  });

  expenseRows.push({
    amount: "120.00",
    category: "travel",
    description: "Mileage & parking — training weekend",
    incurredAt: localCalendarDate(2026, 3, 11),
  });

  // Every ~4 days from Jan 4 (use day arithmetic via .plus — raw `day: 32` in January is invalid in Luxon)
  for (let i = 0; i < 45; i++) {
    const d = DateTime.fromObject({ year: 2026, month: 1, day: 1 }, { zone: TZ }).plus({ days: 3 + i * 4 });
    if (d > RANGE_END) break;
    const incurredAt = d.startOf("day").toJSDate();
    assertValidDate(incurredAt, `expense supplies jan i=${i}`);
    expenseRows.push({
      amount: (38 + Math.floor(rng() * 70)).toFixed(2),
      category: "supplies",
      description: ["Massage oil & lotion", "Linens & laundry", "Face cradle covers", "Cleaning supplies", "Tapes & bolsters"][
        i % 5
      ]!,
      incurredAt,
    });
  }

  for (let i = 0; i < 30; i++) {
    const d = DateTime.fromObject({ year: 2026, month: 2, day: 1 }, { zone: TZ }).plus({ days: 1 + i * 3 });
    if (d > RANGE_END) break;
    const incurredAt = d.startOf("day").toJSDate();
    assertValidDate(incurredAt, `expense supplies feb i=${i}`);
    expenseRows.push({
      amount: (22 + Math.floor(rng() * 45)).toFixed(2),
      category: "supplies",
      description: "Disposable supplies & sanitizer restock",
      incurredAt,
    });
  }

  for (let i = 0; i < 18; i++) {
    const d = DateTime.fromObject({ year: 2026, month: 4, day: 1 }, { zone: TZ }).plus({ days: i * 5 });
    if (d > RANGE_END) break;
    const incurredAt = d.startOf("day").toJSDate();
    assertValidDate(incurredAt, `expense misc apr i=${i}`);
    expenseRows.push({
      amount: (55 + Math.floor(rng() * 95)).toFixed(2),
      category: "other",
      description: ["Local paper ad", "Website hosting", "Business cards", "Music licensing", "Card processing fees"][
        i % 5
      ]!,
      incurredAt,
    });
  }

  const lastSeedDay = DateTime.fromObject({ year: 2026, month: 6, day: 30 }, { zone: TZ }).startOf("day");
  const daySpan = Math.floor(lastSeedDay.diff(RANGE_START, "days").days) + 1;
  const microLine = [
    "Herbal tea for waiting area",
    "Printer paper & toner",
    "Hand soap refills",
    "Laundry detergent",
    "Spa music subscription",
    "Interac merchant fees",
    "Hot stone warmer supplies",
    "Silicone cupping sets — restock",
    "Replacement bolster insert",
    "Paper towels & tissues",
    "Disposable face cradle covers",
    "Unscented lotion trial",
    "Parking — client supply run",
  ];
  for (let i = 0; i < 120; i++) {
    const d = RANGE_START.plus({ days: Math.floor(rng() * daySpan) });
    if (!d.isValid) {
      throw new Error(`Invalid random expense date (micro ${i}): ${d.invalidExplanation}`);
    }
    const incurredAt = d.startOf("day").toJSDate();
    assertValidDate(incurredAt, `micro expense ${i}`);
    expenseRows.push({
      amount: (9 + Math.floor(rng() * 48)).toFixed(2),
      category: rng() < 0.82 ? "supplies" : "other",
      description: microLine[i % microLine.length]!,
      incurredAt,
    });
  }

  for (const e of expenseRows) {
    assertValidDate(e.incurredAt, `expense row: ${e.description}`);
    await db.insert(expenseRecords).values({
      providerId,
      amount: e.amount,
      category: e.category,
      description: e.description,
      incurredAt: e.incurredAt,
    });
  }

  const [{ incomeN }] = await db
    .select({ incomeN: count() })
    .from(incomeRecords)
    .where(eq(incomeRecords.providerId, providerId));

  const pastBookings = insertedBookingIds.filter((b) => DateTime.fromJSDate(b.plan.start).setZone(TZ) < DEMO_TODAY_START);
  const futureBookings = insertedBookingIds.filter((b) => DateTime.fromJSDate(b.plan.start).setZone(TZ) >= DEMO_TODAY_START);
  const futureMayJun = futureBookings.filter((b) => {
    const t = DateTime.fromJSDate(b.plan.start).setZone(TZ);
    return t.month === 5 || t.month === 6;
  });

  console.log("");
  console.log("=== Handshake Local — massage therapy demo provider seed ===");
  console.log(`Provider: ${DEMO_USERNAME} (${providerId})`);
  console.log(`Business: Riverbend Therapeutic Massage — Elena Whitmore`);
  console.log(`Customers: ${custRows.length}`);
  console.log(`Services: ${insertedServices.length}`);
  console.log(`Bookings: ${insertedBookingIds.length} (${pastBookings.length} before ${DEMO_TODAY_START.toISODate()}, ${futureBookings.length} on/after)`);
  console.log(`Future bookings in May–Jun 2026: ${futureMayJun.length}`);
  console.log(`Income records: ${Number(incomeN)}`);
  console.log(`Expense records: ${expenseRows.length}`);
  console.log(`Accounting rows (income + expense): ${Number(incomeN) + expenseRows.length}`);
  console.log(`Timezone: ${TZ} (demo “today” fixed: ${DEMO_TODAY_START.toISODate()})`);
  console.log("");
  console.log("Login:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Public:   /${DEMO_USERNAME}`);
  console.log("");

  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  void closeDbConnection().finally(() => process.exit(1));
});
