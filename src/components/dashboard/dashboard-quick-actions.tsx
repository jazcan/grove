"use client";

import Link from "next/link";
import { AddCustomerModalRoot, AddCustomerModalButton } from "@/components/dashboard/add-customer-modal";

type Props = {
  csrf: string;
};

export function DashboardQuickActionsBar({ csrf }: Props) {
  return (
    <AddCustomerModalRoot csrf={csrf}>
      <section aria-labelledby="quick-actions-heading" className="ui-card p-4 sm:p-5">
        <h2 id="quick-actions-heading" className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
          Quick actions
        </h2>
        <p className="ui-hint mt-1 text-xs">Common tasks without hunting through the nav.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/services?scratch=1"
            className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
          >
            Add service
          </Link>
          <Link
            href="/dashboard/availability#blocked-time-list"
            className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
          >
            Block time
          </Link>
          <Link
            href="/dashboard/marketing"
            className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
          >
            Create campaign
          </Link>
          <AddCustomerModalButton className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold" />
        </div>
      </section>
    </AddCustomerModalRoot>
  );
}
