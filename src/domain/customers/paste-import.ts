import { parseCsvToMatrix } from "@/lib/csv-parse";

export type ParsedPasteContact = {
  lineNumber: number;
  fullName: string;
  email: string;
  phone: string;
  /** Set when the line could not be parsed as CSV (comma row). */
  parseError?: string;
};

function digitCount(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

/** True when the string looks like a phone number (not an email). */
export function looksLikePhone(s: string): boolean {
  return digitCount(s) >= 7;
}

function normalizeCellsToContact(parts: string[]): { fullName: string; email: string; phone: string } {
  const cleaned = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  if (cleaned.length === 0) return { fullName: "", email: "", phone: "" };

  if (cleaned.length === 1) {
    const x = cleaned[0]!;
    if (x.includes("@")) return { fullName: "", email: x, phone: "" };
    if (looksLikePhone(x)) return { fullName: "", email: "", phone: x };
    return { fullName: x, email: "", phone: "" };
  }

  if (cleaned.length === 2) {
    const [a, b] = cleaned;
    if (b!.includes("@")) return { fullName: a!, email: b!, phone: "" };
    if (a!.includes("@")) return { fullName: b!, email: a!, phone: "" };
    if (looksLikePhone(b!)) return { fullName: a!, email: "", phone: b! };
    if (looksLikePhone(a!)) return { fullName: b!, email: "", phone: a! };
    return { fullName: `${a}, ${b}`.trim(), email: "", phone: "" };
  }

  const name = cleaned[0]!;
  const second = cleaned[1]!;
  const third = cleaned[2] ?? "";

  if (second.includes("@")) {
    return { fullName: name, email: second, phone: third };
  }
  if (looksLikePhone(second)) {
    const email = third.includes("@") ? third : cleaned.find((c) => c.includes("@")) ?? "";
    return { fullName: name, email, phone: second };
  }

  const email = cleaned.find((c) => c.includes("@")) ?? "";
  const phone = cleaned.find((c) => c !== name && c !== email && looksLikePhone(c)) ?? "";
  return { fullName: name, email, phone };
}

/**
 * Parse one pasted line (tab- or comma-separated). Returns null for blank lines.
 */
export function parseContactPasteLine(rawLine: string, lineNumber: number): ParsedPasteContact | null {
  const raw = rawLine.replace(/\uFEFF/g, "").trim();
  if (!raw) return null;

  let cells: string[];

  if (raw.includes("\t")) {
    cells = raw.split("\t").map((c) => c.trim());
  } else if (raw.includes(",")) {
    const matrixOrErr = parseCsvToMatrix(`${raw}\n`);
    if (typeof matrixOrErr === "object" && "error" in matrixOrErr) {
      return {
        lineNumber,
        fullName: "",
        email: "",
        phone: "",
        parseError: matrixOrErr.error,
      };
    }
    const matrix = matrixOrErr as string[][];
    cells = matrix[0] ?? [];
  } else {
    cells = [raw];
  }

  const { fullName, email, phone } = normalizeCellsToContact(cells);
  return { lineNumber, fullName, email, phone };
}

/** Split pasted text into contact rows (line numbers are 1-based). */
export function parseContactPaste(text: string): ParsedPasteContact[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: ParsedPasteContact[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseContactPasteLine(lines[i] ?? "", i + 1);
    if (parsed) out.push(parsed);
  }
  return out;
}
