import type { TemplateAddOn, TemplateOutcome, TemplateStep } from "@/platform/templates/structure";

/** One platform-owned canonical row (matches `canonical_service_templates` insert shape). */
export type CanonicalTemplateSeedRow = {
  slug: string;
  version: number;
  label: string;
  descriptionShort: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  pricingType: "fixed" | "hourly";
  priceAmount: string;
  currency: string;
  prepInstructions: string;
  steps: TemplateStep[];
  addOns: TemplateAddOn[];
  outcomes: TemplateOutcome[];
};

/**
 * Platform templates (initial six match `drizzle/0004_canonical_service_templates.sql`; additional
 * slugs are inserted by `ensureCanonicalTemplates` when the table row count is below expected).
 * Use only three top-level `category` values: Home Services, Personal Services, Professional Services
 * (see `drizzle/0010_canonical_template_category_taxonomy.sql` for normalizing older DB rows).
 */
export const CANONICAL_TEMPLATE_SEEDS: CanonicalTemplateSeedRow[] = [
  {
    slug: "simple",
    version: 1,
    label: "Quick start",
    descriptionShort: "Minimal structure—fill in what you offer.",
    name: "My service",
    description:
      "Book online at a time that works for you. You can rename this and adjust the details anytime.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "50.00",
    currency: "CAD",
    prepInstructions: "",
    steps: [
      {
        id: "define",
        title: "Define your offer",
        description: "Set name, duration, and pricing shown when clients book.",
        order: 0,
      },
    ],
    addOns: [],
    outcomes: [{ id: "live", label: "Clients can book when your profile is published" }],
  },
  {
    slug: "consultation-30",
    version: 1,
    label: "Initial Consultation (30 min)",
    descriptionShort: "A focused session to understand your needs and next steps.",
    name: "Initial Consultation (30 min)",
    description:
      "A focused 30-minute consultation to understand your goals, answer questions, and recommend next steps. Includes a short follow-up summary with actionable recommendations.",
    category: "Professional Services",
    durationMinutes: 30,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "49.00",
    currency: "CAD",
    prepInstructions:
      "Before we meet, please share a brief summary of what you'd like help with and any relevant links/photos/documents. If this is location-based, include your address and preferred contact number.",
    steps: [
      { id: "intake", title: "Understand goals", order: 0 },
      { id: "recommend", title: "Recommendations & next steps", order: 1 },
    ],
    addOns: [
      {
        id: "extra-15",
        label: "Extra 15 minutes",
        description: "Extend the session",
        suggestedPrice: "25.00",
        pricingType: "fixed",
      },
    ],
    outcomes: [{ id: "summary", label: "Short follow-up summary with actionable recommendations" }],
  },
  {
    slug: "home-cleaning-2h",
    version: 1,
    label: "Home Cleaning (2 hours)",
    descriptionShort:
      "Kitchens, bathrooms, and living areas—surfaces, floors, and a general tidy.",
    name: "Home Cleaning (2 hours)",
    description:
      "Standard home cleaning for kitchens, bathrooms, and living areas. Includes surfaces, floors, and general tidying. You can add notes for priority areas when you book.",
    category: "Home Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "160.00",
    currency: "CAD",
    prepInstructions:
      "Please secure pets and place any fragile items aside. If you have product preferences (eco-friendly, scent-free, etc.), add them in your notes. Provide building entry details if needed.",
    steps: [
      { id: "prep", title: "Access & priorities", order: 0 },
      { id: "clean", title: "Clean priority areas", order: 1 },
      { id: "finish", title: "Tidy & wrap up", order: 2 },
    ],
    addOns: [
      { id: "deep-fridge", label: "Deep clean fridge", suggestedPrice: "45.00", pricingType: "fixed" },
    ],
    outcomes: [
      { id: "tidy", label: "Living areas and surfaces refreshed" },
      { id: "floors", label: "Floors vacuumed/mopped as appropriate" },
    ],
  },
  {
    slug: "lawn-care-60",
    version: 1,
    label: "Lawn Mowing + Edging (60 min)",
    descriptionShort: "Mowing and edging for front and back—clippings tidied from walks and drives.",
    name: "Lawn Mowing + Edging (60 min)",
    description:
      "Front and back lawn mowing with clean edging along walkways/driveway. Includes quick tidy-up of clippings on hard surfaces.",
    category: "Home Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "75.00",
    currency: "CAD",
    prepInstructions:
      "Please ensure access to the yard and remove toys/hoses/obstacles from the grass. Let me know if there are gates, pets, or any areas to avoid (sprinklers, new sod, etc.).",
    steps: [
      { id: "mow", title: "Mow front and back", order: 0 },
      { id: "edge", title: "Edge walks and driveway", order: 1 },
      { id: "sweep", title: "Clear clippings from hard surfaces", order: 2 },
    ],
    addOns: [{ id: "bag-clippings", label: "Bag clippings", suggestedPrice: "15.00", pricingType: "fixed" }],
    outcomes: [{ id: "neat", label: "Neat, even cut along edges" }],
  },
  {
    slug: "dog-walk-45",
    version: 1,
    label: "Dog Walk (45 min)",
    descriptionShort: "A paced walk, water refill, and a short update when you're back.",
    name: "Dog Walk (45 min)",
    description:
      "A 45-minute walk tailored to your dog's pace and preferences. Includes fresh water refill and a short update after the walk.",
    category: "Personal Services",
    durationMinutes: 45,
    bufferMinutes: 5,
    pricingType: "fixed",
    priceAmount: "35.00",
    currency: "CAD",
    prepInstructions:
      "Please provide leash/harness, any special instructions (reactivity, allergies, route preferences), and building access details. If treats are allowed, leave a small container out.",
    steps: [
      { id: "walk", title: "Leashed walk at your dog's pace", order: 0 },
      { id: "water", title: "Water refill", order: 1 },
      { id: "update", title: "Brief update after the walk", order: 2 },
    ],
    addOns: [],
    outcomes: [{ id: "exercise", label: "Exercise and stimulation during the walk" }],
  },
  {
    slug: "tutoring-60-hourly",
    version: 1,
    label: "Tutoring Session (60 min, hourly)",
    descriptionShort: "Focused 1:1 time on the topics you choose, with clear next steps.",
    name: "Tutoring Session (60 min)",
    description:
      "One hour of 1:1 tutoring focused on your specific goals. We'll review concepts, practice problems, and leave you with next steps to keep improving.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "hourly",
    priceAmount: "60.00",
    currency: "CAD",
    prepInstructions:
      "Please share the topic(s), grade/course, and any recent assignments or areas you're stuck on. If you have a textbook or worksheet, upload photos or links ahead of time.",
    steps: [
      { id: "review", title: "Review concepts & gaps", order: 0 },
      { id: "practice", title: "Guided practice", order: 1 },
      { id: "next", title: "Clear next steps", order: 2 },
    ],
    addOns: [
      { id: "extra-30", label: "Extra 30 minutes", suggestedPrice: "30.00", pricingType: "fixed" },
    ],
    outcomes: [{ id: "progress", label: "Actionable next steps for independent practice" }],
  },
  {
    slug: "consultation-60",
    version: 1,
    label: "Extended Consultation (60 min)",
    descriptionShort: "A full hour to map goals, explore options, and leave with a clear plan.",
    name: "Extended Consultation (60 min)",
    description:
      "A deeper 60-minute session for complex questions, multiple stakeholders, or detailed planning. Includes structured notes and a prioritized list of next steps you can act on immediately.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "89.00",
    currency: "CAD",
    prepInstructions:
      "Please share context ahead of time: goals, constraints, and any materials (docs, links, photos) that would help us use the hour well.",
    steps: [
      { id: "deep-dive", title: "Goals & context", order: 0 },
      { id: "options", title: "Explore options & tradeoffs", order: 1 },
      { id: "plan", title: "Prioritized action plan", order: 2 },
    ],
    addOns: [
      {
        id: "follow-up-call",
        label: "15-min follow-up call",
        description: "Quick check-in after you’ve tried the plan",
        suggestedPrice: "25.00",
        pricingType: "fixed",
      },
    ],
    outcomes: [
      { id: "notes", label: "Structured session notes" },
      { id: "next", label: "Prioritized next steps you can execute" },
    ],
  },
  {
    slug: "personal-training-50",
    version: 1,
    label: "Personal Training (50 min)",
    descriptionShort: "One-on-one session focused on form, progression, and your fitness goals.",
    name: "Personal Training (50 min)",
    description:
      "A coached workout tailored to your level and goals. We’ll warm up, work through a focused training block, and cool down—with cues on form and how to progress between sessions.",
    category: "Personal Services",
    durationMinutes: 50,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "70.00",
    currency: "CAD",
    prepInstructions:
      "Wear comfortable clothes and athletic shoes. Share any injuries, limitations, or equipment you have access to. Bring water.",
    steps: [
      { id: "warmup", title: "Warm-up & mobility", order: 0 },
      { id: "block", title: "Main training block", order: 1 },
      { id: "cooldown", title: "Cooldown & recap", order: 2 },
    ],
    addOns: [],
    outcomes: [{ id: "workout", label: "A complete session plan you can repeat or build on" }],
  },
];

/** Full catalog size; `ensureCanonicalTemplates` inserts until at least this many rows exist. */
export const EXPECTED_CANONICAL_TEMPLATE_COUNT = CANONICAL_TEMPLATE_SEEDS.length;
