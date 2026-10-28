/**
 * KanbanBoard — a reusable Kanban board component (vanilla TypeScript).
 *
 * Spec reference: §14 Minimum viable specification.
 *
 *   - Render configurable columns and ordered cards.
 *   - Accept generic item records with stable identifiers.
 *   - Support horizontal scrolling and responsive column sizing.
 *   - Display optional card content and metadata.
 *   - Add, select, and move cards when enabled.
 *   - Support drag-and-drop and a non-drag move alternative.
 *   - Support reordering within and between columns.
 *   - Handle empty columns and invalid drop targets.
 *   - Define editable, read-only, and disabled behavior.
 *   - Expose configurable card and column styles.
 *   - Emit consistent selection, move, reorder, and rejection events.
 *   - Support keyboard navigation and accessible controls.
 *
 * Architecture: single-file DOM-based renderer with scoped CSS (`.kanban-` prefix).
 * Drag-and-drop uses the HTML5 Drag-and-Drop API. Item ordering is by array
 * position within each column's items list.
 *
 * The board owns a local copy of items and columns; the host application is
 * notified of changes through events and may persist the resulting data.
 */

import {
  templateRegistry,
  rendererRegistry,
  slotVisible,
  type ContentTemplate,
  type TemplateDensity,
} from "@/lib/templates";

// ---- Public types ----

export type KanbanMode = "editable" | "read_only";
export type KanbanLayout = "horizontal" | "vertical";
export type KanbanCardLayout = "compact" | "standard" | "detailed";
export type KanbanPriority = "low" | "medium" | "high";

export interface KanbanItem {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: string[];
  priority?: KanbanPriority;
  assignee?: string;
  [key: string]: unknown;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  collapsed?: boolean;
  itemLimit?: number;
  allowAddItem?: boolean;
}

export interface KanbanOptions {
  items?: KanbanItem[];
  columns?: KanbanColumn[];
  mode?: KanbanMode;
  layout?: KanbanLayout;
  cardLayout?: KanbanCardLayout;
  dragEnabled?: boolean;
  reorderWithinColumn?: boolean;
  moveBetweenColumns?: boolean;
  showCardBorder?: boolean;
  showItemCount?: boolean;
  selectable?: boolean;
  columnWidth?: number;
  cardGap?: number;
  columnGap?: number;
  allowEmptyColumns?: boolean;
  showDropPreview?: boolean;
  /**
   * ID of a registered content template (see `src/lib/templates/`) used to
   * lay out each card's content. Defaults to "kanban.standard-task". The
   * template's slots are iterated in order; slots not visible in the current
   * `cardLayout` density are skipped. Board-level controls (the Move button)
   * are appended after the templated content and are NOT part of the template.
   */
  templateId?: string;
}

export interface KanbanEventPayload {
  type?: string;
  itemId?: string | null;
  previousItemId?: string | null;
  itemIds?: string[];
  previousItemIds?: string[];
  columnId?: string | null;
  previousColumnId?: string | null;
  targetColumnId?: string | null;
  sourceColumnId?: string | null;
  position?: number;
  oldPosition?: number;
  newPosition?: number;
  item?: KanbanItem | null;
  changes?: Partial<KanbanItem>;
  reason?: string;
  source?: "pointer" | "keyboard" | "programmatic";
  targetPosition?: number;
}

export type KanbanHandler = (payload: KanbanEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "kanban-styles";

/**
 * Sentinel template ID that means "no content template — use the board's
 * native rendering". When `templateId` is set to this value, `getTemplate()`
 * returns `undefined` and `renderCard` falls back to a bare title per card.
 * This demonstrates that the component is independent of the template system:
 * it works with zero templates registered, and content templates are an
 * opt-in layer on top.
 */
export const KANBAN_TEMPLATE_NONE = "none";

const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// ---- Style injection (scoped CSS, .kanban- prefix) ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.kanban-board {
  --kb-bg: #101014;
  --kb-surface: #211A30;
  --kb-surface-2: #2A2238;
  --kb-surface-3: #342348;
  --kb-border: #383343;
  --kb-text: #F4F1FF;
  --kb-muted: #B8B2CA;
  --kb-accent: #D9FF66;
  --kb-accent-hover: #C8F34F;
  --kb-danger: #FF858B;
  --kb-warn: #FFD36B;
  --kb-ok: #8FE3A5;
  --kb-radius: 8px;
  font-family: inherit;
  color: var(--kb-text);
  background: var(--kb-bg);
  border: 1px solid var(--kb-border);
  border-radius: var(--kb-radius);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}
.kanban-board * { box-sizing: border-box; }
.kanban-board.kanban-disabled { opacity: 0.55; pointer-events: none; }
.kanban-board.kanban-readonly .kanban-card { cursor: default; }

.kanban-board.kanban-layout-horizontal .kanban-columns {
  flex-direction: row;
}
.kanban-board.kanban-layout-vertical .kanban-columns {
  flex-direction: column;
}

.kanban-columns {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: var(--kb-col-gap, 12px);
  padding: 12px;
  overflow: auto;
  scrollbar-width: thin;
}

.kanban-column {
  display: flex;
  flex-direction: column;
  flex: 0 0 var(--kb-col-w, 280px);
  min-width: 220px;
  min-height: 0;
  background: var(--kb-surface);
  border: 1px solid var(--kb-border);
  border-radius: var(--kb-radius);
  transition: border-color 120ms ease, background 120ms ease;
}
.kanban-board.kanban-layout-vertical .kanban-column {
  flex: 0 0 auto;
  width: 100%;
  min-height: 120px;
  max-height: 50%;
}
.kanban-column.kanban-drop-target {
  border-color: var(--kb-accent);
  background: color-mix(in srgb, var(--kb-accent) 8%, var(--kb-surface));
}
.kanban-column.kanban-drop-invalid {
  border-color: var(--kb-danger);
  background: color-mix(in srgb, var(--kb-danger) 8%, var(--kb-surface));
}
.kanban-column.kanban-collapsed {
  flex: 0 0 44px;
  min-width: 44px;
}
.kanban-column.kanban-collapsed .kanban-column-body,
.kanban-column.kanban-collapsed .kanban-column-footer {
  display: none;
}

.kanban-column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--kb-border);
  user-select: none;
}
.kanban-column-color {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--kb-muted);
  flex: 0 0 auto;
}
.kanban-column-title {
  flex: 1 1 auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--kb-text);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kanban-column-count {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  color: var(--kb-muted);
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--kb-surface-2);
  flex: 0 0 auto;
}
.kanban-column-limit {
  color: var(--kb-danger);
}
.kanban-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--kb-muted);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  flex: 0 0 auto;
  transition: background 120ms ease, color 120ms ease;
}
.kanban-icon-btn:hover { background: var(--kb-surface-3); color: var(--kb-text); }
.kanban-icon-btn:focus-visible { outline: 2px solid var(--kb-accent); outline-offset: 1px; }
.kanban-icon-btn:disabled { opacity: 0.3; cursor: default; }
.kanban-icon-btn svg { width: 14px; height: 14px; }

.kanban-column-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--kb-card-pad, 8px);
  display: flex;
  flex-direction: column;
  gap: var(--kb-card-gap, 8px);
  scrollbar-width: thin;
}
.kanban-board.kanban-layout-vertical .kanban-column-body {
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: stretch;
}
.kanban-board.kanban-layout-vertical .kanban-card {
  flex: 0 0 220px;
  min-width: 220px;
}

.kanban-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--kb-surface-2);
  border: 1px solid var(--kb-border);
  border-radius: 6px;
  cursor: grab;
  outline: none;
  transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
  position: relative;
}
.kanban-board.kanban-card-border-false .kanban-card {
  border-color: transparent;
}
.kanban-card:hover { background: var(--kb-surface-3); }
.kanban-card:focus-visible {
  border-color: var(--kb-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--kb-accent) 40%, transparent);
}
.kanban-card.kanban-selected {
  border-color: var(--kb-accent);
  background: color-mix(in srgb, var(--kb-accent) 10%, var(--kb-surface-2));
}
.kanban-card.kanban-dragging {
  opacity: 0.45;
  cursor: grabbing;
}
.kanban-card.kanban-readonly-card { cursor: default; }
.kanban-card.kanban-disabled-card { opacity: 0.55; cursor: not-allowed; }

.kanban-card-priority {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--kb-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kanban-priority-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.kanban-priority-low { background: var(--kb-ok); }
.kanban-priority-medium { background: var(--kb-warn); }
.kanban-priority-high { background: var(--kb-danger); }

.kanban-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--kb-text);
  line-height: 1.35;
  word-break: break-word;
}
.kanban-card-desc {
  font-size: 11.5px;
  color: var(--kb-muted);
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.kanban-card-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.kanban-card-label {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--kb-surface-3);
  color: var(--kb-text);
  border: 1px solid var(--kb-border);
}
.kanban-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 2px;
}
.kanban-card-assignee {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--kb-surface-3);
  color: var(--kb-text);
  font-size: 10px;
  font-weight: 600;
  border: 1px solid var(--kb-border);
}
.kanban-card-move-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--kb-border);
  color: var(--kb-muted);
  font-size: 10px;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
}
.kanban-card-move-btn:hover { color: var(--kb-text); background: var(--kb-surface-3); }
.kanban-card-move-btn:focus-visible { outline: 2px solid var(--kb-accent); outline-offset: 1px; }
.kanban-card-move-btn svg { width: 11px; height: 11px; }

.kanban-card-compact { padding: 6px 10px; gap: 2px; }
.kanban-card-compact .kanban-card-desc,
.kanban-card-compact .kanban-card-labels,
.kanban-card-compact .kanban-card-footer { display: none; }
.kanban-card-detailed .kanban-card-desc {
  -webkit-line-clamp: 4;
}

.kanban-drop-indicator {
  height: 3px;
  background: var(--kb-accent);
  border-radius: 999px;
  margin: 0 4px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--kb-accent) 40%, transparent);
  flex: 0 0 3px;
  animation: kanban-pulse 1.2s ease-in-out infinite;
}
.kanban-board.kanban-layout-vertical .kanban-drop-indicator {
  height: auto;
  width: 3px;
  min-width: 3px;
  margin: 4px 0;
}
@keyframes kanban-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .kanban-drop-indicator { animation: none; }
  .kanban-card, .kanban-column { transition: none; }
}

.kanban-column-footer {
  padding: 6px 8px 8px;
}
.kanban-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  background: transparent;
  border: 1px dashed var(--kb-border);
  color: var(--kb-muted);
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.kanban-add-btn:hover { color: var(--kb-text); border-color: var(--kb-accent); background: color-mix(in srgb, var(--kb-accent) 6%, transparent); }
.kanban-add-btn:focus-visible { outline: 2px solid var(--kb-accent); outline-offset: 1px; }
.kanban-add-btn svg { width: 12px; height: 12px; }

.kanban-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 11px;
  color: var(--kb-muted);
  padding: 16px 8px;
  border: 1px dashed var(--kb-border);
  border-radius: 6px;
  min-height: 60px;
}
.kanban-empty-tight {
  padding: 10px 6px;
  min-height: 40px;
}

/* Move-to popover */
.kanban-move-popover {
  position: fixed;
  z-index: 999;
  min-width: 180px;
  background: var(--kb-surface);
  border: 1px solid var(--kb-border);
  border-radius: 8px;
  box-shadow: 0 12px 32px -8px rgba(0,0,0,0.6);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.kanban-move-popover-title {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  color: var(--kb-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 8px;
}
.kanban-move-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--kb-text);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  width: 100%;
}
.kanban-move-option:hover, .kanban-move-option.kanban-active {
  background: var(--kb-surface-3);
}
.kanban-move-option:disabled { opacity: 0.4; cursor: default; }
.kanban-move-option .kanban-column-color { width: 8px; height: 8px; }
`;
  document.head.appendChild(el);
}

// ---- Icon helpers (inline SVG strings) ----

const ICON_PLUS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>`;
const ICON_CHEVRON_LEFT = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 5 5-5"/></svg>`;
const ICON_MOVE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M8 3l5 5-5 5"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M6.5 4V2.5h3V4M5 4l.7 9h4.6L11 4"/></svg>`;

// ---- Utilities ----

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---- Component ----

export class KanbanBoard {
  private container: HTMLElement;
  private root!: HTMLDivElement;
  private opts: Required<KanbanOptions>;
  private columns: KanbanColumn[];
  private items: KanbanItem[];
  private selectedItemId: string | null = null;
  private listeners = new Map<string, Set<KanbanHandler>>();
  private cardEls = new Map<string, HTMLElement>();
  private columnEls = new Map<string, HTMLElement>();
  private _destroyed = false;

  // Drag state
  private dragItemId: string | null = null;
  private dragSourceColumnId: string | null = null;
  private dragTargetColumnId: string | null = null;
  private dragTargetPosition: number | null = null;
  private dragHappened = false;

  // Popover state
  private popoverEl: HTMLDivElement | null = null;
  private popoverItemId: string | null = null;

  constructor(container: HTMLElement, options: KanbanOptions = {}) {
    this.container = container;
    injectStyles();
    this.opts = {
      items: options.items ?? [],
      columns: options.columns ?? [],
      mode: options.mode ?? "editable",
      layout: options.layout ?? "horizontal",
      cardLayout: options.cardLayout ?? "standard",
      dragEnabled: options.dragEnabled ?? true,
      reorderWithinColumn: options.reorderWithinColumn ?? true,
      moveBetweenColumns: options.moveBetweenColumns ?? true,
      showCardBorder: options.showCardBorder ?? true,
      showItemCount: options.showItemCount ?? true,
      selectable: options.selectable ?? true,
      columnWidth: options.columnWidth ?? 280,
      cardGap: options.cardGap ?? 8,
      columnGap: options.columnGap ?? 12,
      allowEmptyColumns: options.allowEmptyColumns ?? true,
      showDropPreview: options.showDropPreview ?? true,
      templateId: options.templateId ?? "kanban.standard-task",
    };
    // Deep-ish copy: clone items and columns so external mutations don't surprise us
    this.items = (this.opts.items as KanbanItem[]).map((it) => ({
      ...it,
      labels: it.labels ? [...it.labels] : undefined,
    }));
    this.columns = (this.opts.columns as KanbanColumn[]).map((c) => ({ ...c }));
    this.render();
  }

  // ---- Rendering ----

  private render(): void {
    if (this._destroyed) return;
    this.cardEls.clear();
    this.columnEls.clear();

    const root = document.createElement("div");
    root.className = "kanban-board";
    root.classList.add(`kanban-layout-${this.opts.layout}`);
    if (this.opts.mode === "read_only") root.classList.add("kanban-readonly");
    if (!this.opts.showCardBorder) root.classList.add("kanban-card-border-false");
    root.style.setProperty("--kb-col-w", `${this.opts.columnWidth}px`);
    root.style.setProperty("--kb-card-gap", `${this.opts.cardGap}px`);
    root.style.setProperty("--kb-col-gap", `${this.opts.columnGap}px`);

    const cols = document.createElement("div");
    cols.className = "kanban-columns";
    cols.setAttribute("role", "list");

    for (const col of this.columns) {
      const colEl = this.renderColumn(col);
      cols.appendChild(colEl);
      this.columnEls.set(col.id, colEl);
    }

    root.appendChild(cols);
    // Replace any previous root
    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;
  }

  private renderColumn(col: KanbanColumn): HTMLElement {
    const el = document.createElement("section");
    el.className = "kanban-column";
    el.setAttribute("data-column-id", col.id);
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", col.title);
    if (col.collapsed) el.classList.add("kanban-collapsed");

    const color = col.color ?? "#B8B2CA";

    // Header
    const header = document.createElement("div");
    header.className = "kanban-column-header";
    header.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".kanban-icon-btn")) return;
      this.emit("column_selected", {
        columnId: col.id,
        previousColumnId: null,
        source: "pointer",
      });
    });

    const colorDot = document.createElement("span");
    colorDot.className = "kanban-column-color";
    colorDot.style.background = color;
    header.appendChild(colorDot);

    const title = document.createElement("span");
    title.className = "kanban-column-title";
    title.textContent = col.title;
    header.appendChild(title);

    if (this.opts.showItemCount) {
      const itemsInCol = this.orderedColumnItems(col.id);
      const count = document.createElement("span");
      count.className = "kanban-column-count";
      count.textContent = `${itemsInCol.length}${col.itemLimit ? "/" + col.itemLimit : ""}`;
      if (col.itemLimit && itemsInCol.length >= col.itemLimit) {
        count.classList.add("kanban-column-limit");
      }
      header.appendChild(count);
    }

    if (this.opts.mode === "editable") {
      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.className = "kanban-icon-btn";
      collapseBtn.setAttribute(
        "aria-label",
        col.collapsed ? `Expand ${col.title}` : `Collapse ${col.title}`,
      );
      collapseBtn.innerHTML = col.collapsed ? ICON_CHEVRON_LEFT : ICON_CHEVRON_DOWN;
      collapseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (col.collapsed) this.expandColumn(col.id);
        else this.collapseColumn(col.id);
      });
      header.appendChild(collapseBtn);
    }

    el.appendChild(header);

    // Body (cards)
    const body = document.createElement("div");
    body.className = "kanban-column-body";
    body.setAttribute("role", "list");
    body.setAttribute("aria-label", `${col.title} cards`);

    const itemsInCol = this.orderedColumnItems(col.id);

    if (itemsInCol.length === 0) {
      if (this.opts.allowEmptyColumns) {
        const empty = document.createElement("div");
        empty.className = "kanban-empty";
        if (this.opts.cardLayout === "compact") empty.classList.add("kanban-empty-tight");
        empty.textContent = this.opts.mode === "read_only" ? "No items" : "Drop cards here";
        body.appendChild(empty);
      }
    } else {
      for (const item of itemsInCol) {
        const cardEl = this.renderCard(item, col);
        body.appendChild(cardEl);
        this.cardEls.set(item.id, cardEl);
      }
    }

    // Drop zone wiring (entire column body)
    this.attachColumnDropHandlers(body, col.id);

    el.appendChild(body);

    // Footer (Add item button)
    if (this.opts.mode === "editable" && col.allowAddItem !== false) {
      const footer = document.createElement("div");
      footer.className = "kanban-column-footer";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "kanban-add-btn";
      addBtn.setAttribute("aria-label", `Add item to ${col.title}`);
      addBtn.innerHTML = `${ICON_PLUS}<span>Add item</span>`;
      addBtn.addEventListener("click", () => {
        this.emit("item_create_requested", { columnId: col.id, source: "pointer" });
      });
      footer.appendChild(addBtn);
      el.appendChild(footer);
    }

    return el;
  }

  private renderCard(item: KanbanItem, _col: KanbanColumn): HTMLElement {
    const el = document.createElement("div");
    el.className = "kanban-card";
    el.classList.add(`kanban-card-${this.opts.cardLayout}`);
    el.setAttribute("data-item-id", item.id);
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute(
      "aria-label",
      this.buildCardAriaLabel(item),
    );
    if (this.selectedItemId === item.id) el.classList.add("kanban-selected");
    if (this.opts.mode === "read_only") el.classList.add("kanban-readonly-card");

    // ---- Templated content ----
    // The card's content is laid out by a registered content template
    // (see src/lib/templates/). The template's slots are iterated in order;
    // slots not visible in the current density are skipped. Each slot's
    // renderer is a pure function from { item, slot, density, host } to a
    // DOM element (or null). Board-level state (mode, moveBetweenColumns,
    // showCardBorder) is forwarded to renderers via `ctx.host` so they can
    // branch without depending on the Kanban's internal API.
    const tpl = this.getTemplate();
    const density = this.opts.cardLayout as TemplateDensity;
    const hostState = {
      mode: this.opts.mode,
      moveBetweenColumns: this.opts.moveBetweenColumns,
      dragEnabled: this.opts.dragEnabled,
      showCardBorder: this.opts.showCardBorder,
      cardLayout: this.opts.cardLayout,
    };
    if (tpl) {
      for (const slot of tpl.slots) {
        if (!slotVisible(slot, density)) continue;
        const renderer = rendererRegistry.get(slot.renderer);
        if (!renderer) continue;
        const slotEl = renderer({ item, slot, density, host: hostState });
        if (slotEl) el.appendChild(slotEl);
      }
    } else {
      // No template registered — fall back to a bare title so the card is
      // never empty. This should not normally happen (the default
      // "kanban.standard-task" template is registered on app init) but a
      // missing template should not blank the board.
      const title = document.createElement("div");
      title.className = "kanban-card-title";
      title.textContent = item.title;
      el.appendChild(title);
    }

    // ---- Board-level controls (NOT part of the template) ----
    // The Move button is a Kanban control; it lives in a footer wrapper so
    // it can be visually grouped with the templated content. The footer is
    // hidden in compact density to preserve the existing compact layout.
    if (this.opts.cardLayout !== "compact") {
      const wantsFooter =
        this.opts.mode === "editable" && this.opts.moveBetweenColumns;
      if (wantsFooter) {
        const footer = document.createElement("div");
        footer.className = "kanban-card-footer";
        // Spacer pushes the Move button to the right edge whether or not
        // the template provided an assignee slot.
        const spacer = document.createElement("span");
        spacer.style.flex = "1 1 auto";
        footer.appendChild(spacer);
        const moveBtn = document.createElement("button");
        moveBtn.type = "button";
        moveBtn.className = "kanban-card-move-btn";
        moveBtn.setAttribute("aria-label", `Move ${item.title} to another column`);
        moveBtn.innerHTML = `${ICON_MOVE}<span>Move</span>`;
        moveBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openMovePopover(item.id, moveBtn);
        });
        footer.appendChild(moveBtn);
        el.appendChild(footer);
      }
    }

    // Drag handlers
    if (this.opts.dragEnabled && this.opts.mode === "editable") {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", (e) => this.onCardDragStart(e, item));
      el.addEventListener("dragend", (e) => this.onCardDragEnd(e, item));
    }

    // Click handler
    el.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".kanban-card-move-btn")) return;
      if (this.opts.selectable) {
        this.selectItem(item.id, "pointer");
      }
    });

    // Double click → activate (open details)
    el.addEventListener("dblclick", () => {
      this.emit("item_activated", { itemId: item.id, source: "pointer" });
    });

    // Keyboard handler
    el.addEventListener("keydown", (e) => this.onCardKeyDown(e, item));

    return el;
  }

  /**
   * Build the aria-label for a card from the title plus any priority and
   * assignee fields that are present on the item. Kept simple — the template
   * system renders visual content but does not own the accessibility label,
   * which the board is responsible for.
   */
  private buildCardAriaLabel(item: KanbanItem): string {
    const parts: string[] = [item.title];
    if (item.priority) {
      parts.push(`priority ${PRIORITY_LABELS[item.priority] ?? item.priority}`);
    }
    if (item.assignee) {
      parts.push(`assigned to ${item.assignee}`);
    }
    return parts.join(", ");
  }

  // ---- Template accessors ----

  /** Returns the currently active content template, or undefined if the templateId is not registered. */
  getTemplate(): ContentTemplate | undefined {
    return templateRegistry.get(this.opts.templateId);
  }

  /** Returns the current template ID. */
  getTemplateId(): string {
    return this.opts.templateId;
  }

  /**
   * Switch to a different content template by ID. Re-renders.
   *
   * Pass `KANBAN_TEMPLATE_NONE` (the string `"none"`) to disable templated
   * content entirely — the board falls back to its native rendering (a bare
   * title per card), demonstrating that the component is independent of the
   * template system. Any other ID must be registered in the template
   * registry (see `src/lib/templates/`); unregistered IDs are a no-op so
   * the board never blanks due to a typo.
   */
  setTemplateId(id: string): void {
    if (this._destroyed) return;
    // "none" is always allowed — it means "no template, use native rendering".
    if (id !== KANBAN_TEMPLATE_NONE && !templateRegistry.has(id)) return;
    if (this.opts.templateId === id) return;
    this.opts.templateId = id;
    this.render();
  }

  // ---- Helpers ----

  private orderedColumnItems(columnId: string): KanbanItem[] {
    // Items are stored in their display order (array order). Filter by column.
    return this.items.filter((it) => it.columnId === columnId);
  }

  private findItem(itemId: string): KanbanItem | undefined {
    return this.items.find((it) => it.id === itemId);
  }

  private findColumn(columnId: string): KanbanColumn | undefined {
    return this.columns.find((c) => c.id === columnId);
  }

  private indexOfItem(itemId: string): number {
    return this.items.findIndex((it) => it.id === itemId);
  }

  private canDropOnColumn(columnId: string): { ok: boolean; reason?: string } {
    const col = this.findColumn(columnId);
    if (!col) return { ok: false, reason: "invalid_target" };
    if (col.collapsed) return { ok: false, reason: "invalid_target" };
    if (col.itemLimit) {
      const count = this.orderedColumnItems(columnId).length;
      // If the dragged item is already in this column, it doesn't add to count
      const isSameColumn = this.dragSourceColumnId === columnId;
      const effectiveCount = isSameColumn ? count : count + 1;
      if (effectiveCount > col.itemLimit) return { ok: false, reason: "column_limit" };
    }
    return { ok: true };
  }

  // ---- Selection ----

  selectItem(itemId: string | null, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (!this.opts.selectable) return;
    const prev = this.selectedItemId;
    if (itemId !== null && !this.findItem(itemId)) return;
    this.selectedItemId = itemId;
    // Update DOM classes
    this.cardEls.forEach((el, id) => {
      el.classList.toggle("kanban-selected", id === itemId);
    });
    if (prev !== itemId) {
      this.emit("item_selected", { itemId, previousItemId: prev, source });
      this.emit("selection_changed", {
        itemIds: itemId ? [itemId] : [],
        previousItemIds: prev ? [prev] : [],
        source,
      });
    }
  }

  clearSelection(): void {
    this.selectItem(null, "programmatic");
  }

  getSelectedItem(): string | null {
    return this.selectedItemId;
  }

  // ---- Move / reorder ----

  /**
   * Move an item to a (possibly different) column at a given position.
   * position is the index within the target column's item list; out-of-range
   * values are clamped to the end.
   */
  moveItem(
    itemId: string,
    targetColumnId: string,
    position: number,
    source: "pointer" | "keyboard" | "programmatic" = "programmatic",
  ): void {
    if (this._destroyed) return;
    if (this.opts.mode === "read_only") {
      this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "read_only", source });
      return;
    }
    const item = this.findItem(itemId);
    if (!item) {
      this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "invalid_item", source });
      return;
    }
    const targetCol = this.findColumn(targetColumnId);
    if (!targetCol) {
      this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "invalid_target", source });
      return;
    }
    if (targetCol.collapsed) {
      this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "invalid_target", source });
      return;
    }
    // Validate cross-column policy
    const sameColumn = item.columnId === targetColumnId;
    if (!sameColumn && !this.opts.moveBetweenColumns) {
      this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "cross_column_disabled", source });
      return;
    }
    if (sameColumn && !this.opts.reorderWithinColumn) {
      const currentPos = this.orderedColumnItems(targetColumnId).findIndex((it) => it.id === itemId);
      if (position !== currentPos) {
        this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "reorder_disabled", source });
        return;
      }
    }
    // Item limit check
    if (targetCol.itemLimit) {
      const count = this.orderedColumnItems(targetColumnId).length;
      const effectiveCount = sameColumn ? count : count + 1;
      if (effectiveCount > targetCol.itemLimit) {
        this.emit("item_move_rejected", { itemId, targetColumnId, position, reason: "column_limit", source });
        return;
      }
    }

    const oldColumnId = item.columnId;
    const oldPosition = this.orderedColumnItems(oldColumnId).findIndex((it) => it.id === itemId);

    // Remove the item from the master list, then re-insert at the right spot.
    const idx = this.indexOfItem(itemId);
    if (idx < 0) return;
    this.items.splice(idx, 1);

    // Compute target position in the master list. We need to insert after
    // `position` items in the target column's current list (after removal).
    const targetList = this.orderedColumnItems(targetColumnId);
    const clampedPos = clamp(position, 0, targetList.length);
    let insertAt: number;
    if (clampedPos === 0) {
      // Insert before the first item in target column, or at start if empty
      if (targetList.length === 0) {
        insertAt = this.items.length; // append
      } else {
        const firstTarget = targetList[0];
        insertAt = this.items.findIndex((it) => it.id === firstTarget.id);
        if (insertAt < 0) insertAt = this.items.length;
      }
    } else {
      const ref = targetList[clampedPos - 1];
      const refIdx = this.items.findIndex((it) => it.id === ref.id);
      insertAt = refIdx < 0 ? this.items.length : refIdx + 1;
    }

    const movedItem: KanbanItem = { ...item, columnId: targetColumnId };
    this.items.splice(insertAt, 0, movedItem);

    this.render();
    this.emit("item_moved", {
      itemId,
      sourceColumnId: oldColumnId,
      targetColumnId,
      oldPosition,
      newPosition: clampedPos,
      source,
    });
    if (oldColumnId !== targetColumnId) {
      this.emit("item_reordered", {
        itemId,
        columnId: targetColumnId,
        oldPosition,
        newPosition: clampedPos,
        source,
      });
    }
  }

  reorderItem(itemId: string, position: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    const item = this.findItem(itemId);
    if (!item) return;
    const oldPosition = this.orderedColumnItems(item.columnId).findIndex((it) => it.id === itemId);
    this.moveItem(itemId, item.columnId, position, source);
    this.emit("item_reordered", {
      itemId,
      columnId: item.columnId,
      oldPosition,
      newPosition: position,
      source,
    });
  }

  // ---- CRUD ----

  createItem(columnId: string, item: Partial<KanbanItem>): string {
    if (this._destroyed) return "";
    const col = this.findColumn(columnId);
    if (!col) {
      this.emit("item_move_rejected", { itemId: null, targetColumnId: columnId, reason: "invalid_target", source: "programmatic" });
      return "";
    }
    const id = item.id ?? uid("item");
    const newItem: KanbanItem = {
      id,
      columnId,
      title: item.title ?? "Untitled",
      description: item.description,
      labels: item.labels ? [...item.labels] : undefined,
      priority: item.priority,
      assignee: item.assignee,
    };
    // Validate limit
    if (col.itemLimit) {
      const count = this.orderedColumnItems(columnId).length;
      if (count >= col.itemLimit) {
        this.emit("item_move_rejected", { itemId: id, targetColumnId: columnId, reason: "column_limit", source: "programmatic" });
        return id;
      }
    }
    this.items.push(newItem);
    this.render();
    return id;
  }

  updateItem(itemId: string, changes: Partial<KanbanItem>): void {
    if (this._destroyed) return;
    const idx = this.indexOfItem(itemId);
    if (idx < 0) return;
    const prev = this.items[idx];
    this.items[idx] = { ...prev, ...changes, id: prev.id };
    this.render();
  }

  removeItem(itemId: string): void {
    if (this._destroyed) return;
    const idx = this.indexOfItem(itemId);
    if (idx < 0) return;
    this.items.splice(idx, 1);
    if (this.selectedItemId === itemId) this.selectedItemId = null;
    this.render();
  }

  // ---- Column collapse ----

  collapseColumn(columnId: string): void {
    if (this._destroyed) return;
    const col = this.findColumn(columnId);
    if (!col) return;
    col.collapsed = true;
    this.render();
  }

  expandColumn(columnId: string): void {
    if (this._destroyed) return;
    const col = this.findColumn(columnId);
    if (!col) return;
    col.collapsed = false;
    this.render();
  }

  // ---- Data setters ----

  setItems(items: KanbanItem[]): void {
    if (this._destroyed) return;
    this.items = items.map((it) => ({
      ...it,
      labels: it.labels ? [...it.labels] : undefined,
    }));
    if (this.selectedItemId && !this.findItem(this.selectedItemId)) {
      this.selectedItemId = null;
    }
    this.render();
  }

  setColumns(columns: KanbanColumn[]): void {
    if (this._destroyed) return;
    this.columns = columns.map((c) => ({ ...c }));
    // Drop items whose column no longer exists
    const validIds = new Set(this.columns.map((c) => c.id));
    this.items = this.items.filter((it) => validIds.has(it.columnId));
    this.render();
  }

  getItems(): KanbanItem[] {
    return this.items.map((it) => ({
      ...it,
      labels: it.labels ? [...it.labels] : undefined,
    }));
  }

  getColumns(): KanbanColumn[] {
    return this.columns.map((c) => ({ ...c }));
  }

  // ---- Property setter ----

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "mode":
        this.opts.mode = value as KanbanMode;
        break;
      case "layout":
        this.opts.layout = value as KanbanLayout;
        break;
      case "cardLayout":
        this.opts.cardLayout = value as KanbanCardLayout;
        break;
      case "dragEnabled":
        this.opts.dragEnabled = !!value;
        break;
      case "reorderWithinColumn":
        this.opts.reorderWithinColumn = !!value;
        break;
      case "moveBetweenColumns":
        this.opts.moveBetweenColumns = !!value;
        break;
      case "showCardBorder":
        this.opts.showCardBorder = !!value;
        break;
      case "showItemCount":
        this.opts.showItemCount = !!value;
        break;
      case "selectable":
        this.opts.selectable = !!value;
        break;
      case "columnWidth":
        this.opts.columnWidth = Number(value);
        break;
      case "cardGap":
        this.opts.cardGap = Number(value);
        break;
      case "columnGap":
        this.opts.columnGap = Number(value);
        break;
      case "allowEmptyColumns":
        this.opts.allowEmptyColumns = !!value;
        break;
      case "showDropPreview":
        this.opts.showDropPreview = !!value;
        break;
      case "templateId":
        // Use setTemplateId so the existence guard + no-op-on-same-id checks apply.
        if (typeof value === "string") this.setTemplateId(value);
        return;
      case "items":
        this.setItems(value as KanbanItem[]);
        return;
      case "columns":
        this.setColumns(value as KanbanColumn[]);
        return;
      default:
        return;
    }
    this.render();
  }

  // ---- Drag-and-drop handlers ----

  private onCardDragStart(e: DragEvent, item: KanbanItem): void {
    if (!this.opts.dragEnabled || this.opts.mode === "read_only") {
      e.preventDefault();
      return;
    }
    this.dragItemId = item.id;
    this.dragSourceColumnId = item.columnId;
    this.dragHappened = false;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // Some browsers require setData to actually start a drag
      try { e.dataTransfer.setData("text/plain", item.id); } catch { /* ignore */ }
    }
    const cardEl = this.cardEls.get(item.id);
    if (cardEl) cardEl.classList.add("kanban-dragging");
    this.emit("drag_started", { itemId: item.id, sourceColumnId: item.columnId, source: "pointer" });
  }

  private onCardDragEnd(_e: DragEvent, item: KanbanItem): void {
    const cardEl = this.cardEls.get(item.id);
    if (cardEl) cardEl.classList.remove("kanban-dragging");
    if (!this.dragHappened) {
      this.emit("drag_cancelled", { itemId: item.id, sourceColumnId: item.columnId, source: "pointer" });
    }
    this.clearDropPreview();
    this.dragItemId = null;
    this.dragSourceColumnId = null;
    this.dragTargetColumnId = null;
    this.dragTargetPosition = null;
    this.dragHappened = false;
  }

  private attachColumnDropHandlers(body: HTMLElement, columnId: string): void {
    body.addEventListener("dragenter", (e) => {
      if (!this.dragItemId) return;
      e.preventDefault();
      this.updateDropTarget(columnId, e);
    });
    body.addEventListener("dragover", (e) => {
      if (!this.dragItemId) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      this.updateDropTarget(columnId, e);
    });
    body.addEventListener("dragleave", (e) => {
      if (!this.dragItemId) return;
      // Only clear if we're leaving the column body entirely (not entering a child)
      const related = e.relatedTarget as Node | null;
      if (related && body.contains(related)) return;
      if (this.dragTargetColumnId === columnId) {
        this.clearDropPreview();
        this.dragTargetColumnId = null;
        this.dragTargetPosition = null;
      }
    });
    body.addEventListener("drop", (e) => {
      if (!this.dragItemId) return;
      e.preventDefault();
      e.stopPropagation();
      this.dragHappened = true;
      const targetCol = this.dragTargetColumnId ?? columnId;
      const targetPos = this.dragTargetPosition ?? this.orderedColumnItems(targetCol).length;
      const itemId = this.dragItemId;
      const sourceColumnId = this.dragSourceColumnId;
      this.clearDropPreview();
      // Validate
      const validation = this.canDropOnColumn(targetCol);
      if (!validation.ok) {
        this.emit("item_move_rejected", {
          itemId,
          sourceColumnId,
          targetColumnId: targetCol,
          position: targetPos,
          reason: validation.reason,
          source: "pointer",
        });
        this.dragItemId = null;
        this.dragSourceColumnId = null;
        this.dragTargetColumnId = null;
        this.dragTargetPosition = null;
        return;
      }
      this.moveItem(itemId, targetCol, targetPos, "pointer");
      this.dragItemId = null;
      this.dragSourceColumnId = null;
      this.dragTargetColumnId = null;
      this.dragTargetPosition = null;
    });
  }

  private updateDropTarget(columnId: string, e: DragEvent): void {
    const validation = this.canDropOnColumn(columnId);
    // Update column highlight
    this.columnEls.forEach((el, id) => {
      el.classList.remove("kanban-drop-target", "kanban-drop-invalid");
      if (id === columnId) {
        if (validation.ok) el.classList.add("kanban-drop-target");
        else el.classList.add("kanban-drop-invalid");
      }
    });

    const prevTarget = this.dragTargetColumnId;
    const prevPos = this.dragTargetPosition;
    this.dragTargetColumnId = columnId;

    // Compute position
    const pos = this.computeDropPosition(e, columnId);
    this.dragTargetPosition = pos;

    if (prevTarget !== columnId || prevPos !== pos) {
      this.emit("drop_target_changed", {
        itemId: this.dragItemId,
        targetColumnId: columnId,
        targetPosition: pos,
        source: "pointer",
      });
    }

    if (this.opts.showDropPreview && validation.ok) {
      this.renderDropPreview(columnId, pos);
    } else {
      this.clearDropPreview();
    }
  }

  private computeDropPosition(e: DragEvent, columnId: string): number {
    const body = this.columnEls.get(columnId)?.querySelector(".kanban-column-body") as HTMLElement | null;
    if (!body) return 0;
    const cards = Array.from(body.querySelectorAll(".kanban-card:not(.kanban-dragging)")) as HTMLElement[];
    if (cards.length === 0) return 0;
    const isVertical = this.opts.layout === "vertical";
    const refPos = isVertical ? e.clientX : e.clientY;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const mid = isVertical ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      if (refPos < mid) return i;
    }
    return cards.length;
  }

  private renderDropPreview(columnId: string, position: number): void {
    this.clearDropPreview();
    const body = this.columnEls.get(columnId)?.querySelector(".kanban-column-body") as HTMLElement | null;
    if (!body) return;
    // Remove the empty-state placeholder so the indicator has a clear spot
    const empty = body.querySelector(".kanban-empty");
    if (empty) empty.remove();

    const indicator = document.createElement("div");
    indicator.className = "kanban-drop-indicator";
    indicator.setAttribute("aria-hidden", "true");

    const cards = Array.from(body.querySelectorAll(".kanban-card:not(.kanban-dragging)")) as HTMLElement[];
    if (position === 0) {
      body.insertBefore(indicator, body.firstChild);
    } else if (position >= cards.length) {
      body.appendChild(indicator);
    } else {
      body.insertBefore(indicator, cards[position]);
    }
  }

  private clearDropPreview(): void {
    if (!this.root) return;
    const indicators = this.root.querySelectorAll(".kanban-drop-indicator");
    indicators.forEach((el) => el.remove());
    this.columnEls.forEach((el) => el.classList.remove("kanban-drop-target", "kanban-drop-invalid"));
    // Re-add empty state if a column was emptied visually
    for (const col of this.columns) {
      const body = this.columnEls.get(col.id)?.querySelector(".kanban-column-body") as HTMLElement | null;
      if (!body) continue;
      const hasCards = body.querySelector(".kanban-card:not(.kanban-dragging)");
      const hasEmpty = body.querySelector(".kanban-empty");
      if (!hasCards && !hasEmpty && this.opts.allowEmptyColumns) {
        const empty = document.createElement("div");
        empty.className = "kanban-empty";
        if (this.opts.cardLayout === "compact") empty.classList.add("kanban-empty-tight");
        empty.textContent = this.opts.mode === "read_only" ? "No items" : "Drop cards here";
        body.appendChild(empty);
      }
    }
  }

  // ---- Keyboard ----

  private onCardKeyDown(e: KeyboardEvent, item: KanbanItem): void {
    // Don't intercept typing in inputs
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select")) return;

    switch (e.key) {
      case "Enter": {
        e.preventDefault();
        this.emit("item_activated", { itemId: item.id, source: "keyboard" });
        break;
      }
      case " ": {
        e.preventDefault();
        if (this.opts.selectable) {
          this.selectItem(item.id, "keyboard");
        }
        break;
      }
      case "m":
      case "M": {
        if (this.opts.mode !== "editable" || !this.opts.moveBetweenColumns) return;
        e.preventDefault();
        const cardEl = this.cardEls.get(item.id);
        if (cardEl) this.openMovePopover(item.id, cardEl);
        break;
      }
      case "ArrowUp": {
        if (this.opts.mode !== "editable" || !this.opts.reorderWithinColumn) return;
        e.preventDefault();
        const list = this.orderedColumnItems(item.columnId);
        const i = list.findIndex((it) => it.id === item.id);
        if (i > 0) {
          this.moveItem(item.id, item.columnId, i - 1, "keyboard");
          requestAnimationFrame(() => this.cardEls.get(item.id)?.focus());
        }
        break;
      }
      case "ArrowDown": {
        if (this.opts.mode !== "editable" || !this.opts.reorderWithinColumn) return;
        e.preventDefault();
        const list = this.orderedColumnItems(item.columnId);
        const i = list.findIndex((it) => it.id === item.id);
        if (i < list.length - 1) {
          this.moveItem(item.id, item.columnId, i + 1, "keyboard");
          requestAnimationFrame(() => this.cardEls.get(item.id)?.focus());
        }
        break;
      }
      case "ArrowRight": {
        if (this.opts.mode !== "editable" || !this.opts.moveBetweenColumns) return;
        e.preventDefault();
        const i = this.columns.findIndex((c) => c.id === item.columnId);
        for (let k = i + 1; k < this.columns.length; k++) {
          const nextCol = this.columns[k];
          if (!nextCol.collapsed) {
            this.moveItem(item.id, nextCol.id, this.orderedColumnItems(nextCol.id).length, "keyboard");
            requestAnimationFrame(() => this.cardEls.get(item.id)?.focus());
            break;
          }
        }
        break;
      }
      case "ArrowLeft": {
        if (this.opts.mode !== "editable" || !this.opts.moveBetweenColumns) return;
        e.preventDefault();
        const i = this.columns.findIndex((c) => c.id === item.columnId);
        for (let k = i - 1; k >= 0; k--) {
          const prevCol = this.columns[k];
          if (!prevCol.collapsed) {
            this.moveItem(item.id, prevCol.id, this.orderedColumnItems(prevCol.id).length, "keyboard");
            requestAnimationFrame(() => this.cardEls.get(item.id)?.focus());
            break;
          }
        }
        break;
      }
      case "Delete":
      case "Backspace": {
        if (this.opts.mode !== "editable") return;
        e.preventDefault();
        this.emit("item_delete_requested", { itemId: item.id, source: "keyboard" });
        break;
      }
      case "Escape": {
        e.preventDefault();
        this.closePopover();
        this.clearSelection();
        break;
      }
    }
  }

  // ---- Move-to popover (accessible alternative to drag) ----

  private openMovePopover(itemId: string, anchor: HTMLElement): void {
    this.closePopover();
    const item = this.findItem(itemId);
    if (!item) return;
    this.popoverItemId = itemId;

    const pop = document.createElement("div");
    pop.className = "kanban-move-popover";
    pop.setAttribute("role", "menu");
    pop.setAttribute("aria-label", "Move to column");

    const title = document.createElement("div");
    title.className = "kanban-move-popover-title";
    title.textContent = "Move to column";
    pop.appendChild(title);

    for (const col of this.columns) {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "kanban-move-option";
      opt.setAttribute("role", "menuitem");
      if (col.id === item.columnId) {
        opt.classList.add("kanban-active");
        opt.setAttribute("aria-current", "true");
      }
      const dot = document.createElement("span");
      dot.className = "kanban-column-color";
      dot.style.background = col.color ?? "#B8B2CA";
      opt.appendChild(dot);
      const label = document.createElement("span");
      label.textContent = col.title + (col.id === item.columnId ? " (current)" : "");
      opt.appendChild(label);
      if (col.id === item.columnId) {
        opt.disabled = true;
      } else if (col.collapsed) {
        opt.disabled = true;
      } else {
        opt.addEventListener("click", () => {
          const newPos = this.orderedColumnItems(col.id).length;
          this.moveItem(itemId, col.id, newPos, "keyboard");
          this.closePopover();
          requestAnimationFrame(() => this.cardEls.get(itemId)?.focus());
        });
      }
      pop.appendChild(opt);
    }

    // Delete option
    const sep = document.createElement("div");
    sep.style.cssText = "height:1px;background:var(--kb-border);margin:4px 0;";
    pop.appendChild(sep);
    const del = document.createElement("button");
    del.type = "button";
    del.className = "kanban-move-option";
    del.setAttribute("role", "menuitem");
    del.style.color = "var(--kb-danger)";
    del.innerHTML = `${ICON_TRASH}<span>Request delete</span>`;
    del.addEventListener("click", () => {
      this.emit("item_delete_requested", { itemId, source: "keyboard" });
      this.closePopover();
    });
    pop.appendChild(del);

    // Position
    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + popRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popRect.width - 8;
    }
    if (top + popRect.height > window.innerHeight - 8) {
      top = rect.top - popRect.height - 4;
    }
    pop.style.top = `${Math.max(8, top)}px`;
    pop.style.left = `${Math.max(8, left)}px`;

    this.popoverEl = pop;

    // Click outside to close
    setTimeout(() => {
      const onDocClick = (ev: MouseEvent) => {
        if (!this.popoverEl) return;
        if (!this.popoverEl.contains(ev.target as Node) && !anchor.contains(ev.target as Node)) {
          this.closePopover();
          document.removeEventListener("click", onDocClick, true);
          document.removeEventListener("keydown", onKey, true);
        }
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          this.closePopover();
          document.removeEventListener("click", onDocClick, true);
          document.removeEventListener("keydown", onKey, true);
          requestAnimationFrame(() => this.cardEls.get(itemId)?.focus());
        }
      };
      document.addEventListener("click", onDocClick, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);
  }

  private closePopover(): void {
    if (this.popoverEl) {
      this.popoverEl.remove();
      this.popoverEl = null;
    }
    this.popoverItemId = null;
  }

  // ---- Events ----

  on(event: string, handler: KanbanHandler): void {
    if (this._destroyed) return;
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: KanbanHandler): void {
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  }

  private emit(event: string, payload: KanbanEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const fullPayload: KanbanEventPayload = { type: event, ...payload };
    set.forEach((h) => {
      try { h(fullPayload); } catch { /* swallow handler errors */ }
    });
  }

  // ---- Lifecycle ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.closePopover();
    this.listeners.clear();
    this.cardEls.clear();
    this.columnEls.clear();
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }
}
