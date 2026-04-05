/**
 * Demo provider: busy seasonal property / exterior services (Handshake Local).
 *
 * Run (from repo root):
 *   npm run db:seed:demo-property
 *
 * Removes and recreates ONLY this demo login user and its data (by email).
 * Does not modify the default pet-care demo (`npm run db:seed:demo`).
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { count, eq, inArray } from "drizzle-orm";
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
import { syncIncomeRecordFromBooking } from "@/domain/money/sync-income-from-booking";
import { hashPassword } from "@/lib/password";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

const DEMO_EMAIL = "demo.property@handshakelocal.test";
const DEMO_PASSWORD = "DemoProperty2026!";
const DEMO_USERNAME = "florenceville-exterior-services";
const TZ = "America/Moncton";

const FIRST_NAMES = [
  "Marc",
  "Anik",
  "Sylvie",
  "Denis",
  "Julie",
  "Rémi",
  "Chantal",
  "Luc",
  "Mélanie",
  "Gilles",
  "Nicole",
  "Patrick",
  "Isabelle",
  "Roger",
  "Karine",
  "Michel",
  "Louise",
  "Bruno",
  "Hélène",
  "Yves",
  "Carole",
  "André",
  "Manon",
  "Paul",
  "Véronique",
  "Claude",
  "Line",
  "Daniel",
  "Sophie",
  "Robert",
  "Marie",
  "Jean",
  "Nathalie",
  "Alain",
  "Catherine",
  "Bernard",
  "Anne",
  "Jacques",
  "Françoise",
  "Raymond",
  "Linda",
  "Donald",
  "Rachel",
  "Kevin",
  "Amanda",
  "Scott",
  "Heather",
  "Brian",
  "Jennifer",
  "Michael",
  "Sarah",
  "David",
  "Emily",
  "James",
  "Laura",
  "Thomas",
  "Jessica",
  "Christopher",
  "Ashley",
  "Matthew",
  "Stephanie",
  "Andrew",
  "Melissa",
  "Ryan",
  "Nicole",
  "Brandon",
  "Samantha",
  "Jonathan",
  "Rebecca",
  "Benjamin",
  "Michelle",
  "Gregory",
  "Kimberly",
  "Samuel",
  "Angela",
  "Alexander",
  "Deborah",
  "Frank",
  "Sharon",
  "Henry",
  "Donna",
  "Jack",
  "Carolyn",
  "Wayne",
  "Janet",
  "Ralph",
  "Martha",
  "Roy",
  "Brenda",
  "Eugene",
  "Virginia",
  "Louis",
  "Diane",
  "Philip",
  "Joyce",
  "Willie",
  "Janice",
  "Albert",
  "Jean",
  "Arthur",
  "Kelly",
  "Lawrence",
  "Christina",
  "Joe",
  "Joan",
  "Carl",
  "Evelyn",
  "Willie",
  "Judith",
  "Jesse",
  "Megan",
  "Billy",
  "Cheryl",
  "Bryan",
  "Andrea",
  "Bruce",
  "Hannah",
  "Jordan",
  "Jacqueline",
  "Dylan",
  "Martha",
  "Alan",
  "Gloria",
  "Juan",
  "Teresa",
  "Wayne",
  "Sara",
  "Randy",
  "Janice",
  "Harry",
  "Julia",
  "Ralph",
  "Heather",
  "Lawrence",
  "Marie",
  "Nicholas",
  "Diane",
  "Alice",
  "Gary",
  "Frances",
  "Keith",
  "Christine",
  "Roger",
  "Gerald",
  "Emma",
  "Eric",
  "Catherine",
  "Stephen",
  "Debra",
  "Jacob",
  "Rachel",
  "Larry",
  "Carol",
  "Frank",
  "Janet",
];

const LAST_NAMES = [
  "Beaulieu",
  "Cormier",
  "Robichaud",
  "LeBlanc",
  "Boucher",
  "Landry",
  "Thériault",
  "Savoie",
  "Gallant",
  "Arsenault",
  "Doucet",
  "Roy",
  "Bergeron",
  "Côté",
  "Pelletier",
  "Boudreau",
  "Melanson",
  "Richard",
  "Levesque",
  "Gaudet",
  "Muise",
  "Comeau",
  "Surette",
  "Léger",
  "Breau",
  "Vautour",
  "Hachey",
  "Maillet",
  "St-Pierre",
  "Chiasson",
  "Ouellette",
  "Bélanger",
  "Fournier",
  "Gagnon",
  "Lavoie",
  "Michaud",
  "Cloutier",
  "Dupuis",
  "Fontaine",
  "Girard",
  "Lapointe",
  "Morin",
  "Poirier",
  "Simard",
  "Tremblay",
  "Bouchard",
  "Côté",
  "Desjardins",
  "Gauthier",
  "Laliberté",
  "Martel",
  "Paquet",
  "Rousseau",
  "Turgeon",
  "Veilleux",
  "Wheatley",
  "MacDonald",
  "Sullivan",
  "Keating",
  "Donovan",
  "Hayes",
  "Bishop",
  "O'Donnell",
  "Price",
  "Roach",
  "St-Pierre",
  "Veilleux",
  "Cormier",
  "Landry",
  "LeBlanc",
  "Arsenault",
  "Surette",
  "Robichaud",
  "Gallant",
  "Boucher",
  "Thériault",
  "Melanson",
  "Bergeron",
  "Pelletier",
  "Boudreau",
  "Richard",
  "Levesque",
  "Gaudet",
  "Comeau",
  "Léger",
  "Breau",
  "Vautour",
  "Hachey",
  "Maillet",
  "Chiasson",
  "Ouellette",
  "Bélanger",
  "Fournier",
  "Gagnon",
  "Lavoie",
  "Michaud",
  "Cloutier",
  "Dupuis",
  "Fontaine",
  "Girard",
  "Lapointe",
  "Morin",
  "Poirier",
  "Simard",
  "Tremblay",
  "Bouchard",
  "Desjardins",
  "Gauthier",
  "Laliberté",
  "Martel",
  "Paquet",
  "Rousseau",
  "Turgeon",
  "Veilleux",
  "Wheatley",
  "MacDonald",
  "Sullivan",
  "Keating",
  "Donovan",
  "Hayes",
  "Bishop",
  "O'Donnell",
  "Price",
  "Roach",
];

const CUSTOMER_NOTES: string[] = [
  "Residential — long driveway, mark edges in deep snow.",
  "Seasonal resident — call before service; gate code changes.",
  "Elderly homeowner — prefers morning visits; side entrance.",
  "Rental duplex — two driveways; bill landlord.",
  "Small commercial plaza — salt walks after every plow.",
  "Cottage — steep driveway; sand on request.",
  "Landlord portfolio — text day-before for tenant access.",
  "Duplex — upstairs/downstairs; shared walk.",
  "Farm lane access — watch for livestock gates.",
  "Condo row — limited stacking; haul-away extra.",
  "New build — soft edges; flag irrigation heads in spring.",
  "Recurring lawn — bag clippings spring only.",
  "Hedge trim — avoid cedar tops (customer request).",
  "Commercial yard — unload in designated corral only.",
  "E-transfer only — include civic address in memo.",
];

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

type SvcMap = {
  snowStd: ServiceRow;
  snowLarge: ServiceRow;
  snowBlow: ServiceRow;
  salt: ServiceRow;
  stormPriority: ServiceRow;
  snowCommercial: ServiceRow;
  postStormCheck: ServiceRow;
  mowWeekly: ServiceRow;
  mowBiweekly: ServiceRow;
  springCleanup: ServiceRow;
  hedge: ServiceRow;
  debris: ServiceRow;
  exteriorCheck: ServiceRow;
  rentalTurnover: ServiceRow;
  maintenance: ServiceRow;
};

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

function pickHistoricalStatus(rng: () => number): (typeof bookings.$inferSelect)["status"] {
  const r = rng();
  if (r < 0.86) return "completed";
  if (r < 0.93) return "cancelled";
  if (r < 0.97) return "no_show";
  return "rescheduled";
}

function pickPaymentMethod(rng: () => number): "cash" | "etransfer" | "in_person_credit_debit" {
  const r = rng();
  if (r < 0.38) return "etransfer";
  if (r < 0.72) return "cash";
  return "in_person_credit_debit";
}

function pickCustomerIndex(rng: () => number, repeatBias: number[]): number {
  const r = rng();
  if (r < 0.42) {
    return repeatBias[Math.floor(rng() * repeatBias.length)]!;
  }
  return Math.floor(rng() * 85);
}

function randomDayBetween(rng: () => number, start: DateTime, end: DateTime): DateTime {
  const days = Math.max(0, Math.floor(end.diff(start, "days").days));
  const off = Math.floor(rng() * (days + 1));
  return start.plus({ days: off });
}

function pickWinterTime(rng: () => number, day: DateTime, service: ServiceRow): { start: Date; end: Date } {
  const hourPool = day.weekday >= 6 ? [6, 7, 8, 9, 10, 11, 12, 13] : [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const h = hourPool[Math.floor(rng() * hourPool.length)]!;
  const minute = rng() < 0.5 ? 0 : rng() < 0.85 ? 15 : 30;
  const startLocal = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour: h, minute, second: 0 },
    { zone: TZ }
  );
  const endLocal = startLocal.plus({ minutes: service.durationMinutes });
  return { start: startLocal.toUTC().toJSDate(), end: endLocal.toUTC().toJSDate() };
}

function pickSummerTime(rng: () => number, day: DateTime, service: ServiceRow): { start: Date; end: Date } {
  const hourPool = day.weekday >= 6 ? [8, 9, 10, 11, 12, 13] : [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const h = hourPool[Math.floor(rng() * hourPool.length)]!;
  const minute = rng() < 0.55 ? 0 : rng() < 0.88 ? 30 : 15;
  const startLocal = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour: h, minute, second: 0 },
    { zone: TZ }
  );
  const endLocal = startLocal.plus({ minutes: service.durationMinutes });
  return { start: startLocal.toUTC().toJSDate(), end: endLocal.toUTC().toJSDate() };
}

function pickServiceForSeason(
  rng: () => number,
  month: number,
  storm: boolean,
  svc: SvcMap
): ServiceRow {
  if (storm) {
    const r = rng();
    if (r < 0.22) return svc.snowStd;
    if (r < 0.42) return svc.snowLarge;
    if (r < 0.58) return svc.snowBlow;
    if (r < 0.7) return svc.salt;
    if (r < 0.78) return svc.stormPriority;
    if (r < 0.9) return svc.snowCommercial;
    return svc.postStormCheck;
  }
  if (month <= 3) {
    const r = rng();
    if (r < 0.28) return svc.snowStd;
    if (r < 0.48) return svc.snowLarge;
    if (r < 0.62) return svc.snowBlow;
    if (r < 0.72) return svc.salt;
    if (r < 0.8) return svc.stormPriority;
    if (r < 0.88) return svc.snowCommercial;
    if (r < 0.93) return svc.postStormCheck;
    if (r < 0.97) return svc.exteriorCheck;
    return svc.maintenance;
  }
  if (month === 4) {
    const r = rng();
    if (r < 0.12) return svc.snowStd;
    if (r < 0.2) return svc.snowBlow;
    if (r < 0.38) return svc.springCleanup;
    if (r < 0.52) return svc.debris;
    if (r < 0.68) return svc.mowWeekly;
    if (r < 0.82) return svc.mowBiweekly;
    if (r < 0.9) return svc.hedge;
    return svc.exteriorCheck;
  }
  // May–June: lawn-heavy
  const r = rng();
  if (r < 0.48) return svc.mowWeekly;
  if (r < 0.78) return svc.mowBiweekly;
  if (r < 0.88) return svc.springCleanup;
  if (r < 0.93) return svc.hedge;
  if (r < 0.97) return svc.debris;
  return svc.maintenance;
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[seed-demo-provider-property-services] DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = getDb();
  await ensureCanonicalTemplates(db);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing[0]) {
    await db.delete(users).where(eq(users.id, existing[0].id));
    console.log("[seed-demo-provider-property-services] Removed existing demo user and cascaded data.");
  }

  const rng = mulberry32(202604055);
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

  const propertyReferralCode = await allocateUniqueReferralCode(db);
  await db.insert(providers).values({
    userId,
    username: DEMO_USERNAME,
    referralCode: propertyReferralCode,
    displayName: "Chris Brennan",
    businessName: "Florenceville-Bristol Exterior Property Services",
    bio: `We are a Florenceville-Bristol crew serving homeowners, landlords, and small commercial sites across the upper Saint John River valley. Winter means dependable plowing, blowing, and ice control when storms hit; summer means route-based mowing, cleanups, and exterior upkeep you can plan around. Clear communication, fair pricing, and crews that treat your property like their own.`,
    category: "Home Services",
    city: "Florenceville-Bristol",
    countryCode: "CA",
    region: "NB",
    postalCode: "E7L 2K0",
    serviceArea: "Florenceville-Bristol, Bristol, nearby river valley roads, and selected routes toward Woodstock",
    contactEmail: "hello@fbexterior.test",
    contactPhone: "(506) 555-0280",
    publicProfileEnabled: true,
    discoverable: true,
    timezone: TZ,
    paymentCash: true,
    paymentEtransfer: true,
    etransferDetails: "Send to hello@fbexterior.test — include civic address and service date in the memo.",
    paymentInPersonCreditDebit: true,
    paymentDueBeforeAppointment: false,
    cancellationPolicy:
      "Storm routes shift quickly — we will notify you if timing moves. For seasonal mowing, please give 48 hours notice on skips when possible.",
    usernameLockedAt: localDateTimeToUtc(2026, 1, 2, 9, 0, TZ),
    defaultServiceLevelsEnabled: true,
    bookingLeadTimeMinutes: 180,
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

  const slugList = [
    "snow-removal-driveway",
    "snow-blowing-walkways-45",
    "salting-sanding-25",
    "consultation-30",
    "lawn-care-60",
    "seasonal-yard-cleanup",
    "garden-maintenance-90",
    "handyman-visit-90",
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

  const tSnow = bySlug["snow-removal-driveway"];
  const tBlow = bySlug["snow-blowing-walkways-45"];
  const tSalt = bySlug["salting-sanding-25"];
  const tConsult = bySlug["consultation-30"];
  const tLawn = bySlug["lawn-care-60"];
  const tSeasonal = bySlug["seasonal-yard-cleanup"];
  const tGarden = bySlug["garden-maintenance-90"];
  const tHandy = bySlug["handyman-visit-90"];

  const [snowStd] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tSnow.id,
      canonicalTemplateVersion: tSnow.version,
      name: "Standard driveway snow plow",
      description: tSnow.description,
      category: "Home Services",
      durationMinutes: 45,
      pricingType: "fixed",
      priceAmount: "58.00",
      currency: "CAD",
      bufferMinutes: tSnow.bufferMinutes,
      prepInstructions: tSnow.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: standardTierId,
      sortOrder: 10,
      isActive: true,
    })
    .returning();

  const [snowLarge] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tSnow.id,
      canonicalTemplateVersion: tSnow.version,
      name: "Large driveway snow plow",
      description: tSnow.description,
      category: "Home Services",
      durationMinutes: 75,
      pricingType: "fixed",
      priceAmount: "98.00",
      currency: "CAD",
      bufferMinutes: 15,
      prepInstructions: tSnow.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: premiumTierId,
      sortOrder: 20,
      isActive: true,
    })
    .returning();

  const [snowBlow] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tBlow.id,
      canonicalTemplateVersion: tBlow.version,
      name: "Snow blowing — walkways & side entrances",
      description: tBlow.description,
      category: "Home Services",
      durationMinutes: tBlow.durationMinutes,
      pricingType: "fixed",
      priceAmount: "55.00",
      currency: "CAD",
      bufferMinutes: tBlow.bufferMinutes,
      prepInstructions: tBlow.prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 30,
      isActive: true,
    })
    .returning();

  const [salt] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tSalt.id,
      canonicalTemplateVersion: tSalt.version,
      name: "Salting / sanding (walks & apron)",
      description: tSalt.description,
      category: "Home Services",
      durationMinutes: tSalt.durationMinutes,
      pricingType: "fixed",
      priceAmount: "42.00",
      currency: "CAD",
      bufferMinutes: tSalt.bufferMinutes,
      prepInstructions: tSalt.prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 40,
      isActive: true,
    })
    .returning();

  const [stormPriority] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tConsult.id,
      canonicalTemplateVersion: tConsult.version,
      name: "Storm priority service (same-night window)",
      description:
        "Priority response during active storms — we stage you earlier in the route when conditions are hazardous. Subject to route density.",
      category: "Home Services",
      durationMinutes: 30,
      pricingType: "fixed",
      priceAmount: "65.00",
      currency: "CAD",
      bufferMinutes: 5,
      prepInstructions: tConsult.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: enhancedTierId,
      sortOrder: 50,
      isActive: true,
    })
    .returning();

  const [snowCommercial] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tSnow.id,
      canonicalTemplateVersion: tSnow.version,
      name: "Commercial lot clearing",
      description:
        "Plowing and stacking for small commercial yards and multi-unit drives. Ice control billed separately unless bundled in notes.",
      category: "Home Services",
      durationMinutes: 120,
      pricingType: "fixed",
      priceAmount: "240.00",
      currency: "CAD",
      bufferMinutes: 20,
      prepInstructions: tSnow.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: premiumTierId,
      sortOrder: 60,
      isActive: true,
    })
    .returning();

  const [postStormCheck] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tHandy.id,
      canonicalTemplateVersion: tHandy.version,
      name: "Post-storm property check",
      description:
        "Quick exterior walk-around after major storms — gutters, vents, damage flags, and photo notes for insurance if needed.",
      category: "Home Services",
      durationMinutes: 60,
      pricingType: "fixed",
      priceAmount: "95.00",
      currency: "CAD",
      bufferMinutes: 10,
      prepInstructions: tHandy.prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 70,
      isActive: true,
    })
    .returning();

  const [mowWeekly] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tLawn.id,
      canonicalTemplateVersion: tLawn.version,
      name: "Weekly lawn mowing + edging",
      description: tLawn.description,
      category: "Home Services",
      durationMinutes: 60,
      pricingType: "fixed",
      priceAmount: "72.00",
      currency: "CAD",
      bufferMinutes: tLawn.bufferMinutes,
      prepInstructions: tLawn.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: standardTierId,
      sortOrder: 80,
      isActive: true,
    })
    .returning();

  const [mowBiweekly] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tLawn.id,
      canonicalTemplateVersion: tLawn.version,
      name: "Biweekly lawn mowing + edging",
      description: tLawn.description,
      category: "Home Services",
      durationMinutes: 75,
      pricingType: "fixed",
      priceAmount: "92.00",
      currency: "CAD",
      bufferMinutes: 12,
      prepInstructions: tLawn.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: standardTierId,
      sortOrder: 90,
      isActive: true,
    })
    .returning();

  const [springCleanup] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tSeasonal.id,
      canonicalTemplateVersion: tSeasonal.version,
      name: "Spring cleanup (leaves & winter debris)",
      description: tSeasonal.description,
      category: "Home Services",
      durationMinutes: 120,
      pricingType: "fixed",
      priceAmount: "165.00",
      currency: "CAD",
      bufferMinutes: tSeasonal.bufferMinutes,
      prepInstructions: tSeasonal.prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 100,
      isActive: true,
    })
    .returning();

  const [hedge] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tGarden.id,
      canonicalTemplateVersion: tGarden.version,
      name: "Hedge trimming & bed tidy",
      description: tGarden.description,
      category: "Home Services",
      durationMinutes: 90,
      pricingType: "fixed",
      priceAmount: "110.00",
      currency: "CAD",
      bufferMinutes: tGarden.bufferMinutes,
      prepInstructions: tGarden.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: enhancedTierId,
      sortOrder: 110,
      isActive: true,
    })
    .returning();

  const [debris] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tSeasonal.id,
      canonicalTemplateVersion: tSeasonal.version,
      name: "Yard debris removal & haul-away",
      description:
        "Curbside or backyard pile pickup and disposal for branches, storm debris, and bagged leaves (municipal rules permitting).",
      category: "Home Services",
      durationMinutes: 90,
      pricingType: "fixed",
      priceAmount: "135.00",
      currency: "CAD",
      bufferMinutes: 15,
      prepInstructions: tSeasonal.prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 120,
      isActive: true,
    })
    .returning();

  const [exteriorCheck] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tConsult.id,
      canonicalTemplateVersion: tConsult.version,
      name: "Exterior seasonal property check",
      description:
        "Seasonal walk-through — roofline, siding, drainage, and quick photo checklist for absentee owners.",
      category: "Home Services",
      durationMinutes: 30,
      pricingType: "fixed",
      priceAmount: "55.00",
      currency: "CAD",
      bufferMinutes: tConsult.bufferMinutes,
      prepInstructions: tConsult.prepInstructions,
      serviceLevelsEnabled: false,
      positioningTierId: standardTierId,
      sortOrder: 130,
      isActive: true,
    })
    .returning();

  const [rentalTurnover] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tHandy.id,
      canonicalTemplateVersion: tHandy.version,
      name: "Rental turnover — exterior cleanup",
      description:
        "Exterior reset between tenants — lawn cut, walk blow-off, beds tidied, and debris to curb for quick turnovers.",
      category: "Home Services",
      durationMinutes: 120,
      pricingType: "fixed",
      priceAmount: "195.00",
      currency: "CAD",
      bufferMinutes: 15,
      prepInstructions: tHandy.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: enhancedTierId,
      sortOrder: 140,
      isActive: true,
    })
    .returning();

  const [maintenance] = await db
    .insert(services)
    .values({
      providerId,
      canonicalTemplateId: tHandy.id,
      canonicalTemplateVersion: tHandy.version,
      name: "Small property maintenance visit",
      description:
        "Minor exterior fixes — latch adjustments, loose steps, small trim touch-ups, and punch-list items agreed in advance.",
      category: "Home Services",
      durationMinutes: 90,
      pricingType: "fixed",
      priceAmount: "125.00",
      currency: "CAD",
      bufferMinutes: tHandy.bufferMinutes,
      prepInstructions: tHandy.prepInstructions,
      serviceLevelsEnabled: true,
      positioningTierId: standardTierId,
      sortOrder: 150,
      isActive: true,
    })
    .returning();

  if (
    !snowStd ||
    !snowLarge ||
    !snowBlow ||
    !salt ||
    !stormPriority ||
    !snowCommercial ||
    !postStormCheck ||
    !mowWeekly ||
    !mowBiweekly ||
    !springCleanup ||
    !hedge ||
    !debris ||
    !exteriorCheck ||
    !rentalTurnover ||
    !maintenance
  ) {
    throw new Error("Service insert failed");
  }

  const svc: SvcMap = {
    snowStd: snowStd,
    snowLarge: snowLarge,
    snowBlow: snowBlow,
    salt: salt,
    stormPriority: stormPriority,
    snowCommercial: snowCommercial,
    postStormCheck: postStormCheck,
    mowWeekly: mowWeekly,
    mowBiweekly: mowBiweekly,
    springCleanup: springCleanup,
    hedge: hedge,
    debris: debris,
    exteriorCheck: exteriorCheck,
    rentalTurnover: rentalTurnover,
    maintenance: maintenance,
  };

  const bagAddOn = tLawn.addOns.find((a) => a.id === "bag-clippings");
  if (bagAddOn?.id) {
    await db.insert(serviceAddOnOverrides).values([
      { serviceId: mowWeekly.id, addOnId: bagAddOn.id, enabled: true, priceOverride: "18.00" },
      { serviceId: mowBiweekly.id, addOnId: bagAddOn.id, enabled: true, priceOverride: "18.00" },
    ]);
  }

  await db.insert(availabilityRules).values([
    { providerId, dayOfWeek: 1, startTimeLocal: "06:00", endTimeLocal: "21:00", isActive: true },
    { providerId, dayOfWeek: 2, startTimeLocal: "06:00", endTimeLocal: "21:00", isActive: true },
    { providerId, dayOfWeek: 3, startTimeLocal: "06:00", endTimeLocal: "21:00", isActive: true },
    { providerId, dayOfWeek: 4, startTimeLocal: "06:00", endTimeLocal: "21:00", isActive: true },
    { providerId, dayOfWeek: 5, startTimeLocal: "06:00", endTimeLocal: "20:00", isActive: true },
    { providerId, dayOfWeek: 6, startTimeLocal: "07:00", endTimeLocal: "17:00", isActive: true },
  ]);

  const custRows: (typeof customers.$inferSelect)[] = [];
  for (let i = 0; i < 85; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const ln = LAST_NAMES[i % LAST_NAMES.length]!;
    const fullName = `${fn} ${ln} (#${i + 1})`;
    const email = `property.client.${i + 1}@handshakelocal.test`;
    const phone = `(506) 555-${String(2000 + i).padStart(4, "0")}`;
    const notes = CUSTOMER_NOTES[i % CUSTOMER_NOTES.length]!;
    const emailNorm = normalizeEmail(email);
    const [row] = await db
      .insert(customers)
      .values({
        providerId,
        fullName,
        email,
        emailNormalized: emailNorm,
        phone,
        phoneNormalized: normalizePhone(phone),
        notes,
        communicationNotes: i % 7 === 0 ? "E-transfer preferred; include civic address." : "",
        marketingOptOut: i % 11 === 0,
        accountReady: true,
      })
      .returning();
    if (row) custRows.push(row);
  }

  const repeatBias = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  const STORM_DAYS = new Set([
    "2026-01-04",
    "2026-01-12",
    "2026-01-23",
    "2026-02-05",
    "2026-02-16",
    "2026-02-27",
    "2026-03-07",
    "2026-03-18",
    "2026-03-27",
    "2026-04-02",
  ]);

  const planned: PlannedBooking[] = [];

  function addPlan(p: PlannedBooking): void {
    planned.push(p);
  }

  // --- Past: day-by-day generation ---
  let d = historyStart;
  while (d <= historyEnd) {
    const iso = d.toFormat("yyyy-MM-dd");
    const month = d.month;
    const storm = STORM_DAYS.has(iso);
    const isWeekend = d.weekday >= 6;
    let n = storm ? 14 + Math.floor(rng() * 9) : isWeekend ? 1 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 7);
    if (month === 4 && !storm) n += 2;
    for (let k = 0; k < n; k++) {
      const service = pickServiceForSeason(rng, month, storm, svc);
      const custIdx = pickCustomerIndex(rng, repeatBias);
      const { start, end } =
        month >= 5 ? pickSummerTime(rng, d, service) : pickWinterTime(rng, d, service);
      const st = pickHistoricalStatus(rng);
      let payStatus: (typeof bookings.$inferSelect)["paymentStatus"] = "paid";
      let method: string | null = pickPaymentMethod(rng);
      if (st !== "completed") {
        payStatus = "unpaid";
        method = null;
      } else if (rng() < 0.11) {
        payStatus = "unpaid";
        method = rng() < 0.4 ? "cash" : null;
      } else if (rng() < 0.04) {
        payStatus = "waived";
        method = null;
      } else if (rng() < 0.06) {
        payStatus = "partially_paid";
        method = pickPaymentMethod(rng);
      }
      let tierId: string | null = standardTierId;
      if (service.id === snowLarge.id || service.id === snowCommercial.id) tierId = rng() < 0.65 ? premiumTierId : enhancedTierId;
      else if (service.id === stormPriority.id || service.id === hedge.id || service.id === rentalTurnover.id)
        tierId = rng() < 0.45 ? enhancedTierId : standardTierId;
      else if (service.id === mowWeekly.id || service.id === mowBiweekly.id)
        tierId = rng() < 0.85 ? standardTierId : enhancedTierId;

      const addOns: string[] =
        (service.id === mowWeekly.id || service.id === mowBiweekly.id) && rng() < 0.22 && bagAddOn?.id
          ? ["bag-clippings"]
          : [];

      const createdAt = new Date(
        start.getTime() - (1 + Math.floor(rng() * 10)) * 86400000 - Math.floor(rng() * 7200000)
      );

      addPlan({
        customerIdx: custIdx,
        service,
        start,
        end,
        status: st,
        paymentStatus: payStatus,
        paymentMethod: method,
        positioningTierId: tierId,
        selectedAddOnIds: addOns,
        internalNotes:
          storm && rng() < 0.35
            ? "Storm route — tight stacking; client asked for side apron cleared first."
            : rng() < 0.06
              ? "Repeat seasonal account — same crew notes as last year."
              : "",
        customerNotes: rng() < 0.04 ? "Sand the walk to the fuel tank." : "",
        createdAt,
        forceUnpaid: false,
      });
    }
    d = d.plus({ days: 1 });
  }

  // Explicit story rows (cancellations / reschedules / unpaid completed)
  addPlan({
    customerIdx: 4,
    service: svc.snowLarge,
    start: localDateTimeToUtc(2026, 2, 8, 7, 30, TZ),
    end: new Date(localDateTimeToUtc(2026, 2, 8, 7, 30, TZ).getTime() + svc.snowLarge.durationMinutes * 60000),
    status: "cancelled",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: premiumTierId,
    selectedAddOnIds: [],
    internalNotes: "Client cancelled — tenant shoveled overnight.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 2, 7, 18, 0, TZ),
  });

  addPlan({
    customerIdx: 30,
    service: svc.mowWeekly,
    start: localDateTimeToUtc(2026, 4, 1, 14, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 4, 1, 14, 0, TZ).getTime() + svc.mowWeekly.durationMinutes * 60000),
    status: "rescheduled",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: standardTierId,
    selectedAddOnIds: [],
    internalNotes: "Too wet — moved to later in week.",
    customerNotes: "Grass still soggy by the ditch.",
    createdAt: localDateTimeToUtc(2026, 3, 28, 10, 0, TZ),
  });

  addPlan({
    customerIdx: 11,
    service: svc.snowStd,
    start: localDateTimeToUtc(2026, 3, 15, 6, 0, TZ),
    end: new Date(localDateTimeToUtc(2026, 3, 15, 6, 0, TZ).getTime() + svc.snowStd.durationMinutes * 60000),
    status: "completed",
    paymentStatus: "unpaid",
    paymentMethod: null,
    positioningTierId: standardTierId,
    selectedAddOnIds: [],
    internalNotes: "Invoice out — commercial AP net 30.",
    customerNotes: "",
    createdAt: localDateTimeToUtc(2026, 3, 14, 20, 0, TZ),
    forceUnpaid: true,
  });

  // --- Future: recurring lawn May–June + scattered spring/summer bookings ---
  const futureEnd = DateTime.fromObject({ year: 2026, month: 6, day: 30 }, { zone: TZ });
  let cursor = todayStart;
  const weeklyCustomers = repeatBias.slice(0, 22);
  const biweeklyCustomers = repeatBias.slice(22, 36);

  while (cursor <= futureEnd) {
    const m = cursor.month;
    if (m >= 5 && cursor.weekday === 2) {
      for (const ci of weeklyCustomers) {
        addPlan({
          customerIdx: ci,
          service: svc.mowWeekly,
          start: localDateTimeToUtc(cursor.year, cursor.month, cursor.day, 8 + (ci % 8), (ci % 2) * 30, TZ),
          end: new Date(
            localDateTimeToUtc(cursor.year, cursor.month, cursor.day, 8 + (ci % 8), (ci % 2) * 30, TZ).getTime() +
              svc.mowWeekly.durationMinutes * 60000
          ),
          status: "confirmed",
          paymentStatus: rng() < 0.35 ? "paid" : "unpaid",
          paymentMethod: rng() < 0.35 ? pickPaymentMethod(rng) : null,
          positioningTierId: standardTierId,
          selectedAddOnIds: rng() < 0.18 && bagAddOn?.id ? ["bag-clippings"] : [],
          internalNotes: "Standing summer route — weekly Tuesday lane.",
          customerNotes: "",
          createdAt: localDateTimeToUtc(2026, 4, 2, 10, 0, TZ),
        });
      }
    }
    if (m >= 5 && cursor.weekday === 3) {
      for (const ci of biweeklyCustomers) {
        if (cursor.weekNumber % 2 !== ci % 2) continue;
        addPlan({
          customerIdx: ci,
          service: svc.mowBiweekly,
          start: localDateTimeToUtc(cursor.year, cursor.month, cursor.day, 9 + (ci % 7), (ci % 3) * 15, TZ),
          end: new Date(
            localDateTimeToUtc(cursor.year, cursor.month, cursor.day, 9 + (ci % 7), (ci % 3) * 15, TZ).getTime() +
              svc.mowBiweekly.durationMinutes * 60000
          ),
          status: "confirmed",
          paymentStatus: rng() < 0.28 ? "paid" : "unpaid",
          paymentMethod: rng() < 0.28 ? pickPaymentMethod(rng) : null,
          positioningTierId: rng() < 0.88 ? standardTierId : enhancedTierId,
          selectedAddOnIds: [],
          internalNotes: "Biweekly lane — alternating weeks; hedge add-on noted for July.",
          customerNotes: "",
          createdAt: localDateTimeToUtc(2026, 4, 5, 11, 0, TZ),
        });
      }
    }
    if (m === 4 && cursor.day >= 10) {
      if (cursor.weekday <= 5 && rng() < 0.34) {
        const ci = 40 + (cursor.day % 20);
        addPlan({
          customerIdx: ci,
          service: rng() < 0.55 ? svc.springCleanup : svc.debris,
          start: localDateTimeToUtc(cursor.year, cursor.month, cursor.day, 13, 0, TZ),
          end: new Date(
            localDateTimeToUtc(cursor.year, cursor.month, cursor.day, 13, 0, TZ).getTime() +
              svc.springCleanup.durationMinutes * 60000
          ),
          status: "confirmed",
          paymentStatus: "unpaid",
          paymentMethod: null,
          positioningTierId: standardTierId,
          selectedAddOnIds: [],
          internalNotes: "",
          customerNotes: "Leaves piled by shed.",
          createdAt: localDateTimeToUtc(2026, 3, 20, 9, 0, TZ),
        });
      }
    }
    cursor = cursor.plus({ days: 1 });
  }

  const seenF = new Set<string>();
  const mergedDedup: PlannedBooking[] = [];
  for (const p of planned.sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const dayKey = `${p.customerIdx}-${p.start.toISOString().slice(0, 10)}`;
    if (seenF.has(dayKey)) continue;
    seenF.add(dayKey);
    mergedDedup.push(p);
  }

  const insertedBookingIds: string[] = [];

  for (const p of mergedDedup) {
    const cust = custRows[p.customerIdx]!;
    const tierId = p.positioningTierId;
    const tierMul = tierId ? mult(tierId) : 1;
    const addOnCents =
      p.selectedAddOnIds.includes("bag-clippings") && bagAddOn?.id ? 1800 : 0;
    const payAmt = paymentForBooking(p.service, tierMul, addOnCents);
    const amountForRow =
      p.status === "cancelled" || p.status === "no_show" || p.status === "rescheduled"
        ? null
        : p.status === "completed" || p.status === "confirmed"
          ? payAmt
          : null;
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
        paymentAmount: amountForRow,
        tipPercent: rng() < 0.1 ? (rng() < 0.5 ? "10.00" : "12.00") : "0",
        positioningTierId: tierId,
        selectedAddOnIds: p.selectedAddOnIds,
        internalNotes: p.internalNotes,
        customerNotes: p.customerNotes,
        bufferAfterMinutes: p.service.bufferMinutes,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      })
      .returning({ id: bookings.id });
    if (row) {
      insertedBookingIds.push(row.id);
    }
  }

  // Sync income rows from bookings (same rules as production)
  for (const bid of insertedBookingIds) {
    await syncIncomeRecordFromBooking(db, bid);
  }

  // Standalone income (small true-ups, account payments, manual entries without booking rows)
  const manualIncomeCount = 55;
  for (let i = 0; i < manualIncomeCount; i++) {
    const day = randomDayBetween(rng, historyStart, todayStart);
    const recognized = localDateTimeToUtc(day.year, day.month, day.day, 16, 0, TZ);
    const methods: ("cash" | "e_transfer" | "terminal")[] = ["e_transfer", "cash", "terminal"];
    const pm = methods[Math.floor(rng() * methods.length)]!;
    const amount = (45 + Math.floor(rng() * 380)).toFixed(2);
    await db.insert(incomeRecords).values({
      providerId,
      bookingId: null,
      amount,
      currency: "CAD",
      paymentMethod: pm,
      isCompleted: true,
      isPaid: true,
      recognizedAt: recognized,
      receivedAt: recognized,
      sourceAmountType: "payment_amount",
      updatedAt: recognized,
    });
  }

  // Operating expenses (Jan–Jun 2026)
  const expenseSeeds: { category: string; desc: string; min: number; max: number }[] = [
    { category: "supplies", desc: "Bulk road salt — pallet", min: 180, max: 520 },
    { category: "supplies", desc: "Traction sand — yard", min: 45, max: 160 },
    { category: "supplies", desc: "Blade shoes & cutting edge", min: 120, max: 340 },
    { category: "supplies", desc: "Two-cycle oil & mix", min: 18, max: 65 },
    { category: "supplies", desc: "Trimmer line & blades", min: 22, max: 88 },
    { category: "travel", desc: "Diesel — route trucks", min: 85, max: 420 },
    { category: "travel", desc: "Gas — blowers & mowers", min: 35, max: 195 },
    { category: "other", desc: "Insurance — commercial auto", min: 220, max: 280 },
    { category: "other", desc: "Liability & tools rider", min: 95, max: 140 },
    { category: "other", desc: "Dump fees — green waste", min: 35, max: 120 },
    { category: "other", desc: "Equipment repair — hydraulic line", min: 180, max: 640 },
    { category: "other", desc: "Trailer bearings & lights", min: 90, max: 260 },
    { category: "rent", desc: "Yard / equipment storage pad", min: 150, max: 220 },
    { category: "other", desc: "Advertising — local paper + boosted post", min: 60, max: 220 },
    { category: "other", desc: "Software — routing & invoicing", min: 35, max: 85 },
    { category: "other", desc: "Phone / hotspot (field)", min: 55, max: 95 },
    { category: "supplies", desc: "Safety gear — boots & gloves", min: 40, max: 130 },
    { category: "other", desc: "Merchant / card processing", min: 25, max: 110 },
    { category: "other", desc: "Subcontractor — loader assist (storm)", min: 200, max: 900 },
    { category: "supplies", desc: "Mower service — spring tune", min: 120, max: 280 },
  ];

  let expenseCount = 0;
  const expenseEnd = DateTime.fromObject({ year: 2026, month: 6, day: 30 }, { zone: TZ });
  let expDay = historyStart;
  while (expDay <= expenseEnd) {
    const n = expDay.month <= 3 ? 2 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 3);
    for (let j = 0; j < n; j++) {
      const spec = expenseSeeds[Math.floor(rng() * expenseSeeds.length)]!;
      const amt = (spec.min + rng() * (spec.max - spec.min)).toFixed(2);
      await db.insert(expenseRecords).values({
        providerId,
        amount: amt,
        category: spec.category,
        description: spec.desc,
        incurredAt: new Date(Date.UTC(expDay.year, expDay.month - 1, expDay.day)),
      });
      expenseCount++;
    }
    expDay = expDay.plus({ days: 1 });
  }

  const totalBookings = insertedBookingIds.length;
  const pastCount = mergedDedup.filter((b) => b.start < todayStart.toUTC().toJSDate()).length;
  const futureCount = totalBookings - pastCount;
  const futureMayJuneCount = mergedDedup.filter((b) => {
    if (b.start < todayStart.toUTC().toJSDate()) return false;
    const dl = DateTime.fromJSDate(b.start).setZone(TZ);
    return dl.month === 5 || dl.month === 6;
  }).length;

  const [{ n: incomeRowCount }] = await db
    .select({ n: count() })
    .from(incomeRecords)
    .where(eq(incomeRecords.providerId, providerId));

  console.log("");
  console.log("=== Handshake Local — property services demo provider seed ===");
  console.log(`Business: Florenceville-Bristol Exterior Property Services`);
  console.log(`Provider: ${DEMO_USERNAME} (${providerId})`);
  console.log(`Customers: ${custRows.length}`);
  console.log(`Services: 15`);
  console.log(`Bookings inserted: ${totalBookings} (~${pastCount} past, ~${futureCount} upcoming)`);
  console.log(`Future bookings in May–June 2026: ~${futureMayJuneCount}`);
  console.log(`Income records: ${incomeRowCount} (bookings + standalone)`);
  console.log(`Expense records: ${expenseCount}`);
  console.log(`Timezone: ${TZ}`);
  console.log("");
  console.log("Login:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`Public profile: /${DEMO_USERNAME}`);
  console.log("");
  console.log(
    "Story: winter storm clusters → April transition → May/June recurring mowing routes; heavy money + expenses."
  );
  console.log("");

  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  void closeDbConnection().finally(() => process.exit(1));
});
