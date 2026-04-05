import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { incomeRecords, providers } from "@/db/schema";
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
    .from(incomeRecords)
    .where(eq(incomeRecords.providerId, u.providerId))
    .orderBy(desc(incomeRecords.recognizedAt), desc(incomeRecords.createdAt));

  const header = [
    "id",
    "booking_id",
    "amount",
    "currency",
    "payment_method",
    "is_completed",
    "is_paid",
    "recognized_at",
    "received_at",
    "source_amount_type",
    "created_at",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const recognized = r.recognizedAt
      ? DateTime.fromJSDate(r.recognizedAt, { zone: "utc" }).setZone(tz).toISO()
      : "";
    const received = r.receivedAt
      ? DateTime.fromJSDate(r.receivedAt, { zone: "utc" }).setZone(tz).toISO()
      : "";
    const created = DateTime.fromJSDate(r.createdAt, { zone: "utc" }).setZone(tz).toISO();
    lines.push(
      [
        r.id,
        r.bookingId ?? "",
        r.amount.toString(),
        r.currency,
        r.paymentMethod,
        r.isCompleted ? "true" : "false",
        r.isPaid ? "true" : "false",
        recognized,
        received,
        r.sourceAmountType ?? "",
        created,
      ]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
  }

  const body = lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="income.csv"`,
    },
  });
}

export const dynamic = "force-dynamic";
