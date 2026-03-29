/**
 * Run: DATABASE_URL=... npx tsx src/db/seed.ts
 * Inserts default system message templates if missing, and canonical service templates if the
 * table is empty (same rows as drizzle/0004 — needed when the DB was created with `db:push` only).
 */
import { and, eq, isNull } from "drizzle-orm";
import { ensureCanonicalTemplates } from "./ensure-canonical-templates";
import { getDb } from "./index";
import { messageTemplates, featureFlags } from "./schema";

async function main() {
  const db = getDb();
  await ensureCanonicalTemplates(db);
  const defaults = [
    {
      name: "Booking confirmation",
      messageType: "confirmation",
      subject: "Confirmed: {{serviceName}} with {{providerName}}",
      body: "Hi {{customerName}}, your booking is confirmed for {{startTime}}.",
    },
    {
      name: "Booking reminder",
      messageType: "reminder",
      subject: "Reminder: {{serviceName}} with {{providerName}}",
      body: "Hi {{customerName}}, this is a reminder about your upcoming appointment.",
    },
    {
      name: "Follow-up",
      messageType: "followup",
      subject: "Thanks from {{providerName}}",
      body: "Hi {{customerName}}, thanks for booking. {{manageUrl}}",
    },
    {
      name: "Openings this week",
      messageType: "marketing",
      subject: "Openings this week — {{name}}",
      body: "Hi {{name}}, I have a few openings this week. Reply if you would like to book.",
    },
    {
      name: "Time to rebook",
      messageType: "marketing",
      subject: "Time to rebook — {{name}}",
      body: "Hi {{name}}, it has been a while — want to get another session on the calendar?",
    },
  ];

  for (const d of defaults) {
    const [existing] = await db
      .select({ id: messageTemplates.id })
      .from(messageTemplates)
      .where(
        and(
          isNull(messageTemplates.providerId),
          eq(messageTemplates.messageType, d.messageType),
          eq(messageTemplates.name, d.name)
        )
      )
      .limit(1);
    if (existing) continue;
    await db.insert(messageTemplates).values({
      providerId: null,
      name: d.name,
      messageType: d.messageType,
      subject: d.subject,
      body: d.body,
      isActive: true,
    });
  }
  const [ff] = await db
    .select({ key: featureFlags.key })
    .from(featureFlags)
    .where(eq(featureFlags.key, "ai_gateway"))
    .limit(1);
  if (!ff) {
    await db.insert(featureFlags).values({ key: "ai_gateway", enabled: false });
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
