type Row = { confirmationCode: string | null; publicReference: string };

/** Human-friendly booking reference for emails and UI. */
export function formatBookingConfirmation(row: Row): string {
  const c = row.confirmationCode?.trim();
  if (c) return c;
  const hex = row.publicReference.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `HL-${hex}`;
}
