import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { loadInvoiceDetailForProvider } from "@/domain/money/load-invoice-detail";
import { getSessionUser } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getSessionUser();
  if (!u?.providerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const detail = await loadInvoiceDetailForProvider(db, id, u.providerId);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: detail.invoice.id,
    bookingId: detail.invoice.bookingId,
    customerId: detail.invoice.customerId,
    amount: detail.invoice.amount.toString(),
    currency: detail.invoice.currency,
    status: detail.invoice.status,
    issuedAt: detail.invoice.issuedAt.toISOString(),
    createdAt: detail.invoice.createdAt.toISOString(),
    providerName: detail.providerName,
    customerName: detail.customerName,
    serviceName: detail.serviceName,
    bookingStartsAt: detail.bookingStartsAt.toISOString(),
  });
}

export const dynamic = "force-dynamic";
