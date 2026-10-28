"use client";

import * as React from "react";
import {
  PanelRightOpen as NavIcon, RotateCcw, ArrowUpFromLine, ArrowDownToLine, ArrowLeftFromLine, ArrowRightFromLine, X,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  DrawerReact,
  type DrawerSide,
  type DrawerEventPayload,
} from "./drawer-react";
import type { Drawer } from "@/lib/components/drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  side: DrawerSide;
  size: number;
  showOverlay: boolean;
  closeOnOverlayClick: boolean;
  closeOnEscape: boolean;
  open: boolean;
}

const DEFAULTS: State = {
  side: "right",
  size: 360,
  showOverlay: true,
  closeOnOverlayClick: true,
  closeOnEscape: true,
  open: false,
};

const DRAWER_TITLE = "Drawer Panel";
const DRAWER_CONTENT = "This is the drawer body. You can put any content here — forms, navigation lists, detail panels, or contextual settings. The drawer slides in from the configured side (top, bottom, left, or right) and supports overlay click + Escape to close. Try the controls in the Properties panel to switch sides or resize the panel.";

export function DrawerPlayground() {
  const meta = getComponent("drawer")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Drawer | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onChange = React.useCallback((p: DrawerEventPayload) => {
    setLastEvent(`${p.open ? "opened" : "closed"} · ${p.source ?? "—"}`);
    if (typeof p.open === "boolean") {
      setState((s) => ({ ...s, open: p.open! }));
    }
  }, []);

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setLastEvent("reset");
    setTimeout(() => {
      instanceRef.current?.close("programmatic");
    }, 0);
    toast.info("Drawer reset", { description: "Restored defaults and closed the drawer." });
  }, []);

  const openDrawer = React.useCallback(() => {
    instanceRef.current?.open("pointer");
  }, []);

  const closeDrawer = React.useCallback(() => {
    instanceRef.current?.close("pointer");
  }, []);

  const jsCode = React.useMemo(() => `import { Drawer } from "@workshop/drawer";

const drawer = new Drawer(container, {
  side: "${state.side}",
  size: ${state.size},
  showOverlay: ${state.showOverlay},
  closeOnOverlayClick: ${state.closeOnOverlayClick},
  closeOnEscape: ${state.closeOnEscape},
  title: "${DRAWER_TITLE}",
  content: "${DRAWER_CONTENT.slice(0, 40)}...",
});

drawer.on("change", ({ open, source }) => {
  console.log(\`Drawer \${open ? "opened" : "closed"} via \${source}\`);
});

// Open / close programmatically
drawer.open();
drawer.close();
drawer.toggle();`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Drawer</h1>
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
                  side={state.side}
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
                {/* Primary drawer trigger */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary drawer</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size={state.size}px · overlay={String(state.showOverlay)}</span>
                  </div>
                  <div className="panel relative flex min-h-[320px] items-center justify-center p-4">
                    <div className="text-center">
                      <p className="mb-4 text-[13px] text-muted-foreground">
                        Click the button below to open the drawer.
                      </p>
                      <button
                        type="button"
                        onClick={openDrawer}
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-lemon px-4 text-[13px] font-semibold text-obsidian transition-opacity hover:opacity-90"
                      >
                        <NavIcon className="h-4 w-4" />
                        Open Drawer
                      </button>
                      {state.open && (
                        <button
                          type="button"
                          onClick={closeDrawer}
                          className="ml-2 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-muted/30 px-4 text-[13px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                          Close
                        </button>
                      )}
                    </div>
                    {/* The drawer mounts inside this panel */}
                    <DrawerReact
                      side={state.side}
                      size={state.size}
                      open={state.open}
                      showOverlay={state.showOverlay}
                      closeOnOverlayClick={state.closeOnOverlayClick}
                      closeOnEscape={state.closeOnEscape}
                      title={DRAWER_TITLE}
                      content={DRAWER_CONTENT}
                      onChange={onChange}
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Side reference grid */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Side reference</span>
                    <span className="font-mono text-[10px] text-muted-foreground">click a card to switch the side</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      { v: "left" as const, icon: ArrowLeftFromLine },
                      { v: "right" as const, icon: ArrowRightFromLine },
                      { v: "top" as const, icon: ArrowUpFromLine },
                      { v: "bottom" as const, icon: ArrowDownToLine },
                    ]).map(({ v, icon: Icon }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => update("side", v)}
                        aria-pressed={state.side === v}
                        className={cn("flex flex-col items-center gap-2 rounded-md border p-4 text-[11px] font-medium capitalize transition-colors",
                          state.side === v ? "border-brand-lemon/60 bg-brand-lemon/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:border-brand-lemon/30 hover:text-foreground")}
                      >
                        <Icon className={cn("h-5 w-5", state.side === v ? "text-brand-lemon" : "text-muted-foreground")} />
                        {v}
                      </button>
                    ))}
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
                <CopyableValue label="State" value={state.open ? "open" : "closed"} />
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                  <span className="text-muted-foreground">size:</span>
                  <span className="text-brand-lemon">{state.size}px</span>
                </span>
                <button
                  type="button"
                  onClick={state.open ? closeDrawer : openDrawer}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
                >
                  {state.open ? "Close drawer" : "Open drawer"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: press <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Esc</kbd> to close (if <code className="font-mono text-brand-lemon">closeOnEscape</code> is on), or click the overlay (if <code className="font-mono text-brand-lemon">closeOnOverlayClick</code> is on).
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/drawer-AGENT.md"
            skillPath="/docs/components/drawer-SKILL.md"
          >
            {/* Side */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Side</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {([
                  { v: "top" as const, icon: ArrowUpFromLine },
                  { v: "bottom" as const, icon: ArrowDownToLine },
                  { v: "left" as const, icon: ArrowLeftFromLine },
                  { v: "right" as const, icon: ArrowRightFromLine },
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

            {/* Size */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Size: <span className="font-mono text-brand-lemon">{state.size}px</span>
              </label>
              <input type="range" min={200} max={600} step={20} value={state.size} onChange={(e) => update("size", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.size - 200) / 400 * 100}%, var(--muted) ${(state.size - 200) / 400 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>200px</span><span>600px</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                Width for left/right drawers, height for top/bottom drawers.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "showOverlay" as const, l: "Show overlay backdrop" },
                { k: "closeOnOverlayClick" as const, l: "Close on overlay click" },
                { k: "closeOnEscape" as const, l: "Close on Escape key" },
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
                onClick={openDrawer}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <NavIcon className="h-3 w-3 text-brand-lemon" /> Open drawer
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-accent"
              >
                <X className="h-3 w-3 text-destructive" /> Close drawer
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.toggle("pointer")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                Toggle
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
            {activeTab === "html" && <CodeBlock code={'<div id="drawer-host"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".dr-panel {\n  /* Override tokens to retheme the drawer */\n  --dr-accent: #D9FF66;\n  --dr-surface: #211A30;\n  --dr-border: #383343;\n  --dr-text: #F4F1FF;\n  --dr-muted: #B8B2CA;\n}\n\n/* Wider panel for inspector layouts */\n.dr-side-right {\n  width: 480px !important;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Drawer {\n  constructor(container, options)\n  open(source?): void\n  close(source?): void\n  toggle(source?): void\n  isOpen(): boolean\n  setContent(content): void\n  setTitle(title): void\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   change\n\n// Options:\n//   side (top|bottom|left|right), size, open,\n//   showOverlay, closeOnOverlayClick, closeOnEscape,\n//   title, content"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Panel uses <code className="font-mono text-brand-lemon">role=&quot;dialog&quot;</code> with <code className="font-mono text-brand-lemon">aria-modal=&quot;true&quot;</code>.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />When <code className="font-mono text-brand-lemon">title</code> is set, it is used as the <code className="font-mono text-brand-lemon">aria-label</code> for screen readers.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The close button has <code className="font-mono text-brand-lemon">aria-label=&quot;Close&quot;</code> and a visible lemon focus ring.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Esc</kbd> closes the drawer when <code className="font-mono text-brand-lemon">closeOnEscape</code> is on.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Overlay state is reflected in <code className="font-mono text-brand-lemon">aria-hidden</code> for assistive tech.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Transitions respect <code className="font-mono text-brand-lemon">prefers-reduced-motion</code>.</li>
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
