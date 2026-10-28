"use client";

import * as React from "react";
import { KanbanSquare, Plus, Trash2, RotateCcw, LayoutTemplate, Ban, BookOpen } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  KanbanReact,
  type KanbanItem,
  type KanbanColumn,
  type KanbanMode,
  type KanbanLayout,
  type KanbanCardLayout,
  type KanbanEventPayload,
} from "./kanban-react";
import { KanbanBoard, KANBAN_TEMPLATE_NONE } from "@/lib/components/kanban";
import {
  registerBuiltinTemplates,
  templateRegistry,
  type ContentTemplate,
} from "@/lib/templates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Register the platform's built-in content templates + slot renderers at
// module load time. The KanbanBoard constructor reads the registry to lay
// out card content, so templates must be registered BEFORE the board is
// constructed. This is idempotent (the registries are Maps) and safe under
// SSR (injectStyles() is `typeof document`-guarded). Mirrors how
// `registerBuiltinCommands()` is used by other playgrounds, but called at
// module scope because templates are consumed at construction time.
registerBuiltinTemplates();

interface State {
  mode: KanbanMode;
  layout: KanbanLayout;
  cardLayout: KanbanCardLayout;
  dragEnabled: boolean;
  reorderWithinColumn: boolean;
  moveBetweenColumns: boolean;
  showCardBorder: boolean;
  showItemCount: boolean;
  showDropPreview: boolean;
  columnWidth: number;
  cardGap: number;
  columnGap: number;
  templateId: string;
}

const DEFAULTS: State = {
  mode: "editable",
  layout: "horizontal",
  cardLayout: "standard",
  dragEnabled: true,
  reorderWithinColumn: true,
  moveBetweenColumns: true,
  showCardBorder: true,
  showItemCount: true,
  showDropPreview: true,
  columnWidth: 280,
  cardGap: 8,
  columnGap: 12,
  templateId: "kanban.standard-task",
};

const SEED_COLUMNS: KanbanColumn[] = [
  { id: "todo", title: "To Do", color: "#B8B2CA", allowAddItem: true },
  { id: "in-progress", title: "In Progress", color: "#D9FF66", allowAddItem: true },
  { id: "done", title: "Done", color: "#8FE3A5", allowAddItem: true },
];

const SEED_ITEMS: KanbanItem[] = [
  {
    id: "t1",
    columnId: "todo",
    title: "Design login screen",
    description: "Sketch the new auth flow in Figma and share for review.",
    labels: ["design", "auth"],
    priority: "medium",
    assignee: "Ava Kim",
    // Bug-report template fields
    severity: "minor",
    reporter: "Ava Kim",
    // Milestone template fields
    dueDate: "2025-11-12",
    progress: 10,
  },
  {
    id: "t2",
    columnId: "todo",
    title: "Review product brief",
    description: "Read the Q3 brief and leave inline comments.",
    priority: "high",
    assignee: "Jordan Mehta",
    severity: "major",
    reporter: "Jordan Mehta",
    dueDate: "2025-11-05",
    progress: 0,
  },
  {
    id: "t3",
    columnId: "todo",
    title: "Draft Q3 roadmap",
    labels: ["planning"],
    priority: "low",
    severity: "info",
    reporter: "Ava Kim",
    dueDate: "2025-12-01",
    progress: 0,
  },
  {
    id: "t4",
    columnId: "in-progress",
    title: "Build kanban component",
    description: "Vanilla TS class, React wrapper, and full playground.",
    labels: ["component", "ui"],
    priority: "high",
    assignee: "Zai Bot",
    severity: "critical",
    reporter: "Zai Bot",
    dueDate: "2025-10-30",
    progress: 55,
  },
  {
    id: "t5",
    columnId: "in-progress",
    title: "Wire drag-and-drop events",
    description: "HTML5 DnD with drop indicator and validation.",
    priority: "medium",
    severity: "major",
    reporter: "Zai Bot",
    dueDate: "2025-11-02",
    progress: 35,
  },
  {
    id: "t6",
    columnId: "done",
    title: "Set up project repository",
    priority: "low",
    assignee: "Ava Kim",
    severity: "info",
    reporter: "Ava Kim",
    dueDate: "2025-09-15",
    progress: 100,
  },
  {
    id: "t7",
    columnId: "done",
    title: "Initialize design tokens",
    labels: ["theme"],
    priority: "medium",
    severity: "minor",
    reporter: "Ava Kim",
    dueDate: "2025-09-20",
    progress: 100,
  },
];

function countsByColumn(items: KanbanItem[], columns: KanbanColumn[]): { id: string; title: string; count: number; color?: string }[] {
  return columns.map((c) => ({
    id: c.id,
    title: c.title,
    color: c.color,
    count: items.filter((it) => it.columnId === c.id).length,
  }));
}

export function KanbanPlayground() {
  const meta = getComponent("kanban")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<KanbanItem[]>(SEED_ITEMS);
  const [columns] = React.useState<KanbanColumn[]>(SEED_COLUMNS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<KanbanBoard | null>(null);

  // All templates in the "Kanban" category power the template picker.
  // Registration happens at module load (see top of file) so the registry
  // is populated before this component renders. The empty dep array is
  // safe because the registry is a singleton Map that doesn't change shape
  // after module init.
  const kanbanTemplates: ContentTemplate[] = React.useMemo(
    () => templateRegistry.byCategory("Kanban"),
    [],
  );

  // The picker shows "None" first (native rendering, no content template),
  // then every registered Kanban template. "None" is a synthetic entry —
  // it is NOT registered in the template registry. The Kanban board
  // recognizes the sentinel ID `KANBAN_TEMPLATE_NONE` and falls back to
  // its native rendering (a bare title per card) when it is selected.
  const templateOptions: ContentTemplate[] = React.useMemo(
    () => [
      {
        id: KANBAN_TEMPLATE_NONE,
        name: "None",
        category: "Kanban",
        description:
          "Native component rendering — no content template. Cards show only their title. Demonstrates that the board is independent of the template system.",
        slots: [],
      },
      ...kanbanTemplates,
    ],
    [kanbanTemplates],
  );

  const activeTemplate = React.useMemo(
    () => templateOptions.find((t) => t.id === state.templateId) ?? templateOptions[0],
    [templateOptions, state.templateId],
  );

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  // Sync local items mirror from the board after every meaningful event so the
  // output panel reflects the source-of-truth (the board's internal state).
  const syncFromBoard = React.useCallback(() => {
    if (instanceRef.current) {
      setItems(instanceRef.current.getItems());
      setSelectedId(instanceRef.current.getSelectedItem());
    }
  }, []);

  const onItemSelected = React.useCallback((_p: KanbanEventPayload) => {
    syncFromBoard();
  }, [syncFromBoard]);

  const onItemMoved = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`moved ${p.itemId} → ${p.targetColumnId} @${p.newPosition}`);
    syncFromBoard();
  }, [syncFromBoard]);

  const onItemMoveRejected = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`rejected ${p.itemId} (${p.reason})`);
    toast.error(`Move rejected: ${p.reason}`, {
      description: `Target: ${p.targetColumnId ?? "—"} at position ${p.position ?? 0}`,
    });
  }, []);

  const onItemReordered = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`reordered ${p.itemId} @${p.newPosition}`);
    syncFromBoard();
  }, [syncFromBoard]);

  const onItemActivated = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`activated ${p.itemId}`);
    toast.info("Item activated", {
      description: `Double-click or Enter on ${p.itemId}. Host decides whether to open details.`,
    });
  }, []);

  const onItemCreateRequested = React.useCallback((p: KanbanEventPayload) => {
    if (!instanceRef.current || !p.columnId) return;
    const n = instanceRef.current.getItems().filter((it) => it.columnId === p.columnId).length + 1;
    const id = instanceRef.current.createItem(p.columnId, {
      title: `New task #${n}`,
      description: "Added from the playground.",
      priority: "medium",
    });
    if (id) {
      setLastEvent(`created ${id} in ${p.columnId}`);
      toast.success("Item created", { description: `Added to ${p.columnId} as ${id}` });
      syncFromBoard();
    }
  }, [syncFromBoard]);

  const onItemDeleteRequested = React.useCallback((p: KanbanEventPayload) => {
    if (!instanceRef.current || !p.itemId) return;
    instanceRef.current.removeItem(p.itemId);
    setLastEvent(`deleted ${p.itemId}`);
    toast.success("Item removed", { description: p.itemId });
    syncFromBoard();
  }, [syncFromBoard]);

  const onDropTargetChanged = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`drop-target → ${p.targetColumnId} @${p.targetPosition}`);
  }, []);

  const onDragStarted = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`drag-start ${p.itemId}`);
  }, []);

  const onDragCancelled = React.useCallback((p: KanbanEventPayload) => {
    setLastEvent(`drag-cancel ${p.itemId}`);
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setSelectedId(null);
    setLastEvent("reset");
    // Force the board to re-apply seed items
    setTimeout(() => {
      instanceRef.current?.setItems(SEED_ITEMS);
      instanceRef.current?.clearSelection();
    }, 0);
    toast.info("Board reset", { description: "Restored seed items and selection." });
  }, []);

  const counts = React.useMemo(() => countsByColumn(items, columns), [items, columns]);
  const selectedItem = React.useMemo(() => items.find((it) => it.id === selectedId) ?? null, [items, selectedId]);

  const jsCode = React.useMemo(() => `import { KanbanBoard } from "@workshop/kanban";
import { registerBuiltinTemplates } from "@workshop/templates";

// Register the platform's built-in content templates + slot renderers.
// Idempotent — safe to call multiple times.
registerBuiltinTemplates();

const board = new KanbanBoard(container, {
  mode: "${state.mode}",
  layout: "${state.layout}",
  cardLayout: "${state.cardLayout}",
  dragEnabled: ${state.dragEnabled},
  reorderWithinColumn: ${state.reorderWithinColumn},
  moveBetweenColumns: ${state.moveBetweenColumns},
  showCardBorder: ${state.showCardBorder},
  showItemCount: ${state.showItemCount},
  showDropPreview: ${state.showDropPreview},
  columnWidth: ${state.columnWidth},
  cardGap: ${state.cardGap},
  columnGap: ${state.columnGap},
  templateId: "${state.templateId}",
  columns: [
    { id: "todo", title: "To Do", color: "#B8B2CA" },
    { id: "in-progress", title: "In Progress", color: "#D9FF66" },
    { id: "done", title: "Done", color: "#8FE3A5" },
  ],
  items: [
    { id: "t1", columnId: "todo", title: "Design login screen", priority: "medium" },
    { id: "t2", columnId: "in-progress", title: "Build kanban", priority: "high" },
  ],
});

// Switch templates at runtime without touching the data:
// board.setTemplateId("kanban.bug-report");

board.on("item_moved", ({ itemId, sourceColumnId, targetColumnId, newPosition }) => {
  console.log(\`Moved \${itemId}: \${sourceColumnId} → \${targetColumnId} @\${newPosition}\`);
});

board.on("item_move_rejected", ({ itemId, reason }) => {
  console.warn(\`Move of \${itemId} rejected: \${reason}\`);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Productivity</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Kanban Board</h1>
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
                <KanbanSquare className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                {activeTemplate && (
                  <span className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {state.templateId === KANBAN_TEMPLATE_NONE ? (
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
                  {items.length} items · {columns.length} cols
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
              <KanbanReact
                items={items}
                columns={columns}
                mode={state.mode}
                layout={state.layout}
                cardLayout={state.cardLayout}
                dragEnabled={state.dragEnabled}
                reorderWithinColumn={state.reorderWithinColumn}
                moveBetweenColumns={state.moveBetweenColumns}
                showCardBorder={state.showCardBorder}
                showItemCount={state.showItemCount}
                showDropPreview={state.showDropPreview}
                columnWidth={state.columnWidth}
                cardGap={state.cardGap}
                columnGap={state.columnGap}
                templateId={state.templateId}
                selectable
                allowEmptyColumns
                onItemSelected={onItemSelected}
                onSelectionChanged={onItemSelected}
                onItemActivated={onItemActivated}
                onItemCreateRequested={onItemCreateRequested}
                onItemMoved={onItemMoved}
                onItemMoveRejected={onItemMoveRejected}
                onItemReordered={onItemReordered}
                onItemDeleteRequested={onItemDeleteRequested}
                onDragStarted={onDragStarted}
                onDragCancelled={onDragCancelled}
                onDropTargetChanged={onDropTargetChanged}
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
                {counts.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color ?? "#B8B2CA" }} />
                    <span className="text-muted-foreground">{c.title}:</span>
                    <span className="text-foreground">{c.count}</span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: drag cards between columns, press <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">M</kbd> on a focused card to open the Move menu, or <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Delete</kbd> to request removal.
              </p>
            </div>
          </section>

          {/* Properties + Templates + AGENT + SKILL */}
          <AgentSkillTabs
            agentPath="/docs/components/kanban-AGENT.md"
            skillPath="/docs/components/kanban-SKILL.md"
            templatesSlot={
              <>
                {/* Template picker — includes "None" (native rendering) + all registered Kanban templates */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                    <LayoutTemplate className="h-3.5 w-3.5 text-brand-lemon" />
                    Content template
                  </label>
                  <div className="rounded-md border border-border bg-muted/20 p-1">
                    <div className="flex flex-col gap-0.5">
                      {templateOptions.map((t) => {
                        const isNone = t.id === KANBAN_TEMPLATE_NONE;
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
                                The board works with zero templates registered — content templates are an opt-in layer on top.
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                    Templates live in <code className="font-mono text-brand-lemon/80">src/lib/templates/</code> and
                    are reusable across components. Switching swaps the card content layout without touching the data.
                  </p>
                </div>

                {/* How to create custom templates */}
                <div className="rounded-md border border-border bg-muted/10 p-4">
                  <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-brand-lemon" />
                    Creating custom templates
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    The board is independent of templates — it works with <code className="font-mono text-brand-lemon/80">&quot;none&quot;</code> or
                    any registered ID. Templates are declarative: an ordered list of slots, each naming a field and a renderer.
                  </p>
                  <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <li>
                      <span className="font-mono text-brand-lemon">1.</span> Register a renderer (or reuse a built-in one
                      like <code className="font-mono text-brand-lemon/80">title</code>, <code className="font-mono text-brand-lemon/80">priority-row</code>,
                      <code className="font-mono text-brand-lemon/80">label-chips</code>):
                    </li>
                  </ol>
                  <pre className="mt-1.5 overflow-x-auto rounded border border-border bg-background/60 p-2 font-mono text-[10px] text-foreground"><code>{`import { defineRenderer } from "@/lib/templates";

defineRenderer("my-prefix", (ctx) => {
  const v = ctx.item[ctx.slot.field];
  if (!v) return null;
  const el = document.createElement("div");
  el.className = "ctpl-meta-line";
  el.textContent = String(v);
  return el;
});`}</code></pre>
                  <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground" start={2}>
                    <li>
                      <span className="font-mono text-brand-lemon">2.</span> Register a template that references your
                      renderers (or the built-in ones):
                    </li>
                  </ol>
                  <pre className="mt-1.5 overflow-x-auto rounded border border-border bg-background/60 p-2 font-mono text-[10px] text-foreground"><code>{`import { defineTemplate } from "@/lib/templates";

defineTemplate({
  id: "kanban.my-card",
  name: "My Card",
  category: "Kanban",
  description: "Title + custom prefix line.",
  slots: [
    { field: "title",  renderer: "title",      visibleIn: ["compact","standard","detailed"] },
    { field: "myField", renderer: "my-prefix", visibleIn: ["standard","detailed"], props: { prefix: "MY" } },
  ],
});`}</code></pre>
                  <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground" start={3}>
                    <li>
                      <span className="font-mono text-brand-lemon">3.</span> Switch the board to your template:
                    </li>
                  </ol>
                  <pre className="mt-1.5 overflow-x-auto rounded border border-border bg-background/60 p-2 font-mono text-[10px] text-foreground"><code>{`board.setTemplateId("kanban.my-card");
// or at construction:
new KanbanBoard(el, { templateId: "kanban.my-card", ... });`}</code></pre>
                  <p className="mt-2 text-[10px] leading-snug text-muted-foreground/80">
                    The renderer contract is <code className="font-mono text-brand-lemon/80">{"(ctx: { item, slot, density, host }) => HTMLElement | null"}</code>.
                    Return <code className="font-mono text-brand-lemon/80">null</code> to skip the slot. See the
                    SKILL tab for the full renderer registry API.
                  </p>
                </div>
              </>
            }
          >
            {/* Mode */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Mode</label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["editable", "read_only"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => update("mode", m)} aria-pressed={state.mode === m}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                      state.mode === m ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {m === "editable" ? "Editable" : "Read-only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Layout</label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["horizontal", "vertical"] as const).map((l) => (
                  <button key={l} type="button" onClick={() => update("layout", l)} aria-pressed={state.layout === l}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                      state.layout === l ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {l === "horizontal" ? "Horizontal" : "Vertical"}
                  </button>
                ))}
              </div>
            </div>

            {/* Card layout */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Card layout</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["compact", "standard", "detailed"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => update("cardLayout", c)} aria-pressed={state.cardLayout === c}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.cardLayout === c ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "dragEnabled" as const, l: "Drag enabled" },
                { k: "reorderWithinColumn" as const, l: "Reorder within column" },
                { k: "moveBetweenColumns" as const, l: "Move between columns" },
                { k: "showCardBorder" as const, l: "Show card border" },
                { k: "showItemCount" as const, l: "Show item count" },
                { k: "showDropPreview" as const, l: "Show drop preview" },
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
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Column width: <span className="font-mono text-brand-lemon">{state.columnWidth}px</span></label>
              <input type="range" min={220} max={400} step={10} value={state.columnWidth} onChange={(e) => update("columnWidth", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.columnWidth - 220) / 180 * 100}%, var(--muted) ${(state.columnWidth - 220) / 180 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>220</span><span>400</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Card gap: <span className="font-mono text-brand-lemon">{state.cardGap}px</span></label>
              <input type="range" min={2} max={20} step={1} value={state.cardGap} onChange={(e) => update("cardGap", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.cardGap - 2) / 18 * 100}%, var(--muted) ${(state.cardGap - 2) / 18 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>2</span><span>20</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Column gap: <span className="font-mono text-brand-lemon">{state.columnGap}px</span></label>
              <input type="range" min={4} max={32} step={1} value={state.columnGap} onChange={(e) => update("columnGap", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.columnGap - 4) / 28 * 100}%, var(--muted) ${(state.columnGap - 4) / 28 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>4</span><span>32</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  const id = `t-${Math.random().toString(36).slice(2, 7)}`;
                  instanceRef.current?.createItem("todo", { id, title: "Quick task", priority: "low" });
                  syncFromBoard();
                  toast.success("Added", { description: id });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-brand-lemon" /> Add to To Do
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedId) {
                    toast.error("No selection", { description: "Select a card first." });
                    return;
                  }
                  instanceRef.current?.removeItem(selectedId);
                  syncFromBoard();
                  toast.success("Removed", { description: selectedId });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-accent"
              >
                <Trash2 className="h-3 w-3 text-destructive" /> Remove selected
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
            {activeTab === "html" && <CodeBlock code={'<div id="kanban" style="height: 600px;"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".kanban-board {\n  /* Override tokens to retheme the board */\n  --kb-accent: #D9FF66;\n  --kb-surface: #211A30;\n  --kb-border: #383343;\n  --kb-text: #F4F1FF;\n  --kb-muted: #B8B2CA;\n}\n\n/* Compact density for side panels */\n.kanban-board.kanban-card-compact .kanban-card {\n  padding: 4px 8px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class KanbanBoard {\n  constructor(container, options)\n  setItems(items): void\n  setColumns(columns): void\n  selectItem(itemId | null, source?): void\n  clearSelection(): void\n  getSelectedItem(): string | null\n  moveItem(itemId, targetColumnId, position, source?): void\n  reorderItem(itemId, position, source?): void\n  createItem(columnId, partial): string\n  updateItem(itemId, changes): void\n  removeItem(itemId): void\n  collapseColumn(columnId): void\n  expandColumn(columnId): void\n  getItems(): KanbanItem[]\n  getColumns(): KanbanColumn[]\n\n  // Content templates (see src/lib/templates/)\n  getTemplate(): ContentTemplate | undefined\n  getTemplateId(): string\n  setTemplateId(id): void\n\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   item_selected, selection_changed, item_activated,\n//   item_create_requested, item_edit_requested,\n//   item_moved, item_move_rejected, item_reordered,\n//   item_delete_requested, drag_started, drag_cancelled,\n//   drop_target_changed, column_selected, column_create_requested\n\n// Content templates are registered in a singleton registry:\n//   import { registerBuiltinTemplates, templateRegistry } from \"@/lib/templates\";\n//   registerBuiltinTemplates();\n//   templateRegistry.byCategory(\"Kanban\");\n//   // → [{ id: \"kanban.standard-task\", ... }, { id: \"kanban.minimal\", ... }, ...]"} language="typescript" filename="api.ts" />}
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
                <ul className="mt-3 space-y-2">
                  {meta.methods.slice(0, 12).map((m) => (
                    <li key={m.signature} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{m.signature}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{m.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Events</h2>
                <ul className="mt-3 space-y-2">
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Cards are real DOM elements with <code className="font-mono text-brand-lemon">tabindex=&quot;0&quot;</code> and <code className="font-mono text-brand-lemon">role=&quot;button&quot;</code>.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Visible focus ring (lemon) on every card and column control.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Space</kbd> selects, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Enter</kbd> activates, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">M</kbd> opens the Move menu.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow keys reorder (Up/Down) and move between columns (Left/Right).</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Drop indicator and column highlighting use color + outline, never color alone.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><code className="font-mono text-brand-lemon">prefers-reduced-motion</code> disables the drop-indicator pulse.</li>
              </ul>
            </div>

            <div className="panel p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <LayoutTemplate className="h-4 w-4 text-brand-lemon" />
                Content templates
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Card content is laid out by a registered content template (see <code className="font-mono text-brand-lemon">src/lib/templates/</code>).
                The board is independent of templates — pass <code className="font-mono text-brand-lemon">&quot;none&quot;</code> as
                the <code className="font-mono text-brand-lemon">templateId</code> to render cards with their native
                content (a bare title). Templates are an opt-in layer; the board works with zero templates registered.
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
                      <td className="py-2 text-muted-foreground">— (native rendering: title only)</td>
                    </tr>
                    {kanbanTemplates.map((t) => (
                      <tr key={t.id} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{t.id}</td>
                        <td className="py-2 pr-4 font-medium text-foreground">{t.name}</td>
                        <td className="py-2 text-muted-foreground">
                          {t.slots.map((s) => s.field).join(" → ")}
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
                  <span>Register a slot renderer (a pure function from <code className="font-mono text-brand-lemon">{ "{ item, slot, density, host }" }</code> to <code className="font-mono text-brand-lemon">HTMLElement | null</code>), or reuse one of the 12 built-in renderers (<code className="font-mono text-brand-lemon">title</code>, <code className="font-mono text-brand-lemon">priority-row</code>, <code className="font-mono text-brand-lemon">label-chips</code>, etc.).</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lemon/10 font-mono text-[10px] font-semibold text-brand-lemon">2</span>
                  <span>Register a template that references your renderers by name, with per-slot <code className="font-mono text-brand-lemon">visibleIn</code> density filters and optional <code className="font-mono text-brand-lemon">props</code>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lemon/10 font-mono text-[10px] font-semibold text-brand-lemon">3</span>
                  <span>Pass the template ID to the board (<code className="font-mono text-brand-lemon">{ "templateId" }</code> option or <code className="font-mono text-brand-lemon">setTemplateId()</code>). Switch at any time — the data is untouched.</span>
                </li>
              </ol>
              <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] text-foreground"><code>{`import { defineRenderer, defineTemplate } from "@/lib/templates";

// 1. Optional: register a custom renderer (or reuse a built-in one).
defineRenderer("my-prefix", (ctx) => {
  const v = ctx.item[ctx.slot.field];
  if (!v) return null;
  const el = document.createElement("div");
  el.className = "ctpl-meta-line";
  el.textContent = String(v);
  return el;
});

// 2. Register a template that references renderers by name.
defineTemplate({
  id: "kanban.my-card",
  name: "My Card",
  category: "Kanban",
  description: "Title + custom prefix line.",
  slots: [
    { field: "title",   renderer: "title",      visibleIn: ["compact", "standard", "detailed"] },
    { field: "myField", renderer: "my-prefix",  visibleIn: ["standard", "detailed"], props: { prefix: "MY" } },
  ],
});

// 3. Use it — the board looks up the template by ID at render time.
const board = new KanbanBoard(el, { templateId: "kanban.my-card", ... });
// or switch at runtime:
board.setTemplateId("kanban.my-card");
// or go template-free:
board.setTemplateId("none");`}</code></pre>
              <p className="mt-3 text-[12px] text-muted-foreground">
                See the Templates tab (right) for the live picker, or the SKILL tab for the full
                renderer registry API and the complete list of built-in renderers.
              </p>
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
