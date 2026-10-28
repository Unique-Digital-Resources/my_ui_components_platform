"use client";

import * as React from "react";
import {
  GitCommitVertical as NavIcon, RotateCcw, Plus, Trash2, AlignLeft, AlignRight, Columns2,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  TimelineReact,
  type TimelineEntry,
  type TimelineSide,
} from "./timeline-react";
import type { Timeline } from "@/lib/components/timeline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  side: TimelineSide;
  showDates: boolean;
  showIcons: boolean;
}

const DEFAULTS: State = {
  side: "left",
  showDates: true,
  showIcons: false,
};

const SEED_ENTRIES: TimelineEntry[] = [
  { id: "e1", date: "2024-01-12", title: "Project Kickoff", description: "Initial planning meeting with stakeholders. Defined scope, milestones, and the brand-lemon accent color.", color: "#D9FF66" },
  { id: "e2", date: "2024-02-04", title: "Design System Locked", description: "Obsidian background, deep-violet surfaces, lemon accent. Inter for body, JetBrains Mono for code.", color: "#9C6E2F" },
  { id: "e3", date: "2024-03-18", title: "First Component Shipped", description: "Color Wheel Picker launched with triangle, square, and disk modes. 100% keyboard accessible.", color: "#7C5CAB" },
  { id: "e4", date: "2024-05-02", title: "Beta Program Opened", description: "Twenty external teams onboarded. Collected feedback on the API ergonomics and theming.", color: "#5C7AAB" },
  { id: "e5", date: "2024-07-15", title: "Layout Category Added", description: "Board, Nodes Graph, Toggle Group, Periodic Range — five layout components for workspaces.", color: "#A85C5C" },
  { id: "e6", date: "2024-09-30", title: "v1.0 Released", description: "Production-ready. Eight categories, twenty components, full documentation site, AGENT/SKILL docs.", color: "#D9FF66" },
];

export function TimelinePlayground() {
  const meta = getComponent("timeline")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [entries, setEntries] = React.useState<TimelineEntry[]>(SEED_ENTRIES);
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Timeline | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const reset = React.useCallback(() => {
    setEntries(SEED_ENTRIES);
    setState(DEFAULTS);
    setTimeout(() => instanceRef.current?.setEntries(SEED_ENTRIES), 0);
    toast.info("Timeline reset", { description: "Restored seed entries." });
  }, []);

  const jsCode = React.useMemo(() => `import { Timeline } from "@workshop/timeline";

const timeline = new Timeline(container, {
  side: "${state.side}",
  showDates: ${state.showDates},
  showIcons: ${state.showIcons},
  entries: [
    { id: "e1", date: "2024-01-12", title: "Project Kickoff", description: "..." },
    { id: "e2", date: "2024-02-04", title: "Design System Locked", description: "..." },
    { id: "e3", date: "2024-03-18", title: "First Component Shipped", description: "..." },
    { id: "e4", date: "2024-05-02", title: "Beta Program Opened", description: "..." },
    { id: "e5", date: "2024-07-15", title: "Layout Category Added", description: "..." },
    { id: "e6", date: "2024-09-30", title: "v1.0 Released", description: "..." },
  ],
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Data Display</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Timeline</h1>
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
                  {entries.length} entries
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
                {/* Primary timeline */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary timeline</span>
                    <span className="font-mono text-[10px] text-muted-foreground">side={state.side} · dates={String(state.showDates)}</span>
                  </div>
                  <div className="panel p-4">
                    <TimelineReact
                      entries={entries}
                      side={state.side}
                      showDates={state.showDates}
                      showIcons={state.showIcons}
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Variant: alternate */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Alternate variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">side=alternate · no dates</span>
                  </div>
                  <div className="panel p-4">
                    <TimelineReact
                      entries={entries}
                      side="alternate"
                      showDates={false}
                      showIcons={false}
                    />
                  </div>
                </div>

                {/* Variant: right */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Right-aligned variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">side=right · dates on</span>
                  </div>
                  <div className="panel p-4">
                    <TimelineReact
                      entries={entries.slice(0, 4)}
                      side="right"
                      showDates
                      showIcons={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  layout: <span className="text-brand-lemon">{state.side}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Entries" value={`${entries.length}`} />
                {entries[0] && (
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                    <span className="text-muted-foreground">first:</span>
                    <span className="text-brand-lemon">{entries[0].date}</span>
                  </span>
                )}
                {entries[entries.length - 1] && (
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                    <span className="text-muted-foreground">last:</span>
                    <span className="text-brand-lemon">{entries[entries.length - 1].date}</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: switch side to <code className="font-mono text-brand-lemon">alternate</code> for a centered spine — odd entries go right, even entries go left. Useful for changelogs and bidirectional histories.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/timeline-AGENT.md"
            skillPath="/docs/components/timeline-SKILL.md"
          >
            {/* Side */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Side</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {([
                  { v: "left" as const, icon: AlignLeft },
                  { v: "right" as const, icon: AlignRight },
                  { v: "alternate" as const, icon: Columns2 },
                ]).map(({ v, icon: Icon }) => (
                  <button key={v} type="button" onClick={() => update("side", v)} aria-pressed={state.side === v}
                    className={cn("flex flex-col items-center gap-1 rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.side === v ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    <Icon className="h-3.5 w-3.5" />
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "showDates" as const, l: "Show entry dates" },
                { k: "showIcons" as const, l: "Show entry icons" },
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
                  const n = entries.length + 1;
                  const palette = ["#D9FF66", "#9C6E2F", "#7C5CAB", "#5C7AAB", "#A85C5C", "#5CAB87"];
                  const today = new Date();
                  const date = today.toISOString().slice(0, 10);
                  const newItem: TimelineEntry = {
                    id: `e${n}`,
                    date,
                    title: `Entry ${n}`,
                    description: `New timeline entry added at runtime via setEntries(). Customize the date, title, and description as needed.`,
                    color: palette[n % palette.length],
                  };
                  const next = [...entries, newItem];
                  setEntries(next);
                  instanceRef.current?.setEntries(next);
                  toast.success("Entry added", { description: `Inserted entry ${n}.` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-brand-lemon" /> Add entry
              </button>
              <button
                type="button"
                onClick={() => {
                  if (entries.length <= 2) {
                    toast.error("Cannot remove", { description: "Keep at least 2 entries." });
                    return;
                  }
                  const next = entries.slice(0, -1);
                  setEntries(next);
                  instanceRef.current?.setEntries(next);
                  toast.success("Entry removed");
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
            {activeTab === "html" && <CodeBlock code={'<div id="timeline"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".tl-root {\n  /* Override tokens to retheme the timeline */\n  --tl-accent: #D9FF66;\n  --tl-surface: #211A30;\n  --tl-border: #383343;\n  --tl-text: #F4F1FF;\n  --tl-muted: #B8B2CA;\n}\n\n/* Tighter entries for changelogs */\n.tl-entry {\n  padding: 8px 0;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Timeline {\n  constructor(container, options)\n  setEntries(entries): void\n  setProperty(name, value): void\n  destroy(): void\n}\n\n// Options:\n//   entries, side (left|right|alternate),\n//   showDates, showIcons"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The vertical spine is purely decorative — content reads naturally in source order.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Dates are rendered in monospace and use a semantic <code className="font-mono text-brand-lemon">&lt;div&gt;</code> for consistent spacing.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Marker colors are decorative — each entry&apos;s title text carries the primary meaning.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Alternate layout uses <code className="font-mono text-brand-lemon">nth-child</code> rules so the visual rhythm is preserved even when entries are added or removed.</li>
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
