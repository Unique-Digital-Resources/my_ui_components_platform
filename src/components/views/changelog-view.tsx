"use client";

import * as React from "react";
import { AlertTriangle, GitCommit, type LucideIcon } from "lucide-react";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { changelog, type ChangelogEntry } from "@/lib/platform/content";
import { cn } from "@/lib/utils";

type ChangeType = "added" | "improved" | "fixed" | "breaking";

type Filter = "All" | "Added" | "Improved" | "Fixed" | "Breaking";

const FILTERS: Filter[] = ["All", "Added", "Improved", "Fixed", "Breaking"];

interface ChangeSection {
  type: ChangeType;
  label: string;
  items: string[];
}

const DOT_CLASS: Record<ChangeType, string> = {
  added: "bg-brand-lemon",
  improved: "bg-brand-purple-soft",
  fixed: "bg-sky-400",
  breaking: "bg-destructive",
};

const TYPE_ICON: Record<ChangeType, LucideIcon> = {
  added: GitCommit,
  improved: GitCommit,
  fixed: GitCommit,
  breaking: AlertTriangle,
};

function sectionsFor(entry: ChangelogEntry): ChangeSection[] {
  const sections: ChangeSection[] = [
    { type: "added", label: "Added", items: entry.added },
    { type: "improved", label: "Improved", items: entry.improved },
    { type: "fixed", label: "Fixed", items: entry.fixed },
    { type: "breaking", label: "Breaking", items: entry.breaking },
  ];
  return sections.filter((s) => s.items.length > 0);
}

/** Reverse chronological — newest first. */
function sortByDateDesc(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatDate(iso: string): string {
  // Render ISO date (YYYY-MM-DD) as "Month DD, YYYY" without depending on locale string quirks.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function entryMatchesFilter(entry: ChangelogEntry, filter: Filter): boolean {
  if (filter === "All") return true;
  const map: Record<Exclude<Filter, "All">, ChangeType> = {
    Added: "added",
    Improved: "improved",
    Fixed: "fixed",
    Breaking: "breaking",
  };
  const type = map[filter];
  return entry[type].length > 0;
}

function filteredSections(
  entry: ChangelogEntry,
  filter: Filter
): ChangeSection[] {
  const all = sectionsFor(entry);
  if (filter === "All") return all;
  const typeMap: Record<Exclude<Filter, "All">, ChangeType> = {
    Added: "added",
    Improved: "improved",
    Fixed: "fixed",
    Breaking: "breaking",
  };
  const target = typeMap[filter];
  return all.filter((s) => s.type === target);
}

function ChangeItem({ type, text }: { type: ChangeType; text: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <li className="relative flex gap-3 pl-1">
      <span
        className={cn(
          "mt-[7px] h-2 w-2 shrink-0 rounded-full",
          DOT_CLASS[type]
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0",
            type === "breaking" ? "text-destructive" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <p className="text-[14px] leading-relaxed text-foreground/90">{text}</p>
      </div>
    </li>
  );
}

function ChangeSectionBlock({ section }: { section: ChangeSection }) {
  const isBreaking = section.type === "breaking";
  return (
    <div className={cn("flex flex-col gap-2", isBreaking && "rounded-lg border border-destructive/30 bg-destructive/5 p-3")}>
      <div className="flex items-center gap-2">
        <h3
          className={cn(
            "text-[12px] font-mono font-semibold uppercase tracking-wider",
            isBreaking ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {section.label}
        </h3>
        <span className="rounded-full border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {section.items.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {section.items.map((text, i) => (
          <ChangeItem key={i} type={section.type} text={text} />
        ))}
      </ul>
    </div>
  );
}

function TimelineEntry({ entry, filter }: { entry: ChangelogEntry; filter: Filter }) {
  const sections = filteredSections(entry, filter);
  if (sections.length === 0) return null;

  return (
    <li className="relative pl-8">
      {/* Timeline dot */}
      <span
        className="absolute left-[7px] top-2 h-3 w-3 rounded-full border-2 border-background bg-brand-lemon"
        aria-hidden
      />
      <div className="panel p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[20px] font-semibold text-foreground">
            v{entry.version}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {formatDate(entry.date)}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {sections.map((section) => (
            <ChangeSectionBlock key={section.type} section={section} />
          ))}
        </div>
      </div>
    </li>
  );
}

export function ChangelogView() {
  const [filter, setFilter] = React.useState<Filter>("All");

  const sorted = React.useMemo(() => sortByDateDesc(changelog), []);
  const visible = sorted.filter((entry) => entryMatchesFilter(entry, filter));
  const totalChanges = sorted.reduce(
    (acc, e) => acc + e.added.length + e.improved.length + e.fixed.length + e.breaking.length,
    0
  );

  return (
    <PageContainer>
      <Breadcrumbs />
      <div className="mt-6">
        <PageOverline>Project</PageOverline>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Changelog
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          What changed between releases.
        </p>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground/80">
          {sorted.length} release{sorted.length === 1 ? "" : "s"} · {totalChanges} change{totalChanges === 1 ? "" : "s"} total
        </p>
      </div>

      {/* Filter pills */}
      <div
        className="mt-8 flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Filter changelog by change type"
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

      {/* Timeline */}
      {visible.length === 0 ? (
        <div className="mt-12 panel flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30">
            <GitCommit className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[14px] font-medium text-foreground">
            No changes match this filter
          </p>
          <button
            type="button"
            onClick={() => setFilter("All")}
            className="mt-2 inline-flex h-8 items-center rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[12px] font-medium text-brand-lemon hover:bg-brand-lemon/20"
          >
            Show all changes
          </button>
        </div>
      ) : (
        <ol className="mt-8 flex flex-col gap-6 border-l border-border">
          {visible.map((entry, i) => (
            <TimelineEntry key={`${entry.version}-${i}`} entry={entry} filter={filter} />
          ))}
        </ol>
      )}
    </PageContainer>
  );
}

export default ChangelogView;
