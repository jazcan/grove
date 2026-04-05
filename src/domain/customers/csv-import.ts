import { plainTextFromInput } from "@/lib/sanitize";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

/** Target fields for column mapping (UI + import). */
export const CSV_IMPORT_FIELD_OPTIONS = [
  { value: "skip", label: "Do not import" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "fullName", label: "Full name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "tags", label: "Tags (added to notes)" },
  { value: "company", label: "Company / business name (added to notes)" },
] as const;

export type CsvImportFieldValue = (typeof CSV_IMPORT_FIELD_OPTIONS)[number]["value"];

export function isCsvImportFieldValue(s: string): s is CsvImportFieldValue {
  return CSV_IMPORT_FIELD_OPTIONS.some((o) => o.value === s);
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Auto-map common CSV header names to Handshake Local fields. */
export function guessColumnMapping(headers: string[]): Record<number, CsvImportFieldValue> {
  const out: Record<number, CsvImportFieldValue> = {};
  for (let i = 0; i < headers.length; i++) {
    const k = normalizeHeaderKey(headers[i] ?? "");
    let field: CsvImportFieldValue = "skip";

    if (
      k === "first_name" ||
      k === "firstname" ||
      k === "fname" ||
      k === "given_name" ||
      k === "givenname"
    ) {
      field = "firstName";
    } else if (
      k === "last_name" ||
      k === "lastname" ||
      k === "lname" ||
      k === "surname" ||
      k === "family_name"
    ) {
      field = "lastName";
    } else if (
      k === "full_name" ||
      k === "fullname" ||
      k === "name" ||
      k === "customer_name" ||
      k === "client_name" ||
      k === "contact_name"
    ) {
      field = "fullName";
    } else if (k === "email" || k === "email_address" || k === "e_mail" || k === "mail") {
      field = "email";
    } else if (
      k === "phone" ||
      k === "mobile" ||
      k === "cell" ||
      k === "telephone" ||
      k === "tel" ||
      k === "phone_number" ||
      k === "mobile_phone"
    ) {
      field = "phone";
    } else if (k === "notes" || k === "note" || k === "comments" || k === "comment") {
      field = "notes";
    } else if (k === "tags" || k === "tag" || k === "labels" || k === "label") {
      field = "tags";
    } else if (
      k === "company" ||
      k === "business" ||
      k === "business_name" ||
      k === "organization" ||
      k === "org" ||
      k === "company_name"
    ) {
      field = "company";
    }

    out[i] = field;
  }
  return out;
}

export type MappedRowParts = {
  firstName: string;
  lastName: string;
  fullNameRaw: string;
  emailRaw: string;
  phoneRaw: string;
  notesRaw: string;
  tagsRaw: string;
  companyRaw: string;
};

function cellAt(row: string[], idx: number): string {
  return (row[idx] ?? "").trim();
}

/** Apply column mapping to one data row (indices aligned with headers). */
export function extractMappedParts(
  row: string[],
  mapping: Record<number, CsvImportFieldValue>
): MappedRowParts {
  const parts: MappedRowParts = {
    firstName: "",
    lastName: "",
    fullNameRaw: "",
    emailRaw: "",
    phoneRaw: "",
    notesRaw: "",
    tagsRaw: "",
    companyRaw: "",
  };

  const keys = Object.keys(mapping).map((k) => Number(k));
  for (const idx of keys) {
    if (!Number.isFinite(idx) || idx < 0) continue;
    const field = mapping[idx];
    if (!field || field === "skip") continue;
    const v = cellAt(row, idx);
    if (!v) continue;

    switch (field) {
      case "firstName":
        if (!parts.firstName) parts.firstName = v;
        break;
      case "lastName":
        if (!parts.lastName) parts.lastName = v;
        break;
      case "fullName":
        if (!parts.fullNameRaw) parts.fullNameRaw = v;
        break;
      case "email":
        if (!parts.emailRaw) parts.emailRaw = v;
        break;
      case "phone":
        if (!parts.phoneRaw) parts.phoneRaw = v;
        break;
      case "notes":
        parts.notesRaw = parts.notesRaw ? `${parts.notesRaw}\n${v}` : v;
        break;
      case "tags":
        parts.tagsRaw = parts.tagsRaw ? `${parts.tagsRaw}, ${v}` : v;
        break;
      case "company":
        parts.companyRaw = parts.companyRaw ? `${parts.companyRaw} ${v}` : v;
        break;
      default:
        break;
    }
  }

  return parts;
}

/** Synthetic domain for CSV rows without an email (DB requires a non-null email). Not deliverable. */
export const IMPORT_PLACEHOLDER_EMAIL_DOMAIN = "import.placeholder.invalid";

/** Build display full name from mapped parts (schema stores a single full_name). */
export function resolveFullName(parts: MappedRowParts): string {
  const combined = `${parts.firstName} ${parts.lastName}`.trim();
  const full = parts.fullNameRaw.trim();
  if (full && combined) {
    return full;
  }
  if (full) return full;
  if (combined) return combined;
  return "";
}

function hasIdentifyingInfo(parts: MappedRowParts): boolean {
  const name = resolveFullName(parts);
  const email = parts.emailRaw.trim();
  const phone = normalizePhone(parts.phoneRaw || undefined);
  const company = parts.companyRaw.trim();
  return Boolean(name || email.includes("@") || phone || company);
}

export type BuildImportRowResult =
  | { ok: true; fullName: string; email: string; emailNormalized: string; phone: string | null; phoneNormalized: string | null; notes: string }
  | { ok: false; reason: "empty_row" | "no_identifier" | "bad_email" };

/**
 * Turn mapped parts into DB-ready fields. Uses a placeholder email when missing but phone/name exists.
 * Requires at least one of: recognizable name, email with @, or phone with digits.
 */
export function buildCustomerInsertFromParts(parts: MappedRowParts, placeholderEmail: string): BuildImportRowResult {
  const trimmedNotes = parts.notesRaw.trim();
  const tagLine = parts.tagsRaw.trim();
  const companyLine = parts.companyRaw.trim();

  const extraBits: string[] = [];
  if (companyLine) extraBits.push(`Company: ${companyLine}`);
  if (tagLine) extraBits.push(`Tags: ${tagLine}`);
  const extraBlock = extraBits.length ? `${extraBits.join("\n")}\n\n` : "";

  let notes = extraBlock + trimmedNotes;
  notes = plainTextFromInput(notes, 5000);

  let fullName = resolveFullName(parts).trim();
  const emailRaw = parts.emailRaw.trim();

  const phoneRaw = plainTextFromInput(parts.phoneRaw, 40);
  const phoneNorm = normalizePhone(phoneRaw || undefined);

  const rowHasAny =
    fullName.length > 0 ||
    emailRaw.length > 0 ||
    (phoneRaw && phoneRaw.length > 0) ||
    companyLine.length > 0 ||
    tagLine.length > 0 ||
    trimmedNotes.length > 0;

  if (!rowHasAny) return { ok: false, reason: "empty_row" };

  if (!hasIdentifyingInfo(parts)) return { ok: false, reason: "no_identifier" };

  if (!fullName) {
    fullName = "Imported contact";
  }

  fullName = plainTextFromInput(fullName, 200);

  let emailNormalized: string;
  let emailOut: string;

  if (emailRaw.includes("@")) {
    emailNormalized = normalizeEmail(emailRaw);
    emailOut = plainTextFromInput(emailRaw, 320);
    if (!emailNormalized.includes("@")) return { ok: false, reason: "bad_email" };
  } else {
    emailOut = placeholderEmail;
    emailNormalized = normalizeEmail(placeholderEmail);
    if (!notes.includes("Imported without an email address")) {
      notes = plainTextFromInput(`Imported without an email address.\n\n${notes}`, 5000);
    }
  }

  return {
    ok: true,
    fullName,
    email: emailOut,
    emailNormalized,
    phone: phoneRaw ? phoneRaw : null,
    phoneNormalized: phoneNorm,
    notes,
  };
}
