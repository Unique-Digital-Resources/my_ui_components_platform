"use client";

import * as React from "react";
import {
  ArrowLeft,
  RotateCcw,
  Layers,
  Paintbrush,
  Palette,
  Settings2,
  Triangle,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { examples, getComponent, type ExampleMeta } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { CodeBlock } from "@/components/platform/code-block";
import { ColorWheelPickerReact, type ColorOutput } from "@/components/color-wheel/color-wheel-picker-react";
import { cn } from "@/lib/utils";

const INITIAL_COLOR = "#4287f5";

/**
 * A mock "creative application" inspector: a left panel listing the selected
 * object's fill color, and a right panel with a live color wheel bound to the
 * fill swatch + hex display.
 */
function CreativeInspectorDemo() {
  const [color, setColor] = React.useState<ColorOutput | null>(null);
  const [hex, setHex] = React.useState(INITIAL_COLOR);
  const [resetKey, setResetKey] = React.useState(0);

  const reset = React.useCallback(() => {
    setHex(INITIAL_COLOR);
    setColor(null);
    setResetKey((k) => k + 1);
  }, []);

  return (
    <DemoShell onReset={reset}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        {/* Inspector left panel */}
        <div className="panel flex flex-col">
          <div className="border-b border-border px-3 py-2">
            <span className="eyebrow">Inspector</span>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Selected object
              </p>
              <p className="mt-1 font-mono text-[13px] text-foreground">Shape 01</p>
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Fill color
              </p>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                <span
                  className="h-7 w-7 shrink-0 rounded border border-border"
                  style={{ background: hex }}
                  aria-hidden
                />
                <div className="flex flex-col">
                  <span className="font-mono text-[12px] text-foreground">{hex}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {color
                      ? `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
                      : "rgb(66, 135, 245)"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Stroke
              </p>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                <span className="h-7 w-7 shrink-0 rounded border border-border bg-[#101014]" aria-hidden />
                <span className="font-mono text-[12px] text-muted-foreground">#101014</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: live picker */}
        <div className="panel flex flex-col items-center justify-center p-6">
          <ColorWheelPickerReact
            key={resetKey}
            shape="triangle"
            size={160}
            color={INITIAL_COLOR}
            onInput={(c) => {
              setColor(c);
              setHex(c.hex);
            }}
          />
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            Drag the wheel to update the fill color
          </p>
        </div>
      </div>
    </DemoShell>
  );
}

/**
 * A mock application settings panel with a "Theme color" row bound to a
 * live color wheel.
 */
function SettingsPanelDemo() {
  const [color, setColor] = React.useState<ColorOutput | null>(null);
  const [hex, setHex] = React.useState(INITIAL_COLOR);
  const [resetKey, setResetKey] = React.useState(0);

  const reset = React.useCallback(() => {
    setHex(INITIAL_COLOR);
    setColor(null);
    setResetKey((k) => k + 1);
  }, []);

  return (
    <DemoShell onReset={reset}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
        <div className="panel flex flex-col">
          <div className="border-b border-border px-4 py-2.5">
            <span className="eyebrow">Appearance</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            <SettingsRow label="Theme color" hint="Accent used across the interface">
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-6 rounded border border-border"
                  style={{ background: hex }}
                  aria-hidden
                />
                <span className="font-mono text-[12px] text-foreground">{hex}</span>
              </div>
            </SettingsRow>
            <SettingsRow label="Density" hint="Spacing scale for the interface">
              <span className="font-mono text-[12px] text-muted-foreground">Comfortable</span>
            </SettingsRow>
            <SettingsRow label="Font size" hint="Base font size in pixels">
              <span className="font-mono text-[12px] text-muted-foreground">14px</span>
            </SettingsRow>
            <SettingsRow label="Reduce motion" hint="Disable non-essential animations">
              <span className="font-mono text-[12px] text-muted-foreground">Off</span>
            </SettingsRow>
          </div>
        </div>

        <div className="panel flex flex-col items-center justify-center p-4">
          <ColorWheelPickerReact
            key={resetKey}
            shape="square"
            size={140}
            color={INITIAL_COLOR}
            onInput={(c) => {
              setColor(c);
              setHex(c.hex);
            }}
          />
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Pick a theme color
          </p>
        </div>
      </div>
    </DemoShell>
  );
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * A small theme editor: an accent color picker + three preview surfaces
 * whose backgrounds reflect the chosen accent.
 */
function ThemeEditorDemo() {
  const [color, setColor] = React.useState<ColorOutput | null>(null);
  const [hex, setHex] = React.useState("#d9ff66");
  const [resetKey, setResetKey] = React.useState(0);

  const reset = React.useCallback(() => {
    setHex("#d9ff66");
    setColor(null);
    setResetKey((k) => k + 1);
  }, []);

  return (
    <DemoShell onReset={reset}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-3">
          <div className="panel p-3">
            <p className="eyebrow mb-2">Preview surfaces</p>
            <div className="grid grid-cols-3 gap-2">
              <PreviewSurface label="Button" background={hex} text="#101014" />
              <PreviewSurface
                label="Surface"
                background={`color-mix(in srgb, ${hex} 18%, #211A30)`}
                text="#F4F1FF"
              />
              <PreviewSurface
                label="Border"
                background="#211A30"
                text="#F4F1FF"
                border={hex}
              />
            </div>
          </div>
          <div className="panel p-3">
            <p className="eyebrow mb-2">Output</p>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[12px]">
              <span className="text-muted-foreground">accent:</span>
              <span className="text-foreground">{hex}</span>
              {color && (
                <span className="text-muted-foreground">
                  hsl({Math.round(color.hsl.h)}°, {Math.round(color.hsl.s)}%, {Math.round(color.hsl.l)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="panel flex flex-col items-center justify-center p-4">
          <ColorWheelPickerReact
            key={resetKey}
            shape="disk"
            size={140}
            color="#d9ff66"
            onInput={(c) => {
              setColor(c);
              setHex(c.hex);
            }}
          />
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Accent color
          </p>
        </div>
      </div>
    </DemoShell>
  );
}

function PreviewSurface({
  label,
  background,
  text,
  border,
}: {
  label: string;
  background: string;
  text: string;
  border?: string;
}) {
  return (
    <div
      className="flex h-20 flex-col items-center justify-center rounded-md border text-[11px] font-medium"
      style={{
        background,
        color: text,
        borderColor: border ?? "var(--border)",
      }}
    >
      {label}
    </div>
  );
}

function DemoShell({
  onReset,
  children,
}: {
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label="Live example" className="panel relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-lemon animate-pulse" />
          <span className="eyebrow">Live example</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
      <div className="bg-grid p-5">{children}</div>
    </section>
  );
}

/* -------------------------------- Demos map ------------------------------- */

const DEMOS: Record<
  ExampleMeta["slug"],
  { component: React.FC; code: (ex: ExampleMeta) => string }
> = {
  "creative-inspector": {
    component: CreativeInspectorDemo,
    code: () => `import { ColorWheelPicker } from "workshop-ui";

const picker = new ColorWheelPicker(document.getElementById("picker"), {
  shape: "triangle",
  size: 160,
  color: "#4287f5",
});

const swatch = document.getElementById("fill-swatch");
const hexLabel = document.getElementById("fill-hex");

picker.on("input", (color) => {
  swatch.style.background = color.hex;
  hexLabel.textContent = color.hex;
});

// When the user commits a color, persist the new fill on the object.
picker.on("change", (color) => {
  selectedObject.fill = color.hex;
});`,
  },
  "settings-panel": {
    component: SettingsPanelDemo,
    code: () => `import { ColorWheelPicker } from "workshop-ui";

const accentPicker = new ColorWheelPicker(document.getElementById("accent-picker"), {
  shape: "square",
  size: 140,
  color: "#4287f5",
});

accentPicker.on("input", (color) => {
  document.documentElement.style.setProperty("--accent", color.hex);
});`,
  },
  "theme-editor": {
    component: ThemeEditorDemo,
    code: () => `import { ColorWheelPicker } from "workshop-ui";

const accentPicker = new ColorWheelPicker(document.getElementById("accent"), {
  shape: "disk",
  size: 140,
  color: "#d9ff66",
});

accentPicker.on("input", (color) => {
  document.documentElement.style.setProperty("--accent", color.hex);
  document.documentElement.style.setProperty(
    "--accent-surface",
    \`color-mix(in srgb, \${color.hex} 18%, var(--brand-purple))\`
  );
});`,
  },
};

/* ------------------------------- View body -------------------------------- */

export function ExampleDetailView() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : undefined;
  const example = slug ? examples.find((e) => e.slug === slug) : undefined;

  if (!example) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/30">
            <Layers className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Example not found
            </h1>
            <p className="mt-2 max-w-md text-[14px] text-muted-foreground">
              The example you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>
          </div>
          <Link
            href="/examples"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[13px] font-medium text-brand-lemon hover:bg-brand-lemon/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to examples
          </Link>
        </div>
      </PageContainer>
    );
  }

  const demo = DEMOS[example.slug];
  const DemoComponent = demo?.component;
  const code = demo ? demo.code(example) : "// Example implementation coming soon.";

  return (
    <PageContainer>
      <Breadcrumbs />
      <div className="mt-6">
        <PageOverline>Examples / {example.category}</PageOverline>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {example.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {example.description}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-10">
        {/* Live example */}
        {DemoComponent ? (
          <DemoComponent />
        ) : (
          <section aria-label="Live example" className="panel bg-grid p-8">
            <p className="text-[13px] text-muted-foreground">
              This example does not yet have a live demo.
            </p>
          </section>
        )}

        {/* Components used */}
        <section aria-label="Components used">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Components used
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            This example composes the following components from the library.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {example.components.map((slug) => {
              const meta = getComponent(slug);
              if (!meta) return null;
              const Icon =
                slug === "color-wheel"
                  ? Paintbrush
                  : Palette;
              return (
                <Link
                  key={slug}
                  href={`/components/${meta.category}/${meta.slug}`}
                  className="group panel flex items-center gap-3 p-4 text-left transition-colors hover:border-brand-lemon/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/30">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-brand-lemon" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-foreground">{meta.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-brand-lemon">
                    View component
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Implementation */}
        <section aria-label="Implementation">
          <div className="flex items-center gap-2">
            <Triangle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Implementation
            </h2>
          </div>
          <p className="mt-2 text-[14px] text-muted-foreground">
            A short snippet showing how the example is wired up using the
            component&apos;s public API.
          </p>
          <div className="mt-4">
            <CodeBlock
              code={code}
              language="javascript"
              filename={`example-${example.slug}.js`}
            />
          </div>
        </section>

        {/* Footer back link */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/examples"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            All examples
          </Link>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="font-mono">{example.slug}</span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default ExampleDetailView;
