"use client";

import * as React from "react";
import {
  RotateCcw,
  Droplet,
  SunMedium,
  Contrast,
  Blend,
  ArrowLeftRight,
  ArrowUpDown,
  Circle,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs, CollapsibleSection } from "@/components/platform/agent-skill-tabs";
import { CustomButtonPropsEditor, type CustomButtonProps } from "@/components/platform/custom-button-props-editor";
import {
  ColorRangeReact,
  type ColorRangeMode,
  type ColorRangeOrientation,
  type ColorRangeValueOutput,
} from "./color-range-react";
import type { ColorRange } from "@/lib/components/color-range";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODES: {
  value: ColorRangeMode;
  label: string;
  icon: React.ElementType;
  hint: string;
}[] = [
  { value: "hue", label: "Hue", icon: Droplet, hint: "0–360° full spectrum" },
  { value: "lightness", label: "Lightness", icon: SunMedium, hint: "black → color → white" },
  { value: "contrast", label: "Contrast", icon: Contrast, hint: "color mix toward black/white" },
  { value: "alpha", label: "Alpha", icon: Blend, hint: "transparent → opaque" },
];

interface PlaygroundState {
  mode: ColorRangeMode;
  value: number;
  color: string;
  orientation: ColorRangeOrientation;
  thickness: number;
  length: number;
}

const DEFAULTS: PlaygroundState = {
  mode: "hue",
  value: 210,
  color: "#4287f5",
  orientation: "horizontal",
  thickness: 16,
  length: 280,
};

function defaultValueForMode(mode: ColorRangeMode): number {
  switch (mode) {
    case "hue": return 210;
    case "lightness": return 50;
    case "contrast": return 50;
    case "alpha": return 1;
  }
}

export function ColorRangePlayground() {
  const meta = getComponent("color-range")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [out, setOut] = React.useState<ColorRangeValueOutput | null>(null);
  const [hexInput, setHexInput] = React.useState(DEFAULTS.color);
  const [hexError, setHexError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const instanceRef = React.useRef<ColorRange | null>(null);

  // CustomButton thumb props — host-specific defaults
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

  const onInput = React.useCallback((v: ColorRangeValueOutput) => {
    setOut(v);
  }, []);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const changeMode = React.useCallback(
    (mode: ColorRangeMode) => {
      setState((s) => ({ ...s, mode, value: defaultValueForMode(mode) }));
    },
    [],
  );

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setHexInput(DEFAULTS.color);
    setHexError(null);
    toast.success("Reset to defaults");
  }, []);

  const applyHex = React.useCallback(
    (value: string) => {
      setHexInput(value);
      if (!/^#?[0-9a-fA-F]{6}$/.test(value.replace(/^#/, ""))) {
        setHexError("Enter a 6-digit hex color, e.g. #4287f5");
        return;
      }
      setHexError(null);
      update("color", value.startsWith("#") ? value : `#${value}`);
    },
    [update],
  );

  const labelStr = out?.label ?? formatLabel(state.mode, state.value);
  // The result color from the component (the actual color produced by the
  // current mode + value applied to the base color). Falls back to a
  // computed value before the first `input` event fires.
  const resultColor = out?.color ?? null;

  // Code generation
  const jsCode = React.useMemo(() => generateJsCode(state), [state]);
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
              {/* The actual vanilla JS component, mounted via React wrapper */}
              <ColorRangeReact
                mode={state.mode}
                value={state.value}
                color={state.color}
                orientation={state.orientation}
                thickness={state.thickness}
                length={state.length}
                onInput={onInput}
                instanceRef={instanceRef}
              />
            </div>
            {/* Output section — result color + values in the live canvas */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{
                      backgroundColor: resultColor?.rgba ?? state.color,
                      backgroundImage:
                        state.mode === "alpha"
                          ? "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)"
                          : undefined,
                      backgroundSize:
                        state.mode === "alpha" ? "6px 6px" : undefined,
                      backgroundPosition:
                        state.mode === "alpha"
                          ? "0 0,0 3px,3px -3px,-3px 0"
                          : undefined,
                    }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[12px] text-foreground">
                    {resultColor?.hex ?? state.color}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <CopyableValue label="HEX" value={resultColor?.hex ?? state.color} />
                <CopyableValue label="RGBA" value={resultColor?.rgba ?? `rgba(66,135,245,1)`} />
                <CopyableValue
                  label="Value"
                  value={labelStr}
                />
                <CopyableValue
                  label="Mode"
                  value={state.mode}
                />
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/color-range-AGENT.md"
            skillPath="/docs/components/color-range-SKILL.md"
          >
              {/* Mode */}
              <PropertyField
                label="Mode"
                hint="Which color dimension the track represents"
              >
                <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {MODES.map((m) => {
                    const Icon = m.icon;
                    const active = state.mode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => changeMode(m.value)}
                        title={m.hint}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </PropertyField>

              {/* Orientation */}
              <PropertyField
                label="Orientation"
                hint="Track direction"
              >
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
              <PropertyField
                label="Thickness"
                hint="Track thickness (px)"
                value={`${state.thickness} px`}
              >
                <RangeInput
                  min={6}
                  max={48}
                  step={1}
                  value={state.thickness}
                  onChange={(v) => update("thickness", v)}
                />
              </PropertyField>

              {/* Length */}
              <PropertyField
                label="Length"
                hint="Track length (px)"
                value={`${state.length} px`}
              >
                <RangeInput
                  min={80}
                  max={420}
                  step={2}
                  value={state.length}
                  onChange={(v) => update("length", v)}
                />
              </PropertyField>

              {/* Base color (for lightness/contrast/alpha) */}
              <PropertyField
                label="Base color"
                hint="Used by lightness, contrast, and alpha modes"
                error={hexError}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-9 w-9 shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: state.color }}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => applyHex(e.target.value)}
                    spellCheck={false}
                    className={cn(
                      "h-9 flex-1 rounded-md border bg-background px-2.5 font-mono text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      hexError ? "border-destructive" : "border-border"
                    )}
                    aria-invalid={!!hexError}
                  />
                </div>
              </PropertyField>

              {/* Reused component: CustomButton (thumb) */}
              <CollapsibleSection title="CustomButton (thumb)" icon={Circle}>
                <CustomButtonPropsEditor instances={[
                  { name: "Thumb", defaults: thumbDefaults, current: thumbProps, onChange: onThumbChange, overriddenProps: thumbOverrides },
                ]} />
              </CollapsibleSection>
          </AgentSkillTabs>
        </div>

        {/* Code panel */}
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {(
                [
                  ["javascript", "JavaScript"],
                  ["html", "HTML"],
                  ["css", "CSS"],
                  ["api", "API"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "relative h-9 px-3 text-[12px] font-medium transition-colors focus-visible:outline-none",
                    activeTab === key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {activeTab === key && (
                    <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />
                  )}
                </button>
              ))}
            </div>
            <span className="pr-2 text-[11px] font-mono text-muted-foreground/70">
              Synchronized with live configuration
            </span>
          </div>
          <div className="p-4">
            {activeTab === "javascript" && (
              <CodeBlock code={jsCode} language="javascript" filename="init.js" />
            )}
            {activeTab === "html" && (
              <CodeBlock code={htmlCode} language="html" filename="index.html" />
            )}
            {activeTab === "css" && (
              <CodeBlock code={cssCode} language="css" filename="styles.css" />
            )}
            {activeTab === "api" && (
              <CodeBlock code={apiCode} language="typescript" filename="api.ts" />
            )}
          </div>
        </section>

        {/* Documentation */}
        <ComponentDocumentation />
      </div>
    </div>
  );
}

function formatLabel(mode: ColorRangeMode, value: number): string {
  if (mode === "hue") return `${Math.round(value)}°`;
  if (mode === "alpha") return value.toFixed(2);
  return `${Math.round(value)}%`;
}

function PropertyField({
  label,
  hint,
  value,
  error,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[12px] font-medium text-foreground">{label}</label>
        {value && (
          <span className="font-mono text-[11px] text-brand-lemon">{value}</span>
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
}

function RangeInput({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-brand-lemon"
        style={{
          background: `linear-gradient(to right, var(--brand-lemon) 0%, var(--brand-lemon) ${
            ((value - min) / (max - min)) * 100
          }%, var(--muted) ${((value - min) / (max - min)) * 100}%, var(--muted) 100%)`,
        }}
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-14 rounded-md border border-border bg-background px-1.5 text-center font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

// ---- Code generators ----

function generateJsCode(state: PlaygroundState): string {
  return `import { ColorRange } from "@workshop/color-range";

const container = document.querySelector("#color-range");

const range = new ColorRange(container, {
  mode: "${state.mode}",
  value: ${state.value},
  color: "${state.color}",
  orientation: "${state.orientation}",
  thickness: ${state.thickness},
  length: ${state.length},
});

range.on("input", ({ mode, value, label }) => {
  // Fires continuously while dragging
  console.log(mode, value, label);
});

range.on("change", ({ mode, value, label }) => {
  // Fires when the selection is committed
  console.log("committed:", mode, value, label);
});

// Programmatic control
// range.setValue(120);
// range.setMode("alpha");
// range.setColor("#ff6600");
// range.setOrientation("vertical");
// range.destroy();`;
}

function generateHtmlCode(state: PlaygroundState): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="color-range.css" />
  </head>
  <body>
    <!-- The range mounts into this container -->
    <div id="color-range"></div>

    <script type="module" src="init.js"></script>
  </body>
</html>

<!-- Default configuration used above:
  mode:        "${state.mode}"
  value:       ${state.value}
  color:       "${state.color}"
  orientation: "${state.orientation}"
  thickness:   ${state.thickness}px
  length:      ${state.length}px
-->`;
}

function generateCssCode(): string {
  return `/* The component ships with safe defaults.
   Override these CSS custom properties to theme it. */

:root {
  --color-range-focus-ring: rgba(217, 255, 102, 0.55);
}

.color-range {
  display: inline-block;
  position: relative;
}

.color-range canvas {
  display: block;
  touch-action: none;
  outline: none;
  cursor: pointer;
  border-radius: 8px;
}

.color-range canvas:focus-visible {
  box-shadow: 0 0 0 3px var(--color-range-focus-ring);
}`;
}

function generateApiCode(): string {
  return `// Public API

type ColorRangeMode = "hue" | "lightness" | "contrast" | "alpha";
type ColorRangeOrientation = "horizontal" | "vertical";

interface ColorRangeValueOutput {
  mode: ColorRangeMode;
  value: number;      // 0..360 for hue, 0..100 for lightness/contrast, 0..1 for alpha
  label: string;      // human-readable, e.g. "210°" / "45%" / "0.80"
}

interface ColorRangeOptions {
  mode?: ColorRangeMode;        // default "hue"
  value?: number;               // default: mode-dependent
  color?: string;               // default "#4287f5" (hex)
  orientation?: ColorRangeOrientation; // default "horizontal"
  thickness?: number;           // default 16
  length?: number;              // default 260
}

class ColorRange {
  constructor(container: HTMLElement, options?: ColorRangeOptions);
  getValue(): number;
  getValueOutput(): ColorRangeValueOutput;
  setValue(value: number): void;
  setMode(mode: ColorRangeMode): void;
  setColor(color: string): void;
  setOrientation(orientation: ColorRangeOrientation): void;
  setThickness(n: number): void;
  setLength(n: number): void;
  on(event: "input" | "change", handler: (v: ColorRangeValueOutput) => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "input"  — fires continuously during pointer drag
//   "change" — fires when the selection is committed (pointer up / keyboard)`;
}

// ---- Documentation section ----

function ComponentDocumentation() {
  const meta = getComponent("color-range")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Color Range is a framework-independent vanilla JavaScript
          component — no React or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} Each mode renders the appropriate gradient
            along a 1D track: hue shows the full spectrum, lightness ramps
            black → base color → white, contrast mixes toward black or white,
            and alpha composites over a checkerboard.
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
          <h3 className="text-lg font-semibold">Accessibility</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The canvas is keyboard-focusable with role=&quot;slider&quot;.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow Left/Down decrease, Arrow Right/Up increase (Shift = 10× steps).</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Home jumps to the minimum, End to the maximum.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />aria-valuenow / aria-valuetext expose the current value to assistive tech.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Styling and customization</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The component is self-contained and ships with safe defaults. Host
            applications can override its CSS custom properties (prefixed with
            <code className="mx-1 font-mono text-brand-lemon">--color-range-</code>)
            to adjust the focus ring.
          </p>
        </section>
      </div>

      {/* Right-hand TOC */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "When to use it", "When not to use it", "Properties and defaults", "Methods", "Events", "Accessibility", "Styling and customization"].map((s) => (
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
