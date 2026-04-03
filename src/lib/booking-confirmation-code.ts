import { randomBytes } from "crypto";

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. HL-A3K9P2 — avoids ambiguous characters. */
export function generateBookingConfirmationCode(): string {
  const buf = randomBytes(6);
  let s = "HL-";
  for (let i = 0; i < 6; i++) {
    s += ALPHANUM[buf[i]! % ALPHANUM.length];
  }
  return s;
}
