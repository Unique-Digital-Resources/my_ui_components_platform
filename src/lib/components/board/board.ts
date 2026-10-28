/**
 * Board — an infinite canvas component for apps like Excalidraw, node graphs,
 * and vector art (vanilla TypeScript).
 *
 * Features:
 *   - Infinite pan/zoom canvas
 *   - Grid system: dots or lines, with sub-grid divisions
 *   - Snap to grid, snap to other items
 *   - Board items: circle, rectangle, triangle shapes
 *   - Selection: single, multi (rubber-band)
 *   - Per-item local lattice (rotated bounding box) and global lattice
 *     (axis-aligned bounding box without rotation)
 *   - Commands: align (left/center/right/top/middle/bottom), distribute
 *     (horizontal/vertical), fit (to selection/all), snap to items
 *   - Transform: per-item pivot (pivotX/pivotY), 9 selection pivot positions,
 *     global/local transform modes, rotation + 8 resize handles, lattice
 *     display modes (local/global/both)
 *
 * Public API:
 *   new Board(container, options)
 *   // Items
 *   addItem(type, x, y, w, h, rotation?, color?): string
 *   removeItem(id): void
 *   getItems(): BoardItem[]
 *   getSelectedIds(): string[]
 *   // View
 *   setGridMode(mode): void
 *   setGridSize(n): void
 *   setSubGridDivisions(n): void
 *   setSnapToGrid(on): void
 *   setSnapToItems(on): void
 *   zoomToFit(): void
 *   zoomToFitSelection(): void
 *   // Commands
 *   align(type: AlignType): void
 *   distribute(type: DistributeType): void
 *   // Transform
 *   setTransformMode(mode: "global" | "local"): void
 *   setLatticeDisplay(mode: "local" | "global" | "both"): void
 *   setSelectionPivot(pivot: PivotPosition): void
 *   rotateSelected(degrees: number): void
 *   resizeSelected(scaleX: number, scaleY: number): void
 *   // Events
 *   on("selection" | "change" | "view", handler): void
 *   off(event, handler): void
 *   destroy(): void
 */

export type ShapeType = "circle" | "rect" | "triangle";
export type GridMode = "dots" | "lines" | "none";
export type AlignType = "left" | "center-h" | "right" | "top" | "center-v" | "bottom";
export type DistributeType = "horizontal" | "vertical";
export type PivotPosition =
  | "center"
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";
export type TransformMode = "global" | "local";
export type LatticeDisplay = "local" | "global" | "both" | "none";

export interface BoardItem {
  id: string;
  type: ShapeType;
  x: number;       // center X in board coordinates
  y: number;       // center Y in board coordinates
  width: number;
  height: number;
  rotation: number; // degrees
  color: string;
  selected: boolean;
  pivotX: number;   // 0–1, relative to bounding box left. Default 0.5 (center)
  pivotY: number;   // 0–1, relative to bounding box top. Default 0.5 (center)
  /** Optional minimum width. 0 = no limit. */
  minWidth?: number;
  /** Optional minimum height. 0 = no limit. */
  minHeight?: number;
  /** Optional maximum width. 0 or Infinity = no limit. */
  maxWidth?: number;
  /** Optional maximum height. 0 or Infinity = no limit. */
  maxHeight?: number;
}

export interface BoardOptions {
  gridMode?: GridMode;
  gridSize?: number;          // base grid size in board units. Default 40
  subGridDivisions?: number;  // sub-divisions per grid cell. Default 4
  snapToGrid?: boolean;
  snapToItems?: boolean;
  background?: string;
  transformMode?: TransformMode;   // "global" | "local". Default "global"
  selectionPivot?: PivotPosition;  // 9 positions. Default "center"
  latticeDisplay?: LatticeDisplay; // "local" | "global" | "both". Default "local"
  /** Whether rotation handles are shown. Default true. */
  allowRotation?: boolean;
  /** Whether resize handles are shown. Default true. */
  allowResize?: boolean;
}

export interface BoardView {
  panX: number;
  panY: number;
  zoom: number;
}

interface Lattice {
  x: number; y: number; w: number; h: number; rotation: number;
}

type HandleName = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

// Visual constants expressed in screen pixels. Converted to board units via /zoom
// so handles stay a constant on-screen size regardless of zoom level.
const ROTATE_HANDLE_OFFSET_PX = 24;
const HANDLE_SIZE_PX = 8;
const ROTATE_HANDLE_RADIUS_PX = 5;
const HANDLE_HIT_RADIUS_PX = 12;
const PIVOT_CROSSHAIR_RADIUS_PX = 6;

const HANDLE_CURSORS: Record<HandleName, string> = {
  nw: "nwse-resize", se: "nwse-resize",
  ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize",
  e: "ew-resize", w: "ew-resize",
};

const DEFAULTS: Required<BoardOptions> = {
  gridMode: "dots",
  gridSize: 40,
  subGridDivisions: 4,
  snapToGrid: false,
  snapToItems: false,
  background: "#15151a",
  transformMode: "global",
  selectionPivot: "center",
  latticeDisplay: "local",
  allowRotation: true,
  allowResize: true,
};

const STYLE_ID = "board-styles";
let itemIdCounter = 1;

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.board-root { overflow: hidden; touch-action: none; cursor: default; }
.board-root canvas { display: block; touch-action: none; outline: none; }
.board-root canvas:focus-visible { box-shadow: inset 0 0 0 2px rgba(217,255,102,0.55); }
`;
  document.head.appendChild(style);
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

type Handler = (data: any) => void;

export class Board {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private options: Required<BoardOptions>;
  private items: Map<string, BoardItem> = new Map();
  private selectedIds: Set<string> = new Set();

  private view: BoardView = { panX: 0, panY: 0, zoom: 1 };

  private pointerState: {
    mode: "pan" | "select" | "drag" | "rotate" | "resize" | "none";
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    dragOffsets?: Map<string, { dx: number; dy: number }>;
    rubberBand?: { x0: number; y0: number; x1: number; y1: number };
    // For rotate / resize modes:
    startItems?: Map<string, BoardItem>;   // snapshot of selected items at gesture start
    startBoardX?: number;                   // pointer board-x at gesture start
    startBoardY?: number;                   // pointer board-y at gesture start
    startRotation?: number;                 // initial angle (deg) from pivot to start pointer
    resizeHandle?: HandleName;              // which handle is being dragged
    startSelectionPivot?: { x: number; y: number };
    startSelectionLattice?: Lattice;
  } | null = null;

  private _destroyed = false;
  private _renderScheduled = false;
  private readonly listeners: Map<string, Set<Handler>> = new Map();

  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onWheel: (e: WheelEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;
  private resizeObserver: ResizeObserver | null = null;
  /** Overlay render callback — called at the end of every render() so
   *  consumers (e.g. NodesGraph) can draw on top of the board. */
  private overlayRenderFn: (() => void) | null = null;

  constructor(container: HTMLElement, options: BoardOptions = {}) {
    if (!container) throw new Error("Board: container is required");
    this.container = container;
    this.options = {
      gridMode: options.gridMode ?? DEFAULTS.gridMode,
      gridSize: Math.max(4, options.gridSize ?? DEFAULTS.gridSize),
      subGridDivisions: Math.max(1, options.subGridDivisions ?? DEFAULTS.subGridDivisions),
      snapToGrid: options.snapToGrid ?? DEFAULTS.snapToGrid,
      snapToItems: options.snapToItems ?? DEFAULTS.snapToItems,
      background: options.background ?? DEFAULTS.background,
      transformMode: options.transformMode ?? DEFAULTS.transformMode,
      selectionPivot: options.selectionPivot ?? DEFAULTS.selectionPivot,
      latticeDisplay: options.latticeDisplay ?? DEFAULTS.latticeDisplay,
      allowRotation: options.allowRotation ?? DEFAULTS.allowRotation,
      allowResize: options.allowResize ?? DEFAULTS.allowResize,
    };

    injectStyles();
    this.canvas = document.createElement("canvas");
    this.canvas.className = "board-canvas";
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", "Board. Click to select, drag to move. Space+drag or middle-click to pan. Scroll to zoom.");
    this.canvas.tabIndex = 0;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Board: 2D canvas context unavailable");
    this.ctx = ctx;
    this.container.classList.add("board-root");
    this.container.appendChild(this.canvas);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);

    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("pointercancel", this._onPointerUp);
    this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    this.canvas.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }

    this.updateCanvasSize();
    this.render();
  }

  // ---- Public API: Items ----

  addItem(
    type: ShapeType, x: number, y: number, w: number, h: number,
    rotation = 0, color = "#D9FF66",
    bounds?: { minWidth?: number; minHeight?: number; maxWidth?: number; maxHeight?: number },
  ): string {
    const id = `item-${itemIdCounter++}`;
    const item: BoardItem = {
      id, type, x, y, width: w, height: h, rotation, color, selected: false,
      pivotX: 0.5, pivotY: 0.5,
      minWidth: bounds?.minWidth,
      minHeight: bounds?.minHeight,
      maxWidth: bounds?.maxWidth,
      maxHeight: bounds?.maxHeight,
    };
    this.items.set(id, item);
    this.scheduleRender();
    this.emit("change", { type: "add", item });
    return id;
  }

  removeItem(id: string): void {
    if (!this.items.has(id)) return;
    this.items.delete(id);
    this.selectedIds.delete(id);
    this.scheduleRender();
    this.emit("change", { type: "remove", id });
    this.emit("selection", { ids: this.getSelectedIds() });
  }

  getItems(): BoardItem[] {
    return Array.from(this.items.values()).map((i) => ({ ...i }));
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  getSelectedItems(): BoardItem[] {
    return this.getSelectedIds().map((id) => this.items.get(id)!).filter(Boolean);
  }

  selectItem(id: string, additive = false): void {
    if (!additive) this.clearSelection();
    if (this.items.has(id)) {
      this.selectedIds.add(id);
      this.items.get(id)!.selected = true;
    }
    this.scheduleRender();
    this.emit("selection", { ids: this.getSelectedIds() });
  }

  clearSelection(): void {
    for (const id of this.selectedIds) {
      const item = this.items.get(id);
      if (item) item.selected = false;
    }
    this.selectedIds.clear();
    this.scheduleRender();
    this.emit("selection", { ids: [] });
  }

  // ---- Public API: View ----

  setGridMode(mode: GridMode): void {
    this.options.gridMode = mode;
    this.scheduleRender();
  }

  setGridSize(n: number): void {
    this.options.gridSize = Math.max(4, n);
    this.scheduleRender();
  }

  setSubGridDivisions(n: number): void {
    this.options.subGridDivisions = Math.max(1, n);
    this.scheduleRender();
  }

  setSnapToGrid(on: boolean): void {
    this.options.snapToGrid = on;
  }

  setSnapToItems(on: boolean): void {
    this.options.snapToItems = on;
  }

  setTransformMode(mode: TransformMode): void {
    this.options.transformMode = mode;
    this.scheduleRender();
  }

  setLatticeDisplay(mode: LatticeDisplay): void {
    this.options.latticeDisplay = mode;
    this.scheduleRender();
  }

  setSelectionPivot(pivot: PivotPosition): void {
    this.options.selectionPivot = pivot;
    this.scheduleRender();
  }

  /** Rotate all selected items by `degrees` (delta). */
  rotateSelected(degrees: number): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;
    if (this.options.transformMode === "global") {
      const pivot = this.getSelectionPivotPosition();
      if (!pivot) return;
      for (const item of selected) this.rotateItemAround(item, pivot, degrees);
    } else {
      for (const item of selected) {
        const pivot = this.getItemPivotBoard(item);
        this.rotateItemAround(item, pivot, degrees);
      }
    }
    this.scheduleRender();
    this.emit("change", { type: "rotate", degrees });
  }

  /** Scale all selected items by `scaleX` / `scaleY` (factors). */
  resizeSelected(scaleX: number, scaleY: number): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;
    if (this.options.transformMode === "global") {
      const pivot = this.getSelectionPivotPosition();
      if (!pivot) return;
      for (const item of selected) this.scaleItemFromSelectionPivot(item, pivot, scaleX, scaleY);
    } else {
      for (const item of selected) {
        const pivot = this.getItemPivotBoard(item);
        this.scaleItemFromOwnPivot(item, pivot, scaleX, scaleY);
      }
    }
    this.scheduleRender();
    this.emit("change", { type: "resize", scaleX, scaleY });
  }

  getView(): BoardView {
    return { ...this.view };
  }

  setView(panX: number, panY: number, zoom: number): void {
    this.view.panX = panX;
    this.view.panY = panY;
    this.view.zoom = clamp(zoom, 0.05, 10);
    this.scheduleRender();
    this.emit("view", this.getView());
  }

  zoomToFit(): void {
    if (this.items.size === 0) {
      this.setView(0, 0, 1);
      return;
    }
    this.fitToItems(Array.from(this.items.values()));
  }

  zoomToFitSelection(): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) { this.zoomToFit(); return; }
    this.fitToItems(selected);
  }

  private fitToItems(items: BoardItem[]): void {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      const latt = this.getGlobalLattice(item);
      minX = Math.min(minX, latt.x);
      minY = Math.min(minY, latt.y);
      maxX = Math.max(maxX, latt.x + latt.w);
      maxY = Math.max(maxY, latt.y + latt.h);
    }
    const padding = 60;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const bw = (maxX - minX) + padding * 2;
    const bh = (maxY - minY) + padding * 2;
    const zoom = Math.min(w / bw, h / bh, 5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.setView(w / 2 - cx * zoom, h / 2 - cy * zoom, zoom);
  }

  // ---- Public API: Alignment Commands ----

  align(type: AlignType): void {
    const selected = this.getSelectedItems();
    if (selected.length < 2) return;
    // Compute global lattices.
    const latts = selected.map((item) => ({ item, latt: this.getGlobalLattice(item) }));
    let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const { latt } of latts) {
      bounds.minX = Math.min(bounds.minX, latt.x);
      bounds.maxX = Math.max(bounds.maxX, latt.x + latt.w);
      bounds.minY = Math.min(bounds.minY, latt.y);
      bounds.maxY = Math.max(bounds.maxY, latt.y + latt.h);
    }
    for (const { item, latt } of latts) {
      const dx = latt.x - item.x + latt.w / 2;
      const dy = latt.y - item.y + latt.h / 2;
      switch (type) {
        case "left": item.x += bounds.minX - latt.x; break;
        case "center-h": item.x += (bounds.minX + bounds.maxX) / 2 - (latt.x + latt.w / 2); break;
        case "right": item.x += bounds.maxX - (latt.x + latt.w); break;
        case "top": item.y += bounds.minY - latt.y; break;
        case "center-v": item.y += (bounds.minY + bounds.maxY) / 2 - (latt.y + latt.h / 2); break;
        case "bottom": item.y += bounds.maxY - (latt.y + latt.h); break;
      }
      void dx; void dy;
    }
    this.scheduleRender();
    this.emit("change", { type: "align", alignType: type });
  }

  distribute(type: DistributeType): void {
    const selected = this.getSelectedItems();
    if (selected.length < 3) return;
    const latts = selected.map((item) => ({ item, latt: this.getGlobalLattice(item) }));
    if (type === "horizontal") {
      latts.sort((a, b) => a.latt.x - b.latt.x);
    } else {
      latts.sort((a, b) => a.latt.y - b.latt.y);
    }
    const first = latts[0].latt;
    const last = latts[latts.length - 1].latt;
    if (type === "horizontal") {
      const totalSpan = (last.x + last.w) - first.x;
      const totalItemW = latts.reduce((s, l) => s + l.latt.w, 0);
      const gap = (totalSpan - totalItemW) / (latts.length - 1);
      let cursor = first.x;
      for (const { item, latt } of latts) {
        item.x += cursor - latt.x;
        cursor += latt.w + gap;
      }
    } else {
      const totalSpan = (last.y + last.h) - first.y;
      const totalItemH = latts.reduce((s, l) => s + l.latt.h, 0);
      const gap = (totalSpan - totalItemH) / (latts.length - 1);
      let cursor = first.y;
      for (const { item, latt } of latts) {
        item.y += cursor - latt.y;
        cursor += latt.h + gap;
      }
    }
    this.scheduleRender();
    this.emit("change", { type: "distribute", distributeType: type });
  }

  // ---- Lattices ----

  /**
   * Local lattice: the item's bounding box rotated with the item.
   * (x, y) = top-left of the unrotated rect, w/h = width/height, rotation = item rotation.
   */
  getLocalLattice(item: BoardItem): Lattice {
    const w = Math.abs(item.width);
    const h = Math.abs(item.height);
    return {
      x: item.x - w / 2,
      y: item.y - h / 2,
      w,
      h,
      rotation: item.rotation,
    };
  }

  /**
   * Global lattice: axis-aligned bounding box (AABB) of the item, ignoring rotation.
   * For rotated items, this is the AABB of the rotated rect. For unrotated, it's the same as local.
   * Uses absolute dimensions so negative (flipped) sizes don't break the AABB.
   */
  getGlobalLattice(item: BoardItem): Lattice {
    const aw = Math.abs(item.width);
    const ah = Math.abs(item.height);
    if (item.rotation === 0) {
      return { x: item.x - aw / 2, y: item.y - ah / 2, w: aw, h: ah, rotation: 0 };
    }
    const rad = (item.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const w = aw * cos + ah * sin;
    const h = aw * sin + ah * cos;
    return { x: item.x - w / 2, y: item.y - h / 2, w, h, rotation: 0 };
  }

  // ---- Pivot / lattice helpers ----

  /** Board-space position of an item's pivot. */
  private getItemPivotBoard(item: BoardItem): { x: number; y: number } {
    return this.getLatticePivotBoard(this.getLocalLattice(item), item.pivotX, item.pivotY);
  }

  /** Board-space position of a (pivotX, pivotY) point on a lattice. */
  private getLatticePivotBoard(lattice: Lattice, pivotX: number, pivotY: number): { x: number; y: number } {
    const cx = lattice.x + lattice.w / 2;
    const cy = lattice.y + lattice.h / 2;
    const plx = (pivotX - 0.5) * lattice.w;
    const ply = (pivotY - 0.5) * lattice.h;
    const rad = (lattice.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + plx * cos - ply * sin,
      y: cy + plx * sin + ply * cos,
    };
  }

  /** Convert a board-space point into a lattice's local (unrotated) frame. */
  private boardToLatticeLocal(bx: number, by: number, lattice: Lattice): { x: number; y: number } {
    const cx = lattice.x + lattice.w / 2;
    const cy = lattice.y + lattice.h / 2;
    const dx = bx - cx;
    const dy = by - cy;
    const rad = (-lattice.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  }

  /**
   * The combined selection lattice.
   * - Single item: that item's local lattice (rotated bounding box).
   * - Multi-selection: the AABB enclosing all selected items' global lattices (rotation 0).
   */
  private getSelectionLattice(): Lattice | null {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return null;
    if (selected.length === 1) return this.getLocalLattice(selected[0]);
    return this.getSelectionAABB();
  }

  /**
   * The global AABB of the selection — always axis-aligned (rotation=0).
   * Used for resize handles and resize math. This is the GLOBAL lattice:
   * for single items it's the AABB of the rotated rect; for multi-selection
   * it's the combined AABB of all items.
   */
  private getSelectionAABB(): Lattice | null {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of selected) {
      const latt = this.getGlobalLattice(item);
      minX = Math.min(minX, latt.x);
      minY = Math.min(minY, latt.y);
      maxX = Math.max(maxX, latt.x + latt.w);
      maxY = Math.max(maxY, latt.y + latt.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, rotation: 0 };
  }

  /** Board-space position of the selection pivot (global transform mode). */
  private getSelectionPivotPosition(): { x: number; y: number } | null {
    const lattice = this.getSelectionLattice();
    if (!lattice) return null;
    const map: Record<PivotPosition, { x: number; y: number }> = {
      "center": { x: 0.5, y: 0.5 },
      "top-left": { x: 0, y: 0 },
      "top-center": { x: 0.5, y: 0 },
      "top-right": { x: 1, y: 0 },
      "middle-left": { x: 0, y: 0.5 },
      "middle-right": { x: 1, y: 0.5 },
      "bottom-left": { x: 0, y: 1 },
      "bottom-center": { x: 0.5, y: 1 },
      "bottom-right": { x: 1, y: 1 },
    };
    const p = map[this.options.selectionPivot];
    return this.getLatticePivotBoard(lattice, p.x, p.y);
  }

  /** Local-frame position (relative to lattice center) of a named handle. */
  private getHandleLocalPos(handle: HandleName, lattice: Lattice): { x: number; y: number } {
    const hw = lattice.w / 2;
    const hh = lattice.h / 2;
    switch (handle) {
      case "nw": return { x: -hw, y: -hh };
      case "n": return { x: 0, y: -hh };
      case "ne": return { x: hw, y: -hh };
      case "e": return { x: hw, y: 0 };
      case "se": return { x: hw, y: hh };
      case "s": return { x: 0, y: hh };
      case "sw": return { x: -hw, y: hh };
      case "w": return { x: -hw, y: 0 };
    }
  }

  /** Board-space positions of all 8 resize handles + the rotation handle. */
  private getLatticeHandles(lattice: Lattice): Record<HandleName | "rotate", { x: number; y: number }> {
    const cx = lattice.x + lattice.w / 2;
    const cy = lattice.y + lattice.h / 2;
    const rad = (lattice.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const transform = (lx: number, ly: number) => ({
      x: cx + lx * cos - ly * sin,
      y: cy + lx * sin + ly * cos,
    });
    const hw = lattice.w / 2;
    const hh = lattice.h / 2;
    const rotateOffset = ROTATE_HANDLE_OFFSET_PX / this.view.zoom;
    return {
      nw: transform(-hw, -hh),
      n: transform(0, -hh),
      ne: transform(hw, -hh),
      e: transform(hw, 0),
      se: transform(hw, hh),
      s: transform(0, hh),
      sw: transform(-hw, hh),
      w: transform(-hw, 0),
      rotate: transform(0, -hh - rotateOffset),
    };
  }

  /** Hit test the rotation + resize handles. Returns null if no hit.
   *  Resize handles are on the GLOBAL lattice (AABB); rotation handle is
   *  on the LOCAL lattice (rotated bounding box). */
  private hitTestHandles(bx: number, by: number): "rotate" | HandleName | null {
    // "none" mode: no visible handles, but edge/corner resize still works
    // if allowResize is true (hit-test is done on the AABB edges/corners).
    if (this.options.latticeDisplay === "global") return null;
    const threshold = HANDLE_HIT_RADIUS_PX / this.view.zoom;
    // Rotation handle: on the local lattice (if allowed AND visible).
    if (this.options.allowRotation && this.options.latticeDisplay !== "none") {
      const localLattice = this.getSelectionLattice();
      if (localLattice) {
        const localHandles = this.getLatticeHandles(localLattice);
        if (Math.hypot(bx - localHandles.rotate.x, by - localHandles.rotate.y) < threshold) return "rotate";
      }
    }
    // Resize handles: on the global AABB (if allowed).
    // In "none" mode, the handles aren't drawn but the hit test still works
    // so users can resize by grabbing the edges/corners.
    if (this.options.allowResize) {
      const aabb = this.getSelectionAABB();
      if (aabb) {
        const aabbHandles = this.getLatticeHandles(aabb);
        const names: HandleName[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
        for (const name of names) {
          const h = aabbHandles[name];
          if (Math.hypot(bx - h.x, by - h.y) < threshold) return name;
        }
      }
    }
    return null;
  }

  /** Rotate `item` by `degrees` around a board-space `pivot`. */
  private rotateItemAround(item: BoardItem, pivot: { x: number; y: number }, degrees: number): void {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = item.x - pivot.x;
    const dy = item.y - pivot.y;
    item.x = pivot.x + dx * cos - dy * sin;
    item.y = pivot.y + dx * sin + dy * cos;
    item.rotation += degrees;
  }

  /** Scale `item` by (sx, sy) from the selection pivot (global mode). Item position moves with pivot. */
  private scaleItemFromSelectionPivot(item: BoardItem, pivot: { x: number; y: number }, sx: number, sy: number): void {
    item.width = Math.max(2, item.width * sx);
    item.height = Math.max(2, item.height * sy);
    item.x = pivot.x + (item.x - pivot.x) * sx;
    item.y = pivot.y + (item.y - pivot.y) * sy;
  }

  /** Scale `item` by (sx, sy) from its own pivot, keeping the pivot board position fixed (local mode). */
  private scaleItemFromOwnPivot(item: BoardItem, pivot: { x: number; y: number }, sx: number, sy: number): void {
    const oldW = item.width;
    const oldH = item.height;
    item.width = Math.max(2, oldW * sx);
    item.height = Math.max(2, oldH * sy);
    const rad = (item.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const oldPivotLocalX = (item.pivotX - 0.5) * oldW;
    const oldPivotLocalY = (item.pivotY - 0.5) * oldH;
    const newPivotLocalX = (item.pivotX - 0.5) * item.width;
    const newPivotLocalY = (item.pivotY - 0.5) * item.height;
    const dx = oldPivotLocalX - newPivotLocalX;
    const dy = oldPivotLocalY - newPivotLocalY;
    item.x += dx * cos - dy * sin;
    item.y += dx * sin + dy * cos;
  }

  // ---- Coordinate conversion ----

  private screenToBoard(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cx = sx - rect.left;
    const cy = sy - rect.top;
    return {
      x: (cx - this.view.panX) / this.view.zoom,
      y: (cy - this.view.panY) / this.view.zoom,
    };
  }

  // ---- Snapping ----

  private snap(x: number, y: number): { x: number; y: number } {
    let sx = x, sy = y;
    if (this.options.snapToGrid) {
      const g = this.options.gridSize;
      sx = Math.round(x / g) * g;
      sy = Math.round(y / g) * g;
    }
    if (this.options.snapToItems) {
      const threshold = 8 / this.view.zoom;
      for (const item of this.items.values()) {
        if (this.selectedIds.has(item.id)) continue;
        const latt = this.getGlobalLattice(item);
        const edges = [latt.x, latt.x + latt.w, latt.y, latt.y + latt.h, item.x, item.y];
        for (const e of edges) {
          if (Math.abs(sx - e) < threshold) sx = e;
          if (Math.abs(sy - e) < threshold) sy = e;
        }
      }
    }
    return { x: sx, y: sy };
  }

  // ---- Pointer interaction ----

  private onPointerDown(e: PointerEvent): void {
    if (this._destroyed) return;
    this.canvas.focus();
    const bp = this.screenToBoard(e.clientX, e.clientY);
    const isPan = e.button === 1 || (e.button === 0 && this._spaceDown);

    if (isPan) {
      this.pointerState = {
        mode: "pan", pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
      };
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      this.canvas.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }

    // Check transform handles (rotate / resize) before hit-testing items.
    const handleHit = this.hitTestHandles(bp.x, bp.y);
    if (handleHit === "rotate") {
      this.startRotateMode(e, bp);
      e.preventDefault();
      return;
    }
    if (handleHit) {
      this.startResizeMode(e, bp, handleHit);
      e.preventDefault();
      return;
    }

    // Hit test items (topmost first).
    const hit = this.hitTest(bp.x, bp.y);
    if (hit) {
      if (!this.selectedIds.has(hit.id)) {
        this.selectItem(hit.id, e.shiftKey);
      } else if (e.shiftKey) {
        this.selectedIds.delete(hit.id);
        this.items.get(hit.id)!.selected = false;
        this.emit("selection", { ids: this.getSelectedIds() });
      }
      // Start dragging selected items.
      const dragOffsets = new Map<string, { dx: number; dy: number }>();
      for (const id of this.selectedIds) {
        const item = this.items.get(id);
        if (item) dragOffsets.set(id, { dx: bp.x - item.x, dy: bp.y - item.y });
      }
      this.pointerState = {
        mode: "drag", pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
        dragOffsets,
      };
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    } else {
      // Empty space → rubber-band select.
      if (!e.shiftKey) this.clearSelection();
      this.pointerState = {
        mode: "select", pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
        rubberBand: { x0: bp.x, y0: bp.y, x1: bp.x, y1: bp.y },
      };
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    }
    this.scheduleRender();
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerState) {
      this.updateHoverCursor(e.clientX, e.clientY);
      return;
    }
    const ps = this.pointerState;
    if (ps.mode === "pan") {
      const dx = e.clientX - ps.lastX;
      const dy = e.clientY - ps.lastY;
      this.view.panX += dx;
      this.view.panY += dy;
      ps.lastX = e.clientX;
      ps.lastY = e.clientY;
      this.scheduleRender();
      this.emit("view", this.getView());
    } else if (ps.mode === "drag" && ps.dragOffsets) {
      let bp = this.screenToBoard(e.clientX, e.clientY);
      for (const [id, offset] of ps.dragOffsets) {
        const item = this.items.get(id);
        if (!item) continue;
        let nx = bp.x - offset.dx;
        let ny = bp.y - offset.dy;
        if (this.options.snapToGrid || this.options.snapToItems) {
          const snapped = this.snap(nx, ny);
          nx = snapped.x;
          ny = snapped.y;
        }
        item.x = nx;
        item.y = ny;
      }
      this.scheduleRender();
      this.emit("change", { type: "move" });
    } else if (ps.mode === "select" && ps.rubberBand) {
      const bp = this.screenToBoard(e.clientX, e.clientY);
      ps.rubberBand.x1 = bp.x;
      ps.rubberBand.y1 = bp.y;
      // Select items intersecting the rubber band.
      const rb = ps.rubberBand;
      const minX = Math.min(rb.x0, rb.x1), maxX = Math.max(rb.x0, rb.x1);
      const minY = Math.min(rb.y0, rb.y1), maxY = Math.max(rb.y0, rb.y1);
      for (const item of this.items.values()) {
        const latt = this.getGlobalLattice(item);
        const intersects = latt.x < maxX && latt.x + latt.w > minX && latt.y < maxY && latt.y + latt.h > minY;
        if (intersects && !this.selectedIds.has(item.id)) {
          this.selectedIds.add(item.id);
          item.selected = true;
        } else if (!intersects && this.selectedIds.has(item.id) && !e.shiftKey) {
          this.selectedIds.delete(item.id);
          item.selected = false;
        }
      }
      this.scheduleRender();
      this.emit("selection", { ids: this.getSelectedIds() });
    } else if (ps.mode === "rotate") {
      const bp = this.screenToBoard(e.clientX, e.clientY);
      this.applyRotate(bp.x, bp.y);
    } else if (ps.mode === "resize") {
      const bp = this.screenToBoard(e.clientX, e.clientY);
      this.applyResize(bp.x, bp.y);
    }
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerState) return;
    try { this.canvas.releasePointerCapture(this.pointerState.pointerId); } catch {}
    const mode = this.pointerState.mode;
    if (mode === "drag") {
      this.emit("change", { type: "move-end" });
    } else if (mode === "rotate") {
      this.emit("change", { type: "rotate-end" });
    } else if (mode === "resize") {
      this.emit("change", { type: "resize-end" });
    }
    this.pointerState = null;
    this.scheduleRender();
    this.updateHoverCursor(e.clientX, e.clientY);
  }

  /** Update the canvas cursor based on what is under the pointer (hover). */
  private updateHoverCursor(clientX: number, clientY: number): void {
    if (this._spaceDown) {
      this.canvas.style.cursor = "grab";
      return;
    }
    const bp = this.screenToBoard(clientX, clientY);
    const handle = this.hitTestHandles(bp.x, bp.y);
    if (handle === "rotate") {
      this.canvas.style.cursor = "grab";
      return;
    }
    if (handle) {
      this.canvas.style.cursor = HANDLE_CURSORS[handle];
      return;
    }
    const hit = this.hitTest(bp.x, bp.y);
    this.canvas.style.cursor = hit ? "move" : "default";
  }

  /** Begin a rotate gesture from a pointer-down on the rotation handle. */
  private startRotateMode(e: PointerEvent, bp: { x: number; y: number }): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;
    const snapshot = new Map<string, BoardItem>();
    for (const item of selected) snapshot.set(item.id, { ...item });
    const pivot = this.options.transformMode === "global"
      ? this.getSelectionPivotPosition()
      : (selected.length === 1 ? this.getItemPivotBoard(selected[0]) : this.getSelectionPivotPosition());
    const startAngle = pivot
      ? (Math.atan2(bp.y - pivot.y, bp.x - pivot.x) * 180) / Math.PI
      : 0;
    this.pointerState = {
      mode: "rotate",
      pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX, lastY: e.clientY,
      startBoardX: bp.x, startBoardY: bp.y,
      startItems: snapshot,
      startRotation: startAngle,
      startSelectionPivot: pivot ?? { x: 0, y: 0 },
      startSelectionLattice: this.getSelectionLattice() ?? undefined,
    };
    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    this.canvas.style.cursor = "grabbing";
  }

  /** Begin a resize gesture from a pointer-down on a resize handle.
   *  Resize handles are on the GLOBAL lattice (AABB, rotation=0). */
  private startResizeMode(e: PointerEvent, bp: { x: number; y: number }, handle: HandleName): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;
    const snapshot = new Map<string, BoardItem>();
    for (const item of selected) snapshot.set(item.id, { ...item });
    const pivot = this.options.transformMode === "global"
      ? this.getSelectionPivotPosition()
      : (selected.length === 1 ? this.getItemPivotBoard(selected[0]) : this.getSelectionPivotPosition());
    this.pointerState = {
      mode: "resize",
      pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX, lastY: e.clientY,
      startBoardX: bp.x, startBoardY: bp.y,
      startItems: snapshot,
      resizeHandle: handle,
      startSelectionPivot: pivot ?? { x: 0, y: 0 },
      startSelectionLattice: this.getSelectionAABB() ?? undefined,
    };
    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    this.canvas.style.cursor = HANDLE_CURSORS[handle];
  }

  /** Apply a rotate gesture delta based on the current pointer position. */
  private applyRotate(bx: number, by: number): void {
    const ps = this.pointerState;
    if (!ps || !ps.startItems) return;
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;

    if (this.options.transformMode === "global") {
      const pivot = ps.startSelectionPivot!;
      const currentAngle = (Math.atan2(by - pivot.y, bx - pivot.x) * 180) / Math.PI;
      const delta = currentAngle - ps.startRotation!;
      for (const item of selected) {
        const start = ps.startItems.get(item.id)!;
        item.rotation = start.rotation;
        item.x = start.x;
        item.y = start.y;
        this.rotateItemAround(item, pivot, delta);
      }
    } else {
      // Local mode: each item rotates around its own pivot.
      for (const item of selected) {
        const start = ps.startItems.get(item.id)!;
        item.rotation = start.rotation;
        item.x = start.x;
        item.y = start.y;
        const pivot = this.getItemPivotBoard(start);
        const startAngle = (Math.atan2(ps.startBoardY! - pivot.y, ps.startBoardX! - pivot.x) * 180) / Math.PI;
        const currentAngle = (Math.atan2(by - pivot.y, bx - pivot.x) * 180) / Math.PI;
        const delta = currentAngle - startAngle;
        this.rotateItemAround(item, pivot, delta);
      }
    }
    this.scheduleRender();
    this.emit("change", { type: "rotate" });
  }

  /**
   * Apply a resize gesture based on the current pointer position and the dragged handle.
   *
   * Resize handles are on the GLOBAL lattice (AABB, rotation=0), so the math
   * is straightforward — no rotation conversion needed. The opposite edge of
   * the AABB stays fixed while the dragged handle moves. Scale factors are
   * computed from the AABB and applied to each item.
   *
   * Negative dimensions are allowed (flip). Min/max bounds per item are
   * applied after the resize.
   */
  private applyResize(bx: number, by: number): void {
    const ps = this.pointerState;
    if (!ps || !ps.startItems || !ps.resizeHandle) return;
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;
    const handle = ps.resizeHandle;
    const aabb = ps.startSelectionLattice!; // This is the AABB (rotation=0).

    // Determine which axes are affected.
    const affectsX = handle === "e" || handle === "w" || handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";
    const affectsY = handle === "n" || handle === "s" || handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";

    // AABB has rotation=0, so board coords = local coords. No conversion needed.
    // The AABB edges: left = aabb.x, right = aabb.x + aabb.w, top = aabb.y, bottom = aabb.y + aabb.h.
    let newW = aabb.w;
    let newH = aabb.h;
    let fixedX = aabb.x;           // left edge (fixed when dragging east)
    let fixedY = aabb.y;           // top edge (fixed when dragging south)

    if (affectsX) {
      if (handle === "e" || handle === "ne" || handle === "se") {
        // Dragging east → west (left) edge fixed.
        fixedX = aabb.x;
        newW = bx - fixedX;
      } else {
        // Dragging west → east (right) edge fixed.
        fixedX = aabb.x + aabb.w;
        newW = fixedX - bx;
      }
    }
    if (affectsY) {
      if (handle === "s" || handle === "sw" || handle === "se") {
        // Dragging south → north (top) edge fixed.
        fixedY = aabb.y;
        newH = by - fixedY;
      } else {
        // Dragging north → south (bottom) edge fixed.
        fixedY = aabb.y + aabb.h;
        newH = fixedY - by;
      }
    }

    // Compute scale factors from the AABB (can be negative for flip).
    const sx = aabb.w !== 0 ? newW / aabb.w : 1;
    const sy = aabb.h !== 0 ? newH / aabb.h : 1;

    // The fixed point in board space (the corner/edge that doesn't move).
    // Since AABB has rotation=0, this is just the raw board coordinate.
    const fixedBoardX = affectsX ? fixedX : (aabb.x + aabb.w / 2);
    const fixedBoardY = affectsY ? fixedY : (aabb.y + aabb.h / 2);

    // Apply to each item.
    // Key insight: when an item is rotated, its AABB width is
    //   |w·cos(θ)| + |h·sin(θ)| — NOT proportional to w alone.
    // So scaling the item's position by the AABB scale factor and then
    // scaling the item's width by the same factor produces an item whose
    // new AABB doesn't match the handle position → the item drifts.
    //
    // Fix: after computing the new item width/height, compute the NEW AABB
    // for that item, then position the item center so the item's AABB edge
    // maintains its proportional offset from the fixed selection edge.
    for (const item of selected) {
      const start = ps.startItems.get(item.id)!;
      const rad = (start.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      // New item dimensions (scale magnitude, preserve flip sign).
      const origSignX = start.width < 0 ? -1 : 1;
      const origSignY = start.height < 0 ? -1 : 1;
      const newItemW = Math.abs(start.width) * sx;
      const newItemH = Math.abs(start.height) * sy;

      // New AABB dimensions for this item (with new w/h, same rotation).
      const newItemAabbW = newItemW * cos + newItemH * sin;
      const newItemAabbH = newItemW * sin + newItemH * cos;

      // Start AABB dimensions for this item.
      const startItemAabbW = Math.abs(start.width) * cos + Math.abs(start.height) * sin;
      const startItemAabbH = Math.abs(start.width) * sin + Math.abs(start.height) * cos;

      // Start AABB edges for this item.
      const startItemLeft = start.x - startItemAabbW / 2;
      const startItemTop = start.y - startItemAabbH / 2;

      // The item's AABB offset from the fixed selection edge at start.
      // Scale this offset by the AABB scale factor to get the new offset.
      if (affectsX) {
        const startOffsetX = startItemLeft - fixedBoardX; // can be negative
        const newOffsetX = startOffsetX * sx;
        const newItemLeft = fixedBoardX + newOffsetX;
        item.x = newItemLeft + newItemAabbW / 2;
      }
      if (affectsY) {
        const startOffsetY = startItemTop - fixedBoardY;
        const newOffsetY = startOffsetY * sy;
        const newItemTop = fixedBoardY + newOffsetY;
        item.y = newItemTop + newItemAabbH / 2;
      }

      item.width = newItemW * origSignX;
      item.height = newItemH * origSignY;
      item.rotation = start.rotation;
      // Apply min/max bounds.
      this.applyItemBounds(item, start);
    }
    this.scheduleRender();
    this.emit("change", { type: "resize" });
  }

  /**
   * Apply min/max width/height bounds to an item. If the new size exceeds
   * the bounds, the size is clamped and the position is adjusted so the
   * fixed edge stays in place.
   */
  private applyItemBounds(item: BoardItem, start: BoardItem): void {
    const minW = start.minWidth ?? 0;
    const minH = start.minHeight ?? 0;
    const maxW = start.maxWidth ?? Infinity;
    const maxH = start.maxHeight ?? Infinity;

    // Clamp width (preserve sign for flip, but clamp magnitude).
    const wSign = item.width < 0 ? -1 : 1;
    const wMag = Math.abs(item.width);
    const clampedW = Math.max(minW, Math.min(maxW, wMag)) * wSign;
    // Clamp height similarly.
    const hSign = item.height < 0 ? -1 : 1;
    const hMag = Math.abs(item.height);
    const clampedH = Math.max(minH, Math.min(maxH, hMag)) * hSign;

    if (clampedW !== item.width || clampedH !== item.height) {
      // Adjust position to keep the fixed edge in place.
      // The difference in size is distributed from the center, so the center
      // shifts by half the difference toward the fixed edge.
      const dw = clampedW - item.width;
      const dh = clampedH - item.height;
      const rad = (item.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // Shift center by -dw/2, -dh/2 in local space (toward the fixed edge).
      item.x -= (dw / 2) * cos - (dh / 2) * sin;
      item.y -= (dw / 2) * sin + (dh / 2) * cos;
      item.width = clampedW;
      item.height = clampedH;
    }
  }

  private _spaceDown = false;
  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === " ") { this._spaceDown = true; this.canvas.style.cursor = "grab"; e.preventDefault(); }
    if (e.key === "Delete" || e.key === "Backspace") {
      for (const id of this.selectedIds) this.removeItem(id);
      e.preventDefault();
    }
    if (e.key === "Escape") { this.clearSelection(); }
    // Arrow keys nudge selected items.
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    if (e.key === "ArrowRight") dx = step;
    if (e.key === "ArrowUp") dy = -step;
    if (e.key === "ArrowDown") dy = step;
    if (dx !== 0 || dy !== 0) {
      for (const id of this.selectedIds) {
        const item = this.items.get(id);
        if (item) { item.x += dx; item.y += dy; }
      }
      this.scheduleRender();
      this.emit("change", { type: "nudge" });
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === " ") {
      this._spaceDown = false;
      this.canvas.style.cursor = "";
    }
  }

  /**
   * Register an overlay render callback. It's called at the end of every
   * `render()` frame, after items and selection overlays are drawn. This lets
   * consumers (e.g. NodesGraph) draw paths/connections on top of the board
   * as part of the same render cycle — no race conditions.
   */
  setOverlayRender(fn: (() => void) | null): void {
    this.overlayRenderFn = fn;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom.
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldZoom = this.view.zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = clamp(oldZoom * delta, 0.05, 10);
      // Zoom toward cursor.
      this.view.panX = mx - (mx - this.view.panX) * (newZoom / oldZoom);
      this.view.panY = my - (my - this.view.panY) * (newZoom / oldZoom);
      this.view.zoom = newZoom;
      this.emit("view", this.getView());
    } else {
      // Pan.
      this.view.panX -= e.deltaX;
      this.view.panY -= e.deltaY;
      this.emit("view", this.getView());
    }
    this.scheduleRender();
  }

  /** Hit test: find the topmost item at a board coordinate. */
  private hitTest(bx: number, by: number): BoardItem | null {
    const items = Array.from(this.items.values()).reverse();
    for (const item of items) {
      const latt = this.getGlobalLattice(item);
      if (bx >= latt.x && bx <= latt.x + latt.w && by >= latt.y && by <= latt.y + latt.h) {
        return item;
      }
    }
    return null;
  }

  // ---- Rendering ----

  private updateCanvasSize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private handleResize(): void {
    this.updateCanvasSize();
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this._destroyed || this._renderScheduled) return;
    this._renderScheduled = true;
    requestAnimationFrame(() => {
      this._renderScheduled = false;
      if (!this._destroyed) this.render();
    });
  }

  private render(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    // Background.
    ctx.fillStyle = this.options.background;
    ctx.fillRect(0, 0, w, h);
    // Grid.
    if (this.options.gridMode !== "none") this.renderGrid(w, h);
    // Items.
    ctx.save();
    ctx.translate(this.view.panX, this.view.panY);
    ctx.scale(this.view.zoom, this.view.zoom);
    for (const item of this.items.values()) {
      this.renderItem(item);
    }
    // Selection overlay (lattices + handles + pivot marker).
    this.renderSelectionOverlay();
    ctx.restore();
    // Rubber band (screen space).
    if (this.pointerState?.mode === "select" && this.pointerState.rubberBand) {
      const rb = this.pointerState.rubberBand;
      const x0 = rb.x0 * this.view.zoom + this.view.panX;
      const y0 = rb.y0 * this.view.zoom + this.view.panY;
      const x1 = rb.x1 * this.view.zoom + this.view.panX;
      const y1 = rb.y1 * this.view.zoom + this.view.panY;
      ctx.fillStyle = "rgba(217,255,102,0.1)";
      ctx.strokeStyle = "rgba(217,255,102,0.6)";
      ctx.lineWidth = 1;
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    }
    // Overlay render — consumers (e.g. NodesGraph) draw on top here.
    if (this.overlayRenderFn) {
      this.overlayRenderFn();
    }
  }

  private renderGrid(w: number, h: number): void {
    const ctx = this.ctx;
    const { gridSize, subGridDivisions, gridMode, zoom, panX, panY } = {
      ...this.options, ...this.view,
    };
    const subSize = gridSize / subGridDivisions;
    // Visible board coordinate range.
    const startX = -panX / zoom;
    const startY = -panY / zoom;
    const endX = startX + w / zoom;
    const endY = startY + h / zoom;
    // Sub-grid.
    const subStartCol = Math.floor(startX / subSize);
    const subEndCol = Math.ceil(endX / subSize);
    const subStartRow = Math.floor(startY / subSize);
    const subEndRow = Math.ceil(endY / subSize);

    if (gridMode === "dots") {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      const dotR = 1;
      for (let col = subStartCol; col <= subEndCol; col++) {
        for (let row = subStartRow; row <= subEndRow; row++) {
          const isMain = col % subGridDivisions === 0 && row % subGridDivisions === 0;
          const x = col * subSize * zoom + panX;
          const y = row * subSize * zoom + panY;
          ctx.beginPath();
          ctx.arc(x, y, isMain ? dotR + 0.5 : dotR, 0, Math.PI * 2);
          ctx.fillStyle = isMain ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)";
          ctx.fill();
        }
      }
    } else if (gridMode === "lines") {
      // Sub-grid lines.
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let col = subStartCol; col <= subEndCol; col++) {
        if (col % subGridDivisions === 0) continue;
        const x = col * subSize * zoom + panX;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let row = subStartRow; row <= subEndRow; row++) {
        if (row % subGridDivisions === 0) continue;
        const y = row * subSize * zoom + panY;
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
      // Main grid lines.
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const mainStartCol = Math.floor(startX / gridSize);
      const mainEndCol = Math.ceil(endX / gridSize);
      const mainStartRow = Math.floor(startY / gridSize);
      const mainEndRow = Math.ceil(endY / gridSize);
      for (let col = mainStartCol; col <= mainEndCol; col++) {
        const x = col * gridSize * zoom + panX;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let row = mainStartRow; row <= mainEndRow; row++) {
        const y = row * gridSize * zoom + panY;
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
  }

  private renderItem(item: BoardItem): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate((item.rotation * Math.PI) / 180);
    // Apply flip for negative dimensions via scale transform.
    const flipX = item.width < 0 ? -1 : 1;
    const flipY = item.height < 0 ? -1 : 1;
    ctx.scale(flipX, flipY);
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.selected ? "#D9FF66" : "rgba(0,0,0,0.4)";
    ctx.lineWidth = item.selected ? 2 / this.view.zoom : 1 / this.view.zoom;
    const w = Math.abs(item.width), h = Math.abs(item.height);
    if (item.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (item.type === "rect") {
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    } else if (item.type === "triangle") {
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render the selection overlay: per-item local + global lattices (gated by
   * `latticeDisplay`), 8 resize handles + a rotation handle on the selection
   * lattice (when local lattice is shown), and a pivot crosshair.
   */
  private renderSelectionOverlay(): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;
    const ctx = this.ctx;
    const lw = 1 / this.view.zoom;
    const showLocal = this.options.latticeDisplay === "local" || this.options.latticeDisplay === "both";
    const showGlobal = this.options.latticeDisplay === "global" || this.options.latticeDisplay === "both";

    if (selected.length === 1) {
      const item = selected[0];
      // Local lattice (rotated rect, dashed lemon)
      if (showLocal) {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.strokeStyle = "rgba(217,255,102,0.7)";
        ctx.lineWidth = lw;
        ctx.setLineDash([4 / this.view.zoom, 3 / this.view.zoom]);
        ctx.strokeRect(-item.width / 2, -item.height / 2, item.width, item.height);
        ctx.restore();
        ctx.setLineDash([]);
      }
      // Global lattice (AABB, dashed purple)
      if (showGlobal) {
        const glatt = this.getGlobalLattice(item);
        ctx.strokeStyle = "rgba(185,160,255,0.6)";
        ctx.lineWidth = lw;
        ctx.setLineDash([2 / this.view.zoom, 2 / this.view.zoom]);
        ctx.strokeRect(glatt.x, glatt.y, glatt.w, glatt.h);
        ctx.setLineDash([]);
      }
    } else {
      // Multi-selection: combined AABB serves as both local and global lattice.
      const lattice = this.getSelectionLattice();
      if (lattice) {
        if (showGlobal) {
          ctx.strokeStyle = "rgba(185,160,255,0.6)";
          ctx.lineWidth = lw;
          ctx.setLineDash([2 / this.view.zoom, 2 / this.view.zoom]);
          ctx.strokeRect(lattice.x, lattice.y, lattice.w, lattice.h);
          ctx.setLineDash([]);
        }
        if (showLocal) {
          ctx.strokeStyle = "rgba(217,255,102,0.7)";
          ctx.lineWidth = lw;
          ctx.setLineDash([4 / this.view.zoom, 3 / this.view.zoom]);
          ctx.strokeRect(lattice.x, lattice.y, lattice.w, lattice.h);
          ctx.setLineDash([]);
        }
      }
    }

    // Resize handles, rotation handle, and pivot marker — only when not "none".
    if (this.options.latticeDisplay !== "none") {
      if (showLocal) {
        // Resize handles on the global AABB.
        if (this.options.allowResize) {
          const aabb = this.getSelectionAABB();
          if (aabb) {
            this.drawResizeHandles(aabb);
          }
        }
        // Rotation handle on the local lattice.
        if (this.options.allowRotation) {
          const localLattice = this.getSelectionLattice();
          if (localLattice) {
            this.drawRotationHandle(localLattice);
          }
        }
        this.drawPivotMarker();
      }
    }
  }

  /** Draw 8 resize handles (white fill + dark border) on the lattice. */
  private drawResizeHandles(lattice: Lattice): void {
    const ctx = this.ctx;
    const handles = this.getLatticeHandles(lattice);
    const s = HANDLE_SIZE_PX / this.view.zoom;
    const names: HandleName[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#101014";
    ctx.lineWidth = 1 / this.view.zoom;
    for (const name of names) {
      const h = handles[name];
      ctx.fillRect(h.x - s / 2, h.y - s / 2, s, s);
      ctx.strokeRect(h.x - s / 2, h.y - s / 2, s, s);
    }
  }

  /** Draw the rotation handle above the top edge (lemon circle + connecting line). */
  private drawRotationHandle(lattice: Lattice): void {
    const ctx = this.ctx;
    const handles = this.getLatticeHandles(lattice);
    const rh = handles.rotate;
    const topCenter = handles.n;
    // Line from top edge to rotation handle.
    ctx.strokeStyle = "rgba(217,255,102,0.7)";
    ctx.lineWidth = 1 / this.view.zoom;
    ctx.beginPath();
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(rh.x, rh.y);
    ctx.stroke();
    // Circle.
    const r = ROTATE_HANDLE_RADIUS_PX / this.view.zoom;
    ctx.fillStyle = "#D9FF66";
    ctx.strokeStyle = "#101014";
    ctx.lineWidth = 1 / this.view.zoom;
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /** Draw the pivot crosshair. Global mode → selection pivot; local mode → each item's own pivot. */
  private drawPivotMarker(): void {
    const pivots: { x: number; y: number }[] = [];
    if (this.options.transformMode === "global") {
      const p = this.getSelectionPivotPosition();
      if (p) pivots.push(p);
    } else {
      for (const item of this.getSelectedItems()) {
        pivots.push(this.getItemPivotBoard(item));
      }
    }
    for (const p of pivots) this.drawCrosshair(p.x, p.y);
  }

  /** Draw a small lemon crosshair + ring at a board-space point. */
  private drawCrosshair(x: number, y: number): void {
    const ctx = this.ctx;
    const r = PIVOT_CROSSHAIR_RADIUS_PX / this.view.zoom;
    ctx.strokeStyle = "#D9FF66";
    ctx.lineWidth = 1.5 / this.view.zoom;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2 / this.view.zoom, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---- Events ----

  on(event: "selection" | "change" | "view", handler: Handler): void;
  on(event: string, handler: Handler): void {
    let set = this.listeners.get(event);
    if (!set) { set = new Set<Handler>(); this.listeners.set(event, set); }
    set.add(handler);
  }
  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("pointercancel", this._onPointerUp);
    this.canvas.removeEventListener("wheel", this._onWheel);
    this.canvas.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.overlayRenderFn = null;
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    this.listeners.clear();
    this.items.clear();
    this.selectedIds.clear();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.container.classList.remove("board-root");
  }

  private emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(data); } catch (err) { console.error("Board listener error:", err); }
    }
  }
}
