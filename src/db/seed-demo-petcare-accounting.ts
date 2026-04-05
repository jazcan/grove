/**
 * Standalone Handshake Local demo: pet care provider with rich accounting data.
 *
 * Does NOT modify or call the legacy `seed-demo-provider` script. Creates its own user by email.
 *
 * Run (from repo root):
 *   npm run db:seed:demo-petcare-accounting
 *
 * Requires DATABASE_URL (loads .env.local / .env like other scripts).
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { closeDbConnection, getDb } from "@/db";
import { ensureCanonicalTemplates } from "@/db/ensure-canonical-templates";
import {
  availabilityRules,
  bookings,
  canonicalServiceTemplates,
  customers,
  expenseRecords,
  incomeRecords,
  providers,
  serviceAddOnOverrides,
  services,
  users,
} from "@/db/schema";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { allocateUniqueReferralCode } from "@/domain/local-ambassador/referral-code";
import { mapBookingPaymentMethodToIncome } from "@/domain/money/map-payment-method";
import { hashPassword } from "@/lib/password";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

/** Dedicated demo login — never reuse for other seeds. */
export const PETCARE_ACCOUNTING_DEMO_EMAIL = "accounting.petcare.demo@handshakelocal.test";
export const PETCARE_ACCOUNTING_DEMO_PASSWORD = "DemoPetcare2026!";
export const PETCARE_ACCOUNTING_DEMO_USERNAME = "st-croix-trail-pet-care";

const TZ = "America/Moncton";

/** Sized so completed-booking income + expenses reaches 300+ rows (most bookings are completed). */
const TARGET_PAST_BOOKINGS = 280;
const TARGET_EXPENSE_ROWS = 100;
/** Income from bookings + expenses must be >= 300. */
const MIN_FINANCIAL_RECORDS = 300;

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
  return DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: mi, second: 0 }, { zone })
    .toUTC()
    .toJSDate();
}

type ServiceRow = typeof services.$inferSelect;

function paymentForBooking(service: ServiceRow, tierMultiplier: number, addOnCents: number): string {
  const base = Number(service.priceAmount);
  const total = base * tierMultiplier + addOnCents / 100;
  return total.toFixed(2);
}

function pickHistoricalStatus(rng: () => number): (typeof bookings.$inferSelect)["status"] {
  const r = rng();
  if (r < 0.82) return "completed";
  if (r < 0.9) return "cancelled";
  if (r < 0.96) return "no_show";
  return "rescheduled";
}

function randomDayBetween(rng: () => number, start: DateTime, end: DateTime): DateTime {
  const days = Math.max(0, Math.floor(end.diff(start, "days").days));
  const off = Math.floor(rng() * (days + 1));
  return start.plus({ days: off });
}

function pickTimeAndDuration(
  rng: () => number,
  day: DateTime,
  service: ServiceRow
): { start: Date; end: Date } {
  const isWeekend = day.weekday >= 6;
  const hourPool = isWeekend ? [9, 10, 11, 12] : [8, 9, 10, 11, 13, 14, 15, 16];
  const h = hourPool[Math.floor(rng() * hourPool.length)]!;
  const minute = rng() < 0.45 ? 0 : rng() < 0.8 ? 30 : 15;
  const startLocal = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour: h, minute, second: 0 },
    { zone: TZ }
  );
  const endLocal = startLocal.plus({ minutes: service.durationMinutes });
  return { start: startLocal.toUTC().toJSDate(), end: endLocal.toUTC().toJSDate() };
}

function buildCustomers(rng: () => number): { fullName: string; email: string; phone: string; notes: string }[] {
  const first = [
    "Morgan",
    "Alex",
    "Riley",
    "Jordan",
    "Casey",
    "Sam",
    "Taylor",
    "Jamie",
    "Quinn",
    "Reese",
    "Skyler",
    "Drew",
    "Harper",
    "Logan",
    "Rowan",
    "Emerson",
    "Blair",
    "Sydney",
    "Cameron",
    "Parker",
    "Avery",
    "Finley",
    "Marlowe",
    "Indigo",
    "River",
    "Shay",
    "Kendall",
    "Monroe",
    "Lennox",
    "Eden",
    "Jules",
    "Micah",
    "Noel",
    "Winter",
    "Sage",
    "Brook",
    "Hayden",
    "Reagan",
    "Tatum",
    "Ellis",
  ];
  const last = [
    "Arsenault",
    "Boucher",
    "Cormier",
    "Doucet",
    "Gagnon",
    "Landry",
    "LeBlanc",
    "Levesque",
    "Maillet",
    "Robichaud",
    "Savoie",
    "Theriault",
    "Veilleux",
    "Bastarache",
    "Comeau",
    "Duguay",
    "Ferguson",
    "Gallant",
    "Hachey",
    "Keating",
    "Leger",
    "Ouellette",
    "Pitre",
    "Richard",
    "Surette",
    "Thibodeau",
    "Vautour",
    "Wheatley",
    "Muise",
    "Donovan",
    "Price",
    "Roach",
    "St-Pierre",
    "Clements",
    "MacDonald",
    "Nair",
    "O'Donnell",
    "Bishop",
    "Hayes",
    "Veilleux",
  ];
  const out: { fullName: string; email: string; phone: string; notes: string }[] = [];
  for (let i = 0; i < 40; i++) {
    const fn = first[i % first.length]!;
    const ln = last[(i * 7 + Math.floor(rng() * 5)) % last.length]!;
    const phone = `(506) 555-${String(2000 + i).padStart(4, "0")}`;
    const notes =
      rng() < 0.3
        ? "Prefers text updates after visits."
        : rng() < 0.5
          ? "Has a spare key in the lockbox."
          : "";
    out.push({
      fullName: `${fn} ${ln}`,
      email: `stcroix.demo.c${i}@handshakelocal.test`,
      phone,
      notes,
    });
  }
  return out;
}

type ExpenseSeed = { category: "supplies" | "travel" | "rent" | "other"; amount: string; description: string };

function expensePool(): ExpenseSeed[] {
  return [
    { category: "travel", amount: "18.40", description: "Gas — local walking routes" },
    { category: "travel", amount: "24.75", description: "Gas — weekend overnight sit" },
    { category: "travel", amount: "12.10", description: "Parking + mileage (Woodstock run)" },
    { category: "supplies", amount: "32.99", description: "Biodegradable waste bags (bulk)" },
    { category: "supplies", amount: "19.45", description: "Treats — training size" },
    { category: "supplies", amount: "41.20", description: "Paper towels + disinfectant" },
    { category: "supplies", amount: "27.50", description: "Cat litter — client backup bag" },
    { category: "supplies", amount: "15.80", description: "Hand sanitizer + wipes" },
    { category: "other", amount: "89.00", description: "Liability insurance — monthly" },
    { category: "other", amount: "29.00", description: "Bookkeeping software" },
    { category: "other", amount: "14.25", description: "Phone plan (business portion)" },
    { category: "other", amount: "6.20", description: "Interac merchant / processing fee" },
    { category: "other", amount: "45.00", description: "Community flyer printing" },
    { category: "other", amount: "22.00", description: "Facebook boost — spring promo" },
    { category: "supplies", amount: "36.00", description: "Leash + harness (replacement)" },
    { category: "supplies", amount: "8.99", description: "Nail clippers + styptic" },
    { category: "travel", amount: "31.50", description: "Oil change (business km)" },
    { category: "other", amount: "55.00", description: "Pet first aid refresher — online" },
    { category: "supplies", amount: "12.30", description: "Tennis balls + tug toy" },
    { category: "other", amount: "18.00", description: "Domain + email forwarding" },
  ];
}

function pickPaymentMethod(rng: () => number): "cash" | "etransfer" | "in_person_credit_debit" {
  const r = rng();
  if (r < 0.38) return "cash";
  if (r < 0.78) return "etransfer";
  return "in_person_credit_debit";
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[seed-demo-petcare-accounting] DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = getDb();
  await ensureCanonicalTemplates(db);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, PETCARE_ACCOUNTING_DEMO_EMAIL))
    .limit(1);
  if (existing[0]) {
    await db.delete(users).where(eq(users.id, existing[0].id));
    console.log("[seed-demo-petcare-accounting] Removed prior demo user and cascaded data.");
  }

  const rng = mulberry32(20260405);
  const passwordHash = await hashPassword(PETCARE_ACCOUNTING_DEMO_PASSWORD);
  const userId = randomUUID();
  const now = DateTime.now().setZone(TZ);
  const todayStart = now.startOf("day");
  const historyStart = DateTime.fromObject({ year: 2026, month: 1, day: 1 }, { zone: TZ });
  const historyEnd = todayStart.minus({ days: 1 });

  await db.insert(users).values({
    id: userId,
    email: PETCARE_ACCOUNTING_DEMO_EMAIL,
    passwordHash,
    emailVerifiedAt: new Date(),
    role: "provider",
  });

  const petcareReferralCode = await allocateUniqueReferralCode(db);
  await db.insert(providers).values({
    userId,
    username: PETCARE_ACCOUNTING_DEMO_USERNAME,
    referralCode: petcareReferralCode,
    displayName: "Sam Aubé",
    businessName: "St. Croix Trail Pet Care",
    bio: `Hi — I’m Sam. I live in Florenceville-Bristol and help neighbours keep dogs and cats happy while life gets busy. Whether it’s a midday walk, a drop-in for food and play, or overnight company while you’re away, I show up on time, send quick updates, and treat your pets like family. Most of my clients are word-of-mouth from the river valley — that trust means everything.`,
    category: "Pet care",
    city: "Florenceville-Bristol",
    countryCode: "CA",
    region: "New Brunswick",
    postalCode: "E7L2B6",
    serviceArea: "Florenceville-Bristol, Bristol, nearby St. John River valley communities",
    contactEmail: "hello@stcroixtrailpetcare.test",
    contactPhone: "(506) 555-0147",
    publicProfileEnabled: true,
    discoverable: true,
    timezone: TZ,
    paymentCash: true,
    paymentEtransfer: true,
    paymentInPersonCreditDebit: true,
    etransferDetails: "Send e-transfers to hello@stcroixtrailpetcare.test — please put your pet’s name in the message.",
    paymentDueBeforeAppointment: false,
    cancellationPolicy:
      "Please give 24 hours notice when you can so I can offer your time to another family. Same-day changes: text me as early as possible.",
    usernameLockedAt: localDateTimeToUtc(2026, 1, 3, 9, 0, TZ),
    defaultServiceLevelsEnabled: true,
    bookingLeadTimeMinutes: 120,
    bookingHorizonDays: 90,
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

  const slugList = [
    "quick-dog-walk-20",
    "dog-walk-45",
    "pet-sitting-drop-in",
    "overnight-pet-sitting",
    "consultation-30",
    "pet-grooming-90",
  ] as const;

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

  const [svcWalk30] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["quick-dog-walk-20"].id,
      canonicalTemplateVersion: bySlug["quick-dog-walk-20"].version,
      name: "Dog walk — 30 minutes",
      description:
        "Neighbourhood walk for exercise and a bathroom break. Great for weekdays — I stick to calm routes unless you prefer more adventure.",
      category: "Pet care",
      durationMinutes: 30,
      pricingType: "fixed",
      priceAmount: "26.00",
      currency: "CAD",
      bufferMinutes: 10,
      prepInstructions: bySlug["quick-dog-walk-20"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      phoneRequired: false,
      notesRequired: false,
      sortOrder: 10,
      isActive: true,
    })
    .returning();

  const [svcWalk60] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["dog-walk-45"].id,
      canonicalTemplateVersion: bySlug["dog-walk-45"].version,
      name: "Dog walk — 60 minutes",
      description:
        "Longer outing for energetic dogs — sniffing time, water break, and a short note when we’re done.",
      category: "Pet care",
      durationMinutes: 60,
      pricingType: "fixed",
      priceAmount: "52.00",
      currency: "CAD",
      bufferMinutes: 10,
      prepInstructions: bySlug["dog-walk-45"].prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: standardTierId,
      sortOrder: 20,
      isActive: true,
    })
    .returning();

  const [svcDropIn] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["pet-sitting-drop-in"].id,
      canonicalTemplateVersion: bySlug["pet-sitting-drop-in"].version,
      name: "Pet sitting — daytime visit",
      description: "Feeding, fresh water, potty break, play, and a quick home check.",
      category: "Pet care",
      durationMinutes: 35,
      pricingType: "fixed",
      priceAmount: "42.00",
      currency: "CAD",
      bufferMinutes: 10,
      prepInstructions: bySlug["pet-sitting-drop-in"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      notesRequired: true,
      notesInstructions: "Tell me about feeding schedule, meds, and where supplies live.",
      sortOrder: 30,
      isActive: true,
    })
    .returning();

  const [svcOvernight] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["overnight-pet-sitting"].id,
      canonicalTemplateVersion: bySlug["overnight-pet-sitting"].version,
      name: "Overnight pet care (in home)",
      description:
        "I stay overnight so routines stay familiar — evening and morning walks, feeding, and company through the night.",
      category: "Pet care",
      durationMinutes: 720,
      pricingType: "fixed",
      priceAmount: "118.00",
      currency: "CAD",
      bufferMinutes: 30,
      prepInstructions: bySlug["overnight-pet-sitting"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: premiumTierId,
      phoneRequired: true,
      sortOrder: 40,
      isActive: true,
    })
    .returning();

  const [svcCat] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["pet-sitting-drop-in"].id,
      canonicalTemplateVersion: bySlug["pet-sitting-drop-in"].version,
      name: "Cat drop-in visit",
      description: "Litter check, food and water, gentle play — shy cats get patience, not pressure.",
      category: "Pet care",
      durationMinutes: 25,
      pricingType: "fixed",
      priceAmount: "32.00",
      currency: "CAD",
      bufferMinutes: 10,
      prepInstructions: bySlug["pet-sitting-drop-in"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 50,
      isActive: true,
    })
    .returning();

  const [svcPuppy] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["consultation-30"].id,
      canonicalTemplateVersion: bySlug["consultation-30"].version,
      name: "Puppy check-in visit",
      description:
        "Potty break, meal, and basic enrichment for young dogs — ideal when you’re at work during the day.",
      category: "Pet care",
      durationMinutes: 30,
      pricingType: "fixed",
      priceAmount: "48.00",
      currency: "CAD",
      bufferMinutes: 10,
      prepInstructions: bySlug["consultation-30"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: enhancedTierId,
      phoneRequired: true,
      sortOrder: 60,
      isActive: true,
    })
    .returning();

  const [svcMini] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["pet-grooming-90"].id,
      canonicalTemplateVersion: bySlug["pet-grooming-90"].version,
      name: "Add-on: nail trim & tidy",
      description:
        "Quick nail trim and paw tidy — add after a walk or visit (small dogs; ask if unsure).",
      category: "Pet care",
      durationMinutes: 25,
      pricingType: "fixed",
      priceAmount: "28.00",
      currency: "CAD",
      bufferMinutes: 15,
      prepInstructions: bySlug["pet-grooming-90"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 70,
      isActive: true,
    })
    .returning();

  const meetExtra = bySlug["consultation-30"].addOns.find((a) => a.id === "extra-15");
  if (meetExtra?.id) {
    await db.insert(serviceAddOnOverrides).values({
      serviceId: svcPuppy.id,
      addOnId: meetExtra.id,
      enabled: true,
      priceOverride: "22.00",
    });
  }

  if (
    !svcWalk30 ||
    !svcWalk60 ||
    !svcDropIn ||
    !svcOvernight ||
    !svcCat ||
    !svcPuppy ||
    !svcMini
  ) {
    throw new Error("Service insert failed");
  }

  const servicePool: ServiceRow[] = [svcWalk30, svcWalk60, svcDropIn, svcOvernight, svcCat, svcPuppy, svcMini];
  const serviceWeight = [0.26, 0.22, 0.18, 0.06, 0.12, 0.1, 0.06];

  function pickService(r: () => number): ServiceRow {
    const x = r();
    let c = 0;
    for (let i = 0; i < servicePool.length; i++) {
      c += serviceWeight[i]!;
      if (x < c) return servicePool[i]!;
    }
    return svcWalk30;
  }

  await db.insert(availabilityRules).values([
    { providerId, dayOfWeek: 1, startTimeLocal: "07:30", endTimeLocal: "18:30", isActive: true },
    { providerId, dayOfWeek: 2, startTimeLocal: "07:30", endTimeLocal: "18:30", isActive: true },
    { providerId, dayOfWeek: 3, startTimeLocal: "07:30", endTimeLocal: "18:30", isActive: true },
    { providerId, dayOfWeek: 4, startTimeLocal: "07:30", endTimeLocal: "18:30", isActive: true },
    { providerId, dayOfWeek: 5, startTimeLocal: "07:30", endTimeLocal: "17:30", isActive: true },
    { providerId, dayOfWeek: 6, startTimeLocal: "08:00", endTimeLocal: "14:00", isActive: true },
  ]);

  const seedCust = buildCustomers(rng);
  const custRows: (typeof customers.$inferSelect)[] = [];
  for (const c of seedCust) {
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
        communicationNotes: "",
        marketingOptOut: rng() < 0.08,
        accountReady: true,
      })
      .returning();
    if (row) custRows.push(row);
  }

  type PlannedBooking = {
    customerIdx: number;
    service: ServiceRow;
    start: Date;
    end: Date;
    status: (typeof bookings.$inferSelect)["status"];
    paymentStatus: (typeof bookings.$inferSelect)["paymentStatus"];
    paymentMethod: string | null;
    positioningTierId: string | null;
    selectedAddOnIds: string[];
    internalNotes: string;
    customerNotes: string;
    createdAt: Date;
    tipPercent: string;
  };

  const planned: PlannedBooking[] = [];

  function addPlan(p: PlannedBooking): void {
    planned.push(p);
  }

  function pickCustomerIndex(r: () => number): number {
    const r1 = r();
    if (r1 < 0.14) return 0;
    if (r1 < 0.26) return 3;
    if (r1 < 0.36) return 7;
    if (r1 < 0.44) return 12;
    return Math.floor(r() * custRows.length);
  }

  // Growth factor: later calendar days produce slightly more attempts
  let guard = 0;
  while (planned.length < TARGET_PAST_BOOKINGS * 6 && guard < 35000) {
    guard++;
    const day = randomDayBetween(rng, historyStart, historyEnd);
    const dayFrac = day.diff(historyStart, "days").days / Math.max(1, historyEnd.diff(historyStart, "days").days);
    if (rng() > 0.42 + dayFrac * 0.28) continue;
    if (day.weekday <= 5 && rng() < 0.12) continue;

    const svc = pickService(rng);
    if (svc.id === svcOvernight.id && rng() > 0.14) continue;

    const { start, end } = pickTimeAndDuration(rng, day, svc);
    if (start >= todayStart.toUTC().toJSDate()) continue;

    const st = pickHistoricalStatus(rng);
    const custIdx = pickCustomerIndex(rng);

    let pay: (typeof bookings.$inferSelect)["paymentStatus"] = "paid";
    let method: string | null = pickPaymentMethod(rng);
    if (st !== "completed") {
      pay = "unpaid";
      method = null;
    } else if (rng() < 0.06) {
      pay = "waived";
      method = null;
    } else if (rng() < 0.1) {
      pay = "unpaid";
      method = rng() < 0.5 ? "cash" : null;
    }

    const tierId =
      svc.id === svcOvernight.id ? premiumTierId : rng() < 0.11 ? enhancedTierId : standardTierId;
    const addOns =
      svc.id === svcPuppy.id && meetExtra?.id && rng() < 0.28 ? ["extra-15"] : ([] as string[]);
    const tip =
      st === "completed" && pay === "paid" && rng() < 0.18
        ? rng() < 0.55
          ? "10.00"
          : "15.00"
        : "0";

    const createdAt = new Date(
      start.getTime() - (1 + Math.floor(rng() * 7)) * 86400000 - Math.floor(rng() * 3600000)
    );

    addPlan({
      customerIdx: custIdx,
      service: svc,
      start,
      end,
      status: st,
      paymentStatus: pay,
      paymentMethod: method,
      positioningTierId: tierId,
      selectedAddOnIds: addOns,
      internalNotes: rng() < 0.06 ? "Repeat weekly — same window." : "",
      customerNotes: rng() < 0.04 ? "Side door unlocked." : "",
      createdAt,
      tipPercent: tip,
    });
  }

  const seen = new Set<string>();
  const deduped: PlannedBooking[] = [];
  for (const p of planned.sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const dayKey = `${p.customerIdx}-${p.start.toISOString().slice(0, 10)}`;
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    deduped.push(p);
  }

  if (deduped.length < TARGET_PAST_BOOKINGS) {
    throw new Error(
      `[seed-demo-petcare-accounting] Deduped only ${deduped.length} past bookings (need ${TARGET_PAST_BOOKINGS}). Increase generation multiplier.`
    );
  }

  const pastBookings = deduped.slice(0, TARGET_PAST_BOOKINGS);

  const tomorrow = todayStart.plus({ days: 1 });
  const futurePlans: (PlannedBooking & { customerId: string })[] = [
    {
      customerIdx: 0,
      customerId: custRows[0]!.id,
      service: svcWalk60,
      start: localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, TZ),
      end: new Date(
        localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, TZ).getTime() +
          svcWalk60.durationMinutes * 60000
      ),
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "etransfer",
      positioningTierId: standardTierId,
      selectedAddOnIds: [],
      internalNotes: "",
      customerNotes: "Same route as last week please.",
      createdAt: localDateTimeToUtc(2026, 4, 2, 16, 0, TZ),
      tipPercent: "0",
    },
    {
      customerIdx: 0,
      customerId: custRows[2]!.id,
      service: svcDropIn,
      start: localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 15, 30, TZ),
      end: new Date(
        localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 15, 30, TZ).getTime() +
          svcDropIn.durationMinutes * 60000
      ),
      status: "confirmed",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: null,
      selectedAddOnIds: [],
      internalNotes: "",
      customerNotes: "",
      createdAt: localDateTimeToUtc(2026, 4, 3, 9, 0, TZ),
      tipPercent: "0",
    },
  ];

  const insertedIds: { bookingId: string; plan: PlannedBooking }[] = [];

  for (const p of pastBookings) {
    const cust = custRows[p.customerIdx]!;
    const tierId = p.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const addOnCents =
      p.selectedAddOnIds.includes("extra-15") && p.service.id === svcPuppy.id ? 2200 : 0;
    const basePay = paymentForBooking(p.service, tierMul, addOnCents);
    const tipN = Number(p.tipPercent);
    const withTip =
      p.status === "completed" && p.paymentStatus === "paid" && tipN > 0
        ? (Number(basePay) * (1 + tipN / 100)).toFixed(2)
        : basePay;

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
        paymentStatus: p.paymentStatus,
        paymentMethod: p.paymentMethod,
        paymentAmount: p.status === "completed" ? withTip : null,
        tipPercent: p.tipPercent,
        positioningTierId: tierId,
        selectedAddOnIds: p.selectedAddOnIds,
        internalNotes: p.internalNotes,
        customerNotes: p.customerNotes,
        bufferAfterMinutes: p.service.bufferMinutes,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      })
      .returning({ id: bookings.id });
    if (row) insertedIds.push({ bookingId: row.id, plan: p });
  }

  for (const f of futurePlans) {
    const tierId = f.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const payAmt = f.status === "cancelled" ? null : paymentForBooking(f.service, tierMul, 0);
    const [row] = await db
      .insert(bookings)
      .values({
        providerId,
        serviceId: f.service.id,
        canonicalTemplateId: f.service.canonicalTemplateId,
        customerId: f.customerId,
        startsAt: f.start,
        endsAt: f.end,
        status: f.status,
        paymentStatus: f.paymentStatus,
        paymentMethod: f.paymentMethod,
        paymentAmount: payAmt,
        tipPercent: f.tipPercent,
        positioningTierId: f.positioningTierId,
        selectedAddOnIds: f.selectedAddOnIds,
        internalNotes: f.internalNotes,
        customerNotes: f.customerNotes,
        bufferAfterMinutes: f.service.bufferMinutes,
        createdAt: f.createdAt,
        updatedAt: f.createdAt,
      })
      .returning({ id: bookings.id });
    if (row) insertedIds.push({ bookingId: row.id, plan: f });
  }

  let incomeCount = 0;
  for (const { bookingId, plan } of insertedIds) {
    if (plan.status !== "completed") continue;
    const isPaid = plan.paymentStatus === "paid";
    const isWaived = plan.paymentStatus === "waived";
    if (!isPaid && !isWaived && plan.paymentStatus === "unpaid") {
      // Still record earned revenue for completed work (matches app sync rules)
    }
    if (plan.status !== "completed") continue;

    const tierId = plan.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const addOnCents =
      plan.selectedAddOnIds.includes("extra-15") && plan.service.id === svcPuppy.id ? 2200 : 0;
    const basePay = paymentForBooking(plan.service, tierMul, addOnCents);
    const tipN = Number(plan.tipPercent);
    const amountStr =
      plan.paymentStatus === "paid" && tipN > 0
        ? (Number(basePay) * (1 + tipN / 100)).toFixed(2)
        : basePay;

    const recognizedAt = plan.end;
    const receivedAt = plan.paymentStatus === "paid" ? plan.end : null;
    const pm = mapBookingPaymentMethodToIncome(plan.paymentMethod);

    await db.insert(incomeRecords).values({
      providerId,
      bookingId,
      amount: amountStr,
      currency: "CAD",
      paymentMethod: pm,
      isCompleted: true,
      isPaid: plan.paymentStatus === "paid",
      recognizedAt,
      receivedAt,
      sourceAmountType: "payment_amount",
      createdAt: recognizedAt,
      updatedAt: recognizedAt,
    });
    incomeCount++;
  }

  const expTemplates = expensePool();
  const expenseRows: { amount: string; category: "supplies" | "travel" | "rent" | "other"; description: string; incurredAt: Date }[] = [];
  for (let i = 0; i < TARGET_EXPENSE_ROWS; i++) {
    const day = randomDayBetween(rng, historyStart, now.startOf("day"));
    const tmpl = expTemplates[i % expTemplates.length]!;
    const jitter = (rng() - 0.5) * 4.5;
    const amt = Math.max(3.5, Number(tmpl.amount) + jitter);
    expenseRows.push({
      amount: amt.toFixed(2),
      category: tmpl.category,
      description: tmpl.description,
      incurredAt: day.startOf("day").toJSDate(),
    });
  }

  await db.insert(expenseRecords).values(
    expenseRows.map((e) => ({
      providerId,
      amount: e.amount,
      category: e.category,
      description: e.description,
      incurredAt: e.incurredAt,
      updatedAt: new Date(),
    }))
  );

  const totalFinancial = incomeCount + expenseRows.length;
  if (totalFinancial < MIN_FINANCIAL_RECORDS) {
    throw new Error(
      `Expected at least ${MIN_FINANCIAL_RECORDS} financial rows; got ${totalFinancial}. Adjust targets.`
    );
  }

  console.log("");
  console.log("=== Handshake Local — pet care accounting demo seed ===");
  console.log(`Provider username: ${PETCARE_ACCOUNTING_DEMO_USERNAME} (${providerId})`);
  console.log(`Services: ${servicePool.length}`);
  console.log(`Customers: ${custRows.length}`);
  console.log(`Bookings (past + upcoming): ${insertedIds.length}`);
  console.log(`Income records: ${incomeCount}`);
  console.log(`Expense records: ${expenseRows.length}`);
  console.log(`Total financial rows: ${totalFinancial}`);
  console.log(`Timezone: ${TZ}`);
  console.log("");
  console.log("Login:");
  console.log(`  Email:    ${PETCARE_ACCOUNTING_DEMO_EMAIL}`);
  console.log(`  Password: ${PETCARE_ACCOUNTING_DEMO_PASSWORD}`);
  console.log(`  Public URL: /${PETCARE_ACCOUNTING_DEMO_USERNAME}`);
  console.log("");

  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  void closeDbConnection().finally(() => process.exit(1));
});
