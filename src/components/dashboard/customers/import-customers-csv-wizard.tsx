"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";
import { importCustomersCsvAction } from "@/actions/customer-csv-import";
import { CsrfField } from "@/components/csrf-field";
import {
  CSV_IMPORT_FIELD_OPTIONS,
  extractMappedParts,
  guessColumnMapping,
  resolveFullName,
  type CsvImportFieldValue,
} from "@/domain/customers/csv-import";
import { parseCsvWithHeaders } from "@/lib/csv-parse";

type Step = 1 | 2 | 3;

type Props = { csrf: string };

export function ImportCustomersCsvWizard({ csrf }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, CsvImportFieldValue>>({});

  const [state, formAction, pending] = useActionState(importCustomersCsvAction, undefined);

  const reset = useCallback(() => {
    setStep(1);
    setParseError(null);
    setFileName(null);
    setCsvText("");
    setHeaders([]);
    setRows([]);
    setMapping({});
  }, []);

  const onFile = useCallback((file: File | null) => {
    setParseError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please choose a file that ends in .csv.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCsvWithHeaders(text);
      if (!parsed.ok) {
        setParseError(parsed.error);
        setCsvText("");
        setHeaders([]);
        setRows([]);
        return;
      }
      setCsvText(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(guessColumnMapping(parsed.headers));
      setStep(2);
    };
    reader.onerror = () => {
      setParseError("Could not read that file. Try again or export CSV from your other app.");
    };
    reader.readAsText(file);
  }, []);

  const mappingJson = useMemo(() => JSON.stringify(mapping), [mapping]);

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  if (state?.success) {
    return (
      <div className="mt-8 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Import finished</h2>
        <p className="mt-3 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          {state.success}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/customers" className="ui-btn-primary inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold">
            Back to customers
          </Link>
          <button type="button" onClick={reset} className="ui-btn inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold">
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {step === 1 ? (
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Step 1 — Upload your CSV</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            Export a spreadsheet from your contacts app or CRM as a .csv file. The first row should list column names (for
            example: Name, Email, Phone).
          </p>
          <label className="mt-6 block">
            <span className="sr-only">Choose CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full max-w-md text-sm file:mr-4 file:rounded-lg file:border file:border-[var(--border)] file:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--foreground)]"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {fileName ? (
            <p className="mt-3 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Selected: {fileName}</p>
          ) : null}
          {parseError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
            >
              {parseError}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Step 2 — Match your columns</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            For each column from your file, choose what it should fill in Handshake Local. We guessed a few matches from the
            column names—you can change any of them. Pick &quot;Do not import&quot; to skip a column.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
            If you map both &quot;Full name&quot; and first/last name, we use the full name when it is filled in. Rows need at
            least a name, email, phone, or company to be imported. If someone has no email, we create a placeholder address so
            they can still be saved (you can edit it later).
          </p>

          <ul className="mt-6 space-y-4">
            {headers.map((h, idx) => (
              <li key={`${idx}-${h}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:items-center">
                <div className="min-w-0 text-sm">
                  <span className="font-medium text-[var(--foreground)]">{h}</span>
                  <span className="mt-0.5 block text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
                    Column from your file
                  </span>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="sr-only">Maps to</span>
                  <select
                    className="ui-input h-11 text-base"
                    value={mapping[idx] ?? "skip"}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMapping((prev) => ({
                        ...prev,
                        [idx]: v as CsvImportFieldValue,
                      }));
                    }}
                  >
                    {CSV_IMPORT_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="ui-btn-primary min-h-11 px-5 text-sm font-semibold" onClick={() => setStep(3)}>
              Continue to preview
            </button>
            <button type="button" className="ui-btn min-h-11 px-5 text-sm font-semibold" onClick={reset}>
              Start over
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Step 3 — Preview and import</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            Here are the first few rows after matching. When you import, we skip blank rows and anyone who is already in your
            list with the same email address.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))]">
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Phone</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Notes (excerpt)</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                      No data rows in this file (only a header row). You can still import—nothing will be added.
                    </td>
                  </tr>
                ) : null}
                {previewRows.map((r, i) => {
                  const parts = extractMappedParts(r, mapping);
                  const name = resolveFullName(parts) || (parts.companyRaw.trim() ? "Imported contact" : "—");
                  const email = parts.emailRaw.trim();
                  const phone = parts.phoneRaw.trim();
                  const note = parts.notesRaw.trim().slice(0, 80);
                  return (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 align-top text-[var(--foreground)]">{name}</td>
                      <td className="px-3 py-2 align-top text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] break-all">
                        {email.includes("@") ? email : "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                        {phone || "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                        {note ? `${note}${parts.notesRaw.length > 80 ? "…" : ""}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
            Total rows in file (not including the header): {rows.length}
          </p>

          {state?.error ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
            >
              {state.error}
            </div>
          ) : null}

          <form action={formAction} className="mt-6 flex flex-wrap gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="csvText" value={csvText} readOnly />
            <input type="hidden" name="mappingJson" value={mappingJson} readOnly />
            <button type="submit" disabled={pending} className="ui-btn-primary min-h-11 px-5 text-sm font-semibold disabled:opacity-60">
              {pending ? "Importing…" : "Import customers"}
            </button>
            <button type="button" className="ui-btn min-h-11 px-5 text-sm font-semibold" onClick={() => setStep(2)} disabled={pending}>
              Back
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
