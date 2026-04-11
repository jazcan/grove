import { NextResponse } from "next/server";

/** Minimal CSV template for onboarding / CRM import (name, email, phone). */
export function GET() {
  const body = ["name,email,phone", 'Example Client,client@example.com,555-0100', ""].join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="handshake-local-customers-template.csv"',
    },
  });
}
