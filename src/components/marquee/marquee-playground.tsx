"use client";

import * as React from "react";
import {
  Repeat as NavIcon, RotateCcw, Plus, Trash2, Pause, Play, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  MarqueeReact,
  type MarqueeDirection,
} from "./marquee-react";
import type { Marquee } from "@/lib/components/marquee";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  direction: MarqueeDirection;
  speed: number;
  gap: number;
  separator: string;
  pauseOnHover: boolean;
  showSeparator: boolean;
}

const DEFAULTS: State = {
  direction: "left",
  speed: 50,
  gap: 24,
  separator: "•",
  pauseOnHover: true,
  showSeparator: true,
};

const SEED_ITEMS: string[] = [
  "Workshop UI Library",
  "Vanilla JavaScript",
  "TypeScript",
  "Scoped CSS",
  "Accessible",
  "Brand Lemon Accent",
  "Single-File Components",
  "Production-Ready",
];

export function MarqueePlayground() {
  const meta = getComponent("marquee")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<string[]>(SEED_ITEMS);
  const [paused, setPaused] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Marquee | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setState(DEFAULTS);
    setPaused(false);
    setTimeout(() => {
      instanceRef.current?.setItems(SEED_ITEMS);
      instanceRef.current?.resume();
    }, 0);
    toast.info("Marquee reset", { description: "Restored seed items and defaults." });
  }, []);

  const togglePause = React.useCallback(() => {
    const next = !paused;
    setPaused(next);
    if (next) {
      instanceRef.current?.pause();
      toast.info("Marquee paused");
    } else {
      instanceRef.current?.resume();
      toast.success("Marquee resumed");
    }
  }, [paused]);

  const isVertical = state.direction === "up" || state.direction === "down";

  const jsCode = React.useMemo(() => `import { Marquee } from "@workshop/marquee";

const marquee = new Marquee(container, {
  direction: "${state.direction}",
  speed: ${state.speed},
  gap: ${state.gap},
  separator: "${state.separator}",
  showSeparator: ${state.showSeparator},
  pauseOnHover: ${state.pauseOnHover},
  items: [
    "Workshop UI Library",
    "Vanilla JavaScript",
    "TypeScript",
    "Scoped CSS",
    "Accessible",
    "Brand Lemon Accent",
    "Single-File Components",
    "Production-Ready",
  ],
});

// Pause / resume at runtime
marquee.pause();
marquee.resume();`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Marquee</h1>
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
                {/* Primary marquee */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary marquee</span>
                    <span className="font-mono text-[10px] text-muted-foreground">direction={state.direction} · speed={state.speed}px/s · gap={state.gap}px</span>
                  </div>
                  <div className="panel p-4">
                    <div className={cn(isVertical && "h-[300px]")}>
                      <MarqueeReact
                        items={items}
                        direction={state.direction}
                        speed={state.speed}
                        gap={state.gap}
                        separator={state.separator}
                        showSeparator={state.showSeparator}
                        pauseOnHover={state.pauseOnHover}
                        instanceRef={instanceRef}
                        className={cn(isVertical && "h-full")}
                      />
                    </div>
                  </div>
                </div>

                {/* Variant: right */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Right variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">direction=right · no separator</span>
                  </div>
                  <div className="panel p-4">
                    <MarqueeReact
                      items={items.slice(0, 5)}
                      direction="right"
                      speed={40}
                      gap={32}
                      showSeparator={false}
                      pauseOnHover
                    />
                  </div>
                </div>

                {/* Variant: vertical */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Vertical variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">direction=up · custom separator</span>
                  </div>
                  <div className="panel p-4">
                    <div className="h-[240px]">
                      <MarqueeReact
                        items={items.slice(0, 6)}
                        direction="up"
                        speed={30}
                        gap={16}
                        separator="◆"
                        showSeparator
                        pauseOnHover
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  state: <span className="text-brand-lemon">{paused ? "paused" : "running"}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Direction" value={state.direction} />
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                  <span className="text-muted-foreground">items:</span>
                  <span className="text-brand-lemon">{items.length}</span>
                </span>
                <button
                  type="button"
                  onClick={togglePause}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-colors",
                    paused ? "border-brand-lemon/40 bg-brand-lemon/10 text-foreground" : "border-border bg-muted/30 text-foreground hover:border-brand-lemon/40 hover:bg-accent")}
                >
                  {paused ? <Play className="h-3.5 w-3.5 text-brand-lemon" /> : <Pause className="h-3.5 w-3.5 text-brand-lemon" />}
                  {paused ? "Resume" : "Pause"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: hover the marquee to pause (if <code className="font-mono text-brand-lemon">pauseOnHover</code> is on). Use the Pause/Resume button to control it programmatically.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/marquee-AGENT.md"
            skillPath="/docs/components/marquee-SKILL.md"
          >
            {/* Direction */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Direction</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {([
                  { v: "left" as const, icon: ArrowLeft },
                  { v: "right" as const, icon: ArrowRight },
                  { v: "up" as const, icon: ArrowUp },
                  { v: "down" as const, icon: ArrowDown },
                ]).map(({ v, icon: Icon }) => (
                  <button key={v} type="button" onClick={() => update("direction", v)} aria-pressed={state.direction === v}
                    className={cn("flex flex-col items-center gap-1 rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.direction === v ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    <Icon className="h-3.5 w-3.5" />
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Speed: <span className="font-mono text-brand-lemon">{state.speed}px/s</span>
              </label>
              <input type="range" min={10} max={200} step={5} value={state.speed} onChange={(e) => update("speed", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.speed - 10) / 190 * 100}%, var(--muted) ${(state.speed - 10) / 190 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>10 (slow)</span><span>200 (fast)</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                Pixels per second. Higher = faster scroll. The actual duration is computed from the content width.
              </p>
            </div>

            {/* Gap */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Gap: <span className="font-mono text-brand-lemon">{state.gap}px</span>
              </label>
              <input type="range" min={0} max={60} step={2} value={state.gap} onChange={(e) => update("gap", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${state.gap / 60 * 100}%, var(--muted) ${state.gap / 60 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0</span><span>60</span>
              </div>
            </div>

            {/* Separator */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Separator</label>
              <input
                type="text"
                value={state.separator}
                onChange={(e) => update("separator", e.target.value.slice(0, 4))}
                placeholder="e.g. •"
                className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-lemon/40"
              />
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                A short string inserted between items when <code className="font-mono">showSeparator</code> is on.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "pauseOnHover" as const, l: "Pause on hover" },
                { k: "showSeparator" as const, l: "Show separator" },
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
                onClick={togglePause}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                  paused ? "border-brand-lemon/40 bg-brand-lemon/10 text-foreground" : "border-border bg-muted/30 text-foreground hover:border-brand-lemon/40 hover:bg-accent")}
              >
                {paused ? <Play className="h-3 w-3 text-brand-lemon" /> : <Pause className="h-3 w-3 text-brand-lemon" />}
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = items.length + 1;
                  const next = [...items, `Item ${n}`];
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  toast.success("Item added", { description: `Inserted item ${n}.` });
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
                  const next = items.slice(0, -1);
                  setItems(next);
                  instanceRef.current?.setItems(next);
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
            {activeTab === "html" && <CodeBlock code={'<div id="marquee"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".mq-root {\n  /* Override tokens to retheme the marquee */\n  --mq-accent: #D9FF66;\n  --mq-surface: #211A30;\n  --mq-border: #383343;\n  --mq-text: #F4F1FF;\n  --mq-muted: #B8B2CA;\n}\n\n/* Bigger items for hero banners */\n.mq-item {\n  padding: 12px 18px;\n  font-size: 16px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Marquee {\n  constructor(container, options)\n  pause(): void\n  resume(): void\n  isPaused(): boolean\n  setItems(items): void\n  setProperty(name, value): void\n  destroy(): void\n}\n\n// Options:\n//   items (string[]), direction (left|right|up|down),\n//   speed, gap, pauseOnHover,\n//   showSeparator, separator"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The marquee duplicates its content twice to create the seamless loop — screen readers may announce items twice.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />For static text content, consider wrapping in <code className="font-mono text-brand-lemon">aria-hidden=&quot;true&quot;</code> and providing the same text in a visually-hidden sibling for SR users.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><code className="font-mono text-brand-lemon">pauseOnHover</code> gives users a moment to read moving text — keep it on for editorial content.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Animation is CSS-based; users with <code className="font-mono text-brand-lemon">prefers-reduced-motion</code> still see movement but can pause via hover.</li>
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
