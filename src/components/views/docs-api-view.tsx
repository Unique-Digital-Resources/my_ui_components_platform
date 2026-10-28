"use client";

import * as React from "react";
import { Search, ArrowRight, X, Package } from "lucide-react";
import { components } from "@/lib/platform/content";
import type {
  ComponentMeta,
  ComponentMethod,
  ComponentEvent,
  ComponentProperty,
} from "@/lib/platform/content";
import Link from "next/link";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

type EntryKind = "method" | "event" | "property";

interface ApiEntry {
  kind: EntryKind;
  // For methods: the signature; for events/properties: the name.
  name: string;
  description: string;
  payload?: string;
  returns?: string;
  type: string;
  default?: string;
}

function buildEntries(meta: ComponentMeta): ApiEntry[] {
  const methods: ApiEntry[] = meta.methods.map((m: ComponentMethod) => ({
    kind: "method",
    name: m.signature,
    description: m.description,
    returns: m.returns,
    type: "method",
  }));
  const events: ApiEntry[] = meta.events.map((e: ComponentEvent) => ({
    kind: "event",
    name: e.name,
    description: e.description,
    payload: e.payload,
    type: "event",
  }));
  const properties: ApiEntry[] = meta.properties.map((p: ComponentProperty) => ({
    kind: "property",
    name: p.name,
    description: p.description,
    type: p.type,
    default: p.default,
  }));
  return [...methods, ...events, ...properties];
}

const TYPE_BADGE: Record<EntryKind, { label: string; className: string }> = {
  method: {
    label: "Method",
    className: "border-brand-lemon/40 bg-brand-lemon/10 text-brand-lemon",
  },
  event: {
    label: "Event",
    className:
      "border-brand-purple-soft/40 bg-brand-purple-soft/10 text-brand-purple-soft",
  },
  property: {
    label: "Property",
    className: "border-border bg-muted/40 text-muted-foreground",
  },
};

function TypeBadge({ kind }: { kind: EntryKind }) {
  const badge = TYPE_BADGE[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        badge.className
      )}
    >
      {badge.label}
    </span>
  );
}

function matchesQuery(entry: ApiEntry, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.toLowerCase();
  const haystack = [entry.name, entry.description, entry.type, entry.payload ?? "", entry.returns ?? "", entry.default ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export default function DocsApiView() {
  const [query, setQuery] = React.useState("");

  const clearQuery = React.useCallback(() => setQuery(""), []);

  return (
    <PageContainer>
      <Breadcrumbs />
      <PageOverline>Documentation</PageOverline>
      <h1 className="text-3xl font-semibold tracking-tight">API reference</h1>
      <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
        Browse the public interfaces exposed by the library. Each component
        lists its methods, events, and properties with signatures, return
        types, and payload shapes.
      </p>

      {/* Search */}
      <div className="mt-6 max-w-[560px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search methods, properties, events..."
            aria-label="Search the API reference"
            className={cn(
              "h-10 w-full rounded-md border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Filters entries by name, description, type, or payload. Local only — no network requests.
        </p>
      </div>

      {/* Component sections */}
      <div className="mt-10 space-y-12">
        {components.map((meta) => {
          const entries = buildEntries(meta).filter((e) => matchesQuery(e, query));
          const methods = entries.filter((e) => e.kind === "method");
          const events = entries.filter((e) => e.kind === "event");
          const properties = entries.filter((e) => e.kind === "property");
          const componentHref = `/components/${meta.category}/${meta.slug}`;

          return (
            <section key={meta.slug} id={meta.slug}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{meta.name}</h2>
                  <p className="mt-1 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <Link
                  href={componentHref}
                  className="group inline-flex h-9 items-center gap-1.5 self-start rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:text-brand-lemon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Package className="h-4 w-4" />
                  Open component
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {entries.length === 0 ? (
                <div className="panel mt-5 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No entries match <span className="font-mono text-foreground">&ldquo;{query}&rdquo;</span> for this component.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-8">
                  <EntryGroup
                    label="Methods"
                    entries={methods}
                    href={componentHref}
                  />
                  <EntryGroup
                    label="Events"
                    entries={events}
                    href={componentHref}
                  />
                  <EntryGroup
                    label="Properties"
                    entries={properties}
                    href={componentHref}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </PageContainer>
  );
}

function EntryGroup({
  label,
  entries,
  href,
}: {
  label: string;
  entries: ApiEntry[];
  href: string;
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <span className="eyebrow mb-3 block">{label}</span>
      <div className="space-y-3">
        {entries.map((entry) => (
          <EntryCard key={entry.name} entry={entry} href={href} />
        ))}
      </div>
    </div>
  );
}

function EntryCard({ entry, href }: { entry: ApiEntry; href: string }) {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge kind={entry.kind} />
            <code className="font-mono text-[13px] text-brand-lemon break-all">
              {entry.name}
            </code>
          </div>
          <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
            {entry.kind === "method" && entry.returns && (
              <div>
                <span className="font-mono uppercase tracking-wider text-muted-foreground/70">Returns</span>
                <span className="ml-2 font-mono text-foreground">{entry.returns}</span>
              </div>
            )}
            {entry.kind === "event" && entry.payload && (
              <div>
                <span className="font-mono uppercase tracking-wider text-muted-foreground/70">Payload</span>
                <span className="ml-2 font-mono text-foreground">{entry.payload}</span>
              </div>
            )}
            {entry.kind === "property" && (
              <>
                <div>
                  <span className="font-mono uppercase tracking-wider text-muted-foreground/70">Type</span>
                  <span className="ml-2 font-mono text-foreground">{entry.type}</span>
                </div>
                {entry.default && (
                  <div>
                    <span className="font-mono uppercase tracking-wider text-muted-foreground/70">Default</span>
                    <span className="ml-2 font-mono text-foreground">{entry.default}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <Link
          href={href}
          className="group inline-flex h-8 shrink-0 items-center gap-1 self-start rounded-md border border-border px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-brand-lemon/40 hover:text-brand-lemon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open component
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
