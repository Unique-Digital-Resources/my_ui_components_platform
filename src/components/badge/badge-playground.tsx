"use client";

import * as React from "react";
import {
  Tag as NavIcon, RotateCcw, Plus, X,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  BadgeReact,
  type BadgeItem,
  type BadgeSize,
} from "./badge-react";
import type { Badge } from "@/lib/components/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  size: BadgeSize;
}

const DEFAULTS: State = {
  size: "md",
};

const SEED_ITEMS: BadgeItem[] = [
  { id: "b1", label: "Vanilla JS", variant: "default", dot: true },
  { id: "b2", label: "Stable", variant: "success", dot: true, removable: true },
  { id: "b3", label: "Beta", variant: "warning", dot: true },
  { id: "b4", label: "Deprecated", variant: "danger", removable: true },
  { id: "b5", label: "v1.2.0", variant: "info" },
  { id: "b6", label: "New", variant: "accent", dot: true, removable: true },
  { id: "b7", label: "TypeScript", variant: "default", removable: true },
  { id: "b8", label: "Accessible", variant: "success", dot: true },
  { id: "b9", label: "Experimental", variant: "warning", removable: true },
  { id: "b10", label: "Scoped CSS", variant: "info", dot: true },
];

export function BadgePlayground() {
  const meta = getComponent("badge")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<BadgeItem[]>(SEED_ITEMS);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Badge | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setLastEvent("reset");
    setState(DEFAULTS);
    setTimeout(() => instanceRef.current?.setItems(SEED_ITEMS), 0);
    toast.info("Badge reset", { description: "Restored seed items." });
  }, []);

  const variantCount = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.variant ?? "default"] = (m[it.variant ?? "default"] ?? 0) + 1;
    return m;
  }, [items]);

  const jsCode = React.useMemo(() => `import { Badge } from "@workshop/badge";

const group = new Badge(container, {
  size: "${state.size}",
  grouping: true,
  items: [
    { id: "b1", label: "Vanilla JS", variant: "default", dot: true },
    { id: "b2", label: "Stable", variant: "success", dot: true, removable: true },
    { id: "b3", label: "Beta", variant: "warning", dot: true },
    { id: "b4", label: "Deprecated", variant: "danger", removable: true },
    { id: "b5", label: "v1.2.0", variant: "info" },
    { id: "b6", label: "New", variant: "accent", dot: true, removable: true },
    // ...
  ],
});

group.on("remove", ({ itemId }) => {
  console.log(\`Removed badge \${itemId}\`);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Data Display</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Badge</h1>
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
                  {items.length} badges
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

            <div className="flex-1 min-h-0 overflow-auto bg-grid p-6">
              <div className="flex flex-col gap-6">
                {/* Primary group */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary group</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size={state.size}</span>
                  </div>
                  <div className="panel p-4">
                    <BadgeReact
                      items={items}
                      size={state.size}
                      grouping
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Variant: by category */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">By variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size=md · all variants</span>
                  </div>
                  <div className="panel p-4">
                    <BadgeReact
                      items={[
                        { id: "v1", label: "default", variant: "default", dot: true },
                        { id: "v2", label: "success", variant: "success", dot: true },
                        { id: "v3", label: "warning", variant: "warning", dot: true },
                        { id: "v4", label: "danger", variant: "danger", dot: true },
                        { id: "v5", label: "info", variant: "info", dot: true },
                        { id: "v6", label: "accent", variant: "accent", dot: true },
                      ]}
                      size="md"
                      grouping={false}
                    />
                  </div>
                </div>

                {/* Variant: small */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Small variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size=sm · removable</span>
                  </div>
                  <div className="panel p-4">
                    <BadgeReact
                      items={items.slice(0, 6).map((it) => ({ ...it, removable: true }))}
                      size="sm"
                      grouping
                    />
                  </div>
                </div>

                {/* Variant: large */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Large variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size=lg · loose</span>
                  </div>
                  <div className="panel p-4">
                    <BadgeReact
                      items={items.slice(0, 5)}
                      size="lg"
                      grouping={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  last: <span className="text-brand-lemon">{lastEvent}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Total" value={`${items.length}`} />
                {Object.entries(variantCount).map(([v, n]) => (
                  <span key={v} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[11px]">
                    <span className="text-muted-foreground">{v}:</span>
                    <span className="text-brand-lemon">{n}</span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: click the <X className="inline h-3 w-3 align-text-bottom" /> on a removable badge to remove it. Use the Reset button or Add badge to restore.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/badge-AGENT.md"
            skillPath="/docs/components/badge-SKILL.md"
          >
            {/* Size */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Size</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["sm", "md", "lg"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("size", s)} aria-pressed={state.size === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium uppercase transition-colors",
                      state.size === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Variant legend */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Variants</label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {([
                  ["default", "Default — muted gray"],
                  ["success", "Success — green"],
                  ["warning", "Warning — amber"],
                  ["danger", "Danger — red"],
                  ["info", "Info — soft blue"],
                  ["accent", "Accent — brand lemon"],
                ] as const).map(([v, l]) => (
                  <div key={v} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
                    <span className={cn("h-2 w-2 rounded-full",
                      v === "default" && "bg-muted-foreground",
                      v === "success" && "bg-[#8FE3A5]",
                      v === "warning" && "bg-[#FFD36B]",
                      v === "danger" && "bg-[#FF858B]",
                      v === "info" && "bg-[#7DB8E8]",
                      v === "accent" && "bg-brand-lemon",
                    )} />
                    <span className="font-mono text-foreground">{v}</span>
                    <span className="text-muted-foreground truncate">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  const n = items.length + 1;
                  const variants: Array<BadgeItem["variant"]> = ["default", "success", "warning", "danger", "info", "accent"];
                  const newItem: BadgeItem = {
                    id: `b${n}`,
                    label: `Badge ${n}`,
                    variant: variants[n % variants.length],
                    dot: n % 2 === 0,
                    removable: true,
                  };
                  const next = [...items, newItem];
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  toast.success("Badge added", { description: `Inserted badge ${n}.` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-brand-lemon" /> Add badge
              </button>
              <button
                type="button"
                onClick={() => {
                  if (items.length <= 2) {
                    toast.error("Cannot remove", { description: "Keep at least 2 badges." });
                    return;
                  }
                  const removed = items[items.length - 1];
                  const next = items.slice(0, -1);
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  setLastEvent(`removed ${removed.id}`);
                  toast.success("Badge removed");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-accent"
              >
                <X className="h-3 w-3 text-destructive" /> Remove last
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
            {activeTab === "html" && <CodeBlock code={'<div id="badge"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".bdg-root {\n  /* Override tokens to retheme the badge group */\n  --bdg-accent: #D9FF66;\n  --bdg-surface: #2A2238;\n  --bdg-border: #383343;\n  --bdg-text: #F4F1FF;\n  --bdg-muted: #B8B2CA;\n  --bdg-ok: #8FE3A5;\n  --bdg-warn: #FFD36B;\n  --bdg-danger: #FF858B;\n  --bdg-info: #7DB8E8;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Badge {\n  constructor(container, options)\n  add(item): void\n  remove(itemId): void\n  getItems(): BadgeItem[]\n  setItems(items): void\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   add, remove\n\n// Options:\n//   items, size (sm|md|lg), grouping"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Removable badges expose a <code className="font-mono text-brand-lemon">&lt;button&gt;</code> with <code className="font-mono text-brand-lemon">aria-label=&quot;Remove {`{label}`}&quot;</code>.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Status dots are decorative — the label text carries the meaning.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Variants pair color with a distinct hue (green/amber/red/blue/lemon) so they remain distinguishable in monochrome.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Remove buttons scale their hit area to <code className="font-mono text-brand-lemon">14×14px</code> — pair with adjacent touch targets for mobile.</li>
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
