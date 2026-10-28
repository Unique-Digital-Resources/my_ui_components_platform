"use client";

import * as React from "react";
import {
  RotateCcw,
  Triangle,
  Square,
  Circle,
  CircleSlash,
  Check,
  Copy,
  Maximize2,
} from "lucide-react";
import { getComponent, components } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { ColorWheelPickerReact, type Shape, type ColorOutput } from "./color-wheel-picker-react";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHAPES: { value: Shape; label: string; icon: React.ElementType }[] = [
  { value: "triangle", label: "Triangle", icon: Triangle },
  { value: "square", label: "Square", icon: Square },
  { value: "disk", label: "Disk", icon: Circle },
  { value: "none", label: "None", icon: CircleSlash },
];

interface PlaygroundState {
  shape: Shape;
  size: number;
  wheelThickness: number;
  wheelSpacing: number;
  color: string;
  rotateShape: boolean;
}

const DEFAULTS: PlaygroundState = {
  shape: "triangle",
  size: 180,
  wheelThickness: 24,
  wheelSpacing: 8,
  color: "#4287f5",
  rotateShape: false,
};

export function ColorWheelPlayground() {
  const meta = getComponent("color-wheel")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [color, setColor] = React.useState<ColorOutput | null>(null);
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const [hexInput, setHexInput] = React.useState(DEFAULTS.color);
  const [hexError, setHexError] = React.useState<string | null>(null);

  const onInput = React.useCallback((c: ColorOutput) => {
    setColor(c);
    setHexInput(c.hex);
    setHexError(null);
  }, []);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    []
  );

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setHexInput(DEFAULTS.color);
    setHexError(null);
    toast.success("Reset to defaults");
  }, []);

  // Sync hex input field with component color
  const applyHex = React.useCallback((value: string) => {
    setHexInput(value);
    try {
      // Validate by attempting to set
      if (!/^#?[0-9a-fA-F]{6}$/.test(value.replace(/^#/, ""))) {
        setHexError("Enter a 6-digit hex color, e.g. #4287f5");
        return;
      }
      setHexError(null);
      update("color", value.startsWith("#") ? value : `#${value}`);
    } catch {
      setHexError("Invalid color value");
    }
  }, [update]);

  const rgbStr = color ? `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})` : "—";
  const hsvStr = color
    ? `${Math.round(color.hsv.h)}°, ${Math.round(color.hsv.s)}%, ${Math.round(color.hsv.v)}%`
    : "—";
  const hslStr = color
    ? `${Math.round(color.hsl.h)}°, ${Math.round(color.hsl.s)}%, ${Math.round(color.hsl.l)}%`
    : "—";

  // Code generation — reflects current configuration
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
              <ColorWheelPickerReact
                shape={state.shape}
                size={state.size}
                wheelThickness={state.wheelThickness}
                wheelSpacing={state.wheelSpacing}
                color={state.color}
                rotateShape={state.rotateShape}
                onInput={onInput}
              />
            </div>
            {/* Output section — color values represented in the live canvas */}
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: color?.hex ?? state.color }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[12px] text-foreground">
                    {color?.hex ?? state.color}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <CopyableValue label="HEX" value={color?.hex ?? "#4287f5"} />
                <CopyableValue label="RGB" value={rgbStr} />
                <CopyableValue label="HSV" value={hsvStr} />
                <CopyableValue label="HSL" value={hslStr} />
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/color-wheel-AGENT.md"
            skillPath="/docs/components/color-wheel-SKILL.md"
          >
              {/* Inner shape */}
              <PropertyField
                label="Inner shape"
                hint="The geometry of the inner selection area"
              >
                <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {SHAPES.map((s) => {
                    const Icon = s.icon;
                    const active = state.shape === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update("shape", s.value)}
                        title={s.label}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded px-2 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </PropertyField>

              {/* Inner size */}
              <PropertyField
                label="Inner size"
                hint="Diameter of the inner shape (px)"
                value={`${state.size} px`}
              >
                <RangeInput
                  min={100}
                  max={280}
                  step={2}
                  value={state.size}
                  onChange={(v) => update("size", v)}
                />
              </PropertyField>

              {/* Wheel thickness */}
              <PropertyField
                label="Wheel thickness"
                hint="Radial thickness of the hue ring (px)"
                value={`${state.wheelThickness} px`}
              >
                <RangeInput
                  min={12}
                  max={48}
                  step={1}
                  value={state.wheelThickness}
                  onChange={(v) => update("wheelThickness", v)}
                />
              </PropertyField>

              {/* Wheel spacing */}
              <PropertyField
                label="Wheel spacing"
                hint="Gap between the shape and the wheel (px)"
                value={`${state.wheelSpacing} px`}
              >
                <RangeInput
                  min={0}
                  max={24}
                  step={1}
                  value={state.wheelSpacing}
                  onChange={(v) => update("wheelSpacing", v)}
                />
              </PropertyField>

              {/* Color input */}
              <PropertyField
                label="Selected color"
                hint="Enter a hex value to set the color"
                error={hexError}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-9 w-9 shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: color?.hex ?? state.color }}
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

              {/* Rotate shape with hue */}
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-foreground">
                    Rotate shape with hue
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    Triangle tracks the wheel&apos;s hue position
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.rotateShape}
                  aria-label="Toggle rotate shape with hue"
                  onClick={() => update("rotateShape", !state.rotateShape)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state.rotateShape
                      ? "bg-brand-lemon"
                      : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform",
                      state.rotateShape ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
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

        {/* Documentation below the playground */}
        <ComponentDocumentation />
      </div>
    </div>
  );
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
        className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-muted accent-brand-lemon"
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
  const rotateLine = state.rotateShape ? `  rotateShape: true,\n` : "";
  return `import { ColorWheelPicker } from "@workshop/color-wheel";

const container = document.querySelector("#color-picker");

const picker = new ColorWheelPicker(container, {
  shape: "${state.shape}",
  size: ${state.size},
  wheelThickness: ${state.wheelThickness},
  wheelSpacing: ${state.wheelSpacing},
  color: "${state.color}",
${rotateLine}});

picker.on("input", ({ hex, rgb, hsv }) => {
  // Fires continuously while dragging
  console.log("dragging:", hex, rgb, hsv);
});

picker.on("change", ({ hex, rgb, hsv, hsl }) => {
  // Fires when the user commits a selection
  console.log("committed:", hex, rgb, hsv, hsl);
});

// Programmatic control
// picker.setColor("#ff6600");
// picker.setShape("square");
// picker.setSize(220);
// picker.setWheelThickness(32);
// picker.setRotateShape(true);
// picker.destroy();`;
}

function generateHtmlCode(state: PlaygroundState): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="color-wheel-picker.css" />
  </head>
  <body>
    <!-- The picker mounts into this container -->
    <div id="color-picker"></div>

    <script type="module" src="init.js"></script>
  </body>
</html>

<!-- Default configuration used above:
  shape:          "${state.shape}"
  size:           ${state.size}px
  wheelThickness: ${state.wheelThickness}px
  wheelSpacing:   ${state.wheelSpacing}px
  color:          "${state.color}"
-->`;
}

function generateCssCode(): string {
  return `/* The component ships with safe defaults.
   Override these CSS custom properties to theme it. */

:root {
  --color-picker-marker-border: #ffffff;
  --color-picker-marker-size: 14px;
  --color-picker-ring-width: 2px;
  --color-picker-cursor: crosshair;
  --color-picker-focus-ring: var(--brand-lemon, #d9ff66);
}

/* The canvas fills its container. Size the container to control
   the component size, or use the \`size\` option. */
.color-picker-host {
  display: inline-block;
  touch-action: none;
}

.color-picker-host canvas {
  display: block;
  border-radius: 50%;
  outline: none;
}

.color-picker-host canvas:focus-visible {
  box-shadow: 0 0 0 3px var(--color-picker-focus-ring);
}`;
}

function generateApiCode(): string {
  return `// Public API

type Shape = "triangle" | "square" | "disk" | "none";

interface ColorOutput {
  hex: string;                              // #RRGGBB
  rgb: { r: number; g: number; b: number }; // 0-255
  hsv: { h: number; s: number; v: number }; // h:0-360, s/v:0-100
  hsl: { h: number; s: number; l: number }; // h:0-360, s/l:0-100
}

interface ColorPickerOptions {
  shape?: Shape;           // default "triangle"
  size?: number;           // default 180
  wheelThickness?: number; // default 24
  wheelSpacing?: number;   // default 8
  hue?: number;            // default 210 (0-360)
  color?: string;          // default "#4287f5" (overrides hue)
  rotateShape?: boolean;   // default false
}

class ColorWheelPicker {
  constructor(container: HTMLElement, options?: ColorPickerOptions);
  setColor(color: string): void;
  getColor(): ColorOutput;
  setShape(shape: Shape): void;
  setSize(size: number): void;
  setWheelThickness(thickness: number): void;
  setWheelSpacing(spacing: number): void;
  setHue(hue: number): void;
  setRotateShape(rotate: boolean): void;
  on(event: "input" | "change", handler: (c: ColorOutput) => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "input"  — fires continuously during pointer drag
//   "change" — fires when the selection is committed (pointer up)`;
}

// ---- Documentation section ----

function ComponentDocumentation() {
  const meta = getComponent("color-wheel")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Color Wheel Picker is a framework-independent vanilla JavaScript
          component. The examples above show the actual public API — no React
          or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} The hue wheel represents the hue dimension,
            while the inner area controls saturation and value (or their
            shape-specific equivalents).
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
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The canvas is keyboard-focusable and supports arrow-key adjustment.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow Left/Right adjust hue (Shift = 10° steps).</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow Up/Down adjust value (Shift = 10 steps).</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Selection indicators use a contrasting border so they remain perceivable on any color.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Reduced-motion preferences are respected.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Styling and customization</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The component is self-contained and ships with safe defaults. Host
            applications can override its CSS custom properties (prefixed with
            <code className="mx-1 font-mono text-brand-lemon">--color-picker-</code>)
            to adjust marker appearance, cursor, and focus ring without
            modifying behavior.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Troubleshooting</h3>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">The picker doesn&apos;t render</p>
              <p className="text-[13px] text-muted-foreground">Ensure the container element exists and has non-zero size before constructing the picker. The component sizes its canvas to the container&apos;s content box.</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">Colors look wrong on a light background</p>
              <p className="text-[13px] text-muted-foreground">The wheel and inner gradients are drawn on a transparent canvas. Place the picker on a surface with sufficient contrast, or wrap it in a panel.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Right-hand TOC */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "When to use it", "When not to use it", "Properties and defaults", "Methods", "Events", "Accessibility", "Styling and customization", "Troubleshooting"].map((s) => (
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
