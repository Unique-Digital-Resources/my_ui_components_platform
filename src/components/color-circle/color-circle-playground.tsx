"use client";

import * as React from "react";
import {
  RotateCcw,
  Circle,
  Divide,
  Shuffle,
  Triangle,
  Grid2x2,
  Split,
  Square,
  Layers,
  Link2,
  Link2Off,
  Magnet,
  Dot,
  Minus,
  Plus,
  X,
  Crown,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Brush,
  Sparkles,
  SunMedium,
  Droplets,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import {
  ColorCircleReact,
  type HarmonyRule,
  type GridMode,
  type ColorCircleOutput,
} from "./color-circle-react";
import type { ColorCircle } from "@/lib/components/color-circle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HARMONIES: {
  value: HarmonyRule;
  label: string;
  icon: React.ElementType;
  hint: string;
}[] = [
  { value: "custom", label: "Custom", icon: Brush, hint: "Each color independent — no constraints" },
  { value: "analogous", label: "Analogous", icon: Shuffle, hint: "Colors neighboring the base (±30°)" },
  { value: "complementary", label: "Complementary", icon: Divide, hint: "Base + opposite (180°)" },
  { value: "split-complementary", label: "Split Comp.", icon: Split, hint: "Base + 2 near complement" },
  { value: "triad", label: "Triad", icon: Triangle, hint: "3 hues at 120° intervals" },
  { value: "square", label: "Square", icon: Square, hint: "4 hues at 90° intervals" },
  { value: "compound", label: "Compound", icon: Sparkles, hint: "Mix of related & contrasting hues" },
  { value: "shades", label: "Shades", icon: SunMedium, hint: "Base hue, different darkness" },
  { value: "monochromatic", label: "Monochromatic", icon: Layers, hint: "One hue, varied saturation/lightness" },
];

const GRID_MODES: { value: GridMode; label: string; icon: React.ElementType }[] = [
  { value: "dots", label: "Dots", icon: Dot },
  { value: "lines", label: "Lines", icon: Minus },
];

interface PlaygroundState {
  harmony: HarmonyRule;
  size: number;
  snapping: boolean;
  gridMode: GridMode;
  gridDivisions: number;
  showHarmonyLinks: boolean;
}

const DEFAULTS: PlaygroundState = {
  harmony: "triad",
  size: 240,
  snapping: false,
  gridMode: "dots",
  gridDivisions: 12,
  showHarmonyLinks: true,
};

export function ColorCirclePlayground() {
  const meta = getComponent("color-circle")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [out, setOut] = React.useState<ColorCircleOutput | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const instanceRef = React.useRef<ColorCircle | null>(null);
  // Custom rule builder state
  const [customOffsets, setCustomOffsets] = React.useState<number[]>([0, 120, 240]);
  const [newOffset, setNewOffset] = React.useState<number>(60);

  const onInput = React.useCallback((o: ColorCircleOutput) => {
    setOut(o);
  }, []);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    instanceRef.current?.setHarmony(DEFAULTS.harmony);
    toast.success("Reset to defaults");
  }, []);

  const setBaseIndex = React.useCallback((i: number) => {
    instanceRef.current?.setBaseIndex(i);
  }, []);

  const removeColor = React.useCallback((i: number) => {
    instanceRef.current?.removeColor(i);
  }, []);

  const addColorLeft = React.useCallback((i: number) => {
    instanceRef.current?.addColor(i);
  }, []);

  const addColorRight = React.useCallback((i: number) => {
    instanceRef.current?.addColor(i + 1);
  }, []);

  const addColorOnLine = React.useCallback((i: number) => {
    instanceRef.current?.addColorOnLine(i);
  }, []);

  const toggleLock = React.useCallback((i: number) => {
    const inst = instanceRef.current;
    if (!inst) return;
    if (inst.isLocked(i)) inst.unlockColor(i);
    else inst.lockColor(i);
  }, []);

  const addCustomOffset = React.useCallback(() => {
    setCustomOffsets((prev) => [...prev, newOffset]);
  }, [newOffset]);

  const removeCustomOffset = React.useCallback((idx: number) => {
    setCustomOffsets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const applyCustomRule = React.useCallback(() => {
    instanceRef.current?.setCustomOffsets(customOffsets);
    toast.success("Custom rule applied");
  }, [customOffsets]);

  // Code generation
  const jsCode = React.useMemo(() => generateJsCode(state, out), [state, out]);
  const htmlCode = React.useMemo(() => generateHtmlCode(state), [state]);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

  const palette = out?.colors ?? [];

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
            <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-grid p-8">
              <ColorCircleReact
                harmony={state.harmony}
                size={state.size}
                snapping={state.snapping}
                gridMode={state.gridMode}
                gridDivisions={state.gridDivisions}
                showHarmonyLinks={state.showHarmonyLinks}
                onInput={onInput}
                instanceRef={instanceRef}
              />
            </div>
            {/* Output section — Adobe Color-style palette strips */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Palette ({palette.length} colors)</span>
              </div>
              {/* Vertical color strips — Adobe Color style */}
              <div className="flex flex-col gap-1.5">
                {palette.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "group relative flex items-stretch overflow-hidden rounded-md border transition-colors",
                      c.isBase ? "border-brand-lemon/50" : "border-border"
                    )}
                  >
                    {/* Color swatch strip */}
                    <div
                      className="flex h-12 w-16 shrink-0 items-center justify-center"
                      style={{ backgroundColor: c.hex }}
                    >
                      <span className="text-[10px] font-bold text-white/80 drop-shadow" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {i + 1}
                      </span>
                    </div>
                    {/* Color info + actions */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 bg-muted/20 px-3 py-1.5">
                      {/* Hex value */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] text-foreground">{c.hex}</span>
                          {c.isBase && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-brand-lemon/20 px-1 py-0.5 text-[9px] font-bold uppercase text-brand-lemon">
                              <Crown className="h-2.5 w-2.5" /> Base
                            </span>
                          )}
                          {c.isLocked && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                              <Lock className="h-2.5 w-2.5" /> Locked
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          H{Math.round(c.hsv.h)}° · S{Math.round(c.saturation * 100)} · L{Math.round(c.lightness)}
                          {c.offset !== 0 && ` · off ${c.offset > 0 ? "+" : ""}${Math.round(c.offset)}°`}
                        </div>
                      </div>
                      {/* Action buttons — Adobe Color style */}
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleLock(i)}
                          title={c.isLocked ? "Unlock color" : "Lock color"}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                            c.isLocked
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {c.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => addColorLeft(i)}
                          title="Add color left"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => addColorRight(i)}
                          title="Add color right"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => addColorOnLine(i)}
                          title="Add shade on same line (same hue, different saturation)"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Droplets className="h-3 w-3" />
                        </button>
                        {!c.isBase && (
                          <button
                            type="button"
                            onClick={() => setBaseIndex(i)}
                            title="Set as base color"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Crown className="h-3 w-3" />
                          </button>
                        )}
                        {palette.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColor(i)}
                            title="Remove color"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/color-circle-AGENT.md"
            skillPath="/docs/components/color-circle-SKILL.md"
          >
              {/* Harmony */}
              <PropertyField label="Harmony" hint="Color relationship schema">
                <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {HARMONIES.map((h) => {
                    const Icon = h.icon;
                    const active = state.harmony === h.value;
                    return (
                      <button
                        key={h.value}
                        type="button"
                        onClick={() => update("harmony", h.value)}
                        title={h.hint}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {h.label}
                      </button>
                    );
                  })}
                </div>
              </PropertyField>

              {/* Custom Rule Builder */}
              <PropertyField
                label="Custom rule builder"
                hint="Define your own harmony with angle offsets"
              >
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  {/* Offset chips */}
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {customOffsets.map((offset, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
                      >
                        {offset > 0 ? "+" : ""}{offset}°
                        <button
                          type="button"
                          onClick={() => removeCustomOffset(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove offset ${offset}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add offset control */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newOffset}
                      onChange={(e) => setNewOffset(Number(e.target.value))}
                      min={-360}
                      max={360}
                      className="h-7 w-16 rounded-md border border-border bg-background px-1.5 text-center font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-[11px] text-muted-foreground">°</span>
                    <button
                      type="button"
                      onClick={addCustomOffset}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={applyCustomRule}
                      className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-2.5 text-[11px] font-medium text-brand-lemon transition-colors hover:bg-brand-lemon/20"
                    >
                      Apply rule
                    </button>
                  </div>
                </div>
              </PropertyField>

              {/* Snapping toggle */}
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                    <Magnet className={cn("h-3.5 w-3.5", state.snapping ? "text-brand-lemon" : "text-muted-foreground")} />
                    Snapping
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    Snap to grid divisions
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.snapping}
                  aria-label="Toggle snapping"
                  onClick={() => update("snapping", !state.snapping)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state.snapping ? "bg-brand-lemon" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform", state.snapping ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>

              {/* Grid mode */}
              {state.snapping && (
                <PropertyField label="Grid mode" hint="Visualization of snap points">
                  <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                    {GRID_MODES.map((g) => {
                      const Icon = g.icon;
                      const active = state.gridMode === g.value;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => update("gridMode", g.value)}
                          aria-pressed={active}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded px-2 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </PropertyField>
              )}

              {/* Grid divisions */}
              {state.snapping && (
                <PropertyField label="Grid divisions" hint="Angular + radial divisions" value={`${state.gridDivisions}`}>
                  <RangeInput min={2} max={36} step={1} value={state.gridDivisions} onChange={(v) => update("gridDivisions", v)} />
                </PropertyField>
              )}

              {/* Harmony links */}
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                    {state.showHarmonyLinks ? <Link2 className="h-3.5 w-3.5 text-brand-lemon" /> : <Link2Off className="h-3.5 w-3.5 text-muted-foreground" />}
                    Harmony links
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    Connect markers with lines
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.showHarmonyLinks}
                  aria-label="Toggle harmony links"
                  onClick={() => update("showHarmonyLinks", !state.showHarmonyLinks)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state.showHarmonyLinks ? "bg-brand-lemon" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform", state.showHarmonyLinks ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>

              {/* Size */}
              <PropertyField label="Size" hint="Disk diameter (px)" value={`${state.size} px`}>
                <RangeInput min={120} max={400} step={2} value={state.size} onChange={(v) => update("size", v)} />
              </PropertyField>
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

function generateJsCode(state: PlaygroundState, out: ColorCircleOutput | null): string {
  const colors = out?.colors ?? [];
  const colorLines = colors.length > 0
    ? colors.map((c, i) => `  // ${i + 1}${c.isBase ? " (base)" : ""}: ${c.hex} — hue ${Math.round(c.hsv.h)}°, sat ${Math.round(c.saturation * 100)}%`).join("\n")
    : "  // (drag the circle to pick colors)";
  return `import { ColorCircle } from "@workshop/color-circle";

const container = document.querySelector("#color-circle");

const circle = new ColorCircle(container, {
  harmony: "${state.harmony}",
  size: ${state.size},
  snapping: ${state.snapping},
  gridMode: "${state.gridMode}",
  gridDivisions: ${state.gridDivisions},
  showHarmonyLinks: ${state.showHarmonyLinks},
});

circle.on("input", ({ colors, baseIndex }) => {
  // Fires continuously while dragging
  console.log("base:", baseIndex, "palette:", colors.map(c => c.hex));
});

circle.on("change", ({ colors }) => {
  // Fires when the selection is committed
});

// Current palette:
${colorLines}

// Palette management:
// circle.setBaseIndex(1);       // make color #2 the base
// circle.addColor(120, 1.0);    // add a color at hue 120°, full saturation
// circle.removeColor(2);        // remove the 3rd color
// circle.setHarmony("tetradic"); // change harmony schema`;
}

function generateHtmlCode(state: PlaygroundState): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="color-circle.css" /></head>
  <body>
    <div id="color-circle"></div>
    <script type="module" src="init.js"></script>
  </body>
</html>

<!-- Configuration:
  harmony:          "${state.harmony}"
  size:             ${state.size}px
  snapping:         ${state.snapping}
  gridMode:         "${state.gridMode}"
  gridDivisions:    ${state.gridDivisions}
  showHarmonyLinks: ${state.showHarmonyLinks}
-->`;
}

function generateCssCode(): string {
  return `:root {
  --color-circle-focus-ring: rgba(217, 255, 102, 0.55);
}
.color-circle { display: inline-block; position: relative; }
.color-circle canvas { display: block; touch-action: none; outline: none; cursor: pointer; }
.color-circle canvas:focus-visible { box-shadow: 0 0 0 3px var(--color-circle-focus-ring); }`;
}

function generateApiCode(): string {
  return `type Harmony = "none" | "complementary" | "analogous" | "triadic" | "tetradic" | "split-complementary" | "square" | "monochromatic";
type GridMode = "dots" | "lines";

interface ColorEntry {
  id: number;
  hue: number;        // 0–360 absolute
  saturation: number; // 0–1
  isBase: boolean;
  offset: number;     // hue offset from base (degrees)
}

interface ColorCircleOutput {
  baseHue: number;
  baseIndex: number;
  harmony: Harmony;
  colors: (ColorCircleColor & { isBase: boolean; saturation: number; offset: number })[];
}

class ColorCircle {
  constructor(container: HTMLElement, options?: ColorCircleOptions);
  // Palette
  getColors(): ColorEntry[];
  getBaseIndex(): number;
  setBaseIndex(i: number): void;       // change which color drives the palette
  addColor(hue?: number, saturation?: number): number;  // returns new index
  removeColor(i: number): void;
  // Configuration
  setHarmony(h: Harmony): void;
  setSize(n: number): void;
  setSnapping(on: boolean): void;
  setGridMode(mode: GridMode): void;
  setGridDivisions(n: number): void;
  setShowHarmonyLinks(on: boolean): void;
  // Output
  getOutput(): ColorCircleOutput;
  // Events
  on(event: "input" | "change", handler: (o: ColorCircleOutput) => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Behavior:
//   - Moving the BASE color shifts all other colors (they maintain offsets).
//   - Moving a NON-BASE color changes only that color (offset recalculated).
//   - addColor/removeColor let users edit the palette dynamically.
//   - setBaseIndex lets users choose which color drives the palette.`;
}

// ---- Documentation ----

function ComponentDocumentation() {
  const meta = getComponent("color-circle")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Color Circle is a framework-independent vanilla JavaScript component — no React or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} The circle is a 2D color space: angle → hue, radius → saturation (white at center, full saturation at edge). One color is the &quot;base&quot; — moving it shifts all others to maintain their harmony offsets. Non-base colors can be dragged individually. Colors can be added or removed dynamically.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Base color concept</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every palette has one &quot;base&quot; color (marked with a lemon ring + crown badge). Dragging the base color shifts all other colors by the same hue delta — they maintain their geometric relationship. Dragging a non-base color changes only that color; its offset from the base is recalculated. Use the crown button on any palette card to promote it to the base.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Harmony rules (10)</h3>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Rule</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Offsets</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">analogous</td><td className="px-3 py-2 font-mono text-muted-foreground">[-30, 0, 30]</td><td className="px-3 py-2">3</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">monochromatic</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 0, 0, 0, 0] (tonal)</td><td className="px-3 py-2">5</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">triad</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 120, 240]</td><td className="px-3 py-2">3</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">complementary</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 180]</td><td className="px-3 py-2">2</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">split-complementary</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 150, 210]</td><td className="px-3 py-2">3</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">double-split-complementary</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 150, 180, 210]</td><td className="px-3 py-2">4</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">square</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 90, 180, 270]</td><td className="px-3 py-2">4</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">compound</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 30, 150, 180, 210]</td><td className="px-3 py-2">5</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">shades</td><td className="px-3 py-2 font-mono text-muted-foreground">[0, 0, 0] (tonal)</td><td className="px-3 py-2">3</td></tr>
                <tr><td className="px-3 py-2 font-mono text-brand-lemon">custom</td><td className="px-3 py-2 font-mono text-muted-foreground">null (no constraints)</td><td className="px-3 py-2">1+</td></tr>
              </tbody>
            </table>
          </div>
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
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "Base color concept", "Harmony schemas", "Properties and defaults", "Methods", "Events"].map((s) => (
              <a key={s} href="#" onClick={(e) => e.preventDefault()} className="block rounded px-2 py-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent">{s}</a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
