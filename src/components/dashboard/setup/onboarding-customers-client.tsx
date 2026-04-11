"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";
import { importOnboardingCustomersAction } from "@/actions/onboarding-customers-import";
import { CsrfField } from "@/components/csrf-field";
import { brand } from "@/config/brand";
import {
  buildCustomerInsertFromParts,
  CSV_IMPORT_FIELD_OPTIONS,
  extractMappedParts,
  guessColumnMapping,
  resolveFullName,
  type CsvImportFieldValue,
  type MappedRowParts,
} from "@/domain/customers/csv-import";
import { parseContactPaste } from "@/domain/customers/paste-import";
import { parseCsvWithHeaders } from "@/lib/csv-parse";
type Tab = "quick" | "paste" | "csv";

type QuickRow = { id: string; fullName: string; email: string; phone: string };

const PREVIEW_PLACEHOLDER_EMAIL = `preview@import.placeholder.invalid`;

function newRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
}

function partsFromQuick(r: QuickRow): MappedRowParts {
  return {
    firstName: "",
    lastName: "",
    fullNameRaw: r.fullName,
    emailRaw: r.email,
    phoneRaw: r.phone,
    notesRaw: "",
    tagsRaw: "",
    companyRaw: "",
  };
}

function previewLabel(built: { email: string; fullName: string; phone: string | null }): {
  name: string;
  email: string;
  phone: string;
} {
  const isPlaceholder = built.email.endsWith("@import.placeholder.invalid");
  return {
    name: built.fullName,
    email: isPlaceholder ? "— (placeholder — not a real inbox)" : built.email,
    phone: built.phone ?? "—",
  };
}

type OnboardingCustomersClientProps = {
  csrf: string;
  /** After save, primary “continue” target (defaults to profile setup). */
  successContinueHref?: string;
  successContinueLabel?: string;
  successSecondaryHref?: string;
  successSecondaryLabel?: string;
};

export function OnboardingCustomersClient({
  csrf,
  successContinueHref,
  successContinueLabel,
  successSecondaryHref,
  successSecondaryLabel,
}: OnboardingCustomersClientProps) {
  const continueHref = successContinueHref ?? "/dashboard/profile";
  const continueLabel = successContinueLabel ?? "Continue setup";
  const secondaryHref = successSecondaryHref ?? "/dashboard/customers";
  const secondaryLabel = successSecondaryLabel ?? "View customers";
  const [tab, setTab] = useState<Tab>("quick");
  const [quickRows, setQuickRows] = useState<QuickRow[]>([
    { id: newRowId(), fullName: "", email: "", phone: "" },
  ]);
  const [pasteText, setPasteText] = useState("");
  const [pasteParsed, setPasteParsed] = useState<ReturnType<typeof parseContactPaste> | null>(null);
  const [, setCsvText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<number, CsvImportFieldValue>>({});
  const [csvError, setCsvError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(importOnboardingCustomersAction, undefined);

  const addQuickRow = useCallback(() => {
    setQuickRows((prev) => [...prev, { id: newRowId(), fullName: "", email: "", phone: "" }]);
  }, []);

  const removeQuickRow = useCallback((id: string) => {
    setQuickRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateQuick = useCallback((id: string, field: keyof Omit<QuickRow, "id">, value: string) => {
    setQuickRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const parsePaste = useCallback(() => {
    setPasteParsed(parseContactPaste(pasteText));
  }, [pasteText]);

  const onCsvFile = useCallback((file: File | null) => {
    setCsvError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Choose a file that ends in .csv.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCsvWithHeaders(text);
      if (!parsed.ok) {
        setCsvError(parsed.error);
        setCsvText("");
        setCsvHeaders([]);
        setCsvRows([]);
        setCsvMapping({});
        return;
      }
      setCsvText(text);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      setCsvMapping(guessColumnMapping(parsed.headers));
    };
    reader.onerror = () => setCsvError("Could not read that file.");
    reader.readAsText(file);
  }, []);

  const quickRowsJson = useMemo(() => {
    const cleaned = quickRows
      .map((r) => ({
        fullName: r.fullName.trim(),
        email: r.email.trim(),
        phone: r.phone.trim(),
      }))
      .filter((r) => r.fullName || r.email || r.phone);
    return JSON.stringify(cleaned);
  }, [quickRows]);

  const pasteRowsJson = useMemo(() => {
    if (!pasteParsed?.length) return "[]";
    const cleaned = pasteParsed
      .filter((p) => !p.parseError)
      .map((p) => ({
        fullName: p.fullName.trim(),
        email: p.email.trim(),
        phone: p.phone.trim(),
      }))
      .filter((r) => r.fullName || r.email || r.phone);
    return JSON.stringify(cleaned);
  }, [pasteParsed]);

  const csvRowsJson = useMemo(() => {
    if (!csvRows.length || !Object.keys(csvMapping).length) return "[]";
    const cleaned = csvRows
      .map((row) => {
        const parts = extractMappedParts(row, csvMapping);
        return {
          fullName: resolveFullName(parts).trim(),
          email: parts.emailRaw.trim(),
          phone: parts.phoneRaw.trim(),
        };
      })
      .filter((r) => r.fullName || r.email || r.phone);
    return JSON.stringify(cleaned);
  }, [csvRows, csvMapping]);

  const quickPreview = useMemo(() => {
    return quickRows.map((r) => {
      const built = buildCustomerInsertFromParts(partsFromQuick(r), PREVIEW_PLACEHOLDER_EMAIL);
      if (!built.ok) {
        return { id: r.id, ok: false as const, reason: built.reason };
      }
      return { ...previewLabel(built), id: r.id, ok: true as const };
    });
  }, [quickRows]);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">You&apos;re set</h2>
        <p className="mt-3 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          {state.success}
        </p>
        <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Contacts without a real email get a private placeholder address so they still show up in your list—you can add
          their email anytime on their profile.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={continueHref}
            className="ui-btn-primary inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold no-underline"
          >
            {continueLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="ui-btn inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold no-underline"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {state?.error ? (
        <div
          role="alert"
          className="rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="How to add customers">
        {(
          [
            ["quick", "Quick add"],
            ["paste", "Paste a list"],
            ["csv", "CSV file"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={[
              "min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
              tab === k
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "bg-[var(--surface-muted)] text-[var(--foreground)] ring-1 ring-[var(--card-border)]",
            ].join(" ")}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "quick" ? (
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Quick add</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            Add a name plus email and/or phone. If someone only has a phone or you only know their name, that&apos;s fine—we
            store a placeholder email when needed (you can fix it later).{" "}
            <span className="text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
              Many providers copy names from Facebook messages or texts—paste those here or use{" "}
              <button type="button" className="font-semibold text-[var(--accent)] underline underline-offset-2" onClick={() => setTab("paste")}>
                Paste a list
              </button>
              .
            </span>
          </p>

          <ul className="mt-6 space-y-4">
            {quickRows.map((r, idx) => {
              const hasAny = Boolean(r.fullName.trim() || r.email.trim() || r.phone.trim());
              const pv = quickPreview.find((p) => p.id === r.id);
              return (
                <li key={r.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Person {idx + 1}
                    </span>
                    {quickRows.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--accent)] underline underline-offset-2"
                        onClick={() => removeQuickRow(r.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-[var(--foreground)]">Name</span>
                      <input
                        className="ui-input h-11 text-base"
                        value={r.fullName}
                        onChange={(e) => updateQuick(r.id, "fullName", e.target.value)}
                        autoComplete="name"
                        placeholder="e.g. Sam Rivera"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-[var(--foreground)]">Email (optional)</span>
                      <input
                        className="ui-input h-11 text-base"
                        value={r.email}
                        onChange={(e) => updateQuick(r.id, "email", e.target.value)}
                        autoComplete="email"
                        placeholder="name@example.com"
                        type="email"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-[var(--foreground)]">Phone (optional)</span>
                      <input
                        className="ui-input h-11 text-base"
                        value={r.phone}
                        onChange={(e) => updateQuick(r.id, "phone", e.target.value)}
                        autoComplete="tel"
                        placeholder="555-0100"
                        type="tel"
                      />
                    </label>
                  </div>
                  {hasAny && pv && !pv.ok ? (
                    <p className="mt-2 text-xs text-[var(--error)]">
                      {pv.reason === "no_identifier"
                        ? "Add at least a name, email, or phone."
                        : pv.reason === "bad_email"
                          ? "Email doesn’t look valid."
                          : pv.reason === "empty_row"
                            ? "This row is empty."
                            : "Check this row."}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="ui-btn-secondary min-h-11 px-5 text-sm font-semibold" onClick={addQuickRow}>
              Add another
            </button>
          </div>

          <form action={formAction} className="mt-8 flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
            <CsrfField token={csrf} />
            <input type="hidden" name="rowsJson" value={quickRowsJson} readOnly />
            <button
              type="submit"
              disabled={pending}
              data-testid="onboarding-customers-save-quick"
              className="ui-btn-primary min-h-11 px-5 text-sm font-semibold disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save customers"}
            </button>
          </form>
        </section>
      ) : null}

      {tab === "paste" ? (
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Paste a list</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            Copy rows from a spreadsheet or notes—one person per line. Use tabs or commas between columns. Order can be{" "}
            <strong className="font-semibold text-[var(--foreground)]">name, email, phone</strong> when you have three
            columns. We don&apos;t connect to Facebook or Messenger; you copy what you already know.
          </p>
          <label className="mt-4 grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Your list</span>
            <textarea
              className="ui-textarea min-h-[10rem] text-base"
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPasteParsed(null);
              }}
              placeholder={`Jamie Lee\tjamie@example.com\t555-0101\nAlex Smith, alex@example.com,`}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="ui-btn-secondary min-h-11 px-5 text-sm font-semibold" onClick={parsePaste}>
              Review before saving
            </button>
          </div>

          {pasteParsed ? (
            <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))]">
                    <th className="px-3 py-2 text-left font-semibold">Line</th>
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Email</th>
                    <th className="px-3 py-2 text-left font-semibold">Phone</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pasteParsed.map((p) => {
                    if (p.parseError) {
                      return (
                        <tr key={p.lineNumber} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2">{p.lineNumber}</td>
                          <td className="px-3 py-2 text-[var(--error)]" colSpan={4}>
                            {p.parseError}
                          </td>
                        </tr>
                      );
                    }
                    const built = buildCustomerInsertFromParts(
                      {
                        firstName: "",
                        lastName: "",
                        fullNameRaw: p.fullName,
                        emailRaw: p.email,
                        phoneRaw: p.phone,
                        notesRaw: "",
                        tagsRaw: "",
                        companyRaw: "",
                      },
                      PREVIEW_PLACEHOLDER_EMAIL
                    );
                    if (!built.ok) {
                      return (
                        <tr key={p.lineNumber} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2">{p.lineNumber}</td>
                          <td className="px-3 py-2 text-[var(--error)]" colSpan={4}>
                            {built.reason === "no_identifier"
                              ? "Need a name, email, or phone."
                              : built.reason === "bad_email"
                                ? "Invalid email."
                                : "Skipped."}
                          </td>
                        </tr>
                      );
                    }
                    const pv = previewLabel(built);
                    return (
                      <tr key={p.lineNumber} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 align-top tabular-nums">{p.lineNumber}</td>
                        <td className="px-3 py-2 align-top">{pv.name}</td>
                        <td className="px-3 py-2 align-top break-all">{pv.email}</td>
                        <td className="px-3 py-2 align-top">{pv.phone}</td>
                        <td className="px-3 py-2 align-top text-[var(--success)]">Ready</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <form action={formAction} className="mt-6 flex flex-wrap gap-3">
            <CsrfField token={csrf} />
            <input type="hidden" name="rowsJson" value={pasteRowsJson} readOnly />
            <button
              type="submit"
              disabled={pending || !pasteParsed?.length}
              data-testid="onboarding-customers-save-paste"
              className="ui-btn-primary min-h-11 px-5 text-sm font-semibold disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save imported rows"}
            </button>
          </form>
        </section>
      ) : null}

      {tab === "csv" ? (
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">CSV file</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
            Export a spreadsheet as .csv. The first row should be column names.{" "}
            <a
              href="/dashboard/onboarding/customers/template"
              className="font-semibold text-[var(--accent)] underline underline-offset-2"
              download
            >
              Download a small template
            </a>{" "}
            (name, email, phone). Same rules as our full import: rows without a real email get a placeholder—you can edit
            later.
          </p>
          <label className="mt-6 block">
            <span className="sr-only">Choose CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full max-w-md text-sm file:mr-4 file:rounded-lg file:border file:border-[var(--border)] file:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] file:px-4 file:py-2 file:text-sm file:font-medium"
              onChange={(e) => onCsvFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {csvError ? (
            <div role="alert" className="mt-3 text-sm text-[var(--error)]">
              {csvError}
            </div>
          ) : null}

          {csvHeaders.length > 0 ? (
            <>
              <h3 className="mt-8 text-base font-semibold text-[var(--foreground)]">Match columns</h3>
              <ul className="mt-4 space-y-3">
                {csvHeaders.map((h, idx) => (
                  <li key={`${idx}-${h}`} className="grid gap-2 sm:grid-cols-[1fr_16rem] sm:items-center">
                    <span className="text-sm text-[var(--foreground)]">{h}</span>
                    <select
                      className="ui-input h-11 text-base"
                      value={csvMapping[idx] ?? "skip"}
                      onChange={(e) =>
                        setCsvMapping((m) => ({ ...m, [idx]: e.target.value as CsvImportFieldValue }))
                      }
                    >
                      {CSV_IMPORT_FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>

              <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))]">
                      <th className="px-3 py-2 text-left font-semibold">Name</th>
                      <th className="px-3 py-2 text-left font-semibold">Email</th>
                      <th className="px-3 py-2 text-left font-semibold">Phone</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 8).map((row, i) => {
                      const parts = extractMappedParts(row, csvMapping);
                      const built = buildCustomerInsertFromParts(parts, PREVIEW_PLACEHOLDER_EMAIL);
                      if (!built.ok) {
                        return (
                          <tr key={i} className="border-t border-[var(--border)]">
                            <td className="px-3 py-2 text-[var(--error)]" colSpan={4}>
                              Row {i + 1}:{" "}
                              {built.reason === "no_identifier"
                                ? "Need identifier"
                                : built.reason === "bad_email"
                                  ? "Bad email"
                                  : "Skipped"}
                            </td>
                          </tr>
                        );
                      }
                      const pv = previewLabel(built);
                      return (
                        <tr key={i} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2 align-top">{pv.name}</td>
                          <td className="px-3 py-2 align-top break-all">{pv.email}</td>
                          <td className="px-3 py-2 align-top">{pv.phone}</td>
                          <td className="px-3 py-2 align-top text-[var(--success)]">Ready</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[color-mix(in_oklab,var(--foreground)_52%,transparent)]">
                Showing up to 8 rows of {csvRows.length}. Empty rows are ignored when you save.
              </p>

              <form action={formAction} className="mt-6 flex flex-wrap gap-3">
                <CsrfField token={csrf} />
                <input type="hidden" name="rowsJson" value={csvRowsJson} readOnly />
                <button
                  type="submit"
                  disabled={pending || !csvRows.length}
                  data-testid="onboarding-customers-save-csv"
                  className="ui-btn-primary min-h-11 px-5 text-sm font-semibold disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save from CSV"}
                </button>
              </form>
            </>
          ) : null}
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
        {brand.appName} never scrapes Messenger or Facebook. This screen is for information you choose to type or paste.
      </p>
    </div>
  );
}
