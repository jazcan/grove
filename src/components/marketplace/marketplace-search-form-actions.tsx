"use client";

import { useRouter } from "next/navigation";

export const MARKETPLACE_SEARCH_FORM_ID = "marketplace-search-form";

export function MarketplaceSearchFormActions() {
  const router = useRouter();

  function handleClear() {
    const hasQuery =
      typeof window !== "undefined" && window.location.search.replace(/^\?/, "").length > 0;

    if (hasQuery) {
      router.push("/marketplace");
      return;
    }

    const form = document.getElementById(MARKETPLACE_SEARCH_FORM_ID);
    if (form instanceof HTMLFormElement) {
      const q = form.querySelector<HTMLInputElement>('input[name="q"]');
      const location = form.querySelector<HTMLInputElement>('input[name="location"]');
      const country = form.querySelector<HTMLSelectElement>('select[name="country"]');
      const radiusKm = form.querySelector<HTMLSelectElement>('select[name="radiusKm"]');
      const category = form.querySelector<HTMLInputElement>('input[name="category"]');
      const availableDate = form.querySelector<HTMLInputElement>('input[name="availableDate"]');
      if (q) q.value = "";
      if (location) location.value = "";
      if (country) country.value = "CA";
      if (radiusKm) radiusKm.value = "25";
      if (category) category.value = "";
      if (availableDate) availableDate.value = "";
    }
    router.refresh();
  }

  return (
    <div className="flex w-full flex-row flex-wrap items-center gap-3">
      <button
        type="submit"
        className="ui-btn-primary min-h-12 min-w-0 flex-1 px-8 text-base font-semibold shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--accent)_45%,transparent)] sm:w-auto sm:flex-none sm:min-w-[12rem]"
      >
        Search
      </button>
      <button type="button" className="ui-btn-secondary min-h-12 shrink-0 px-5 sm:px-6" onClick={handleClear}>
        Clear
      </button>
    </div>
  );
}
