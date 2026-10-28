"use client";

import * as React from "react";
import {
  PanelTop as NavIcon, RotateCcw, Plus, Trash2, ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  CollapseReact,
  type CollapseItem,
  type CollapseEventPayload,
} from "./collapse-react";
import type { Collapse } from "@/lib/components/collapse";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  accordion: boolean;
  showIcons: boolean;
}

const DEFAULTS: State = {
  accordion: false,
  showIcons: true,
};

const SEED_ITEMS: CollapseItem[] = [
  { id: "general", title: "General Settings", icon: "⚙", defaultOpen: true, content: "Manage your workspace name, default project, timezone, and language. Changes apply immediately and are synced across all signed-in devices." },
  { id: "privacy", title: "Privacy", icon: "🔒", content: "Control who can find your profile, see your activity status, and request your data export. Two-factor authentication is recommended for all accounts." },
  { id: "notifications", title: "Notifications", icon: "🔔", content: "Choose how and when you receive alerts: email digests, in-app banners, mobile push, and quiet hours. Mentions always bypass quiet hours." },
  { id: "appearance", title: "Appearance", icon: "🎨", content: "Switch between the dark, light, and high-contrast themes. Pick a density mode and accent — the brand lemon is the default and recommended." },
  { id: "advanced", title: "Advanced", icon: "🛠", content: "Developer options for API keys, webhook URLs, integration tokens, and export raw data as JSON. Leave these alone unless you know what you are doing." },
];

export function CollapsePlayground() {
  const meta = getComponent("collapse")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<CollapseItem[]>(SEED_ITEMS);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [openIds, setOpenIds] = React.useState<string[]>(["general"]);
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Collapse | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onToggle = React.useCallback((p: CollapseEventPayload) => {
    setOpenIds(p.openIds ?? []);
    setLastEvent(`${p.itemId ?? "—"} ${p.openIds?.includes(p.itemId ?? "") ? "opened" : "closed"}`);
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setOpenIds(["general"]);
    setLastEvent("reset");
    setState(DEFAULTS);
    setTimeout(() => {
      instanceRef.current?.setItems(SEED_ITEMS);
    }, 0);
    toast.info("Collapse reset", { description: "Restored seed items and defaults." });
  }, []);

  const jsCode = React.useMemo(() => `import { Collapse } from "@workshop/collapse";

const panel = new Collapse(container, {
  accordion: ${state.accordion},
  showIcons: ${state.showIcons},
  defaultOpenIds: ["general"],
  items: [
    { id: "general", title: "General Settings", icon: "⚙", content: "..." },
    { id: "privacy", title: "Privacy", icon: "🔒", content: "..." },
    { id: "notifications", title: "Notifications", icon: "🔔", content: "..." },
    { id: "appearance", title: "Appearance", icon: "🎨", content: "..." },
    { id: "advanced", title: "Advanced", icon: "🛠", content: "..." },
  ],
});

panel.on("toggle", ({ itemId, openIds, source }) => {
  console.log(\`Panel \${itemId} toggled via \${source}\`, openIds);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Collapse</h1>
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

            <div className="flex-1 min-h-0 overflow-auto bg-grid p-6">
              <div className="flex flex-col gap-6">
                {/* Primary collapse */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary panel</span>
                    <span className="font-mono text-[10px] text-muted-foreground">accordion={String(state.accordion)} · showIcons={String(state.showIcons)}</span>
                  </div>
                  <div className="panel p-4">
                    <CollapseReact
                      items={items}
                      accordion={state.accordion}
                      showIcons={state.showIcons}
                      defaultOpenIds={["general"]}
                      onToggle={onToggle}
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Variant: accordion */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Accordion variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">accordion=true · icons off</span>
                  </div>
                  <div className="panel p-4">
                    <CollapseReact
                      items={items}
                      accordion
                      showIcons={false}
                      defaultOpenIds={["privacy"]}
                    />
                  </div>
                </div>

                {/* Variant: no icons */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Minimal variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">icons off · multi-open</span>
                  </div>
                  <div className="panel p-4">
                    <CollapseReact
                      items={items}
                      accordion={false}
                      showIcons={false}
                      defaultOpenIds={["general", "appearance"]}
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
                <CopyableValue label="Open IDs" value={openIds.length ? openIds.join(", ") : "—"} />
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                  <span className="text-muted-foreground">open:</span>
                  <span className="text-brand-lemon">{openIds.length}/{items.length}</span>
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: click a trigger to toggle, press <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Enter</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Space</kbd> to activate. With accordion on, opening one panel closes the others.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/collapse-AGENT.md"
            skillPath="/docs/components/collapse-SKILL.md"
          >
            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "accordion" as const, l: "Accordion (single open)" },
                { k: "showIcons" as const, l: "Show item icons" },
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
                  const all = items.map((it) => it.id);
                  setOpenIds(all);
                  all.forEach((id) => instanceRef.current?.open(id));
                  toast.success("All open", { description: `${all.length} panels expanded.` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ChevronsUpDown className="h-3 w-3 text-brand-lemon" /> Open all
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenIds([]);
                  instanceRef.current?.closeAll();
                  toast.info("All closed");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ChevronsDownUp className="h-3 w-3 text-muted-foreground" /> Close all
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = items.length + 1;
                  const newItem: CollapseItem = {
                    id: `item-${n}`,
                    title: `Panel ${n}`,
                    icon: "▪",
                    content: `This panel was added at runtime via setItems(). Insert your own content here.`,
                  };
                  const next = [...items, newItem];
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  toast.success("Panel added", { description: `Inserted panel ${n}.` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-brand-lemon" /> Add panel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (items.length <= 2) {
                    toast.error("Cannot remove", { description: "Keep at least 2 panels." });
                    return;
                  }
                  const next = items.slice(0, -1);
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  toast.success("Panel removed");
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
            {activeTab === "html" && <CodeBlock code={'<div id="collapse"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".clp-root {\n  /* Override tokens to retheme the collapse */\n  --clp-accent: #D9FF66;\n  --clp-surface: #211A30;\n  --clp-border: #383343;\n  --clp-text: #F4F1FF;\n  --clp-muted: #B8B2CA;\n}\n\n/* Tighter triggers for compact panels */\n.clp-trigger {\n  padding: 8px 12px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Collapse {\n  constructor(container, options)\n  toggle(itemId, source?): void\n  open(itemId): void\n  close(itemId): void\n  closeAll(): void\n  getOpenIds(): string[]\n  setItems(items): void\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   toggle\n\n// Options:\n//   items, accordion, showIcons, defaultOpenIds"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Each trigger is a <code className="font-mono text-brand-lemon">&lt;button&gt;</code> with <code className="font-mono text-brand-lemon">aria-expanded</code> reflecting its open state.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Enter</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Space</kbd> toggles the focused panel.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Disabled panels are removed from the tab order and shown at reduced opacity.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Chevrons are marked <code className="font-mono text-brand-lemon">aria-hidden</code> and rotate 90° when open.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Content transitions respect <code className="font-mono text-brand-lemon">prefers-reduced-motion</code>.</li>
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
