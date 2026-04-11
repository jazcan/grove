"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { and, eq, count } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import {
  buildCustomerInsertFromParts,
  IMPORT_PLACEHOLDER_EMAIL_DOMAIN,
  type MappedRowParts,
} from "@/domain/customers/csv-import";
import { logAudit } from "@/lib/audit";
import { emitOnboardingCustomerAdded } from "@/lib/onboarding-platform-events";
import { plainTextFromInput } from "@/lib/sanitize";

const MAX_ROWS = 120;
const MAX_PAYLOAD_CHARS = 400_000;

type IncomingRow = { fullName?: unknown; email?: unknown; phone?: unknown };

function toPartsFromIncoming(row: IncomingRow): MappedRowParts {
  return {
    firstName: "",
    lastName: "",
    fullNameRaw: plainTextFromInput(typeof row.fullName === "string" ? row.fullName : "", 200),
    emailRaw: plainTextFromInput(typeof row.email === "string" ? row.email : "", 320),
    phoneRaw: plainTextFromInput(typeof row.phone === "string" ? row.phone : "", 40),
    notesRaw: "",
    tagsRaw: "",
    companyRaw: "",
  };
}

function parseRowsJson(raw: string): IncomingRow[] | null {
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return null;
    if (j.length > MAX_ROWS) return null;
    for (const item of j) {
      if (!item || typeof item !== "object") return null;
    }
    return j as IncomingRow[];
  } catch {
    return null;
  }
}

/**
 * Batch import for onboarding (quick add, paste review, CSV preview). Reuses CSV import field rules.
 */
export async function importOnboardingCustomersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "importOnboardingCustomers" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const rawJson = formData.get("rowsJson")?.toString() ?? "";
  if (rawJson.length > MAX_PAYLOAD_CHARS) {
    return { error: "That list is too large. Try fewer rows or split into two imports." };
  }

  const rows = parseRowsJson(rawJson);
  if (!rows || rows.length === 0) {
    return { error: "Add at least one person with a name, email, or phone before saving." };
  }

  const db = getDb();

  const [custBefore] = await db
    .select({ n: count() })
    .from(customers)
    .where(eq(customers.providerId, ctx.providerId));
  const hadCustomers = Number(custBefore?.n ?? 0) > 0;

  const seenEmailNorm = new Set<string>();
  const seenPhoneNorm = new Set<string>();

  let imported = 0;
  let firstNewCustomerId: string | null = null;
  const skipMessages: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const parts = toPartsFromIncoming(r);
    const placeholderEmail = `import-${randomUUID()}@${IMPORT_PLACEHOLDER_EMAIL_DOMAIN}`;
    const built = buildCustomerInsertFromParts(parts, placeholderEmail);

    if (!built.ok) {
      if (built.reason === "empty_row") continue;
      skipMessages.push(`Row ${i + 1}: skipped (${built.reason.replaceAll("_", " ")})`);
      continue;
    }

    if (seenEmailNorm.has(built.emailNormalized)) {
      skipMessages.push(`Row ${i + 1}: duplicate email in this import.`);
      continue;
    }

    const phoneKey = built.phoneNormalized;
    if (phoneKey && seenPhoneNorm.has(phoneKey)) {
      skipMessages.push(`Row ${i + 1}: duplicate phone in this import.`);
      continue;
    }

    const [dupEmail] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.providerId, ctx.providerId), eq(customers.emailNormalized, built.emailNormalized)))
      .limit(1);
    if (dupEmail) {
      skipMessages.push(`Row ${i + 1}: already in your list (same email).`);
      continue;
    }

    if (phoneKey) {
      const [dupPhone] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.providerId, ctx.providerId),
            eq(customers.accountReady, true),
            eq(customers.phoneNormalized, phoneKey)
          )
        )
        .limit(1);
      if (dupPhone) {
        skipMessages.push(`Row ${i + 1}: already in your list (same phone).`);
        continue;
      }
    }

    seenEmailNorm.add(built.emailNormalized);
    if (phoneKey) seenPhoneNorm.add(phoneKey);

    try {
      const [ins] = await db
        .insert(customers)
        .values({
          providerId: ctx.providerId,
          fullName: built.fullName,
          email: built.email,
          emailNormalized: built.emailNormalized,
          phone: built.phone,
          phoneNormalized: built.phoneNormalized,
          notes: built.notes,
          accountReady: true,
        })
        .returning({ id: customers.id });
      imported += 1;
      if (ins?.id && !firstNewCustomerId) firstNewCustomerId = ins.id;
    } catch {
      skipMessages.push(`Row ${i + 1}: could not be saved.`);
    }
  }

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "customer",
    entityId: ctx.providerId,
    action: "onboarding_customers_imported",
    metadata: { imported, skipped: skipMessages.length },
  });

  revalidatePath("/dashboard/onboarding/customers");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/onboarding/customers");

  if (!hadCustomers && imported > 0 && firstNewCustomerId) {
    await emitOnboardingCustomerAdded(
      db,
      { providerId: ctx.providerId, userId: ctx.id, actorType: "user" },
      firstNewCustomerId
    );
  }

  if (imported === 0) {
    const detail = skipMessages.slice(0, 5).join(" ");
    return {
      error: `No new customers were added.${detail ? ` ${detail}` : ""}${skipMessages.length > 5 ? " …" : ""}`,
    };
  }

  const partsOut = [
    `Saved ${imported} customer${imported === 1 ? "" : "s"}.`,
    skipMessages.length ? `${skipMessages.length} row(s) skipped.` : null,
  ].filter(Boolean) as string[];

  if (skipMessages.length) {
    partsOut.push(skipMessages.slice(0, 4).join(" "));
    if (skipMessages.length > 4) partsOut.push("…");
  }

  return { success: partsOut.join(" ") };
}
