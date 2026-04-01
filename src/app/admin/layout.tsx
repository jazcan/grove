import Link from "next/link";
import { GroveLogoMark } from "@/components/brand/grove-logo-mark";
import { brand } from "@/config/brand";
import { requireAdmin } from "@/lib/tenancy";
import { signOut } from "@/domain/auth/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-medium" aria-label="Admin">
            <span className="mr-2 flex items-center gap-2 font-bold text-[var(--foreground)]">
              <GroveLogoMark size={28} className="shrink-0 opacity-90" />
              <span className="text-[var(--accent)]">{brand.appName}</span>
              <span className="font-semibold text-[var(--muted)]">Admin</span>
            </span>
            <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-[var(--surface-hover)]">
              Overview
            </Link>
            <Link href="/admin/audit" className="rounded-md px-3 py-2 hover:bg-[var(--surface-hover)]">
              Audit log
            </Link>
            <Link href="/admin/ai" className="rounded-md px-3 py-2 hover:bg-[var(--surface-hover)]">
              AI gateway
            </Link>
            <Link href="/admin/schema-health" className="rounded-md px-3 py-2 hover:bg-[var(--surface-hover)]">
              Schema health
            </Link>
          </nav>
          <form action={signOut}>
            <button type="submit" className="ui-btn-secondary min-h-10 px-4 py-2 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">{children}</div>
    </div>
  );
}
