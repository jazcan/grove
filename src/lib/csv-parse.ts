/**
 * Minimal RFC 4180–style CSV parsing (quoted fields, commas in quotes, CRLF).
 * Returns empty cells as ""; skips rows where every cell is empty/whitespace.
 */

export type CsvParseOk = { ok: true; headers: string[]; rows: string[][] };
export type CsvParseErr = { ok: false; error: string };
export type CsvParseResult = CsvParseOk | CsvParseErr;

const MAX_ROWS = 2500;
const MAX_COLS = 40;

export function parseCsvToMatrix(text: string): string[][] | { error: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 0) return;
    const hasContent = row.some((c) => c.trim() !== "");
    if (hasContent) rows.push(row);
    row = [];
  };

  while (i < len) {
    const c = text[i]!;

    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (c === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }

    if (c === "\r") {
      if (text[i + 1] === "\n") {
        pushField();
        pushRow();
        i += 2;
        continue;
      }
      pushField();
      pushRow();
      i += 1;
      continue;
    }

    field += c;
    i += 1;
  }

  pushField();
  pushRow();

  if (inQuotes) return { error: "CSV has an unclosed quote. Fix the file and try again." };

  if (rows.length === 0) return { error: "No rows found in this CSV." };

  for (const r of rows) {
    if (r.length > MAX_COLS) {
      return { error: `This CSV has too many columns (max ${MAX_COLS}). Try removing extra columns.` };
    }
  }

  if (rows.length > MAX_ROWS + 1) {
    return { error: `This CSV has too many rows (max ${MAX_ROWS} data rows). Split the file or remove extra rows.` };
  }

  return rows;
}

/** First row = headers; remaining rows = data. Header names are trimmed; empty header cells become "Column N". */
export function parseCsvWithHeaders(raw: string): CsvParseResult {
  const t = raw.replace(/^\uFEFF/, "").trim();
  if (!t) return { ok: false, error: "The file is empty." };

  const matrixOrErr = parseCsvToMatrix(t);
  if ("error" in matrixOrErr && typeof matrixOrErr.error === "string") {
    return { ok: false, error: matrixOrErr.error };
  }
  const matrix = matrixOrErr as string[][];
  const headerRow = matrix[0] ?? [];
  if (headerRow.length === 0) return { ok: false, error: "Could not read column headers from the first row." };

  const headers = headerRow.map((h, idx) => {
    const s = h.trim();
    return s || `Column ${idx + 1}`;
  });

  const width = headers.length;
  const dataRows = matrix.slice(1).map((r) => {
    const out = r.slice(0, width);
    while (out.length < width) out.push("");
    return out;
  });

  return { ok: true, headers, rows: dataRows };
}
