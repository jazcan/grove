import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { providerReferrals, providers, users } from "@/db/schema";
import { appUrl } from "@/lib/email";

export type ReferralListRow = {
  referralId: string;
  displayLabel: string;
  status: "invited" | "signed_up" | "activated";
  signedUpAt: Date | null;
  activatedAt: Date | null;
};

export type LocalAmbassadorDashboard = {
  referralCode: string;
  referralUrl: string;
  total: number;
  signedUp: number;
  activated: number;
  referrals: ReferralListRow[];
};

export async function loadLocalAmbassadorDashboard(referrerProviderId: string): Promise<LocalAmbassadorDashboard> {
  const db = getDb();
  const [me] = await db
    .select({ referralCode: providers.referralCode })
    .from(providers)
    .where(eq(providers.id, referrerProviderId))
    .limit(1);

  const code = me?.referralCode ?? "";
  const base = appUrl().replace(/\/$/, "");
  const referralUrl = `${base}/signup?ref=${encodeURIComponent(code)}`;

  const rows = await db
    .select({
      referralId: providerReferrals.id,
      status: providerReferrals.status,
      signedUpAt: providerReferrals.signedUpAt,
      activatedAt: providerReferrals.activatedAt,
      referredProviderId: providerReferrals.referredProviderId,
      referredEmail: providerReferrals.referredEmail,
    })
    .from(providerReferrals)
    .where(eq(providerReferrals.referrerProviderId, referrerProviderId))
    .orderBy(desc(providerReferrals.createdAt));

  const providerIds = rows
    .map((r) => r.referredProviderId)
    .filter((id): id is string => typeof id === "string");

  const userByProvider = new Map<string, { displayName: string; userId: string }>();
  if (providerIds.length) {
    const provRows = await db
      .select({
        id: providers.id,
        displayName: providers.displayName,
        userId: providers.userId,
      })
      .from(providers)
      .where(inArray(providers.id, providerIds));
    for (const p of provRows) {
      userByProvider.set(p.id, { displayName: p.displayName, userId: p.userId });
    }
  }

  const userIds = [...new Set([...userByProvider.values()].map((v) => v.userId))];
  const emailByUserId = new Map<string, string>();
  if (userIds.length) {
    const uRows = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, userIds));
    for (const u of uRows) {
      emailByUserId.set(u.id, u.email);
    }
  }

  const referrals: ReferralListRow[] = rows.map((r) => {
    const meta = r.referredProviderId ? userByProvider.get(r.referredProviderId) : undefined;
    const email = meta ? emailByUserId.get(meta.userId) : null;
    const name = meta?.displayName?.trim();
    let displayLabel = "Pending invite";
    if (name && name.length > 0 && name !== "New provider") displayLabel = name;
    else if (email) displayLabel = email;
    else if (r.referredEmail) displayLabel = r.referredEmail;

    return {
      referralId: r.referralId,
      displayLabel,
      status: r.status,
      signedUpAt: r.signedUpAt,
      activatedAt: r.activatedAt,
    };
  });

  const total = referrals.length;
  const signedUp = referrals.filter((x) => x.status === "signed_up" || x.status === "activated").length;
  const activated = referrals.filter((x) => x.status === "activated").length;

  return {
    referralCode: code,
    referralUrl,
    total,
    signedUp,
    activated,
    referrals,
  };
}

/** Admin summary: totals and top referrers by direct referral count. */
export async function loadAdminAmbassadorSummary(): Promise<{
  totalReferrals: number;
  activatedReferrals: number;
  topReferrers: { providerId: string; displayName: string; username: string; referralCount: number }[];
}> {
  const db = getDb();
  const [tot] = await db
    .select({ n: count() })
    .from(providerReferrals)
    .where(sql`${providerReferrals.referredProviderId} is not null`);
  const totalReferrals = Number(tot?.n ?? 0);

  const [act] = await db
    .select({ n: count() })
    .from(providerReferrals)
    .where(
      sql`${providerReferrals.referredProviderId} is not null and ${providerReferrals.status} = 'activated'`
    );
  const activatedReferrals = Number(act?.n ?? 0);

  const topRows = (await db.execute(sql`
    select referrer_provider_id as "referrerProviderId", count(*)::int as c
    from provider_referrals
    where referred_provider_id is not null
    group by referrer_provider_id
    order by c desc
    limit 15
  `)) as unknown as { referrerProviderId: string; c: number }[];

  const ids = topRows.map((t) => t.referrerProviderId);
  if (!ids.length) {
    return { totalReferrals, activatedReferrals, topReferrers: [] };
  }

  const provs = await db
    .select({
      id: providers.id,
      displayName: providers.displayName,
      username: providers.username,
    })
    .from(providers)
    .where(inArray(providers.id, ids));

  const byId = new Map(provs.map((p) => [p.id, p]));
  const topReferrers = topRows
    .map((row) => {
      const p = byId.get(row.referrerProviderId);
      if (!p) return null;
      return {
        providerId: p.id,
        displayName: p.displayName,
        username: p.username,
        referralCount: row.c,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return { totalReferrals, activatedReferrals, topReferrers };
}
