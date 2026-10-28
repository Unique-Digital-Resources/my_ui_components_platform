"use client";

import * as React from "react";
import {
  Palette,
  SlidersHorizontal,
  LayoutPanelLeft,
  Table2,
  KanbanSquare,
  Navigation,
  Boxes,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import {
  components,
  plannedComponents,
  getCategory,
  componentsByCategory,
  type ComponentStatus,
} from "@/lib/platform/content";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  color: Palette,
  inputs: SlidersHorizontal,
  layout: LayoutPanelLeft,
  "data-display": Table2,
  productivity: KanbanSquare,
  navigation: Navigation,
};

/**
 * Static color-wheel SVG thumbnail used in this view's previews.
 * Mirrors the styling used in the components directory + examples for
 * consistency across the platform.
 */
function MiniColorWheel({ className }: { className?: string }) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
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
        fill="url(#cw-tri-cat)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1"
      />
      <defs>
        <linearGradient id="cw-tri-cat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#4287f5" />
          <stop offset="100%" stopColor="#0a1450" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="6" fill="#ffffff" stroke="#0a0a0f" strokeWidth="2" />
    </svg>
  );
}

function StatusDot({ status }: { status: ComponentStatus }) {
  if (status === "planned") {
    return <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />;
}

function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider">
      <StatusDot status={status} />
      <span
        className={
          status === "planned" ? "text-muted-foreground" : "text-foreground/80"
        }
      >
        {status === "planned" ? "Planned" : "Available"}
      </span>
    </span>
  );
}

/**
 * A guidance card explaining when to choose which component in this
 * category. The color category gets a detailed wheel/triangle/square/disk
 * breakdown; other categories get a generic placeholder card.
 */
function GuidanceCard({ categorySlug }: { categorySlug: string }) {
  if (categorySlug === "color") {
    return (
      <section className="panel mt-12 p-6 lg:p-8" aria-label="Choosing a color selector">
        <span className="eyebrow mb-3 block">Guidance</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Choosing a color selector
        </h2>
        <p className="mt-2 max-w-[680px] text-sm leading-relaxed text-muted-foreground">
          The right picker depends on the precision, screen space, and mental
          model your users expect. The Color Wheel Picker supports four inner
          shapes; each is suited to a different workflow.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GuidanceRow
            label="Wheel + Triangle"
            when="Best for HSV-native creative tools where hue and saturation/value are adjusted together. The triangle keeps all three coordinates in one compact surface."
          />
          <GuidanceRow
            label="Wheel + Square"
            when="Best when saturation and value are read independently along orthogonal axes — closer to a Photoshop-style SV square. Easier to predict for numeric color work."
          />
          <GuidanceRow
            label="Wheel + Disk"
            when="Best when you want a smooth, seam-free polar selection surface. Disk maps radius to saturation and angle to value, which feels natural for radial layouts."
          />
          <GuidanceRow
            label="Wheel only (none)"
            when="Best when only hue matters — accents, tints, or category colors. The inner area becomes a pure color readout instead of an interactive surface."
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel mt-12 p-6 lg:p-8"
      aria-label={`Choosing a ${categorySlug} component`}
    >
      <span className="eyebrow mb-3 block">Guidance</span>
      <h2 className="text-2xl font-semibold tracking-tight">
        Choosing a {categorySlug.replace("-", " ")} component
      </h2>
      <p className="mt-2 max-w-[680px] text-sm leading-relaxed text-muted-foreground">
        This category is on the roadmap. Detailed selection guidance will be
        published alongside the first stable component. In the meantime, the
        Color category documents the conventions used across the library.
      </p>
    </section>
  );
}

function GuidanceRow({ label, when }: { label: string; when: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-4">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />
        <h3 className="font-mono text-[12px] font-semibold uppercase tracking-wider text-foreground">
          {label}
        </h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{when}</p>
    </div>
  );
}

export default function CategoryView() {
  const params = useParams();
  const categorySlug = typeof params?.category === "string" ? params.category : Array.isArray(params?.category) ? params.category[0] : "";

  const category = getCategory(categorySlug);
  if (!category) {
    return (
      <PageContainer>
        <Breadcrumbs className="mb-6" />
        <p className="text-sm text-muted-foreground">
          Unknown category &ldquo;{categorySlug}&rdquo;.
        </p>
      </PageContainer>
    );
  }

  const Icon = CATEGORY_ICONS[category.slug] ?? Boxes;
  const available = componentsByCategory(category.slug);
  const planned = plannedComponents.filter((p) => p.category === category.slug);

  return (
    <PageContainer width="wide">
      <Breadcrumbs className="mb-6" />
      <PageOverline>Category</PageOverline>

      {/* Header row with category icon */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
          <Icon className="h-6 w-6 text-brand-lemon" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-muted-foreground lg:text-base">
            {category.description}
          </p>
        </div>
      </div>

      {/* Capabilities */}
      {category.capabilities.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Capabilities</span>
          {category.capabilities.map((cap) => (
            <span
              key={cap}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-foreground/80"
            >
              <span className="h-1 w-1 rounded-full bg-brand-lemon" />
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Use cases */}
      {category.useCases.length > 0 && (
        <section className="mt-10" aria-label="Use cases">
          <h2 className="eyebrow mb-4">Use cases</h2>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {category.useCases.map((u) => (
              <li
                key={u}
                className="flex items-start gap-2.5 text-sm text-foreground/80"
              >
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lemon" />
                <span className="leading-relaxed">{u}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Components section */}
      <div className="mt-12 flex items-baseline justify-between border-b border-border pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Components</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground/80">{available.length}</span>{" "}
          available
          {planned.length > 0 && (
            <span className="text-muted-foreground/70">
              {" "}
              · {planned.length} planned
            </span>
          )}
        </p>
      </div>

      {/* Available components — large horizontal cards */}
      {available.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {available.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/components/${category.slug}/${c.slug}`}
                className={cn(
                  "panel group flex w-full flex-col gap-5 p-5 text-left transition-all lg:flex-row lg:items-center lg:gap-6 lg:p-6",
                  "hover:border-brand-lemon/40 hover:shadow-[0_0_0_1px_var(--brand-lemon)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                {/* Preview thumbnail */}
                <div className="panel flex h-[120px] w-full shrink-0 items-center justify-center overflow-hidden bg-grid lg:h-[120px] lg:w-[140px]">
                  {c.slug === "color-wheel" ? (
                    <MiniColorWheel className="h-[88px] w-[88px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
                  ) : (
                    <Icon className="h-9 w-9 text-muted-foreground/60" />
                  )}
                </div>

                {/* Middle: name + description + tags */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-1.5 max-w-[560px] text-sm leading-relaxed text-muted-foreground">
                    {c.description}
                  </p>
                  {c.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded border border-border bg-card/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: status + explore */}
                <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                  <StatusBadge status={c.status} />
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    Explore component
                    <ArrowRight className="h-4 w-4 text-brand-lemon transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No stable components in this category yet.
          </p>
        </div>
      )}

      {/* Planned components */}
      {planned.length > 0 && (
        <section className="mt-10" aria-label="Planned components">
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">
              Planned
            </h2>
            <p className="text-sm text-muted-foreground/70">
              <span className="font-mono">{planned.length}</span> on the roadmap
            </p>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planned.map((p) => (
              <li
                key={p.slug}
                className="panel flex flex-col gap-3 p-5 opacity-60"
                title="Planned — not yet available"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{p.name}</h3>
                  <StatusBadge status="planned" />
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <div className="mt-auto pt-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
                    {p.category}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Guidance card */}
      <GuidanceCard categorySlug={category.slug} />

      {/* Spacer to keep spacing consistent before the footer */}
      <div className="h-4" />
    </PageContainer>
  );
}
