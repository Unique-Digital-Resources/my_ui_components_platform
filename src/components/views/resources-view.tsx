"use client";

import * as React from "react";
import {
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  Keyboard,
  Lightbulb,
  Plug,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { routeToHref, type Route } from "@/store/navigation-types";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

type ResourceType = "Recipes" | "Accessibility" | "Guides" | "Integration";

type Filter = "All" | ResourceType;

const FILTERS: Filter[] = ["All", "Recipes", "Accessibility", "Guides", "Integration"];

interface ResourceEntry {
  title: string;
  description: string;
  type: ResourceType;
  /** Either internal navigation target or external URL */
  destination:
    | { kind: "internal"; route: Route; label: string }
    | { kind: "external"; url: string; label: string };
}

const RESOURCES: ResourceEntry[] = [
  {
    title: "Color model primer",
    description:
      "Understand the differences between HSV, HSL, and RGB color models and when each is useful for color selection interfaces.",
    type: "Guides",
    destination: {
      kind: "internal",
      route: { name: "docs-concepts" },
      label: "Core concepts",
    },
  },
  {
    title: "Keyboard accessibility for canvas components",
    description:
      "How keyboard navigation, focus management, and ARIA semantics apply to canvas-rendered UI components like the Color Wheel Picker.",
    type: "Accessibility",
    destination: {
      kind: "internal",
      route: { name: "docs-api" },
      label: "API reference",
    },
  },
  {
    title: "Embedding vanilla components in React",
    description:
      "Wrap framework-agnostic vanilla components in idiomatic React, manage lifecycle, and forward events safely.",
    type: "Integration",
    destination: {
      kind: "internal",
      route: { name: "docs-installation" },
      label: "Installation guide",
    },
  },
  {
    title: "Embedding vanilla components in Vue",
    description:
      "Mount vanilla components inside Vue, bridge reactive props to the imperative API, and clean up on unmount.",
    type: "Integration",
    destination: {
      kind: "internal",
      route: { name: "docs-installation" },
      label: "Installation guide",
    },
  },
  {
    title: "Building a property inspector",
    description:
      "A recipe for composing color, range, and selection controls into a property inspector panel similar to creative software.",
    type: "Recipes",
    destination: {
      kind: "internal",
      route: { name: "examples" },
      label: "See examples",
    },
  },
  {
    title: "Design tokens and CSS architecture",
    description:
      "How the library uses CSS custom properties for theming, and how to extend or override tokens in your own application.",
    type: "Guides",
    destination: {
      kind: "internal",
      route: { name: "docs-theming" },
      label: "Theming guide",
    },
  },
];

const TYPE_ICON: Record<ResourceType, LucideIcon> = {
  Recipes: Lightbulb,
  Accessibility: Keyboard,
  Guides: BookOpen,
  Integration: Plug,
};

function ResourceCard({ entry }: { entry: ResourceEntry }) {
  const Icon = TYPE_ICON[entry.type];
  const destination = entry.destination;

  if (destination.kind === "internal") {
    const href = routeToHref(destination.route);
    return (
      <Link
        href={href}
        className={cn(
          "group panel flex h-full flex-col gap-3 p-5 text-left transition-all",
          "hover:border-brand-lemon/40 hover:bg-accent/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <CardHeader Icon={Icon} type={entry.type} />
        <h3 className="text-[15px] font-medium text-foreground">{entry.title}</h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {entry.description}
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[12px] font-medium text-foreground transition-colors group-hover:text-brand-lemon">
          {destination.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </Link>
    );
  }

  return (
    <a
      href={destination.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group panel flex h-full flex-col gap-3 p-5 transition-all",
        "hover:border-brand-lemon/40 hover:bg-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <CardHeader Icon={Icon} type={entry.type} />
      <h3 className="text-[15px] font-medium text-foreground">{entry.title}</h3>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      <div className="mt-auto flex items-center gap-1.5 pt-1 text-[12px] font-medium text-foreground transition-colors group-hover:text-brand-lemon">
        {destination.label}
        <ExternalLink className="h-3.5 w-3.5" />
      </div>
    </a>
  );
}

function CardHeader({ Icon, type }: { Icon: LucideIcon; type: ResourceType }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/30">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-brand-lemon" />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {type}
      </span>
    </div>
  );
}

export function ResourcesView() {
  const [filter, setFilter] = React.useState<Filter>("All");

  const filtered = React.useMemo(() => {
    if (filter === "All") return RESOURCES;
    return RESOURCES.filter((r) => r.type === filter);
  }, [filter]);

  return (
    <PageContainer>
      <Breadcrumbs />
      <div className="mt-6">
        <PageOverline>Resources</PageOverline>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Resources
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Supplementary materials to help you use the components effectively.
        </p>
      </div>

      {/* Filter pills */}
      <div
        className="mt-8 flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Filter resources by type"
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
            <ScrollText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[14px] font-medium text-foreground">
            No resources match this filter
          </p>
          <button
            type="button"
            onClick={() => setFilter("All")}
            className="mt-2 inline-flex h-8 items-center rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[12px] font-medium text-brand-lemon hover:bg-brand-lemon/20"
          >
            Show all resources
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <ResourceCard key={entry.title} entry={entry} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default ResourcesView;
