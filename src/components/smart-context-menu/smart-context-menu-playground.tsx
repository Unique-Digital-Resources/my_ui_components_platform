"use client";

import * as React from "react";
import {
  RotateCcw,
  MousePointerClick,
  Check,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import {
  SmartContextMenuReact,
} from "./smart-context-menu-react";
import type { SmartContextMenu } from "@/lib/components/smart-context-menu";
import { registerBuiltinCommands, commandRegistry } from "@/lib/commands";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaygroundState {
  title: string;
  selectedCommandIds: string[];
}

const DEFAULT_COMMAND_IDS: string[] = [
  "edit.copy",
  "edit.paste",
  "edit.duplicate",
  "color-wheel.reset",
  "color-wheel.triangle",
  "color-wheel.disk",
  "global.search",
  "global.escape",
];

const DEFAULTS: PlaygroundState = {
  title: "Actions",
  selectedCommandIds: DEFAULT_COMMAND_IDS,
};

export function SmartContextMenuPlayground() {
  const meta = getComponent("smart-context-menu")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [lastSelected, setLastSelected] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const [registryVersion, setRegistryVersion] = React.useState(0);
  const instanceRef = React.useRef<SmartContextMenu | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Register the built-in commands on mount.
  React.useEffect(() => {
    registerBuiltinCommands();
    setRegistryVersion((v) => v + 1);
  }, []);

  const allCommands = React.useMemo(
    () => commandRegistry.list(),
    // Re-read when the registry version bumps.
    [registryVersion],
  );

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const toggleCommand = React.useCallback((id: string) => {
    setState((s) => {
      const has = s.selectedCommandIds.includes(id);
      const next = has
        ? s.selectedCommandIds.filter((x) => x !== id)
        : [...s.selectedCommandIds, id];
      return { ...s, selectedCommandIds: next };
    });
  }, []);

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setLastSelected(null);
    instanceRef.current?.setCommandIds(DEFAULTS.selectedCommandIds);
    instanceRef.current?.setTitle(DEFAULTS.title);
    instanceRef.current?.hide();
    toast.success("Reset to defaults");
  }, []);

  const onSelect = React.useCallback((commandId: string) => {
    setLastSelected(commandId);
    const cmd = commandRegistry.get(commandId);
    toast.success(`Selected: ${cmd?.label ?? commandId}`);
  }, []);

  const onHide = React.useCallback(() => {
    // No-op — could log if needed.
  }, []);

  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      instanceRef.current?.show(e.clientX, e.clientY);
    },
    [],
  );

  const openAtCenter = React.useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    instanceRef.current?.show(r.left + r.width / 2, r.top + r.height / 2);
  }, []);

  const openAtCorner = React.useCallback(
    (corner: "tl" | "tr" | "bl" | "br") => {
      const el = canvasRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = 8;
      const x =
        corner === "tl" || corner === "bl" ? r.left + pad : r.right - pad;
      const y =
        corner === "tl" || corner === "tr" ? r.top + pad : r.bottom - pad;
      instanceRef.current?.show(x, y);
    },
    [],
  );

  // ---- Code generation ----

  const jsCode = React.useMemo(
    () => generateJsCode(state, lastSelected),
    [state, lastSelected],
  );
  const htmlCode = React.useMemo(() => generateHtmlCode(), []);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

  const groupedCommands = React.useMemo(() => {
    const map = new Map<string, typeof allCommands>();
    for (const c of allCommands) {
      const cat = c.category ?? "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return Array.from(map.entries());
  }, [allCommands]);

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {meta.name}
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
                {meta.longDescription}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-lemon/30 bg-brand-lemon/10 px-2.5 py-1 text-[11px] font-mono text-brand-lemon">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />
                {meta.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Playground workspace */}
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Live preview */}
          <section
            aria-label="Live preview"
            className="panel relative flex h-[600px] flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-lemon animate-pulse" />
                <span className="eyebrow">Live canvas</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Live canvas — this div IS the bounds/container */}
            <SmartContextMenuReact
              commandIds={state.selectedCommandIds}
              title={state.title}
              onSelect={onSelect}
              onHide={onHide}
              instanceRef={instanceRef}
              className="relative flex-1 bg-grid"
            >
              <div
                ref={canvasRef}
                onContextMenu={handleContextMenu}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
                role="region"
                aria-label="Right-click to open the context menu"
              >
                <div className="pointer-events-none flex flex-col items-center gap-2 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
                    <MousePointerClick className="h-5 w-5 text-brand-lemon" />
                  </div>
                  <p className="text-[13px] font-medium text-foreground">
                    Right-click anywhere in this panel
                  </p>
                  <p className="max-w-sm text-[11px] text-muted-foreground">
                    The menu auto-positions to stay inside the panel. Try right-clicking near the
                    edges to see the flip behavior.
                  </p>
                </div>

                <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openAtCenter}
                    className="inline-flex h-8 items-center rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[12px] font-medium text-brand-lemon transition-colors hover:bg-brand-lemon/20"
                  >
                    Open at center
                  </button>
                  <button
                    type="button"
                    onClick={() => openAtCorner("tl")}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Top-left
                  </button>
                  <button
                    type="button"
                    onClick={() => openAtCorner("tr")}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Top-right
                  </button>
                  <button
                    type="button"
                    onClick={() => openAtCorner("bl")}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Bottom-left
                  </button>
                  <button
                    type="button"
                    onClick={() => openAtCorner("br")}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Bottom-right
                  </button>
                </div>
              </div>
            </SmartContextMenuReact>

            {/* Output section */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {state.selectedCommandIds.length} commands bound
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CopyableValue
                    label="lastSelected"
                    value={lastSelected ?? "(none)"}
                  />
                  {lastSelected && (
                    <CopyableValue
                      label="label"
                      value={commandRegistry.get(lastSelected)?.label ?? ""}
                    />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Right-click the canvas, then pick a command. Escape, click-outside, or selecting
                  an item hides the menu. Arrow keys navigate; Enter selects.
                </p>
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/smart-context-menu-AGENT.md"
            skillPath="/docs/components/smart-context-menu-SKILL.md"
          >
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  Title
                </label>
                <input
                  type="text"
                  value={state.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="(no header)"
                  className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Optional header shown above the items. Leave empty for no header.
                </p>
              </div>

              <div className="h-px bg-border" />

              {/* Command multi-select */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Commands
                  </h3>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {state.selectedCommandIds.length} / {allCommands.length}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {groupedCommands.map(([cat, cmds]) => (
                    <div key={cat} className="rounded-md border border-border bg-muted/10">
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                          {cat}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">
                          {cmds.filter((c) => state.selectedCommandIds.includes(c.id)).length}/
                          {cmds.length}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-0.5 px-1 pb-1.5">
                        {cmds.map((c) => {
                          const checked = state.selectedCommandIds.includes(c.id);
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => toggleCommand(c.id)}
                                aria-pressed={checked}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors",
                                  checked
                                    ? "bg-brand-lemon/10 text-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    checked
                                      ? "border-brand-lemon bg-brand-lemon text-[#17151D]"
                                      : "border-border",
                                  )}
                                >
                                  {checked && <Check className="h-3 w-3" />}
                                </span>
                                <span className="flex-1 truncate font-mono text-[11px]">
                                  {c.label}
                                </span>
                                <span className="truncate font-mono text-[10px] text-muted-foreground/60">
                                  {c.id}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
          </AgentSkillTabs>
        </div>

        {/* Code panel */}
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "relative h-9 px-3 text-[12px] font-medium transition-colors focus-visible:outline-none",
                    activeTab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {activeTab === key && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
                </button>
              ))}
            </div>
            <span className="pr-2 text-[11px] font-mono text-muted-foreground/70">
              Synchronized with live configuration
            </span>
          </div>
          <div className="p-4">
            {activeTab === "javascript" && <CodeBlock code={jsCode} language="javascript" filename="init.js" />}
            {activeTab === "html" && <CodeBlock code={htmlCode} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={cssCode} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={apiCode} language="typescript" filename="api.ts" />}
          </div>
        </section>

        {/* Documentation */}
        <ComponentDocumentation />
      </div>
    </div>
  );
}

// ---- Code generators ----

function generateJsCode(state: PlaygroundState, lastSelected: string | null): string {
  const ids = state.selectedCommandIds.length > 0
    ? state.selectedCommandIds.map((id) => `  "${id}"`).join(",\n")
    : "  // (no commands selected)";
  return `import { SmartContextMenu } from "@workshop/smart-context-menu";
import { registerBuiltinCommands, commandRegistry } from "@/lib/commands";

// Register the platform commands once on app init.
registerBuiltinCommands();

const container = document.querySelector("#canvas");
const menu = new SmartContextMenu(container, {
  bounds: container,
  commandIds: [
${ids}
  ],
  title: ${JSON.stringify(state.title)},
});

menu.on("select", (commandId) => {
  const cmd = commandRegistry.get(commandId);
  console.log("selected:", commandId, cmd?.label);
});

menu.on("hide", () => {
  console.log("menu hidden");
});

// Open the menu at the cursor position on right-click.
container.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  menu.show(e.clientX, e.clientY);
});

// Or open programmatically at any viewport coordinate.
// menu.show(400, 300);

// Dynamically swap the visible commands at runtime.
// menu.setCommandIds(["edit.copy", "edit.paste"]);
// menu.setTitle("Edit");

// Hide / destroy.
// menu.hide();
// menu.destroy();${lastSelected ? `\n\n// Last selected: ${lastSelected}` : ""}`;
}

function generateHtmlCode(): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="smart-context-menu.css" /></head>
  <body>
    <div id="canvas" style="position: relative; width: 600px; height: 400px;">
      <!-- Right-click anywhere inside this element -->
      <p>Right-click to open the menu</p>
    </div>
    <script type="module" src="init.js"></script>
  </body>
</html>`;
}

function generateCssCode(): string {
  return `/* The component ships its own scoped styles (.smart-context-menu-* prefix).
   Override the visual tokens below to customize appearance. */

:root {
  --brand-lemon: #D9FF66;
  --brand-lemon-hover: #C8F34F;
  --popover: #1A1422;
  --popover-foreground: #F4F1FF;
  --border: #383343;
  --accent: #342348;
  --muted-foreground: #B8B2CA;
}

/* The accent ring color used on the active/hovered item. */
.smart-context-menu {
  --cm-accent: var(--brand-lemon);
}

/* Example: make the menu wider. */
/* .smart-context-menu { min-width: 240px; max-width: 320px; } */

/* Example: change the active-item background. */
.smart-context-menu__item--active {
  background: rgba(217, 255, 102, 0.14);
  color: var(--brand-lemon);
}`;
}

function generateApiCode(): string {
  return `interface SmartContextMenuOptions {
  /** The container element that bounds the menu (menu won't overflow this). */
  bounds: HTMLElement;
  /** Command IDs to show as menu items. */
  commandIds: string[];
  /** Optional title for the menu header. */
  title?: string;
}

class SmartContextMenu {
  constructor(container: HTMLElement, options: SmartContextMenuOptions);

  /** Show the menu at a viewport-relative (clientX, clientY) position. */
  show(x: number, y: number): void;

  /** Hide the menu. */
  hide(): void;

  /** Whether the menu is currently visible. */
  isVisible(): boolean;

  /** Swap the visible commands at runtime. */
  setCommandIds(ids: string[]): void;

  /** Update the optional header title (pass undefined to remove). */
  setTitle(title: string | undefined): void;

  on(event: "select", handler: (commandId: string) => void): void;
  on(event: "hide", handler: () => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "select" — fires when the user clicks an enabled item. Carries the command ID.
//   "hide"   — fires when the menu is closed (escape, click outside, or selection).

// Smart positioning
//   On show(x, y), the menu auto-positions to stay inside the bounds element:
//     - If x + width > bounds.right, the menu flips left (x - width).
//     - If that still overflows left, it clamps to bounds.left + gap.
//     - Same logic vertically: flips up, then clamps to bounds.top.
//   The menu uses position: absolute inside the container (the container is
//   made position: relative if it was static).

// Keyboard
//   Arrow Up / Down  — move the active item
//   Enter / Space    — select the active item
//   Escape           — hide the menu
//   Tab / Shift+Tab  — cycle the active item`;
}

// ---- Documentation ----

function ComponentDocumentation() {
  const meta = getComponent("smart-context-menu")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Smart Context Menu is a framework-independent vanilla JavaScript component — no
          React or Next.js required. It renders command items from the shared command registry.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} Each menu item renders a command&apos;s label, optional Lucide-style
            icon, and optional keyboard shortcut (as styled <code className="font-mono text-brand-lemon">kbd</code> elements). On
            show, the menu measures its natural size and flips/clamps to stay within the bounds
            element so it never overflows the live canvas. Disabled commands are visually muted and
            not clickable.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">When to use it</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {meta.whenToUse.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">When not to use it</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {meta.whenNotToUse.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Properties and defaults</h3>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Property</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Type</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Default</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {meta.properties.map((p) => (
                  <tr key={p.name}>
                    <td className="px-3 py-2 font-mono text-brand-lemon">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{p.type}</td>
                    <td className="px-3 py-2 font-mono text-foreground">{p.default}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Methods</h3>
          <div className="mt-3 space-y-2">
            {meta.methods.map((m) => (
              <div key={m.signature} className="rounded-md border border-border bg-muted/20 p-3">
                <code className="font-mono text-[12px] text-brand-lemon">{m.signature}</code>
                <p className="mt-1 text-[13px] text-muted-foreground">{m.description}</p>
                {m.returns && (
                  <p className="mt-0.5 text-[11px] font-mono text-muted-foreground/70">
                    returns: {m.returns}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Events</h3>
          <div className="mt-3 space-y-2">
            {meta.events.map((e) => (
              <div key={e.name} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <code className="font-mono text-[12px] text-brand-lemon">{e.name}</code>
                  <code className="font-mono text-[11px] text-muted-foreground">{e.payload}</code>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{e.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Smart positioning</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            On <code className="font-mono text-brand-lemon">show(x, y)</code>, the menu:
          </p>
          <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Measures its natural width/height while invisible.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Translates the viewport-relative x/y into container-relative coordinates.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />If <code className="font-mono text-brand-lemon">x + width &gt; bounds.right</code>, flips left (x - width). If that still overflows left, clamps to <code className="font-mono text-brand-lemon">bounds.left + gap</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Same logic vertically: flip up, then clamp to <code className="font-mono text-brand-lemon">bounds.top + gap</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Uses <code className="font-mono text-brand-lemon">position: absolute</code> inside the container (made <code className="font-mono text-brand-lemon">relative</code> if it was static).</li>
          </ol>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Accessibility</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The menu has <code className="font-mono text-brand-lemon">role=&quot;menu&quot;</code> and toggles <code className="font-mono text-brand-lemon">aria-hidden</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Each item has <code className="font-mono text-brand-lemon">role=&quot;menuitem&quot;</code> and disabled items set <code className="font-mono text-brand-lemon">aria-disabled</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow Up/Down move the active item; Enter/Space select it; Escape closes.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The shortcut badge has an <code className="font-mono text-brand-lemon">aria-label</code> for screen readers.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Click-outside and the window blur event hide the menu.</li>
          </ul>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "When to use it", "When not to use it", "Properties and defaults", "Methods", "Events", "Smart positioning", "Accessibility"].map((s) => (
              <a
                key={s}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="block rounded px-2 py-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
              >
                {s}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
