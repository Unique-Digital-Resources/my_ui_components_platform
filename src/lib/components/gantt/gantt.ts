/**
 * GanttTimeline — a Gantt Chart Timeline Bars component (vanilla TypeScript).
 *
 * Spec reference: §15 Minimum viable specification.
 *
 *   - Display generic items as horizontal bars.
 *   - Configure start and end fields independently of item content.
 *   - Map time intervals to a shared horizontal coordinate system.
 *   - Support configurable visible range, scale, and scrolling.
 *   - Support optional row assignment and row headers.
 *   - Provide a minimal default bar appearance.
 *   - Allow custom templates without requiring them.
 *   - Keep bar geometry independent of rendered content.
 *   - Support selection and optional move/resize interactions.
 *   - Define interval validation, snapping, and time-zone behavior.
 *   - Expose view-range, scale, selection, move, and resize events.
 *   - Support responsive layout and usable targets for short bars.
 *   - Provide keyboard alternatives and accessible item descriptions.
 *   - Separate visualization behavior from scheduling logic and persistence.
 *
 * Architecture: single-file DOM-based renderer with scoped CSS (`.gantt-`
 * prefix). Time is epoch milliseconds (number) throughout — the host converts
 * to/from timezones. The time-to-pixel mapping is linear: x(t) = W * (t - T0)
 * / (T1 - T0). Bar content is laid out by the content-template system
 * (src/lib/templates/); pass "none" to use native rendering (plain bar).
 */

import {
  templateRegistry,
  rendererRegistry,
  slotVisible,
  type ContentTemplate,
  type TemplateDensity,
} from "@/lib/templates";

// ---- Public types ----

export type GanttScale = "hour" | "day" | "week" | "month" | "quarter" | "year";
export type GanttSelectionMode = "none" | "single";
export type GanttAxisPosition = "top" | "bottom";
export type GanttResizeEndpoint = "start" | "end";

export interface GanttItem {
  id: string;
  /** Start time as epoch milliseconds. */
  start: number;
  /** End time as epoch milliseconds. Must be >= start. */
  end: number;
  /** Row assignment. If omitted, the item is placed in the default row. */
  rowId?: string;
  /** Optional title for the default bar template and aria-label. */
  title?: string;
  /** Optional bar color (any CSS color). Overrides the default bar color. */
  color?: string;
  /** Optional progress 0–100. Renders a progress overlay when progressEnabled is true. */
  progress?: number;
  /** Optional flag to disable interactions on this specific bar. */
  disabled?: boolean;
  [key: string]: unknown;
}

export interface GanttRow {
  id: string;
  title?: string;
  color?: string;
  collapsed?: boolean;
}

export interface GanttOptions {
  items?: GanttItem[];
  rows?: GanttRow[];
  viewStart?: number;
  viewEnd?: number;
  scale?: GanttScale;
  showRowHeaders?: boolean;
  rowHeaderWidth?: number;
  rowHeight?: number;
  barHeight?: number;
  barGap?: number;
  rowGap?: number;
  barMinWidth?: number;
  selectable?: boolean;
  selectionMode?: GanttSelectionMode;
  movable?: boolean;
  resizable?: boolean;
  rowMovable?: boolean;
  snapInterval?: number;
  showGrid?: boolean;
  showToday?: boolean;
  showAxis?: boolean;
  axisPosition?: GanttAxisPosition;
  readOnly?: boolean;
  disabled?: boolean;
  progressEnabled?: boolean;
  minDuration?: number;
  templateId?: string;
}

export interface GanttEventPayload {
  type?: string;
  itemId?: string | null;
  previousItemId?: string | null;
  itemIds?: string[];
  previousItemIds?: string[];
  rowId?: string | null;
  previousRowId?: string | null;
  targetRowId?: string | null;
  start?: number;
  end?: number;
  oldStart?: number;
  oldEnd?: number;
  newStart?: number;
  newEnd?: number;
  endpoint?: GanttResizeEndpoint;
  viewStart?: number;
  viewEnd?: number;
  scale?: GanttScale;
  reason?: string;
  source?: "pointer" | "keyboard" | "programmatic";
  operation?: "move" | "resize-start" | "resize-end" | "row-change";
}

export type GanttHandler = (payload: GanttEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "gantt-styles";

/**
 * Sentinel template ID for native rendering (no content template). The bar
 * shows a plain colored fill with no templated content inside. Like the
 * Kanban's KANBAN_TEMPLATE_NONE, this demonstrates that the component is
 * independent of the template system.
 */
export const GANTT_TEMPLATE_NONE = "none";

/** One day in milliseconds. */
const DAY_MS = 86_400_000;
/** One hour in milliseconds. */
const HOUR_MS = 3_600_000;

/** Default snap intervals per scale (in ms). */
const SCALE_SNAP: Record<GanttScale, number> = {
  hour: HOUR_MS,
  day: DAY_MS,
  week: 7 * DAY_MS,
  month: 30 * DAY_MS,
  quarter: 90 * DAY_MS,
  year: 365 * DAY_MS,
};

/** Header label format per scale. */
const SCALE_FORMAT: Record<GanttScale, (t: number, locale: string) => string> = {
  hour: (t, l) => new Date(t).toLocaleString(l, { month: "short", day: "numeric", hour: "2-digit" }),
  day: (t, l) => new Date(t).toLocaleDateString(l, { month: "short", day: "numeric" }),
  week: (t, l) => new Date(t).toLocaleDateString(l, { month: "short", day: "numeric" }),
  month: (t, l) => new Date(t).toLocaleDateString(l, { month: "short", year: "numeric" }),
  quarter: (t, l) => {
    const d = new Date(t);
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear()}`;
  },
  year: (t) => String(new Date(t).getFullYear()),
};

/** Minor tick interval per scale (for grid lines). */
const SCALE_TICK: Record<GanttScale, number> = {
  hour: HOUR_MS,
  day: 6 * HOUR_MS,
  week: DAY_MS,
  month: 7 * DAY_MS,
  quarter: 30 * DAY_MS,
  year: 90 * DAY_MS,
};

/** Major tick interval per scale (for axis labels). */
const SCALE_MAJOR_TICK: Record<GanttScale, number> = {
  hour: DAY_MS,
  day: 7 * DAY_MS,
  week: 30 * DAY_MS,
  month: 90 * DAY_MS,
  quarter: 365 * DAY_MS,
  year: 365 * DAY_MS * 2,
};

// ---- Style injection (scoped CSS, .gantt- prefix) ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.gantt-timeline {
  --gt-bg: #101014;
  --gt-surface: #211A30;
  --gt-surface-2: #2A2238;
  --gt-surface-3: #342348;
  --gt-border: #383343;
  --gt-text: #F4F1FF;
  --gt-muted: #B8B2CA;
  --gt-accent: #D9FF66;
  --gt-accent-hover: #C8F34F;
  --gt-danger: #FF858B;
  --gt-warn: #FFD36B;
  --gt-ok: #8FE3A5;
  --gt-bar: #6B5FA8;
  --gt-bar-2: #8B7FC8;
  --gt-radius: 6px;
  font-family: inherit;
  color: var(--gt-text);
  background: var(--gt-bg);
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}
.gantt-timeline * { box-sizing: border-box; }
.gantt-timeline.gantt-disabled { opacity: 0.55; pointer-events: none; }
.gantt-timeline.gantt-readonly .gantt-bar { cursor: default; }

/* Layout: axis (optional) + body (row headers + scrollable timeline grid) */
.gantt-axis {
  flex: 0 0 auto;
  display: flex;
  border-bottom: 1px solid var(--gt-border);
  background: var(--gt-surface);
  overflow: hidden;
}
.gantt-timeline.gantt-axis-bottom .gantt-axis {
  border-bottom: none;
  border-top: 1px solid var(--gt-border);
  order: 2;
}
.gantt-axis-spacer {
  flex: 0 0 auto;
  border-right: 1px solid var(--gt-border);
  background: var(--gt-surface-2);
}
.gantt-axis-labels {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
  height: 44px;
}
.gantt-axis-major {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--gt-text);
  white-space: nowrap;
  border-left: 1px solid var(--gt-border);
}
.gantt-axis-minor {
  position: absolute;
  top: 50%;
  bottom: 0;
  width: 1px;
  background: var(--gt-border);
  opacity: 0.5;
}

/* Body: row headers + scrollable grid */
.gantt-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.gantt-row-headers {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--gt-border);
  background: var(--gt-surface-2);
  overflow: hidden;
}
.gantt-row-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--gt-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid var(--gt-border);
  flex: 0 0 auto;
}
.gantt-row-header-color {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--gt-muted);
  flex: 0 0 auto;
}
.gantt-row-header-title {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gantt-row-header-count {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  color: var(--gt-muted);
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--gt-surface-3);
  flex: 0 0 auto;
}
.gantt-row-header-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--gt-muted);
  font-style: italic;
}

/* Scrollable timeline grid */
.gantt-scroll {
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  scrollbar-width: thin;
  position: relative;
}
.gantt-grid {
  position: relative;
  min-width: 100%;
}
.gantt-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--gt-border);
  opacity: 0.4;
  pointer-events: none;
}
.gantt-grid-line-major {
  opacity: 0.7;
}
.gantt-row {
  position: relative;
  border-bottom: 1px solid var(--gt-border);
  overflow: hidden;
}
.gantt-row:last-child {
  border-bottom: none;
}
.gantt-row.gantt-drop-target {
  background: color-mix(in srgb, var(--gt-accent) 6%, transparent);
}

/* Bars */
.gantt-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--gt-bar);
  border: 1px solid var(--gt-border);
  border-radius: 4px;
  cursor: grab;
  outline: none;
  transition: box-shadow 120ms ease, border-color 120ms ease;
  padding: 0 8px;
  gap: 6px;
  user-select: none;
}
.gantt-bar:hover {
  border-color: var(--gt-accent);
}
.gantt-bar:focus-visible {
  border-color: var(--gt-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--gt-accent) 40%, transparent);
  z-index: 5;
}
.gantt-bar.gantt-selected {
  border-color: var(--gt-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--gt-accent) 50%, transparent);
  z-index: 4;
}
.gantt-bar.gantt-dragging {
  opacity: 0.85;
  cursor: grabbing;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.gantt-bar.gantt-readonly-bar { cursor: default; }
.gantt-bar.gantt-disabled-bar { opacity: 0.4; cursor: not-allowed; }
.gantt-bar.gantt-preview {
  opacity: 0.5;
  pointer-events: none;
  border-style: dashed;
}

/* Progress overlay */
.gantt-bar-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--gt-accent) 35%, transparent);
  pointer-events: none;
  border-right: 1px solid var(--gt-accent);
}

/* Bar content */
.gantt-bar-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}
.gantt-bar-title {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* Resize handles */
.gantt-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gantt-resize-handle-left {
  left: 0;
  border-left: 2px solid transparent;
}
.gantt-resize-handle-right {
  right: 0;
  border-right: 2px solid transparent;
}
.gantt-resize-handle:hover,
.gantt-resize-handle.gantt-active {
  border-color: var(--gt-accent);
}
.gantt-resize-handle::after {
  content: '';
  width: 2px;
  height: 12px;
  background: rgba(255,255,255,0.4);
  border-radius: 1px;
}
.gantt-resize-handle:hover::after,
.gantt-resize-handle.gantt-active::after {
  background: var(--gt-accent);
}

/* Today marker */
.gantt-today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--gt-danger);
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gt-danger) 30%, transparent);
}
.gantt-today-label {
  position: absolute;
  top: 2px;
  left: 4px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 9px;
  font-weight: 600;
  color: var(--gt-danger);
  background: var(--gt-bg);
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

/* Empty state */
.gantt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  font-size: 12px;
  color: var(--gt-muted);
  font-style: italic;
}

/* Drag preview ghost */
.gantt-drag-ghost {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: var(--gt-bar-h, 24px);
  border: 2px dashed var(--gt-accent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--gt-accent) 10%, transparent);
  pointer-events: none;
  z-index: 9;
}

@media (prefers-reduced-motion: reduce) {
  .gantt-bar { transition: none; }
}
`;
  document.head.appendChild(el);
}

// ---- Utilities ----

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Snap a time (epoch ms) to the nearest multiple of snapInterval. */
function snapTime(t: number, snap: number): number {
  if (!snap || snap <= 0) return t;
  return Math.round(t / snap) * snap;
}

// ---- Component ----

export class GanttTimeline {
  private container: HTMLElement;
  private root!: HTMLDivElement;
  private opts: Required<GanttOptions>;
  private items: GanttItem[];
  private rows: GanttRow[];
  private selectedItemId: string | null = null;
  private listeners = new Map<string, Set<GanttHandler>>();
  private barEls = new Map<string, HTMLElement>();
  private rowEls = new Map<string, HTMLElement>();
  private _destroyed = false;
  private gridEl!: HTMLDivElement;
  private scrollEl!: HTMLDivElement;
  private axisLabelsEl!: HTMLDivElement;
  private todayEl: HTMLDivElement | null = null;

  // Drag state
  private dragItemId: string | null = null;
  private dragMode: "move" | "resize-start" | "resize-end" | null = null;
  private dragStartX = 0;
  private dragOriginalStart = 0;
  private dragOriginalEnd = 0;
  private dragOriginalRowId: string | null = null;
  private dragGhostEl: HTMLDivElement | null = null;
  private dragHappened = false;

  constructor(container: HTMLElement, options: GanttOptions = {}) {
    this.container = container;
    injectStyles();

    // Default view range: 30 days centered on today if not provided.
    const now = Date.now();
    const defaultViewStart = now - 15 * DAY_MS;
    const defaultViewEnd = now + 15 * DAY_MS;

    this.opts = {
      items: options.items ?? [],
      rows: options.rows ?? [],
      viewStart: options.viewStart ?? defaultViewStart,
      viewEnd: options.viewEnd ?? defaultViewEnd,
      scale: options.scale ?? "day",
      showRowHeaders: options.showRowHeaders ?? true,
      rowHeaderWidth: options.rowHeaderWidth ?? 160,
      rowHeight: options.rowHeight ?? 48,
      barHeight: options.barHeight ?? 28,
      barGap: options.barGap ?? 4,
      rowGap: options.rowGap ?? 0,
      barMinWidth: options.barMinWidth ?? 12,
      selectable: options.selectable ?? true,
      selectionMode: options.selectionMode ?? "single",
      movable: options.movable ?? true,
      resizable: options.resizable ?? true,
      rowMovable: options.rowMovable ?? false,
      snapInterval: options.snapInterval ?? SCALE_SNAP[options.scale ?? "day"],
      showGrid: options.showGrid ?? true,
      showToday: options.showToday ?? true,
      showAxis: options.showAxis ?? true,
      axisPosition: options.axisPosition ?? "top",
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      progressEnabled: options.progressEnabled ?? true,
      minDuration: options.minDuration ?? 0,
      templateId: options.templateId ?? "gantt.standard-bar",
    };

    // Defensive clone
    this.items = (this.opts.items as GanttItem[]).map((it) => ({ ...it }));
    this.rows = (this.opts.rows as GanttRow[]).map((r) => ({ ...r }));

    // If no rows provided, create a single default row
    if (this.rows.length === 0) {
      this.rows = [{ id: "default", title: "Timeline" }];
    }

    this.render();
  }

  // ---- Time-to-pixel mapping ----

  /** Convert a time (epoch ms) to a pixel x within the grid. */
  private timeToX(t: number): number {
    const range = this.opts.viewEnd - this.opts.viewStart;
    if (range <= 0) return 0;
    return ((t - this.opts.viewStart) / range) * this.getGridWidth();
  }

  /** Convert a pixel x to a time (epoch ms). */
  private xToTime(x: number): number {
    const w = this.getGridWidth();
    if (w <= 0) return this.opts.viewStart;
    return this.opts.viewStart + (x / w) * (this.opts.viewEnd - this.opts.viewStart);
  }

  /** The grid width in pixels. At least the scroll container's clientWidth. */
  private getGridWidth(): number {
    if (!this.scrollEl) return 0;
    return Math.max(this.scrollEl.clientWidth, this.opts.rowHeaderWidth ? 0 : 0) || this.scrollEl.clientWidth;
  }

  // ---- Rendering ----

  private render(): void {
    if (this._destroyed) return;
    this.barEls.clear();
    this.rowEls.clear();

    const root = document.createElement("div");
    root.className = "gantt-timeline";
    if (this.opts.axisPosition === "bottom") root.classList.add("gantt-axis-bottom");
    if (this.opts.readOnly) root.classList.add("gantt-readonly");
    if (this.opts.disabled) root.classList.add("gantt-disabled");
    root.style.setProperty("--gt-bar-h", `${this.opts.barHeight}px`);

    // Axis
    if (this.opts.showAxis) {
      const axis = document.createElement("div");
      axis.className = "gantt-axis";
      if (this.opts.showRowHeaders) {
        const spacer = document.createElement("div");
        spacer.className = "gantt-axis-spacer";
        spacer.style.width = `${this.opts.rowHeaderWidth}px`;
        axis.appendChild(spacer);
      }
      const labels = document.createElement("div");
      labels.className = "gantt-axis-labels";
      this.renderAxisLabels(labels);
      axis.appendChild(labels);
      root.appendChild(axis);
    }

    // Body
    const body = document.createElement("div");
    body.className = "gantt-body";

    // Row headers
    if (this.opts.showRowHeaders) {
      const headers = document.createElement("div");
      headers.className = "gantt-row-headers";
      headers.style.width = `${this.opts.rowHeaderWidth}px`;
      for (const row of this.rows) {
        const h = document.createElement("div");
        h.className = "gantt-row-header";
        h.style.height = `${this.opts.rowHeight}px`;
        if (row.color) {
          const dot = document.createElement("span");
          dot.className = "gantt-row-header-color";
          dot.style.background = row.color;
          h.appendChild(dot);
        }
        const title = document.createElement("span");
        title.className = "gantt-row-header-title";
        title.textContent = row.title ?? row.id;
        h.appendChild(title);
        const count = this.items.filter((it) => (it.rowId ?? "default") === row.id).length;
        const countEl = document.createElement("span");
        countEl.className = "gantt-row-header-count";
        countEl.textContent = String(count);
        h.appendChild(countEl);
        headers.appendChild(h);
      }
      body.appendChild(headers);
    }

    // Scrollable grid
    const scroll = document.createElement("div");
    scroll.className = "gantt-scroll";
    scroll.addEventListener("scroll", () => {
      if (this.opts.showAxis) {
        this.axisLabelsEl.style.transform = `translateX(${-scroll.scrollLeft}px)`;
      }
    });
    this.scrollEl = scroll;

    const grid = document.createElement("div");
    grid.className = "gantt-grid";
    grid.style.minWidth = "100%";
    grid.style.width = `${this.getGridWidth()}px`;
    this.gridEl = grid;

    // Grid lines
    if (this.opts.showGrid) {
      this.renderGridLines(grid);
    }

    // Rows + bars
    for (const row of this.rows) {
      const rowEl = this.renderRow(row);
      grid.appendChild(rowEl);
      this.rowEls.set(row.id, rowEl);
    }

    // Today marker
    if (this.opts.showToday) {
      this.renderTodayMarker(grid);
    }

    scroll.appendChild(grid);
    body.appendChild(scroll);
    root.appendChild(body);

    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;

    // After layout, set the grid width to match or exceed the scroll width
    requestAnimationFrame(() => {
      if (!this._destroyed) this.updateGridWidth();
    });
  }

  private updateGridWidth(): void {
    if (!this.gridEl || !this.scrollEl) return;
    const w = this.scrollEl.clientWidth;
    this.gridEl.style.width = `${w}px`;
    // Re-position bars after width change
    this.positionAllBars();
    if (this.opts.showAxis) this.renderAxisLabels(this.axisLabelsEl);
    if (this.opts.showGrid) this.renderGridLines(this.gridEl);
    if (this.opts.showToday) this.renderTodayMarker(this.gridEl);
  }

  private renderAxisLabels(container: HTMLElement): void {
    container.innerHTML = "";
    this.axisLabelsEl = container as HTMLDivElement;
    const w = container.clientWidth || this.getGridWidth();
    const majorTick = SCALE_MAJOR_TICK[this.opts.scale];
    const start = Math.ceil(this.opts.viewStart / majorTick) * majorTick;
    for (let t = start; t <= this.opts.viewEnd; t += majorTick) {
      const x = ((t - this.opts.viewStart) / (this.opts.viewEnd - this.opts.viewStart)) * w;
      const label = document.createElement("div");
      label.className = "gantt-axis-major";
      label.textContent = SCALE_FORMAT[this.opts.scale](t, "en-US");
      label.style.left = `${x}px`;
      container.appendChild(label);
    }
  }

  private renderGridLines(grid: HTMLElement): void {
    // Remove old grid lines
    grid.querySelectorAll(".gantt-grid-line").forEach((el) => el.remove());
    const w = this.gridEl.clientWidth || this.getGridWidth();
    const minorTick = SCALE_TICK[this.opts.scale];
    const majorTick = SCALE_MAJOR_TICK[this.opts.scale];
    const start = Math.ceil(this.opts.viewStart / minorTick) * minorTick;
    for (let t = start; t <= this.opts.viewEnd; t += minorTick) {
      const x = ((t - this.opts.viewStart) / (this.opts.viewEnd - this.opts.viewStart)) * w;
      const line = document.createElement("div");
      line.className = "gantt-grid-line";
      if (t % majorTick === 0) line.classList.add("gantt-grid-line-major");
      line.style.left = `${x}px`;
      grid.appendChild(line);
    }
  }

  private renderTodayMarker(grid: HTMLElement): void {
    if (this.todayEl) this.todayEl.remove();
    const now = Date.now();
    if (now < this.opts.viewStart || now > this.opts.viewEnd) return;
    const x = this.timeToX(now);
    const marker = document.createElement("div");
    marker.className = "gantt-today";
    marker.style.left = `${x}px`;
    const label = document.createElement("div");
    label.className = "gantt-today-label";
    label.textContent = "Today";
    marker.appendChild(label);
    grid.appendChild(marker);
    this.todayEl = marker;
  }

  private renderRow(row: GanttRow): HTMLElement {
    const el = document.createElement("div");
    el.className = "gantt-row";
    el.setAttribute("data-row-id", row.id);
    el.style.height = `${this.opts.rowHeight}px`;

    const rowItems = this.items.filter((it) => (it.rowId ?? "default") === row.id);
    if (rowItems.length === 0) {
      // Keep the row but don't render an empty-state inside the grid (would
      // be clipped). The row header shows the count.
    }
    for (const item of rowItems) {
      const barEl = this.renderBar(item, row);
      el.appendChild(barEl);
      this.barEls.set(item.id, barEl);
    }
    return el;
  }

  private renderBar(item: GanttItem, _row: GanttRow): HTMLElement {
    const el = document.createElement("div");
    el.className = "gantt-bar";
    el.setAttribute("data-item-id", item.id);
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", this.opts.readOnly ? "-1" : "0");
    el.setAttribute(
      "aria-label",
      this.buildBarAriaLabel(item),
    );
    if (this.selectedItemId === item.id) el.classList.add("gantt-selected");
    if (this.opts.readOnly) el.classList.add("gantt-readonly-bar");
    if (item.disabled) el.classList.add("gantt-disabled-bar");
    if (item.color) el.style.background = item.color;

    // Progress overlay
    if (this.opts.progressEnabled && typeof item.progress === "number" && item.progress > 0) {
      const prog = document.createElement("div");
      prog.className = "gantt-bar-progress";
      prog.style.width = `${clamp(item.progress, 0, 100)}%`;
      el.appendChild(prog);
    }

    // Templated content
    const tpl = this.getTemplate();
    const density: TemplateDensity = "standard";
    const hostState = {
      readOnly: this.opts.readOnly,
      movable: this.opts.movable,
      resizable: this.opts.resizable,
      scale: this.opts.scale,
    };
    if (tpl) {
      for (const slot of tpl.slots) {
        if (!slotVisible(slot, density)) continue;
        const renderer = rendererRegistry.get(slot.renderer);
        if (!renderer) continue;
        const slotEl = renderer({ item, slot, density, host: hostState });
        if (slotEl) {
          slotEl.style.pointerEvents = "none";
          el.appendChild(slotEl);
        }
      }
    } else {
      // Native rendering: plain bar with optional title
      if (item.title) {
        const title = document.createElement("div");
        title.className = "gantt-bar-title";
        title.textContent = item.title;
        el.appendChild(title);
      }
    }

    // Resize handles
    if (this.opts.resizable && !this.opts.readOnly && !item.disabled) {
      const left = document.createElement("div");
      left.className = "gantt-resize-handle gantt-resize-handle-left";
      left.setAttribute("role", "slider");
      left.setAttribute("aria-label", `Resize start of ${item.title ?? item.id}`);
      left.addEventListener("pointerdown", (e) => this.onResizeStart(e, item, "start"));
      el.appendChild(left);

      const right = document.createElement("div");
      right.className = "gantt-resize-handle gantt-resize-handle-right";
      right.setAttribute("role", "slider");
      right.setAttribute("aria-label", `Resize end of ${item.title ?? item.id}`);
      right.addEventListener("pointerdown", (e) => this.onResizeStart(e, item, "end"));
      el.appendChild(right);
    }

    // Pointer interactions
    if (!this.opts.readOnly && !item.disabled) {
      el.addEventListener("pointerdown", (e) => this.onBarPointerDown(e, item));
      el.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".gantt-resize-handle")) return;
        if (this.opts.selectable) this.selectBar(item.id, "pointer");
      });
      el.addEventListener("dblclick", () => {
        this.emit("bar_activated", { itemId: item.id, source: "pointer" });
      });
      el.addEventListener("keydown", (e) => this.onBarKeyDown(e, item));
    } else if (this.opts.selectable) {
      el.addEventListener("click", () => this.selectBar(item.id, "pointer"));
    }

    // Position the bar
    this.positionBar(el, item);
    return el;
  }

  private positionBar(el: HTMLElement, item: GanttItem): void {
    const x = this.timeToX(item.start);
    const w = Math.max(this.timeToX(item.end) - x, this.opts.barMinWidth);
    el.style.left = `${x}px`;
    el.style.width = `${w}px`;
    el.style.height = `${this.opts.barHeight}px`;
  }

  private positionAllBars(): void {
    for (const [id, el] of this.barEls) {
      const item = this.findItem(id);
      if (item) this.positionBar(el, item);
    }
  }

  private buildBarAriaLabel(item: GanttItem): string {
    const parts: string[] = [];
    if (item.title) parts.push(item.title);
    const fmt = (t: number) => new Date(t).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    parts.push(`${fmt(item.start)} to ${fmt(item.end)}`);
    if (typeof item.progress === "number") parts.push(`${Math.round(item.progress)}% complete`);
    return parts.join(", ");
  }

  // ---- Template accessors ----

  getTemplate(): ContentTemplate | undefined {
    return templateRegistry.get(this.opts.templateId);
  }

  getTemplateId(): string {
    return this.opts.templateId;
  }

  setTemplateId(id: string): void {
    if (this._destroyed) return;
    if (id !== GANTT_TEMPLATE_NONE && !templateRegistry.has(id)) return;
    if (this.opts.templateId === id) return;
    this.opts.templateId = id;
    this.render();
  }

  // ---- Selection ----

  selectBar(itemId: string | null, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (!this.opts.selectable) return;
    const prev = this.selectedItemId;
    if (itemId !== null && !this.findItem(itemId)) return;
    this.selectedItemId = itemId;
    this.barEls.forEach((el, id) => {
      el.classList.toggle("gantt-selected", id === itemId);
    });
    if (prev !== itemId) {
      this.emit("bar_selected", { itemId, previousItemId: prev, source });
      this.emit("selection_changed", {
        itemIds: itemId ? [itemId] : [],
        previousItemIds: prev ? [prev] : [],
        source,
      });
    }
  }

  clearSelection(): void {
    this.selectBar(null, "programmatic");
  }

  getSelectedBar(): string | null {
    return this.selectedItemId;
  }

  // ---- Move / resize ----

  moveBar(itemId: string, newStart: number, newEnd: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (this.opts.readOnly) {
      this.emit("bar_move_rejected", { itemId, start: newStart, end: newEnd, reason: "read_only", source });
      return;
    }
    const item = this.findItem(itemId);
    if (!item) {
      this.emit("bar_move_rejected", { itemId, start: newStart, end: newEnd, reason: "invalid_item", source });
      return;
    }
    if (newEnd < newStart) {
      this.emit("bar_move_rejected", { itemId, start: newStart, end: newEnd, reason: "invalid_interval", source });
      return;
    }
    if (this.opts.minDuration > 0 && newEnd - newStart < this.opts.minDuration) {
      this.emit("bar_move_rejected", { itemId, start: newStart, end: newEnd, reason: "min_duration", source });
      return;
    }
    const oldStart = item.start;
    const oldEnd = item.end;
    item.start = newStart;
    item.end = newEnd;
    const el = this.barEls.get(itemId);
    if (el) this.positionBar(el, item);
    this.emit("bar_moved", { itemId, oldStart, oldEnd, newStart, newEnd, source });
  }

  resizeBar(itemId: string, endpoint: GanttResizeEndpoint, time: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (this.opts.readOnly || !this.opts.resizable) {
      this.emit("bar_move_rejected", { itemId, endpoint, reason: "read_only", source });
      return;
    }
    const item = this.findItem(itemId);
    if (!item) {
      this.emit("bar_move_rejected", { itemId, endpoint, reason: "invalid_item", source });
      return;
    }
    const oldStart = item.start;
    const oldEnd = item.end;
    if (endpoint === "start") {
      const newStart = Math.min(time, item.end - (this.opts.minDuration || 1));
      if (newStart >= item.end) {
        this.emit("bar_move_rejected", { itemId, endpoint, reason: "invalid_interval", source });
        return;
      }
      item.start = newStart;
    } else {
      const newEnd = Math.max(time, item.start + (this.opts.minDuration || 1));
      if (newEnd <= item.start) {
        this.emit("bar_move_rejected", { itemId, endpoint, reason: "invalid_interval", source });
        return;
      }
      item.end = newEnd;
    }
    const el = this.barEls.get(itemId);
    if (el) this.positionBar(el, item);
    this.emit("bar_resized", { itemId, oldStart, oldEnd, newStart: item.start, newEnd: item.end, endpoint, source });
  }

  moveBarToRow(itemId: string, rowId: string, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (this.opts.readOnly || !this.opts.rowMovable) {
      this.emit("bar_move_rejected", { itemId, targetRowId: rowId, reason: "row_movable_disabled", source });
      return;
    }
    const item = this.findItem(itemId);
    if (!item) return;
    const row = this.findRow(rowId);
    if (!row) {
      this.emit("bar_move_rejected", { itemId, targetRowId: rowId, reason: "invalid_row", source });
      return;
    }
    const prevRowId = item.rowId ?? "default";
    if (prevRowId === rowId) return;
    item.rowId = rowId;
    this.render();
    this.emit("bar_row_changed", { itemId, previousRowId: prevRowId, rowId, source });
  }

  // ---- View range / zoom ----

  setViewRange(start: number, end: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (end <= start) return;
    this.opts.viewStart = start;
    this.opts.viewEnd = end;
    this.render();
    this.emit("view_range_changed", { viewStart: start, viewEnd: end, source });
  }

  setScale(scale: GanttScale): void {
    if (this._destroyed) return;
    this.opts.scale = scale;
    this.opts.snapInterval = SCALE_SNAP[scale];
    this.render();
    this.emit("scale_changed", { scale });
  }

  zoomIn(): void {
    const center = (this.opts.viewStart + this.opts.viewEnd) / 2;
    const range = (this.opts.viewEnd - this.opts.viewStart) / 2;
    this.setViewRange(center - range / 2, center + range / 2, "programmatic");
  }

  zoomOut(): void {
    const center = (this.opts.viewStart + this.opts.viewEnd) / 2;
    const range = (this.opts.viewEnd - this.opts.viewStart) / 2;
    this.setViewRange(center - range * 2, center + range * 2, "programmatic");
  }

  fitToRange(start: number, end: number): void {
    this.setViewRange(start - (end - start) * 0.05, end + (end - start) * 0.05, "programmatic");
  }

  navigateTo(time: number): void {
    const range = this.opts.viewEnd - this.opts.viewStart;
    this.setViewRange(time - range / 2, time + range / 2, "programmatic");
  }

  today(): void {
    this.navigateTo(Date.now());
  }

  // ---- Data accessors ----

  setItems(items: GanttItem[]): void {
    if (this._destroyed) return;
    this.items = items.map((it) => ({ ...it }));
    this.render();
  }

  setRows(rows: GanttRow[]): void {
    if (this._destroyed) return;
    this.rows = rows.map((r) => ({ ...r }));
    if (this.rows.length === 0) {
      this.rows = [{ id: "default", title: "Timeline" }];
    }
    this.render();
  }

  getItems(): GanttItem[] {
    return this.items.map((it) => ({ ...it }));
  }

  getRows(): GanttRow[] {
    return this.rows.map((r) => ({ ...r }));
  }

  getViewRange(): { start: number; end: number } {
    return { start: this.opts.viewStart, end: this.opts.viewEnd };
  }

  // ---- Helpers ----

  private findItem(itemId: string): GanttItem | undefined {
    return this.items.find((it) => it.id === itemId);
  }

  private findRow(rowId: string): GanttRow | undefined {
    return this.rows.find((r) => r.id === rowId);
  }

  // ---- Pointer interactions ----

  private onBarPointerDown(e: PointerEvent, item: GanttItem): void {
    if (this.opts.readOnly || item.disabled) return;
    const target = e.target as HTMLElement;
    if (target.closest(".gantt-resize-handle")) return;
    if (!this.opts.movable) return;
    e.preventDefault();
    this.dragItemId = item.id;
    this.dragMode = "move";
    this.dragStartX = e.clientX;
    this.dragOriginalStart = item.start;
    this.dragOriginalEnd = item.end;
    this.dragOriginalRowId = item.rowId ?? "default";
    this.dragHappened = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const barEl = this.barEls.get(item.id);
    if (barEl) barEl.classList.add("gantt-dragging");
    this.emit("drag_started", { itemId: item.id, operation: "move", source: "pointer" });

    const onMove = (ev: PointerEvent) => this.onDragMove(ev);
    const onUp = (ev: PointerEvent) => {
      this.onDragEnd(ev, onMove, onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private onResizeStart(e: PointerEvent, item: GanttItem, endpoint: GanttResizeEndpoint): void {
    if (this.opts.readOnly || item.disabled || !this.opts.resizable) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragItemId = item.id;
    this.dragMode = endpoint === "start" ? "resize-start" : "resize-end";
    this.dragStartX = e.clientX;
    this.dragOriginalStart = item.start;
    this.dragOriginalEnd = item.end;
    this.dragHappened = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const handle = e.target as HTMLElement;
    handle.classList.add("gantt-active");
    this.emit("drag_started", { itemId: item.id, operation: this.dragMode, source: "pointer" });

    const onMove = (ev: PointerEvent) => this.onDragMove(ev);
    const onUp = (ev: PointerEvent) => {
      handle.classList.remove("gantt-active");
      this.onDragEnd(ev, onMove, onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private onDragMove(e: PointerEvent): void {
    if (!this.dragItemId || !this.dragMode) return;
    const item = this.findItem(this.dragItemId);
    if (!item) return;
    const dx = e.clientX - this.dragStartX;
    if (Math.abs(dx) < 2 && !this.dragHappened) return;
    this.dragHappened = true;

    const dt = this.xToTime(this.timeToX(this.dragOriginalStart) + dx) - this.dragOriginalStart;
    const snap = this.opts.snapInterval;

    if (this.dragMode === "move") {
      const newStart = snapTime(this.dragOriginalStart + dt, snap);
      const newEnd = snapTime(this.dragOriginalEnd + dt, snap);
      // Update visual position without committing
      item.start = newStart;
      item.end = newEnd;
      const el = this.barEls.get(item.id);
      if (el) this.positionBar(el, item);
      this.emit("bar_move_requested", {
        itemId: item.id,
        oldStart: this.dragOriginalStart,
        oldEnd: this.dragOriginalEnd,
        start: newStart,
        end: newEnd,
        source: "pointer",
      });
    } else if (this.dragMode === "resize-start") {
      const newStart = snapTime(this.dragOriginalStart + dt, snap);
      if (newStart < this.dragOriginalEnd - (this.opts.minDuration || 1)) {
        item.start = newStart;
        const el = this.barEls.get(item.id);
        if (el) this.positionBar(el, item);
        this.emit("bar_resize_requested", {
          itemId: item.id,
          endpoint: "start",
          oldStart: this.dragOriginalStart,
          start: newStart,
          source: "pointer",
        });
      }
    } else if (this.dragMode === "resize-end") {
      const newEnd = snapTime(this.dragOriginalEnd + dt, snap);
      if (newEnd > this.dragOriginalStart + (this.opts.minDuration || 1)) {
        item.end = newEnd;
        const el = this.barEls.get(item.id);
        if (el) this.positionBar(el, item);
        this.emit("bar_resize_requested", {
          itemId: item.id,
          endpoint: "end",
          oldEnd: this.dragOriginalEnd,
          end: newEnd,
          source: "pointer",
        });
      }
    }
  }

  private onDragEnd(_e: PointerEvent, onMove: (ev: PointerEvent) => void, onUp: (ev: PointerEvent) => void): void {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    if (!this.dragItemId || !this.dragMode) return;
    const item = this.findItem(this.dragItemId);
    const barEl = this.barEls.get(this.dragItemId);
    if (barEl) barEl.classList.remove("gantt-dragging");

    if (this.dragHappened && item) {
      if (this.dragMode === "move") {
        this.emit("bar_moved", {
          itemId: item.id,
          oldStart: this.dragOriginalStart,
          oldEnd: this.dragOriginalEnd,
          newStart: item.start,
          newEnd: item.end,
          source: "pointer",
        });
      } else {
        this.emit("bar_resized", {
          itemId: item.id,
          oldStart: this.dragOriginalStart,
          oldEnd: this.dragOriginalEnd,
          newStart: item.start,
          newEnd: item.end,
          endpoint: this.dragMode === "resize-start" ? "start" : "end",
          source: "pointer",
        });
      }
    } else if (!this.dragHappened) {
      this.emit("drag_cancelled", { itemId: this.dragItemId, operation: this.dragMode, source: "pointer" });
    }

    this.dragItemId = null;
    this.dragMode = null;
    this.dragHappened = false;
  }

  // ---- Keyboard ----

  private onBarKeyDown(e: KeyboardEvent, item: GanttItem): void {
    if (this.opts.readOnly || item.disabled) return;
    const snap = this.opts.snapInterval || SCALE_TICK[this.opts.scale];
    let handled = true;

    switch (e.key) {
      case " ":
      case "Enter":
        if (this.opts.selectable) this.selectBar(item.id, "keyboard");
        else this.emit("bar_activated", { itemId: item.id, source: "keyboard" });
        break;
      case "ArrowLeft":
        if (this.opts.movable && !e.shiftKey) {
          this.moveBar(item.id, item.start - snap, item.end - snap, "keyboard");
        } else if (this.opts.resizable && e.shiftKey) {
          this.resizeBar(item.id, "start", item.start - snap, "keyboard");
        }
        break;
      case "ArrowRight":
        if (this.opts.movable && !e.shiftKey) {
          this.moveBar(item.id, item.start + snap, item.end + snap, "keyboard");
        } else if (this.opts.resizable && e.shiftKey) {
          this.resizeBar(item.id, "end", item.end + snap, "keyboard");
        }
        break;
      case "ArrowUp":
        if (this.opts.rowMovable) {
          const idx = this.rows.findIndex((r) => r.id === (item.rowId ?? "default"));
          if (idx > 0) this.moveBarToRow(item.id, this.rows[idx - 1].id, "keyboard");
        }
        break;
      case "ArrowDown":
        if (this.opts.rowMovable) {
          const idx = this.rows.findIndex((r) => r.id === (item.rowId ?? "default"));
          if (idx >= 0 && idx < this.rows.length - 1) this.moveBarToRow(item.id, this.rows[idx + 1].id, "keyboard");
        }
        break;
      case "Home":
        if (this.opts.resizable) this.resizeBar(item.id, "start", this.opts.viewStart, "keyboard");
        break;
      case "End":
        if (this.opts.resizable) this.resizeBar(item.id, "end", this.opts.viewEnd, "keyboard");
        break;
      case "Delete":
      case "Backspace":
        this.emit("bar_delete_requested", { itemId: item.id, source: "keyboard" });
        break;
      case "Escape":
        this.clearSelection();
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  // ---- Property setter ----

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "viewStart":
        this.opts.viewStart = Number(value);
        break;
      case "viewEnd":
        this.opts.viewEnd = Number(value);
        break;
      case "scale":
        this.opts.scale = value as GanttScale;
        this.opts.snapInterval = SCALE_SNAP[this.opts.scale];
        break;
      case "showRowHeaders":
        this.opts.showRowHeaders = !!value;
        break;
      case "rowHeaderWidth":
        this.opts.rowHeaderWidth = Number(value);
        break;
      case "rowHeight":
        this.opts.rowHeight = Number(value);
        break;
      case "barHeight":
        this.opts.barHeight = Number(value);
        break;
      case "barGap":
        this.opts.barGap = Number(value);
        break;
      case "rowGap":
        this.opts.rowGap = Number(value);
        break;
      case "barMinWidth":
        this.opts.barMinWidth = Number(value);
        break;
      case "selectable":
        this.opts.selectable = !!value;
        break;
      case "selectionMode":
        this.opts.selectionMode = value as GanttSelectionMode;
        break;
      case "movable":
        this.opts.movable = !!value;
        break;
      case "resizable":
        this.opts.resizable = !!value;
        break;
      case "rowMovable":
        this.opts.rowMovable = !!value;
        break;
      case "snapInterval":
        this.opts.snapInterval = Number(value);
        break;
      case "showGrid":
        this.opts.showGrid = !!value;
        break;
      case "showToday":
        this.opts.showToday = !!value;
        break;
      case "showAxis":
        this.opts.showAxis = !!value;
        break;
      case "axisPosition":
        this.opts.axisPosition = value as GanttAxisPosition;
        break;
      case "readOnly":
        this.opts.readOnly = !!value;
        break;
      case "disabled":
        this.opts.disabled = !!value;
        break;
      case "progressEnabled":
        this.opts.progressEnabled = !!value;
        break;
      case "minDuration":
        this.opts.minDuration = Number(value);
        break;
      case "templateId":
        if (typeof value === "string") this.setTemplateId(value);
        return;
      case "items":
        this.setItems(value as GanttItem[]);
        return;
      case "rows":
        this.setRows(value as GanttRow[]);
        return;
      default:
        return;
    }
    this.render();
  }

  // ---- Events ----

  on(event: string, handler: GanttHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: GanttHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload: GanttEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) {
      try { h(p); } catch (err) { console.error(`Gantt handler error for ${event}:`, err); }
    }
  }

  // ---- Destroy ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.listeners.clear();
    this.barEls.clear();
    this.rowEls.clear();
    this.container.innerHTML = "";
  }
}
