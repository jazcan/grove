/**
 * Idempotent demo provider account for product demos (Handshake Local).
 *
 * Run (from repo root):
 *   npm run db:seed:demo
 *
 * Requires DATABASE_URL (loads .env.local / .env like other scripts).
 *
 * Re-running removes and recreates ONLY the demo login user and its data (by email).
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
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
  marketingCampaigns,
  marketingSavedContents,
  providerDashboardSignals,
  providers,
  serviceAddOnOverrides,
  serviceCards,
  services,
  users,
} from "@/db/schema";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { allocateUniqueReferralCode } from "@/domain/local-ambassador/referral-code";
import { BOOKING_FAILED_SIGNAL_KIND } from "@/domain/provider-dashboard-signals.shared";
import { hashPassword } from "@/lib/password";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

const DEMO_EMAIL = "demo.provider@handshakelocal.test";
const DEMO_PASSWORD = "DemoProvider123!";
const DEMO_USERNAME = "river-valley-pet-care";
const TZ = "America/Moncton";

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

/** Deterministic PRNG for repeatable demo data after each full re-seed. */
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
  return DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: mi, second: 0 }, { zone }).toUTC().toJSDate();
}

type ServiceRow = typeof services.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;

type SeedCustomer = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  communicationNotes: string;
  marketingOptOut: boolean;
};

const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    fullName: "Morgan LeBlanc",
    email: "morgan.leblanc@gmail.com",
    phone: "(506) 555-0101",
    notes: "Golden retriever named Biscuit; prefers side door.",
    communicationNotes: "Texts work best before noon.",
    marketingOptOut: false,
  },
  {
    fullName: "Rémi Cormier",
    email: "remi.cormier@eastlink.ca",
    phone: "(506) 555-0102",
    notes: "Two cats — shy around new people.",
    communicationNotes: "French OK.",
    marketingOptOut: false,
  },
  {
    fullName: "Samira Khoury",
    email: "samira.khoury@outlook.com",
    phone: "(506) 555-0103",
    notes: "Small dog, uses harness not collar.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Chris O'Donnell",
    email: "chris.odonnell@icloud.com",
    phone: "(506) 555-0104",
    notes: "Evening drop-ins only.",
    communicationNotes: "Call if running late.",
    marketingOptOut: false,
  },
  {
    fullName: "Taylor Bishop",
    email: "taylor.bishop@proton.me",
    phone: "(506) 555-0105",
    notes: "Senior dog — slow stairs.",
    communicationNotes: "",
    marketingOptOut: true,
  },
  {
    fullName: "Jordan Hayes",
    email: "jordan.hayes@gmail.com",
    phone: "(506) 555-0106",
    notes: "New puppy, working on leash manners.",
    communicationNotes: "Loves voice notes.",
    marketingOptOut: false,
  },
  {
    fullName: "Priya Nair",
    email: "priya.nair@unb.ca",
    phone: "(506) 555-0107",
    notes: "Indoor-only cats.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Alex Veilleux",
    email: "alex.v@hotmail.com",
    phone: "(506) 555-0108",
    notes: "Fenced yard — dog can run.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Jamie Roy",
    email: "jamie.roy@gmail.com",
    phone: "(506) 555-0109",
    notes: "Reactive to bikes.",
    communicationNotes: "Avoid Main St loop.",
    marketingOptOut: false,
  },
  {
    fullName: "Casey MacDonald",
    email: "casey.mcdonald@icloud.com",
    phone: "(506) 555-0110",
    notes: "Medication in kitchen drawer — ask each visit.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Melissa Surette",
    email: "melissa.surette@gmail.com",
    phone: "(506) 555-0111",
    notes: "Prefers morning walks.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Devon Wheatley",
    email: "devon.wheatley@eastlink.ca",
    phone: "(506) 555-0112",
    notes: "Bird feeder near door — don’t let the cat out.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Riley Donovan",
    email: "riley.donovan@gmail.com",
    phone: "(506) 555-0113",
    notes: "Apartment 4B — buzzer sticks sometimes.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Skyler Price",
    email: "skyler.price@outlook.com",
    phone: "(506) 555-0114",
    notes: "Travel nurse — schedule changes fast.",
    communicationNotes: "Text-only when on shift.",
    marketingOptOut: false,
  },
  {
    fullName: "Harper Muise",
    email: "harper.muise@gmail.com",
    phone: "(506) 555-0115",
    notes: "Three small dogs — separate bowls.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Quinn Landry",
    email: "quinn.landry@icloud.com",
    phone: "(506) 555-0116",
    notes: "First-time dog owner — appreciates tips.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Emery Clements",
    email: "emery.clements@gmail.com",
    phone: "(506) 555-0117",
    notes: "Uses keypad lock — code rotates monthly.",
    communicationNotes: "Check notes field each booking.",
    marketingOptOut: false,
  },
  {
    fullName: "Blair St-Pierre",
    email: "blair.stpierre@outlook.com",
    phone: "(506) 555-0118",
    notes: "Outdoor dog — water bowl on deck.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Sydney Roach",
    email: "sydney.roach@gmail.com",
    phone: "(506) 555-0119",
    notes: "Cat hides under bed — don’t chase.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Jules Robichaud",
    email: "jules.robichaud@eastlink.ca",
    phone: "(506) 555-0120",
    notes: "Lapsed — last visit early January (snowbird parents).",
    communicationNotes: "Snowbird — away Feb–March.",
    marketingOptOut: false,
  },
  {
    fullName: "Patricia Vautour",
    email: "patricia.vautour@gmail.com",
    phone: "(506) 555-0121",
    notes: "Lapsed — last visit early January; elderly cat passed; considering new adoption.",
    communicationNotes: "Sensitive topic — tread lightly.",
    marketingOptOut: false,
  },
  {
    fullName: "Logan Keating",
    email: "logan.keating@icloud.com",
    phone: "(506) 555-0122",
    notes: "Lapsed — last meet early January; busy with renovations.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Francis Sullivan",
    email: "francis.sullivan@gmail.com",
    phone: "(506) 555-0123",
    notes: "One-off deep clean referral from neighbor.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Dana Arsenault",
    email: "dana.arsenault@outlook.com",
    phone: "(506) 555-0124",
    notes: "Single visit so far — trial customer.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Robin Cormier",
    email: "robin.cormier@gmail.com",
    phone: "(506) 555-0125",
    notes: "Neighbour referral — repeat biweekly.",
    communicationNotes: "",
    marketingOptOut: false,
  },
  {
    fullName: "Kerry Doyle",
    email: "kerry.doyle@eastlink.ca",
    phone: "(506) 555-0126",
    notes: "High-value client — books grooming + walk bundles.",
    communicationNotes: "E-transfer same day.",
    marketingOptOut: false,
  },
];

const CARD_SNIPPETS: { work: string; obs: string; follow: string; customer: string }[] = [
  {
    work: "45-minute route through Barker Street loop; Biscuit pulled early but settled after 10 minutes.",
    obs: "Coat shedding a bit more — spring blowing coat.",
    follow: "Consider a bath + brush add-on in two weeks.",
    customer: "Biscuit had a good walk — a little excited at squirrels but listened well.",
  },
  {
    work: "Drop-in: fed wet + dry, refreshed water, quick play with feather toy.",
    obs: "Litter box looked fine; both cats ate normally.",
    follow: "If away again next month, same window works.",
    customer: "Thanks for the visit — cats seemed calm when we got home.",
  },
  {
    work: "Groom: bath, high-velocity dry, tidy feet and sanitary trim.",
    obs: "Small mat behind left ear — worked out without shaving.",
    follow: "Brush line at home 2x/week until summer.",
    customer: "Looks fluffy and smells great — thanks for the gentle handling.",
  },
  {
    work: "Training: leash pressure + turn-away for bike reactivity on quiet side street.",
    obs: "Threshold about 25 ft today — better than last session.",
    follow: "Homework: 3 short sessions before next walk.",
    customer: "We practiced the turns you showed — already less lunging.",
  },
  {
    work: "Meet & greet: temperament check, discussed routine and keys.",
    obs: "Dog friendly, no resource guarding noted in kitchen.",
    follow: "Book first full walk within 10 days to keep momentum.",
    customer: "Appreciated the clear plan — we will book the walk package.",
  },
];

function pickHistoricalStatus(rng: () => number): (typeof bookings.$inferSelect)["status"] {
  const r = rng();
  if (r < 0.82) return "completed";
  if (r < 0.9) return "cancelled";
  if (r < 0.96) return "no_show";
  return "rescheduled";
}

function pickCustomerIndex(rng: () => number): number {
  // Bias toward Morgan (0) and a few “regulars” for a community feel.
  const r = rng();
  if (r < 0.18) return 0;
  if (r < 0.3) return 6;
  if (r < 0.4) return 8;
  if (r < 0.48) return 24;
  return Math.floor(rng() * SEED_CUSTOMERS.length);
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

function paymentForBooking(
  service: ServiceRow,
  tierMultiplier: number,
  addOnCents: number
): string {
  const base = Number(service.priceAmount);
  const total = base * tierMultiplier + addOnCents / 100;
  return total.toFixed(2);
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[seed-demo-provider] DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = getDb();
  await ensureCanonicalTemplates(db);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing[0]) {
    await db.delete(users).where(eq(users.id, existing[0].id));
    console.log("[seed-demo-provider] Removed existing demo user and cascaded data.");
  }

  const rng = mulberry32(20260403);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userId = randomUUID();
  const now = DateTime.now().setZone(TZ);
  const todayStart = now.startOf("day");
  const historyStart = DateTime.fromObject({ year: 2026, month: 1, day: 1 }, { zone: TZ });
  const historyEnd = todayStart.minus({ days: 1 });

  await db.insert(users).values({
    id: userId,
    email: DEMO_EMAIL,
    passwordHash,
    emailVerifiedAt: new Date(),
    role: "provider",
  });

  const demoReferralCode = await allocateUniqueReferralCode(db);
  await db.insert(providers).values({
    userId,
    username: DEMO_USERNAME,
    referralCode: demoReferralCode,
    displayName: "Jordan Mercer",
    businessName: "River Valley Pet Care",
    bio: `I’m Jordan — I grew up around dogs and barn cats in rural New Brunswick, and I’ve been walking and sitting pets in Fredericton for four seasons now. I keep visits calm and predictable: clear notes, on-time arrivals, and photos when you want them. Most of my clients are neighbours and referrals — the kind of repeat relationships where I remember your pet’s quirks without asking twice.`,
    category: "Pet care",
    city: "Fredericton",
    countryCode: "CA",
    region: "NB",
    postalCode: "E3B1A5",
    serviceArea: "Fredericton, Oromocto, New Maryland, and nearby",
    contactEmail: "hello@rivervalleypetcare.test",
    contactPhone: "(506) 555-0199",
    publicProfileEnabled: true,
    discoverable: true,
    timezone: TZ,
    paymentCash: true,
    paymentEtransfer: true,
    etransferDetails: "Send to hello@rivervalleypetcare.test — include pet name in memo.",
    paymentDueBeforeAppointment: false,
    cancellationPolicy: "Please give 24 hours notice when possible so I can offer your spot to another family.",
    usernameLockedAt: localDateTimeToUtc(2026, 1, 5, 10, 0, TZ),
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

  const mult = (id: string) =>
    Number(tiers.find((t) => t.id === id)?.multiplier ?? 1);

  const slugList = [
    "quick-dog-walk-20",
    "dog-walk-45",
    "pet-sitting-drop-in",
    "pet-grooming-90",
    "consultation-30",
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

  const [svcQuick] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["quick-dog-walk-20"].id,
      canonicalTemplateVersion: bySlug["quick-dog-walk-20"].version,
      name: bySlug["quick-dog-walk-20"].name,
      description: bySlug["quick-dog-walk-20"].description,
      category: "Pet care",
      durationMinutes: bySlug["quick-dog-walk-20"].durationMinutes,
      pricingType: "fixed",
      priceAmount: "22.00",
      currency: "CAD",
      bufferMinutes: bySlug["quick-dog-walk-20"].bufferMinutes,
      prepInstructions: bySlug["quick-dog-walk-20"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 10,
      isActive: true,
    })
    .returning();

  const [svcWalk] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["dog-walk-45"].id,
      canonicalTemplateVersion: bySlug["dog-walk-45"].version,
      name: bySlug["dog-walk-45"].name,
      description: bySlug["dog-walk-45"].description,
      category: "Pet care",
      durationMinutes: bySlug["dog-walk-45"].durationMinutes,
      pricingType: "fixed",
      priceAmount: "38.00",
      currency: "CAD",
      bufferMinutes: bySlug["dog-walk-45"].bufferMinutes,
      prepInstructions: bySlug["dog-walk-45"].prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: standardTierId,
      sortOrder: 20,
      isActive: true,
    })
    .returning();

  const [svcSit] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["pet-sitting-drop-in"].id,
      canonicalTemplateVersion: bySlug["pet-sitting-drop-in"].version,
      name: bySlug["pet-sitting-drop-in"].name,
      description: bySlug["pet-sitting-drop-in"].description,
      category: "Pet care",
      durationMinutes: bySlug["pet-sitting-drop-in"].durationMinutes,
      pricingType: "fixed",
      priceAmount: "34.00",
      currency: "CAD",
      bufferMinutes: bySlug["pet-sitting-drop-in"].bufferMinutes,
      prepInstructions: bySlug["pet-sitting-drop-in"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 30,
      isActive: true,
    })
    .returning();

  const [svcGroom] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["pet-grooming-90"].id,
      canonicalTemplateVersion: bySlug["pet-grooming-90"].version,
      name: "Full Groom — Bath & Tidy (Premium)",
      description: bySlug["pet-grooming-90"].description,
      category: "Pet care",
      durationMinutes: bySlug["pet-grooming-90"].durationMinutes,
      pricingType: "fixed",
      priceAmount: "98.00",
      currency: "CAD",
      bufferMinutes: bySlug["pet-grooming-90"].bufferMinutes,
      prepInstructions: bySlug["pet-grooming-90"].prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: premiumTierId,
      sortOrder: 40,
      isActive: true,
    })
    .returning();

  const [svcMeet] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: bySlug["consultation-30"].id,
      canonicalTemplateVersion: bySlug["consultation-30"].version,
      name: "New Pet Meet & Greet (30 min)",
      description: bySlug["consultation-30"].description,
      category: "Pet care",
      durationMinutes: bySlug["consultation-30"].durationMinutes,
      pricingType: "fixed",
      priceAmount: "52.00",
      currency: "CAD",
      bufferMinutes: bySlug["consultation-30"].bufferMinutes,
      prepInstructions: bySlug["consultation-30"].prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 50,
      isActive: true,
    })
    .returning();

  if (!svcQuick || !svcWalk || !svcSit || !svcGroom || !svcMeet) {
    throw new Error("Service insert failed");
  }

  const meetAddOn = bySlug["consultation-30"].addOns.find((a) => a.id === "extra-15");
  if (meetAddOn?.id) {
    await db.insert(serviceAddOnOverrides).values({
      serviceId: svcMeet.id,
      addOnId: meetAddOn.id,
      enabled: true,
      priceOverride: "26.00",
    });
  }

  const servicePool: ServiceRow[] = [svcQuick, svcWalk, svcSit, svcGroom, svcMeet];
  const serviceWeight = [0.24, 0.32, 0.2, 0.09, 0.15];

  function pickService(r: () => number): ServiceRow {
    const x = r();
    let c = 0;
    for (let i = 0; i < servicePool.length; i++) {
      c += serviceWeight[i]!;
      if (x < c) return servicePool[i]!;
    }
    return svcWalk;
  }

  await db.insert(availabilityRules).values([
    { providerId, dayOfWeek: 1, startTimeLocal: "08:00", endTimeLocal: "17:00", isActive: true },
    { providerId, dayOfWeek: 2, startTimeLocal: "08:00", endTimeLocal: "17:00", isActive: true },
    { providerId, dayOfWeek: 3, startTimeLocal: "08:00", endTimeLocal: "14:00", isActive: true },
    { providerId, dayOfWeek: 4, startTimeLocal: "08:00", endTimeLocal: "17:00", isActive: true },
    { providerId, dayOfWeek: 5, startTimeLocal: "08:00", endTimeLocal: "17:00", isActive: true },
    { providerId, dayOfWeek: 6, startTimeLocal: "09:00", endTimeLocal: "13:00", isActive: true },
  ]);

  await db.insert(blockedTimes).values({
    providerId,
    startsAt: localDateTimeToUtc(2026, 3, 16, 0, 0, TZ),
    endsAt: localDateTimeToUtc(2026, 3, 20, 23, 59, TZ),
    reason: "Spring break — limited availability (family trip)",
  });

  const custRows: CustomerRow[] = [];
  for (const c of SEED_CUSTOMERS) {
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
    forceUnpaid?: boolean;
  };

  const planned: PlannedBooking[] = [];

  // --- Explicit “story” bookings (talking points) ---
  const morgan = custRows[0]!;
  const kerry = custRows[25]!;
  const jules = custRows[19]!;
  const patricia = custRows[20]!;
  const robin = custRows[24]!;

  function addPlan(p: PlannedBooking): void {
    planned.push(p);
  }

  // Morgan: rich repeat history
  const morganDates: [number, number, number][] = [
    [2026, 1, 4],
    [2026, 1, 11],
    [2026, 1, 18],
    [2026, 1, 25],
    [2026, 2, 1],
    [2026, 2, 8],
    [2026, 2, 19],
    [2026, 3, 1],
    [2026, 3, 8],
    [2026, 3, 15],
    [2026, 3, 22],
    [2026, 3, 29],
  ];
  for (const [y, mo, d] of morganDates) {
    const start = localDateTimeToUtc(y, mo, d, 10, 30, TZ);
    const end = new Date(start.getTime() + svcWalk.durationMinutes * 60 * 1000);
    addPlan({
      customerIdx: 0,
      service: svcWalk,
      start,
      end,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "etransfer",
      positioningTierId: standardTierId,
      selectedAddOnIds: [],
      internalNotes: "",
      customerNotes: rng() < 0.4 ? "Biscuit’s usual — side door" : "",
      createdAt: new Date(start.getTime() - (3 + Math.floor(rng() * 5)) * 86400000),
    });
  }

  // Premium grooming for Kerry (high value)
  addPlan({
    customerIdx: 25,
    service: svcGroom,
    start: localDateTimeToUtc(2026, 2, 14, 13, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 2, 14, 13, 0, TZ).getTime() + svcGroom.durationMinutes * 60000),
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "etransfer",
    positioningTierId: premiumTierId,
    selectedAddOnIds: [],
    internalNotes: "First premium groom — client stacked extra walks same week.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 2, 1, 9, 0, TZ),
  });

  // Cancellations
  addPlan({
    customerIdx: 7,
    service: svcWalk,
    start: localDateTimeToUtc(2026, 2, 3, 15, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 2, 3, 15, 0, TZ).getTime() + svcWalk.durationMinutes * 60000),
    status: "cancelled",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: standardTierId,
    selectedAddOnIds: [],
    internalNotes: "Client cancelled — work emergency.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 1, 28, 12, 0, TZ),
  });

  addPlan({
    customerIdx: 14,
    service: svcSit,
    start: localDateTimeToUtc(2026, 3, 10, 12, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 3, 10, 12, 0, TZ).getTime() + svcSit.durationMinutes * 60000),
    status: "cancelled",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: null,
    selectedAddOnIds: [],
    internalNotes: "Cancelled — trip postponed.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 3, 1, 8, 0, TZ),
  });

  // No-show
  addPlan({
    customerIdx: 16,
    service: svcQuick,
    start: localDateTimeToUtc(2026, 2, 21, 9, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 2, 21, 9, 0, TZ).getTime() + svcQuick.durationMinutes * 60000),
    status: "no_show",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: standardTierId,
    selectedAddOnIds: [],
    internalNotes: "No answer at door or phone.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 2, 19, 10, 0, TZ),
  });

  // Rescheduled (original slot kept as rescheduled record)
  addPlan({
    customerIdx: 11,
    service: svcWalk,
    start: localDateTimeToUtc(2026, 3, 5, 16, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 3, 5, 16, 0, TZ).getTime() + svcWalk.durationMinutes * 60000),
    status: "rescheduled",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: standardTierId,
    selectedAddOnIds: [],
    internalNotes: "Leash-training focus — moved to March 6 (kid sick at home).",
    customerNotes: "Can we do Thursday instead?",
    createdAt: localDateTimeToUtc(2026, 2, 27, 14, 0, TZ),
  });

  // Unpaid completed (assistant / payment nudge)
  addPlan({
    customerIdx: 4,
    service: svcWalk,
    start: localDateTimeToUtc(2026, 3, 28, 11, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 3, 28, 11, 0, TZ).getTime() + svcWalk.durationMinutes * 60000),
    status: "completed",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: enhancedTierId,
    selectedAddOnIds: [],
    internalNotes: "Cash preferred at next visit — still outstanding.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 3, 20, 9, 0, TZ),
    forceUnpaid: true,
  });

  // Lapsed customers — last visits Jan 1, 2026 so they are past the app’s 90-day “lapsed” window on demo day in April
  addPlan({
    customerIdx: 19,
    service: svcSit,
    start: localDateTimeToUtc(2026, 1, 1, 8, 30, TZ),
    end: new Date(localDateTimeToUtc(2026, 1, 1, 8, 30, TZ).getTime() + svcSit.durationMinutes * 60000),
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "cash",
    positioningTierId: null,
    selectedAddOnIds: [],
    internalNotes: "",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 1, 1, 7, 15, TZ),
  });

  addPlan({
    customerIdx: 20,
    service: svcWalk,
    start: localDateTimeToUtc(2026, 1, 1, 14, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 1, 1, 14, 0, TZ).getTime() + svcWalk.durationMinutes * 60000),
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "etransfer",
    positioningTierId: standardTierId,
    selectedAddOnIds: [],
    internalNotes: "",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 1, 1, 7, 20, TZ),
  });

  addPlan({
    customerIdx: 21,
    service: svcMeet,
    start: localDateTimeToUtc(2026, 1, 1, 10, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 1, 1, 10, 0, TZ).getTime() + svcMeet.durationMinutes * 60000),
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "cash",
    positioningTierId: null,
    selectedAddOnIds: ["extra-15"],
    internalNotes: "",
    customerNotes: "Extra time helped — lots of questions.",
    createdAt: localDateTimeToUtc(2026, 1, 1, 7, 10, TZ),
  });

  // Random historical filler until ~58 past bookings
  let guard = 0;
  while (planned.filter((b) => b.start < todayStart.toUTC().toJSDate()).length < 58 && guard < 8000) {
    guard++;
    const day = randomDayBetween(rng, historyStart, historyEnd);
    const svc = pickService(rng);
    const { start, end } = pickTimeAndDuration(rng, day, svc);
    if (start >= todayStart.toUTC().toJSDate()) continue;
    const st = pickHistoricalStatus(rng);
    const custIdx = pickCustomerIndex(rng);
    let pay: (typeof bookings.$inferSelect)["paymentStatus"] = "paid";
    let method: string | null = rng() < 0.55 ? "etransfer" : "cash";
    if (st !== "completed") {
      pay = "unpaid";
      method = null;
    } else if (rng() < 0.07) {
      pay = "waived";
      method = null;
    }
    const tierId =
      svc.id === svcGroom.id ? premiumTierId : rng() < 0.12 ? enhancedTierId : standardTierId;
    const addOns =
      svc.id === svcMeet.id && rng() < 0.35 ? ["extra-15"] : ([] as string[]);
    const createdAt = new Date(
      start.getTime() - (1 + Math.floor(rng() * 8)) * 86400000 - Math.floor(rng() * 3600000)
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
      internalNotes: rng() < 0.08 ? "Repeat client — knows the routine." : "",
      customerNotes: rng() < 0.05 ? "Key under mat today." : "",
      createdAt,
    });
  }

  // Dedupe overlapping same customer same day (light pass)
  const seen = new Set<string>();
  const deduped: PlannedBooking[] = [];
  for (const p of planned.sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const dayKey = `${p.customerIdx}-${p.start.toISOString().slice(0, 10)}`;
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    deduped.push(p);
  }

  // Future bookings (relative to “today” in Atlantic time)
  const tomorrow = todayStart.plus({ days: 1 });
  const nextWeek = todayStart.plus({ days: 7 });
  const laterThisMonth = todayStart.day <= 22 ? todayStart.set({ day: 26 }) : todayStart.plus({ days: 12 });
  const pendingDay = todayStart.plus({ days: 5 });

  const [newFutureCustomer] = await db
    .insert(customers)
    .values({
      providerId,
      fullName: "Alex Poirier",
      email: "alex.poirier.new.client@gmail.com",
      emailNormalized: normalizeEmail("alex.poirier.new.client@gmail.com"),
      phone: "(506) 555-0130",
      phoneNormalized: normalizePhone("(506) 555-0130"),
      notes: "New inquiry from Instagram — first booking pending.",
      communicationNotes: "",
      accountReady: true,
    })
    .returning();

  if (!newFutureCustomer) throw new Error("Future customer failed");

  const jordan = custRows[5]!;

  const futureResolved: (PlannedBooking & { customerId: string })[] = [
    {
      customerIdx: 0,
      customerId: morgan.id,
      service: svcWalk,
      start: localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 9, 30, TZ),
      end: new Date(
        localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 9, 30, TZ).getTime() +
          svcWalk.durationMinutes * 60000
      ),
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "etransfer",
      positioningTierId: standardTierId,
      selectedAddOnIds: [],
      internalNotes: "Demo: tomorrow — repeat client Morgan.",
      customerNotes: "Same route as usual please.",
      createdAt: localDateTimeToUtc(2026, 4, 1, 16, 0, TZ),
    },
    {
      customerIdx: 0,
      customerId: robin.id,
      service: svcSit,
      start: localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 15, 0, TZ),
      end: new Date(
        localDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 15, 0, TZ).getTime() +
          svcSit.durationMinutes * 60000
      ),
      status: "confirmed",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: null,
      selectedAddOnIds: [],
      internalNotes: "",
      customerNotes: "Back door code updated — check text.",
      createdAt: localDateTimeToUtc(2026, 4, 2, 9, 0, TZ),
    },
    {
      customerIdx: 0,
      customerId: kerry.id,
      service: svcGroom,
      start: localDateTimeToUtc(nextWeek.year, nextWeek.month, nextWeek.day, 10, 0, TZ),
      end: new Date(
        localDateTimeToUtc(nextWeek.year, nextWeek.month, nextWeek.day, 10, 0, TZ).getTime() +
          svcGroom.durationMinutes * 60000
      ),
      status: "confirmed",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: premiumTierId,
      selectedAddOnIds: [],
      internalNotes: "Premium groom — Kerry’s regular spring appointment.",
      customerNotes: "",
      createdAt: localDateTimeToUtc(2026, 4, 2, 11, 0, TZ),
    },
    {
      customerIdx: 0,
      customerId: newFutureCustomer.id,
      service: svcMeet,
      start: localDateTimeToUtc(pendingDay.year, pendingDay.month, pendingDay.day, 13, 30, TZ),
      end: new Date(
        localDateTimeToUtc(pendingDay.year, pendingDay.month, pendingDay.day, 13, 30, TZ).getTime() +
          svcMeet.durationMinutes * 60000
      ),
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: null,
      selectedAddOnIds: [],
      internalNotes: "Demo: pending approval — brand new client.",
      customerNotes: "We’re adopting a rescue next week — want to meet first.",
      createdAt: localDateTimeToUtc(2026, 4, 3, 8, 0, TZ),
    },
    {
      customerIdx: 0,
      customerId: jordan.id,
      service: svcWalk,
      start: localDateTimeToUtc(laterThisMonth.year, laterThisMonth.month, laterThisMonth.day, 16, 0, TZ),
      end: new Date(
        localDateTimeToUtc(laterThisMonth.year, laterThisMonth.month, laterThisMonth.day, 16, 0, TZ).getTime() +
          svcWalk.durationMinutes * 60000
      ),
      status: "confirmed",
      paymentStatus: "partially_paid",
      paymentMethod: "etransfer",
      positioningTierId: standardTierId,
      selectedAddOnIds: [],
      internalNotes: "Deposit for walk package — balance day-of. Leash reactivity practice.",
      customerNotes: "",
      createdAt: localDateTimeToUtc(2026, 4, 2, 18, 30, TZ),
    },
    {
      customerIdx: 0,
      customerId: patricia.id,
      service: svcWalk,
      start: localDateTimeToUtc(2026, 5, 7, 11, 0, TZ),
      end: new Date(localDateTimeToUtc(2026, 5, 7, 11, 0, TZ).getTime() + svcWalk.durationMinutes * 60000),
      status: "cancelled",
      paymentStatus: "unpaid",
      paymentMethod: null,
      positioningTierId: standardTierId,
      selectedAddOnIds: [],
      internalNotes: "Client cancelled — booked a kennel instead for that week.",
      customerNotes: "",
      createdAt: localDateTimeToUtc(2026, 4, 1, 14, 0, TZ),
    },
  ];

  const insertedBookingIds: { id: string; plan: PlannedBooking; customerId: string }[] = [];

  for (const p of deduped) {
    const cust = custRows[p.customerIdx]!;
    const tierId = p.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const addOnCents =
      p.selectedAddOnIds.includes("extra-15") && p.service.id === svcMeet.id ? 2600 : 0;
    const payAmt = paymentForBooking(p.service, tierMul, addOnCents);
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
        paymentAmount: p.status === "completed" || p.status === "confirmed" ? payAmt : null,
        tipPercent: rng() < 0.15 ? (rng() < 0.5 ? "10.00" : "15.00") : "0",
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

  for (const f of futureResolved) {
    const tierId = f.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const addOnCents =
      f.selectedAddOnIds.includes("extra-15") && f.service.id === svcMeet.id ? 2600 : 0;
    const payAmt = paymentForBooking(f.service, tierMul, addOnCents);
    const amountForRow = f.status === "cancelled" ? null : payAmt;
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
        paymentAmount: amountForRow,
        tipPercent: "0",
        positioningTierId: f.positioningTierId,
        selectedAddOnIds: f.selectedAddOnIds,
        internalNotes: f.internalNotes,
        customerNotes: f.customerNotes,
        bufferAfterMinutes: f.service.bufferMinutes,
        createdAt: f.createdAt,
        updatedAt: f.createdAt,
      })
      .returning({ id: bookings.id });
    if (row)
      insertedBookingIds.push({
        id: row.id,
        plan: {
          customerIdx: 0,
          service: f.service,
          start: f.start,
          end: f.end,
          status: f.status,
          paymentStatus: f.paymentStatus,
          paymentMethod: f.paymentMethod,
          positioningTierId: f.positioningTierId,
          selectedAddOnIds: f.selectedAddOnIds,
          internalNotes: f.internalNotes,
          customerNotes: f.customerNotes,
          createdAt: f.createdAt,
        },
        customerId: f.customerId,
      });
  }

  // Service cards for completed visits
  let cardN = 0;
  for (const row of insertedBookingIds) {
    if (row.plan.status !== "completed") continue;
    if (rng() > 0.72) continue;
    const sn = CARD_SNIPPETS[cardN % CARD_SNIPPETS.length]!;
    cardN++;
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
      internalNotes: rng() < 0.2 ? "Invoice sent same day." : "",
      customerVisibleSummary: sn.customer,
      createdByUserId: userId,
      createdAt: row.plan.end,
      updatedAt: row.plan.end,
    });
  }

  // Customer recommendations
  const patriciaPast = insertedBookingIds.find(
    (b) => b.customerId === patricia.id && b.plan.status === "completed"
  );
  const patriciaCard = patriciaPast
    ? await db
        .select({ id: serviceCards.id })
        .from(serviceCards)
        .where(eq(serviceCards.bookingId, patriciaPast.id))
        .limit(1)
    : [];

  await db.insert(customerRecommendations).values([
    {
      providerId,
      customerId: jules.id,
      sourceBookingId: null,
      sourceServiceCardId: null,
      fulfillmentBookingId: null,
      title: "Rebook drop-in before summer travel",
      description:
        "You mentioned a June trip — we can line up visits before you finalize boarding.",
      reason: "No bookings since mid-January; friendly reconnection.",
      suggestedTimeframe: "within_30_days",
      timeframeDetail: "Aim for a short visit in the next month to refresh keys/notes.",
      status: "open",
      createdByUserId: userId,
    },
    {
      providerId,
      customerId: patricia.id,
      sourceBookingId: patriciaPast?.id ?? null,
      sourceServiceCardId: patriciaCard[0]?.id ?? null,
      fulfillmentBookingId: null,
      title: "Try a quick walk package after adoption",
      description: "When the new pet settles in, short walks build routine faster than long sporadic outings.",
      reason: "Customer considering adoption — proactive plan.",
      suggestedTimeframe: "next_visit",
      timeframeDetail: "",
      status: "open",
      createdByUserId: userId,
    },
    {
      providerId,
      customerId: kerry.id,
      sourceBookingId: null,
      sourceServiceCardId: null,
      fulfillmentBookingId: null,
      title: "Bundle walks + grooming in April",
      description: "Pair the spring groom with a refresher walk for leash skills.",
      reason: "High-value client — seasonal upsell.",
      suggestedTimeframe: "seasonal",
      timeframeDetail: "Spring shed season",
      status: "booked",
      createdByUserId: userId,
    },
  ]);

  await db.insert(providerDashboardSignals).values({
    providerId,
    signalKind: BOOKING_FAILED_SIGNAL_KIND,
    metadata: {
      email: "almost.booked@example.com",
      phone: "(506) 555-0999",
      errorSnippet: "timeout",
      attempts: [
        {
          seenAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          email: "almost.booked@example.com",
          phone: "(506) 555-0999",
          errorSnippet: "Slot no longer available",
        },
      ],
    },
    firstSeenAt: new Date(Date.now() - 86400000 * 3),
    lastSeenAt: new Date(Date.now() - 86400000),
    occurrenceCount: 2,
    dismissedAt: null,
  });

  await db.insert(assistantPreferences).values({
    providerId,
    disabledSuggestionTypes: [],
    quietMode: false,
  });

  await db.insert(assistantSuggestions).values({
    providerId,
    dedupeKey: "seed:demo:community_spotlight",
    type: "seed_demo",
    title: "Highlight your repeat clients this week",
    summary:
      "You have several clients booking biweekly — a short thank-you note can turn them into referral champions.",
    priorityScore: 40,
    urgencyLevel: "low",
    status: "new",
    surfaceMode: "drawer_card",
    reasonJson: { source: "seed" },
    actionPayloadJson: { href: "/dashboard/customers", actions: ["view"] },
  });

  await db.insert(assistantEvents).values([
    {
      providerId,
      eventType: "seed.demo_ready",
      payload: { message: "Demo account refreshed" },
      relatedEntityType: "provider",
      relatedEntityId: providerId,
    },
    {
      providerId,
      eventType: "booking.completed",
      payload: { note: "Historical completions loaded" },
      relatedEntityType: null,
      relatedEntityId: null,
    },
  ]);

  await db.insert(marketingCampaigns).values([
    {
      providerId,
      title: "Spring coat — book grooming early",
      campaignType: "seasonal",
      targetAudience: "repeat_clients",
      channel: "email",
      sendTiming: "scheduled",
      scheduledAt: localDateTimeToUtc(2026, 4, 12, 10, 0, TZ),
      messageBody:
        "Hi {{name}}, shedding season is here. Reply with your dog’s name and I’ll suggest a groom date.",
      status: "scheduled",
    },
    {
      providerId,
      title: "We miss Jules & the crew",
      campaignType: "reconnect",
      targetAudience: "lapsed_45d",
      channel: "email",
      sendTiming: "draft",
      messageBody:
        "Hi {{name}}, it’s been a while since your last drop-in. Want me to hold your usual window in May?",
      status: "draft",
    },
  ]);

  await db.insert(marketingSavedContents).values({
    providerId,
    source: "seed",
    title: "Neighbourhood dog walk — April tone",
    primaryText:
      "Friendly, local, and on-time — River Valley Pet Care still has a few walk slots for new pups in April.",
    alternatives: [
      "Same-day updates and photos — walks that fit real Fredericton routines.",
      "Refer a neighbour: both get $5 off a first booking.",
    ],
    cta: "Reply to book",
    channel: "email",
    context: { demo: true },
  });

  const totalBookings = insertedBookingIds.length;
  const pastCount = insertedBookingIds.filter((b) => b.plan.start < todayStart.toUTC().toJSDate()).length;
  const futureCount = totalBookings - pastCount;

  console.log("");
  console.log("=== Handshake Local — demo provider seed ===");
  console.log(`Provider: ${DEMO_USERNAME} (${providerId})`);
  console.log(`Customers: ${custRows.length + 1} (includes one future-only new lead)`);
  console.log(`Bookings inserted: ${totalBookings} (~${pastCount} past, ~${futureCount} upcoming)`);
  console.log(`Services: ${servicePool.length} (pet care — quick walk through premium groom; meet & greet has add-on override)`);
  console.log(`Timezone: ${TZ}`);
  console.log("");
  console.log("Login:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log("");
  console.log("Talking points: repeat client (Morgan), lapsed clients, tomorrow visits, premium groom,");
  console.log("  cancellations, pending new-client request, unpaid completed visit, rich service cards.");
  console.log("");

  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  void closeDbConnection().finally(() => process.exit(1));
});
