"use client";

import * as React from "react";
import {
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { SmartTooltip } from "@/lib/components/smart-tooltip";
import type { SmartTooltipPosition } from "@/lib/components/smart-tooltip";
import { registerBuiltinCommands, commandRegistry } from "@/lib/commands";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaygroundState {
  commandId: string;
  position: SmartTooltipPosition;
}

const DEFAULTS: PlaygroundState = {
  commandId: "color-wheel.reset",
  position: "top",
};

interface HoverTarget {
  id: string;
  label: string;
  commandId: string;
  area: string; // tailwind classes for placement within the canvas
}

const DEFAULT_TARGETS: HoverTarget[] = [
  { id: "tl", label: "Top-Left", commandId: "edit.copy", area: "top-[14%] left-[12%]" },
  { id: "tr", label: "Top-Right", commandId: "edit.paste", area: "top-[14%] right-[12%]" },
  { id: "c", label: "Center", commandId: "color-wheel.reset", area: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" },
  { id: "bl", label: "Bottom-Left", commandId: "global.search", area: "bottom-[14%] left-[12%]" },
  { id: "br", label: "Bottom-Right", commandId: "global.escape", area: "bottom-[14%] right-[12%]" },
];

const POSITION_OPTIONS: { value: SmartTooltipPosition; label: string; icon: typeof ArrowUp }[] = [
  { value: "top", label: "Top", icon: ArrowUp },
  { value: "bottom", label: "Bottom", icon: ArrowDown },
  { value: "left", label: "Left", icon: ArrowLeft },
  { value: "right", label: "Right", icon: ArrowRight },
];

export function SmartTooltipPlayground() {
  const meta = getComponent("smart-tooltip")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [targets, setTargets] = React.useState<HoverTarget[]>(DEFAULT_TARGETS.map((t) => ({ ...t })));
  const [lastHovered, setLastHovered] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const [registryVersion, setRegistryVersion] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const targetRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const instancesRef = React.useRef<SmartTooltip[]>([]);
  const targetsRef = React.useRef(targets);
  targetsRef.current = targets;

  // Capture initial props for the create-once effect.
  const initialCommandIdRef = React.useRef(state.commandId);
  const initialPositionRef = React.useRef<SmartTooltipPosition>(state.position);

  // Register the built-in commands on mount.
  React.useEffect(() => {
    registerBuiltinCommands();
    setRegistryVersion((v) => v + 1);
  }, []);

  // Create one tooltip instance per hoverable target.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const instances: SmartTooltip[] = [];
    for (let i = 0; i < targetRefs.current.length; i++) {
      const target = targetRefs.current[i];
      if (!target) continue;
      const cmdId = targetsRef.current[i]?.commandId ?? initialCommandIdRef.current;
      const inst = new SmartTooltip(container, {
        bounds: container,
        commandId: cmdId,
        position: initialPositionRef.current,
      });
      inst.attachTo(target);
      const onShow = () => setLastHovered(targetsRef.current[i]?.commandId ?? cmdId);
      inst.on("show", onShow);
      instances.push(inst);
    }
    instancesRef.current = instances;
    return () => {
      instances.forEach((i) => i.destroy());
      instancesRef.current = [];
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward position changes to all instances.
  React.useEffect(() => {
    instancesRef.current.forEach((i) => i.setPosition(state.position));
  }, [state.position]);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const setTargetCommandId = React.useCallback((index: number, id: string) => {
    setTargets((cur) => cur.map((t, i) => (i === index ? { ...t, commandId: id } : t)));
    const inst = instancesRef.current[index];
    if (!inst) return;
    inst.setCommandId(id);
    setLastHovered(id);
  }, []);

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setTargets(DEFAULT_TARGETS.map((t) => ({ ...t })));
    DEFAULT_TARGETS.forEach((t, i) => {
      instancesRef.current[i]?.setCommandId(t.commandId);
    });
    instancesRef.current.forEach((i) => i.setPosition(DEFAULTS.position));
    setLastHovered(null);
    toast.success("Reset to defaults");
  }, []);

  const allCommands = React.useMemo(
    () => commandRegistry.list(),
    [registryVersion],
  );

  // ---- Code generation ----

  const jsCode = React.useMemo(
    () => generateJsCode(state, targets, lastHovered),
    [state, targets, lastHovered],
  );
  const htmlCode = React.useMemo(() => generateHtmlCode(), []);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

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
            <div
              ref={containerRef}
              className="relative flex-1 bg-grid"
            >
              {targets.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  ref={(el) => { targetRefs.current[i] = el; }}
                  className={cn(
                    "absolute inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-sm transition-colors hover:border-brand-lemon/50 hover:text-brand-lemon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    t.area,
                  )}
                >
                  {t.label}
                </button>
              ))}
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/60">
                Hover any button — the tooltip flips if it would overflow the panel.
              </div>
            </div>

            {/* Output section */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {targets.length} hoverable targets
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CopyableValue
                    label="lastHovered"
                    value={lastHovered ?? "(none)"}
                  />
                  {lastHovered && (
                    <CopyableValue
                      label="label"
                      value={commandRegistry.get(lastHovered)?.label ?? ""}
                    />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Hover a button to show its tooltip. The position dropdown controls the preferred
                  side for the inspector-bound target only — each target keeps its own command.
                  Move the mouse away to hide.
                </p>
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/smart-tooltip-AGENT.md"
            skillPath="/docs/components/smart-tooltip-SKILL.md"
          >
              {/* Preferred position (applies to the inspector-bound target) */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  Position (inspector-bound target)
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {POSITION_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const active = state.position === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => update("position", o.value)}
                        aria-pressed={active}
                        title={o.label}
                        className={cn(
                          "flex items-center justify-center rounded px-1 py-2 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Applies to all targets. The tooltip auto-flips when the preferred side overflows.
                </p>
              </div>

              {/* Inspector-bound command selector */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  Inspector-bound command
                </label>
                <select
                  value={state.commandId}
                  onChange={(e) => update("commandId", e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {allCommands.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} — {c.id}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Bound to the center target on apply. Hover the center button to preview.
                </p>
                <button
                  type="button"
                  onClick={() => setTargetCommandId(2, state.commandId)}
                  className="mt-2 inline-flex h-7 items-center rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-2.5 text-[12px] font-medium text-brand-lemon transition-colors hover:bg-brand-lemon/20"
                >
                  Apply to center target
                </button>
              </div>

              <div className="h-px bg-border" />

              {/* Per-target command binding */}
              <section>
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Targets ({targets.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {targets.map((t, i) => (
                    <div
                      key={t.id}
                      className="rounded-md border border-border bg-muted/10 p-2"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[11px] text-foreground">{t.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{t.id}</span>
                      </div>
                      <select
                        value={t.commandId}
                        onChange={(e) => {
                          setTargetCommandId(i, e.target.value);
                        }}
                        className="h-7 w-full rounded-md border border-border bg-background px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {allCommands.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
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

function generateJsCode(state: PlaygroundState, targets: HoverTarget[], lastHovered: string | null): string {
  const targetLines = targets
    .map((t) => `  { id: "${t.id}", label: "${t.label}", commandId: "${t.commandId}" }`)
    .join(",\n");
  return `import { SmartTooltip } from "@workshop/smart-tooltip";
import { registerBuiltinCommands, commandRegistry } from "@/lib/commands";

// Register the platform commands once on app init.
registerBuiltinCommands();

const container = document.querySelector("#canvas");

const targets = [
${targetLines}
];

// Create one tooltip per hoverable target. Each attaches to its own element.
const tooltips = targets.map((t) => {
  const target = container.querySelector(\`[data-target="\${t.id}"]\`);
  const tip = new SmartTooltip(container, {
    bounds: container,
    commandId: t.commandId,
    position: ${JSON.stringify(state.position)},
  });
  tip.attachTo(target);
  tip.on("show", () => console.log("show:", t.commandId));
  tip.on("hide", () => console.log("hide:", t.commandId));
  return tip;
});

// Update the position at runtime:
// tooltips.forEach((t) => t.setPosition("bottom"));

// Or rebind a target to a different command:
// tooltips[0].setCommandId("edit.copy");

// Cleanup.
// tooltips.forEach((t) => t.destroy());${lastHovered ? `\n\n// Last hovered: ${lastHovered}` : ""}`;
}

function generateHtmlCode(): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="smart-tooltip.css" /></head>
  <body>
    <div id="canvas" style="position: relative; width: 600px; height: 400px;">
      <button data-target="tl">Top-Left</button>
      <button data-target="tr">Top-Right</button>
      <button data-target="c">Center</button>
      <button data-target="bl">Bottom-Left</button>
      <button data-target="br">Bottom-Right</button>
    </div>
    <script type="module" src="init.js"></script>
  </body>
</html>`;
}

function generateCssCode(): string {
  return `/* The component ships its own scoped styles (.smart-tooltip-* prefix).
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

/* The accent color used for the icon and shortcut kbd text. */
.smart-tooltip {
  --tt-accent: var(--brand-lemon);
}

/* Example: make the tooltip wider. */
/* .smart-tooltip { max-width: 320px; } */`;
}

function generateApiCode(): string {
  return `type SmartTooltipPosition = "top" | "bottom" | "left" | "right";

interface SmartTooltipOptions {
  /** The container element that bounds the tooltip. */
  bounds: HTMLElement;
  /** Command ID to display. */
  commandId: string;
  /** Position relative to the target element. Default "top". */
  position?: SmartTooltipPosition;
}

class SmartTooltip {
  constructor(container: HTMLElement, options: SmartTooltipOptions);

  /** Attach to a target element. mouseenter shows; mouseleave hides. */
  attachTo(target: HTMLElement): void;

  /** Detach from the current target (and hide). */
  detach(): void;

  /** Manually show the tooltip (still requires a target). */
  show(): void;

  /** Manually hide the tooltip. */
  hide(): void;

  /** Change the displayed command at runtime. */
  setCommandId(id: string): void;

  /** Change the preferred position. The tooltip auto-flips if the preferred
      side overflows the bounds. */
  setPosition(pos: SmartTooltipPosition): void;

  on(event: "show" | "hide", handler: () => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Smart positioning
//   On show, the tooltip:
//     1. Measures its natural width/height.
//     2. Computes the target rect (viewport) and converts to container-relative coords.
//     3. Places the tooltip on the preferred side (top/bottom/left/right) of the target.
//     4. If that side overflows the bounds, flips to the opposite side.
//     5. Clamps the non-primary axis so the tooltip stays inside the bounds.
//   The tooltip uses position: absolute inside the container (the container is
//   made position: relative if it was static).`;
}

// ---- Documentation ----

function ComponentDocumentation() {
  const meta = getComponent("smart-tooltip")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Smart Tooltip is a framework-independent vanilla JavaScript component — no React or
          Next.js required. It renders a command&apos;s label, description, and keyboard shortcut
          from the shared command registry.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} The tooltip attaches to a target element and shows on mouseenter
            (or focus). It renders the command&apos;s icon, bold label, optional description, and
            the keyboard shortcut as styled <code className="font-mono text-brand-lemon">kbd</code> badges.
            On show, the tooltip measures its natural size and flips to the opposite side if the
            preferred side would overflow the bounds, then clamps to stay inside.
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
          <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Measures the tooltip&apos;s natural width/height while invisible.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Computes the target rect (viewport) and converts to container-relative coordinates.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Places the tooltip on the preferred side (top/bottom/left/right) of the target.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />If that side overflows the bounds, flips to the opposite side.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Clamps the non-primary axis so the tooltip stays inside the bounds.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Uses <code className="font-mono text-brand-lemon">position: absolute</code> inside the container (made <code className="font-mono text-brand-lemon">relative</code> if it was static).</li>
          </ol>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Accessibility</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The tooltip has <code className="font-mono text-brand-lemon">role=&quot;tooltip&quot;</code> and toggles <code className="font-mono text-brand-lemon">aria-hidden</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Shows on both <code className="font-mono text-brand-lemon">mouseenter</code> and <code className="font-mono text-brand-lemon">focus</code>, so keyboard users see it too.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Hides on <code className="font-mono text-brand-lemon">mouseleave</code> and <code className="font-mono text-brand-lemon">blur</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The shortcut badge has an <code className="font-mono text-brand-lemon">aria-label</code> for screen readers.</li>
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
