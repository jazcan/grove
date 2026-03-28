export type ServiceFormDefaults = {
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  pricingType: "fixed" | "hourly";
  priceAmount: string;
  currency: string;
  prepInstructions: string;
};

export type ServiceTemplate = {
  id: string;
  label: string;
  descriptionShort: string;
  service: ServiceFormDefaults;
};

/** Card title without redundant duration in parentheses (duration appears on the next line). */
export function templateCardTitle(t: ServiceTemplate): string {
  const n = t.service.name;
  const idx = n.lastIndexOf(" (");
  return idx > 0 ? n.slice(0, idx) : n;
}

export const serviceTemplates: ServiceTemplate[] = [
  {
    id: "consultation-30",
    label: "Initial Consultation (30 min)",
    descriptionShort: "A focused session to understand your needs and next steps.",
    service: {
      name: "Initial Consultation (30 min)",
      description:
        "A focused 30-minute consultation to understand your goals, answer questions, and recommend next steps. Includes a short follow-up summary with actionable recommendations.",
      category: "Consultation",
      durationMinutes: 30,
      bufferMinutes: 10,
      pricingType: "fixed",
      priceAmount: "49.00",
      currency: "CAD",
      prepInstructions:
        "Before we meet, please share a brief summary of what you’d like help with and any relevant links/photos/documents. If this is location-based, include your address and preferred contact number.",
    },
  },
  {
    id: "home-cleaning-2h",
    label: "Home Cleaning (2 hours)",
    descriptionShort: "Kitchens, bathrooms, and living areas—surfaces, floors, and a general tidy.",
    service: {
      name: "Home Cleaning (2 hours)",
      description:
        "Standard home cleaning for kitchens, bathrooms, and living areas. Includes surfaces, floors, and general tidying. You can add notes for priority areas when you book.",
      category: "Cleaning",
      durationMinutes: 120,
      bufferMinutes: 15,
      pricingType: "fixed",
      priceAmount: "160.00",
      currency: "CAD",
      prepInstructions:
        "Please secure pets and place any fragile items aside. If you have product preferences (eco-friendly, scent-free, etc.), add them in your notes. Provide building entry details if needed.",
    },
  },
  {
    id: "lawn-care-60",
    label: "Lawn Mowing + Edging (60 min)",
    descriptionShort:
      "Mowing and edging for front and back—clippings tidied from walks and drives.",
    service: {
      name: "Lawn Mowing + Edging (60 min)",
      description:
        "Front and back lawn mowing with clean edging along walkways/driveway. Includes quick tidy-up of clippings on hard surfaces.",
      category: "Lawn Care",
      durationMinutes: 60,
      bufferMinutes: 10,
      pricingType: "fixed",
      priceAmount: "75.00",
      currency: "CAD",
      prepInstructions:
        "Please ensure access to the yard and remove toys/hoses/obstacles from the grass. Let me know if there are gates, pets, or any areas to avoid (sprinklers, new sod, etc.).",
    },
  },
  {
    id: "dog-walk-45",
    label: "Dog Walk (45 min)",
    descriptionShort: "A paced walk, water refill, and a short update when you’re back.",
    service: {
      name: "Dog Walk (45 min)",
      description:
        "A 45-minute walk tailored to your dog’s pace and preferences. Includes fresh water refill and a short update after the walk.",
      category: "Pet Care",
      durationMinutes: 45,
      bufferMinutes: 5,
      pricingType: "fixed",
      priceAmount: "35.00",
      currency: "CAD",
      prepInstructions:
        "Please provide leash/harness, any special instructions (reactivity, allergies, route preferences), and building access details. If treats are allowed, leave a small container out.",
    },
  },
  {
    id: "tutoring-60-hourly",
    label: "Tutoring Session (60 min, hourly)",
    descriptionShort: "Focused 1:1 time on the topics you choose, with clear next steps.",
    service: {
      name: "Tutoring Session (60 min)",
      description:
        "One hour of 1:1 tutoring focused on your specific goals. We’ll review concepts, practice problems, and leave you with next steps to keep improving.",
      category: "Tutoring",
      durationMinutes: 60,
      bufferMinutes: 10,
      pricingType: "hourly",
      priceAmount: "60.00",
      currency: "CAD",
      prepInstructions:
        "Please share the topic(s), grade/course, and any recent assignments or areas you’re stuck on. If you have a textbook or worksheet, upload photos or links ahead of time.",
    },
  },
];

/** Quick path: minimal decisions, sensible defaults (used with `?prefill=simple`). */
export const quickStartServiceDefaults: ServiceFormDefaults = {
  name: "My service",
  description:
    "Book online at a time that works for you. You can rename this and adjust the details anytime.",
  category: "General",
  durationMinutes: 60,
  bufferMinutes: 10,
  pricingType: "fixed",
  priceAmount: "50.00",
  currency: "CAD",
  prepInstructions: "",
};

export const QUICK_START_PREFILL_ID = "simple";

export function getServiceDefaultsForPrefill(prefill: string | undefined): ServiceFormDefaults | null {
  if (!prefill) return null;
  if (prefill === QUICK_START_PREFILL_ID) return quickStartServiceDefaults;
  const t = serviceTemplates.find((x) => x.id === prefill);
  return t ? t.service : null;
}

/** One-line duration + price for template cards (e.g. "30 min · $49"). */
export function formatTemplateDurationPrice(s: ServiceFormDefaults): string {
  const cur = (s.currency || "CAD").toUpperCase();
  const sym = cur === "USD" ? "$" : cur === "CAD" ? "$" : `${cur} `;
  const amt = s.priceAmount?.trim() || "0";
  const suffix = s.pricingType === "hourly" ? "/hr" : "";
  return `${s.durationMinutes} min · ${sym}${amt}${suffix}`;
}

