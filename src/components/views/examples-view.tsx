"use client";

import * as React from "react";
import { ArrowRight, Eye } from "lucide-react";
import Link from "next/link";
import { examples, type ExampleMeta } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

type Filter = "All examples" | "Creative tools" | "Developer tools" | "Productivity";

const FILTERS: Filter[] = [
  "All examples",
  "Creative tools",
  "Developer tools",
  "Productivity",
];

/**
 * A small static color-wheel SVG used in card previews.
 * Keeps the grid lightweight — we don't mount a real picker per card.
 */
function MiniColorWheel({ className }: { className?: string }) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const segments = Array.from({ length: 36 }, (_, i) => {
    const angle = (i * 10 * Math.PI) / 180;
    const startAngle = angle;
    const endAngle = ((i + 1) * 10 * Math.PI) / 180;
    const r = 48;
    const cx = 60;
    const cy = 60;
    const x1 = r2(cx + r * Math.cos(startAngle - Math.PI / 2));
    const y1 = r2(cy + r * Math.sin(startAngle - Math.PI / 2));
    const x2 = r2(cx + r * Math.cos(endAngle - Math.PI / 2));
    const y2 = r2(cy + r * Math.sin(endAngle - Math.PI / 2));
    const largeArc = 0;
    const hue = i * 10;
    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
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
      <circle cx="60" cy="60" r="32" fill="var(--brand-purple-strong)" />
      <circle cx="60" cy="60" r="32" fill="none" stroke="var(--brand-lemon)" strokeWidth="2" />
      <circle cx="60" cy="60" r="6" fill="var(--brand-lemon)" />
    </svg>
  );
}

/**
 * The preview area for an example card. All current examples use the
 * color-wheel; render a small wheel + a soft lemon glow on the grid
 * background.
 */
function ExamplePreview({ example }: { example: ExampleMeta }) {
  return (
    <div className="relative h-[160px] overflow-hidden border-b border-border bg-grid">
      <div className="absolute inset-0 flex items-center justify-center">
        <MiniColorWheel className="h-[110px] w-[110px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
      </div>
      {example.interactive && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-brand-lemon/30 bg-background/80 px-2 py-0.5 text-[10px] font-mono font-medium text-brand-lemon backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon animate-pulse" />
          Live
        </span>
      )}
    </div>
  );
}

function ExampleCard({ example }: { example: ExampleMeta }) {
  return (
    <Link
      href={`/examples/${example.slug}`}
      className={cn(
        "group panel flex flex-col text-left transition-all",
        "hover:border-brand-lemon/40 hover:bg-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <ExamplePreview example={example} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {example.category}
          </span>
        </div>
        <h3 className="text-[15px] font-medium text-foreground">
          {example.title}
        </h3>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {example.description}
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-2 text-[13px] font-medium text-foreground transition-colors group-hover:text-brand-lemon">
          <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-brand-lemon" />
          Explore example
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

export function ExamplesView() {
  const [filter, setFilter] = React.useState<Filter>("All examples");

  const filtered = React.useMemo(() => {
    if (filter === "All examples") return examples;
    return examples.filter((e) => e.category === filter);
  }, [filter]);

  return (
    <PageContainer>
      <Breadcrumbs />
      <div className="mt-6">
        <PageOverline>Examples</PageOverline>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Examples
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          See the components in the context of real software interfaces.
        </p>
      </div>

      {/* Filter pills */}
      <div
        className="mt-8 flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Filter examples by category"
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-brand-lemon/40 bg-brand-lemon/10 text-brand-lemon"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-12 panel flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30">
            <Eye className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[14px] font-medium text-foreground">No examples match this filter</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Try selecting a different category to see more examples.
          </p>
          <button
            type="button"
            onClick={() => setFilter("All examples")}
            className="mt-2 inline-flex h-8 items-center rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[12px] font-medium text-brand-lemon hover:bg-brand-lemon/20"
          >
            Show all examples
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <ExampleCard key={ex.slug} example={ex} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default ExamplesView;
