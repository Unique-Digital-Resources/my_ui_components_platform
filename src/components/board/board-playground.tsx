"use client";

import * as React from "react";
import {
  Circle,
  Square,
  Triangle,
  Trash2,
  Maximize2,
  Scan,
  AlignStartVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  RotateCcw,
  Keyboard,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { BoardReact, type BoardItem, type BoardView, type GridMode, type TransformMode, type LatticeDisplay, type PivotPosition } from "@/components/board/board-react";
import type { AlignType, DistributeType, ShapeType } from "@/lib/components/board";
import {
  registerBuiltinCommands,
  commandRegistry,
  ShortcutHandler,
  formatShortcut,
} from "@/lib/commands";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---- Constants ----------------------------------------------------------

/** Shape color palette — none are indigo/blue. */
const SHAPE_COLORS = ["#D9FF66", "#B9A0FF", "#FF858B", "#8FE3A5", "#FFD36B"];
const DEFAULT_SHAPE_SIZE = 90;

interface PlaygroundState {
  gridMode: GridMode;
  gridSize: number;
  subGridDivisions: number;
  snapToGrid: boolean;
  snapToItems: boolean;
  transformMode: TransformMode;
  latticeDisplay: LatticeDisplay;
  selectionPivot: PivotPosition;
}

const DEFAULTS: PlaygroundState = {
  gridMode: "dots",
  gridSize: 40,
  subGridDivisions: 4,
  snapToGrid: false,
  snapToItems: false,
  transformMode: "global",
  latticeDisplay: "local",
  selectionPivot: "center",
};

/** The Board command IDs that the playground wires up. */
const BOARD_COMMAND_IDS = [
  "board.align-left",
  "board.align-center-h",
  "board.align-right",
  "board.align-top",
  "board.align-center-v",
  "board.align-bottom",
  "board.distribute-h",
  "board.distribute-v",
  "board.fit-all",
  "board.fit-selection",
  "board.add-circle",
  "board.add-rect",
  "board.add-triangle",
  "board.delete-selected",
] as const;

const ALIGN_BUTTONS: { type: AlignType; label: string; icon: typeof AlignStartVertical; cmdId: string }[] = [
  { type: "left", label: "Align Left", icon: AlignStartVertical, cmdId: "board.align-left" },
  { type: "center-h", label: "Align Center Horizontal", icon: AlignCenterHorizontal, cmdId: "board.align-center-h" },
  { type: "right", label: "Align Right", icon: AlignEndVertical, cmdId: "board.align-right" },
  { type: "top", label: "Align Top", icon: AlignStartHorizontal, cmdId: "board.align-top" },
  { type: "center-v", label: "Align Middle Vertical", icon: AlignCenterVertical, cmdId: "board.align-center-v" },
  { type: "bottom", label: "Align Bottom", icon: AlignEndHorizontal, cmdId: "board.align-bottom" },
];

const DISTRIBUTE_BUTTONS: { type: DistributeType; label: string; icon: typeof AlignHorizontalDistributeCenter; cmdId: string }[] = [
  { type: "horizontal", label: "Distribute Horizontally", icon: AlignHorizontalDistributeCenter, cmdId: "board.distribute-h" },
  { type: "vertical", label: "Distribute Vertically", icon: AlignVerticalDistributeCenter, cmdId: "board.distribute-v" },
];

const GRID_MODE_OPTIONS: { value: GridMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "lines", label: "Lines" },
];

const LATTICE_DISPLAY_OPTIONS: { value: LatticeDisplay; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "global", label: "Global" },
  { value: "both", label: "Both" },
];

const TRANSFORM_MODE_OPTIONS: { value: TransformMode; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "local", label: "Local" },
];

const PIVOT_POSITIONS: { value: PivotPosition; row: number; col: number; label: string }[] = [
  { value: "top-left", row: 0, col: 0, label: "Top-left" },
  { value: "top-center", row: 0, col: 1, label: "Top-center" },
  { value: "top-right", row: 0, col: 2, label: "Top-right" },
  { value: "middle-left", row: 1, col: 0, label: "Middle-left" },
  { value: "center", row: 1, col: 1, label: "Center" },
  { value: "middle-right", row: 1, col: 2, label: "Middle-right" },
  { value: "bottom-left", row: 2, col: 0, label: "Bottom-left" },
  { value: "bottom-center", row: 2, col: 1, label: "Bottom-center" },
  { value: "bottom-right", row: 2, col: 2, label: "Bottom-right" },
];

// ---- Playground ---------------------------------------------------------

export function BoardPlayground() {
  const meta = getComponent("board")!;
  const [state, setState] = React.useState<PlaygroundState>(DEFAULTS);
  const [items, setItems] = React.useState<BoardItem[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [view, setView] = React.useState<BoardView>({ panX: 0, panY: 0, zoom: 1 });
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const [registryVersion, setRegistryVersion] = React.useState(0);
  const [rotationValue, setRotationValue] = React.useState(0);

  const boardRef = React.useRef<import("@/lib/components/board").Board | null>(null);
  const liveAreaRef = React.useRef<HTMLDivElement>(null);
  const handlerRef = React.useRef<ShortcutHandler | null>(null);

  // Register the built-in commands on mount.
  React.useEffect(() => {
    registerBuiltinCommands();
    setRegistryVersion((v) => v + 1);
  }, []);

  // Seed a few starter items once the board is created so the canvas isn't empty.
  React.useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    // Only seed if there are no items yet.
    if (board.getItems().length > 0) return;
    board.addItem("rect", -120, -40, 120, 90, 0, "#D9FF66");
    board.addItem("circle", 60, -60, 100, 100, 0, "#B9A0FF");
    board.addItem("triangle", -40, 80, 110, 100, 0, "#FF858B");
    setItems(board.getItems());
    // Intentionally empty deps — runs once after the board mounts.
  }, []);

  // ---- Action handlers ----
  //
  // All actions read from refs (boardRef, liveAreaRef) and call stable
  // setState setters, so their behavior is independent of render scope.
  // We store the latest versions in an actionsRef (updated via a render-
  // scoped effect to satisfy the React Compiler's "no ref writes during
  // render" rule) so the ShortcutHandler — created once on mount — always
  // dispatches to the freshest implementation.

  const actionsRef = React.useRef<{
    addShape: (type: ShapeType) => void;
    deleteSelected: () => void;
    fitAll: () => void;
    fitSelection: () => void;
    align: (type: AlignType) => void;
    distribute: (type: DistributeType) => void;
  }>({
    addShape: () => {},
    deleteSelected: () => {},
    fitAll: () => {},
    fitSelection: () => {},
    align: () => {},
    distribute: () => {},
  });

  const addShape = (type: ShapeType) => actionsRef.current.addShape(type);
  const deleteSelected = () => actionsRef.current.deleteSelected();
  const fitAll = () => actionsRef.current.fitAll();
  const fitSelection = () => actionsRef.current.fitSelection();
  const align = (type: AlignType) => actionsRef.current.align(type);
  const distribute = (type: DistributeType) => actionsRef.current.distribute(type);

  // Keep the actions ref fresh after every render.
  React.useEffect(() => {
    actionsRef.current.addShape = (type: ShapeType) => {
      const board = boardRef.current;
      const liveArea = liveAreaRef.current;
      if (!board) return;
      let cx = 0;
      let cy = 0;
      if (liveArea) {
        const v = board.getView();
        const w = liveArea.clientWidth;
        const h = liveArea.clientHeight;
        cx = (w / 2 - v.panX) / v.zoom;
        cy = (h / 2 - v.panY) / v.zoom;
      }
      // Random offset near the center.
      const offX = (Math.random() - 0.5) * 140;
      const offY = (Math.random() - 0.5) * 140;
      const color = SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)];
      const id = board.addItem(type, cx + offX, cy + offY, DEFAULT_SHAPE_SIZE, DEFAULT_SHAPE_SIZE, 0, color);
      board.selectItem(id, false);
      setItems(board.getItems());
      setSelectedIds(board.getSelectedIds());
    };
    actionsRef.current.deleteSelected = () => {
      const board = boardRef.current;
      if (!board) return;
      const ids = board.getSelectedIds();
      if (ids.length === 0) return;
      for (const id of ids) board.removeItem(id);
      setItems(board.getItems());
      setSelectedIds(board.getSelectedIds());
    };
    actionsRef.current.fitAll = () => {
      boardRef.current?.zoomToFit();
    };
    actionsRef.current.fitSelection = () => {
      boardRef.current?.zoomToFitSelection();
    };
    actionsRef.current.align = (type: AlignType) => {
      const board = boardRef.current;
      if (!board) return;
      if (board.getSelectedIds().length < 2) {
        toast.message("Select 2+ items to align");
        return;
      }
      board.align(type);
      setItems(board.getItems());
    };
    actionsRef.current.distribute = (type: DistributeType) => {
      const board = boardRef.current;
      if (!board) return;
      if (board.getSelectedIds().length < 3) {
        toast.message("Select 3+ items to distribute");
        return;
      }
      board.distribute(type);
      setItems(board.getItems());
    };
  });

  // ---- Shortcut handler (scoped to board command IDs) ----

  React.useEffect(() => {
    const handler = new ShortcutHandler([...BOARD_COMMAND_IDS]);
    handler.on("board.add-circle", () => actionsRef.current.addShape("circle"));
    handler.on("board.add-rect", () => actionsRef.current.addShape("rect"));
    handler.on("board.add-triangle", () => actionsRef.current.addShape("triangle"));
    handler.on("board.delete-selected", () => actionsRef.current.deleteSelected());
    handler.on("board.fit-all", () => actionsRef.current.fitAll());
    handler.on("board.fit-selection", () => actionsRef.current.fitSelection());
    handler.on("board.align-left", () => actionsRef.current.align("left"));
    handler.on("board.align-center-h", () => actionsRef.current.align("center-h"));
    handler.on("board.align-right", () => actionsRef.current.align("right"));
    handler.on("board.align-top", () => actionsRef.current.align("top"));
    handler.on("board.align-center-v", () => actionsRef.current.align("center-v"));
    handler.on("board.align-bottom", () => actionsRef.current.align("bottom"));
    handler.on("board.distribute-h", () => actionsRef.current.distribute("horizontal"));
    handler.on("board.distribute-v", () => actionsRef.current.distribute("vertical"));
    handler.attach();
    handlerRef.current = handler;
    return () => {
      handler.destroy();
      handlerRef.current = null;
    };
    // Intentionally empty deps — the handler reads through actionsRef so
    // it always dispatches to the latest implementation without re-attaching.
  }, []);

  // ---- State updaters ----

  const update = React.useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  // Sync the rotation input with the first selected item's rotation whenever the selection changes.
  React.useEffect(() => {
    if (selectedIds.length === 0) return;
    const board = boardRef.current;
    if (!board) return;
    const first = board.getItems().find((i) => i.id === selectedIds[0]);
    if (first) setRotationValue(first.rotation);
  }, [selectedIds]);

  // Apply a rotation delta to all selected items and update the rotation input.
  const applyRotation = (newRotation: number) => {
    const board = boardRef.current;
    if (!board || selectedIds.length === 0) return;
    const first = board.getItems().find((i) => i.id === selectedIds[0]);
    if (!first) return;
    const delta = newRotation - first.rotation;
    if (Math.abs(delta) < 0.01) return;
    board.rotateSelected(delta);
    setRotationValue(newRotation);
    setItems(board.getItems());
  };

  const reset = () => {
    setState(DEFAULTS);
    const board = boardRef.current;
    if (board) {
      // Remove all items, then re-seed.
      for (const it of board.getItems()) board.removeItem(it.id);
      board.addItem("rect", -120, -40, 120, 90, 0, "#D9FF66");
      board.addItem("circle", 60, -60, 100, 100, 0, "#B9A0FF");
      board.addItem("triangle", -40, 80, 110, 100, 0, "#FF858B");
      board.clearSelection();
      board.setView(0, 0, 1);
      setItems(board.getItems());
      setSelectedIds([]);
      setView(board.getView());
      setRotationValue(0);
    }
    toast.success("Reset to defaults");
  };

  // ---- Code generation ----

  const jsCode = React.useMemo(() => generateJsCode(state), [state]);
  const htmlCode = React.useMemo(() => generateHtmlCode(), []);
  const cssCode = React.useMemo(() => generateCssCode(), []);
  const apiCode = React.useMemo(() => generateApiCode(), []);

  const boardCommands = React.useMemo(
    () => commandRegistry.byIds([...BOARD_COMMAND_IDS]),
    [registryVersion],
  );

  // ---- Render ----

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
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
          {/* Live canvas panel */}
          <section aria-label="Board live canvas" className="panel relative flex h-[600px] flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col gap-2 border-b border-border px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <ToolbarButton onClick={() => addShape("circle")} title="Add Circle (1)" variant="primary">
                  <Circle className="h-3.5 w-3.5" />
                  <span>Circle</span>
                </ToolbarButton>
                <ToolbarButton onClick={() => addShape("rect")} title="Add Rectangle (2)" variant="primary">
                  <Square className="h-3.5 w-3.5" />
                  <span>Rect</span>
                </ToolbarButton>
                <ToolbarButton onClick={() => addShape("triangle")} title="Add Triangle (3)" variant="primary">
                  <Triangle className="h-3.5 w-3.5" />
                  <span>Triangle</span>
                </ToolbarButton>
                <ToolbarDivider />
                <ToolbarButton onClick={deleteSelected} title="Delete Selected (Delete)" variant="danger">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </ToolbarButton>
                <ToolbarDivider />
                <ToolbarButton onClick={fitAll} title="Zoom to Fit All (Cmd+0)">
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit All</span>
                </ToolbarButton>
                <ToolbarButton onClick={fitSelection} title="Zoom to Fit Selection (Shift+Cmd+0)">
                  <Scan className="h-3.5 w-3.5" />
                  <span>Fit Selection</span>
                </ToolbarButton>
                <div className="ml-auto flex items-center gap-1">
                  <ToolbarButton onClick={reset} title="Reset to defaults">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </ToolbarButton>
                </div>
              </div>
              {/* Align + Distribute row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="eyebrow mr-1">Align</span>
                {ALIGN_BUTTONS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <IconButton
                      key={b.type}
                      onClick={() => align(b.type)}
                      title={`${b.label} (${formatShortcut(commandRegistry.get(b.cmdId)?.shortcut ?? { keys: "" })})`}
                      aria-label={b.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </IconButton>
                  );
                })}
                <ToolbarDivider />
                <span className="eyebrow mr-1">Distribute</span>
                {DISTRIBUTE_BUTTONS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <IconButton
                      key={b.type}
                      onClick={() => distribute(b.type)}
                      title={`${b.label} (${formatShortcut(commandRegistry.get(b.cmdId)?.shortcut ?? { keys: "" })})`}
                      aria-label={b.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </IconButton>
                  );
                })}
              </div>
            </div>

            {/* Live Board canvas — expands to fill the remaining panel space */}
            <div ref={liveAreaRef} className="relative flex-1 w-full">
              <BoardReact
                className="absolute inset-0"
                gridMode={state.gridMode}
                gridSize={state.gridSize}
                subGridDivisions={state.subGridDivisions}
                snapToGrid={state.snapToGrid}
                snapToItems={state.snapToItems}
                transformMode={state.transformMode}
                latticeDisplay={state.latticeDisplay}
                selectionPivot={state.selectionPivot}
                onSelection={(e) => setSelectedIds(e.ids)}
                onChange={() => setItems(boardRef.current?.getItems() ?? [])}
                onView={(v) => setView(v)}
                instanceRef={boardRef}
              />
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1 text-[10px] text-muted-foreground backdrop-blur">
                Click to select. Shift-click for multi. Drag empty space for rubber-band. Space-drag to pan. Cmd+scroll to zoom. Drag the lemon rotation handle above the selection to rotate; drag a white square handle to resize.
              </div>
            </div>

            {/* Output — item list */}
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Output — items</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {items.length} item{items.length === 1 ? "" : "s"} · {selectedIds.length} selected
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/70">
                  No items on the board. Click <span className="text-brand-lemon">Circle</span>,{" "}
                  <span className="text-brand-lemon">Rect</span>, or{" "}
                  <span className="text-brand-lemon">Triangle</span> above, or press 1 / 2 / 3.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-left text-[12px]">
                    <thead className="sticky top-0 bg-muted/40 backdrop-blur">
                      <tr>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">id</th>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">type</th>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">x, y</th>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">w × h</th>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">rot</th>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">pivot</th>
                        <th className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">color</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => {
                        const isSel = selectedIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              "transition-colors",
                              isSel ? "bg-brand-lemon/10" : "hover:bg-muted/20",
                            )}
                          >
                            <td className="px-2.5 py-1.5 font-mono text-brand-lemon">{item.id}</td>
                            <td className="px-2.5 py-1.5 text-foreground">{item.type}</td>
                            <td className="px-2.5 py-1.5 font-mono text-muted-foreground">
                              {Math.round(item.x)}, {Math.round(item.y)}
                            </td>
                            <td className="px-2.5 py-1.5 font-mono text-muted-foreground">
                              {Math.round(item.width)} × {Math.round(item.height)}
                            </td>
                            <td className="px-2.5 py-1.5 font-mono text-muted-foreground">
                              {Math.round(item.rotation)}°
                            </td>
                            <td className="px-2.5 py-1.5 font-mono text-muted-foreground">
                              {item.pivotX.toFixed(2)},{item.pivotY.toFixed(2)}
                            </td>
                            <td className="px-2.5 py-1.5">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="inline-block h-3 w-3 rounded-sm border border-border"
                                  style={{ background: item.color }}
                                  aria-hidden="true"
                                />
                                <span className="font-mono text-[10px] text-muted-foreground">{item.color}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Property inspector */}
          <AgentSkillTabs
            agentPath="/docs/components/board-AGENT.md"
            skillPath="/docs/components/board-SKILL.md"
          >
              {/* Grid mode segmented control */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">Grid mode</label>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                  {GRID_MODE_OPTIONS.map((o) => {
                    const active = state.gridMode === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => update("gridMode", o.value)}
                        aria-pressed={active}
                        className={cn(
                          "rounded px-1 py-1.5 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid size slider */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[12px] font-medium text-foreground">Grid size</label>
                  <span className="font-mono text-[11px] text-muted-foreground">{state.gridSize}px</span>
                </div>
                <Slider
                  value={[state.gridSize]}
                  min={10}
                  max={100}
                  step={2}
                  onValueChange={(v) => update("gridSize", v[0] ?? state.gridSize)}
                />
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Base grid size in board units. Sub-cells are placed every gridSize / subGridDivisions units.
                </p>
              </div>

              {/* Sub-grid divisions slider */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[12px] font-medium text-foreground">Sub-grid divisions</label>
                  <span className="font-mono text-[11px] text-muted-foreground">{state.subGridDivisions}</span>
                </div>
                <Slider
                  value={[state.subGridDivisions]}
                  min={1}
                  max={8}
                  step={1}
                  onValueChange={(v) => update("subGridDivisions", v[0] ?? state.subGridDivisions)}
                />
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Number of sub-cells per main grid cell.
                </p>
              </div>

              {/* Snap toggles */}
              <div className="space-y-3">
                <ToggleRow
                  label="Snap to grid"
                  description="Dragged items snap to the nearest grid intersection."
                  checked={state.snapToGrid}
                  onCheckedChange={(v) => update("snapToGrid", v)}
                />
                <ToggleRow
                  label="Snap to items"
                  description="Dragged items snap to other items' edges and centers (within 8px)."
                  checked={state.snapToItems}
                  onCheckedChange={(v) => update("snapToItems", v)}
                />
              </div>

              <div className="h-px bg-border" />

              {/* Transform section */}
              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Transform
                </h3>

                {/* Lattice display: 3-way toggle */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Lattice display</label>
                  <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                    {LATTICE_DISPLAY_OPTIONS.map((o) => {
                      const active = state.latticeDisplay === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => update("latticeDisplay", o.value)}
                          aria-pressed={active}
                          className={cn(
                            "rounded px-1 py-1.5 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "bg-brand-purple-strong text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Local shows the rotated bounding box with handles. Global shows only the AABB.
                  </p>
                </div>

                {/* Transform mode: 2-way toggle */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Transform mode</label>
                  <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                    {TRANSFORM_MODE_OPTIONS.map((o) => {
                      const active = state.transformMode === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => update("transformMode", o.value)}
                          aria-pressed={active}
                          className={cn(
                            "rounded px-1 py-1.5 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "bg-brand-purple-strong text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Global transforms the selection as a whole from the selection pivot. Local transforms each item from its own pivot.
                  </p>
                </div>

                {/* Selection pivot: 3x3 grid */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                    Selection pivot {state.transformMode === "local" && <span className="text-muted-foreground/60">(global mode only)</span>}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {PIVOT_POSITIONS.map((p) => {
                      const active = state.selectionPivot === p.value;
                      const disabled = state.transformMode === "local";
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => update("selectionPivot", p.value)}
                          disabled={disabled}
                          title={p.label}
                          aria-label={p.label}
                          aria-pressed={active}
                          className={cn(
                            "flex h-8 items-center justify-center rounded border text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "border-brand-lemon/60 bg-brand-lemon/20 text-brand-lemon"
                              : "border-border bg-muted/20 text-muted-foreground hover:border-brand-lemon/40 hover:text-foreground",
                            disabled && "cursor-not-allowed opacity-40 hover:border-border hover:text-muted-foreground",
                          )}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: active ? "currentColor" : "rgba(255,255,255,0.25)" }} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    The point of the selection bounding box used as the pivot for global transforms.
                  </p>
                </div>

                {/* Rotation: slider + numeric input */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[12px] font-medium text-foreground">
                      Rotation {selectedIds.length === 0 && <span className="text-muted-foreground/60">(no selection)</span>}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={Math.round(rotationValue)}
                        min={-360}
                        max={360}
                        step={1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v)) applyRotation(v);
                        }}
                        disabled={selectedIds.length === 0}
                        className="h-7 w-16 rounded border border-border bg-muted/30 px-1.5 text-right font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      />
                      <span className="font-mono text-[11px] text-muted-foreground">deg</span>
                    </div>
                  </div>
                  <Slider
                    value={[rotationValue]}
                    min={-180}
                    max={180}
                    step={1}
                    onValueChange={(v) => applyRotation(v[0] ?? rotationValue)}
                    disabled={selectedIds.length === 0}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Sets the rotation of the first selected item; all selected items rotate by the same delta. Drag the lemon handle above the selection to rotate interactively.
                  </p>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Selection info */}
              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Selection
                </h3>
                <div className="rounded-md border border-border bg-muted/10 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-muted-foreground">Selected items</span>
                    <span className="font-mono text-2xl font-semibold text-brand-lemon">
                      {selectedIds.length}
                    </span>
                  </div>
                  {selectedIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedIds.map((id) => (
                        <CopyableValue key={id} value={id} className="h-7 px-2 text-[11px]" />
                      ))}
                    </div>
                  )}
                  {selectedIds.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-border pt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Selection pivot</span>
                        <span className="font-mono text-brand-lemon">{state.selectionPivot}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Transform mode</span>
                        <span className="font-mono text-foreground">{state.transformMode}</span>
                      </div>
                      {(() => {
                        const first = items.find((i) => i.id === selectedIds[0]);
                        if (!first) return null;
                        return (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Item pivot (first)</span>
                            <span className="font-mono text-muted-foreground">
                              ({first.pivotX.toFixed(2)}, {first.pivotY.toFixed(2)})
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* View info */}
              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  View
                </h3>
                <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/10 p-3 text-center">
                  <ViewStat label="zoom" value={view.zoom.toFixed(2) + "×"} />
                  <ViewStat label="panX" value={Math.round(view.panX).toString()} />
                  <ViewStat label="panY" value={Math.round(view.panY).toString()} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Updates live as you pan (space-drag) and zoom (Cmd+scroll).
                </p>
              </div>

              {/* Keyboard shortcuts help */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Keyboard className="h-3.5 w-3.5" />
                  Shortcuts
                </h3>
                <ul className="space-y-1 rounded-md border border-border bg-muted/10 p-2">
                  {boardCommands.map((cmd) => (
                    <li
                      key={cmd.id}
                      className="flex items-center justify-between gap-2 px-1 py-0.5 text-[11px]"
                    >
                      <span className="text-muted-foreground">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="inline-flex items-center gap-0.5 rounded border border-brand-lemon/30 bg-brand-lemon/10 px-1 py-0.5 font-mono text-[10px] text-brand-lemon">
                          {formatShortcut(cmd.shortcut)}
                        </kbd>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
          </AgentSkillTabs>
        </div>

        {/* Code panel */}
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript", "JavaScript"], ["html", "HTML"], ["css", "CSS"], ["api", "API"]] as const).map(([key, label]) => (
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

// ---- Sub-components -----------------------------------------------------

function ToolbarButton({
  children,
  onClick,
  title,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  variant?: "default" | "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "primary" &&
          "border-brand-lemon/40 bg-brand-lemon/10 text-brand-lemon hover:bg-brand-lemon/20",
        variant === "danger" &&
          "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        variant === "default" &&
          "border-border bg-card text-foreground hover:border-brand-lemon/40 hover:text-brand-lemon",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-brand-lemon/40 hover:text-brand-lemon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />;
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function ViewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className="font-mono text-[13px] text-foreground">{value}</span>
    </div>
  );
}

// ---- Documentation ------------------------------------------------------

function ComponentDocumentation() {
  const meta = getComponent("board")!;
  const boardCommands = commandRegistry.byIds([...BOARD_COMMAND_IDS]);

  return (
    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-[760px]">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Board is a framework-independent vanilla JavaScript component — no React or Next.js required.
          It renders an infinite canvas with pan/zoom, a configurable grid, multi-select, and alignment
          commands.
        </p>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {meta.longDescription} The Board renders to a single <code className="font-mono text-brand-lemon">&lt;canvas&gt;</code>{" "}
            element inside the container you pass to the constructor. Pan via space-drag, middle-click, or
            two-finger scroll; zoom toward the cursor via Ctrl/Cmd + wheel. Click to select an item,
            shift-click for additive selection, drag empty space for rubber-band selection, and drag an item
            to move it (with optional snapping to grid lines or to other items&apos; edges and centers).
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
          <h3 className="text-lg font-semibold">Keyboard shortcuts</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The playground wires a <code className="font-mono text-brand-lemon">ShortcutHandler</code> scoped
            to the Board command IDs. These shortcuts are registered with the shared command registry via{" "}
            <code className="font-mono text-brand-lemon">registerBuiltinCommands()</code> and fire the
            corresponding Board method.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Command</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Shortcut</th>
                  <th className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {boardCommands.map((cmd) => (
                  <tr key={cmd.id}>
                    <td className="px-3 py-2 font-mono text-brand-lemon">{cmd.id}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {cmd.shortcut ? formatShortcut(cmd.shortcut) : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{cmd.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Note: the Board also handles Delete / Backspace, Escape, and Arrow keys internally when the canvas
            has focus. The shortcuts above are global (window-level) and fire even when the canvas is not
            focused.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Local vs global lattices</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Each item has two lattices. The <strong className="text-foreground">local lattice</strong> is the
            item&apos;s bounding box rotated with the item — for an unrotated rectangle, it&apos;s just the
            rect. The <strong className="text-foreground">global lattice</strong> is the axis-aligned bounding
            box (AABB) of the rotated rect, which for a rotated item is larger than the local lattice.
            Alignment and distribution commands operate on the global lattices so the visual edges line up
            regardless of rotation. Use <code className="font-mono text-brand-lemon">latticeDisplay</code> to
            control which lattices are drawn: <code className="font-mono text-brand-lemon">&quot;local&quot;</code>{" "}
            (default, rotated box with handles), <code className="font-mono text-brand-lemon">&quot;global&quot;</code>{" "}
            (AABB only), or <code className="font-mono text-brand-lemon">&quot;both&quot;</code>.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Transform: pivots, rotation, and resize</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Each item carries a <code className="font-mono text-brand-lemon">pivotX</code> /{" "}
            <code className="font-mono text-brand-lemon">pivotY</code> pair (0–1, relative to its bounding box).
            The pivot is the point that stays fixed during resize and the center of rotation for local
            transforms. In <strong className="text-foreground">global</strong> transform mode (default), rotate
            and resize apply to the whole selection from a single{" "}
            <code className="font-mono text-brand-lemon">selectionPivot</code> — one of nine positions on the
            selection bounding box. In <strong className="text-foreground">local</strong> mode, each item
            rotates and resizes around its own pivot independently.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            When the local lattice is displayed, the Board draws eight white resize handles on the lattice
            edges and corners plus a lemon rotation handle above the top edge (connected by a line). Drag a
            resize handle to scale from the pivot; drag the rotation handle to rotate around the pivot. A
            small lemon crosshair marks the active pivot position. The programmatic API mirrors these
            gestures: <code className="font-mono text-brand-lemon">rotateSelected(degrees)</code> applies a
            delta rotation and <code className="font-mono text-brand-lemon">resizeSelected(sx, sy)</code>{" "}
            applies scale factors.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">Accessibility</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The canvas has <code className="font-mono text-brand-lemon">role=&quot;application&quot;</code>, a descriptive <code className="font-mono text-brand-lemon">aria-label</code>, and <code className="font-mono text-brand-lemon">tabindex=&quot;0&quot;</code> so it can receive keyboard focus.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />A focus-visible ring is drawn inside the canvas via <code className="font-mono text-brand-lemon">box-shadow: inset 0 0 0 2px rgba(217,255,102,0.55)</code>.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />When focused, Delete / Backspace removes the selection, Escape clears it, and Arrow keys nudge by 1 board unit (Shift = 10 units).</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Pointer interactions use <code className="font-mono text-brand-lemon">pointer capture</code> so drags don&apos;t lose tracking when the cursor exits the canvas.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />All toolbar buttons in this playground have <code className="font-mono text-brand-lemon">title</code> attributes and <code className="font-mono text-brand-lemon">aria-label</code>s on icon-only buttons.</li>
          </ul>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <span className="eyebrow mb-2 block">On this page</span>
          <nav className="space-y-1 text-[12px]">
            {["Overview", "When to use it", "When not to use it", "Properties and defaults", "Methods", "Events", "Keyboard shortcuts", "Local vs global lattices", "Transform: pivots, rotation, and resize", "Accessibility"].map((s) => (
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

// ---- Code generators ----------------------------------------------------

function generateJsCode(state: PlaygroundState): string {
  return `import { Board } from "@workshop/board";
import { registerBuiltinCommands, ShortcutHandler, commandRegistry } from "@/lib/commands";

// Register the platform commands once on app init.
registerBuiltinCommands();

const container = document.querySelector("#board");
const board = new Board(container, {
  gridMode: ${JSON.stringify(state.gridMode)},
  gridSize: ${state.gridSize},
  subGridDivisions: ${state.subGridDivisions},
  snapToGrid: ${state.snapToGrid},
  snapToItems: ${state.snapToItems},
  transformMode: ${JSON.stringify(state.transformMode)},
  latticeDisplay: ${JSON.stringify(state.latticeDisplay)},
  selectionPivot: ${JSON.stringify(state.selectionPivot)},
});

// Add a shape near the center of the current view.
function addShape(type) {
  const v = board.getView();
  const cx = (container.clientWidth / 2 - v.panX) / v.zoom;
  const cy = (container.clientHeight / 2 - v.panY) / v.zoom;
  const x = cx + (Math.random() - 0.5) * 140;
  const y = cy + (Math.random() - 0.5) * 140;
  const id = board.addItem(type, x, y, 90, 90, 0, "#D9FF66");
  board.selectItem(id, false);
}

// Wire the keyboard shortcuts to the board.
const handler = new ShortcutHandler([
  "board.align-left", "board.align-center-h", "board.align-right",
  "board.align-top", "board.align-center-v", "board.align-bottom",
  "board.distribute-h", "board.distribute-v",
  "board.fit-all", "board.fit-selection",
  "board.add-circle", "board.add-rect", "board.add-triangle",
  "board.delete-selected",
]);
handler.on("board.add-circle", () => addShape("circle"));
handler.on("board.add-rect", () => addShape("rect"));
handler.on("board.add-triangle", () => addShape("triangle"));
handler.on("board.delete-selected", () => {
  board.getSelectedIds().forEach((id) => board.removeItem(id));
});
handler.on("board.fit-all", () => board.zoomToFit());
handler.on("board.fit-selection", () => board.zoomToFitSelection());
handler.on("board.align-left", () => board.align("left"));
handler.on("board.align-center-h", () => board.align("center-h"));
handler.on("board.align-right", () => board.align("right"));
handler.on("board.align-top", () => board.align("top"));
handler.on("board.align-center-v", () => board.align("center-v"));
handler.on("board.align-bottom", () => board.align("bottom"));
handler.on("board.distribute-h", () => board.distribute("horizontal"));
handler.on("board.distribute-v", () => board.distribute("vertical"));
handler.attach();

// Subscribe to events.
board.on("selection", ({ ids }) => console.log("selected:", ids));
board.on("change", (e) => console.log("change:", e));
board.on("view", (v) => console.log("view:", v));

// Cleanup.
// handler.destroy();
// board.destroy();`;
}

function generateHtmlCode(): string {
  return `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="board.css" /></head>
  <body>
    <!-- The container MUST have a fixed height, or the canvas will be 0px tall. -->
    <div id="board" style="width: 100%; height: 520px;"></div>
    <script type="module" src="init.js"></script>
  </body>
</html>`;
}

function generateCssCode(): string {
  return `/* The Board ships its own minimal scoped styles (.board-root, .board-canvas).
   The canvas background is set via the \`background\` option in the constructor,
   not via CSS — pass \`new Board(container, { background: "#1A1422" })\` to
   customize it. */

:root {
  --brand-lemon: #D9FF66;
  --brand-purple: #211A30;
}

/* The container element. The Board class adds .board-root automatically,
   which sets position: relative, overflow: hidden, and touch-action: none.
   You only need to set the size. */
#board {
  width: 100%;
  height: 520px;
  /* Optional: rounded corners + border to match the panel chrome. */
  border-radius: 12px;
  border: 1px solid var(--border, #383343);
}

/* The canvas focus ring is drawn inside the canvas via box-shadow.
   Override the color here if you want a different accent. */
.board-root canvas:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(217, 255, 102, 0.55);
}`;
}

function generateApiCode(): string {
  return `type ShapeType = "circle" | "rect" | "triangle";
type GridMode = "dots" | "lines" | "none";
type AlignType = "left" | "center-h" | "right" | "top" | "center-v" | "bottom";
type DistributeType = "horizontal" | "vertical";
type PivotPosition =
  | "center" | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
type TransformMode = "global" | "local";
type LatticeDisplay = "local" | "global" | "both";

interface BoardItem {
  id: string;
  type: ShapeType;
  x: number;        // center X in board coordinates
  y: number;        // center Y in board coordinates
  width: number;
  height: number;
  rotation: number; // degrees
  color: string;
  selected: boolean;
  pivotX: number;   // 0–1, relative to bounding box left. Default 0.5
  pivotY: number;   // 0–1, relative to bounding box top. Default 0.5
}

interface BoardView {
  panX: number;
  panY: number;
  zoom: number;
}

interface BoardOptions {
  gridMode?: GridMode;           // default "dots"
  gridSize?: number;             // default 40, minimum 4
  subGridDivisions?: number;     // default 4, minimum 1
  snapToGrid?: boolean;          // default false
  snapToItems?: boolean;         // default false
  background?: string;           // default "#15151a"
  transformMode?: TransformMode;   // default "global"
  selectionPivot?: PivotPosition;  // default "center"
  latticeDisplay?: LatticeDisplay; // default "local"
}

class Board {
  constructor(container: HTMLElement, options?: BoardOptions);

  // Items
  addItem(type: ShapeType, x: number, y: number, w: number, h: number, rotation?: number, color?: string): string;
  removeItem(id: string): void;
  getItems(): BoardItem[];
  getSelectedIds(): string[];
  getSelectedItems(): BoardItem[];
  selectItem(id: string, additive?: boolean): void;
  clearSelection(): void;

  // View
  setGridMode(mode: GridMode): void;
  setGridSize(n: number): void;
  setSubGridDivisions(n: number): void;
  setSnapToGrid(on: boolean): void;
  setSnapToItems(on: boolean): void;
  getView(): BoardView;
  setView(panX: number, panY: number, zoom: number): void;
  zoomToFit(): void;
  zoomToFitSelection(): void;

  // Commands
  align(type: AlignType): void;       // requires >= 2 selected
  distribute(type: DistributeType): void;  // requires >= 3 selected

  // Transform
  setTransformMode(mode: TransformMode): void;
  setLatticeDisplay(mode: LatticeDisplay): void;
  setSelectionPivot(pivot: PivotPosition): void;
  rotateSelected(degrees: number): void;          // rotate by delta degrees
  resizeSelected(scaleX: number, scaleY: number): void;  // scale by factors

  // Lattices
  getLocalLattice(item: BoardItem): { x: number; y: number; w: number; h: number; rotation: number };
  getGlobalLattice(item: BoardItem): { x: number; y: number; w: number; h: number; rotation: number };

  // Events
  on(event: "selection" | "change" | "view", handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;

  // Lifecycle
  destroy(): void;
}`;
}
