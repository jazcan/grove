"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ServiceTemplate } from "@/lib/service-templates";
import {
  formatTemplateDurationPrice,
  resolveCanonicalTemplateCategoryBucket,
  templateCardTitle,
} from "@/lib/service-templates";
import {
  formatTemplateTagLabel,
  partitionSmartAndRest,
  templateUiTags,
  type ServiceTemplateUiTag,
} from "@/lib/service-template-ui";

/** Dashboard filter keys → canonical `category` bucket. */
type TemplateCategoryFilter = "all" | "home" | "personal" | "professional";

const FILTER_TABS: { value: TemplateCategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "home", label: "Home Services" },
  { value: "personal", label: "Personal Services" },
  { value: "professional", label: "Professional Services" },
];

const FILTER_TO_BUCKET: Record<Exclude<TemplateCategoryFilter, "all">, string> = {
  home: "Home Services",
  personal: "Personal Services",
  professional: "Professional Services",
};

/** Initial grid size before “See all” (goal: 4–6). */
const TEMPLATE_PREVIEW_COUNT = 5;

function templateMatchesCategoryFilter(
  template: ServiceTemplate,
  filter: TemplateCategoryFilter
): boolean {
  if (filter === "all") return true;
  const bucket = resolveCanonicalTemplateCategoryBucket(template.service.category);
  return bucket === FILTER_TO_BUCKET[filter];
}

function templateMatchesSearch(template: ServiceTemplate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = templateCardTitle(template);
  const blob = [
    template.id,
    template.label,
    template.descriptionShort,
    template.description,
    template.service.name,
    template.service.category,
    title,
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

function TagPill({ tag }: { tag: ServiceTemplateUiTag }) {
  return (
    <span className="rounded-full border border-[color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_7%,transparent)] px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--accent)]">
      {formatTemplateTagLabel(tag)}
    </span>
  );
}

function tagsWithoutHighlightDup(highlightLabel: string | undefined, tags: ServiceTemplateUiTag[]): ServiceTemplateUiTag[] {
  if (highlightLabel === "Most popular") return tags.filter((t) => t !== "most-popular");
  if (highlightLabel === "Best for beginners") return tags.filter((t) => t !== "best-for-beginners");
  return tags;
}

function TemplateCard({
  template,
  onPreview,
  highlightLabel,
}: {
  template: ServiceTemplate;
  onPreview: (t: ServiceTemplate) => void;
  highlightLabel?: string;
}) {
  const tagPills = tagsWithoutHighlightDup(highlightLabel, templateUiTags(template.id));
  const useHref = `/dashboard/services?prefill=${encodeURIComponent(template.id)}#service-form`;

  return (
    <li className="flex flex-col rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-5 shadow-[0_10px_36px_-22px_rgba(28,27,25,0.2)] transition-shadow duration-200 hover:shadow-[0_16px_40px_-20px_rgba(28,27,25,0.22)] sm:p-6">
      <div className="min-w-0 flex-1">
        {highlightLabel ? (
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--accent)]">{highlightLabel}</p>
        ) : null}
        <div className={highlightLabel ? "mt-1 flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2"}>
          <h3 className="text-lg font-semibold leading-snug text-[var(--foreground)] sm:text-xl">{templateCardTitle(template)}</h3>
        </div>
        {tagPills.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tagPills.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-sm font-semibold tabular-nums text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
          {formatTemplateDurationPrice(template.service)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">{template.descriptionShort}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Link
          href={useHref}
          className="ui-btn-primary inline-flex min-h-12 flex-1 items-center justify-center px-5 text-sm font-semibold"
        >
          Use template
        </Link>
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="ui-btn-secondary inline-flex min-h-12 flex-1 items-center justify-center px-5 text-sm font-semibold"
        >
          Preview
        </button>
      </div>
    </li>
  );
}

function PreviewDialog({
  template,
  dialogRef,
  onClose,
}: {
  template: ServiceTemplate | null;
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,26rem)] max-h-[min(90vh,32rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] backdrop:bg-black/40"
      onClose={onClose}
    >
      {template ? (
        <div className="p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-tight">{templateCardTitle(template)}</h2>
          <p className="mt-2 text-sm font-semibold tabular-nums text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
            {formatTemplateDurationPrice(template.service)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">{template.description}</p>
          {template.stepTitles.length ? (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
                How it flows
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
                {template.stepTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {template.outcomes.length ? (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
                Clients can expect
              </div>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
                {template.outcomes.map((o) => (
                  <li key={o.id} className="flex gap-2">
                    <span className="text-[var(--accent)]" aria-hidden>
                      ✓
                    </span>
                    <span>{o.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="ui-btn-secondary min-h-11 px-5 text-sm font-semibold" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
            <Link
              href={`/dashboard/services?prefill=${encodeURIComponent(template.id)}#service-form`}
              className="ui-btn-primary inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold"
              onClick={() => dialogRef.current?.close()}
            >
              Use this template
            </Link>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

export function ServiceTemplatesHub({ templates }: { templates: ServiceTemplate[] }) {
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategoryFilter>("personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const baseFiltered = useMemo(
    () =>
      templates.filter(
        (t) => templateMatchesCategoryFilter(t, categoryFilter) && templateMatchesSearch(t, searchQuery)
      ),
    [templates, categoryFilter, searchQuery]
  );

  const showFeaturedStrip = categoryFilter === "all" && !searchQuery.trim();

  const { smart, rest } = useMemo(() => {
    if (!showFeaturedStrip) {
      return { smart: [] as ServiceTemplate[], rest: baseFiltered };
    }
    return partitionSmartAndRest(baseFiltered);
  }, [showFeaturedStrip, baseFiltered]);

  const orderedTemplates = useMemo(() => {
    if (showFeaturedStrip && smart.length > 0) {
      const smartIds = new Set(smart.map((t) => t.id));
      return [...smart, ...rest.filter((t) => !smartIds.has(t.id))];
    }
    return rest;
  }, [showFeaturedStrip, smart, rest]);

  useEffect(() => {
    setShowAllTemplates(false);
  }, [categoryFilter, searchQuery]);

  const hiddenCount = Math.max(0, orderedTemplates.length - TEMPLATE_PREVIEW_COUNT);
  const visibleTemplates =
    showAllTemplates || orderedTemplates.length <= TEMPLATE_PREVIEW_COUNT
      ? orderedTemplates
      : orderedTemplates.slice(0, TEMPLATE_PREVIEW_COUNT);

  const [preview, setPreview] = useState<ServiceTemplate | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openPreview = (t: ServiceTemplate) => {
    setPreview(t);
  };

  useEffect(() => {
    if (!preview) return;
    const el = dialogRef.current;
    if (!el) return;
    const show = () => {
      if (!el.open) el.showModal();
    };
    requestAnimationFrame(show);
  }, [preview]);

  const handleDialogClose = () => setPreview(null);

  const smartLabels: Record<string, string> = {
    "consultation-30": "Most popular",
    simple: "Best for beginners",
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-4 rounded-xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">Start fresh</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Skip templates and define your service yourself—you can still add multiple times and prices in one go.
          </p>
        </div>
        <Link
          href="/dashboard/services?scratch=1#service-form"
          className="ui-btn-primary inline-flex min-h-12 w-full shrink-0 items-center justify-center px-6 text-sm font-semibold sm:w-auto sm:min-w-[11rem]"
        >
          Create from scratch
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">Templates</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
            Ready-made names, timing, and pricing you can edit after you pick one.
          </p>
        </div>

        <label className="ui-field block">
          <span className="mb-1 block text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Search templates</span>
          <input
            type="search"
            role="searchbox"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, topic, or category"
            className="ui-input w-full max-w-xl"
            aria-label="Search templates"
          />
        </label>

        <div
          role="tablist"
          aria-label="Filter by service category"
          className="flex flex-wrap gap-2"
        >
          {FILTER_TABS.map((tab) => {
            const selected = categoryFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setCategoryFilter(tab.value)}
                className={[
                  "rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[var(--foreground)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_22%,transparent)]"
                    : "border-[color-mix(in_oklab,var(--foreground)_12%,var(--border))] bg-[var(--card)] text-[color-mix(in_oklab,var(--foreground)_88%,transparent)] hover:border-[color-mix(in_oklab,var(--foreground)_22%,var(--border))]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="templates-grid-heading">
        <h3 id="templates-grid-heading" className="sr-only">
          Template list
        </h3>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {visibleTemplates.length ? (
            visibleTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onPreview={openPreview}
                highlightLabel={showFeaturedStrip ? smartLabels[t.id] : undefined}
              />
            ))
          ) : (
            <li className="col-span-full rounded-xl border border-dashed border-[color-mix(in_oklab,var(--foreground)_18%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] px-4 py-6 text-center text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
              No templates match your search or filter. Try clearing the search or choose “All”.
            </li>
          )}
        </ul>

        {hiddenCount > 0 && !showAllTemplates ? (
          <div className="mt-6 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => setShowAllTemplates(true)}
              className="ui-btn-secondary min-h-11 px-6 text-sm font-semibold"
            >
              See all ({orderedTemplates.length} templates)
            </button>
          </div>
        ) : null}
      </section>

      <PreviewDialog template={preview} dialogRef={dialogRef} onClose={handleDialogClose} />
    </div>
  );
}
