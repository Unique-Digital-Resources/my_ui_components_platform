"use client";

import * as React from "react";
import {
  RotateCcw,
  ArrowLeftRight,
  ArrowUpDown,
  Plus,
  Trash2,
  GripVertical,
  Check,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs, CollapsibleSection } from "@/components/platform/agent-skill-tabs";
import {
  ToggleGroupReact,
  type ToggleGroupOrientation,
  type ToggleGroupVariant,
  type ToggleGroupSize,
  type ToggleButtonItem,
  type ToggleGroupChangePayload,
} from "./toggle-group-react";
import type { ToggleGroup } from "@/lib/components/toggle-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaygroundState {
  multiselect: boolean;
  closable: boolean;
  reorderable: boolean;
  orientation: ToggleGroupOrientation;
  variant: ToggleGroupVariant;
  size: ToggleGroupSize;
}

const DEFAULTS: PlaygroundState = {
  multiselect: false,
  closable: false,
  reorderable: false,
  orientation: "horizontal",
  variant: "outline",
  size: "md",
};

const DEFAULT_ITEMS: ToggleButtonItem[] = [
  { id: "tg-bold", label: "Bold", icon: "bold", selected: true },
  { id: "tg-italic", label: "Italic", icon: "italic" },
  { id: "tg-underline", label: "Underline", icon: "underline" },
];

const ICON_OPTIONS: string[] = [
  "(none)",
  "bold",
  "italic",
  "underline",
  "check",
  "x",
  "plus",
  "star",
  "circle",
  "square",
  "heart",
  "bolt",
  "dot",
  "arrow-right",
  "settings",
  "folder",
  "file",
  "user",
  "tag",
  "eye",
  "bell",
  "search",
  "home",
];

export function ToggleGroupPlayground() {
  const meta = getComponent("toggle-group")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [items, setItems] = React.useState<ToggleButtonItem[]>(DEFAULT_ITEMS);
  const [selected, setSelected] = React.useState<string[]>(["tg-bold"]);
  const [activeTab, setActiveTab] = React.useState<
    "javascript" | "html" | "css" | "api"
  >("javascript");
  const instanceRef = React.useRef<ToggleGroup | null>(null);

  const onChange = React.useCallback((data: ToggleGroupChangePayload) => {
    setItems(data.items);
    setSelected(data.selected);
  }, []);

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    instanceRef.current?.setItems(DEFAULT_ITEMS);
    toast.success("Reset to defaults");
  }, []);

  // ---- Inspector: item edits ----

  const updateItem = React.useCallback(
    (id: string, patch: Partial<ToggleButtonItem>) => {
      const inst = instanceRef.current;
      if (!inst) return;
      const newItems = inst.getItems().map((it) =>
        it.id === id ? { ...it, ...patch } : it,
      );
      inst.setItems(newItems);
    },
    [],
  );

  const toggleItemSelected = React.useCallback(
    (id: string) => {
      const inst = instanceRef.current;
      if (!inst) return;
      if (state.multiselect) {
        const cur = inst.getSelected();
        const next = cur.includes(id)
          ? cur.filter((s) => s !== id)
          : [...cur, id];
        inst.setSelected(next);
      } else {
        // Single-select: clicking the selected one deselects (allows empty).
        const cur = inst.getSelected();
        if (cur.includes(id)) inst.setSelected([]);
        else inst.setSelected([id]);
      }
    },
    [state.multiselect],
  );

  const removeItem = React.useCallback((id: string) => {
    instanceRef.current?.removeItem(id);
  }, []);

  const addItem = React.useCallback(() => {
    const id = `tg-${Date.now().toString(36)}`;
    instanceRef.current?.addItem({ id, label: "New button", icon: "dot" });
  }, []);

  const moveItem = React.useCallback((id: string, delta: -1 | 1) => {
    const inst = instanceRef.current;
    if (!inst) return;
    const cur = inst.getItems();
    const idx = cur.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= cur.length) return;
    const next = cur.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(newIdx, 0, moved);
    inst.setItems(next);
  }, []);

  // ---- Code generation ----

  const jsCode = React.useMemo(() => generateJsCode(state, items), [state, items]);
  const htmlCode = React.useMemo(() => generateHtmlCode(), []);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

  const selectedLabel = selected.length > 0
    ? items.filter((i) => selected.includes(i.id)).map((i) => i.label).join(", ")
    : "(none)";

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
              <ToggleGroupReact
                items={items}
                multiselect={state.multiselect}
                closable={state.closable}
                reorderable={state.reorderable}
                orientation={state.orientation}
                variant={state.variant}
                size={state.size}
                onChange={onChange}
                instanceRef={instanceRef}
              />
            </div>
            {/* Output section — selected IDs */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {selected.length} selected
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CopyableValue
                    label="selected"
                    value={selected.length > 0 ? JSON.stringify(selected) : "[]"}
                  />
                  <CopyableValue label="labels" value={selectedLabel} />
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Click a button to toggle its selection. {state.closable ? "Click the X to remove a button." : ""}{" "}
                  {state.reorderable ? "Drag a button to reorder." : ""}
                </p>
              </div>
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/toggle-group-AGENT.md"
            skillPath="/docs/components/toggle-group-SKILL.md"
          >
              {/* Group properties section */}
              <section>
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Group
                </h3>
                <div className="flex flex-col gap-4">
                  {/* Behavior toggles */}
                  <PropertyField label="Multiselect" hint="Allow multiple selections">
                    <Switch
                      checked={state.multiselect}
                      onChange={(v) => update("multiselect", v)}
                    />
                  </PropertyField>
                  <PropertyField label="Closable" hint="Show X button on each toggle">
                    <Switch
                      checked={state.closable}
                      onChange={(v) => update("closable", v)}
                    />
                  </PropertyField>
                  <PropertyField label="Reorderable" hint="Drag-to-reorder (or Arrow keys)">
                    <Switch
                      checked={state.reorderable}
                      onChange={(v) => update("reorderable", v)}
                    />
                  </PropertyField>

                  {/* Orientation */}
                  <PropertyField label="Orientation" hint="Layout direction">
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

                  {/* Variant */}
                  <PropertyField label="Variant" hint="Button visual style">
                    <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                      {(["outline", "primary", "secondary"] as const).map((v) => {
                        const active = state.variant === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => update("variant", v)}
                            aria-pressed={active}
                            className={cn(
                              "flex items-center justify-center rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              active
                                ? "bg-brand-purple-strong text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            )}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </PropertyField>

                  {/* Size */}
                  <PropertyField label="Size" hint="Button height">
                    <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                      {(["sm", "md", "lg"] as const).map((s) => {
                        const active = state.size === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => update("size", s)}
                            aria-pressed={active}
                            className={cn(
                              "flex items-center justify-center rounded px-2 py-2 text-[11px] font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              active
                                ? "bg-brand-purple-strong text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </PropertyField>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Nested component properties — Buttons section (Figma/Godot style) */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Buttons ({items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-2.5 text-[12px] font-medium text-brand-lemon transition-colors hover:bg-brand-lemon/20"
                  >
                    <Plus className="h-3 w-3" />
                    Add button
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {items.length === 0 && (
                    <div className="rounded-md border border-dashed border-border p-6 text-center">
                      <p className="text-[12px] text-muted-foreground">
                        No buttons. Click &quot;Add button&quot; to create one.
                      </p>
                    </div>
                  )}
                  {items.map((it, idx) => (
                    <ButtonItemEditor
                      key={it.id}
                      item={it}
                      index={idx}
                      total={items.length}
                      multiselect={state.multiselect}
                      iconOptions={ICON_OPTIONS}
                      onLabelChange={(label) => updateItem(it.id, { label })}
                      onIconChange={(icon) =>
                        updateItem(it.id, { icon: icon === "(none)" ? undefined : icon })
                      }
                      onSelectedToggle={() => toggleItemSelected(it.id)}
                      onMoveUp={() => moveItem(it.id, -1)}
                      onMoveDown={() => moveItem(it.id, 1)}
                      onRemove={() => removeItem(it.id)}
                    />
                  ))}
                </div>
              </section>

              {/* Nested component: Button Style (CustomButton) */}
              <CollapsibleSection title="Button Style" icon={MousePointerClick}>
                <PropertyField label="Button variant" hint="Visual style of toggle buttons">
                  <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                    {([
                      { value: "outline", label: "Outline" },
                      { value: "primary", label: "Primary" },
                      { value: "secondary", label: "Secondary" },
                    ] as const).map((v) => {
                      const active = state.variant === v.value;
                      return (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => update("variant", v.value)}
                          aria-pressed={active}
                          className={cn(
                            "rounded px-2 py-2 text-[11px] font-medium transition-colors",
                            active
                              ? "bg-brand-purple-strong text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </PropertyField>
                <PropertyField label="Button size" hint="Size of toggle buttons">
                  <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                    {([
                      { value: "sm", label: "SM" },
                      { value: "md", label: "MD" },
                      { value: "lg", label: "LG" },
                    ] as const).map((v) => {
                      const active = state.size === v.value;
                      return (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => update("size", v.value)}
                          aria-pressed={active}
                          className={cn(
                            "rounded px-2 py-2 text-[11px] font-medium transition-colors",
                            active
                              ? "bg-brand-purple-strong text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </PropertyField>
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
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[12px] font-medium text-foreground">{label}</label>
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "border-brand-lemon bg-brand-lemon"
          : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-foreground transition-transform",
          checked ? "translate-x-[18px] bg-[#17151D]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

// ---- Nested component editor (Figma/Godot style) ----

function ButtonItemEditor({
  item,
  index,
  total,
  multiselect,
  iconOptions,
  onLabelChange,
  onIconChange,
  onSelectedToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  item: ToggleButtonItem;
  index: number;
  total: number;
  multiselect: boolean;
  iconOptions: string[];
  onLabelChange: (label: string) => void;
  onIconChange: (icon: string) => void;
  onSelectedToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const isSelected = !!item.selected;

  return (
    <div className="rounded-md border border-border bg-muted/20">
      {/* Row 1: summary + collapse */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background font-mono text-[10px] text-muted-foreground">
          {index + 1}
        </span>
        <span className="flex-1 truncate font-mono text-[12px] text-foreground">
          {item.label || "(empty)"}
        </span>
        {isSelected && (
          <span className="inline-flex items-center gap-1 rounded border border-brand-lemon/40 bg-brand-lemon/10 px-1.5 py-0.5 text-[10px] font-mono text-brand-lemon">
            <Check className="h-2.5 w-2.5" />
            on
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          title="Remove button"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Row 2: nested properties */}
      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-border/60 px-2 py-2.5">
          {/* Label */}
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              Label
            </label>
            <input
              type="text"
              value={item.label}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Button label"
              className="h-7 w-full rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              Icon
            </label>
            <select
              value={item.icon ?? "(none)"}
              onChange={(e) => onIconChange(e.target.value)}
              className="h-7 w-full rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {iconOptions.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </div>

          {/* Selected + reorder */}
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[12px] text-foreground">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelectedToggle}
                className="h-3.5 w-3.5 accent-brand-lemon"
              />
              Selected
            </label>
            <div className="flex items-center gap-1">
              <span className="mr-1 flex items-center text-[10px] font-mono text-muted-foreground/70">
                <GripVertical className="h-3 w-3" />
                order
              </span>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                title="Move up"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index === total - 1}
                title="Move down"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ID (read-only) */}
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              id
            </span>
            <code className="font-mono text-[10px] text-muted-foreground">{item.id}</code>
          </div>
          {!multiselect && isSelected && (
            <p className="text-[10px] text-muted-foreground/70">
              In single-select mode, only one button can be selected at a time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Code generators ----

function generateJsCode(state: PlaygroundState, items: ToggleButtonItem[]): string {
  const itemsStr = items.length > 0
    ? items.map((i) => {
        const parts = [`id: "${i.id}"`, `label: "${i.label}"`];
        if (i.icon) parts.push(`icon: "${i.icon}"`);
        if (i.selected) parts.push(`selected: true`);
        return `  { ${parts.join(", ")} }`;
      }).join(",\n")
    : "  { id: \"a\", label: \"Bold\", icon: \"bold\", selected: true },\n  { id: \"b\", label: \"Italic\", icon: \"italic\" }";
  return `import { ToggleGroup } from "@workshop/toggle-group";

const container = document.querySelector("#toggle-group");

const group = new ToggleGroup(container, {
  items: [
${itemsStr}
  ],
  multiselect: ${state.multiselect},
  closable: ${state.closable},
  reorderable: ${state.reorderable},
  orientation: "${state.orientation}",
  variant: "${state.variant}",
  size: "${state.size}",
});

group.on("change", ({ items, selected }) => {
  // Fires when selection, order, or item set changes
  console.log("selected:", selected);
});

group.on("select", ({ selected, item }) => {
  // Fires when the user clicks a toggle
});

group.on("reorder", ({ items }) => {
  // Fires after a drag-to-reorder
});

group.on("close", ({ id, items }) => {
  // Fires when a button's X is clicked
});

// Programmatic control
// group.addItem({ id: "new", label: "New", icon: "plus" });
// group.removeItem("a");
// group.setSelected(["b"]);
// group.setVariant("primary");
// group.destroy();`;
}

function generateHtmlCode(): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="toggle-group.css" /></head>
  <body>
    <div id="toggle-group"></div>
    <script type="module" src="init.js"></script>
  </body>
</html>`;
}

function generateCssCode(): string {
  return `/* The component ships its own scoped styles (.toggle-group-* prefix).
   Override the visual tokens below to customize appearance. */

:root {
  /* Brand tokens used by the component */
  --brand-lemon: #D9FF66;
  --brand-lemon-hover: #C8F34F;
  --brand-purple-strong: #342348;
  --border: #383343;
  --accent: #342348;
  --foreground: #F4F1FF;
  --muted-foreground: #B8B2CA;
}

/* Example: customize the focus ring color */
.toggle-group {
  --tg-focus-ring: rgba(217, 255, 102, 0.55);
}

/* Example: override a specific variant's selected state */
.toggle-group__item--selected.toggle-group__item--outline {
  background: rgba(217, 255, 102, 0.14);
  border-color: var(--brand-lemon);
  color: var(--brand-lemon);
}`;
}

function generateApiCode(): string {
  return `type ToggleGroupOrientation = "horizontal" | "vertical";
type ToggleGroupVariant = "primary" | "secondary" | "outline";
type ToggleGroupSize = "sm" | "md" | "lg";

interface ToggleButtonItem {
  id: string;
  label: string;
  icon?: string;          // built-in name | data URI | raw SVG
  selected?: boolean;     // default false
}

interface ToggleGroupOptions {
  items?: ToggleButtonItem[];
  multiselect?: boolean;          // default false
  closable?: boolean;             // default false
  reorderable?: boolean;          // default false
  orientation?: ToggleGroupOrientation; // default "horizontal"
  variant?: ToggleGroupVariant;   // default "outline"
  size?: ToggleGroupSize;         // default "md"
}

class ToggleGroup {
  constructor(container: HTMLElement, options?: ToggleGroupOptions);
  getItems(): ToggleButtonItem[];
  setItems(items: ToggleButtonItem[]): void;
  addItem(item: ToggleButtonItem): void;
  removeItem(id: string): void;
  getSelected(): string[];
  setSelected(ids: string[]): void;
  setMultiselect(on: boolean): void;
  setClosable(on: boolean): void;
  setReorderable(on: boolean): void;
  setOrientation(orientation: ToggleGroupOrientation): void;
  setVariant(variant: ToggleGroupVariant): void;
  setSize(size: ToggleGroupSize): void;
  on(event: "change" | "reorder" | "close" | "select",
     handler: (data: any) => void): void;
  off(event: string, handler: Function): void;
  destroy(): void;
}

// Events
//   "change"  — fires on selection, reorder, add, remove, or setItems
//   "select"  — fires when the user clicks a toggle (single or multi)
//   "reorder" — fires after a drag-to-reorder completes
//   "close"   — fires when a button's X is clicked (item is removed)

// Interaction
//   - Click a button to toggle its selection
//   - Single-select: clicking selects and deselects others
//   - Multiselect: each button toggles independently
//   - Closable: click the X on a button to remove it
//   - Reorderable: drag a button to swap positions; Arrow keys also work
//   - Keyboard: Enter/Space toggles; Delete/Backspace closes (if closable)`;
}

// ---- Documentation ----

function ComponentDocumentation() {
  const meta = getComponent("toggle-group")!;
  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Toggle Group is a framework-independent vanilla JavaScript component — no React or Next.js required.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} Click a button to toggle its selection. Enable closable to show an embedded X button on each toggle. Enable reorderable to drag buttons to new positions, or use Arrow keys when focused.
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
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Each toggle is a focusable element with role=&quot;button&quot; and aria-pressed reflecting its selected state.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Enter and Space toggle the focused button.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />When reorderable, Arrow Left/Up and Arrow Right/Down move the focused button within the group.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />When closable, Delete and Backspace remove the focused button.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Close buttons are excluded from the tab order (tabindex=-1) to keep keyboard navigation on the toggles themselves.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Icons</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The <code className="font-mono text-brand-lemon">icon</code> field accepts a built-in icon name, a <code className="font-mono text-brand-lemon">data:</code> URI, or a raw SVG string. Built-in names include: bold, italic, underline, check, x, plus, star, circle, square, heart, bolt, dot, arrow-right, settings, folder, file, user, tag, eye, bell, search, home.
          </p>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "When to use it", "When not to use it", "Properties and defaults", "Methods", "Events", "Accessibility", "Icons"].map((s) => (
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
