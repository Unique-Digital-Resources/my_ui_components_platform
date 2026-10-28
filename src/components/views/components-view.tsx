"use client";

import * as React from "react";
import {
  Search,
  X,
  Palette,
  SlidersHorizontal,
  LayoutPanelLeft,
  Table2,
  KanbanSquare,
  Navigation,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { useNavigation } from "@/store/navigation";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import {
  components,
  plannedComponents,
  categories,
  type ComponentStatus,
} from "@/lib/platform/content";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  color: Palette,
  inputs: SlidersHorizontal,
  layout: LayoutPanelLeft,
  "data-display": Table2,
  productivity: KanbanSquare,
  navigation: Navigation,
};

interface DirectoryEntry {
  slug: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  status: ComponentStatus;
  planned: boolean;
}

// Build a unified list of all directory entries — real components plus the
// planned placeholders, so the grid can filter/sort them uniformly.
const ALL_ENTRIES: DirectoryEntry[] = [
  ...components.map((c) => ({
    slug: c.slug,
    name: c.name,
    category: c.category,
    description: c.description,
    tags: c.tags,
    status: c.status,
    planned: false,
  })),
  ...plannedComponents.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    tags: [] as string[],
    status: "planned" as ComponentStatus,
    planned: true,
  })),
];

const STATUS_FILTERS: { value: ComponentStatus; label: string }[] = [
  { value: "stable", label: "Stable" },
  { value: "beta", label: "Beta" },
  { value: "experimental", label: "Experimental" },
];

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...categories.map((c) => ({ value: c.slug, label: c.name })),
];

/**
 * A small static color-wheel SVG used in card previews.
 * Matches the preview used in examples-view.tsx for visual consistency.
 */
function MiniColorWheel({ className }: { className?: string }) {
  const r2 = (n: number) => Math.round(n * 100) / 100; // round to 2 decimals for SSR/CSR consistency
  const segments = Array.from({ length: 36 }, (_, i) => {
    const startAngle = (i * 10 * Math.PI) / 180;
    const endAngle = ((i + 1) * 10 * Math.PI) / 180;
    const r = 48;
    const cx = 60;
    const cy = 60;
    const x1 = r2(cx + r * Math.cos(startAngle - Math.PI / 2));
    const y1 = r2(cy + r * Math.sin(startAngle - Math.PI / 2));
    const x2 = r2(cx + r * Math.cos(endAngle - Math.PI / 2));
    const y2 = r2(cy + r * Math.sin(endAngle - Math.PI / 2));
    const hue = i * 10;
    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
        fill={`hsl(${hue}, 100%, 50%)`}
      />
    );
  });

  // Inner triangle (default shape) inscribed in r=26 — top vertex at (60, 34),
  // bottom-right (82.5, 73), bottom-left (37.5, 73).
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Color wheel preview"
    >
      {segments}
      <circle cx="60" cy="60" r="33" fill="var(--brand-purple-strong)" />
      <path
        d="M 60 34 L 82.5 73 L 37.5 73 Z"
        fill="url(#cw-tri)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1"
      />
      <defs>
        <linearGradient id="cw-tri" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#4287f5" />
          <stop offset="100%" stopColor="#0a1450" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="6" fill="#ffffff" stroke="#0a0a0f" strokeWidth="2" />
    </svg>
  );
}

function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Boxes;
  return <Icon className={className} />;
}

function StatusDot({ status }: { status: ComponentStatus }) {
  if (status === "planned") {
    return <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />;
}

function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider">
      <StatusDot status={status} />
      <span
        className={
          status === "planned"
            ? "text-muted-foreground"
            : "text-foreground/80"
        }
      >
        {status === "planned" ? "Planned" : "Available"}
      </span>
    </span>
  );
}

export default function ComponentsView() {
  const query = useNavigation((s) => s.componentsQuery);
  const setQuery = useNavigation((s) => s.setComponentsQuery);
  const category = useNavigation((s) => s.componentsCategory);
  const setCategory = useNavigation((s) => s.setComponentsCategory);

  // Status filter is local UI state — the navigation store only tracks
  // search query and category, so we keep this transient filter local.
  const [statusFilters, setStatusFilters] = React.useState<Set<ComponentStatus>>(
    () => new Set()
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ENTRIES.filter((e) => {
      // Category filter
      if (category !== "all" && e.category !== category) return false;
      // Status filter — only active filters apply; planned entries pass through
      // when no status filter is set (so the directory always shows the roadmap).
      if (statusFilters.size > 0 && !statusFilters.has(e.status)) return false;
      // Search query — match name / description / tags / category
      if (q) {
        const hay = [e.name, e.description, e.category, ...e.tags]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, category, statusFilters]);

  const toggleStatus = (s: ComponentStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearSearch = () => {
    setQuery("");
    setCategory("all");
    setStatusFilters(new Set());
  };

  const availableCount = filtered.filter((e) => !e.planned).length;
  const plannedCount = filtered.length - availableCount;
  const hasActiveFilters =
    query.trim() !== "" || category !== "all" || statusFilters.size > 0;

  return (
    <PageContainer width="wide">
      <Breadcrumbs className="mb-6" />
      <PageOverline>Components</PageOverline>
      <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
        Components
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
        Browse functional UI building blocks for applications and software.
      </p>

      {/* Search + status filter row */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components..."
            aria-label="Search components"
            className={cn(
              "h-10 w-full rounded-md border border-border bg-card/60 pl-9 pr-9 text-sm text-foreground transition-colors",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:border-brand-lemon/50 focus-visible:ring-2 focus-visible:ring-ring"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Status</span>
          {STATUS_FILTERS.map((s) => {
            const active = statusFilters.has(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleStatus(s.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-brand-lemon/50 bg-brand-lemon/10 text-foreground"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CATEGORY_FILTERS.map((c) => {
          const active = category === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-transparent bg-brand-purple-strong text-foreground"
                  : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />
              )}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      <div className="mt-8 flex items-center justify-between border-b border-border pb-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground/80">{availableCount}</span>{" "}
          available
          {plannedCount > 0 && (
            <span className="text-muted-foreground/70">
              {" "}
              · {plannedCount} planned
            </span>
          )}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearSearch}
            className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/30 px-6 py-16 text-center">
          <p className="text-base text-foreground/80">
            {query.trim()
              ? `No components match “${query.trim()}”`
              : "No components match your filters"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search term or clear your filters.
          </p>
          <button
            type="button"
            onClick={clearSearch}
            className="mt-5 inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <ComponentCard
              key={`${entry.category}-${entry.slug}`}
              entry={entry}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function ComponentCard({
  entry,
}: {
  entry: DirectoryEntry;
}) {
  const isColorWheel = entry.slug === "color-wheel";
  const isPlanned = entry.planned;
  const href = `/components/${entry.category}/${entry.slug}`;

  const preview = (
    <div className="relative flex h-[120px] items-center justify-center overflow-hidden border-b border-border bg-grid">
      {isColorWheel ? (
        <MiniColorWheel className="h-[88px] w-[88px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
      ) : isPlanned ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
          <Boxes className="h-7 w-7" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
            Planned
          </span>
        </div>
      ) : (
        <CategoryIcon
          slug={entry.category}
          className="h-9 w-9 text-muted-foreground/60"
        />
      )}
    </div>
  );

  const body = (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <h3 className="font-medium text-foreground">{entry.name}</h3>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
          {entry.category}
        </span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <StatusBadge status={entry.status} />
      </div>
    </div>
  );

  if (isPlanned) {
    return (
      <div
        className="panel flex flex-col overflow-hidden opacity-60"
        aria-disabled="true"
        title="Planned — not yet available"
      >
        {preview}
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "panel group flex flex-col overflow-hidden text-left transition-all",
        "hover:border-brand-lemon/40 hover:shadow-[0_0_0_1px_var(--brand-lemon)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {preview}
      {body}
    </Link>
  );
}
