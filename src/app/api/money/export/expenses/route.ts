import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { expenseRecords, providers } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const u = await getSessionUser();
  if (!u?.providerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const tz = prov?.timezone ?? "America/Toronto";

  const rows = await db
    .select()
    .from(expenseRecords)
    .where(eq(expenseRecords.providerId, u.providerId))
    .orderBy(desc(expenseRecords.incurredAt), desc(expenseRecords.createdAt));

  const header = ["id", "amount", "category", "description", "incurred_at", "created_at"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const incurred =
      r.incurredAt instanceof Date ? r.incurredAt.toISOString().slice(0, 10) : String(r.incurredAt);
    const created = DateTime.fromJSDate(r.createdAt, { zone: "utc" }).setZone(tz).toISO();
    lines.push(
      [r.id, r.amount.toString(), r.category, r.description ?? "", incurred, created]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
  }

  const body = lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses.csv"`,
    },
  });
}

export const dynamic = "force-dynamic";
