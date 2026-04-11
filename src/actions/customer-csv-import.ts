"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { and, eq, count } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import { parseCsvWithHeaders } from "@/lib/csv-parse";
import {
  buildCustomerInsertFromParts,
  extractMappedParts,
  IMPORT_PLACEHOLDER_EMAIL_DOMAIN,
  isCsvImportFieldValue,
  type CsvImportFieldValue,
} from "@/domain/customers/csv-import";
import { logAudit } from "@/lib/audit";
import { emitOnboardingCustomerAdded } from "@/lib/onboarding-platform-events";

const MAX_BYTES = 600_000;

function parseMappingJson(raw: string): Record<number, CsvImportFieldValue> | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (!j || typeof j !== "object") return null;
    const out: Record<number, CsvImportFieldValue> = {};
    for (const [k, v] of Object.entries(j)) {
      const idx = Number(k);
      if (!Number.isFinite(idx) || idx < 0) continue;
      if (typeof v !== "string" || !isCsvImportFieldValue(v)) return null;
      out[idx] = v;
    }
    return out;
  } catch {
    return null;
  }
}

export async function importCustomersCsvAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "importCustomersCsv" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const csvText = formData.get("csvText")?.toString() ?? "";
  const mappingJson = formData.get("mappingJson")?.toString() ?? "";

  if (csvText.length > MAX_BYTES) {
    return {
      error: `That file is too large (max ${Math.round(MAX_BYTES / 1000)}KB). Try splitting the file or removing extra rows.`,
    };
  }

  const mapping = parseMappingJson(mappingJson);
  if (!mapping) return { error: "Something went wrong with the column mapping. Refresh the page and try again." };

  const parsed = parseCsvWithHeaders(csvText);
  if (!parsed.ok) return { error: parsed.error };

  const seenInFile = new Set<string>();
  let imported = 0;
  let skippedDuplicates = 0;
  let skippedEmpty = 0;
  let skippedNoIdentifier = 0;
  let skippedInvalidEmail = 0;
  let failed = 0;

  const db = getDb();

  const [custBefore] = await db
    .select({ n: count() })
    .from(customers)
    .where(eq(customers.providerId, ctx.providerId));
  const hadCustomers = Number(custBefore?.n ?? 0) > 0;
  let firstNewCustomerId: string | null = null;

  for (const row of parsed.rows) {
    const parts = extractMappedParts(row, mapping);
    const placeholderEmail = `import-${randomUUID()}@${IMPORT_PLACEHOLDER_EMAIL_DOMAIN}`;
    const built = buildCustomerInsertFromParts(parts, placeholderEmail);

    if (!built.ok) {
      if (built.reason === "empty_row") skippedEmpty += 1;
      else if (built.reason === "no_identifier") skippedNoIdentifier += 1;
      else if (built.reason === "bad_email") skippedInvalidEmail += 1;
      continue;
    }

    if (seenInFile.has(built.emailNormalized)) {
      skippedDuplicates += 1;
      continue;
    }

    const [dup] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.providerId, ctx.providerId), eq(customers.emailNormalized, built.emailNormalized)))
      .limit(1);

    if (dup) {
      skippedDuplicates += 1;
      continue;
    }

    seenInFile.add(built.emailNormalized);

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
      failed += 1;
    }
  }

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "customer",
    entityId: ctx.providerId,
    action: "csv_imported",
    metadata: { imported, skippedDuplicates, skippedEmpty, skippedNoIdentifier, skippedInvalidEmail, failed },
  });

  revalidatePath("/dashboard/customers");

  if (!hadCustomers && imported > 0 && firstNewCustomerId) {
    await emitOnboardingCustomerAdded(
      db,
      { providerId: ctx.providerId, userId: ctx.id, actorType: "user" },
      firstNewCustomerId
    );
  }

  const parts = [
    `Imported ${imported} customer${imported === 1 ? "" : "s"}.`,
    `${skippedDuplicates} skipped (already in your list or duplicate in the file).`,
    `${skippedEmpty} empty row(s) skipped.`,
    `${skippedNoIdentifier} row(s) skipped (need at least a name, email, phone, or company).`,
    skippedInvalidEmail > 0 ? `${skippedInvalidEmail} row(s) skipped (email looked invalid).` : null,
    failed > 0 ? `${failed} row(s) could not be saved.` : null,
  ].filter(Boolean);

  return { success: parts.join(" ") };
}
