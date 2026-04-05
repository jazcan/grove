import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { invoice } = detail;
  const margin = 50;
  let y = 720;

  const title = "Invoice";
  page.drawText(title, { x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 36;

  const lines = [
    ["From", detail.providerName],
    ["Bill to", detail.customerName],
    ["Service", detail.serviceName],
    ["Date", detail.bookingStartsAt.toLocaleString()],
    ["Amount", `${invoice.currency} ${invoice.amount.toString()}`],
    ["Status", invoice.status],
    ["Invoice ID", invoice.id],
  ] as const;

  for (const [label, value] of lines) {
    page.drawText(`${label}:`, { x: margin, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: margin + 100, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 20;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.id.slice(0, 8)}.pdf"`,
    },
  });
}

export const dynamic = "force-dynamic";
