"use client";

import * as React from "react";
import {
  PanelTop as NavIcon, RotateCcw, ArrowUp, ArrowDown, MoveHorizontal, MoveVertical, Move,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  ScrollLayoutReact,
  type ScrollOrientation,
  type ScrollbarMode,
} from "./scroll-layout-react";
import type { ScrollLayout } from "@/lib/components/scroll-layout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  orientation: ScrollOrientation;
  scrollbar: ScrollbarMode;
  maxHeight: number;
  showShadow: boolean;
}

const DEFAULTS: State = {
  orientation: "vertical",
  scrollbar: "auto",
  maxHeight: 360,
  showShadow: true,
};

// 20+ paragraphs of seed content for the live scroll area.
const PARAGRAPHS: { heading: string; body: string }[] = Array.from({ length: 22 }, (_, i) => ({
  heading: `Paragraph ${i + 1}`,
  body: [
    "Workshop is a vanilla JavaScript UI component library built for professional application interfaces.",
    "Each component ships as a single TypeScript file with scoped CSS, full keyboard support, and a clean public API.",
    "The design system uses an obsidian background, deep-violet surfaces, and a single lemon accent — no rainbow of colors.",
    "Components are framework-independent: import the class, instantiate against a container, and listen for events.",
    "Every component supports runtime configuration via setProperty, defensive cloning for collection inputs, and idempotent destroy.",
    "Accessibility is a first-class concern: ARIA roles, focus rings, reduced-motion support, and keyboard navigation everywhere.",
    "The ScrollLayout component is the simplest building block in the layout category — a styled, accessible scroll container.",
    "Use it when you need a fixed-height region that scrolls vertically, horizontally, or both, with custom scrollbar styling.",
  ][i % 8],
}));

export function ScrollLayoutPlayground() {
  const meta = getComponent("scroll-layout")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<ScrollLayout | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    toast.info("ScrollLayout reset", { description: "Restored defaults." });
  }, []);

  const jsCode = React.useMemo(() => `import { ScrollLayout } from "@workshop/scroll-layout";

const scroller = new ScrollLayout(container, {
  orientation: "${state.orientation}",
  scrollbar: "${state.scrollbar}",
  maxHeight: ${state.maxHeight},
  showShadow: ${state.showShadow},
});

// Programmatically scroll to the top or bottom
scroller.scrollToTop();
scroller.scrollToBottom();`, [state]);

  // Build a horizontal variant content row
  const horizontalContent = (
    <div className="flex gap-4 p-3" style={{ width: "max-content" }}>
      {PARAGRAPHS.slice(0, 10).map((p, i) => (
        <div key={i} className="w-72 shrink-0 rounded-md border border-border bg-muted/20 p-4">
          <div className="text-[12px] font-semibold text-brand-lemon">{p.heading}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{p.body}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Scroll Layout</h1>
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
                  {PARAGRAPHS.length} paragraphs
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
                {/* Primary scroller */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary scroller</span>
                    <span className="font-mono text-[10px] text-muted-foreground">orientation={state.orientation} · scrollbar={state.scrollbar} · maxHeight={state.maxHeight}</span>
                  </div>
                  <div className="panel p-4">
                    <ScrollLayoutReact
                      orientation={state.orientation}
                      scrollbar={state.scrollbar}
                      maxHeight={state.maxHeight}
                      showShadow={state.showShadow}
                      instanceRef={instanceRef}
                    >
                      {state.orientation === "horizontal" ? (
                        horizontalContent
                      ) : (
                        <div className="flex flex-col gap-3 p-1">
                          {PARAGRAPHS.map((p, i) => (
                            <div key={i} className="rounded-md border border-border bg-muted/20 p-4">
                              <div className="text-[13px] font-semibold text-brand-lemon">{p.heading}</div>
                              <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{p.body}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollLayoutReact>
                  </div>
                </div>

                {/* Variant: hidden scrollbar */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Hidden scrollbar</span>
                    <span className="font-mono text-[10px] text-muted-foreground">scrollbar=hidden · no shadow</span>
                  </div>
                  <div className="panel p-4">
                    <ScrollLayoutReact
                      orientation="vertical"
                      scrollbar="hidden"
                      maxHeight={240}
                      showShadow={false}
                    >
                      <div className="flex flex-col gap-3 p-1">
                        {PARAGRAPHS.slice(0, 10).map((p, i) => (
                          <div key={i} className="rounded-md border border-border bg-muted/20 p-3">
                            <div className="text-[12px] font-semibold text-brand-lemon">{p.heading}</div>
                            <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{p.body}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollLayoutReact>
                  </div>
                </div>

                {/* Variant: horizontal */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Horizontal variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">orientation=horizontal · always scrollbar</span>
                  </div>
                  <div className="panel p-4">
                    <ScrollLayoutReact
                      orientation="horizontal"
                      scrollbar="always"
                      showShadow={false}
                    >
                      {horizontalContent}
                    </ScrollLayoutReact>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  mode: <span className="text-brand-lemon">{state.scrollbar}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Max height" value={`${state.maxHeight}px`} />
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                  <span className="text-muted-foreground">shadow:</span>
                  <span className="text-brand-lemon">{state.showShadow ? "on" : "off"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => instanceRef.current?.scrollToTop()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-brand-lemon" /> Scroll to top
                </button>
                <button
                  type="button"
                  onClick={() => instanceRef.current?.scrollToBottom()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-brand-lemon" /> Scroll to bottom
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: <code className="font-mono text-brand-lemon">scrollbar=hidden</code> hides the scrollbar entirely (still scrollable via wheel/trackpad/keyboard). <code className="font-mono text-brand-lemon">hover</code> only shows it when the cursor is inside.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/scroll-layout-AGENT.md"
            skillPath="/docs/components/scroll-layout-SKILL.md"
          >
            {/* Orientation */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Orientation</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {([
                  { v: "vertical" as const, icon: MoveVertical },
                  { v: "horizontal" as const, icon: MoveHorizontal },
                  { v: "both" as const, icon: Move },
                ]).map(({ v, icon: Icon }) => (
                  <button key={v} type="button" onClick={() => update("orientation", v)} aria-pressed={state.orientation === v}
                    className={cn("flex flex-col items-center gap-1 rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.orientation === v ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    <Icon className="h-3.5 w-3.5" />
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollbar */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Scrollbar</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["auto", "always", "hidden", "hover"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("scrollbar", s)} aria-pressed={state.scrollbar === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.scrollbar === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Max height */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Max height: <span className="font-mono text-brand-lemon">{state.maxHeight}px</span>
              </label>
              <input type="range" min={200} max={600} step={20} value={state.maxHeight} onChange={(e) => update("maxHeight", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.maxHeight - 200) / 400 * 100}%, var(--muted) ${(state.maxHeight - 200) / 400 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>200px</span><span>600px</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                The fixed pixel height of the scrollable region. Set to 0 to let content drive height.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "showShadow" as const, l: "Show edge shadows" },
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
                onClick={() => instanceRef.current?.scrollToTop()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ArrowUp className="h-3 w-3 text-brand-lemon" /> To top
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.scrollToBottom()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ArrowDown className="h-3 w-3 text-brand-lemon" /> To bottom
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
            {activeTab === "html" && <CodeBlock code={'<div id="scroll"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".sl-root {\n  /* Override tokens to retheme the scroller */\n  --sl-border: #383343;\n  --sl-shadow: rgba(0, 0, 0, .3);\n}\n\n/* Wider thumb for touch */\n.sl-root::-webkit-scrollbar {\n  width: 12px;\n  height: 12px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class ScrollLayout {\n  constructor(container, options)\n  scrollToTop(): void\n  scrollToBottom(): void\n  getContentEl(): HTMLElement\n  setProperty(name, value): void\n  destroy(): void\n}\n\n// Options:\n//   orientation (vertical|horizontal|both),\n//   scrollbar (auto|always|hidden|hover),\n//   maxHeight, minHeight, showShadow"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Uses native scroll — keyboard scrolling (arrow keys, page up/down) works out of the box.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Hidden scrollbars do not break keyboard accessibility — focus still drives the scroll position.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Edge shadows are decorative — they don&apos;t trap focus or intercept pointer events.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Uses <code className="font-mono text-brand-lemon">scrollbar-width: thin</code> and a custom <code className="font-mono text-brand-lemon">::-webkit-scrollbar</code> for consistent styling across browsers.</li>
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
