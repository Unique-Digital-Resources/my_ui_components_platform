"use client";

import * as React from "react";
import {
  RotateCcw,
  ArrowLeftRight,
  ArrowUpDown,
  Plus,
  X,
  Circle,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs, CollapsibleSection } from "@/components/platform/agent-skill-tabs";
import { CustomButtonPropsEditor, type CustomButtonProps } from "@/components/platform/custom-button-props-editor";
import {
  ColorRampReact,
  type RampOrientation,
  type RampStop,
} from "./color-ramp-react";
import type { ColorRamp } from "@/lib/components/color-ramp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaygroundState {
  orientation: RampOrientation;
  thickness: number;
  length: number;
}

const DEFAULTS: PlaygroundState = {
  orientation: "horizontal",
  thickness: 32,
  length: 320,
};

const DEFAULT_STOPS = [
  { position: 0, color: "#4287f5" },
  { position: 0.5, color: "#D9FF66" },
  { position: 1, color: "#ff6600" },
];

export function ColorRampPlayground() {
  const meta = getComponent("color-ramp")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [stops, setStops] = React.useState<RampStop[]>([]);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const instanceRef = React.useRef<ColorRamp | null>(null);

  // CustomButton thumb props — host-specific defaults for stop thumbs
  const thumbDefaults: CustomButtonProps = {
    text: "", icon: "", iconType: "icon", iconPosition: "left",
    variant: "thumb",
    size: "sm", disabled: false, fullWidth: false,
    width: 16, height: 16,
  };
  const thumbOverrides: Record<string, string> = {
    fullWidth: "always false for thumbs",
  };
  const [thumbProps, setThumbProps] = React.useState<CustomButtonProps>({ ...thumbDefaults });

  const onThumbChange = React.useCallback((props: CustomButtonProps) => {
    // When size changes, clear width/height so the size token controls dimensions
    const finalProps = props.size !== thumbProps.size
      ? { ...props, width: 0, height: 0 }
      : props;
    setThumbProps(finalProps);
    const inst = instanceRef.current;
    if (!inst) return;
    // Only apply props that actually changed — avoids re-setting width/height
    // after the size handler cleared them.
    (Object.keys(finalProps) as (keyof CustomButtonProps)[]).forEach((key) => {
      if (finalProps[key] === thumbProps[key]) return;
      if (thumbOverrides[key as string]) return;
      inst.setThumbProp(key, finalProps[key]);
    });
  }, [thumbProps, thumbOverrides]);

  const onInput = React.useCallback((s: RampStop[]) => {
    setStops(s);
  }, []);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    instanceRef.current?.setStops(DEFAULT_STOPS);
    toast.success("Reset to defaults");
  }, []);

  const addStop = React.useCallback(() => {
    instanceRef.current?.addStop(0.5);
  }, []);

  const removeStop = React.useCallback((i: number) => {
    instanceRef.current?.removeStop(i);
  }, []);

  // Code generation
  const jsCode = React.useMemo(() => generateJsCode(state, stops), [state, stops]);
  const htmlCode = React.useMemo(() => generateHtmlCode(state), [state]);
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
              <PageOverline>Components / Color</PageOverline>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
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
            <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-grid p-8">
              <ColorRampReact
                stops={DEFAULT_STOPS}
                orientation={state.orientation}
                thickness={state.thickness}
                length={state.length}
                onInput={onInput}
                instanceRef={instanceRef}
              />
            </div>
            {/* Output section — stops list */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Stops ({stops.length})</span>
                <button
                  type="button"
                  onClick={addStop}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-2.5 text-[12px] font-medium text-brand-lemon transition-colors hover:bg-brand-lemon/20"
                >
                  <Plus className="h-3 w-3" />
                  Add stop
                </button>
              </div>
              {/* Stop cards */}
              <div className="flex flex-wrap gap-2">
                {stops.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5"
                  >
                    <div
                      className="h-7 w-7 shrink-0 rounded border border-border"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] text-foreground">{s.color}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        pos {Math.round(s.position * 100)}%
                      </span>
                    </div>
                    {stops.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeStop(i)}
                        title="Remove stop"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/color-ramp-AGENT.md"
            skillPath="/docs/components/color-ramp-SKILL.md"
          >
              {/* Orientation */}
              <PropertyField label="Orientation" hint="Ramp direction">
                <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {([
                    { value: "horizontal", label: "Horizontal", icon: ArrowLeftRight },
                    { value: "vertical", label: "Vertical", icon: ArrowUpDown },
                  ] as const).map((o) => {
                    const Icon = o.icon;
                    const active = state.orientation === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => update("orientation", o.value)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded px-2 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </PropertyField>

              {/* Thickness */}
              <PropertyField label="Thickness" hint="Bar thickness (px)" value={`${state.thickness} px`}>
                <RangeInput min={8} max={80} step={1} value={state.thickness} onChange={(v) => update("thickness", v)} />
              </PropertyField>

              {/* Length */}
              <PropertyField label="Length" hint="Bar length (px)" value={`${state.length} px`}>
                <RangeInput min={80} max={500} step={2} value={state.length} onChange={(v) => update("length", v)} />
              </PropertyField>

              {/* Reused component: CustomButton (stop thumbs) */}
              <CollapsibleSection title="CustomButton (stop thumbs)" icon={Circle}>
                <CustomButtonPropsEditor instances={[
                  { name: "Stop Thumbs (class)", defaults: thumbDefaults, current: thumbProps, onChange: onThumbChange, overriddenProps: thumbOverrides },
                ]} />
              </CollapsibleSection>
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
                    activeTab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {activeTab === key && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
                </button>
              ))}
            </div>
            <span className="pr-2 text-[11px] font-mono text-muted-foreground/70">Synchronized with live configuration</span>
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

function PropertyField({ label, hint, value, children }: { label: string; hint?: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[12px] font-medium text-foreground">{label}</label>
        {value && <span className="font-mono text-[11px] text-brand-lemon">{value}</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function RangeInput({ min, max, step, value, onChange }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-brand-lemon"
        style={{ background: `linear-gradient(to right, var(--brand-lemon) 0%, var(--brand-lemon) ${((value - min) / (max - min)) * 100}%, var(--muted) ${((value - min) / (max - min)) * 100}%, var(--muted) 100%)` }}
      />
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-14 rounded-md border border-border bg-background px-1.5 text-center font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

// ---- Code generators ----

function generateJsCode(state: PlaygroundState, stops: RampStop[]): string {
  const stopsStr = stops.length > 0
    ? stops.map((s) => `  { position: ${s.position.toFixed(2)}, color: "${s.color}" }`).join(",\n")
    : "  { position: 0, color: \"#4287f5\" },\n  { position: 1, color: \"#ff6600\" }";
  return `import { ColorRamp } from "@workshop/color-ramp";

const container = document.querySelector("#color-ramp");

const ramp = new ColorRamp(container, {
  stops: [
${stopsStr}
  ],
  orientation: "${state.orientation}",
  thickness: ${state.thickness},
  length: ${state.length},
});

ramp.on("input", (stops) => {
  // Fires continuously while dragging a stop
  console.log(stops.map((s) => s.color));
});

ramp.on("change", (stops) => {
  // Fires when the change is committed
});

// Programmatic control
// ramp.addStop(0.25, "#ff0000");
// ramp.removeStop(1);
// ramp.setOrientation("vertical");
// ramp.destroy();`;
}

function generateHtmlCode(state: PlaygroundState): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="color-ramp.css" /></head>
  <body>
    <div id="color-ramp"></div>
    <script type="module" src="init.js"></script>
  </body>
</html>

<!-- Configuration:
  orientation: "${state.orientation}"
  thickness:   ${state.thickness}px
  length:      ${state.length}px
-->`;
}

function generateCssCode(): string {
  return `:root { --color-ramp-focus-ring: rgba(217,255,102,0.55); }
.color-ramp { display: inline-block; position: relative; }
.color-ramp canvas { display: block; touch-action: none; outline: none; cursor: pointer; border-radius: 8px; }
.color-ramp canvas:focus-visible { box-shadow: 0 0 0 3px var(--color-ramp-focus-ring); }`;
}

function generateApiCode(): string {
  return `type RampOrientation = "horizontal" | "vertical";

interface RampStop {
  id: number;
  position: number;  // 0–1
  color: string;     // hex
}

interface ColorRampOptions {
  stops?: { position: number; color: string }[];
  orientation?: RampOrientation;  // default "horizontal"
  thickness?: number;             // default 32
  length?: number;                // default 280
}

class ColorRamp {
  constructor(container: HTMLElement, options?: ColorRampOptions);
  getStops(): RampStop[];
  setStops(stops: { position: number; color: string }[]): void;
  addStop(position?: number, color?: string): number;
  removeStop(i: number): void;
  setOrientation(orientation: RampOrientation): void;
  setThickness(n: number): void;
  setLength(n: number): void;
  on(event: "input" | "change", handler: (stops: RampStop[]) => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "input"  — fires continuously during pointer drag
//   "change" — fires when the change is committed (pointer up / keyboard)

// Interaction:
//   - Click empty space on the bar → add a new stop at that position
//   - Drag a stop → reposition it (color is interpolated from neighbors)
//   - Remove stops via the API (keeps at least 2)`;
}

// ---- Documentation ----

function ComponentDocumentation() {
  const meta = getComponent("color-ramp")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Color Ramp is a framework-independent vanilla JavaScript component — no React or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} Click empty space on the bar to add a stop. Drag stops to reposition them. The gradient interpolates smoothly between all stops.
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
                {m.returns && <p className="mt-0.5 text-[11px] font-mono text-muted-foreground/70">returns: {m.returns}</p>}
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
          <h3 className="text-lg font-semibold">Accessibility</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The canvas is keyboard-focusable with role=&quot;application&quot;.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow Left/Down decrease, Arrow Right/Up increase the first stop&apos;s position (Shift = 10% steps).</li>
          </ul>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "When to use it", "When not to use it", "Properties and defaults", "Methods", "Events", "Accessibility"].map((s) => (
              <a key={s} href="#" onClick={(e) => e.preventDefault()} className="block rounded px-2 py-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent">{s}</a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
