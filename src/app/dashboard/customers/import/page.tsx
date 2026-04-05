import Link from "next/link";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { requireProvider } from "@/lib/tenancy";
import { ImportCustomersCsvWizard } from "@/components/dashboard/customers/import-customers-csv-wizard";

export default async function ImportCustomersCsvPage() {
  await requireProvider();
  const csrf = await getCsrfTokenForForm();

  return (
    <main id="main-content" className="min-w-0 max-w-4xl">
      <Link
        href="/dashboard/customers"
        className="inline-flex text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
      >
        ← Back to customers
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import customers from CSV</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
          Bring people from a spreadsheet into your Handshake Local customer list. Upload a file, match the columns, preview a
          few rows, then import.
        </p>
      </header>

      <ImportCustomersCsvWizard csrf={csrf} />
    </main>
  );
}
