"use client";

import * as React from "react";
import {
  CalendarRange, RotateCcw, LayoutTemplate, Ban, BookOpen,
  ZoomIn, ZoomOut, CalendarDays, Maximize2,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  GanttReact,
  type GanttItem,
  type GanttRow,
  type GanttScale,
  type GanttEventPayload,
} from "./gantt-react";
import { GanttTimeline, GANTT_TEMPLATE_NONE } from "@/lib/components/gantt";
import {
  registerBuiltinTemplates,
  templateRegistry,
  type ContentTemplate,
} from "@/lib/templates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Register the platform's built-in content templates + slot renderers at
// module load time. The GanttTimeline constructor reads the registry to lay
// out bar content, so templates must be registered BEFORE the timeline is
// constructed. Idempotent and SSR-safe.
registerBuiltinTemplates();

const DAY = 86_400_000;

interface State {
  scale: GanttScale;
  showRowHeaders: boolean;
  showGrid: boolean;
  showToday: boolean;
  showAxis: boolean;
  progressEnabled: boolean;
  movable: boolean;
  resizable: boolean;
  rowMovable: boolean;
  readOnly: boolean;
  rowHeight: number;
  barHeight: number;
  rowHeaderWidth: number;
  templateId: string;
}

const DEFAULTS: State = {
  scale: "day",
  showRowHeaders: true,
  showGrid: true,
  showToday: true,
  showAxis: true,
  progressEnabled: true,
  movable: true,
  resizable: true,
  rowMovable: false,
  readOnly: false,
  rowHeight: 48,
  barHeight: 28,
  rowHeaderWidth: 160,
  templateId: "gantt.standard-bar",
};

const NOW = Date.now();

const SEED_VIEW_START = NOW - 7 * DAY;
const SEED_VIEW_END = NOW + 28 * DAY;

const SEED_ROWS: GanttRow[] = [
  { id: "research", title: "Research", color: "#B8B2CA" },
  { id: "design", title: "Design", color: "#8FE3A5" },
  { id: "dev", title: "Development", color: "#D9FF66" },
  { id: "qa", title: "QA", color: "#FFD36B" },
];

const SEED_ITEMS: GanttItem[] = [
  {
    id: "t1", rowId: "research", title: "Market analysis",
    start: NOW - 5 * DAY, end: NOW + 3 * DAY, progress: 70, color: "#6B5FA8",
    assignee: "Ava Kim", refId: "R-001",
  },
  {
    id: "t2", rowId: "research", title: "User interviews",
    start: NOW + 2 * DAY, end: NOW + 8 * DAY, progress: 20, color: "#6B5FA8",
    assignee: "Jordan Mehta",
  },
  {
    id: "t3", rowId: "design", title: "Wireframes",
    start: NOW - 2 * DAY, end: NOW + 5 * DAY, progress: 55, color: "#5B8F6B",
    assignee: "Ava Kim", refId: "D-010",
  },
  {
    id: "t4", rowId: "design", title: "Visual design",
    start: NOW + 4 * DAY, end: NOW + 14 * DAY, progress: 10, color: "#5B8F6B",
    assignee: "Jordan Mehta",
  },
  {
    id: "t5", rowId: "dev", title: "Build API",
    start: NOW, end: NOW + 10 * DAY, progress: 35, color: "#7B9F3F",
    assignee: "Zai Bot", refId: "E-100",
  },
  {
    id: "t6", rowId: "dev", title: "Frontend integration",
    start: NOW + 8 * DAY, end: NOW + 20 * DAY, progress: 0, color: "#7B9F3F",
    assignee: "Zai Bot",
  },
  {
    id: "t7", rowId: "qa", title: "Test pass 1",
    start: NOW + 12 * DAY, end: NOW + 18 * DAY, progress: 0, color: "#9F8B3F",
  },
  {
    id: "t8", rowId: "qa", title: "Regression",
    start: NOW + 18 * DAY, end: NOW + 25 * DAY, progress: 0, color: "#9F8B3F",
    assignee: "Ava Kim", refId: "Q-200",
  },
];

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function GanttPlayground() {
  const meta = getComponent("gantt")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<GanttItem[]>(SEED_ITEMS);
  const [rows] = React.useState<GanttRow[]>(SEED_ROWS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<GanttTimeline | null>(null);

  const ganttTemplates: ContentTemplate[] = React.useMemo(
    () => templateRegistry.byCategory("Gantt"),
    [],
  );

  const templateOptions: ContentTemplate[] = React.useMemo(
    () => [
      {
        id: GANTT_TEMPLATE_NONE,
        name: "None",
        category: "Gantt",
        description:
          "Native bar rendering — no content template. Bars show a plain colored fill with no content inside. Demonstrates that the timeline is independent of the template system.",
        slots: [],
      },
      ...ganttTemplates,
    ],
    [ganttTemplates],
  );

  const activeTemplate = React.useMemo(
    () => templateOptions.find((t) => t.id === state.templateId) ?? templateOptions[0],
    [templateOptions, state.templateId],
  );

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const syncFromBoard = React.useCallback(() => {
    if (instanceRef.current) {
      setItems(instanceRef.current.getItems());
      setSelectedId(instanceRef.current.getSelectedBar());
    }
  }, []);

  const onBarSelected = React.useCallback((_p: GanttEventPayload) => {
    syncFromBoard();
  }, [syncFromBoard]);

  const onBarMoved = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`moved ${p.itemId} → ${fmtDate(p.newStart ?? 0)}`);
    syncFromBoard();
  }, [syncFromBoard]);

  const onBarResized = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`resized ${p.itemId} ${p.endpoint} → ${fmtDate(p.endpoint === "start" ? (p.newStart ?? 0) : (p.newEnd ?? 0))}`);
    syncFromBoard();
  }, [syncFromBoard]);

  const onBarMoveRejected = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`rejected ${p.itemId} (${p.reason})`);
    toast.error(`Move rejected: ${p.reason}`, {
      description: p.itemId ?? "",
    });
  }, []);

  const onBarActivated = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`activated ${p.itemId}`);
    toast.info("Bar activated", {
      description: `Double-click or Enter on ${p.itemId}.`,
    });
  }, []);

  const onBarDeleteRequested = React.useCallback((p: GanttEventPayload) => {
    if (!instanceRef.current || !p.itemId) return;
    const remaining = instanceRef.current.getItems().filter((it) => it.id !== p.itemId);
    instanceRef.current.setItems(remaining);
    setLastEvent(`deleted ${p.itemId}`);
    toast.success("Bar removed", { description: p.itemId });
    syncFromBoard();
  }, [syncFromBoard]);

  const onViewRangeChanged = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`view → ${fmtDate(p.viewStart ?? 0)}..${fmtDate(p.viewEnd ?? 0)}`);
  }, []);

  const onDragStarted = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`drag-start ${p.itemId} (${p.operation})`);
  }, []);

  const onDragCancelled = React.useCallback((p: GanttEventPayload) => {
    setLastEvent(`drag-cancel ${p.itemId}`);
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setSelectedId(null);
    setLastEvent("reset");
    setTimeout(() => {
      instanceRef.current?.setItems(SEED_ITEMS);
      instanceRef.current?.setViewRange(SEED_VIEW_START, SEED_VIEW_END);
      instanceRef.current?.clearSelection();
    }, 0);
    toast.info("Timeline reset", { description: "Restored seed items and view range." });
  }, []);

  const selectedItem = React.useMemo(() => items.find((it) => it.id === selectedId) ?? null, [items, selectedId]);

  const jsCode = React.useMemo(() => `import { GanttTimeline } from "@workshop/gantt";
import { registerBuiltinTemplates } from "@workshop/templates";

registerBuiltinTemplates();

const DAY = 86_400_000;
const now = Date.now();

const timeline = new GanttTimeline(container, {
  viewStart: now - 7 * DAY,
  viewEnd: now + 28 * DAY,
  scale: "${state.scale}",
  showRowHeaders: ${state.showRowHeaders},
  showGrid: ${state.showGrid},
  showToday: ${state.showToday},
  showAxis: ${state.showAxis},
  progressEnabled: ${state.progressEnabled},
  movable: ${state.movable},
  resizable: ${state.resizable},
  rowMovable: ${state.rowMovable},
  readOnly: ${state.readOnly},
  rowHeight: ${state.rowHeight},
  barHeight: ${state.barHeight},
  rowHeaderWidth: ${state.rowHeaderWidth},
  templateId: "${state.templateId}",
  rows: [
    { id: "research", title: "Research", color: "#B8B2CA" },
    { id: "design", title: "Design", color: "#8FE3A5" },
    { id: "dev", title: "Development", color: "#D9FF66" },
    { id: "qa", title: "QA", color: "#FFD36B" },
  ],
  items: [
    { id: "t1", rowId: "research", title: "Market analysis", start: now - 5*DAY, end: now + 3*DAY, progress: 70 },
    { id: "t5", rowId: "dev", title: "Build API", start: now, end: now + 10*DAY, progress: 35 },
  ],
});

timeline.on("bar_moved", ({ itemId, oldStart, newStart }) => {
  console.log(\`Moved \${itemId}: \${new Date(oldStart).toDateString()} → \${new Date(newStart).toDateString()}\`);
});

timeline.on("bar_resized", ({ itemId, endpoint, oldEnd, newEnd }) => {
  console.log(\`Resized \${itemId} \${endpoint}\`);
});

// Switch templates at runtime:
// timeline.setTemplateId("gantt.detailed-bar");
// timeline.setTemplateId("none");  // native rendering`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Productivity</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Gantt Timeline</h1>
              <CollapsibleDescription
                text={meta.longDescription}
                maxLength={220}
                className="mt-2 max-w-2xl text-[15px] text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {meta.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{t}</span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-lemon/30 bg-brand-lemon/10 px-2.5 py-1 text-[11px] font-mono text-brand-lemon">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />{meta.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Live canvas */}
          <section aria-label="Live preview" className="panel relative flex h-[600px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                {activeTemplate && (
                  <span className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {state.templateId === GANTT_TEMPLATE_NONE ? (
                      <Ban className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <LayoutTemplate className="h-3 w-3 text-brand-lemon" />
                    )}
                    {activeTemplate.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                  {items.length} items · {rows.length} rows
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-grid">
              <GanttReact
                items={items}
                rows={rows}
                viewStart={SEED_VIEW_START}
                viewEnd={SEED_VIEW_END}
                scale={state.scale}
                showRowHeaders={state.showRowHeaders}
                showGrid={state.showGrid}
                showToday={state.showToday}
                showAxis={state.showAxis}
                progressEnabled={state.progressEnabled}
                movable={state.movable}
                resizable={state.resizable}
                rowMovable={state.rowMovable}
                readOnly={state.readOnly}
                rowHeight={state.rowHeight}
                barHeight={state.barHeight}
                rowHeaderWidth={state.rowHeaderWidth}
                templateId={state.templateId}
                onBarSelected={onBarSelected}
                onBarMoved={onBarMoved}
                onBarResized={onBarResized}
                onBarMoveRejected={onBarMoveRejected}
                onBarActivated={onBarActivated}
                onBarDeleteRequested={onBarDeleteRequested}
                onViewRangeChanged={onViewRangeChanged}
                onDragStarted={onDragStarted}
                onDragCancelled={onDragCancelled}
                instanceRef={instanceRef}
                className="h-full"
              />
            </div>
            {/* Output */}
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  last: <span className="text-brand-lemon">{lastEvent}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Selected" value={selectedItem ? `${selectedItem.id} · ${selectedItem.title}` : "—"} />
                {selectedItem && (
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                    <span className="text-muted-foreground">range:</span>
                    <span className="text-foreground">{fmtDate(selectedItem.start)} → {fmtDate(selectedItem.end)}</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: drag bars to move, drag handles to resize, press <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">→</kbd> on a focused bar to nudge, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Shift+←/→</kbd> to resize.
              </p>
            </div>
          </section>

          {/* Properties + Templates + AGENT + SKILL */}
          <AgentSkillTabs
            agentPath="/docs/components/gantt-AGENT.md"
            skillPath="/docs/components/gantt-SKILL.md"
            templatesSlot={
              <>
                {/* Template picker */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                    <LayoutTemplate className="h-3.5 w-3.5 text-brand-lemon" />
                    Content template
                  </label>
                  <div className="rounded-md border border-border bg-muted/20 p-1">
                    <div className="flex flex-col gap-0.5">
                      {templateOptions.map((t) => {
                        const isNone = t.id === GANTT_TEMPLATE_NONE;
                        const isActive = state.templateId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => update("templateId", t.id)}
                            aria-pressed={isActive}
                            className={cn(
                              "rounded px-2.5 py-2 text-left transition-colors",
                              isActive
                                ? "bg-brand-purple-strong text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-[12px] font-medium">
                                {isNone ? (
                                  <Ban className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <LayoutTemplate className="h-3 w-3 text-brand-lemon" />
                                )}
                                {t.name}
                              </span>
                              <code className="font-mono text-[10px] text-muted-foreground/80">{t.id}</code>
                            </div>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                              {t.description}
                            </p>
                            {t.slots.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {t.slots.map((s) => (
                                  <span
                                    key={`${t.id}-${s.field}-${s.renderer}`}
                                    className="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                                  >
                                    {s.field}
                                    <span className="mx-1 text-muted-foreground/40">·</span>
                                    <span className="text-brand-lemon/80">{s.renderer}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {isNone && (
                              <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground/80">
                                The timeline works with zero templates registered — content templates are an opt-in layer on top.
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                    Templates live in <code className="font-mono text-brand-lemon/80">src/lib/templates/</code> and
                    are reusable across components. Switching swaps the bar content without touching the data or geometry.
                  </p>
                </div>

                {/* How to create custom templates */}
                <div className="rounded-md border border-border bg-muted/10 p-4">
                  <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-brand-lemon" />
                    Creating custom templates
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    The timeline is independent of templates — it works with <code className="font-mono text-brand-lemon/80">&quot;none&quot;</code> or
                    any registered ID. Templates are declarative: an ordered list of slots, each naming a field and a renderer.
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded border border-border bg-background/60 p-2 font-mono text-[10px] text-foreground"><code>{`import { defineRenderer, defineTemplate } from "@/lib/templates";

// 1. Optional: register a custom renderer.
defineRenderer("my-bar-field", (ctx) => {
  const v = ctx.item[ctx.slot.field];
  if (!v) return null;
  const el = document.createElement("div");
  el.className = "ctpl-bar-text";
  el.textContent = String(v);
  return el;
});

// 2. Register a template.
defineTemplate({
  id: "gantt.my-bar",
  name: "My Bar",
  category: "Gantt",
  description: "Title + custom field.",
  slots: [
    { field: "title", renderer: "title", visibleIn: ["compact","standard","detailed"] },
    { field: "myField", renderer: "my-bar-field", visibleIn: ["standard","detailed"] },
  ],
});

// 3. Use it.
timeline.setTemplateId("gantt.my-bar");
// or go template-free:
timeline.setTemplateId("none");`}</code></pre>
                  <p className="mt-2 text-[10px] leading-snug text-muted-foreground/80">
                    The renderer contract is <code className="font-mono text-brand-lemon/80">{"(ctx: { item, slot, density, host }) => HTMLElement | null"}</code>.
                    Bar geometry (position, width) is always owned by the timeline — a template only renders content inside the bar.
                  </p>
                </div>
              </>
            }
          >
            {/* Mode */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Mode</label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                <button type="button" onClick={() => update("readOnly", false)} aria-pressed={!state.readOnly}
                  className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                    !state.readOnly ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  Editable
                </button>
                <button type="button" onClick={() => update("readOnly", true)} aria-pressed={state.readOnly}
                  className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                    state.readOnly ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  Read-only
                </button>
              </div>
            </div>

            {/* Scale */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Scale</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["day", "week", "month"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("scale", s)} aria-pressed={state.scale === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.scale === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "showRowHeaders" as const, l: "Show row headers" },
                { k: "showGrid" as const, l: "Show grid lines" },
                { k: "showToday" as const, l: "Show today marker" },
                { k: "showAxis" as const, l: "Show time axis" },
                { k: "progressEnabled" as const, l: "Progress overlay" },
                { k: "movable" as const, l: "Movable bars" },
                { k: "resizable" as const, l: "Resizable bars" },
                { k: "rowMovable" as const, l: "Row movement (↑↓)" },
              ]).map(({ k, l }) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="text-[12px] text-foreground">{l}</span>
                  <button type="button" role="switch" aria-checked={state[k]} onClick={() => update(k, !state[k])}
                    className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      state[k] ? "bg-brand-lemon" : "bg-muted-foreground/30")}>
                    <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform",
                      state[k] ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                </div>
              ))}
            </div>

            {/* Sliders */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Row height: <span className="font-mono text-brand-lemon">{state.rowHeight}px</span></label>
              <input type="range" min={32} max={80} step={4} value={state.rowHeight} onChange={(e) => update("rowHeight", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.rowHeight - 32) / 48 * 100}%, var(--muted) ${(state.rowHeight - 32) / 48 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>32</span><span>80</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Bar height: <span className="font-mono text-brand-lemon">{state.barHeight}px</span></label>
              <input type="range" min={16} max={40} step={2} value={state.barHeight} onChange={(e) => update("barHeight", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.barHeight - 16) / 24 * 100}%, var(--muted) ${(state.barHeight - 16) / 24 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>16</span><span>40</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Row header width: <span className="font-mono text-brand-lemon">{state.rowHeaderWidth}px</span></label>
              <input type="range" min={100} max={240} step={10} value={state.rowHeaderWidth} onChange={(e) => update("rowHeaderWidth", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.rowHeaderWidth - 100) / 140 * 100}%, var(--muted) ${(state.rowHeaderWidth - 100) / 140 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>100</span><span>240</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => instanceRef.current?.zoomIn()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ZoomIn className="h-3 w-3 text-brand-lemon" /> Zoom in
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.zoomOut()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ZoomOut className="h-3 w-3 text-brand-lemon" /> Zoom out
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.today()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <CalendarDays className="h-3 w-3 text-brand-lemon" /> Today
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!instanceRef.current) return;
                  const its = instanceRef.current.getItems();
                  if (its.length === 0) return;
                  const min = Math.min(...its.map((it) => it.start));
                  const max = Math.max(...its.map((it) => it.end));
                  instanceRef.current.fitToRange(min, max);
                  toast.success("Fitted to data", { description: `${fmtDate(min)} → ${fmtDate(max)}` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Maximize2 className="h-3 w-3 text-brand-lemon" /> Fit to data
              </button>
            </div>
          </AgentSkillTabs>
        </div>

        {/* Code panel */}
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setActiveTab(k)}
                  className={cn("relative h-9 px-3 text-[12px] font-medium transition-colors",
                    activeTab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {l}
                  {activeTab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {activeTab === "javascript" && <CodeBlock code={jsCode} language="javascript" filename="init.js" />}
            {activeTab === "html" && <CodeBlock code={'<div id="gantt" style="height: 600px;"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".gantt-timeline {\n  /* Override tokens to retheme the timeline */\n  --gt-accent: #D9FF66;\n  --gt-surface: #211A30;\n  --gt-border: #383343;\n  --gt-text: #F4F1FF;\n  --gt-muted: #B8B2CA;\n  --gt-bar: #6B5FA8;\n}\n\n/* Compact bars for side panels */\n.gantt-timeline .gantt-bar {\n  border-radius: 3px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class GanttTimeline {\n  constructor(container, options)\n  setItems(items): void\n  setRows(rows): void\n  selectBar(itemId | null, source?): void\n  clearSelection(): void\n  getSelectedBar(): string | null\n  moveBar(itemId, start, end, source?): void\n  resizeBar(itemId, endpoint, time, source?): void\n  moveBarToRow(itemId, rowId, source?): void\n  setViewRange(start, end, source?): void\n  setScale(scale): void\n  zoomIn(): void\n  zoomOut(): void\n  fitToRange(start, end): void\n  navigateTo(time): void\n  today(): void\n\n  // Content templates (see src/lib/templates/)\n  getTemplate(): ContentTemplate | undefined\n  getTemplateId(): string\n  setTemplateId(id): void  // pass \"none\" for native rendering\n\n  getItems(): GanttItem[]\n  getRows(): GanttRow[]\n  getViewRange(): { start, end }\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   bar_selected, selection_changed, bar_activated,\n//   bar_moved, bar_resized, bar_move_requested, bar_resize_requested,\n//   bar_move_rejected (reason: read_only, invalid_item, invalid_interval,\n//     min_duration, row_movable_disabled, invalid_row),\n//   bar_row_changed, bar_delete_requested,\n//   view_range_changed, scale_changed,\n//   drag_started, drag_cancelled\n\n// Content templates are registered in a singleton registry:\n//   import { registerBuiltinTemplates, templateRegistry } from \"@/lib/templates\";\n//   registerBuiltinTemplates();\n//   templateRegistry.byCategory(\"Gantt\");\n//   // → [{ id: \"gantt.standard-bar\", ... }, { id: \"gantt.minimal-bar\", ... }, ...]"} language="typescript" filename="api.ts" />}
          </div>
        </section>

        {/* Documentation */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-6">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Overview</h2>
              <p className="mt-2 text-[14px] text-muted-foreground">{meta.description}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-lemon">When to use</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />{u}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Not for</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenNotToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{u}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Properties</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-mono font-medium">Property</th>
                      <th className="py-2 pr-4 font-mono font-medium">Type</th>
                      <th className="py-2 pr-4 font-mono font-medium">Default</th>
                      <th className="py-2 font-mono font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.properties.map((p) => (
                      <tr key={p.name} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{p.name}</td>
                        <td className="py-2 pr-4 font-mono text-foreground">{p.type}</td>
                        <td className="py-2 pr-4 font-mono text-muted-foreground">{p.default}</td>
                        <td className="py-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Methods</h2>
                <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                  {meta.methods.map((m) => (
                    <li key={m.signature} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{m.signature}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{m.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Events</h2>
                <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                  {meta.events.map((e) => (
                    <li key={e.name} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{e.name}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{e.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">payload: {e.payload}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Accessibility</h2>
              <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Bars are real DOM elements with <code className="font-mono text-brand-lemon">tabindex=&quot;0&quot;</code> and <code className="font-mono text-brand-lemon">role=&quot;button&quot;</code>.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Visible focus ring (lemon) on every bar.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Space</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Enter</kbd> selects, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←/→</kbd> moves, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Shift+←/→</kbd> resizes.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">↑/↓</kbd> moves between rows (when <code className="font-mono text-brand-lemon">rowMovable</code>).</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Each bar&apos;s aria-label includes its title and date range.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Selection and progress states use color + outline, never color alone.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><code className="font-mono text-brand-lemon">prefers-reduced-motion</code> disables bar transitions.</li>
              </ul>
            </div>

            <div className="panel p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <LayoutTemplate className="h-4 w-4 text-brand-lemon" />
                Content templates
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Bar content is laid out by a registered content template (see <code className="font-mono text-brand-lemon">src/lib/templates/</code>).
                The timeline is independent of templates — pass <code className="font-mono text-brand-lemon">&quot;none&quot;</code> as
                the <code className="font-mono text-brand-lemon">templateId</code> to render bars with no content inside (plain colored fill).
                Bar geometry (position, width, height) is always owned by the timeline.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-mono font-medium">Template ID</th>
                      <th className="py-2 pr-4 font-mono font-medium">Name</th>
                      <th className="py-2 font-mono font-medium">Slots</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/60 align-top">
                      <td className="py-2 pr-4 font-mono text-muted-foreground">none</td>
                      <td className="py-2 pr-4 font-medium text-foreground">None</td>
                      <td className="py-2 text-muted-foreground">— (native rendering)</td>
                    </tr>
                    {ganttTemplates.map((t) => (
                      <tr key={t.id} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{t.id}</td>
                        <td className="py-2 pr-4 font-medium text-foreground">{t.name}</td>
                        <td className="py-2 text-muted-foreground">
                          {t.slots.length === 0 ? "—" : t.slots.map((s) => s.field).join(" → ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-brand-lemon">Creating a custom template</h3>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                The component does not know which templates exist — it looks them up by ID in the
                singleton registry at render time. To add a custom template:
              </p>
              <ol className="mt-2 space-y-2 text-[13px] text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lemon/10 font-mono text-[10px] font-semibold text-brand-lemon">1</span>
                  <span>Register a slot renderer (or reuse a built-in one like <code className="font-mono text-brand-lemon">title</code>).</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lemon/10 font-mono text-[10px] font-semibold text-brand-lemon">2</span>
                  <span>Register a template that references renderers by name.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lemon/10 font-mono text-[10px] font-semibold text-brand-lemon">3</span>
                  <span>Pass the template ID to the timeline (<code className="font-mono text-brand-lemon">templateId</code> option or <code className="font-mono text-brand-lemon">setTemplateId()</code>).</span>
                </li>
              </ol>
              <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] text-foreground"><code>{`import { defineRenderer, defineTemplate } from "@/lib/templates";

defineRenderer("my-bar-field", (ctx) => {
  const v = ctx.item[ctx.slot.field];
  if (!v) return null;
  const el = document.createElement("div");
  el.className = "ctpl-bar-text";
  el.textContent = String(v);
  return el;
});

defineTemplate({
  id: "gantt.my-bar",
  name: "My Bar",
  category: "Gantt",
  description: "Title + custom field.",
  slots: [
    { field: "title", renderer: "title", visibleIn: ["compact","standard","detailed"] },
    { field: "myField", renderer: "my-bar-field", visibleIn: ["standard","detailed"] },
  ],
});

const timeline = new GanttTimeline(el, { templateId: "gantt.my-bar", ... });
// or switch at runtime:
timeline.setTemplateId("gantt.my-bar");
// or go template-free:
timeline.setTemplateId("none");`}</code></pre>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 panel p-4">
              <h3 className="eyebrow mb-3">On this page</h3>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Overview</a></li>
                <li><a href="#" className="hover:text-foreground">Properties</a></li>
                <li><a href="#" className="hover:text-foreground">Methods</a></li>
                <li><a href="#" className="hover:text-foreground">Events</a></li>
                <li><a href="#" className="hover:text-foreground">Accessibility</a></li>
                <li><a href="#" className="hover:text-foreground">Content templates</a></li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
