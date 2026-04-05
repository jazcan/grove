import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, users } from "@/db/schema";

export type SeededProviderListRow = {
  providerId: string;
  username: string;
  displayName: string;
  businessName: string | null;
  loginEmail: string;
  handoffTargetEmail: string | null;
  handoffStatus: (typeof users.$inferSelect)["handoffStatus"];
  createdAt: Date;
  claimedAt: Date | null;
  handoffSentAt: Date | null;
};

export async function listSeededProvidersForAdmin(): Promise<SeededProviderListRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      providerId: providers.id,
      username: providers.username,
      displayName: providers.displayName,
      businessName: providers.businessName,
      loginEmail: users.email,
      handoffTargetEmail: users.handoffToEmail,
      handoffStatus: users.handoffStatus,
      createdAt: providers.createdAt,
      claimedAt: users.claimedAt,
      handoffSentAt: users.handoffSentAt,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(users.isSeededAccount, true))
    .orderBy(desc(providers.createdAt));

  return rows;
}

export type HandoffDetailRow = {
  providerId: string;
  username: string;
  displayName: string;
  businessName: string | null;
  loginEmail: string;
  handoffTargetEmail: string | null;
  handoffStatus: (typeof users.$inferSelect)["handoffStatus"];
  handoffSentAt: Date | null;
  claimedAt: Date | null;
  internalAdminNotes: string | null;
  userId: string;
};

export async function getSeededProviderHandoffDetail(
  providerId: string
): Promise<HandoffDetailRow | null> {
  const db = getDb();
  const [row] = await db
    .select({
      providerId: providers.id,
      username: providers.username,
      displayName: providers.displayName,
      businessName: providers.businessName,
      loginEmail: users.email,
      handoffTargetEmail: users.handoffToEmail,
      handoffStatus: users.handoffStatus,
      handoffSentAt: users.handoffSentAt,
      claimedAt: users.claimedAt,
      internalAdminNotes: providers.internalAdminNotes,
      userId: users.id,
      isSeeded: users.isSeededAccount,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.id, providerId))
    .limit(1);

  if (!row?.isSeeded) return null;
  return {
    providerId: row.providerId,
    username: row.username,
    displayName: row.displayName,
    businessName: row.businessName,
    loginEmail: row.loginEmail,
    handoffTargetEmail: row.handoffTargetEmail,
    handoffStatus: row.handoffStatus,
    handoffSentAt: row.handoffSentAt,
    claimedAt: row.claimedAt,
    internalAdminNotes: row.internalAdminNotes,
    userId: row.userId,
  };
}
