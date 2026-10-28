"use client";

import * as React from "react";
import {
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Image as ImageIcon,
  MousePointerClick,
  Plus,
  X,
  Check,
  Settings,
  Search,
  Home,
  Star,
  Heart,
  Trash2,
  Download,
  Upload,
  Mail,
  User,
  Save,
  Edit3,
  Bell,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import {
  CustomButtonReact,
  type CustomButtonVariant,
  type CustomButtonSize,
  type CustomButtonIconType,
  type CustomButtonIconPosition,
} from "./custom-button-react";
import type { CustomButton } from "@/lib/components/custom-button";
import { BUILT_IN_ICON_NAMES } from "@/lib/components/custom-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaygroundState {
  text: string;
  icon: string;
  iconType: CustomButtonIconType;
  iconPosition: CustomButtonIconPosition;
  variant: CustomButtonVariant;
  size: CustomButtonSize;
  disabled: boolean;
  fullWidth: boolean;
}

const DEFAULTS: PlaygroundState = {
  text: "Get started",
  icon: "arrow-right",
  iconType: "icon",
  iconPosition: "right",
  variant: "primary",
  size: "md",
  disabled: false,
  fullWidth: false,
};

// A small inline SVG used as the default image source when iconType="image".
// Encoded as a data URI so the user can see image rendering without needing
// to host a file.
const DEFAULT_IMAGE_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2317151D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  );

/** Lucide icon used to visually preview each built-in icon name in the dropdown. */
const ICON_PREVIEW: Record<string, LucideIcon> = {
  plus: Plus,
  x: X,
  check: Check,
  settings: Settings,
  search: Search,
  home: Home,
  star: Star,
  heart: Heart,
  "arrow-right": ArrowRight,
  trash: Trash2,
  download: Download,
  upload: Upload,
  mail: Mail,
  user: User,
  save: Save,
  edit: Edit3,
  bell: Bell,
  refresh: RefreshCw,
};

export function CustomButtonPlayground() {
  const meta = getComponent("custom-button")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [clickCount, setClickCount] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const instanceRef = React.useRef<CustomButton | null>(null);

  const update = <K extends keyof PlaygroundState>(
    key: K,
    value: PlaygroundState[K],
  ) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const reset = () => {
    setState(DEFAULTS);
    setClickCount(0);
    toast.success("Reset to defaults");
  };

  const onClick = () => {
    setClickCount((c) => c + 1);
  };

  // When the icon type changes, swap the icon value to a sensible default for
  // the new type so the preview always shows something. This is handled in
  // the iconType onValueChange handler below (not an effect) so it doesn't
  // fight with the user's manual edits.

  // Code generation
  const jsCode = React.useMemo(() => generateJsCode(state), [state]);
  const htmlCode = React.useMemo(() => generateHtmlCode(state), [state]);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

  const PreviewIcon = state.iconType === "icon" ? ICON_PREVIEW[state.icon] : undefined;

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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Live preview */}
          <section
            aria-label="Live preview"
            className="panel relative flex h-[600px] flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-lemon animate-pulse" />
                <span className="eyebrow">Live preview</span>
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
              {/* Center the button; constrain width when fullWidth is on so it
                  doesn't span the entire grid cell. */}
              <div className="flex w-full max-w-[320px] flex-col items-center justify-center gap-3">
                <CustomButtonReact
                  text={state.text}
                  icon={state.icon || undefined}
                  iconType={state.iconType}
                  iconPosition={state.iconPosition}
                  variant={state.variant}
                  size={state.size}
                  disabled={state.disabled}
                  fullWidth={state.fullWidth}
                  onClick={onClick}
                  instanceRef={instanceRef}
                  className="flex justify-center"
                />
              </div>
            </div>
            {/* Click counter */}
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground">
                    <MousePointerClick className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Click count
                    </span>
                    <span className="font-mono text-sm text-foreground">
                      {clickCount} {clickCount === 1 ? "click" : "clicks"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClickCount(0)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Reset counter
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground/70">
                Click the button above to fire its <code className="font-mono text-brand-lemon">click</code> event.
                {state.disabled && " Disabled buttons do not fire clicks."}
              </p>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/custom-button-AGENT.md"
            skillPath="/docs/components/custom-button-SKILL.md"
          >
              {/* Text */}
              <PropertyField
                label="Text"
                hint="Button label. Leave empty for an icon-only button."
              >
                <input
                  type="text"
                  value={state.text}
                  onChange={(e) => update("text", e.target.value)}
                  placeholder="(empty = icon only)"
                  className="h-8 w-full rounded-md border border-border bg-background px-2.5 font-mono text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </PropertyField>

              {/* Icon type */}
              <PropertyField
                label="Icon type"
                hint='SVG icon (inline) or image (<img>).'
              >
                <SegmentedControl
                  value={state.iconType}
                  onValueChange={(v) => {
                    const next = v as CustomButtonIconType;
                    if (next === "image") {
                      // Going to image mode — if the current icon is a built-in
                      // name (not a URL/data URI), swap in the default image.
                      const cur = state.icon;
                      const isImageSrc =
                        cur.startsWith("data:") ||
                        cur.startsWith("http") ||
                        cur.startsWith("/");
                      setState((s) => ({
                        ...s,
                        iconType: next,
                        icon: isImageSrc && cur ? cur : DEFAULT_IMAGE_DATA_URI,
                      }));
                    } else {
                      // Going back to icon mode — if the current icon is a URL
                      // or data URI, restore a default icon name.
                      const cur = state.icon;
                      const isImageSrc =
                        cur.startsWith("data:") ||
                        cur.startsWith("http") ||
                        cur.startsWith("/");
                      setState((s) => ({
                        ...s,
                        iconType: next,
                        icon: isImageSrc || !cur ? "plus" : cur,
                      }));
                    }
                  }}
                  options={[
                    { value: "icon", label: "Icon", icon: Sparkles },
                    { value: "image", label: "Image", icon: ImageIcon },
                  ]}
                />
              </PropertyField>

              {/* Icon — varies by type */}
              <PropertyField
                label="Icon"
                hint={
                  state.iconType === "icon"
                    ? "Built-in Lucide-style icon name."
                    : "Image URL or data URI."
                }
              >
                {state.iconType === "icon" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-foreground">
                      {PreviewIcon ? <PreviewIcon className="h-4 w-4" /> : (
                        <X className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <select
                      value={state.icon}
                      onChange={(e) => update("icon", e.target.value)}
                      className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 font-mono text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">(none)</option>
                      {BUILT_IN_ICON_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={state.icon}
                    onChange={(e) => update("icon", e.target.value)}
                    placeholder="https://… or data:image/…"
                    className="h-8 w-full rounded-md border border-border bg-background px-2.5 font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
              </PropertyField>

              {/* Icon position */}
              <PropertyField
                label="Icon position"
                hint="Where the icon sits relative to the text."
              >
                <SegmentedControl
                  value={state.iconPosition}
                  onValueChange={(v) =>
                    update("iconPosition", v as CustomButtonIconPosition)
                  }
                  options={[
                    { value: "left", label: "", icon: ArrowLeft, title: "Left" },
                    { value: "right", label: "", icon: ArrowRight, title: "Right" },
                    { value: "top", label: "", icon: ArrowUp, title: "Top" },
                    { value: "bottom", label: "", icon: ArrowDown, title: "Bottom" },
                  ]}
                  columns={4}
                />
              </PropertyField>

              {/* Variant */}
              <PropertyField label="Variant" hint="Visual style.">
                <SegmentedControl
                  value={state.variant}
                  onValueChange={(v) => update("variant", v as CustomButtonVariant)}
                  options={[
                    { value: "primary", label: "Primary" },
                    { value: "secondary", label: "Secondary" },
                    { value: "outline", label: "Outline" },
                    { value: "ghost", label: "Ghost" },
                  ]}
                  columns={2}
                />
              </PropertyField>

              {/* Size */}
              <PropertyField label="Size" hint="Button height + font size.">
                <SegmentedControl
                  value={state.size}
                  onValueChange={(v) => update("size", v as CustomButtonSize)}
                  options={[
                    { value: "sm", label: "SM" },
                    { value: "md", label: "MD" },
                    { value: "lg", label: "LG" },
                  ]}
                  columns={3}
                />
              </PropertyField>

              {/* Toggles */}
              <div className="flex flex-col gap-3 pt-1">
                <ToggleRow
                  label="Disabled"
                  description="Blocks click events."
                  checked={state.disabled}
                  onChange={(v) => update("disabled", v)}
                />
                <ToggleRow
                  label="Full width"
                  description="Stretch to fill the parent."
                  checked={state.fullWidth}
                  onChange={(v) => update("fullWidth", v)}
                />
              </div>

              {/* State snapshot */}
              <div className="mt-1 rounded-md border border-border bg-muted/20 p-3">
                <span className="eyebrow mb-2 block">Current state</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
                  <span className="text-muted-foreground">text</span>
                  <span className="truncate text-foreground" title={state.text}>
                    {state.text ? `"${state.text}"` : "—"}
                  </span>
                  <span className="text-muted-foreground">icon</span>
                  <span className="truncate text-foreground" title={state.icon}>
                    {state.iconType === "icon"
                      ? state.icon || "—"
                      : state.icon.startsWith("data:")
                        ? "<data uri>"
                        : state.icon || "—"}
                  </span>
                  <span className="text-muted-foreground">iconType</span>
                  <span className="text-foreground">{state.iconType}</span>
                  <span className="text-muted-foreground">iconPosition</span>
                  <span className="text-foreground">{state.iconPosition}</span>
                  <span className="text-muted-foreground">variant</span>
                  <span className="text-foreground">{state.variant}</span>
                  <span className="text-muted-foreground">size</span>
                  <span className="text-foreground">{state.size}</span>
                  <span className="text-muted-foreground">disabled</span>
                  <span className="text-foreground">{String(state.disabled)}</span>
                  <span className="text-muted-foreground">fullWidth</span>
                  <span className="text-foreground">{String(state.fullWidth)}</span>
                </div>
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

        {/* Quick-try imperative calls */}
        <section className="panel mt-6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">Try the imperative API</span>
            <span className="text-[11px] font-mono text-muted-foreground/70">
              Calls operate on the live instance above
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ImperativeButton
              label='setText("Cancel")'
              onClick={() => {
                instanceRef.current?.setText("Cancel");
                setState((s) => ({ ...s, text: "Cancel" }));
                toast.success('setText("Cancel")');
              }}
            />
            <ImperativeButton
              label='setVariant("outline")'
              onClick={() => {
                instanceRef.current?.setVariant("outline");
                setState((s) => ({ ...s, variant: "outline" }));
                toast.success('setVariant("outline")');
              }}
            />
            <ImperativeButton
              label='setIcon("check")'
              onClick={() => {
                if (state.iconType !== "icon") {
                  update("iconType", "icon");
                }
                instanceRef.current?.setIcon("check", "icon");
                setState((s) => ({ ...s, icon: "check", iconType: "icon" }));
                toast.success('setIcon("check")');
              }}
            />
            <ImperativeButton
              label="setDisabled(true)"
              onClick={() => {
                instanceRef.current?.setDisabled(true);
                setState((s) => ({ ...s, disabled: true }));
                toast.success("setDisabled(true)");
              }}
            />
            <ImperativeButton
              label="setDisabled(false)"
              onClick={() => {
                instanceRef.current?.setDisabled(false);
                setState((s) => ({ ...s, disabled: false }));
                toast.success("setDisabled(false)");
              }}
            />
            <ImperativeButton
              label="setSize('lg')"
              onClick={() => {
                instanceRef.current?.setSize("lg");
                setState((s) => ({ ...s, size: "lg" }));
                toast.success('setSize("lg")');
              }}
            />
          </div>
        </section>

        {/* Documentation */}
        <ComponentDocumentation />
      </div>
    </div>
  );
}

// ---- Inspector primitives ----

function PropertyField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function SegmentedControl({
  value,
  onValueChange,
  options,
  columns,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: {
    value: string;
    label: string;
    icon?: LucideIcon;
    title?: string;
  }[];
  columns?: number;
}) {
  const cols = columns ?? options.length;
  return (
    <div
      className="grid gap-1 rounded-md border border-border bg-muted/20 p-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onValueChange(o.value)}
            aria-pressed={active}
            title={o.title ?? o.label}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-brand-purple-strong text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex flex-col">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground/70">{description}</span>
      </span>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand-lemon" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-[#17151D] transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function ImperativeButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 font-mono text-[11px] text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-brand-lemon/10 hover:text-brand-lemon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </button>
  );
}

// ---- Code generators ----

function generateJsCode(state: PlaygroundState): string {
  const opts: string[] = [];
  if (state.text) opts.push(`  text: ${JSON.stringify(state.text)}`);
  if (state.icon) {
    if (state.iconType === "image") {
      opts.push(`  icon: ${JSON.stringify(state.icon)},`);
      opts.push(`  iconType: "image",`);
    } else {
      opts.push(`  icon: ${JSON.stringify(state.icon)},`);
      opts.push(`  iconType: "icon",`);
    }
  }
  if (state.icon) opts.push(`  iconPosition: "${state.iconPosition}"`);
  opts.push(`  variant: "${state.variant}"`);
  opts.push(`  size: "${state.size}"`);
  if (state.disabled) opts.push(`  disabled: true`);
  if (state.fullWidth) opts.push(`  fullWidth: true`);

  return `import { CustomButton } from "@workshop/custom-button";

const container = document.querySelector("#custom-button");

const button = new CustomButton(container, {
${opts.join(",\n")}
});

button.on("click", () => {
  console.log("clicked");
});

// Programmatic control
// button.setText("Save");
// button.setIcon("check");
// button.setVariant("outline");
// button.setDisabled(true);
// button.destroy();`;
}

function generateHtmlCode(state: PlaygroundState): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="custom-button.css" /></head>
  <body>
    <div id="custom-button"></div>
    <script type="module" src="init.js"></script>
  </body>
</html>

<!-- Configuration:
  text:         ${JSON.stringify(state.text)}
  icon:         ${state.iconType === "icon" ? state.icon || "(none)" : "<image>"}
  iconType:     ${state.iconType}
  iconPosition: ${state.iconPosition}
  variant:      ${state.variant}
  size:         ${state.size}
  disabled:     ${state.disabled}
  fullWidth:    ${state.fullWidth}
-->`;
}

function generateCssCode(): string {
  return `/* Scoped styles — injected by the component, prefixed .custom-button- */
.custom-button-root {
  --cb-bg: #D9FF66; --cb-bg-hover: #C8F34F;
  --cb-color: #17151D; --cb-border: transparent;
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; height: 36px; padding: 0 14px;
  font: 500 14px/1 inherit; color: var(--cb-color);
  background: var(--cb-bg); border: 1px solid var(--cb-border);
  border-radius: 8px; cursor: pointer; user-select: none;
  transition: background-color 150ms ease, transform 80ms ease;
}
.custom-button-root:hover { background: var(--cb-bg-hover); }
.custom-button-root:active { transform: translateY(1px); }
.custom-button-root:focus-visible { outline: 2px solid rgba(217,255,102,0.55); outline-offset: 2px; }
.custom-button-root:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.custom-button-root.custom-button-icon-only { aspect-ratio: 1; width: 36px; padding: 0; }
.custom-button-root.custom-button-pos-top,
.custom-button-root.custom-button-pos-bottom { flex-direction: column; gap: 2px; padding-top: 6px; padding-bottom: 6px; height: auto; min-height: 36px; }
.custom-button-root.custom-button-full { width: 100%; }

[data-variant="primary"]   { --cb-bg:#D9FF66; --cb-bg-hover:#C8F34F; --cb-color:#17151D; }
[data-variant="secondary"] { --cb-bg:#342348; --cb-bg-hover:#4A3260; --cb-color:#F4F1FF; }
[data-variant="outline"]   { --cb-bg:transparent; --cb-bg-hover:rgba(217,255,102,0.08); --cb-color:#F4F1FF; --cb-border:rgba(244,241,255,0.18); }
[data-variant="ghost"]     { --cb-bg:transparent; --cb-bg-hover:rgba(244,241,255,0.06); --cb-color:#F4F1FF; }

[data-size="sm"] { --cb-h:32px; --cb-font-size:12px; --cb-pad-x:10px; --cb-gap:5px; }
[data-size="md"] { --cb-h:36px; --cb-font-size:14px; --cb-pad-x:14px; --cb-gap:6px; }
[data-size="lg"] { --cb-h:40px; --cb-font-size:16px; --cb-pad-x:18px; --cb-gap:8px; }`;
}

function generateApiCode(): string {
  return `type CustomButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type CustomButtonSize = "sm" | "md" | "lg";
type CustomButtonIconType = "icon" | "image";
type CustomButtonIconPosition = "left" | "right" | "top" | "bottom";

interface CustomButtonOptions {
  text?: string;                    // button label text
  icon?: string;                    // SVG icon name (Lucide) or image src
  iconType?: CustomButtonIconType;  // default "icon"
  iconPosition?: CustomButtonIconPosition; // default "left"
  variant?: CustomButtonVariant;    // default "primary"
  size?: CustomButtonSize;          // default "md"
  disabled?: boolean;               // default false
  fullWidth?: boolean;              // default false
}

class CustomButton {
  constructor(container: HTMLElement, options?: CustomButtonOptions);
  setText(text: string): void;
  setIcon(icon: string, type?: "icon" | "image"): void;
  setIconPosition(pos: CustomButtonIconPosition): void;
  setVariant(variant: CustomButtonVariant): void;
  setSize(size: CustomButtonSize): void;
  setDisabled(disabled: boolean): void;
  setFullWidth(fullWidth: boolean): void;
  on(event: "click", handler: () => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "click" — fires when the button is clicked (and not disabled)

// Rendering
//   - text only        → text button
//   - icon only        → square icon-only button
//   - text + icon      → icon positioned per iconPosition
//   - iconType "image" → icon is rendered as <img src=...>`;
}

// ---- Documentation ----

function ComponentDocumentation() {
  const meta = getComponent("custom-button")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Custom Button is a framework-independent vanilla JavaScript
          component — no React or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} Variants cover the common lemon, purple,
            outlined, and ghost treatments. Sizes map to a 32 / 36 / 40 px
            height ramp. The icon can be any of the built-in Lucide-style
            names or, when <code className="font-mono text-brand-lemon">iconType</code> is
            <code className="font-mono text-brand-lemon"> "image"</code>, a URL or
            data URI rendered as an <code className="font-mono text-brand-lemon">&lt;img&gt;</code>.
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
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Renders a real <code className="font-mono text-brand-lemon">&lt;button&gt;</code> element — keyboard, focus, and form-submission behavior for free.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Icon-only buttons get an <code className="font-mono text-brand-lemon">aria-label</code> derived from the icon name.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Disabled buttons use the native <code className="font-mono text-brand-lemon">disabled</code> attribute, which also blocks click events and removes the button from the tab order.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />A visible focus ring uses the lemon accent at 55% opacity.</li>
          </ul>
        </section>
      </div>

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
            ].map((s) => (
              <a
                key={s}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="block rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
