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
 * Platform templates (initial rows match `drizzle/0004_canonical_service_templates.sql`; additional
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
  {
    slug: "deep-clean-visit",
    version: 1,
    label: "Deep Clean Visit",
    descriptionShort: "A full reset of your space with extra attention to buildup and detail areas.",
    name: "Deep Clean Visit (4 hr)",
    description:
      "A thorough clean with extra attention to buildup, corners, and high-touch areas. Ideal when you want more than a standard tidy. Add priority notes when you book.",
    category: "Home Services",
    durationMinutes: 240,
    bufferMinutes: 30,
    pricingType: "fixed",
    priceAmount: "320.00",
    currency: "CAD",
    prepInstructions:
      "Please secure pets, clear fragile items from surfaces to be cleaned, and note any product preferences (eco-friendly, scent-free, etc.).",
    steps: [
      { id: "walk", title: "Walkthrough & priorities", order: 0 },
      { id: "detail", title: "Deep clean detail areas", order: 1 },
      { id: "finish", title: "Final tidy & check", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "reset", label: "Buildup and detail areas addressed" },
      { id: "fresh", label: "Rooms reset to a clean baseline" }
    ],
  },
  {
    slug: "move-in-move-out-cleaning",
    version: 1,
    label: "Move-In / Move-Out Cleaning",
    descriptionShort: "Thorough cleaning to prepare your space for moving in or handing off.",
    name: "Move-In / Move-Out Cleaning (3 hr)",
    description:
      "A full clean to prepare your home for move-in or handover—kitchens, baths, floors, and surfaces. Tell us about any landlord or listing requirements in your notes.",
    category: "Home Services",
    durationMinutes: 180,
    bufferMinutes: 20,
    pricingType: "fixed",
    priceAmount: "250.00",
    currency: "CAD",
    prepInstructions:
      "Please ensure utilities are on if needed, provide access instructions, and note any areas that must be photo-ready or inspection-ready.",
    steps: [
      { id: "access", title: "Access & scope", order: 0 },
      { id: "clean", title: "Full clean of priority rooms", order: 1 },
      { id: "final", title: "Final walkthrough tidy", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "ready", label: "Space cleaned for move-in or handoff" }
    ],
  },
  {
    slug: "kitchen-bathroom-reset",
    version: 1,
    label: "Kitchen + Bathroom Reset",
    descriptionShort: "Focused clean on high-use areas to refresh your space quickly.",
    name: "Kitchen + Bathroom Reset (90 min)",
    description:
      "A focused clean for kitchens and bathrooms—sinks, counters, fixtures, and floors—so high-use areas feel fresh without a full-home visit.",
    category: "Home Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "95.00",
    currency: "CAD",
    prepInstructions:
      "Clear dishes from the sink and note any surfaces or products to avoid. Provide entry details if applicable.",
    steps: [
      { id: "kitchen", title: "Kitchen refresh", order: 0 },
      { id: "bath", title: "Bathroom refresh", order: 1 },
      { id: "wrap", title: "Quick tidy & finish", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "refresh", label: "Kitchen and bathrooms refreshed" }
    ],
  },
  {
    slug: "post-renovation-cleaning",
    version: 1,
    label: "Post-Renovation Cleaning",
    descriptionShort: "Dust, debris, and residue removed after construction or upgrades.",
    name: "Post-Renovation Cleaning (3 hr)",
    description:
      "Post-project cleaning to lift dust and debris from surfaces, floors, and fixtures after construction or upgrades. Heavy hazardous material removal may require a specialist—ask first.",
    category: "Home Services",
    durationMinutes: 180,
    bufferMinutes: 20,
    pricingType: "fixed",
    priceAmount: "260.00",
    currency: "CAD",
    prepInstructions:
      "Share the scope of work done, whether windows can be opened, and any safety constraints. Photos of the space help us plan.",
    steps: [
      { id: "assess", title: "Assess dust & debris", order: 0 },
      { id: "surface", title: "Surface and floor cleanup", order: 1 },
      { id: "detail", title: "Detail wipe & finish", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "clear", label: "Renovation dust and residue reduced" }
    ],
  },
  {
    slug: "airbnb-turnover-cleaning",
    version: 1,
    label: "Airbnb / Turnover Cleaning",
    descriptionShort: "Fast, reliable cleaning between guest stays.",
    name: "Airbnb / Turnover Cleaning (90 min)",
    description:
      "A turnover-focused clean between guest stays—bathrooms, kitchen, floors, and quick restock surfaces. Add checkout time and any checklist your listing requires.",
    category: "Home Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Provide lockbox or access instructions, linen location if you handle laundry separately, and any host standards we should follow.",
    steps: [
      { id: "priority", title: "Priority rooms first", order: 0 },
      { id: "reset", title: "Reset common areas", order: 1 },
      { id: "check", title: "Final pass & ready for guests", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "guest-ready", label: "Unit reset for the next stay" }
    ],
  },
  {
    slug: "seasonal-yard-cleanup",
    version: 1,
    label: "Seasonal Yard Cleanup",
    descriptionShort: "Leaf removal, debris cleanup, and general yard reset.",
    name: "Seasonal Yard Cleanup (2 hr)",
    description:
      "Seasonal cleanup—leaves, light debris, and a general yard reset so outdoor spaces look neat. Disposal rules vary by municipality; note if bags or haul-away are required.",
    category: "Home Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "140.00",
    currency: "CAD",
    prepInstructions:
      "Please ensure yard access, note pet waste areas to avoid, and flag sprinklers, beds, or features not to disturb.",
    steps: [
      { id: "clear", title: "Clear leaves & debris", order: 0 },
      { id: "beds", title: "Tidy beds & borders", order: 1 },
      { id: "finish", title: "Final rake & sweep", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "neat", label: "Yard looking tidier and reset" }
    ],
  },
  {
    slug: "snow-removal-driveway",
    version: 1,
    label: "Snow Removal (Driveway)",
    descriptionShort: "Clear snow from driveway and walkways.",
    name: "Snow Removal — Driveway (45 min)",
    description:
      "Snow clearing for your driveway and primary walkways for safer access after a storm. Ice control and heavy equipment needs may be extra—confirm in your notes.",
    category: "Home Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "50.00",
    currency: "CAD",
    prepInstructions:
      "Mark the driveway edges if obscured, note where to pile snow, and share any narrow gates or obstacles.",
    steps: [
      { id: "path", title: "Clear main access paths", order: 0 },
      { id: "drive", title: "Clear driveway", order: 1 },
      { id: "walks", title: "Walkways as agreed", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "access", label: "Safer access to your property" }
    ],
  },
  {
    slug: "garden-maintenance-90",
    version: 1,
    label: "Garden Maintenance",
    descriptionShort: "Weeding, trimming, and basic plant care.",
    name: "Garden Maintenance (90 min)",
    description:
      "Hands-on garden care—weeding, light trimming, and basic plant health checks to keep beds looking maintained.",
    category: "Home Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "90.00",
    currency: "CAD",
    prepInstructions:
      "Point out plants to protect, any allergies, tool access, and green-waste disposal preferences.",
    steps: [
      { id: "weeds", title: "Weed priority beds", order: 0 },
      { id: "trim", title: "Light trim & shape", order: 1 },
      { id: "care", title: "Basic plant tidy", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "maintained", label: "Beds looking more cared for" }
    ],
  },
  {
    slug: "pressure-washing-120",
    version: 1,
    label: "Pressure Washing",
    descriptionShort: "Driveways, decks, and siding cleaned with high-pressure wash.",
    name: "Pressure Washing (2 hr)",
    description:
      "High-pressure washing for driveways, decks, patios, or siding as appropriate for the surface. Some finishes need soft washing—describe your surfaces when you book.",
    category: "Home Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "180.00",
    currency: "CAD",
    prepInstructions:
      "Close windows, clear the work area of loose items, and note delicate surfaces or nearby plantings to protect.",
    steps: [
      { id: "setup", title: "Setup & surface check", order: 0 },
      { id: "wash", title: "Controlled wash pass", order: 1 },
      { id: "rinse", title: "Rinse & wrap up", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "cleaner", label: "Surfaces visibly cleaner" }
    ],
  },
  {
    slug: "handyman-visit-90",
    version: 1,
    label: "Handyman Visit",
    descriptionShort: "General repairs and small jobs around the home.",
    name: "Handyman Visit (90 min)",
    description:
      "A flexible visit for small repairs and odd jobs—hang items, minor fixes, and quick improvements. List your top priorities so we use the time well.",
    category: "Home Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Share photos of the issues, tool access, and whether materials should be supplied or quoted separately.",
    steps: [
      { id: "review", title: "Review the task list", order: 0 },
      { id: "work", title: "Complete agreed work", order: 1 },
      { id: "wrap", title: "Cleanup & next steps", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "done", label: "Agreed small jobs completed or clearly scoped" }
    ],
  },
  {
    slug: "furniture-assembly-60",
    version: 1,
    label: "Furniture Assembly",
    descriptionShort: "Assembly of furniture and basic setup.",
    name: "Furniture Assembly (60 min)",
    description:
      "Assembly for flat-pack or new furniture and basic placement. Have the manual and hardware accessible; wall anchoring may depend on wall type.",
    category: "Home Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "80.00",
    currency: "CAD",
    prepInstructions:
      "Clear floor space in the assembly area, keep parts and manual together, and note ceiling or wall constraints for tall items.",
    steps: [
      { id: "unpack", title: "Inventory & layout", order: 0 },
      { id: "build", title: "Assembly", order: 1 },
      { id: "place", title: "Placement & basic leveling", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "assembled", label: "Furniture assembled and ready to use" }
    ],
  },
  {
    slug: "tv-mounting-90",
    version: 1,
    label: "TV Mounting",
    descriptionShort: "Secure wall mounting and setup.",
    name: "TV Mounting (90 min)",
    description:
      "Wall mount your TV with a secure bracket installation and basic cable tidy. Stud location and bracket type matter—share your TV size and mount model.",
    category: "Home Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Confirm wall type (drywall, brick, etc.), bracket and hardware on hand, and outlet/cable path preferences.",
    steps: [
      { id: "plan", title: "Placement & stud check", order: 0 },
      { id: "mount", title: "Mount & secure", order: 1 },
      { id: "setup", title: "Level & basic setup", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "mounted", label: "TV safely mounted" }
    ],
  },
  {
    slug: "minor-plumbing-fix",
    version: 1,
    label: "Minor Plumbing Fix",
    descriptionShort: "Fix leaks, install fixtures, or basic repairs.",
    name: "Minor Plumbing Fix (60 min)",
    description:
      "Small plumbing tasks—dripping taps, simple swaps, or basic troubleshooting. Major pipe work or code-level jobs may need a licensed plumber.",
    category: "Home Services",
    durationMinutes: 60,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "100.00",
    currency: "CAD",
    prepInstructions:
      "Shut off water if you know the valve location, share photos of the issue, and have replacement parts on hand if you already purchased them.",
    steps: [
      { id: "assess", title: "Assess & plan", order: 0 },
      { id: "repair", title: "Complete the repair", order: 1 },
      { id: "test", title: "Test & check for leaks", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "fixed", label: "Agreed minor plumbing work completed" }
    ],
  },
  {
    slug: "minor-electrical-work",
    version: 1,
    label: "Minor Electrical Work",
    descriptionShort: "Light fixtures, switches, and simple installs.",
    name: "Minor Electrical Work (60 min)",
    description:
      "Simple electrical help—fixtures, switches, or basic installs where permitted. Panel or permit work may require a licensed electrician.",
    category: "Home Services",
    durationMinutes: 60,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "110.00",
    currency: "CAD",
    prepInstructions:
      "Turn off the relevant breaker, share fixture specs, and note aluminum wiring or older panels if applicable.",
    steps: [
      { id: "safe", title: "Safety check & plan", order: 0 },
      { id: "install", title: "Install or replace", order: 1 },
      { id: "test", title: "Test & verify", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "working", label: "Installed items working as expected" }
    ],
  },
  {
    slug: "haircut-styling-45",
    version: 1,
    label: "Haircut / Styling",
    descriptionShort: "Cut and styling tailored to your preferences.",
    name: "Haircut / Styling (45 min)",
    description:
      "A cut and style tailored to your hair type and the look you want. Share inspiration photos and any sensitivities to products.",
    category: "Personal Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "50.00",
    currency: "CAD",
    prepInstructions:
      "Arrive with clean, dry hair unless your stylist asks otherwise. Mention allergies or scalp sensitivities.",
    steps: [
      { id: "consult", title: "Consult & plan", order: 0 },
      { id: "cut", title: "Cut & style", order: 1 },
      { id: "finish", title: "Finish & care tips", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "look", label: "Fresh cut and style" }
    ],
  },
  {
    slug: "hair-coloring-120",
    version: 1,
    label: "Hair Coloring",
    descriptionShort: "Full or partial coloring service.",
    name: "Hair Coloring (2 hr)",
    description:
      "Professional color application for full or partial coverage—goals and maintenance depend on your hair history. A quick patch test may be needed for first-time color.",
    category: "Personal Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Share recent color or chemical history, bring reference photos, and wear an older top if needed.",
    steps: [
      { id: "formula", title: "Color plan & application", order: 0 },
      { id: "process", title: "Process & rinse", order: 1 },
      { id: "style", title: "Dry & finish", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "color", label: "Color applied to plan" }
    ],
  },
  {
    slug: "blowout-styling-45",
    version: 1,
    label: "Blowout / Styling Session",
    descriptionShort: "Professional styling for events or everyday.",
    name: "Blowout / Styling (45 min)",
    description:
      "A polished blowout and styling session for an event or everyday confidence. Heat tools and finish depend on your hair goals.",
    category: "Personal Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "45.00",
    currency: "CAD",
    prepInstructions:
      "Arrive with clean, damp hair unless directed otherwise. Note any damage or extensions.",
    steps: [
      { id: "prep", title: "Prep & protect", order: 0 },
      { id: "style", title: "Blowout & style", order: 1 },
      { id: "finish", title: "Finish & hold", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "styled", label: "Polished style ready to go" }
    ],
  },
  {
    slug: "lash-extensions-90",
    version: 1,
    label: "Lash Extensions",
    descriptionShort: "Full set or fill for lashes.",
    name: "Lash Extensions (90 min)",
    description:
      "Lash extensions or a fill for a fuller look. Retention varies; aftercare keeps results looking their best.",
    category: "Personal Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Arrive without eye makeup and avoid oil-based products before the visit. Mention sensitivities or prior reactions.",
    steps: [
      { id: "map", title: "Design & map", order: 0 },
      { id: "apply", title: "Application", order: 1 },
      { id: "check", title: "Final check & care tips", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "lashes", label: "Lashes applied to plan" }
    ],
  },
  {
    slug: "brow-shaping-tint",
    version: 1,
    label: "Brow Shaping / Tint",
    descriptionShort: "Defined brows with shaping and optional tint.",
    name: "Brow Shaping / Tint (45 min)",
    description:
      "Brow shaping with optional tint for definition. Patch tests may be recommended for first-time tint clients.",
    category: "Personal Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "40.00",
    currency: "CAD",
    prepInstructions:
      "Come with clean skin and no self-tanner on the brow area. Share growth goals or gaps to address.",
    steps: [
      { id: "shape", title: "Map & shape", order: 0 },
      { id: "tint", title: "Tint if included", order: 1 },
      { id: "finish", title: "Finish & aftercare", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "brows", label: "Cleaner brow shape and definition" }
    ],
  },
  {
    slug: "makeup-application-60",
    version: 1,
    label: "Makeup Application",
    descriptionShort: "Event or everyday makeup session.",
    name: "Makeup Application (60 min)",
    description:
      "Makeup for an event, photos, or a polished everyday look. Bring reference images and your preferred coverage level.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "90.00",
    currency: "CAD",
    prepInstructions:
      "Arrive with a clean, moisturized face. Bring your own foundation shade if you prefer your products.",
    steps: [
      { id: "skin", title: "Skin prep & base", order: 0 },
      { id: "feature", title: "Eyes, cheeks, lips", order: 1 },
      { id: "set", title: "Set & touch-up tips", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "ready", label: "Makeup ready for your occasion" }
    ],
  },
  {
    slug: "personal-training-60",
    version: 1,
    label: "Personal Training Session",
    descriptionShort: "One-on-one session focused on your goals.",
    name: "Personal Training Session (60 min)",
    description:
      "A one-on-one coached session built around your goals—movement prep, focused work, and a clear recap. Share injuries, experience level, and equipment access.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "70.00",
    currency: "CAD",
    prepInstructions:
      "Wear athletic clothing and shoes, bring water, and share any medical limits or doctor guidance.",
    steps: [
      { id: "warmup", title: "Warm-up & plan", order: 0 },
      { id: "main", title: "Main session block", order: 1 },
      { id: "cool", title: "Cooldown & next steps", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "session", label: "Full session tailored to your goals" }
    ],
  },
  {
    slug: "yoga-session-private",
    version: 1,
    label: "Yoga Session (Private)",
    descriptionShort: "Personalized mobility and relaxation session.",
    name: "Private Yoga Session (60 min)",
    description:
      "A private yoga session tailored to your body and goals—breath, mobility, and relaxation with clear cues. Mention injuries or poses to avoid.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "80.00",
    currency: "CAD",
    prepInstructions:
      "Wear comfortable clothing, have a mat if you have one, and clear enough floor space for movement.",
    steps: [
      { id: "intake", title: "Check-in & focus", order: 0 },
      { id: "practice", title: "Guided practice", order: 1 },
      { id: "close", title: "Cooldown & takeaways", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "ease", label: "Calm, guided movement" }
    ],
  },
  {
    slug: "massage-therapy-60",
    version: 1,
    label: "Massage Therapy Session",
    descriptionShort: "Targeted treatment for tension and recovery.",
    name: "Massage Therapy Session (60 min)",
    description:
      "Therapeutic massage focused on tension areas and recovery. Pressure and technique are adjusted to your comfort.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "100.00",
    currency: "CAD",
    prepInstructions:
      "Share health conditions, injuries, or pregnancy. Arrive a few minutes early for first visits if intake is required.",
    steps: [
      { id: "plan", title: "Intake & focus areas", order: 0 },
      { id: "treat", title: "Treatment", order: 1 },
      { id: "after", title: "Aftercare suggestions", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "relief", label: "Targeted relief and relaxation" }
    ],
  },
  {
    slug: "physio-rehab-session",
    version: 1,
    label: "Physio / Rehab Session",
    descriptionShort: "Movement and recovery-focused therapy.",
    name: "Physio / Rehab Session (60 min)",
    description:
      "A movement-focused session for recovery, mobility, and exercise guidance. Scope depends on the clinician; bring relevant reports if you have them.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "110.00",
    currency: "CAD",
    prepInstructions:
      "Wear movable clothing, bring footwear you train in, and list current pain areas or surgeon/physician limits.",
    steps: [
      { id: "assess", title: "Assessment & goals", order: 0 },
      { id: "intervene", title: "Hands-on or exercise block", order: 1 },
      { id: "plan", title: "Home plan & next steps", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "progress", label: "Clear next steps for recovery" }
    ],
  },
  {
    slug: "nutrition-coaching-45",
    version: 1,
    label: "Nutrition Coaching Session",
    descriptionShort: "Guidance on diet and lifestyle habits.",
    name: "Nutrition Coaching Session (45 min)",
    description:
      "A coaching session to align your eating patterns and habits with your goals—practical swaps, not medical diagnosis.",
    category: "Personal Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "75.00",
    currency: "CAD",
    prepInstructions:
      "Share allergies, medications, and goals. A short food diary beforehand helps if you can provide one.",
    steps: [
      { id: "review", title: "Review habits & goals", order: 0 },
      { id: "strategy", title: "Strategies & swaps", order: 1 },
      { id: "next", title: "Next steps", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "clarity", label: "Actionable nutrition next steps" }
    ],
  },
  {
    slug: "quick-dog-walk-20",
    version: 1,
    label: "Quick Dog Walk",
    descriptionShort: "Short walk for a quick energy release.",
    name: "Quick Dog Walk (20 min)",
    description:
      "A short walk for a bathroom break and quick energy release—great for busy days. Updates available if you want them.",
    category: "Personal Services",
    durationMinutes: 20,
    bufferMinutes: 5,
    pricingType: "fixed",
    priceAmount: "20.00",
    currency: "CAD",
    prepInstructions:
      "Leash, harness, building access, and any reactivity or route notes.",
    steps: [
      { id: "leash", title: "Leashed walk", order: 0 },
      { id: "water", title: "Water if needed", order: 1 },
      { id: "note", title: "Quick update if requested", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "break", label: "Short exercise and relief" }
    ],
  },
  {
    slug: "pet-sitting-drop-in",
    version: 1,
    label: "Pet Sitting (Drop-In)",
    descriptionShort: "Feeding, play, and care visit.",
    name: "Pet Sitting — Drop-In (30 min)",
    description:
      "A drop-in visit for feeding, fresh water, play, and basic care. Medication administration only as agreed in advance.",
    category: "Personal Services",
    durationMinutes: 30,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "30.00",
    currency: "CAD",
    prepInstructions:
      "Leave clear feeding instructions, emergency contacts, and access details. Note shy or escape-prone pets.",
    steps: [
      { id: "feed", title: "Feed & water", order: 0 },
      { id: "play", title: "Play & potty", order: 1 },
      { id: "secure", title: "Secure home on exit", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "cared", label: "Pets cared for during the visit" }
    ],
  },
  {
    slug: "overnight-pet-sitting",
    version: 1,
    label: "Overnight Pet Sitting",
    descriptionShort: "Overnight care in your home.",
    name: "Overnight Pet Sitting (12 hr)",
    description:
      "Overnight presence in your home for companionship and routines—feeding, last outs, and morning care as agreed.",
    category: "Personal Services",
    durationMinutes: 720,
    bufferMinutes: 30,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Share pet routines, sleeping arrangements, guests allowed, and emergency vet details.",
    steps: [
      { id: "evening", title: "Evening routine", order: 0 },
      { id: "overnight", title: "Overnight presence", order: 1 },
      { id: "morning", title: "Morning routine & handoff", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "overnight-care", label: "Overnight coverage as agreed" }
    ],
  },
  {
    slug: "pet-grooming-90",
    version: 1,
    label: "Pet Grooming Session",
    descriptionShort: "Wash, trim, and tidy.",
    name: "Pet Grooming Session (90 min)",
    description:
      "Bath, brush-out, and tidy trim suited to your pet’s coat. Mat removal severity may affect time—note coat condition.",
    category: "Personal Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "80.00",
    currency: "CAD",
    prepInstructions:
      "Share vaccine status if required, behavior with grooming, and any skin issues. Have towels if mobile grooming needs them.",
    steps: [
      { id: "prep", title: "Prep & assess coat", order: 0 },
      { id: "groom", title: "Bath & groom", order: 1 },
      { id: "finish", title: "Dry & finish", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "fresh", label: "Pet looking and smelling fresher" }
    ],
  },
  {
    slug: "dog-training-session",
    version: 1,
    label: "Dog Training Session",
    descriptionShort: "Basic obedience and behavior training.",
    name: "Dog Training Session (60 min)",
    description:
      "A focused training session for skills like leash manners, recalls, or basic obedience. Consistency between sessions speeds progress.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "85.00",
    currency: "CAD",
    prepInstructions:
      "Bring high-value treats, a standard leash (no retractable unless discussed), and note triggers or training history.",
    steps: [
      { id: "goal", title: "Goals & demo", order: 0 },
      { id: "train", title: "Guided practice", order: 1 },
      { id: "homework", title: "Homework plan", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "skills", label: "Clear skills to practice at home" }
    ],
  },
  {
    slug: "babysitting-evening",
    version: 1,
    label: "Babysitting (Evening)",
    descriptionShort: "Childcare for evenings or short outings.",
    name: "Babysitting — Evening (3 hr)",
    description:
      "Evening childcare while you’re out—age-appropriate play, routines, and bedtime prep as you outline.",
    category: "Personal Services",
    durationMinutes: 180,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "60.00",
    currency: "CAD",
    prepInstructions:
      "Share allergies, bedtime routine, emergency contacts, and screen or snack rules.",
    steps: [
      { id: "handoff", title: "Handoff & schedule", order: 0 },
      { id: "care", title: "Play & routines", order: 1 },
      { id: "bed", title: "Bedtime or wrap as planned", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "safe", label: "Kids safe and routines followed" }
    ],
  },
  {
    slug: "after-school-care",
    version: 1,
    label: "After-School Care",
    descriptionShort: "Supervised care and support after school.",
    name: "After-School Care (2 hr)",
    description:
      "Supervised after-school time—snack, homework start, and calm activities until pickup. Ages and ratios depend on your provider.",
    category: "Personal Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "50.00",
    currency: "CAD",
    prepInstructions:
      "Share school end time, pickup authorization, allergies, and house rules for snacks or screens.",
    steps: [
      { id: "arrive", title: "Arrival & snack", order: 0 },
      { id: "structure", title: "Homework or quiet time", order: 1 },
      { id: "transition", title: "Wrap before pickup", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "covered", label: "Supervised window after school" }
    ],
  },
  {
    slug: "homework-help-session",
    version: 1,
    label: "Homework Help Session",
    descriptionShort: "Guidance and support for schoolwork.",
    name: "Homework Help Session (60 min)",
    description:
      "Focused help to understand assignments, organize work, and build study strategies—not a replacement for classroom instruction.",
    category: "Personal Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "40.00",
    currency: "CAD",
    prepInstructions:
      "Bring materials, the assignment prompts, and note how your child learns best.",
    steps: [
      { id: "scan", title: "Review what’s due", order: 0 },
      { id: "guide", title: "Guided work", order: 1 },
      { id: "wrap", title: "Wrap with a simple plan", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "progress", label: "Clearer next steps on tonight’s work" }
    ],
  },
  {
    slug: "home-organization-session",
    version: 1,
    label: "Home Organization Session",
    descriptionShort: "Declutter and organize spaces.",
    name: "Home Organization Session (2 hr)",
    description:
      "Hands-on organizing to declutter surfaces, sort categories, and reset a room or zone. Donation drop-off may be separate.",
    category: "Home Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "140.00",
    currency: "CAD",
    prepInstructions:
      "Identify the priority zone, what can be donated or recycled, and any sentimental items to handle carefully.",
    steps: [
      { id: "sort", title: "Sort & categorize", order: 0 },
      { id: "contain", title: "Contain & label", order: 1 },
      { id: "reset", title: "Reset the space", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "calm", label: "A clearer, more usable space" }
    ],
  },
  {
    slug: "closet-organization-90",
    version: 1,
    label: "Closet Organization",
    descriptionShort: "Organize clothing and storage systems.",
    name: "Closet Organization (90 min)",
    description:
      "Closet reset—sorting, folding or hanging systems, and simple storage improvements so daily dressing is easier.",
    category: "Home Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "100.00",
    currency: "CAD",
    prepInstructions:
      "Clear laundry if possible, note keep/donate piles, and share hanger or bin preferences.",
    steps: [
      { id: "edit", title: "Edit & sort", order: 0 },
      { id: "system", title: "Set up zones", order: 1 },
      { id: "finish", title: "Final tidy", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "closet", label: "Closet easier to use day to day" }
    ],
  },
  {
    slug: "errand-run-60",
    version: 1,
    label: "Errand Run",
    descriptionShort: "Groceries, pickups, and general tasks.",
    name: "Errand Run (60 min)",
    description:
      "A time-block for local errands—groceries, dry cleaning, pharmacy pickups, and similar tasks within agreed scope.",
    category: "Home Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "40.00",
    currency: "CAD",
    prepInstructions:
      "Provide a prioritized list, payment method for purchases, parking notes, and ID requirements for pickups.",
    steps: [
      { id: "confirm", title: "Confirm list & budget", order: 0 },
      { id: "run", title: "Complete errands", order: 1 },
      { id: "handoff", title: "Drop off & receipt", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "tasks", label: "Errands completed as agreed" }
    ],
  },
  {
    slug: "meal-prep-session",
    version: 1,
    label: "Meal Prep Session",
    descriptionShort: "Prepare meals in your home.",
    name: "Meal Prep Session (2 hr)",
    description:
      "In-home meal preparation using your kitchen and ingredients—or an agreed grocery add-on. Dietary needs and storage containers noted in advance.",
    category: "Home Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Share dietary restrictions, available cookware, and containers for storage. Clear fridge space if needed.",
    steps: [
      { id: "menu", title: "Menu & prep plan", order: 0 },
      { id: "cook", title: "Cook & portion", order: 1 },
      { id: "store", title: "Cool, label & store", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "meals", label: "Ready-to-eat meals for the week" }
    ],
  },
  {
    slug: "moving-help-light",
    version: 1,
    label: "Moving Help (Light)",
    descriptionShort: "Packing, organizing, and light lifting.",
    name: "Moving Help — Light (2 hr)",
    description:
      "Light moving help—packing boxes, labeling, and light lifting within safe limits. No heavy appliance moves unless agreed.",
    category: "Home Services",
    durationMinutes: 120,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "100.00",
    currency: "CAD",
    prepInstructions:
      "Have boxes and tape available, label rooms, and note stairs or parking limits.",
    steps: [
      { id: "plan", title: "Plan & protect items", order: 0 },
      { id: "pack", title: "Pack & organize", order: 1 },
      { id: "stage", title: "Stage for movers or transport", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "packed", label: "Belongings packed and organized" }
    ],
  },
  {
    slug: "tutoring-session-60",
    version: 1,
    label: "Tutoring Session",
    descriptionShort: "One-on-one academic support.",
    name: "Tutoring Session (60 min)",
    description:
      "One-on-one support for the subjects and assignments you choose. We’ll clarify concepts and leave you with next steps.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "60.00",
    currency: "CAD",
    prepInstructions:
      "Bring the textbook, recent assignments, and topics to prioritize. Online or in-person as offered.",
    steps: [
      { id: "goals", title: "Goals & gaps", order: 0 },
      { id: "work", title: "Guided practice", order: 1 },
      { id: "next", title: "Recap & next steps", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "clarity", label: "Clearer understanding and next steps" }
    ],
  },
  {
    slug: "music-lesson-45",
    version: 1,
    label: "Music Lesson",
    descriptionShort: "Instrument or vocal training.",
    name: "Music Lesson (45 min)",
    description:
      "A focused lesson on technique, repertoire, and practice habits for your instrument or voice. Bring your instrument unless piano/drums on site.",
    category: "Professional Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "55.00",
    currency: "CAD",
    prepInstructions:
      "Bring music you’re working on, a tuner/metronome if you use them, and note your experience level.",
    steps: [
      { id: "warmup", title: "Warm-up & technique", order: 0 },
      { id: "piece", title: "Repertoire work", order: 1 },
      { id: "practice", title: "Practice plan", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "skills", label: "Skills to practice before next lesson" }
    ],
  },
  {
    slug: "language-lesson-60",
    version: 1,
    label: "Language Lesson",
    descriptionShort: "Practice and instruction in a new language.",
    name: "Language Lesson (60 min)",
    description:
      "Conversation and structured practice for the language you’re learning—pronunciation, vocabulary, and real-life scenarios.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "65.00",
    currency: "CAD",
    prepInstructions:
      "Share your level, goals (travel, work, school), and any textbook or app you follow.",
    steps: [
      { id: "check", title: "Check-in & goals", order: 0 },
      { id: "practice", title: "Guided practice", order: 1 },
      { id: "homework", title: "Takeaways to review", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "fluency", label: "Clearer confidence for next conversation" }
    ],
  },
  {
    slug: "art-lesson-60",
    version: 1,
    label: "Art Lesson",
    descriptionShort: "Creative session for beginners or hobbyists.",
    name: "Art Lesson (60 min)",
    description:
      "A guided creative session—drawing, painting, or mixed media—for beginners or hobbyists. Materials may be supplied or listed in advance.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "50.00",
    currency: "CAD",
    prepInstructions:
      "Note your medium interest, wear clothes that can get messy, and share reference images if you have them.",
    steps: [
      { id: "setup", title: "Setup & demo", order: 0 },
      { id: "create", title: "Guided creation", order: 1 },
      { id: "crit", title: "Feedback & next steps", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "piece", label: "A finished exercise or piece to build on" }
    ],
  },
  {
    slug: "resume-review-session",
    version: 1,
    label: "Resume Review Session",
    descriptionShort: "Feedback and edits for resumes.",
    name: "Resume Review Session (45 min)",
    description:
      "Focused feedback on structure, impact bullets, and clarity for your target roles. Bring a job posting if you want tailoring notes.",
    category: "Professional Services",
    durationMinutes: 45,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "60.00",
    currency: "CAD",
    prepInstructions:
      "Share your current resume file, target roles, and any deadlines.",
    steps: [
      { id: "read", title: "Read & diagnose", order: 0 },
      { id: "edit", title: "Edits & priorities", order: 1 },
      { id: "next", title: "Polish plan", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "stronger", label: "Concrete edits to apply" }
    ],
  },
  {
    slug: "interview-prep-session",
    version: 1,
    label: "Interview Prep Session",
    descriptionShort: "Practice interviews and feedback.",
    name: "Interview Prep Session (60 min)",
    description:
      "Practice answers, framing, and follow-ups for upcoming interviews—with candid feedback you can use immediately.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "70.00",
    currency: "CAD",
    prepInstructions:
      "Bring the job description, your resume, and typical questions you struggle with.",
    steps: [
      { id: "story", title: "Stories & framing", order: 0 },
      { id: "drill", title: "Practice rounds", order: 1 },
      { id: "feedback", title: "Feedback & tweaks", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "ready", label: "Sharper answers for real interviews" }
    ],
  },
  {
    slug: "basic-tech-help-60",
    version: 1,
    label: "Basic Tech Help",
    descriptionShort: "Setup, troubleshooting, and device help.",
    name: "Basic Tech Help (60 min)",
    description:
      "Help with device setup, common software issues, backups, and basic troubleshooting—scoped to everyday tech needs.",
    category: "Professional Services",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "75.00",
    currency: "CAD",
    prepInstructions:
      "List devices and passwords needed (use a password manager), and what “working” looks like for you.",
    steps: [
      { id: "triage", title: "Triage & goals", order: 0 },
      { id: "fix", title: "Fix or configure", order: 1 },
      { id: "teach", title: "Quick tips to avoid repeat issues", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "working", label: "Issues resolved or a clear next step" }
    ],
  },
  {
    slug: "website-setup-help-90",
    version: 1,
    label: "Website Setup Help",
    descriptionShort: "Basic setup for small websites.",
    name: "Website Setup Help (90 min)",
    description:
      "Hands-on help to launch or tidy a simple site—domains, basic pages, and essential settings on common builders.",
    category: "Professional Services",
    durationMinutes: 90,
    bufferMinutes: 15,
    pricingType: "fixed",
    priceAmount: "120.00",
    currency: "CAD",
    prepInstructions:
      "Bring logins, brand assets, and example sites you like. Custom development may be out of scope.",
    steps: [
      { id: "scope", title: "Scope & platform", order: 0 },
      { id: "build", title: "Setup & pages", order: 1 },
      { id: "publish", title: "Publish checklist", order: 2 }
    ],
    addOns: [],
    outcomes: [
      { id: "live", label: "Site closer to ready for visitors" }
    ],
  }
];

/** Full catalog size; `ensureCanonicalTemplates` inserts until at least this many rows exist. */
export const EXPECTED_CANONICAL_TEMPLATE_COUNT = CANONICAL_TEMPLATE_SEEDS.length;
