"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigation } from "@/store/navigation";
import { components, categories, docSections, examples } from "@/lib/platform/content";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  label: string;
  description: string;
  group: "Components" | "Categories" | "Documentation" | "Examples";
  href: string;
}

const ALL_RESULTS: SearchResult[] = [
  ...components.map((c) => ({
    id: `comp-${c.slug}`,
    label: c.name,
    description: c.description,
    group: "Components" as const,
    href: `/components/${c.category}/${c.slug}`,
  })),
  ...categories.map((c) => ({
    id: `cat-${c.slug}`,
    label: c.name,
    description: c.description,
    group: "Categories" as const,
    href: `/components/${c.slug}`,
  })),
  ...docSections.map((d) => ({
    id: `doc-${d.slug}`,
    label: d.title,
    description: d.description,
    group: "Documentation" as const,
    href: d.href,
  })),
  ...examples.map((e) => ({
    id: `ex-${e.slug}`,
    label: e.title,
    description: e.description,
    group: "Examples" as const,
    href: `/examples/${e.slug}`,
  })),
  {
    id: "nav-components",
    label: "All components",
    description: "Browse the full component directory",
    group: "Categories",
    href: "/components",
  },
  {
    id: "nav-docs",
    label: "Documentation",
    description: "Read installation, concepts, and theming guides",
    group: "Documentation",
    href: "/docs",
  },
];

export function SearchPalette() {
  const { searchOpen, setSearchOpen } = useNavigation();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Reset on open
  React.useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setActiveIndex(0);
      // Focus after the dialog mounts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [searchOpen]);

  // ⌘K / Ctrl+K to open
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen, searchOpen]);

  const results = React.useMemo(() => {
    if (!query.trim()) return ALL_RESULTS;
    const q = query.toLowerCase();
    return ALL_RESULTS.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q)
    );
  }, [query]);

  // Group results
  const grouped = React.useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  const flatResults = grouped.flatMap(([, items]) => items);

  // Keep activeIndex in range
  React.useEffect(() => {
    if (activeIndex >= flatResults.length) setActiveIndex(0);
  }, [flatResults.length, activeIndex]);

  const openResult = React.useCallback(
    (r: SearchResult | undefined) => {
      if (!r) return;
      router.push(r.href);
      setSearchOpen(false);
    },
    [router, setSearchOpen]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      openResult(flatResults[activeIndex]);
    }
  };

  // Scroll active item into view
  React.useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-idx="${activeIndex}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!searchOpen) return null;

  let runningIdx = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
        onClick={() => setSearchOpen(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search components, APIs, docs..."
            className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {flatResults.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try searching for a component name, category, or doc title.
              </p>
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1.5">
                  <span className="eyebrow">{group}</span>
                </div>
                {items.map((r) => {
                  runningIdx++;
                  const idx = runningIdx;
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      data-idx={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => openResult(r)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-brand-purple-strong text-foreground"
                          : "text-foreground/80 hover:bg-accent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">
                          {r.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.description}
                        </div>
                      </div>
                      {active && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-brand-lemon" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-border bg-background px-1 font-mono">
              <ArrowUp className="h-2.5 w-2.5" />
              <ArrowDown className="h-2.5 w-2.5" />
            </kbd>
            Navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono">
              ↵
            </kbd>
            Open
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono">
              Esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
