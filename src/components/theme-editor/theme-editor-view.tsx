"use client";

import * as React from "react";
import {
  Plus, Trash2, RotateCcw, Eye, EyeOff, Download, Upload, Copy, Check,
  Palette, Ruler, CornerDownRight, Type, Box, Clock, Square,
  ChevronDown, Crosshair, Move, Frame,
} from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/platform/code-block";
import { CustomButton } from "@/lib/components/custom-button";
import { ColorWheelPicker } from "@/lib/components/color-wheel";
import { PeriodicRange } from "@/lib/components/periodic-range";
import { ColorRange } from "@/lib/components/color-range";
import { ColorRamp } from "@/lib/components/color-ramp";
import { ToggleGroup } from "@/lib/components/toggle-group";
import { Breadcrumb } from "@/lib/components/breadcrumb";
import { Calendar } from "@/lib/components/calendar";
import { Board } from "@/lib/components/board";
import {
  useThemeTokens,
  TOKEN_CATEGORIES,
  DEFAULT_TOKENS,
  isColorValue,
  isDimensionValue,
  isDurationValue,
  isNumericValue,
  KNOWN_TARGET_CLASSES,
  KNOWN_TARGET_IDS,
  type TokenCategory,
  type ThemeTokens,
  type Target,
  type Specificity,
  type CornerRadii,
} from "@/store/theme-tokens";
import { useComponentSettings } from "@/store/component-settings";
import { useThemePresets } from "@/store/theme-presets";

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function ThemeEditorView() {
  const [exportOpen, setExportOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1600px] px-6 pt-6 pb-6 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <Palette className="h-3.5 w-3.5 text-brand-lemon" />
                Design System · Truth Base
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Theme &amp; Token Editor
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
                The single source of truth for the design system. Edit colors, spacing, per-corner
                radii, per-side borders, typography, shadows, motion, and variants — with custom
                tokens and class/id targeting. The Live Preview on the left IS the editor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ApplyToggle />
              <button type="button" onClick={() => setImportOpen(v => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 text-[12px] font-medium text-foreground hover:bg-muted/50">
                <Upload className="h-3.5 w-3.5" /> Import
              </button>
              <button type="button" onClick={() => setExportOpen(v => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 text-[12px] font-medium text-foreground hover:bg-muted/50">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <ResetAllButton />
            </div>
          </div>
        </div>
      </div>

      {/* Body — tabs container under Theme Presets */}
      <div className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-10 flex-1">
        <div className="flex flex-col gap-3">
          <ThemePresetsPanel />
          {importOpen && <ImportPanel onClose={() => setImportOpen(false)} />}
          {exportOpen && <ExportPanel onClose={() => setExportOpen(false)} />}
          <ThemeEditorTabs />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Apply toggle                                                        */
/* ------------------------------------------------------------------ */

function ApplyToggle() {
  const applied = useThemeTokens((s) => s.applied);
  const applyToDocument = useThemeTokens((s) => s.applyToDocument);
  const clearFromDocument = useThemeTokens((s) => s.clearFromDocument);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={applied}
      onClick={() => (applied ? clearFromDocument() : applyToDocument())}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[12px] font-medium transition-colors",
        applied
          ? "border-brand-lemon/40 bg-brand-lemon/10 text-brand-lemon"
          : "border-border bg-muted/30 text-foreground hover:bg-muted/50",
      )}
    >
      {applied ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {applied ? "Live: On" : "Live: Off"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Target selector (base / class / id)                                 */
/* ------------------------------------------------------------------ */

function TargetSelector() {
  const target = useThemeTokens((s) => s.target);
  const setTarget = useThemeTokens((s) => s.setTarget);

  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-muted/20 px-1.5">
      <Crosshair className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex gap-0.5">
        {(["base", "class", "id"] as Specificity[]).map((sp) => (
          <button
            key={sp}
            type="button"
            onClick={() => setTarget({ specificity: sp, name: "" })}
            aria-pressed={target.specificity === sp}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-mono font-medium transition-colors",
              target.specificity === sp
                ? "bg-brand-purple-strong text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={sp === "base" ? "All elements" : sp === "class" ? "A class of elements" : "A single element by id"}
          >
            {sp}
          </button>
        ))}
      </div>
      {target.specificity === "class" && (
        <select
          value={target.name}
          onChange={(e) => setTarget({ specificity: "class", name: e.target.value })}
          className="h-7 max-w-[140px] rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
          title="Target class"
        >
          {KNOWN_TARGET_CLASSES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      {target.specificity === "id" && (
        <select
          value={target.name}
          onChange={(e) => setTarget({ specificity: "id", name: e.target.value })}
          className="h-7 max-w-[140px] rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
          title="Target id"
        >
          {KNOWN_TARGET_IDS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reset all                                                           */
/* ------------------------------------------------------------------ */

function ResetAllButton() {
  const resetAll = useThemeTokens((s) => s.resetAll);
  const [confirm, setConfirm] = React.useState(false);

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
    );
  }
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10">
      <span className="px-2 text-[11px] text-destructive">Reset all?</span>
      <button
        type="button"
        onClick={() => { resetAll(); setConfirm(false); }}
        className="h-7 rounded bg-destructive px-2 text-[11px] font-medium text-white"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="h-7 rounded px-2 text-[11px] text-muted-foreground"
      >
        No
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Theme presets panel — save/load/rename themes + modes               */
/* ------------------------------------------------------------------ */

function ThemePresetsPanel() {
  const presets = useThemePresets(s => s.presets);
  const activePresetId = useThemePresets(s => s.activePresetId);
  const setActiveTheme = useThemePresets(s => s.setActiveTheme);
  const createTheme = useThemePresets(s => s.createTheme);
  const renameTheme = useThemePresets(s => s.renameTheme);
  const deleteTheme = useThemePresets(s => s.deleteTheme);
  const createMode = useThemePresets(s => s.createMode);
  const renameMode = useThemePresets(s => s.renameMode);
  const deleteMode = useThemePresets(s => s.deleteMode);
  const setActiveMode = useThemePresets(s => s.setActiveMode);
  const saveEditorIntoMode = useThemePresets(s => s.saveEditorIntoMode);

  const editorTokens = useThemeTokens(s => s.tokens);
  const importTokens = useThemeTokens(s => s.importTokens);
  const applied = useThemeTokens(s => s.applied);
  const applyToDocument = useThemeTokens(s => s.applyToDocument);

  const activePreset = presets.find(t => t.id === activePresetId) ?? null;
  const activeMode = activePreset?.modes.find(m => m.id === activePreset?.activeModeId) ?? null;

  const handleSelectTheme = (themeId: string) => {
    setActiveTheme(themeId);
    const theme = presets.find(t => t.id === themeId);
    if (!theme) return;
    const mode = theme.modes.find(m => m.id === theme.activeModeId) ?? theme.modes[0];
    if (!mode) return;
    const json = JSON.stringify(mode.tokens);
    setLastSavedJson(json);
    importTokens(mode.tokens);
    if (applied) applyToDocument();
  };

  const handleSelectMode = (themeId: string, modeId: string) => {
    setActiveMode(themeId, modeId);
    const theme = presets.find(t => t.id === themeId);
    const mode = theme?.modes.find(m => m.id === modeId);
    if (!mode) return;
    const json = JSON.stringify(mode.tokens);
    setLastSavedJson(json);
    importTokens(mode.tokens);
    if (applied) applyToDocument();
  };

  const handleCreateTheme = () => {
    const id = createTheme();
    setActiveTheme(id);
    const json = JSON.stringify(DEFAULT_TOKENS);
    setLastSavedJson(json);
    importTokens(DEFAULT_TOKENS);
    if (applied) applyToDocument();
  };

  const handleCreateMode = (themeId: string) => {
    const modeId = createMode(themeId);
    setActiveMode(themeId, modeId);
    const json = JSON.stringify(DEFAULT_TOKENS);
    setLastSavedJson(json);
    importTokens(DEFAULT_TOKENS);
    if (applied) applyToDocument();
  };

  // Auto-save: when editor tokens change, auto-save into the active mode.
  // Uses a separate state to track what was last saved to avoid infinite loops.
  const [lastSavedJson, setLastSavedJson] = React.useState("");
  const currentPresetId = activePreset?.id;
  const currentModeId = activeMode?.id;

  const editorJson = JSON.stringify(editorTokens);
  React.useEffect(() => {
    if (!currentPresetId || !currentModeId) return;
    if (editorJson === lastSavedJson) return;
    setLastSavedJson(editorJson);
    saveEditorIntoMode(currentPresetId, currentModeId, editorTokens);
  }, [editorJson, lastSavedJson, editorTokens, saveEditorIntoMode, currentPresetId, currentModeId]);

  const resetPresets = useThemePresets(s => s.resetPresets);

  const handleReset = () => {
    resetPresets();
    importTokens(DEFAULT_TOKENS);
    if (applied) applyToDocument();
    setLastSavedJson(JSON.stringify(DEFAULT_TOKENS));
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="eyebrow">Theme Presets</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset}
            className="inline-flex h-7 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            title="Reset all presets to defaults">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:gap-4">
        <div className="lg:w-[240px] shrink-0">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Themes</label>
            <button type="button" onClick={handleCreateTheme}
              className="inline-flex h-5 items-center gap-0.5 rounded border border-dashed border-border bg-muted/20 px-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:border-brand-lemon/40"
              title="Add theme">
              <Plus className="h-2.5 w-2.5" /> Add
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto rounded-md border border-border p-1">
            {presets.map(theme => (
              <div key={theme.id} className={cn("flex items-center gap-1 rounded border px-1.5 py-1", theme.id === activePresetId ? "border-brand-lemon/40 bg-brand-lemon/10" : "border-transparent bg-background")}>
                <PresetNameEditor name={theme.name} onRename={n => renameTheme(theme.id, n)} onClick={() => handleSelectTheme(theme.id)} />
                <span className="text-[8px] font-mono text-muted-foreground shrink-0">{theme.modes.length}m</span>
                {!theme.readonly && <button type="button" onClick={() => deleteTheme(theme.id)} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive shrink-0" title="Delete theme"><Trash2 className="h-3 w-3" /></button>}
                {theme.readonly && <span className="text-[8px] text-muted-foreground/40 shrink-0 w-5 text-center" title="Protected">🔒</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Modes {activePreset && <span className="text-muted-foreground/60">· {activePreset.name}</span>}</label>
            {activePreset && <button type="button" onClick={() => handleCreateMode(activePreset.id)} className="inline-flex h-5 items-center gap-0.5 rounded border border-dashed border-border bg-muted/20 px-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:border-brand-lemon/40" title="Add mode"><Plus className="h-2.5 w-2.5" /> Add</button>}
          </div>
          {activePreset ? (
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto rounded-md border border-border p-1">
              {activePreset.modes.map(mode => (
                <div key={mode.id} className={cn("flex items-center gap-1 rounded border px-1.5 py-1", mode.id === activePreset.activeModeId ? "border-brand-lemon/40 bg-brand-lemon/10" : "border-transparent bg-background")}>
                  <PresetNameEditor name={mode.name} onRename={n => renameMode(activePreset.id, mode.id, n)} onClick={() => handleSelectMode(activePreset.id, mode.id)} />
                  {!mode.readonly && <button type="button" onClick={() => deleteMode(activePreset.id, mode.id)} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive shrink-0" title="Delete mode"><Trash2 className="h-3 w-3" /></button>}
                  {mode.readonly && <span className="text-[8px] text-muted-foreground/40 shrink-0 w-5 text-center" title="Protected">🔒</span>}
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-muted-foreground">No theme selected.</p>}
          {activeMode && <div className="mt-2 text-[10px] text-muted-foreground">Active: <span className="font-mono text-foreground">{activePreset?.name}</span> / <span className="font-mono text-foreground">{activeMode.name}</span></div>}
        </div>
      </div>
    </div>
  );
}

function PresetNameEditor({ name, onRename, onClick }: { name: string; onRename: (n: string) => void; onClick: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  React.useEffect(() => setDraft(name), [name]);
  if (editing) return (
    <input type="text" value={draft} autoFocus onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }}
      onKeyDown={e => { if (e.key === "Enter") { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); } else if (e.key === "Escape") { setDraft(name); setEditing(false); } }}
      onClick={e => e.stopPropagation()}
      className="h-5 flex-1 min-w-[60px] rounded border border-brand-lemon/40 bg-background px-1 text-[10px] font-mono text-foreground outline-none" />
  );
  return (
    <button type="button" onClick={e => { onClick(); if (e.detail >= 2) setEditing(true); }} onDoubleClick={() => setEditing(true)}
      className="flex-1 min-w-[60px] text-left text-[11px] font-medium text-foreground hover:text-brand-lemon truncate"
      title="Click to select, double-click to rename">{name}</button>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs container — Tab 1: Token Editor, Tab 2: Component Preview     */
/* ------------------------------------------------------------------ */

function ThemeEditorTabs() {
  const [activeTab, setActiveTab] = React.useState<"tokens" | "components">("tokens");
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-surface-2">
        {([
          { id: "tokens" as const, label: "Token Editor" },
          { id: "components" as const, label: "Component Preview" },
        ]).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn(
              "relative px-4 py-2.5 text-[12px] font-medium transition-colors",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div className="p-3">
        {activeTab === "tokens" && <LivePreviewEditor />}
        {activeTab === "components" && <ComponentPreviewTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component Preview tab — left: live previews, right: per-component  */
/* style editor with token inheritance (direct > parent > generalized) */
/* ------------------------------------------------------------------ */

/** Per-component style override store (in-memory, not persisted). */
const componentOverrides = create<{
  overrides: Record<string, Record<string, string>>;
  setOverride: (componentId: string, prop: string, value: string) => void;
  clearOverride: (componentId: string, prop: string) => void;
}>()((set) => ({
  overrides: {},
  setOverride: (componentId, prop, value) =>
    set((s) => ({
      overrides: {
        ...s.overrides,
        [componentId]: { ...(s.overrides[componentId] ?? {}), [prop]: value },
      },
    })),
  clearOverride: (componentId, prop) =>
    set((s) => {
      const co = { ...(s.overrides[componentId] ?? {}) };
      delete co[prop];
      return { overrides: { ...s.overrides, [componentId]: co } };
    }),
}));

/** Component definitions for the preview tab. */
/** Component definition with optional sub-components (classes) and direct items (ids). */
interface PreviewComponent {
  id: string;
  name: string;
  category: string;
  parent: string;
  description: string;
  tokens: string[];
  /** Sub-components (CSS classes) that this component contains. */
  subComponents?: { id: string; name: string; description: string; tokens: string[] }[];
  /** Direct items (specific instances) that can be styled individually. */
  directItems?: { id: string; name: string; description: string; subComponent: string; tokens: string[] }[];
}

const PREVIEW_COMPONENTS: PreviewComponent[] = [
  {
    id: "button-primary", name: "Button · Primary", category: "button", parent: "custom-button",
    description: "Primary action button",
    tokens: ["background", "color", "border-radius", "padding", "font-size", "border"],
  },
  {
    id: "button-secondary", name: "Button · Secondary", category: "button", parent: "custom-button",
    description: "Secondary action button",
    tokens: ["background", "color", "border-radius", "padding", "font-size"],
  },
  {
    id: "card", name: "Card", category: "surface", parent: "panel",
    description: "Content card surface",
    tokens: ["background", "color", "border-radius", "border", "padding", "box-shadow"],
  },
  {
    id: "input", name: "Text Input", category: "form", parent: "input",
    description: "Text input field",
    tokens: ["background", "color", "border", "border-radius", "padding", "font-size"],
  },
  {
    id: "badge", name: "Badge", category: "display", parent: "badge",
    description: "Status badge",
    tokens: ["background", "color", "border-radius", "padding", "font-size"],
  },
  {
    id: "badge-success", name: "Badge · Success", category: "display", parent: "badge",
    description: "Success status badge",
    tokens: ["background", "color", "border-radius", "padding"],
  },
  {
    id: "periodic-range", name: "Periodic Range", category: "input", parent: "periodic-range",
    description: "Dual-thumb range slider",
    tokens: ["background", "border-radius", "height"],
    subComponents: [
      { id: "periodic-range:thumb", name: "Thumbs (class)", description: "Both min and max thumbs", tokens: ["background", "color", "border", "border-radius", "width", "height"] },
      { id: "periodic-range:track", name: "Track", description: "The slider track", tokens: ["background", "height", "border-radius"] },
    ],
    directItems: [
      { id: "periodic-range:min-thumb", name: "Min Thumb (id)", description: "The minimum value thumb", subComponent: "periodic-range:thumb", tokens: ["background", "border", "border-radius", "width", "height"] },
      { id: "periodic-range:max-thumb", name: "Max Thumb (id)", description: "The maximum value thumb", subComponent: "periodic-range:thumb", tokens: ["background", "border", "border-radius", "width", "height"] },
    ],
  },
  {
    id: "color-range", name: "Color Range", category: "color", parent: "color-range",
    description: "1D color slider",
    tokens: ["background", "border-radius", "height"],
    subComponents: [
      { id: "color-range:thumb", name: "Thumb (class)", description: "The color picker thumb", tokens: ["background", "border", "border-radius", "width", "height"] },
    ],
  },
  {
    id: "color-ramp", name: "Color Ramp", category: "color", parent: "color-ramp",
    description: "Multi-stop color gradient",
    tokens: ["background", "border-radius", "height"],
    subComponents: [
      { id: "color-ramp:thumb", name: "Stop Thumbs (class)", description: "Gradient stop thumbs", tokens: ["background", "border", "border-radius", "width", "height"] },
    ],
  },
  {
    id: "color-wheel", name: "Color Wheel", category: "color", parent: "color-wheel",
    description: "Hue wheel picker",
    tokens: ["border-radius", "box-shadow"],
    subComponents: [
      { id: "color-wheel:inner", name: "Inner Shape", description: "The inner selection shape", tokens: ["background", "border", "border-radius"] },
    ],
  },
  {
    id: "toggle-group", name: "Toggle Group", category: "input", parent: "toggle-group",
    description: "Toggle button group",
    tokens: ["background", "border", "border-radius", "padding"],
    subComponents: [
      { id: "toggle-group:item", name: "Toggle Items (class)", description: "Individual toggle buttons", tokens: ["background", "color", "border-radius", "padding", "font-size"] },
      { id: "toggle-group:active", name: "Active Item", description: "The active/selected toggle", tokens: ["background", "color"] },
    ],
  },
  {
    id: "calendar", name: "Calendar", category: "input", parent: "calendar",
    description: "Date picker calendar",
    tokens: ["background", "border", "border-radius", "padding"],
    subComponents: [
      { id: "calendar:cell", name: "Day Cells (class)", description: "All day cells", tokens: ["background", "color", "border-radius", "padding", "font-size"] },
      { id: "calendar:header", name: "Header", description: "Month/year navigation header", tokens: ["color", "font-size", "padding"] },
    ],
    directItems: [
      { id: "calendar:today-cell", name: "Today Cell (id)", description: "Today's date cell", subComponent: "calendar:cell", tokens: ["background", "color", "border-radius"] },
    ],
  },
  {
    id: "board", name: "Board", category: "layout", parent: "board",
    description: "Infinite canvas board",
    tokens: ["background", "border"],
    subComponents: [
      { id: "board:grid", name: "Grid", description: "Background grid pattern", tokens: ["background"] },
    ],
  },
  {
    id: "breadcrumb", name: "Breadcrumb", category: "navigation", parent: "breadcrumb",
    description: "Navigation breadcrumb trail",
    tokens: ["color", "font-size", "padding"],
    subComponents: [
      { id: "breadcrumb:item", name: "Crumb Items (class)", description: "Individual breadcrumb links", tokens: ["color", "font-size"] },
      { id: "breadcrumb:separator", name: "Separator", description: "Separator between crumbs", tokens: ["color"] },
    ],
  },
];

/** Resolve a CSS property for a component using inheritance:
 *  1. Direct item override (if this is a direct item with its own override)
 *  2. Sub-component (class) override (if the item belongs to a sub-component)
 *  3. Parent component override (if set)
 *  4. Generalized token from the token store
 */
function resolveStyle(
  itemId: string,
  prop: string,
  parentChain: string[],
  overrides: Record<string, Record<string, string>>,
  tokens: ThemeTokens,
): { value: string; source: "direct" | "parent" | "token" } {
  // Walk the parent chain: itemId → subComponent → component → generalized token
  // Check each level for an override
  const chain = [itemId, ...parentChain];
  for (let i = 0; i < chain.length; i++) {
    const id = chain[i];
    const val = overrides[id]?.[prop];
    if (val) {
      return { value: val, source: i === 0 ? "direct" : "parent" };
    }
  }
  // 4. Generalized token defaults
  const defaults: Record<string, string> = {
    background: "var(--card)", color: "var(--card-foreground)",
    "border-radius": "var(--radius-md)", border: "1px solid var(--border)",
    padding: "var(--padding-3)", "font-size": "var(--text-sm)",
    "box-shadow": "var(--shadow-md)", height: "36px", width: "auto",
  };
  // Component-specific defaults
  const compId = parentChain[parentChain.length - 1] ?? itemId;
  const itemBase = itemId.split(":")[0];
  if (itemBase === "button-primary" || compId === "button-primary") {
    defaults.background = "var(--primary)"; defaults.color = "var(--primary-foreground)";
    defaults.padding = "var(--padding-2) var(--padding-4)";
  }
  if (itemBase === "button-secondary" || compId === "button-secondary") {
    defaults.background = "var(--secondary)"; defaults.color = "var(--secondary-foreground)";
  }
  if (itemBase === "input" || compId === "input") {
    defaults.background = "var(--background)"; defaults.color = "var(--foreground)";
  }
  if (itemBase === "badge" || compId === "badge") {
    defaults.background = "var(--secondary)"; defaults.color = "var(--secondary-foreground)";
    defaults.padding = "var(--padding-1) var(--padding-3)"; defaults["border-radius"] = "var(--radius-pill)";
  }
  if (itemBase === "badge-success" || compId === "badge-success") {
    defaults.background = "var(--success)"; defaults.color = "#17151D";
  }
  // Thumb defaults
  if (itemId.includes(":thumb") || itemId.includes(":min-thumb") || itemId.includes(":max-thumb")) {
    defaults.background = "var(--brand-lemon)"; defaults.border = "2px solid var(--brand-purple-strong)";
    defaults["border-radius"] = "var(--radius-pill)"; defaults.width = "14px"; defaults.height = "18px";
  }
  // Calendar cell defaults
  if (itemId.includes(":cell")) {
    defaults.background = "transparent"; defaults.color = "var(--foreground)";
    defaults.padding = "var(--padding-2)"; defaults["border-radius"] = "var(--radius-sm)";
  }
  if (itemId.includes(":today-cell")) {
    defaults.background = "var(--brand-lemon)"; defaults.color = "#17151D";
  }
  // Board defaults
  if (itemBase === "board" || compId === "board") {
    defaults.background = "var(--background)"; defaults.border = "1px solid var(--border)";
  }
  return { value: defaults[prop] ?? "", source: "token" };
}

/** Flatten all styleable items from a component into a list for the editor. */
function getStyleableItems(comp: PreviewComponent): { id: string; name: string; description: string; tokens: string[]; parentChain: string[]; level: number }[] {
  const items: { id: string; name: string; description: string; tokens: string[]; parentChain: string[]; level: number }[] = [];
  // Component itself
  items.push({ id: comp.id, name: comp.name, description: comp.description, tokens: comp.tokens, parentChain: [], level: 0 });
  // Sub-components (classes)
  if (comp.subComponents) {
    for (const sc of comp.subComponents) {
      items.push({ id: sc.id, name: sc.name, description: sc.description, tokens: sc.tokens, parentChain: [comp.id], level: 1 });
    }
  }
  // Direct items (ids)
  if (comp.directItems) {
    for (const di of comp.directItems) {
      items.push({ id: di.id, name: di.name, description: di.description, tokens: di.tokens, parentChain: [di.subComponent, comp.id], level: 2 });
    }
  }
  return items;
}

/** Mount a real vanilla component in a React container. */
function RealComponentPreview({ compId, overrides }: { compId: string; overrides: Record<string, Record<string, string>> }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<unknown>(null);
  // Read shared settings from the component-settings store (synced from playgrounds)
  const compSettings = useComponentSettings(s => s.settings);

  // Map compId to the slug used in the settings store
  const settingsSlug: Record<string, string> = {
    "periodic-range": "periodic-range",
    "color-range": "color-range",
    "color-ramp": "color-ramp",
    "color-wheel": "color-wheel",
    "toggle-group": "toggle-group",
    "calendar": "calendar",
    "board": "board",
    "breadcrumb": "breadcrumb",
  };
  const slug = settingsSlug[compId] ?? compId;
  const settings = compSettings[slug] ?? {};

  // Build a map of CSS property → value from overrides for this component + parent chain
  const buildOverrideStyle = (id: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const o = overrides[id] ?? {};
    for (const [prop, val] of Object.entries(o)) {
      result[prop] = val; // props are already in CSS kebab-case from the editor
    }
    // Also check parent chain for inherited overrides
    const parentChain: string[] = [];
    if (id.includes(":")) {
      const parts = id.split(":");
      parentChain.push(parts[0]); // component
      if (parts.length > 1) parentChain.unshift(parts[0] + ":" + parts[1].split("-")[0]); // sub-component prefix
    }
    for (const pid of parentChain) {
      const po = overrides[pid] ?? {};
      for (const [prop, val] of Object.entries(po)) {
        if (!(prop in result)) result[prop] = val;
      }
    }
    return result;
  };

  React.useEffect(() => {
    if (!containerRef.current) return;
    const prev = instanceRef.current as { destroy?: () => void; getElement?: () => HTMLElement } | null;
    if (prev?.destroy) prev.destroy();
    instanceRef.current = null;
    containerRef.current.innerHTML = "";

    const el = containerRef.current;
    let inst: { destroy?: () => void; getElement?: () => HTMLElement } | null = null;
    try {
      if (compId === "button-primary") {
        inst = new CustomButton(el, { text: "Primary", variant: "primary", size: "md" });
      } else if (compId === "button-secondary") {
        inst = new CustomButton(el, { text: "Secondary", variant: "secondary", size: "md" });
      } else if (compId === "color-wheel") {
        inst = new ColorWheelPicker(el, { shape: ((settings.shape as string) || "triangle") as "triangle", size: (settings.size as number) || 120 });
      } else if (compId === "periodic-range") {
        inst = new PeriodicRange(el, {
          min: (settings.min as number) ?? 0,
          max: (settings.max as number) ?? 100,
          valueMin: (settings.valueMin as number) ?? 25,
          valueMax: (settings.valueMax as number) ?? 75,
          thickness: (settings.thickness as number) ?? 8,
          showMarkers: (settings.showMarkers as boolean) ?? false,
          markerStep: (settings.markerStep as number) ?? 10,
          orientation: (settings.orientation as string) ?? "horizontal",
        } as Record<string, unknown>);
      } else if (compId === "color-range") {
        inst = new ColorRange(el, { thickness: (settings.thickness as number) ?? 12 } as Record<string, unknown>);
      } else if (compId === "color-ramp") {
        inst = new ColorRamp(el, { thickness: (settings.thickness as number) ?? 12 } as Record<string, unknown>);
      } else if (compId === "toggle-group") {
        inst = new ToggleGroup(el, {
          items: [
            { id: "a", label: "Left" },
            { id: "b", label: "Center", selected: true },
            { id: "c", label: "Right" },
          ],
          ...settings,
        } as Record<string, unknown>);
      } else if (compId === "breadcrumb") {
        inst = new Breadcrumb(el, {
          items: [
            { id: "h", label: "Home" },
            { id: "s", label: "Section" },
            { id: "c", label: "Current Page" },
          ],
          markCurrent: true,
          ...settings,
        } as Record<string, unknown>);
      } else if (compId === "calendar") {
        inst = new Calendar(el, { selectionMode: (settings.selectionMode as string) ?? "single", ...settings } as Record<string, unknown>);
      } else if (compId === "board") {
        inst = new Board(el, { gridSize: (settings.gridSize as number) ?? 16, ...settings } as Record<string, unknown>);
      }
      instanceRef.current = inst;

      // Apply override styles to the component's ROOT element (not the container)
      const rootEl = inst?.getElement?.() ?? el.firstElementChild as HTMLElement | null;
      if (rootEl) {
        const style = buildOverrideStyle(compId);
        for (const [key, val] of Object.entries(style)) {
          rootEl.style.setProperty(key, val);
        }
        // Apply sub-component and direct-item styles by querying real DOM elements
        // Each entry: [overrideId, cssSelector, optional nth-child index for direct items]
        const styleTargets: [string, string, number?][] = [
          // Sub-components (class) — apply to ALL matching elements
          ["periodic-range:thumb", '[data-variant="thumb"], .custom-button-root[data-variant="thumb"]'],
          ["color-range:thumb", '[data-variant="thumb"], .custom-button-root[data-variant="thumb"]'],
          ["color-ramp:thumb", '[data-variant="thumb"], .custom-button-root[data-variant="thumb"]'],
          ["calendar:cell", ".cal-cell, [data-variant='cell']"],
          ["toggle-group:item", ".tg-item, [class*='tg-item']"],
          ["breadcrumb:item", ".crumb-item, [class*='crumb']"],
          ["breadcrumb:separator", ".crumb-sep, [class*='crumb-sep']"],
          ["board:grid", "[class*='grid']"],
          ["color-wheel:inner", "[class*='inner'], [class*='shape']"],
          // Direct items (id) — apply to specific element by index
          ["periodic-range:min-thumb", '[data-variant="thumb"], .custom-button-root[data-variant="thumb"]', 0],
          ["periodic-range:max-thumb", '[data-variant="thumb"], .custom-button-root[data-variant="thumb"]', 1],
          ["calendar:today-cell", ".cal-today, [class*='cal-today']"],
          ["toggle-group:active", ".tg-active, [class*='tg-active']"],
        ];
        for (const [targetId, selector, nthIndex] of styleTargets) {
          // Only apply if this target belongs to the current component
          if (!targetId.startsWith(compId)) continue;
          const targetStyle = buildOverrideStyle(targetId);
          if (Object.keys(targetStyle).length === 0) continue;
          const els = rootEl.querySelectorAll(selector);
          if (nthIndex !== undefined) {
            // Direct item — apply to specific element only
            const el = els[nthIndex];
            if (el) {
              for (const [key, val] of Object.entries(targetStyle)) {
                (el as HTMLElement).style.setProperty(key, String(val));
              }
            }
          } else {
            // Sub-component — apply to ALL matching elements
            els.forEach(subEl => {
              for (const [key, val] of Object.entries(targetStyle)) {
                (subEl as HTMLElement).style.setProperty(key, String(val));
              }
            });
          }
        }
      }
    } catch {
      el.innerHTML = `<span style="font-size:10px;color:var(--muted-foreground)">Preview unavailable</span>`;
    }

    return () => {
      const i = instanceRef.current as { destroy?: () => void } | null;
      if (i?.destroy) i.destroy();
      instanceRef.current = null;
    };
  }, [compId, overrides, settings]); // Re-run when overrides OR settings change!

  const minHeight = compId === "board" ? "120px" : compId === "calendar" ? "200px" : "80px";
  return <div ref={containerRef} className="flex items-center justify-center w-full" style={{ minHeight }} />;
}

function ComponentPreviewTab() {
  const [selectedCompId, setSelectedCompId] = React.useState<string>("button-primary");
  const [selectedItemId, setSelectedItemId] = React.useState<string>("button-primary");
  const overrides = componentOverrides(s => s.overrides);
  const editorTokens = useThemeTokens(s => s.tokens);

  const selectedComp = PREVIEW_COMPONENTS.find(c => c.id === selectedCompId) ?? PREVIEW_COMPONENTS[0];
  const styleableItems = getStyleableItems(selectedComp);
  const selectedItem = styleableItems.find(i => i.id === selectedItemId) ?? styleableItems[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* Left: scrollable real component previews */}
      <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border p-3">
        <div className="flex flex-col gap-3">
          {PREVIEW_COMPONENTS.map(comp => {
            const style: React.CSSProperties = {};
            for (const prop of comp.tokens) {
              const resolved = resolveStyle(comp.id, prop, [], overrides, editorTokens);
              applyStyleProp(style, prop, resolved.value);
            }
            // Components that have real vanilla TS implementations
            const hasRealComponent = ["button-primary", "button-secondary", "color-wheel", "periodic-range", "color-range", "color-ramp", "toggle-group", "breadcrumb", "calendar", "board"].includes(comp.id);

            return (
              <div
                key={comp.id}
                onClick={() => { setSelectedCompId(comp.id); setSelectedItemId(comp.id); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCompId(comp.id); setSelectedItemId(comp.id); } }}
                className={cn(
                  "rounded-lg border p-4 transition-colors cursor-pointer",
                  comp.id === selectedCompId ? "border-brand-lemon/40 bg-brand-lemon/10" : "border-border bg-muted/20 hover:bg-muted/30",
                )}
              >
                <span className="text-[10px] font-mono text-muted-foreground mb-2 block">{comp.name}</span>
                <div className="flex items-center justify-center py-3" style={{ minHeight: "80px" }}>
                  {/* Real component instances */}
                  {hasRealComponent && <RealComponentPreview compId={comp.id} overrides={overrides} />}
                  {/* Static previews for components without vanilla TS classes */}
                  {!hasRealComponent && comp.category === "surface" && (
                    <div style={style} className="w-full max-w-[240px] p-4">
                      <div className="text-[12px] font-medium">Card Title</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">Card content goes here.</div>
                    </div>
                  )}
                  {!hasRealComponent && comp.category === "form" && (
                    <input type="text" disabled placeholder="Type here…" style={style} className="pointer-events-none w-full max-w-[240px] outline-none px-3 py-2 text-[12px]" />
                  )}
                  {!hasRealComponent && comp.category === "display" && (
                    <span style={style} className="inline-flex items-center text-[11px] font-medium px-3 py-1">
                      {comp.name.split("·")[1]?.trim() ?? "Badge"}
                    </span>
                  )}
                  {!hasRealComponent && comp.category === "layout" && (
                    <div className="w-full h-[80px] rounded relative overflow-hidden" style={style}>
                      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                    </div>
                  )}
                  {!hasRealComponent && comp.category === "navigation" && (
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: style.color }}>
                      <span>Home</span><span className="text-muted-foreground">/</span>
                      <span>Section</span><span className="text-muted-foreground">/</span>
                      <span className="font-medium text-foreground">Current Page</span>
                    </div>
                  )}
                  {!hasRealComponent && comp.category === "input" && comp.id !== "input" && comp.id !== "button-primary" && comp.id !== "button-secondary" && (
                    <div className="w-full max-w-[280px] flex flex-col gap-2 py-2 text-center text-[10px] text-muted-foreground">
                      {comp.name} preview
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: per-component style editor with sub-component/direct-item selection */}
      <div>
        <h3 className="mb-2 text-[12px] font-semibold text-foreground">
          Style Editor · <span className="text-brand-lemon">{selectedComp.name}</span>
        </h3>
        <p className="mb-3 text-[10px] text-muted-foreground">{selectedComp.description}</p>

        {/* Item selector — component → sub-component → direct item */}
        {styleableItems.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {styleableItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={cn(
                  "rounded px-2 py-1 text-[9px] font-mono transition-colors",
                  item.id === selectedItemId
                    ? "bg-brand-lemon text-[#17151D]"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground",
                  item.level === 1 && "border-l-2 border-brand-purple-soft/40",
                  item.level === 2 && "border-l-2 border-brand-lemon/40",
                )}
                title={item.description}
              >
                {item.level > 0 && "└ "}{item.name}
              </button>
            ))}
          </div>
        )}

        <p className="mb-2 text-[10px] text-muted-foreground">{selectedItem.description}</p>
        <div className="flex flex-col gap-1.5">
          {selectedItem.tokens.map(prop => {
            const resolved = resolveStyle(selectedItem.id, prop, selectedItem.parentChain, overrides, editorTokens);
            const hasDirect = overrides[selectedItem.id]?.[prop] !== undefined;
            return (
              <ComponentStyleRow
                key={prop}
                prop={prop}
                resolved={resolved}
                hasDirectOverride={hasDirect}
                onOverride={(val) => componentOverrides.getState().setOverride(selectedItem.id, prop, val)}
                onClear={() => componentOverrides.getState().clearOverride(selectedItem.id, prop)}
              />
            );
          })}
        </div>

        {/* Inheritance info */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Inheritance Chain</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="text-brand-lemon">direct item</span> →
            <span className="text-brand-purple-soft"> sub-component (class)</span> →
            <span className="text-foreground"> component</span> →
            <span className="text-muted-foreground"> generalized token</span>
          </p>
          {selectedItem.parentChain.length > 0 && (
            <p className="mt-1 text-[9px] font-mono text-muted-foreground">
              Chain: {selectedItem.id} → {selectedItem.parentChain.join(" → ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Apply a resolved style value to a React.CSSProperties object. */
function applyStyleProp(style: React.CSSProperties, prop: string, value: string) {
  if (!value) return;
  if (prop === "border") (style as Record<string, string>).border = value;
  else if (prop === "box-shadow") (style as Record<string, string>).boxShadow = value;
  else if (prop === "font-size") style.fontSize = value;
  else if (prop === "border-radius") style.borderRadius = value;
  else if (prop === "padding") style.padding = value;
  else if (prop === "background") style.background = value;
  else if (prop === "color") style.color = value;
  else if (prop === "height") style.height = value;
  else if (prop === "width") style.width = value;
  else (style as Record<string, string>)[prop] = value;
}

/** Get related tokens for a CSS property type (for the dropdown). */
function getRelatedTokens(prop: string): { value: string; label: string }[] {
  const colors = useThemeTokens.getState().tokens.colors;
  const radii = useThemeTokens.getState().tokens.radii;
  const paddings = useThemeTokens.getState().tokens.padding;
  const shadows = useThemeTokens.getState().tokens.shadows;
  const typo = useThemeTokens.getState().tokens.typography;

  if (prop === "background" || prop === "color") {
    return Object.entries(colors).map(([name, val]) => ({ value: `var(--${name})`, label: name }));
  }
  if (prop === "border-radius") {
    return Object.entries(radii).map(([name]) => ({ value: `var(--${name})`, label: name }));
  }
  if (prop === "padding") {
    return Object.entries(paddings).map(([name]) => ({ value: `var(--${name})`, label: name }));
  }
  if (prop === "box-shadow") {
    return Object.entries(shadows).map(([name]) => ({ value: `var(--${name})`, label: name }));
  }
  if (prop === "font-size") {
    return Object.entries(typo).filter(([k]) => k.startsWith("text-")).map(([name]) => ({ value: `var(--${name})`, label: name }));
  }
  if (prop === "border") {
    return Object.entries(useThemeTokens.getState().tokens.borders).map(([i, b]) => ({ value: `${b.top.width} ${b.top.style} ${b.top.color}`, label: b.name }));
  }
  return [];
}

/** Determine the input type for a custom value based on the property. */
function getCustomInputType(prop: string): "color" | "dimension" | "text" {
  if (prop === "background" || prop === "color") return "color";
  if (prop === "border-radius" || prop === "padding" || prop === "font-size" || prop === "height" || prop === "width") return "dimension";
  return "text";
}

/** A single style property row — dropdown of related tokens + Custom option. */
function ComponentStyleRow({ prop, resolved, hasDirectOverride, onOverride, onClear }: {
  prop: string;
  resolved: { value: string; source: "direct" | "parent" | "token" };
  hasDirectOverride: boolean;
  onOverride: (value: string) => void;
  onClear: () => void;
}) {
  const [customMode, setCustomMode] = React.useState(false);
  const [customVal, setCustomVal] = React.useState("");
  const tokens = useThemeTokens(s => s.tokens);

  const relatedTokens = React.useMemo(() => getRelatedTokens(prop), [prop, tokens]);
  const inputType = getCustomInputType(prop);

  // Check if current value matches a token
  const matchedToken = relatedTokens.find(t => t.value === resolved.value);
  const isCustomValue = !matchedToken && hasDirectOverride;

  const sourceColor = resolved.source === "direct" ? "text-brand-lemon" : resolved.source === "parent" ? "text-brand-purple-soft" : "text-muted-foreground";
  const sourceLabel = resolved.source === "direct" ? "direct" : resolved.source === "parent" ? "parent" : "token";

  const handleSelect = (value: string) => {
    if (value === "__custom__") {
      setCustomMode(true);
      setCustomVal(resolved.value.startsWith("var(") ? "" : resolved.value);
    } else {
      setCustomMode(false);
      onOverride(value);
    }
  };

  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-md border px-2 py-1.5",
      hasDirectOverride ? "border-brand-lemon/30 bg-brand-lemon/5" : "border-border bg-muted/20",
    )}>
      <div className="flex items-center gap-1.5">
        <span className="w-20 text-[10px] font-mono text-muted-foreground shrink-0">{prop}</span>
        <span className="flex-1 truncate text-[10px] font-mono text-foreground">{resolved.value || "—"}</span>
        <span className={cn("inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-mono", sourceColor)}>
          {sourceLabel}
        </span>
        {hasDirectOverride && (
          <button type="button" onClick={onClear} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="Remove override (inherit)">
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
      {/* Token dropdown or custom input */}
      {customMode ? (
        <div className="flex items-center gap-1">
          {inputType === "color" && (
            <input type="color" value={customVal.startsWith("#") ? customVal : "#000000"} onChange={e => { setCustomVal(e.target.value); onOverride(e.target.value); }} className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0" />
          )}
          {inputType === "dimension" && (
            <DimensionEditor value={customVal || "0px"} onChange={v => { setCustomVal(v); onOverride(v); }} />
          )}
          {inputType === "text" && (
            <input type="text" value={customVal} onChange={e => { setCustomVal(e.target.value); onOverride(e.target.value); }} placeholder="custom value" className="h-6 flex-1 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none" />
          )}
          <button type="button" onClick={() => setCustomMode(false)} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Back to token list">✕</button>
        </div>
      ) : (
        <select
          value={matchedToken ? resolved.value : (isCustomValue ? "__custom__" : resolved.value)}
          onChange={e => handleSelect(e.target.value)}
          className="h-6 w-full rounded border border-border bg-background px-1 text-[9px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
        >
          {/* Current/inherited value */}
          {!matchedToken && !isCustomValue && <option value={resolved.value}>{resolved.value}</option>}
          {relatedTokens.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live Preview = the editor (collapsible sections)                    */
/* Each section renders its tokens inline within a live visual preview  */
/* ------------------------------------------------------------------ */

function LivePreviewEditor() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[14px] font-semibold text-foreground">Live Preview · Editor</h2>
        <span className="text-[10px] font-mono text-muted-foreground">edit tokens inline ↓</span>
      </div>

      <ColorsSection />
      <SpacingSection />
      <MarginSection />
      <PaddingSection />
      <RadiiSection />
      <BordersSection />
      <TypographySection />
      <ShadowsSection />
      <MotionSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible section wrapper                                         */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon: Icon,
  defaultOpen = false,
  preview,
  tokens,
  addTokenBar,
  editorHeader,
}: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  preview: React.ReactNode;
  /** Token list (scrollable, takes remaining space). */
  tokens?: React.ReactNode;
  /** "Create new token" bar (pinned at bottom of editor side). */
  addTokenBar?: React.ReactNode;
  /** Optional header actions (reset button, etc.) shown in the editor header. */
  editorHeader?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header — click to toggle the whole body */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-brand-lemon" />}
          <span className="text-[12px] font-semibold text-foreground">{title}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* Body — fixed height; preview BESIDE editor (side-by-side) */}
      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)] h-[360px]">
          {/* Live visual preview — left, centered with my-auto so overflow scrolls properly */}
          <div className="flex justify-center border-b border-border px-4 py-4 lg:border-b-0 lg:border-r overflow-y-auto">
            <div className="w-full flex items-center justify-center my-auto">{preview}</div>
          </div>
          {/* Editor — right: header + scrollable token list + pinned add bar */}
          <div className="bg-muted/10 flex flex-col min-h-0">
            {editorHeader && (
              <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
                {editorHeader}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {tokens}
            </div>
            {addTokenBar && (
              <div className="border-t border-border bg-muted/20 p-2">
                {addTokenBar}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Token row (generic)                                                 */
/* ------------------------------------------------------------------ */

function TokenRow({
  name,
  value,
  onRename,
  onChange,
  onRemove,
}: {
  name: string;
  value: string;
  onRename: (newName: string) => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(name);
  React.useEffect(() => setNameDraft(name), [name]);

  const isColor = isColorValue(value);
  const isDimension = isDimensionValue(value);
  const isDuration = isDurationValue(value);
  const isNumber = isNumericValue(value);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      {editingName ? (
        <input
          type="text"
          value={nameDraft}
          autoFocus
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => { if (nameDraft.trim() && nameDraft !== name) onRename(nameDraft.trim()); setEditingName(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (nameDraft.trim() && nameDraft !== name) onRename(nameDraft.trim()); setEditingName(false); }
            else if (e.key === "Escape") { setNameDraft(name); setEditingName(false); }
          }}
          className="h-6 flex-1 min-w-[100px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono text-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingName(true)}
          className="flex-1 min-w-[100px] text-left text-[11px] font-mono text-foreground hover:text-brand-lemon truncate"
          title="Click to rename"
        >
          {name}
        </button>
      )}
      <ValueEditor
        value={value}
        isColor={isColor}
        isDimension={isDimension}
        isDuration={isDuration}
        isNumber={isNumber}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Remove token"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function ValueEditor({
  value, isColor, isDimension, isDuration, isNumber, onChange,
}: {
  value: string;
  isColor: boolean;
  isDimension: boolean;
  isDuration: boolean;
  isNumber: boolean;
  onChange: (value: string) => void;
}) {
  if (isColor && value.startsWith("#")) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
          title="Pick color"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-24 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
        />
      </div>
    );
  }
  if (isColor) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-6 w-6 rounded border border-border" style={{ background: value }} title={value} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-32 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
        />
      </div>
    );
  }
  if (isDuration) {
    return <DurationEditor value={value} onChange={onChange} />;
  }
  // Dimension (px/rem/em/%) — number input + unit toggle group
  if (isDimension) {
    return <DimensionEditor value={value} onChange={onChange} />;
  }
  if (isNumber) {
    return (
      <input
        type="number" value={parseFloat(value)} step={0.05}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-16 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
    );
  }
  return (
    <input
      type="text" value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 w-36 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Dimension editor — number input + unit toggle group                  */
/* ------------------------------------------------------------------ */

const DIMENSION_UNITS = ["px", "rem", "em", "%"] as const;
type DimUnit = typeof DIMENSION_UNITS[number];

function parseDimension(value: string): { num: string; unit: DimUnit } {
  const m = value.match(/^(-?\d*\.?\d+)(px|rem|em|%)?$/);
  if (m) {
    const u = (m[2] as DimUnit) || "px";
    return { num: m[1], unit: u };
  }
  return { num: value, unit: "px" };
}

function DimensionEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { num, unit } = parseDimension(value);
  const isNumeric = /^-?\d*\.?\d+$/.test(num);
  return (
    <div className="flex items-center gap-1">
      <input
        type={isNumeric ? "number" : "text"}
        value={num}
        step={isNumeric ? 1 : undefined}
        onChange={(e) => onChange(`${e.target.value}${unit}`)}
        className="h-6 w-14 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
      <UnitToggleGroup
        value={unit}
        onChange={(u) => onChange(`${num}${u}`)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Duration editor — number input + ms/s unit toggle                    */
/* ------------------------------------------------------------------ */

const DURATION_UNITS = ["ms", "s"] as const;
type DurUnit = typeof DURATION_UNITS[number];

function parseDuration(value: string): { num: string; unit: DurUnit } {
  const m = value.match(/^(-?\d*\.?\d+)(ms|s)?$/);
  if (m) {
    const u = (m[2] as DurUnit) || "ms";
    return { num: m[1], unit: u };
  }
  return { num: value, unit: "ms" };
}

function DurationEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { num, unit } = parseDuration(value);
  const isNumeric = /^-?\d*\.?\d+$/.test(num);
  return (
    <div className="flex items-center gap-1">
      <input
        type={isNumeric ? "number" : "text"}
        value={num}
        step={isNumeric ? 10 : undefined}
        onChange={(e) => onChange(`${e.target.value}${unit}`)}
        className="h-6 w-14 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
      <div className="flex items-center gap-0.5 rounded border border-border bg-muted/20 p-0.5">
        {DURATION_UNITS.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onChange(`${num}${u}`)}
            aria-pressed={unit === u}
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-mono font-medium transition-colors",
              unit === u
                ? "bg-brand-purple-strong text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Compact toggle group for CSS units (px/rem/em/%). */
function UnitToggleGroup({ value, onChange }: { value: DimUnit; onChange: (u: DimUnit) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded border border-border bg-muted/20 p-0.5">
      {DIMENSION_UNITS.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          aria-pressed={value === u}
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px] font-mono font-medium transition-colors",
            value === u
              ? "bg-brand-purple-strong text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Color field — always a real color picker (resolves var() to hex)     */
/* ------------------------------------------------------------------ */

/** Resolve any CSS color value (hex, rgb, var(), named) to a #rrggbb hex string. */
function resolveToHex(value: string): string {
  if (typeof document === "undefined") return "#000000";
  // Use a temporary element to resolve the value via computed style
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  // computed is rgb(r, g, b) or rgba(r, g, b, a) — convert to #rrggbb
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = parseInt(m[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(m[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(m[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return "#000000";
}

/**
 * A color picker field — ALWAYS shows a real <input type="color">.
 * The picker's initial value is the resolved hex of the current value
 * (so var() references are resolved to their actual color). When the user
 * picks a new color, the value becomes a hex string (replacing any var()).
 * The text input shows the raw value (hex or var()) and can be edited.
 */
function ColorField({
  value, onChange, label, compact,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const [hex, setHex] = React.useState(() => resolveToHex(value));
  React.useEffect(() => { setHex(resolveToHex(value)); }, [value]);

  return (
    <div className="flex items-center gap-1">
      {label && <span className="w-8 text-[8px] font-mono text-muted-foreground">{label}</span>}
      <input
        type="color"
        value={hex}
        onChange={(e) => {
          setHex(e.target.value);
          onChange(e.target.value);
        }}
        className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
        title="Pick color"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-6 rounded border border-border bg-background px-1 text-[9px] font-mono text-foreground outline-none focus:border-brand-lemon/40",
          compact ? "w-16" : "w-20",
        )}
        title="color value (hex or var())"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shadow editor — parse box-shadow into x/y/blur/spread/color         */
/* ------------------------------------------------------------------ */

interface ShadowParts {
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
}

function parseShadow(value: string): ShadowParts {
  // Match: [inset] <x> <y> <blur> [<spread>] <color>
  // Color can be rgba(...), hsl(...), hex, or named.
  const m = value.match(/^(inset\s+)?(-?[\d.]+(?:px|rem|em|%)?)\s+(-?[\d.]+(?:px|rem|em|%)?)\s+(-?[\d.]+(?:px|rem|em|%)?)(?:\s+(-?[\d.]+(?:px|rem|em|%)?))?\s+(.+)$/);
  if (m) {
    return {
      x: m[2],
      y: m[3],
      blur: m[4],
      spread: m[5] || "0px",
      color: m[6].trim(),
    };
  }
  // Fallback: return raw value in color
  return { x: "0px", y: "0px", blur: "0px", spread: "0px", color: value };
}

function assembleShadow(parts: ShadowParts): string {
  return `${parts.x} ${parts.y} ${parts.blur} ${parts.spread} ${parts.color}`;
}

/** Shadow token editor — separate inputs for x/y/blur/spread + color picker. */
function ShadowEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = parseShadow(value);
  const update = (key: keyof ShadowParts, v: string) => {
    onChange(assembleShadow({ ...parts, [key]: v }));
  };
  return (
    <div className="flex flex-col gap-1">
      {/* x / y / blur / spread — each a DimensionEditor */}
      <div className="grid grid-cols-2 gap-1">
        <ShadowField label="x" value={parts.x} onChange={(v) => update("x", v)} />
        <ShadowField label="y" value={parts.y} onChange={(v) => update("y", v)} />
        <ShadowField label="blur" value={parts.blur} onChange={(v) => update("blur", v)} />
        <ShadowField label="spread" value={parts.spread} onChange={(v) => update("spread", v)} />
      </div>
      {/* color — real color picker */}
      <ColorField label="color" value={parts.color} onChange={(v) => update("color", v)} />
    </div>
  );
}

function ShadowField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-8 text-[8px] font-mono text-muted-foreground">{label}</span>
      <DimensionEditor value={value} onChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colors section                                                      */
/* ------------------------------------------------------------------ */

function ColorsSection() {
  const colors = useThemeTokens((s) => s.tokens.colors);
  const setToken = useThemeTokens((s) => s.setToken);
  const removeToken = useThemeTokens((s) => s.removeToken);
  const renameToken = useThemeTokens((s) => s.renameToken);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("#");

  const brand = Object.entries(colors).filter(([k]) => k.startsWith("brand-"));
  const surfaces = Object.entries(colors).filter(([k]) => ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "muted", "muted-foreground", "border", "input"].includes(k));
  const semantic = Object.entries(colors).filter(([k]) => ["success", "warning", "error", "info", "destructive", "ring"].includes(k));
  const component = Object.entries(colors).filter(([k]) => ["primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground"].includes(k));

  return (
    <Section
      title="Colors"
      icon={Palette}
      defaultOpen
      preview={
        <div className="flex flex-col gap-3">
          <ColorRow label="Brand" tokens={brand} />
          <ColorRow label="Surfaces" tokens={surfaces} />
          <ColorRow label="Component" tokens={component} />
          <ColorRow label="Semantic" tokens={semantic} />
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">All color tokens</span>
          <button
            type="button"
            onClick={() => resetCategory("colors")}
            className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-1.5">
          {Object.entries(colors).map(([name, value]) => (
            <TokenRow
              key={name}
              name={name}
              value={value}
              onRename={(n) => renameToken("colors", name, n)}
              onChange={(v) => setToken("colors", name, v)}
              onRemove={() => removeToken("colors", name)}
            />
          ))}
        </div>
      }
      addTokenBar={
        <ColorAddBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("colors", newName.trim(), newValue.trim() || "#000000"); setNewName(""); setNewValue("#"); }}
        />
      }
    />
  );
}

/** Colors-specific add bar: single "Add new color" button that expands into name + color picker + hex. */
function ColorAddBar({
  newName, newValue, setNewName, setNewValue, onAdd,
}: {
  newName: string;
  newValue: string;
  setNewName: (v: string) => void;
  setNewValue: (v: string) => void;
  onAdd: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex h-7 w-full items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/20 text-[10px] text-muted-foreground hover:text-foreground hover:border-brand-lemon/40"
      >
        <Plus className="h-3 w-3" /> Add new color
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-dashed border-border bg-muted/20 px-2 py-1.5">
      <input
        type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
        placeholder="color-name" autoFocus
        className="h-6 min-w-[80px] flex-1 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
      <input
        type="color" value={newValue.startsWith("#") ? newValue : "#000000"}
        onChange={(e) => setNewValue(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
      />
      <input
        type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
        placeholder="#hex"
        className="h-6 w-20 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
      <button
        type="button" disabled={!newName.trim()}
        onClick={() => { onAdd(); setExpanded(false); }}
        className="inline-flex h-6 items-center gap-1 rounded border border-brand-lemon/40 bg-brand-lemon/10 px-2 text-[10px] font-medium text-brand-lemon disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => { setExpanded(false); setNewName(""); setNewValue("#"); }}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        title="Cancel"
      >
        ✕
      </button>
    </div>
  );
}

function ColorRow({ label, tokens }: { label: string; tokens: [string, string][] }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map(([name, value]) => (
          <div key={name} className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-1">
            <span className="h-4 w-4 rounded-sm border border-border" style={{ background: `var(--${name})` }} />
            <span className="text-[9px] font-mono text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spacing section                                                     */
/* ------------------------------------------------------------------ */

function SpacingSection() {
  const spacing = useThemeTokens((s) => s.tokens.spacing);
  const setToken = useThemeTokens((s) => s.setToken);
  const removeToken = useThemeTokens((s) => s.removeToken);
  const renameToken = useThemeTokens((s) => s.renameToken);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("8");
  const [newUnit, setNewUnit] = React.useState<DimUnit>("px");

  return (
    <Section
      title="Spacing"
      icon={Ruler}
      preview={
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Scale</p>
          <div className="flex items-end gap-1">
            {Object.entries(spacing).map(([name, value]) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <div className="w-4 bg-brand-lemon" style={{ height: `var(--${name})` }} />
                <span className="text-[8px] font-mono text-muted-foreground">{name.replace("space-", "s")}</span>
              </div>
            ))}
          </div>
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">All spacing tokens</span>
          <button type="button" onClick={() => resetCategory("spacing")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-1.5">
          {Object.entries(spacing).map(([name, value]) => (
            <TokenRow key={name} name={name} value={value}
              onRename={(n) => renameToken("spacing", name, n)}
              onChange={(v) => setToken("spacing", name, v)}
              onRemove={() => removeToken("spacing", name)}
            />
          ))}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("spacing", newName.trim(), `${newValue.trim() || "0"}${newUnit}`); setNewName(""); setNewValue("8"); }}
          placeholderValue="8"
          placeholderName="space-name"
          unitToggle={<UnitToggleGroup value={newUnit} onChange={setNewUnit} />}
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Margin section                                                      */
/* ------------------------------------------------------------------ */

function MarginSection() {
  const margin = useThemeTokens((s) => s.tokens.margin);
  const marginSides = useThemeTokens((s) => s.tokens.marginSides);
  const setToken = useThemeTokens((s) => s.setToken);
  const setMarginSide = useThemeTokens((s) => s.setMarginSide);
  const removeMargin = useThemeTokens((s) => s.removeMargin);
  const renameMargin = useThemeTokens((s) => s.renameMargin);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("8");
  const [newUnit, setNewUnit] = React.useState<DimUnit>("px");

  return (
    <Section
      title="Margin"
      icon={Move}
      preview={
        <div className="w-full">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Bar with margin rects</p>
          {/* One bar (tabs-like) containing multiple rects — each rect has its margin applied */}
          <div className="flex flex-wrap items-center rounded-md border border-border bg-muted/30 p-1">
            {Object.entries(margin).map(([name, value]) => {
              const mt = marginSides[`${name}-top`] ?? value;
              const mr = marginSides[`${name}-right`] ?? value;
              const mb = marginSides[`${name}-bottom`] ?? value;
              const ml = marginSides[`${name}-left`] ?? value;
              return (
                <div
                  key={name}
                  className="flex flex-col items-center"
                  style={{
                    marginTop: mt === "auto" ? "4px" : mt,
                    marginRight: mr === "auto" ? "4px" : mr,
                    marginBottom: mb === "auto" ? "4px" : mb,
                    marginLeft: ml === "auto" ? "4px" : ml,
                  }}
                >
                  <div className="h-5 w-5 rounded bg-brand-lemon/80 border border-brand-lemon" />
                  <span className="mt-0.5 text-[7px] font-mono text-muted-foreground">{name.replace("margin-", "m")}</span>
                </div>
              );
            })}
          </div>
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">All margin tokens</span>
          <button type="button" onClick={() => resetCategory("margin")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-2">
          {Object.entries(margin).map(([name, value]) => (
            <MarginPaddingTokenBox
              key={name}
              kind="margin"
              name={name}
              value={value}
              sides={{
                top: marginSides[`${name}-top`] ?? value,
                right: marginSides[`${name}-right`] ?? value,
                bottom: marginSides[`${name}-bottom`] ?? value,
                left: marginSides[`${name}-left`] ?? value,
              }}
              onRename={(n) => renameMargin(name, n)}
              onAllChange={(v) => {
                setToken("margin", name, v);
                setMarginSide(name, "top", v);
                setMarginSide(name, "right", v);
                setMarginSide(name, "bottom", v);
                setMarginSide(name, "left", v);
              }}
              onSideChange={(side, v) => setMarginSide(name, side, v)}
              onRemove={() => removeMargin(name)}
            />
          ))}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("margin", newName.trim(), `${newValue.trim() || "0"}${newUnit}`); setNewName(""); setNewValue("8"); }}
          placeholderValue="8"
          placeholderName="margin-name"
          unitToggle={<UnitToggleGroup value={newUnit} onChange={setNewUnit} />}
          buttonLabel="Add margin"
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Padding section                                                     */
/* ------------------------------------------------------------------ */

function PaddingSection() {
  const padding = useThemeTokens((s) => s.tokens.padding);
  const paddingSides = useThemeTokens((s) => s.tokens.paddingSides);
  const setToken = useThemeTokens((s) => s.setToken);
  const setPaddingSide = useThemeTokens((s) => s.setPaddingSide);
  const removePadding = useThemeTokens((s) => s.removePadding);
  const renamePadding = useThemeTokens((s) => s.renamePadding);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("8");
  const [newUnit, setNewUnit] = React.useState<DimUnit>("px");

  return (
    <Section
      title="Padding"
      icon={Frame}
      preview={
        <div className="w-full">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Bars with padding applied</p>
          {/* Multiple bars — each bar has a padding token applied around the same inner rect */}
          <div className="flex flex-col gap-1">
            {Object.entries(padding).map(([name, value]) => {
              const pt = paddingSides[`${name}-top`] ?? value;
              const pr = paddingSides[`${name}-right`] ?? value;
              const pb = paddingSides[`${name}-bottom`] ?? value;
              const pl = paddingSides[`${name}-left`] ?? value;
              return (
                <div key={name} className="flex items-center gap-2">
                  {/* One bar with padding applied — contains 4 rects */}
                  <div
                    className="flex-1 rounded border border-brand-lemon bg-brand-lemon/15 flex items-center gap-1"
                    style={{
                      paddingTop: pt,
                      paddingRight: pr,
                      paddingBottom: pb,
                      paddingLeft: pl,
                    }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-3 flex-1 rounded-sm bg-brand-lemon/60" />
                    ))}
                  </div>
                  <span className="w-8 shrink-0 text-[7px] font-mono text-muted-foreground">{name.replace("padding-", "p")}</span>
                </div>
              );
            })}
          </div>
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">All padding tokens</span>
          <button type="button" onClick={() => resetCategory("padding")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-2">
          {Object.entries(padding).map(([name, value]) => (
            <MarginPaddingTokenBox
              key={name}
              kind="padding"
              name={name}
              value={value}
              sides={{
                top: paddingSides[`${name}-top`] ?? value,
                right: paddingSides[`${name}-right`] ?? value,
                bottom: paddingSides[`${name}-bottom`] ?? value,
                left: paddingSides[`${name}-left`] ?? value,
              }}
              onRename={(n) => renamePadding(name, n)}
              onAllChange={(v) => {
                setToken("padding", name, v);
                setPaddingSide(name, "top", v);
                setPaddingSide(name, "right", v);
                setPaddingSide(name, "bottom", v);
                setPaddingSide(name, "left", v);
              }}
              onSideChange={(side, v) => setPaddingSide(name, side, v)}
              onRemove={() => removePadding(name)}
            />
          ))}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("padding", newName.trim(), `${newValue.trim() || "0"}${newUnit}`); setNewName(""); setNewValue("8"); }}
          placeholderValue="8"
          placeholderName="padding-name"
          unitToggle={<UnitToggleGroup value={newUnit} onChange={setNewUnit} />}
          buttonLabel="Add padding"
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Margin/Padding token box — per-side editor with "all ↔ sides" switch */
/* ------------------------------------------------------------------ */

function MarginPaddingTokenBox({
  kind, name, value, sides, onRename, onAllChange, onSideChange, onRemove,
}: {
  kind: "margin" | "padding";
  name: string;
  value: string;
  sides: { top: string; right: string; bottom: string; left: string };
  onRename: (newName: string) => void;
  onAllChange: (value: string) => void;
  onSideChange: (side: "top" | "right" | "bottom" | "left", value: string) => void;
  onRemove: () => void;
}) {
  const [allMode, setAllMode] = React.useState(true);
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <SideTokenName name={name} onRename={onRename} />
        <div className="flex items-center gap-2">
          {/* "all ↔ sides" switch — same as radius */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-muted-foreground">all</span>
            <button
              type="button"
              role="switch"
              aria-checked={allMode}
              onClick={() => setAllMode((v) => !v)}
              className={cn(
                "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors",
                allMode ? "bg-brand-lemon" : "bg-muted-foreground/30",
              )}
            >
              <span className={cn(
                "inline-block h-2.5 w-2.5 rounded-full bg-background transition-transform",
                allMode ? "translate-x-3" : "translate-x-0.5",
              )} />
            </button>
            <span className="text-[8px] text-muted-foreground">sides</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
            title={`Remove ${kind} token`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {allMode ? (
        /* Single "all sides" input + unit toggle */
        <DimensionEditor value={value} onChange={onAllChange} />
      ) : (
        /* 4 individual side inputs, each with unit toggle */
        <div className="grid grid-cols-2 gap-1.5">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-0.5">
              <label className="text-[8px] text-muted-foreground">{side}</label>
              <DimensionEditor
                value={sides[side]}
                onChange={(v) => onSideChange(side, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Click-to-rename label for margin/padding tokens. */
function SideTokenName({ name, onRename }: { name: string; onRename: (newName: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  React.useEffect(() => setDraft(name), [name]);
  if (editing) {
    return (
      <input
        type="text" value={draft} autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }
          else if (e.key === "Escape") { setDraft(name); setEditing(false); }
        }}
        className="h-6 min-w-[100px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono font-semibold text-foreground outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-[11px] font-semibold text-foreground hover:text-brand-lemon truncate"
      title="Click to rename"
    >
      {name}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Radii section — per-corner editing                                  */
/* ------------------------------------------------------------------ */

function RadiiSection() {
  const radii = useThemeTokens((s) => s.tokens.radii);
  // Defensive: corners may be undefined if rehydrated from an old schema.
  const cornersRaw = useThemeTokens((s) => s.tokens.corners);
  const corners = (cornersRaw ?? {}) as unknown as Record<string, string>;
  const setRadius = useThemeTokens((s) => s.setRadius);
  const setCorner = useThemeTokens((s) => s.setCorner);
  const removeRadius = useThemeTokens((s) => s.removeRadius);
  const renameRadius = useThemeTokens((s) => s.renameRadius);
  const resetCategory = useThemeTokens((s) => s.resetCategory);
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("8");
  const [newUnit, setNewUnit] = React.useState<DimUnit>("px");
  // Per-radius "all corners" switch state. true = single input (all corners same),
  // false = 4 individual corner inputs.
  const [allCornersMap, setAllCornersMap] = React.useState<Record<string, boolean>>({});

  const allRadiusNames = Object.keys(radii);
  const getCornerKey = (name: string, corner: string) => `${name}-${corner}`;

  const isAllCorners = (name: string) => allCornersMap[name] !== false; // default true

  return (
    <Section
      title="Radius Scale"
      icon={CornerDownRight}
      preview={
        <div className="flex flex-wrap gap-3 justify-center">
          {allRadiusNames.map((name) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div
                className="h-12 w-12 border-2"
                style={{
                  borderTopLeftRadius: corners[`${name}-tl`] ?? radii[name],
                  borderTopRightRadius: corners[`${name}-tr`] ?? radii[name],
                  borderBottomRightRadius: corners[`${name}-br`] ?? radii[name],
                  borderBottomLeftRadius: corners[`${name}-bl`] ?? radii[name],
                  borderColor: "var(--brand-lemon)",
                  background: "color-mix(in srgb, var(--brand-lemon) 12%, transparent)",
                }}
              />
              <span className="text-[8px] font-mono text-muted-foreground">{name.replace("radius-", "")}</span>
            </div>
          ))}
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-corner editor</span>
          <button type="button" onClick={() => resetCategory("radii")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-2">
          {allRadiusNames.map((name) => {
            const allMode = isAllCorners(name);
            return (
              <div key={name} className="rounded-md border border-border bg-background p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <RadiusTokenName name={name} onRename={(n) => renameRadius(name, n)} />
                  <div className="flex items-center gap-2">
                    {/* "all" switch — toggles between 1 input and 4 inputs */}
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted-foreground">all</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={allMode}
                        onClick={() => setAllCornersMap((p) => ({ ...p, [name]: !allMode }))}
                        className={cn(
                          "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors",
                          allMode ? "bg-brand-lemon" : "bg-muted-foreground/30",
                        )}
                      >
                        <span className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full bg-background transition-transform",
                          allMode ? "translate-x-3" : "translate-x-0.5",
                        )} />
                      </button>
                      <span className="text-[8px] text-muted-foreground">corners</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRadius(name)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                      title="Remove radius token"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {allMode ? (
                  /* Single "all corners" input + unit toggle */
                  <DimensionEditor
                    value={radii[name]}
                    onChange={(v) => {
                      setRadius(name, v);
                      setCorner(getCornerKey(name, "tl") as keyof CornerRadii, v);
                      setCorner(getCornerKey(name, "tr") as keyof CornerRadii, v);
                      setCorner(getCornerKey(name, "br") as keyof CornerRadii, v);
                      setCorner(getCornerKey(name, "bl") as keyof CornerRadii, v);
                    }}
                  />
                ) : (
                  /* 4 individual corner inputs, each with unit toggle */
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["tl", "tr", "br", "bl"] as const).map((corner) => {
                      const key = getCornerKey(name, corner);
                      const label = corner === "tl" ? "↖ TL" : corner === "tr" ? "↗ TR" : corner === "br" ? "↘ BR" : "↙ BL";
                      return (
                        <div key={corner} className="flex flex-col gap-0.5">
                          <label className="text-[8px] text-muted-foreground">{label}</label>
                          <DimensionEditor
                            value={corners[key] ?? radii[name]}
                            onChange={(v) => setCorner(key as keyof CornerRadii, v)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => {
            const name = newName.trim();
            const val = `${newValue.trim() || "8"}${newUnit}`;
            setRadius(name, val);
            setCorner(`${name}-tl` as keyof CornerRadii, val);
            setCorner(`${name}-tr` as keyof CornerRadii, val);
            setCorner(`${name}-br` as keyof CornerRadii, val);
            setCorner(`${name}-bl` as keyof CornerRadii, val);
            setNewName(""); setNewValue("8");
          }}
          placeholderValue="8"
          placeholderName="radius-name"
          unitToggle={<UnitToggleGroup value={newUnit} onChange={setNewUnit} />}
        />
      }
    />
  );
}

/** Click-to-rename label for radius tokens. */
function RadiusTokenName({ name, onRename }: { name: string; onRename: (newName: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  React.useEffect(() => setDraft(name), [name]);
  if (editing) {
    return (
      <input
        type="text" value={draft} autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }
          else if (e.key === "Escape") { setDraft(name); setEditing(false); }
        }}
        className="h-6 min-w-[100px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono font-semibold text-foreground outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-[11px] font-semibold text-foreground hover:text-brand-lemon truncate"
      title="Click to rename"
    >
      {name}
    </button>
  );
}

/** Click-to-rename label for border tokens. */
function BorderTokenName({ name, onRename }: { name: string; onRename: (newName: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  React.useEffect(() => setDraft(name), [name]);
  if (editing) {
    return (
      <input
        type="text" value={draft} autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }
          else if (e.key === "Escape") { setDraft(name); setEditing(false); }
        }}
        className="h-6 min-w-[100px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono font-semibold text-foreground outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-[11px] font-semibold text-foreground hover:text-brand-lemon truncate"
      title="Click to rename"
    >
      {name}
    </button>
  );
}

/** Click-to-rename label for shadow tokens. */
function ShadowTokenName({ name, onRename }: { name: string; onRename: (newName: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  React.useEffect(() => setDraft(name), [name]);
  if (editing) {
    return (
      <input
        type="text" value={draft} autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (draft.trim() && draft !== name) onRename(draft.trim()); setEditing(false); }
          else if (e.key === "Escape") { setDraft(name); setEditing(false); }
        }}
        className="h-6 min-w-[100px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono font-semibold text-foreground outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-[11px] font-semibold text-foreground hover:text-brand-lemon truncate"
      title="Click to rename"
    >
      {name}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Borders section — per-side editing                                  */
/* ------------------------------------------------------------------ */

function BordersSection() {
  const borders = useThemeTokens((s) => s.tokens.borders);
  const setBorderSide = useThemeTokens((s) => s.setBorderSide);
  const addBorder = useThemeTokens((s) => s.addBorder);
  const removeBorder = useThemeTokens((s) => s.removeBorder);
  const renameBorder = useThemeTokens((s) => s.renameBorder);
  const resetCategory = useThemeTokens((s) => s.resetCategory);

  return (
    <Section
      title="Borders (per-side)"
      icon={Square}
      preview={
        <div className="flex flex-wrap gap-3 justify-center">
          {borders.map((b) => (
            <div key={b.name} className="flex flex-col items-center gap-1">
              <div
                className="h-14 w-14"
                style={{
                  borderTop: `${b.top.width} ${b.top.style} ${b.top.color}`,
                  borderRight: `${b.right.width} ${b.right.style} ${b.right.color}`,
                  borderBottom: `${b.bottom.width} ${b.bottom.style} ${b.bottom.color}`,
                  borderLeft: `${b.left.width} ${b.left.style} ${b.left.color}`,
                  background: "color-mix(in srgb, var(--brand-purple) 30%, transparent)",
                }}
              />
              <span className="text-[9px] font-mono text-muted-foreground">{b.name}</span>
            </div>
          ))}
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-side border editor</span>
          <button type="button" onClick={() => resetCategory("borders")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-2">
          {borders.map((border, idx) => (
            <div key={idx} className="rounded-md border border-border bg-background p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <BorderTokenName name={border.name} onRename={(n) => renameBorder(idx, n)} />
                <button
                  type="button"
                  onClick={() => removeBorder(idx)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                  title="Remove border token"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <div key={side} className="flex items-center gap-1.5">
                    <span className="w-8 text-[9px] font-mono text-muted-foreground">{side}</span>
                    {/* width — number + unit toggle */}
                    <DimensionEditor
                      value={border[side].width}
                      onChange={(v) => setBorderSide(idx, side, "width", v)}
                    />
                    {/* style — dropdown */}
                    <select
                      value={border[side].style}
                      onChange={(e) => setBorderSide(idx, side, "style", e.target.value)}
                      className="h-6 rounded border border-border bg-background px-1 text-[9px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
                      title="style"
                    >
                      {["solid", "dashed", "dotted", "double", "none"].map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                    {/* color — real color picker (resolves var() to hex) */}
                    <ColorField
                      value={border[side].color}
                      onChange={(v) => setBorderSide(idx, side, "color", v)}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
      addTokenBar={
        <button
          type="button"
          onClick={addBorder}
          className="inline-flex h-7 w-full items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/20 text-[10px] text-muted-foreground hover:text-foreground hover:border-brand-lemon/40"
        >
          <Plus className="h-3 w-3" /> Add border token
        </button>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Typography section                                                  */
/* ------------------------------------------------------------------ */

/* Typography is split into separate boxes per property type. */

/** Common font families for the dropdown. */
const FONT_FAMILIES = [
  { value: "var(--font-inter)", label: "Inter (sans)", css: "var(--font-inter)" },
  { value: "var(--font-jetbrains)", label: "JetBrains Mono", css: "var(--font-jetbrains)" },
  { value: "system-ui, -apple-system, sans-serif", label: "System UI", css: "system-ui, sans-serif" },
  { value: "Arial, sans-serif", label: "Arial", css: "Arial, sans-serif" },
  { value: "Helvetica, sans-serif", label: "Helvetica", css: "Helvetica, sans-serif" },
  { value: "Georgia, serif", label: "Georgia", css: "Georgia, serif" },
  { value: "'Times New Roman', serif", label: "Times New Roman", css: "'Times New Roman', serif" },
  { value: "'Courier New', monospace", label: "Courier New", css: "'Courier New', monospace" },
  { value: "ui-monospace, monospace", label: "UI Monospace", css: "ui-monospace, monospace" },
  { value: "__custom__", label: "Custom… (type a font name)", css: "sans-serif" },
];

/** Token row for font-family values — dropdown with a custom option. */
function FontFamilyRow({
  name, value, onRename, onChange, onRemove,
}: {
  name: string;
  value: string;
  onRename: (newName: string) => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(name);
  React.useEffect(() => setNameDraft(name), [name]);

  // Track whether the user explicitly chose "Custom…" mode. The custom text
  // input shows when EITHER the user selected "Custom…" OR the current value
  // is not one of the presets.
  const isPreset = FONT_FAMILIES.some((f) => f.value === value);
  const [customMode, setCustomMode] = React.useState(!isPreset);
  // If the value becomes a preset again (e.g. via reset), exit custom mode.
  React.useEffect(() => { if (isPreset) setCustomMode(false); else setCustomMode(true); }, [isPreset]);

  const selectValue = customMode ? "__custom__" : value;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      {editingName ? (
        <input
          type="text" value={nameDraft} autoFocus
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => { if (nameDraft.trim() && nameDraft !== name) onRename(nameDraft.trim()); setEditingName(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (nameDraft.trim() && nameDraft !== name) onRename(nameDraft.trim()); setEditingName(false); }
            else if (e.key === "Escape") { setNameDraft(name); setEditingName(false); }
          }}
          className="h-6 flex-1 min-w-[80px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono text-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingName(true)}
          className="flex-1 min-w-[80px] text-left text-[11px] font-mono text-foreground hover:text-brand-lemon truncate"
          title="Click to rename"
        >
          {name}
        </button>
      )}
      {/* Dropdown of common fonts + custom option */}
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            // Enter custom mode — clear the value so the text input is empty & ready
            setCustomMode(true);
            onChange("");
          } else {
            // Selected a preset — exit custom mode, apply the preset
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
        className="h-6 flex-1 min-w-[100px] rounded border border-border bg-background px-1 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
        title="Select font family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.css }}>{f.label}</option>
        ))}
      </select>
      {/* Custom text input — shown in custom mode; typing applies the value */}
      {customMode && (
        <input
          type="text" value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 'Comic Sans MS', sans-serif"
          autoFocus
          className="h-6 flex-1 min-w-[80px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[10px] font-mono text-foreground outline-none"
          title="Custom font family value"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Remove token"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

const TYPO_GROUPS: { prefix: string; label: string; icon: typeof Type; desc: string; placeholder: string }[] = [
  { prefix: "font-", label: "Font Family", icon: Type, desc: "font-sans, font-mono", placeholder: "var(--font-…)" },
  { prefix: "text-", label: "Font Size", icon: Type, desc: "text-xs, text-sm, …", placeholder: "14px" },
  { prefix: "font-weight-", label: "Font Weight", icon: Type, desc: "font-normal, font-medium, …", placeholder: "400" },
  { prefix: "leading-", label: "Line Height", icon: Type, desc: "leading-tight, leading-normal, …", placeholder: "1.5" },
  { prefix: "tracking-", label: "Letter Spacing", icon: Type, desc: "tracking-tight, tracking-wide, …", placeholder: "0.05em" },
];

/** Map a typography token name to its group prefix. */
function typoGroup(name: string): string {
  // font-normal/medium/semibold/bold → font-weight group (not font-family)
  if (/^font-(normal|medium|semibold|bold|light|thin|extralight|black)$/.test(name)) return "font-weight-";
  if (name.startsWith("font-")) return "font-";
  if (name.startsWith("text-")) return "text-";
  if (name.startsWith("leading-")) return "leading-";
  if (name.startsWith("tracking-")) return "tracking-";
  return "text-";
}

function TypographySection() {
  const typo = useThemeTokens((s) => s.tokens.typography);
  const setToken = useThemeTokens((s) => s.setToken);
  const removeToken = useThemeTokens((s) => s.removeToken);
  const renameToken = useThemeTokens((s) => s.renameToken);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);

  // Group tokens by prefix
  const groups = TYPO_GROUPS.map((g) => ({
    ...g,
    tokens: Object.entries(typo).filter(([name]) => typoGroup(name) === g.prefix),
  }));

  return (
    <>
      {groups.map((g) => (
        <TypographyGroupSection
          key={g.prefix}
          group={g}
          setToken={setToken}
          removeToken={removeToken}
          renameToken={renameToken}
          addToken={addToken}
          resetCategory={resetCategory}
        />
      ))}
    </>
  );
}

function TypographyGroupSection({
  group,
  setToken,
  removeToken,
  renameToken,
  addToken,
  resetCategory,
}: {
  group: { prefix: string; label: string; icon: typeof Type; desc: string; placeholder: string } & { tokens: [string, string][] };
  setToken: (cat: "typography", name: string, value: string) => void;
  removeToken: (cat: "typography", name: string) => void;
  renameToken: (cat: "typography", oldName: string, newName: string) => void;
  addToken: (cat: "typography", name: string, value: string) => void;
  resetCategory: (cat: "typography") => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState(group.placeholder);

  // Preview depends on the group type
  const preview = (() => {
    if (group.prefix === "font-") {
      return (
        <div className="flex flex-col gap-1 text-center">
          {group.tokens.map(([name, value]) => (
            <span key={name} className="text-foreground" style={{ fontFamily: value, fontSize: "14px" }}>
              {name} — The quick brown fox
            </span>
          ))}
        </div>
      );
    }
    if (group.prefix === "text-") {
      return (
        <div className="flex flex-col gap-1 items-center justify-center">
          {group.tokens.map(([name, value]) => (
            <span key={name} className="text-foreground" style={{ fontSize: value }}>
              Aa — {name}
            </span>
          ))}
        </div>
      );
    }
    if (group.prefix === "font-weight-") {
      return (
        <div className="flex flex-col gap-1 text-center">
          {group.tokens.map(([name, value]) => (
            <span key={name} className="text-foreground" style={{ fontWeight: value, fontSize: "13px" }}>
              {name} — {value}
            </span>
          ))}
        </div>
      );
    }
    if (group.prefix === "leading-") {
      return (
        <div className="flex flex-col gap-1 text-center">
          {group.tokens.map(([name, value]) => (
            <span key={name} className="text-foreground" style={{ lineHeight: value, fontSize: "12px" }}>
              {name}<br />line<br />height
            </span>
          ))}
        </div>
      );
    }
    if (group.prefix === "tracking-") {
      return (
        <div className="flex flex-col gap-1 text-center">
          {group.tokens.map(([name, value]) => (
            <span key={name} className="text-foreground" style={{ letterSpacing: value, fontSize: "13px" }}>
              {name} — ABCDEF
            </span>
          ))}
        </div>
      );
    }
    return null;
  })();

  return (
    <Section
      title={group.label}
      icon={group.icon}
      preview={preview}
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{group.desc}</span>
          <button type="button" onClick={() => resetCategory("typography")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-1.5">
          {group.tokens.map(([name, value]) => {
            // Font Family group uses a dropdown with a custom option
            if (group.prefix === "font-") {
              return (
                <FontFamilyRow
                  key={name}
                  name={name}
                  value={value}
                  onRename={(n) => renameToken("typography", name, n)}
                  onChange={(v) => setToken("typography", name, v)}
                  onRemove={() => removeToken("typography", name)}
                />
              );
            }
            return (
              <TokenRow key={name} name={name} value={value}
                onRename={(n) => renameToken("typography", name, n)}
                onChange={(v) => setToken("typography", name, v)}
                onRemove={() => removeToken("typography", name)}
              />
            );
          })}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("typography", newName.trim(), newValue.trim() || group.placeholder); setNewName(""); setNewValue(group.placeholder); }}
          placeholderValue={group.placeholder}
          buttonLabel={`Add ${group.label.toLowerCase()}`}
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Shadows section                                                     */
/* ------------------------------------------------------------------ */

function ShadowsSection() {
  const shadows = useThemeTokens((s) => s.tokens.shadows);
  const setToken = useThemeTokens((s) => s.setToken);
  const removeToken = useThemeTokens((s) => s.removeToken);
  const renameToken = useThemeTokens((s) => s.renameToken);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("0 4px 12px rgba(0,0,0,0.3)");

  return (
    <Section
      title="Shadows"
      icon={Box}
      preview={
        <div className="grid grid-cols-2 gap-2 w-full">
          {Object.entries(shadows).map(([name]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div className="h-12 w-full rounded-md bg-card" style={{ boxShadow: `var(--${name})` }} />
              <span className="text-[8px] font-mono text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">All shadow tokens</span>
          <button type="button" onClick={() => resetCategory("shadows")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-2">
          {Object.entries(shadows).map(([name, value]) => (
            <div key={name} className="rounded-md border border-border bg-background p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <ShadowTokenName name={name} onRename={(n) => renameToken("shadows", name, n)} />
                <button
                  type="button"
                  onClick={() => removeToken("shadows", name)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                  title="Remove shadow token"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <ShadowEditor value={value} onChange={(v) => setToken("shadows", name, v)} />
            </div>
          ))}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("shadows", newName.trim(), newValue.trim() || "0 4px 12px rgba(0,0,0,0.3)"); setNewName(""); setNewValue("0 4px 12px rgba(0,0,0,0.3)"); }}
          placeholderValue="0 4px 12px rgba(0,0,0,0.3)…"
          buttonLabel="Add new shadow"
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Motion section                                                      */
/* ------------------------------------------------------------------ */

/* Motion is split into Duration + Easing boxes, each with animated preview. */

function MotionSection() {
  const motion = useThemeTokens((s) => s.tokens.motion);
  const setToken = useThemeTokens((s) => s.setToken);
  const removeToken = useThemeTokens((s) => s.removeToken);
  const renameToken = useThemeTokens((s) => s.renameToken);
  const addToken = useThemeTokens((s) => s.addToken);
  const resetCategory = useThemeTokens((s) => s.resetCategory);

  const durations = Object.entries(motion).filter(([k]) => k.startsWith("motion-"));
  const easings = Object.entries(motion).filter(([k]) => k.startsWith("ease-"));

  return (
    <>
      <MotionDurationSection
        tokens={durations}
        setToken={setToken}
        removeToken={removeToken}
        renameToken={renameToken}
        addToken={addToken}
        resetCategory={resetCategory}
      />
      <MotionEasingSection
        tokens={easings}
        setToken={setToken}
        removeToken={removeToken}
        renameToken={renameToken}
        addToken={addToken}
        resetCategory={resetCategory}
      />
    </>
  );
}

/** Animated bar that fills over the actual duration, looping. */
function AnimatedDurationBar({ value }: { value: string }) {
  // Parse the duration in ms for the loop interval
  const ms = (() => {
    const m = value.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
    if (!m) return 180;
    const num = parseFloat(m[1]);
    return m[2] === "s" ? num * 1000 : num;
  })();
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    // Loop slightly longer than the duration so the fill completes before restarting
    const id = setInterval(() => setPhase((p) => p + 1), ms + 300);
    return () => clearInterval(id);
  }, [ms]);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-3 w-24 rounded-full bg-muted overflow-hidden">
        <div
          key={phase}
          className="h-3 rounded-full bg-brand-lemon"
          style={{
            // Use the ACTUAL duration for the fill animation
            animation: `te-duration-fill ${value} linear forwards`,
            width: "100%",
          }}
        />
      </div>
      <span className="text-[8px] font-mono text-muted-foreground">{value}</span>
      <style>{`@keyframes te-duration-fill { from { width: 0%; } to { width: 100%; } }`}</style>
    </div>
  );
}

function MotionDurationSection({
  tokens, setToken, removeToken, renameToken, addToken, resetCategory,
}: {
  tokens: [string, string][];
  setToken: (cat: "motion", name: string, value: string) => void;
  removeToken: (cat: "motion", name: string) => void;
  renameToken: (cat: "motion", oldName: string, newName: string) => void;
  addToken: (cat: "motion", name: string, value: string) => void;
  resetCategory: (cat: "motion") => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("180");
  const [newUnit, setNewUnit] = React.useState<DurUnit>("ms");

  return (
    <Section
      title="Motion · Duration"
      icon={Clock}
      preview={
        <div className="flex flex-wrap gap-3 justify-center items-end">
          {tokens.map(([name, value]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <AnimatedDurationBar value={value} />
              <span className="text-[8px] font-mono text-muted-foreground">{name.replace("motion-", "")}</span>
            </div>
          ))}
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">motion-fast, motion-standard, …</span>
          <button type="button" onClick={() => resetCategory("motion")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-1.5">
          {tokens.map(([name, value]) => (
            <TokenRow key={name} name={name} value={value}
              onRename={(n) => renameToken("motion", name, n)}
              onChange={(v) => setToken("motion", name, v)}
              onRemove={() => removeToken("motion", name)}
            />
          ))}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("motion", newName.trim(), `${newValue.trim() || "0"}${newUnit}`); setNewName(""); setNewValue("180"); }}
          placeholderValue="180"
          placeholderName="motion-name"
          unitToggle={
            <div className="flex items-center gap-0.5 rounded border border-border bg-muted/20 p-0.5">
              {DURATION_UNITS.map((u) => (
                <button key={u} type="button" onClick={() => setNewUnit(u)} aria-pressed={newUnit === u}
                  className={cn("rounded px-1.5 py-0.5 text-[9px] font-mono font-medium transition-colors",
                    newUnit === u ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {u}
                </button>
              ))}
            </div>
          }
          buttonLabel="Add duration"
        />
      }
    />
  );
}

/** Animated bouncing ball that demonstrates an easing curve. */
function AnimatedEasingBall({ value }: { value: string }) {
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setPhase((p) => p + 1), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-8 w-24 rounded border border-border bg-muted/30 overflow-hidden">
        <div
          key={phase}
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-brand-lemon"
          style={{
            animation: `te-easing-move 1.2s ${value} infinite`,
          }}
        />
        <style>{`@keyframes te-easing-move { 0% { left: 2px; } 50% { left: calc(100% - 18px); } 100% { left: 2px; } }`}</style>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bezier curve editor — small preview box + floating edit panel        */
/* ------------------------------------------------------------------ */

/** Parse a cubic-bezier(...) string into [x1, y1, x2, y2]. */
function parseBezier(value: string): [number, number, number, number] | null {
  const m = value.match(/cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
  return null;
}

function formatBezier(p: [number, number, number, number]): string {
  return `cubic-bezier(${p[0]}, ${p[1]}, ${p[2]}, ${p[3]})`;
}

/** A small SVG preview of the bezier curve. */
function BezierPreview({ points, size = 28 }: { points: [number, number, number, number]; size?: number }) {
  const [x1, y1, x2, y2] = points;
  // Map bezier coords (0-1, y inverted) to SVG pixels
  const pad = 3;
  const w = size - pad * 2;
  const p1x = pad + x1 * w;
  const p1y = pad + (1 - y1) * w;
  const p2x = pad + x2 * w;
  const p2y = pad + (1 - y2) * w;
  const path = `M ${pad},${pad + w} C ${p1x},${p1y} ${p2x},${p2y} ${pad + w},${pad}`;
  return (
    <svg width={size} height={size} className="rounded border border-border bg-background">
      <path d={path} fill="none" stroke="var(--brand-lemon)" strokeWidth={1.5} />
      <line x1={pad} y1={p1y} x2={p1x} y2={p1y} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.4} />
      <line x1={pad + w} y1={p2y} x2={p2x} y2={p2y} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.4} />
      <circle cx={p1x} cy={p1y} r={2} fill="var(--brand-lemon)" />
      <circle cx={p2x} cy={p2y} r={2} fill="var(--brand-lemon)" />
    </svg>
  );
}

/** Interactive bezier curve editor with draggable control points. */
function BezierCurveEditor({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = parseBezier(value);
  const points: [number, number, number, number] = parsed ?? [0.4, 0, 0.2, 1];
  const [open, setOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  // Panel position in viewport coordinates (fixed positioning so it floats
  // over the box itself, not clipped by the scrollable editor container).
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number } | null>(null);
  const size = 180;
  const pad = 12;
  const w = size - pad * 2;

  const openPanel = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // Position the panel below the button, clamped to the viewport
    const panelWidth = 232; // minWidth + padding
    const panelHeight = 320; // approx
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
    let top = rect.bottom + 4;
    if (top + panelHeight > window.innerHeight - 8) top = rect.top - panelHeight - 4;
    setPanelPos({ top: Math.max(8, top), left: Math.max(8, left) });
    setOpen(true);
  };

  const handlePointerDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(idx);
  };

  React.useEffect(() => {
    if (dragging === null) return;
    const handleMove = (e: PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left - pad) / w;
      const py = 1 - (e.clientY - rect.top - pad) / w;
      const clamped = (v: number) => Math.max(0, Math.min(1, v));
      const next = [...points] as [number, number, number, number];
      // x is clamped 0-1, y can go outside (for spring/overshoot)
      if (dragging === 0) { next[0] = clamped(px); next[1] = Math.max(-0.5, Math.min(1.5, py)); }
      else { next[2] = clamped(px); next[3] = Math.max(-0.5, Math.min(1.5, py)); }
      onChange(formatBezier(next));
    };
    const handleUp = () => setDragging(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, points, onChange, w]);

  const [x1, y1, x2, y2] = points;
  const p1x = pad + x1 * w;
  const p1y = pad + (1 - y1) * w;
  const p2x = pad + x2 * w;
  const p2y = pad + (1 - y2) * w;
  const path = `M ${pad},${pad + w} C ${p1x},${p1y} ${p2x},${p2y} ${pad + w},${pad}`;

  return (
    <>
      {/* Small preview button — click to open the floating editor */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="shrink-0 rounded border border-border bg-background hover:border-brand-lemon/40 transition-colors"
        title="Click to edit bezier curve"
      >
        <BezierPreview points={points} />
      </button>

      {/* Floating panel — uses fixed positioning so it floats over the box */}
      {open && panelPos && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          {/* Panel — fixed position, floats over everything including the editor box */}
          <div
            className="fixed z-[101] rounded-lg border border-border bg-popover p-3 shadow-2xl"
            style={{ top: panelPos.top, left: panelPos.left, minWidth: 220 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bezier Curve</span>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-[12px]">✕</button>
            </div>
            <svg
              ref={svgRef}
              width={size} height={size}
              className="rounded border border-border bg-background cursor-crosshair"
            >
              {/* Grid */}
              <line x1={pad} y1={pad} x2={pad + w} y2={pad} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.2} />
              <line x1={pad} y1={pad + w} x2={pad + w} y2={pad + w} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.2} />
              <line x1={pad} y1={pad} x2={pad} y2={pad + w} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.2} />
              <line x1={pad + w} y1={pad} x2={pad + w} y2={pad + w} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.2} />
              {/* Control handle lines */}
              <line x1={pad} y1={pad + w} x2={p1x} y2={p1y} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.4} />
              <line x1={pad + w} y1={pad} x2={p2x} y2={p2y} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.4} />
              {/* The curve */}
              <path d={path} fill="none" stroke="var(--brand-lemon)" strokeWidth={2} />
              {/* Control points (draggable) */}
              <circle
                cx={p1x} cy={p1y} r={7}
                fill="var(--brand-lemon)" stroke="var(--background)" strokeWidth={2}
                className="cursor-grab"
                onPointerDown={handlePointerDown(0)}
              />
              <circle
                cx={p2x} cy={p2y} r={7}
                fill="var(--brand-lemon)" stroke="var(--background)" strokeWidth={2}
                className="cursor-grab"
                onPointerDown={handlePointerDown(1)}
              />
            </svg>
            {/* Numeric inputs */}
            <div className="mt-2 grid grid-cols-4 gap-1">
              {points.map((p, i) => (
                <label key={i} className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-muted-foreground">{["x1","y1","x2","y2"][i]}</span>
                  <input
                    type="number" step={0.01} value={p}
                    onChange={(e) => {
                      const next = [...points] as [number, number, number, number];
                      next[i] = parseFloat(e.target.value) || 0;
                      onChange(formatBezier(next));
                    }}
                    className="h-5 rounded border border-border bg-background px-1 text-[9px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
                  />
                </label>
              ))}
            </div>
            {/* Preset buttons */}
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                { label: "linear", pts: [0, 0, 1, 1] as [number, number, number, number] },
                { label: "ease", pts: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
                { label: "out", pts: [0.16, 1, 0.3, 1] as [number, number, number, number] },
                { label: "in-out", pts: [0.4, 0, 0.2, 1] as [number, number, number, number] },
                { label: "spring", pts: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(formatBezier(preset.pts))}
                  className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground hover:text-foreground hover:border-brand-lemon/40"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Easing token row — name + bezier curve editor button + remove. */
function EasingRow({
  name, value, onRename, onChange, onRemove,
}: {
  name: string;
  value: string;
  onRename: (newName: string) => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(name);
  React.useEffect(() => setNameDraft(name), [name]);

  return (
    <div className="relative flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      {editingName ? (
        <input
          type="text" value={nameDraft} autoFocus
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => { if (nameDraft.trim() && nameDraft !== name) onRename(nameDraft.trim()); setEditingName(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (nameDraft.trim() && nameDraft !== name) onRename(nameDraft.trim()); setEditingName(false); }
            else if (e.key === "Escape") { setNameDraft(name); setEditingName(false); }
          }}
          className="h-6 flex-1 min-w-[80px] rounded border border-brand-lemon/40 bg-background px-1.5 text-[11px] font-mono text-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingName(true)}
          className="flex-1 min-w-[80px] text-left text-[11px] font-mono text-foreground hover:text-brand-lemon truncate"
          title="Click to rename"
        >
          {name}
        </button>
      )}
      <BezierCurveEditor value={value} onChange={onChange} />
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Remove token"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function MotionEasingSection({
  tokens, setToken, removeToken, renameToken, addToken, resetCategory,
}: {
  tokens: [string, string][];
  setToken: (cat: "motion", name: string, value: string) => void;
  removeToken: (cat: "motion", name: string) => void;
  renameToken: (cat: "motion", oldName: string, newName: string) => void;
  addToken: (cat: "motion", name: string, value: string) => void;
  resetCategory: (cat: "motion") => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [newValue, setNewValue] = React.useState("cubic-bezier(0.4, 0, 0.2, 1)");

  return (
    <Section
      title="Motion · Easing"
      icon={Clock}
      preview={
        <div className="flex flex-wrap gap-3 justify-center items-end">
          {tokens.map(([name, value]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <AnimatedEasingBall value={value} />
              <span className="text-[8px] font-mono text-muted-foreground">{name.replace("ease-", "")}</span>
            </div>
          ))}
        </div>
      }
      editorHeader={
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ease-out, ease-in-out, ease-spring, …</span>
          <button type="button" onClick={() => resetCategory("motion")} className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </>
      }
      tokens={
        <div className="flex flex-col gap-1.5">
          {tokens.map(([name, value]) => (
            <EasingRow
              key={name}
              name={name}
              value={value}
              onRename={(n) => renameToken("motion", name, n)}
              onChange={(v) => setToken("motion", name, v)}
              onRemove={() => removeToken("motion", name)}
            />
          ))}
        </div>
      }
      addTokenBar={
        <AddTokenBar
          newName={newName} newValue={newValue}
          setNewName={setNewName} setNewValue={setNewValue}
          onAdd={() => { addToken("motion", newName.trim(), newValue.trim() || "linear"); setNewName(""); setNewValue("cubic-bezier(0.4, 0, 0.2, 1)"); }}
          placeholderValue="cubic-bezier(0.4, 0, 0.2, 1)"
          placeholderName="ease-name"
          buttonLabel="Add easing"
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Add token bar (shared)                                              */
/* ------------------------------------------------------------------ */

/**
 * Unified "create new token" bar — same design across all boxes.
 * Shows a single "Add new token" button. When clicked, expands into
 * inline name + value inputs (+ optional unit toggle) + confirm/cancel.
 * Matches the Borders box add-token style: one button only.
 */
function AddTokenBar({
  newName, newValue, setNewName, setNewValue, onAdd, placeholderValue,
  placeholderName = "token-name",
  unitToggle,
  buttonLabel = "Add new token",
}: {
  newName: string;
  newValue: string;
  setNewName: (v: string) => void;
  setNewValue: (v: string) => void;
  onAdd: () => void;
  placeholderValue: string;
  placeholderName?: string;
  /** Optional unit toggle group node (for dimension values). */
  unitToggle?: React.ReactNode;
  /** Label for the collapsed button. */
  buttonLabel?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex h-7 w-full items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/20 text-[10px] text-muted-foreground hover:text-foreground hover:border-brand-lemon/40"
      >
        <Plus className="h-3 w-3" /> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-dashed border-border bg-muted/20 px-2 py-1.5">
      <input
        type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
        placeholder={placeholderName}
        autoFocus
        className="h-6 min-w-[80px] flex-1 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
      <input
        type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
        placeholder={placeholderValue}
        className="h-6 w-14 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
      />
      {unitToggle}
      <button
        type="button" disabled={!newName.trim()}
        onClick={() => { onAdd(); setExpanded(false); }}
        className="inline-flex h-6 items-center gap-1 rounded border border-brand-lemon/40 bg-brand-lemon/10 px-2 text-[10px] font-medium text-brand-lemon disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => { setExpanded(false); setNewName(""); }}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        title="Cancel"
      >
        ✕
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Export panel                                                        */
/* ------------------------------------------------------------------ */

function ExportPanel({ onClose }: { onClose: () => void }) {
  const exportAsCss = useThemeTokens((s) => s.exportAsCss);
  const exportAsJson = useThemeTokens((s) => s.exportAsJson);
  const exportAsTailwind = useThemeTokens((s) => s.exportAsTailwind);
  const [format, setFormat] = React.useState<"css" | "json" | "tailwind">("css");
  const [copied, setCopied] = React.useState(false);

  const code = React.useMemo(() => {
    if (format === "css") return exportAsCss();
    if (format === "json") return exportAsJson();
    return exportAsTailwind();
  }, [format, exportAsCss, exportAsJson, exportAsTailwind]);

  const filename = format === "tailwind" ? "tailwind.config.json" : format === "json" ? "theme-tokens.json" : "theme.css";

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="eyebrow">Export Tokens</span>
        <div className="flex items-center gap-1">
          {(["css", "json", "tailwind"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFormat(f)}
              className={cn("rounded px-2 py-1 text-[10px] font-medium transition-colors",
                format === f ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f === "tailwind" ? "Tailwind" : f.toUpperCase()}
            </button>
          ))}
          <button type="button"
            onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="ml-2 inline-flex h-7 items-center gap-1 rounded border border-border bg-muted/30 px-2 text-[10px] text-foreground hover:bg-muted/50">
            {copied ? <Check className="h-3 w-3 text-brand-lemon" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={onClose}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
      </div>
      <div className="max-h-[300px] overflow-auto p-3">
        <CodeBlock code={code} language={format === "json" || format === "tailwind" ? "json" : "css"} filename={filename} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Import panel                                                        */
/* ------------------------------------------------------------------ */

function ImportPanel({ onClose }: { onClose: () => void }) {
  const importTokens = useThemeTokens((s) => s.importTokens);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(text) as ThemeTokens;
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
      for (const cat of Object.keys(DEFAULT_TOKENS) as (keyof ThemeTokens)[]) {
        if (parsed[cat] && typeof parsed[cat] !== "object") {
          throw new Error(`Category "${cat}" must be an object`);
        }
      }
      importTokens({ ...DEFAULT_TOKENS, ...parsed });
      setError(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="eyebrow">Import Tokens (JSON)</span>
        <button type="button" onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>
      <div className="p-3">
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder='Paste JSON here, e.g. {"colors": {"brand-lemon": "#D9FF66"}, ...}'
          className="h-32 w-full resize-none rounded border border-border bg-background p-2 text-[11px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
        />
        {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded border border-border bg-muted/30 px-3 text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
          <button type="button" onClick={handleImport} disabled={!text.trim()}
            className="h-8 rounded border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[11px] font-medium text-brand-lemon disabled:opacity-40">
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
