"use client";

import * as React from "react";
import {
  Navigation as NavIcon, RotateCcw, Plus, Trash2, ChevronRight,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  BreadcrumbReact,
  type BreadcrumbItem,
  type CrumbSeparator,
  type BreadcrumbEventPayload,
} from "./breadcrumb-react";
import type { Breadcrumb } from "@/lib/components/breadcrumb";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  separator: CrumbSeparator;
  maxItems: number;
  showIcons: boolean;
  markCurrent: boolean;
  density: "compact" | "comfortable" | "spacious";
  readOnly: boolean;
}

const DEFAULTS: State = {
  separator: "chevron",
  maxItems: 0,
  showIcons: true,
  markCurrent: true,
  density: "comfortable",
  readOnly: false,
};

const SEED_ITEMS: BreadcrumbItem[] = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "projects", label: "Projects", icon: "folder", href: "/projects" },
  { id: "web-app", label: "Web App", icon: "file", href: "/projects/web-app" },
  { id: "settings", label: "Settings", icon: "settings", href: "/projects/web-app/settings" },
  { id: "billing", label: "Billing", icon: "settings", href: "/projects/web-app/settings/billing" },
  { id: "current", label: "Current Invoice", icon: "file", href: "/projects/web-app/settings/billing/current" },
];

export function BreadcrumbPlayground() {
  const meta = getComponent("breadcrumb")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<BreadcrumbItem[]>(SEED_ITEMS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Breadcrumb | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onItemSelected = React.useCallback((p: BreadcrumbEventPayload) => {
    setSelectedId(p.itemId ?? null);
  }, []);

  const onItemActivated = React.useCallback((p: BreadcrumbEventPayload) => {
    setLastEvent(`activated ${p.itemId}`);
    toast.info("Item activated", {
      description: `${p.item?.label ?? p.itemId} — host should navigate.`,
    });
  }, []);

  const onOverflowToggled = React.useCallback((p: BreadcrumbEventPayload) => {
    setLastEvent(`overflow ${p.overflowOpen ? "opened" : "closed"}`);
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setSelectedId(null);
    setLastEvent("reset");
    setTimeout(() => {
      instanceRef.current?.setItems(SEED_ITEMS);
    }, 0);
    toast.info("Breadcrumb reset", { description: "Restored seed items." });
  }, []);

  const selectedItem = React.useMemo(() => items.find((it) => it.id === selectedId) ?? null, [items, selectedId]);

  const jsCode = React.useMemo(() => `import { Breadcrumb } from "@workshop/breadcrumb";

const trail = new Breadcrumb(container, {
  separator: "${state.separator}",
  maxItems: ${state.maxItems},
  showIcons: ${state.showIcons},
  markCurrent: ${state.markCurrent},
  density: "${state.density}",
  readOnly: ${state.readOnly},
  items: [
    { id: "home", label: "Home", icon: "home", href: "/" },
    { id: "projects", label: "Projects", icon: "folder", href: "/projects" },
    { id: "web-app", label: "Web App", icon: "file", href: "/projects/web-app" },
    { id: "settings", label: "Settings", icon: "settings", href: "/projects/web-app/settings" },
    { id: "current", label: "Current Invoice", icon: "file" },
  ],
});

trail.on("item_activated", ({ itemId, item }) => {
  console.log(\`Navigated to \${itemId}\`, item);
  // Host router navigates to item.href here
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Navigation</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Breadcrumb</h1>
              <CollapsibleDescription
                text={meta.longDescription}
                maxLength={220}
                className="mt-2 max-w-2xl text-[15px] text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {meta.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{t}</span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-lemon/30 bg-brand-lemon/10 px-2.5 py-1 text-[11px] font-mono text-brand-lemon">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />{meta.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Live canvas */}
          <section aria-label="Live preview" className="panel relative flex h-[600px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <NavIcon className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {items.length} items
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Live breadcrumb renders here — multiple instances showing different configurations */}
            <div className="flex-1 min-h-0 overflow-auto bg-grid p-6">
              <div className="flex flex-col gap-6">
                {/* Primary trail */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary trail</span>
                    <span className="font-mono text-[10px] text-muted-foreground">separator={state.separator} · maxItems={state.maxItems || "∞"}</span>
                  </div>
                  <div className="panel p-4">
                    <BreadcrumbReact
                      items={items}
                      separator={state.separator}
                      maxItems={state.maxItems}
                      showIcons={state.showIcons}
                      markCurrent={state.markCurrent}
                      density={state.density}
                      readOnly={state.readOnly}
                      onItemSelected={onItemSelected}
                      onItemActivated={onItemActivated}
                      onOverflowToggled={onOverflowToggled}
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Variant: slash separator */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Slash variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">separator=slash · compact</span>
                  </div>
                  <div className="panel p-4">
                    <BreadcrumbReact
                      items={items}
                      separator="slash"
                      maxItems={0}
                      showIcons={false}
                      markCurrent
                      density="compact"
                    />
                  </div>
                </div>

                {/* Variant: maxItems=4 (collapse) */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Collapsed variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">maxItems=4 · chevron</span>
                  </div>
                  <div className="panel p-4">
                    <BreadcrumbReact
                      items={items}
                      separator="chevron"
                      maxItems={4}
                      showIcons
                      markCurrent
                      density="comfortable"
                    />
                  </div>
                </div>

                {/* Variant: read-only */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Read-only variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">readOnly · spacious</span>
                  </div>
                  <div className="panel p-4">
                    <BreadcrumbReact
                      items={items}
                      separator="arrow"
                      maxItems={0}
                      showIcons
                      markCurrent
                      density="spacious"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  last: <span className="text-brand-lemon">{lastEvent}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Selected" value={selectedItem ? `${selectedItem.id} · ${selectedItem.label}` : "—"} />
                {selectedItem && selectedItem.href && (
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                    <span className="text-muted-foreground">href:</span>
                    <span className="text-brand-lemon">{selectedItem.href}</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: click items to activate them, press <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←/→</kbd> to move focus, click the <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">⋯</kbd> overflow button to expand collapsed items.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/breadcrumb-AGENT.md"
            skillPath="/docs/components/breadcrumb-SKILL.md"
          >
            {/* Separator */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Separator</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["chevron", "slash", "arrow", "dot"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("separator", s)} aria-pressed={state.separator === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.separator === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Density</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["compact", "comfortable", "spacious"] as const).map((d) => (
                  <button key={d} type="button" onClick={() => update("density", d)} aria-pressed={state.density === d}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.density === d ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Max items */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Max items: <span className="font-mono text-brand-lemon">{state.maxItems === 0 ? "∞ (no limit)" : state.maxItems}</span>
              </label>
              <input type="range" min={0} max={8} step={1} value={state.maxItems} onChange={(e) => update("maxItems", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${state.maxItems / 8 * 100}%, var(--muted) ${state.maxItems / 8 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0 (∞)</span><span>8</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                When the trail exceeds this number, the middle items collapse into an overflow menu. The first and last items stay visible.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "showIcons" as const, l: "Show icons" },
                { k: "markCurrent" as const, l: "Mark current page" },
                { k: "readOnly" as const, l: "Read-only" },
              ]).map(({ k, l }) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="text-[12px] text-foreground">{l}</span>
                  <button type="button" role="switch" aria-checked={state[k]} onClick={() => update(k, !state[k])}
                    className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      state[k] ? "bg-brand-lemon" : "bg-muted-foreground/30")}>
                    <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform",
                      state[k] ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  const n = items.length + 1;
                  const newItem: BreadcrumbItem = {
                    id: `item-${n}`,
                    label: `Item ${n}`,
                    icon: "file",
                  };
                  const newItems = [...items.slice(0, -1), newItem, items[items.length - 1]];
                  setItems(newItems);
                  instanceRef.current?.setItems(newItems);
                  toast.success("Item added", { description: `Inserted before the current page.` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-brand-lemon" /> Add item
              </button>
              <button
                type="button"
                onClick={() => {
                  if (items.length <= 2) {
                    toast.error("Cannot remove", { description: "Keep at least 2 items." });
                    return;
                  }
                  const newItems = items.slice(0, -2).concat(items[items.length - 1]);
                  setItems(newItems);
                  instanceRef.current?.setItems(newItems);
                  toast.success("Item removed");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-accent"
              >
                <Trash2 className="h-3 w-3 text-destructive" /> Remove last
              </button>
            </div>
          </AgentSkillTabs>
        </div>

        {/* Code panel */}
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setActiveTab(k)}
                  className={cn("relative h-9 px-3 text-[12px] font-medium transition-colors",
                    activeTab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {l}
                  {activeTab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {activeTab === "javascript" && <CodeBlock code={jsCode} language="javascript" filename="init.js" />}
            {activeTab === "html" && <CodeBlock code={'<div id="breadcrumb"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".crumb-nav {\n  /* Override tokens to retheme the breadcrumb */\n  --cb-accent: #D9FF66;\n  --cb-surface: #211A30;\n  --cb-border: #383343;\n  --cb-text: #F4F1FF;\n  --cb-muted: #B8B2CA;\n}\n\n/* Compact density for tight headers */\n.crumb-nav.crumb-density-compact .crumb-item {\n  padding: 2px 6px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Breadcrumb {\n  constructor(container, options)\n  setItems(items): void\n  selectItem(id | null, source?): void\n  clearSelection(): void\n  getSelectedItem(): string | null\n  getItems(): BreadcrumbItem[]\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   item_selected, item_activated, overflow_toggled\n\n// Options:\n//   items, separator (chevron|slash|arrow|dot),\n//   maxItems (0 = no limit), overflowMode (dropdown|inline),\n//   showIcons, markCurrent, density (compact|comfortable|spacious),\n//   readOnly, disabled"} language="typescript" filename="api.ts" />}
          </div>
        </section>

        {/* Documentation */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-6">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Overview</h2>
              <p className="mt-2 text-[14px] text-muted-foreground">{meta.description}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-lemon">When to use</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />{u}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Not for</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenNotToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{u}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Properties</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-mono font-medium">Property</th>
                      <th className="py-2 pr-4 font-mono font-medium">Type</th>
                      <th className="py-2 pr-4 font-mono font-medium">Default</th>
                      <th className="py-2 font-mono font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.properties.map((p) => (
                      <tr key={p.name} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{p.name}</td>
                        <td className="py-2 pr-4 font-mono text-foreground">{p.type}</td>
                        <td className="py-2 pr-4 font-mono text-muted-foreground">{p.default}</td>
                        <td className="py-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Methods</h2>
                <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                  {meta.methods.map((m) => (
                    <li key={m.signature} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{m.signature}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{m.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Events</h2>
                <ul className="mt-3 space-y-2">
                  {meta.events.map((e) => (
                    <li key={e.name} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{e.name}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{e.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">payload: {e.payload}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Accessibility</h2>
              <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Rendered as a <code className="font-mono text-brand-lemon">&lt;nav aria-label=&quot;Breadcrumb&quot;&gt;</code> with an ordered list inside.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The current page (last item) gets <code className="font-mono text-brand-lemon">aria-current=&quot;page&quot;</code> when <code className="font-mono text-brand-lemon">markCurrent</code> is true.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Items are focusable (<code className="font-mono text-brand-lemon">tabindex=&quot;0&quot;</code>) with a visible lemon focus ring.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Tab</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Shift+Tab</kbd> moves between items; <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←/→</kbd> roves focus.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Enter</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Space</kbd> activates the focused item.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Overflow menu uses <code className="font-mono text-brand-lemon">role=&quot;menu&quot;</code> / <code className="font-mono text-brand-lemon">role=&quot;menuitem&quot;</code> with <code className="font-mono text-brand-lemon">aria-expanded</code>.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Disabled items get <code className="font-mono text-brand-lemon">aria-disabled=&quot;true&quot;</code> and are removed from the tab order.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Separators are <code className="font-mono text-brand-lemon">aria-hidden=&quot;true&quot;</code> so screen readers skip them.</li>
              </ul>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 panel p-4">
              <h3 className="eyebrow mb-3">On this page</h3>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Overview</a></li>
                <li><a href="#" className="hover:text-foreground">Properties</a></li>
                <li><a href="#" className="hover:text-foreground">Methods</a></li>
                <li><a href="#" className="hover:text-foreground">Events</a></li>
                <li><a href="#" className="hover:text-foreground">Accessibility</a></li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
