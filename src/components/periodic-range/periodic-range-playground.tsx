"use client";

import * as React from "react";
import {
  RotateCcw,
  ArrowLeftRight,
  ArrowUpDown,
  Sparkles,
  Ruler,
  Plus,
  Minus,
  Circle,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs, CollapsibleSection } from "@/components/platform/agent-skill-tabs";
import { CustomButtonPropsEditor, type CustomButtonProps } from "@/components/platform/custom-button-props-editor";
import { useComponentSettings } from "@/store/component-settings";
import {
  PeriodicRangeReact,
  type PeriodicRangeOrientation,
  type PeriodicRangeValue,
} from "./periodic-range-react";
import type { PeriodicRange } from "@/lib/components/periodic-range";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaygroundState {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step: number;
  showMarkers: boolean;
  markerStep: number;
  orientation: PeriodicRangeOrientation;
  thickness: number;
  length: number;
}

const DEFAULTS: PlaygroundState = {
  min: 0,
  max: 100,
  valueMin: 25,
  valueMax: 75,
  step: 0,
  showMarkers: false,
  markerStep: 10,
  orientation: "horizontal",
  thickness: 8,
  length: 320,
};

export function PeriodicRangePlayground() {
  const meta = getComponent("periodic-range")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const setCompSettings = useComponentSettings(s => s.setSettings);

  // Sync playground state to the shared component-settings store so the
  // theme editor's Component Preview tab can read the same settings.
  React.useEffect(() => {
    setCompSettings("periodic-range", {
      min: state.min, max: state.max,
      valueMin: state.valueMin, valueMax: state.valueMax,
      step: state.step, showMarkers: state.showMarkers,
      markerStep: state.markerStep, orientation: state.orientation,
      thickness: state.thickness, length: state.length,
    });
  }, [state, setCompSettings]);
  const [out, setOut] = React.useState<PeriodicRangeValue>({
    valueMin: DEFAULTS.valueMin,
    valueMax: DEFAULTS.valueMax,
  });
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const instanceRef = React.useRef<PeriodicRange | null>(null);

  // CustomButton thumb props — host-specific defaults for min and max thumbs
  const thumbDefaults: CustomButtonProps = {
    text: "", icon: "", iconType: "icon", iconPosition: "left",
    variant: "thumb",
    size: "sm", disabled: false, fullWidth: false,
    width: 14, height: 18,
  };
  // Props that are overridden by the parent component (PeriodicRange)
  const thumbOverrides: Record<string, string> = {
    width: "set by track thickness",
    height: "set by track thickness",
    fullWidth: "always false for thumbs",
  };
  const [minThumbProps, setMinThumbProps] = React.useState<CustomButtonProps>({ ...thumbDefaults });
  const [maxThumbProps, setMaxThumbProps] = React.useState<CustomButtonProps>({ ...thumbDefaults });

  // Wire prop changes to the actual component — only applies changed props
  // and clears width/height when size changes so the size token controls dimensions.
  const onMinThumbChange = React.useCallback((props: CustomButtonProps) => {
    const finalProps = props.size !== minThumbProps.size
      ? { ...props, width: 0, height: 0 }
      : props;
    setMinThumbProps(finalProps);
    const inst = instanceRef.current;
    if (!inst) return;
    (Object.keys(finalProps) as (keyof CustomButtonProps)[]).forEach((key) => {
      if (finalProps[key] === minThumbProps[key]) return;
      if (thumbOverrides[key as string]) return;
      inst.setThumbProp("min", key, finalProps[key]);
    });
  }, [minThumbProps, thumbOverrides]);

  const onMaxThumbChange = React.useCallback((props: CustomButtonProps) => {
    const finalProps = props.size !== maxThumbProps.size
      ? { ...props, width: 0, height: 0 }
      : props;
    setMaxThumbProps(finalProps);
    const inst = instanceRef.current;
    if (!inst) return;
    (Object.keys(finalProps) as (keyof CustomButtonProps)[]).forEach((key) => {
      if (finalProps[key] === maxThumbProps[key]) return;
      if (thumbOverrides[key as string]) return;
      inst.setThumbProp("max", key, finalProps[key]);
    });
  }, [maxThumbProps, thumbOverrides]);

  const onInput = React.useCallback((v: PeriodicRangeValue) => {
    setOut(v);
    // Sync the inspector state with the (possibly snapped / clamped) values
    // emitted by the instance. This keeps the property inspector's valueMin /
    // valueMax inputs in lockstep with what the canvas actually shows, even
    // when the user typed a value that the instance rounded.
    setState((s) => {
      if (s.valueMin !== v.valueMin || s.valueMax !== v.valueMax) {
        return { ...s, valueMin: v.valueMin, valueMax: v.valueMax };
      }
      return s;
    });
  }, []);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => {
        const next = { ...s, [key]: value } as PlaygroundState;
        // Keep min ≤ max (swap if the user inverted them).
        const lo = Math.min(next.min, next.max);
        const hi = Math.max(next.min, next.max);
        next.min = lo;
        next.max = hi;
        // Clamp values to the (possibly new) range.
        let vMin = clampNum(next.valueMin, next.min, next.max);
        let vMax = clampNum(next.valueMax, next.min, next.max);
        // Enforce valueMin ≤ valueMax. The thumb the user is moving wins —
        // the other one stays put and the moving thumb clamps to it.
        if (vMin > vMax) {
          if (key === "valueMin") {
            // User raised valueMin above valueMax → clamp valueMin down.
            vMin = vMax;
          } else if (key === "valueMax") {
            // User lowered valueMax below valueMin → clamp valueMax up.
            vMax = vMin;
          } else {
            // Range bounds changed in a way that inverted the values
            // (e.g. min rose above valueMax). Push them to the new edges.
            vMin = next.min;
            vMax = next.max;
            if (vMin > vMax) vMin = vMax = next.min;
          }
        }
        next.valueMin = vMin;
        next.valueMax = vMax;
        return next;
      });
    },
    [],
  );

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setOut({ valueMin: DEFAULTS.valueMin, valueMax: DEFAULTS.valueMax });
    toast.success("Reset to defaults");
  }, []);

  // Sync the live component instance's range (min/max) with the inspector.
  // valueMin / valueMax changes are pushed via the React wrapper's prop
  // effects (which call setValueMin / setValueMax, applying snapping).
  React.useEffect(() => {
    instanceRef.current?.setRange(state.min, state.max);
  }, [state.min, state.max]);

  // Code generation.
  const jsCode = React.useMemo(() => generateJsCode(state), [state]);
  const htmlCode = React.useMemo(() => generateHtmlCode(state), [state]);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

  const span = state.max - state.min;
  const selectedSpan = out.valueMax - out.valueMin;

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Inputs</PageOverline>
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
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>

            <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-grid p-10">
              <PeriodicRangeReact
                min={state.min}
                max={state.max}
                valueMin={state.valueMin}
                valueMax={state.valueMax}
                step={state.step}
                showMarkers={state.showMarkers}
                markerStep={state.markerStep}
                orientation={state.orientation}
                thickness={state.thickness}
                length={state.length}
                onInput={onInput}
                instanceRef={instanceRef}
              />
            </div>

            {/* Output section */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  span {formatNum(selectedSpan)} / {formatNum(span)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ValueChip
                  label="Min"
                  value={formatNum(out.valueMin)}
                  accent="min"
                />
                <ValueChip
                  label="Max"
                  value={formatNum(out.valueMax)}
                  accent="max"
                />
                <CopyableValue
                  label="valueMin"
                  value={String(out.valueMin)}
                />
                <CopyableValue
                  label="valueMax"
                  value={String(out.valueMax)}
                />
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/periodic-range-AGENT.md"
            skillPath="/docs/components/periodic-range-SKILL.md"
          >
              {/* Range */}
              <PropertyField label="Range" hint="Minimum and maximum bounds of the track">
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput
                    label="min"
                    value={state.min}
                    onChange={(v) => update("min", v)}
                  />
                  <NumberInput
                    label="max"
                    value={state.max}
                    onChange={(v) => update("max", v)}
                  />
                </div>
              </PropertyField>

              {/* Values */}
              <PropertyField label="Values" hint="Current low and high thumb positions">
                <div className="grid grid-cols-2 gap-2">
                  <DeferredNumberInput
                    label="valueMin"
                    value={state.valueMin}
                    onCommit={(v) => update("valueMin", v)}
                  />
                  <DeferredNumberInput
                    label="valueMax"
                    value={state.valueMax}
                    onCommit={(v) => update("valueMax", v)}
                  />
                </div>
              </PropertyField>

              {/* Step */}
              <PropertyField
                label="Step"
                hint="Snap increment. 0 = no snapping."
                value={state.step === 0 ? "off" : String(state.step)}
              >
                <NumberInput
                  label="step"
                  value={state.step}
                  min={0}
                  onChange={(v) => update("step", Math.max(0, v))}
                />
              </PropertyField>

              {/* Markers */}
              <PropertyField label="Markers" hint="Tick marks with numeric labels">
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={state.showMarkers}
                    onChange={(v) => update("showMarkers", v)}
                    label={state.showMarkers ? "On" : "Off"}
                  />
                </div>
              </PropertyField>

              {state.showMarkers && (
                <PropertyField
                  label="Marker step"
                  hint="Interval between markers"
                  value={String(state.markerStep)}
                >
                  <NumberInput
                    label="markerStep"
                    value={state.markerStep}
                    min={1}
                    onChange={(v) => update("markerStep", Math.max(1, v))}
                  />
                </PropertyField>
              )}

              {/* Orientation */}
              <PropertyField label="Orientation" hint="Track direction">
                <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {(
                    [
                      { value: "horizontal", label: "Horizontal", icon: ArrowLeftRight },
                      { value: "vertical", label: "Vertical", icon: ArrowUpDown },
                    ] as const
                  ).map((o) => {
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
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
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
                  min={4}
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
                  max={500}
                  step={2}
                  value={state.length}
                  onChange={(v) => update("length", v)}
                />
              </PropertyField>

              {/* Reused component: CustomButton (thumbs) */}
              <CollapsibleSection title="CustomButton (thumbs)" icon={Circle}>
                <CustomButtonPropsEditor instances={[
                  { name: "Min Thumb", defaults: thumbDefaults, current: minThumbProps, onChange: onMinThumbChange, overriddenProps: thumbOverrides },
                  { name: "Max Thumb", defaults: thumbDefaults, current: maxThumbProps, onChange: onMaxThumbChange, overriddenProps: thumbOverrides },
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
                      : "text-muted-foreground hover:text-foreground",
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

// ---- Local helpers ----

function clampNum(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return v < min ? min : v > max ? max : v;
}

function formatNum(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

function PropertyField({
  label,
  hint,
  value,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
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
      {hint && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        spellCheck={false}
        aria-label={label}
        className="h-9 w-full rounded-md border border-border bg-background pl-2.5 pr-2 font-mono text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}

/**
 * A number input that defers committing its value to the parent until the
 * user blurs the field or presses Enter. While focused, the user can type
 * freely (e.g. "33") without each keystroke being snapped / clamped back by
 * the underlying component (which would make typing multi-digit numbers
 * impossible when step snapping is on).
 *
 * The displayed value tracks the `value` prop while unfocused, and tracks
 * the local draft while focused.
 */
function DeferredNumberInput({
  label,
  value,
  onCommit,
  min,
  max,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = React.useState<string>(String(value));
  const [focused, setFocused] = React.useState(false);

  // Sync the draft from the external value whenever the input is not focused
  // (so external changes — e.g. canvas drags, reset — are reflected).
  React.useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = React.useCallback(() => {
    const v = Number(draft);
    if (Number.isFinite(v)) {
      onCommit(v);
    } else {
      // Reset to the last known good value on invalid input.
      setDraft(String(value));
    }
  }, [draft, value, onCommit]);

  return (
    <div className="relative">
      <input
        type="number"
        value={focused ? draft : String(value)}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => {
          setFocused(true);
          setDraft(String(value));
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        spellCheck={false}
        aria-label={label}
        className="h-9 w-full rounded-md border border-border bg-background pl-2.5 pr-2 font-mono text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase text-muted-foreground/60">
        {label}
      </span>
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
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-brand-lemon"
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

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "border-brand-lemon/40 bg-brand-lemon/10 text-brand-lemon"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-brand-lemon" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-all",
            checked ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

function ValueChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "min" | "max";
}) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5">
      <span
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-mono uppercase",
          accent === "min"
            ? "bg-white/10 text-foreground"
            : "bg-brand-lemon/15 text-brand-lemon",
        )}
      >
        {accent === "min" ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
        {label}
      </span>
      <span className="font-mono text-[13px] text-foreground">{value}</span>
    </div>
  );
}

// ---- Code generators ----

function generateJsCode(state: PlaygroundState): string {
  return `import { PeriodicRange } from "@workshop/periodic-range";

const container = document.querySelector("#periodic-range");

const range = new PeriodicRange(container, {
  min: ${state.min},
  max: ${state.max},
  valueMin: ${state.valueMin},
  valueMax: ${state.valueMax},
  step: ${state.step},
  showMarkers: ${state.showMarkers},
  markerStep: ${state.markerStep},
  orientation: "${state.orientation}",
  thickness: ${state.thickness},
  length: ${state.length},
});

range.on("input", ({ valueMin, valueMax }) => {
  // Fires continuously while dragging either thumb
  console.log("input", valueMin, valueMax);
});

range.on("change", ({ valueMin, valueMax }) => {
  // Fires when the selection is committed (pointer up / keyboard)
  console.log("committed", valueMin, valueMax);
});

// Programmatic control
// range.setValueMin(40);
// range.setValueMax(60);
// range.setRange(0, 200);
// range.setStep(5);
// range.setShowMarkers(true);
// range.setOrientation("vertical");
// range.destroy();`;
}

function generateHtmlCode(state: PlaygroundState): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="periodic-range.css" />
  </head>
  <body>
    <!-- The range mounts into this container -->
    <div id="periodic-range"></div>

    <script type="module" src="init.js"></script>
  </body>
</html>

<!-- Default configuration used above:
  min:          ${state.min}
  max:          ${state.max}
  valueMin:     ${state.valueMin}
  valueMax:     ${state.valueMax}
  step:         ${state.step}
  showMarkers:  ${state.showMarkers}
  markerStep:   ${state.markerStep}
  orientation:  "${state.orientation}"
  thickness:    ${state.thickness}px
  length:       ${state.length}px
-->`;
}

function generateCssCode(): string {
  return `/* The component ships with safe defaults.
   Override these CSS custom properties to theme it. */

:root {
  --periodic-range-focus-ring: rgba(217, 255, 102, 0.55);
}

.periodic-range {
  display: inline-block;
  position: relative;
}

.periodic-range canvas {
  display: block;
  touch-action: none;
  outline: none;
  cursor: pointer;
  border-radius: 8px;
}

.periodic-range canvas:focus-visible {
  box-shadow: 0 0 0 3px var(--periodic-range-focus-ring);
}`;
}

function generateApiCode(): string {
  return `// Public API

type PeriodicRangeOrientation = "horizontal" | "vertical";

interface PeriodicRangeValue {
  valueMin: number;
  valueMax: number;
}

interface PeriodicRangeOptions {
  min?: number;           // default 0
  max?: number;           // default 100
  valueMin?: number;      // default 25
  valueMax?: number;      // default 75
  step?: number;          // snap step, 0 = off. default 0
  showMarkers?: boolean;  // default false
  markerStep?: number;    // default 10
  orientation?: PeriodicRangeOrientation; // default "horizontal"
  thickness?: number;     // track thickness px, default 8
  length?: number;        // track length px, default 280
}

class PeriodicRange {
  constructor(container: HTMLElement, options?: PeriodicRangeOptions);
  getValueMin(): number;
  getValueMax(): number;
  setValueMin(v: number): void;
  setValueMax(v: number): void;
  setRange(min: number, max: number): void;
  setStep(step: number): void;
  setShowMarkers(on: boolean): void;
  setMarkerStep(step: number): void;
  setOrientation(orientation: PeriodicRangeOrientation): void;
  setThickness(n: number): void;
  setLength(n: number): void;
  on(event: "input" | "change", handler: (v: PeriodicRangeValue) => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "input"  — fires continuously during pointer drag
//   "change" — fires when the selection is committed (pointer up / keyboard)

// Invariants
//   - valueMin ≤ valueMax (thumbs cannot cross)
//   - min ≤ valueMin, valueMax ≤ max
//   - When step > 0, values snap to the nearest step grid point.`;
}

// ---- Documentation section ----

function ComponentDocumentation() {
  const meta = getComponent("periodic-range")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Periodic Range is a framework-independent vanilla JavaScript
          component — no React or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} The two thumbs maintain a strict ordering
            (valueMin ≤ valueMax) — they can touch but never cross. The
            selected range between them is filled with the lemon accent color.
            Optional step snapping constrains values to a fixed grid, and
            optional markers render tick marks with numeric labels along the
            track.
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
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />
              The canvas is keyboard-focusable with role=&quot;slider&quot;.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />
              Arrow Left/Down decrease, Arrow Right/Up increase the active thumb (Shift = 10× via PageUp/PageDown).
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />
              Home sends the active thumb to its bound, End to the opposite bound.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />
              Tab cycles the active thumb between min and max without leaving the canvas.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />
              aria-valuenow exposes the active thumb&apos;s value; aria-valuetext shows both values.
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Styling and customization</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The component is self-contained and ships with safe defaults. Host
            applications can override its CSS custom properties (prefixed with
            <code className="mx-1 font-mono text-brand-lemon">--periodic-range-</code>)
            to adjust the focus ring.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
              <Ruler className="h-3 w-3" />
              Resizable (thickness + length)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Snapping + markers
            </span>
          </div>
        </section>
      </div>

      {/* Right-hand TOC */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {[
              "Overview",
              "When to use it",
              "When not to use it",
              "Properties and defaults",
              "Methods",
              "Events",
              "Accessibility",
              "Styling and customization",
            ].map((s) => (
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
