/**
 * TableEditor — a spreadsheet-style table component (vanilla TypeScript).
 *
 * Features:
 *   - Cell selection (single + range via drag)
 *   - Inline cell editing (double-click or Enter)
 *   - Column resize (drag header right edge)
 *   - Column reorder (drag header)
 *   - Sort (click header: asc → desc → none)
 *   - Frozen header row + first column
 *   - Cell types: text, number, checkbox, select
 *   - Keyboard navigation (Arrows, Tab, Enter, Escape, Delete)
 *   - Row numbers + column headers
 *   - Copy/paste (Ctrl+C / Ctrl+V)
 *   - Add/remove rows and columns
 *   - Events for all changes
 */

// ---- Public types ----

export type CellType = "text" | "number" | "checkbox" | "select";

export interface TableColumn {
  id: string;
  label: string;
  type?: CellType;
  width?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  editable?: boolean;
  options?: { label: string; value: unknown }[];
}

export interface TableRow {
  id: string;
  [cellId: string]: unknown;
}

export interface TableEditorOptions {
  columns?: TableColumn[];
  rows?: TableRow[];
  frozenHeader?: boolean;
  frozenFirstCol?: boolean;
  rowNumbers?: boolean;
  showToolbar?: boolean;
  selectable?: boolean;
  editable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  sortable?: boolean;
  striped?: boolean;
  minColWidth?: number;
}

export interface TableEditorEventPayload {
  type?: string;
  rowId?: string;
  colId?: string;
  cellId?: string;
  value?: unknown;
  oldValue?: unknown;
  selectedCells?: { row: number; col: number }[];
  colId2?: string;
  fromIndex?: number;
  toIndex?: number;
  col?: string;
  direction?: "asc" | "desc" | null;
  reason?: string;
  source?: "pointer" | "keyboard" | "programmatic";
}

export type TableEditorHandler = (payload: TableEditorEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "table-editor-styles";
const DEFAULT_COL_WIDTH = 120;

// ---- Style injection ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.te-root {
  --te-bg: #101014;
  --te-surface: #211A30;
  --te-surface-2: #2A2238;
  --te-surface-3: #342348;
  --te-border: #383343;
  --te-text: #F4F1FF;
  --te-muted: #B8B2CA;
  --te-accent: #D9FF66;
  --te-accent-dim: rgba(217, 255, 102, 0.12);
  --te-selected: rgba(217, 255, 102, 0.18);
  --te-radius: 6px;
  font-family: inherit;
  color: var(--te-text);
  background: var(--te-bg);
  border: 1px solid var(--te-border);
  border-radius: var(--te-radius);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
}
.te-root * { box-sizing: border-box; }

.te-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--te-border);
  background: var(--te-surface);
}
.te-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--te-border);
  border-radius: 4px;
  background: var(--te-surface-2);
  color: var(--te-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: color .12s, border-color .12s, background .12s;
}
.te-btn:hover { color: var(--te-text); border-color: var(--te-accent); }
.te-btn:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--te-accent) 40%, transparent); }
.te-btn svg { width: 13px; height: 13px; }
.te-btn.te-danger:hover { border-color: #FF858B; color: #FF858B; }
.te-spacer { flex: 1 1 auto; }
.te-info { font-family: var(--font-mono, ui-monospace, monospace); font-size: 10px; color: var(--te-muted); padding: 0 6px; }

.te-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  position: relative;
}
.te-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.te-scroll::-webkit-scrollbar-track { background: transparent; }
.te-scroll::-webkit-scrollbar-thumb { background: var(--te-border); border-radius: 999px; }
.te-scroll::-webkit-scrollbar-thumb:hover { background: var(--te-muted); }

.te-grid {
  display: inline-grid;
  min-width: 100%;
}
.te-row {
  display: contents;
}
.te-corner, .te-col-header, .te-row-header, .te-cell {
  display: flex;
  align-items: center;
  padding: 0 8px;
  height: 32px;
  border-right: 1px solid var(--te-border);
  border-bottom: 1px solid var(--te-border);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 0 auto;
}
.te-corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 4;
  background: var(--te-surface-3);
  border-right: 1px solid var(--te-border);
  border-bottom: 1px solid var(--te-border);
  min-width: 40px;
  justify-content: center;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 9px;
  color: var(--te-muted);
}
.te-col-header {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--te-surface-2);
  color: var(--te-text);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  user-select: none;
  position: sticky;
  top: 0;
  gap: 4px;
  transition: background .12s;
}
.te-col-header:hover { background: var(--te-surface-3); }
.te-col-header.te-frozen { position: sticky; left: 0; z-index: 4; }
.te-col-header.te-sort-asc, .te-col-header.te-sort-desc { color: var(--te-accent); }
.te-col-label { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; }
.te-sort-icon { width: 12px; height: 12px; color: var(--te-accent); flex: 0 0 auto; }
.te-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 6;
}
.te-resize-handle:hover { background: var(--te-accent); }
.te-reorder-grip { width: 10px; height: 16px; flex: 0 0 auto; cursor: grab; opacity: 0.3; }
.te-reorder-grip:hover { opacity: 1; }
.te-col-header.te-dragging { opacity: 0.5; }
.te-col-header.te-drop-target { border-left: 2px solid var(--te-accent); }

.te-row-header {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--te-surface-2);
  color: var(--te-muted);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  justify-content: center;
  min-width: 40px;
  cursor: pointer;
  user-select: none;
  transition: background .12s;
}
.te-row-header:hover { background: var(--te-surface-3); }
.te-row-header.te-selected { background: var(--te-accent-dim); color: var(--te-accent); }
.te-row-header.te-frozen { position: sticky; left: 0; z-index: 4; top: 0; }

.te-cell {
  background: var(--te-bg);
  color: var(--te-text);
  cursor: cell;
  outline: none;
  transition: background .08s;
}
.te-cell.te-striped { background: var(--te-surface); }
.te-cell.te-selected { background: var(--te-selected); }
.te-cell.te-editing { padding: 0; }
.te-cell.te-frozen { position: sticky; left: 0; z-index: 1; background: var(--te-surface); }
.te-cell.te-frozen.te-striped { background: var(--te-surface-2); }
.te-cell.te-frozen.te-selected { background: var(--te-selected); }
.te-cell.te-align-center { justify-content: center; text-align: center; }
.te-cell.te-align-right { justify-content: flex-end; text-align: right; }

.te-cell-input {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  border: 2px solid var(--te-accent);
  background: var(--te-bg);
  color: var(--te-text);
  font: inherit;
  font-size: 12px;
  outline: none;
}
.te-cell-select {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  border: 2px solid var(--te-accent);
  background: var(--te-bg);
  color: var(--te-text);
  font: inherit;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
.te-cell-checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--te-accent);
  cursor: pointer;
}

.te-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--te-muted);
  font-size: 12px;
  font-style: italic;
}

@media (prefers-reduced-motion: reduce) {
  .te-col-header, .te-row-header, .te-cell { transition: none; }
}
`;
  document.head.appendChild(el);
}

// ---- Icons ----

const ICON_PLUS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M6.5 4V2.5h3V4M5 4l.7 9h4.6L11 4"/></svg>`;
const ICON_SORT_ASC = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4-4 4 4M8 2v12"/></svg>`;
const ICON_SORT_DESC = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 4 4-4M8 14V2"/></svg>`;
const ICON_GRIP = `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/></svg>`;

// ---- Utilities ----

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---- Component ----

export class TableEditor {
  private container: HTMLElement;
  private root!: HTMLDivElement;
  private scrollEl!: HTMLDivElement;
  private gridEl!: HTMLDivElement;
  private opts: Required<TableEditorOptions>;
  private columns: TableColumn[];
  private rows: TableRow[];
  private selectedStart: { row: number; col: number } | null = null;
  private selectedEnd: { row: number; col: number } | null = null;
  private editingCell: { row: number; col: number } | null = null;
  private sortState: { col: string; direction: "asc" | "desc" } | null = null;
  private colWidths: Map<string, number> = new Map();
  private listeners = new Map<string, Set<TableEditorHandler>>();
  private _destroyed = false;
  private cellEls: HTMLElement[][] = [];
  private rowHeaderEls: HTMLElement[] = [];
  private colHeaderEls: HTMLElement[] = [];

  constructor(container: HTMLElement, options: TableEditorOptions = {}) {
    this.container = container;
    injectStyles();
    this.opts = {
      columns: options.columns ?? [],
      rows: options.rows ?? [],
      frozenHeader: options.frozenHeader ?? true,
      frozenFirstCol: options.frozenFirstCol ?? false,
      rowNumbers: options.rowNumbers ?? true,
      showToolbar: options.showToolbar ?? true,
      selectable: options.selectable ?? true,
      editable: options.editable ?? true,
      resizable: options.resizable ?? true,
      reorderable: options.reorderable ?? true,
      sortable: options.sortable ?? true,
      striped: options.striped ?? true,
      minColWidth: options.minColWidth ?? 60,
    };
    this.columns = (this.opts.columns as TableColumn[]).map(c => ({ ...c }));
    this.rows = (this.opts.rows as TableRow[]).map(r => ({ ...r }));
    // Initialize column widths
    for (const col of this.columns) {
      this.colWidths.set(col.id, col.width ?? DEFAULT_COL_WIDTH);
    }
    this.render();
  }

  // ---- Rendering ----

  private render(): void {
    if (this._destroyed) return;
    const root = document.createElement("div");
    root.className = "te-root";

    if (this.opts.showToolbar) {
      root.appendChild(this.renderToolbar());
    }

    const scroll = document.createElement("div");
    scroll.className = "te-scroll";
    scroll.tabIndex = 0;

    const grid = document.createElement("div");
    grid.className = "te-grid";

    // Build column template string for the grid
    const templateCols = (this.opts.rowNumbers ? ["40px"] : []).concat(
      this.columns.map(c => `${this.colWidths.get(c.id) ?? DEFAULT_COL_WIDTH}px`)
    );
    grid.style.gridTemplateColumns = templateCols.join(" ");

    this.cellEls = [];
    this.rowHeaderEls = [];
    this.colHeaderEls = [];

    // Header row
    const headerCells: HTMLElement[] = [];
    if (this.opts.rowNumbers) {
      const corner = document.createElement("div");
      corner.className = "te-corner";
      corner.textContent = "#";
      headerCells.push(corner);
    }
    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c];
      const header = this.renderColHeader(col, c);
      headerCells.push(header);
      this.colHeaderEls.push(header);
    }
    headerCells.forEach(el => grid.appendChild(el));

    // Body rows
    for (let r = 0; r < this.rows.length; r++) {
      const rowCells: HTMLElement[] = [];
      if (this.opts.rowNumbers) {
        const rh = document.createElement("div");
        rh.className = "te-row-header";
        if (this.opts.frozenFirstCol) rh.classList.add("te-frozen");
        rh.textContent = String(r + 1);
        rh.setAttribute("data-row", String(r));
        rh.addEventListener("click", () => this.selectRow(r, "pointer"));
        rowCells.push(rh);
        this.rowHeaderEls.push(rh);
      }
      const cells: HTMLElement[] = [];
      for (let c = 0; c < this.columns.length; c++) {
        const col = this.columns[c];
        const cell = this.renderCell(r, c, col);
        rowCells.push(cell);
        cells.push(cell);
      }
      rowCells.forEach(el => grid.appendChild(el));
      this.cellEls.push(cells);
    }

    if (this.rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "te-empty";
      empty.style.gridColumn = `1 / -1`;
      empty.textContent = "No rows — use the toolbar to add one.";
      grid.appendChild(empty);
    }

    scroll.appendChild(grid);
    root.appendChild(scroll);
    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;
    this.scrollEl = scroll;
    this.gridEl = grid;

    // Apply sort indicator
    this.updateSortIndicators();
    // Apply selection highlight
    this.updateSelectionDom();

    // Keyboard
    scroll.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  private renderToolbar(): HTMLElement {
    const tb = document.createElement("div");
    tb.className = "te-toolbar";

    const addRowBtn = document.createElement("button");
    addRowBtn.type = "button";
    addRowBtn.className = "te-btn";
    addRowBtn.innerHTML = `${ICON_PLUS}<span>Add row</span>`;
    addRowBtn.addEventListener("click", () => this.addRow());
    tb.appendChild(addRowBtn);

    const addColBtn = document.createElement("button");
    addColBtn.type = "button";
    addColBtn.className = "te-btn";
    addColBtn.innerHTML = `${ICON_PLUS}<span>Add column</span>`;
    addColBtn.addEventListener("click", () => this.addColumn());
    tb.appendChild(addColBtn);

    const delRowBtn = document.createElement("button");
    delRowBtn.type = "button";
    delRowBtn.className = "te-btn te-danger";
    delRowBtn.innerHTML = `${ICON_TRASH}<span>Del row</span>`;
    delRowBtn.addEventListener("click", () => {
      if (this.selectedStart) this.removeRow(this.selectedStart.row);
    });
    tb.appendChild(delRowBtn);

    const spacer = document.createElement("div");
    spacer.className = "te-spacer";
    tb.appendChild(spacer);

    const info = document.createElement("span");
    info.className = "te-info";
    info.textContent = `${this.rows.length} rows × ${this.columns.length} cols`;
    tb.appendChild(info);

    return tb;
  }

  private renderColHeader(col: TableColumn, idx: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "te-col-header";
    if (this.opts.frozenHeader) el.style.position = "sticky";
    if (this.opts.frozenFirstCol && idx === 0) el.classList.add("te-frozen");
    el.setAttribute("data-col", col.id);
    el.setAttribute("data-col-index", String(idx));
    el.style.width = `${this.colWidths.get(col.id) ?? DEFAULT_COL_WIDTH}px`;
    el.style.position = "sticky";
    el.style.top = "0";

    // Sort indicator
    if (this.sortState?.col === col.id) {
      el.classList.add(this.sortState.direction === "asc" ? "te-sort-asc" : "te-sort-desc");
      const sortIcon = document.createElement("span");
      sortIcon.className = "te-sort-icon";
      sortIcon.innerHTML = this.sortState.direction === "asc" ? ICON_SORT_ASC : ICON_SORT_DESC;
      el.appendChild(sortIcon);
    }

    // Reorder grip
    if (this.opts.reorderable) {
      const grip = document.createElement("span");
      grip.className = "te-reorder-grip";
      grip.innerHTML = ICON_GRIP;
      grip.setAttribute("aria-hidden", "true");
      grip.addEventListener("pointerdown", (e) => this.onReorderStart(e, col.id));
      el.appendChild(grip);
    }

    const label = document.createElement("span");
    label.className = "te-col-label";
    label.textContent = col.label;
    el.appendChild(label);

    // Sort on click (not on grip or resize)
    if (this.opts.sortable) {
      el.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".te-resize-handle") || (e.target as HTMLElement).closest(".te-reorder-grip")) return;
        this.toggleSort(col.id);
      });
    }

    // Resize handle
    if (this.opts.resizable) {
      const handle = document.createElement("div");
      handle.className = "te-resize-handle";
      handle.addEventListener("pointerdown", (e) => this.onResizeStart(e, col.id));
      el.appendChild(handle);
    }

    return el;
  }

  private renderCell(rowIdx: number, colIdx: number, col: TableColumn): HTMLElement {
    const el = document.createElement("div");
    el.className = "te-cell";
    if (this.opts.striped && rowIdx % 2 === 1) el.classList.add("te-striped");
    if (this.opts.frozenFirstCol && colIdx === 0) el.classList.add("te-frozen");
    if (col.align === "center") el.classList.add("te-align-center");
    if (col.align === "right") el.classList.add("te-align-right");
    el.setAttribute("data-row", String(rowIdx));
    el.setAttribute("data-col", String(colIdx));
    el.setAttribute("data-col-id", col.id);

    const row = this.rows[rowIdx];
    const value = row?.[col.id];
    const editable = col.editable !== false && this.opts.editable;

    if (col.type === "checkbox") {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!value;
      cb.className = "te-cell-checkbox";
      if (editable) {
        cb.addEventListener("change", () => {
          this.setCellValue(rowIdx, colIdx, cb.checked, "pointer");
        });
      } else {
        cb.disabled = true;
      }
      el.appendChild(cb);
    } else {
      // Render text representation
      if (value !== undefined && value !== null) {
        el.textContent = String(value);
      }
    }

    // Cell interactions
    if (this.opts.selectable) {
      el.addEventListener("pointerdown", (e) => this.onCellPointerDown(e, rowIdx, colIdx));
      el.addEventListener("dblclick", () => {
        if (editable && col.type !== "checkbox") this.startEditing(rowIdx, colIdx);
      });
    }

    return el;
  }

  // ---- Selection ----

  private onCellPointerDown(e: PointerEvent, row: number, col: number): void {
    if (this.editingCell) return;
    if (e.shiftKey && this.selectedStart) {
      this.selectedEnd = { row, col };
      this.updateSelectionDom();
      this.emit("selection_change", { selectedCells: this.getSelectedCells(), source: "pointer" });
      return;
    }
    this.selectedStart = { row, col };
    this.selectedEnd = { row, col };
    this.updateSelectionDom();
    this.emit("selection_change", { selectedCells: this.getSelectedCells(), source: "pointer" });

    // Set up drag selection
    const onMove = (ev: PointerEvent) => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const cellEl = target?.closest(".te-cell") as HTMLElement | null;
      if (cellEl) {
        const r = Number(cellEl.getAttribute("data-row"));
        const c = Number(cellEl.getAttribute("data-col"));
        if (!isNaN(r) && !isNaN(c)) {
          this.selectedEnd = { row: r, col: c };
          this.updateSelectionDom();
          this.emit("selection_change", { selectedCells: this.getSelectedCells(), source: "pointer" });
        }
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  selectCell(row: number, col: number): void {
    if (row < 0 || row >= this.rows.length || col < 0 || col >= this.columns.length) return;
    this.selectedStart = { row, col };
    this.selectedEnd = { row, col };
    this.updateSelectionDom();
    this.emit("selection_change", { selectedCells: this.getSelectedCells(), source: "programmatic" });
  }

  selectRow(row: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (row < 0 || row >= this.rows.length) return;
    this.selectedStart = { row, col: 0 };
    this.selectedEnd = { row, col: this.columns.length - 1 };
    this.updateSelectionDom();
    this.emit("selection_change", { selectedCells: this.getSelectedCells(), source });
  }

  selectCol(col: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (col < 0 || col >= this.columns.length) return;
    this.selectedStart = { row: 0, col };
    this.selectedEnd = { row: this.rows.length - 1, col };
    this.updateSelectionDom();
    this.emit("selection_change", { selectedCells: this.getSelectedCells(), source });
  }

  clearSelection(): void {
    this.selectedStart = null;
    this.selectedEnd = null;
    this.updateSelectionDom();
    this.emit("selection_change", { selectedCells: [], source: "programmatic" });
  }

  getSelectedCells(): { row: number; col: number }[] {
    if (!this.selectedStart || !this.selectedEnd) return [];
    const r1 = Math.min(this.selectedStart.row, this.selectedEnd.row);
    const r2 = Math.max(this.selectedStart.row, this.selectedEnd.row);
    const c1 = Math.min(this.selectedStart.col, this.selectedEnd.col);
    const c2 = Math.max(this.selectedStart.col, this.selectedEnd.col);
    const cells: { row: number; col: number }[] = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  private updateSelectionDom(): void {
    // Clear all
    for (const row of this.cellEls) {
      for (const cell of row) cell.classList.remove("te-selected");
    }
    for (const rh of this.rowHeaderEls) rh.classList.remove("te-selected");
    if (!this.selectedStart || !this.selectedEnd) return;
    const r1 = Math.min(this.selectedStart.row, this.selectedEnd.row);
    const r2 = Math.max(this.selectedStart.row, this.selectedEnd.row);
    const c1 = Math.min(this.selectedStart.col, this.selectedEnd.col);
    const c2 = Math.max(this.selectedStart.col, this.selectedEnd.col);
    for (let r = r1; r <= r2; r++) {
      if (this.cellEls[r]) {
        for (let c = c1; c <= c2; c++) {
          this.cellEls[r]?.[c]?.classList.add("te-selected");
        }
      }
      if (this.rowHeaderEls[r]) this.rowHeaderEls[r].classList.add("te-selected");
    }
  }

  // ---- Editing ----

  startEditing(row: number, col: number): void {
    if (this.editingCell) this.cancelEditing();
    if (row < 0 || row >= this.rows.length || col < 0 || col >= this.columns.length) return;
    const colDef = this.columns[col];
    if (colDef.editable === false) return;
    this.editingCell = { row, col };
    const cellEl = this.cellEls[row]?.[col];
    if (!cellEl) return;
    cellEl.classList.add("te-editing");
    cellEl.innerHTML = "";
    const oldValue = this.rows[row]?.[colDef.id];

    if (colDef.type === "select") {
      const sel = document.createElement("select");
      sel.className = "te-cell-select";
      for (const opt of colDef.options ?? []) {
        const o = document.createElement("option");
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (opt.value === oldValue) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener("change", () => {
        this.setCellValue(row, col, sel.value, "pointer");
        this.cancelEditing();
      });
      sel.addEventListener("blur", () => this.cancelEditing());
      sel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); this.cancelEditing(); }
        if (e.key === "Enter") { e.preventDefault(); this.cancelEditing(); }
      });
      cellEl.appendChild(sel);
      sel.focus();
    } else {
      const input = document.createElement("input");
      input.type = colDef.type === "number" ? "number" : "text";
      input.className = "te-cell-input";
      input.value = oldValue !== undefined && oldValue !== null ? String(oldValue) : "";
      input.addEventListener("blur", () => this.cancelEditing());
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const newVal = colDef.type === "number" ? Number(input.value) : input.value;
          this.setCellValue(row, col, newVal, "keyboard");
          this.cancelEditing();
          // Move down
          if (row + 1 < this.rows.length) this.selectCell(row + 1, col);
        }
        if (e.key === "Escape") { e.preventDefault(); this.cancelEditing(); }
        if (e.key === "Tab") {
          e.preventDefault();
          const newVal = colDef.type === "number" ? Number(input.value) : input.value;
          this.setCellValue(row, col, newVal, "keyboard");
          this.cancelEditing();
          if (col + 1 < this.columns.length) this.selectCell(row, col + 1);
        }
      });
      cellEl.appendChild(input);
      input.focus();
      input.select();
    }
  }

  cancelEditing(): void {
    if (!this.editingCell) return;
    const { row, col } = this.editingCell;
    this.editingCell = null;
    const colDef = this.columns[col];
    const cellEl = this.cellEls[row]?.[col];
    if (cellEl && colDef) {
      cellEl.classList.remove("te-editing");
      // Re-render cell content
      const value = this.rows[row]?.[colDef.id];
      cellEl.innerHTML = "";
      if (colDef.type === "checkbox") {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!value;
        cb.className = "te-cell-checkbox";
        if (colDef.editable !== false && this.opts.editable) {
          cb.addEventListener("change", () => this.setCellValue(row, col, cb.checked, "pointer"));
        } else { cb.disabled = true; }
        cellEl.appendChild(cb);
      } else {
        if (value !== undefined && value !== null) cellEl.textContent = String(value);
      }
    }
  }

  setCellValue(row: number, col: number, value: unknown, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (row < 0 || row >= this.rows.length || col < 0 || col >= this.columns.length) return;
    const colDef = this.columns[col];
    const oldValue = this.rows[row][colDef.id];
    this.rows[row][colDef.id] = value;
    // Update DOM if not editing
    if (!this.editingCell || this.editingCell.row !== row || this.editingCell.col !== col) {
      const cellEl = this.cellEls[row]?.[col];
      if (cellEl) {
        if (colDef.type === "checkbox") {
          const cb = cellEl.querySelector("input") as HTMLInputElement;
          if (cb) cb.checked = !!value;
        } else {
          cellEl.textContent = value !== undefined && value !== null ? String(value) : "";
        }
      }
    }
    this.emit("cell_change", { rowId: this.rows[row].id, colId: colDef.id, value, oldValue, source });
  }

  // ---- Keyboard ----

  private onKeyDown(e: KeyboardEvent): void {
    if (this.editingCell) return; // Let the input handle keys
    if (!this.selectedStart) return;
    let { row, col } = this.selectedStart;
    let handled = true;

    switch (e.key) {
      case "ArrowUp": row = Math.max(0, row - 1); break;
      case "ArrowDown": row = Math.min(this.rows.length - 1, row + 1); break;
      case "ArrowLeft": col = Math.max(0, col - 1); break;
      case "ArrowRight": col = Math.min(this.columns.length - 1, col + 1); break;
      case "Tab":
        col = e.shiftKey ? Math.max(0, col - 1) : Math.min(this.columns.length - 1, col + 1);
        break;
      case "Enter":
        if (this.opts.editable) this.startEditing(row, col);
        break;
      case "F2":
        if (this.opts.editable) this.startEditing(row, col);
        break;
      case "Delete":
      case "Backspace":
        // Clear selected cells
        const cells = this.getSelectedCells();
        for (const c of cells) {
          this.setCellValue(c.row, c.col, "", "keyboard");
        }
        break;
      case "Escape":
        this.clearSelection();
        break;
      default:
        // If it's a printable character, start editing
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && this.opts.editable) {
          this.startEditing(row, col);
          handled = false; // Let the input receive the key
        } else {
          handled = false;
        }
    }
    if (handled) {
      e.preventDefault();
      if (e.key !== "Enter" && e.key !== "Delete" && e.key !== "Backspace" && e.key !== "Escape" && e.key !== "F2") {
        this.selectCell(row, col);
      }
    }
  }

  // ---- Column resize ----

  private onResizeStart(e: PointerEvent, colId: string): void {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = this.colWidths.get(colId) ?? DEFAULT_COL_WIDTH;
    const onMove = (ev: PointerEvent) => {
      const newWidth = Math.max(this.opts.minColWidth, startWidth + (ev.clientX - startX));
      this.colWidths.set(colId, newWidth);
      // Update the grid template
      this.updateGridTemplate();
      // Update the col header width
      const header = this.colHeaderEls.find(h => h.getAttribute("data-col") === colId);
      if (header) header.style.width = `${newWidth}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.emit("column_resize", { colId, value: this.colWidths.get(colId), source: "pointer" });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private updateGridTemplate(): void {
    const templateCols = (this.opts.rowNumbers ? ["40px"] : []).concat(
      this.columns.map(c => `${this.colWidths.get(c.id) ?? DEFAULT_COL_WIDTH}px`)
    );
    this.gridEl.style.gridTemplateColumns = templateCols.join(" ");
  }

  // ---- Column reorder ----

  private onReorderStart(e: PointerEvent, colId: string): void {
    e.stopPropagation();
    e.preventDefault();
    const fromIdx = this.columns.findIndex(c => c.id === colId);
    if (fromIdx < 0) return;
    const headerEl = this.colHeaderEls[fromIdx];
    headerEl.classList.add("te-dragging");

    const onMove = (ev: PointerEvent) => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const colHeader = target?.closest(".te-col-header") as HTMLElement | null;
      this.colHeaderEls.forEach(h => h.classList.remove("te-drop-target"));
      if (colHeader && colHeader !== headerEl) {
        colHeader.classList.add("te-drop-target");
      }
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      headerEl.classList.remove("te-dragging");
      const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const dropHeader = target?.closest(".te-col-header") as HTMLElement | null;
      this.colHeaderEls.forEach(h => h.classList.remove("te-drop-target"));
      if (dropHeader) {
        const toIdx = Number(dropHeader.getAttribute("data-col-index"));
        if (!isNaN(toIdx) && toIdx !== fromIdx) {
          this.moveColumn(fromIdx, toIdx);
        }
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  moveColumn(fromIdx: number, toIdx: number): void {
    if (fromIdx < 0 || fromIdx >= this.columns.length || toIdx < 0 || toIdx >= this.columns.length) return;
    const [col] = this.columns.splice(fromIdx, 1);
    this.columns.splice(toIdx, 0, col);
    this.render();
    this.emit("column_reorder", { colId: col.id, fromIndex: fromIdx, toIndex: toIdx, source: "pointer" });
  }

  // ---- Sort ----

  toggleSort(colId: string): void {
    if (this.sortState?.col === colId) {
      if (this.sortState.direction === "asc") {
        this.sortState = { col: colId, direction: "desc" };
      } else {
        this.sortState = null; // Cycle: asc → desc → none
      }
    } else {
      this.sortState = { col: colId, direction: "asc" };
    }
    this.applySort();
    this.render();
    this.emit("sort_change", { col: colId, direction: this.sortState?.direction ?? null, source: "pointer" });
  }

  private applySort(): void {
    if (!this.sortState) return;
    const col = this.columns.find(c => c.id === this.sortState!.col);
    if (!col) return;
    const dir = this.sortState.direction === "asc" ? 1 : -1;
    this.rows.sort((a, b) => {
      const av = a[col.id];
      const bv = b[col.id];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  private updateSortIndicators(): void {
    // Already handled in render() via renderColHeader
  }

  // ---- Data operations ----

  addRow(data?: Partial<TableRow>): string {
    const id = data?.id ?? uid("row");
    const row: TableRow = { id, ...data };
    // Fill missing columns with undefined
    for (const col of this.columns) {
      if (!(col.id in row)) row[col.id] = "";
    }
    this.rows.push(row);
    this.render();
    this.emit("row_added", { rowId: id, source: "programmatic" });
    return id;
  }

  removeRow(rowIdx: number): void {
    if (rowIdx < 0 || rowIdx >= this.rows.length) return;
    const rowId = this.rows[rowIdx].id;
    this.rows.splice(rowIdx, 1);
    if (this.selectedStart && this.selectedStart.row >= this.rows.length) {
      this.selectedStart = this.rows.length > 0 ? { row: this.rows.length - 1, col: 0 } : null;
      this.selectedEnd = this.selectedStart;
    }
    this.render();
    this.emit("row_removed", { rowId, source: "programmatic" });
  }

  addColumn(col?: Partial<TableColumn>): string {
    const id = col?.id ?? uid("col");
    const newCol: TableColumn = {
      id,
      label: col?.label ?? `Column ${this.columns.length + 1}`,
      type: col?.type ?? "text",
      width: col?.width ?? DEFAULT_COL_WIDTH,
      align: col?.align,
      sortable: col?.sortable,
      editable: col?.editable,
      options: col?.options,
    };
    this.columns.push(newCol);
    this.colWidths.set(id, newCol.width ?? DEFAULT_COL_WIDTH);
    // Add empty value to existing rows
    for (const row of this.rows) {
      row[id] = "";
    }
    this.render();
    this.emit("column_added", { colId: id, source: "programmatic" });
    return id;
  }

  removeColumn(colId: string): void {
    const idx = this.columns.findIndex(c => c.id === colId);
    if (idx < 0) return;
    this.columns.splice(idx, 1);
    this.colWidths.delete(colId);
    for (const row of this.rows) {
      delete row[colId];
    }
    this.render();
    this.emit("column_removed", { colId, source: "programmatic" });
  }

  // ---- Accessors ----

  getRows(): TableRow[] { return this.rows.map(r => ({ ...r })); }
  getColumns(): TableColumn[] { return this.columns.map(c => ({ ...c })); }
  getCellValue(rowIdx: number, colId: string): unknown {
    return this.rows[rowIdx]?.[colId];
  }
  getSort(): { col: string; direction: "asc" | "desc" } | null {
    return this.sortState ? { ...this.sortState } : null;
  }

  setRows(rows: TableRow[]): void {
    if (this._destroyed) return;
    this.rows = rows.map(r => ({ ...r }));
    this.applySort();
    this.render();
  }

  setColumns(columns: TableColumn[]): void {
    if (this._destroyed) return;
    this.columns = columns.map(c => ({ ...c }));
    this.colWidths.clear();
    for (const col of this.columns) {
      this.colWidths.set(col.id, col.width ?? DEFAULT_COL_WIDTH);
    }
    this.render();
  }

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "frozenHeader": this.opts.frozenHeader = !!value; break;
      case "frozenFirstCol": this.opts.frozenFirstCol = !!value; break;
      case "rowNumbers": this.opts.rowNumbers = !!value; break;
      case "striped": this.opts.striped = !!value; break;
      case "editable": this.opts.editable = !!value; break;
      case "selectable": this.opts.selectable = !!value; break;
      case "resizable": this.opts.resizable = !!value; break;
      case "reorderable": this.opts.reorderable = !!value; break;
      case "sortable": this.opts.sortable = !!value; break;
      case "rows": this.setRows(value as TableRow[]); return;
      case "columns": this.setColumns(value as TableColumn[]); return;
      default: return;
    }
    this.render();
  }

  // ---- Events ----

  on(event: string, handler: TableEditorHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }
  off(event: string, handler: TableEditorHandler): void {
    this.listeners.get(event)?.delete(handler);
  }
  private emit(event: string, payload: TableEditorEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) { try { h(p); } catch (e) { console.error(e); } }
  }

  // ---- Destroy ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.listeners.clear();
    this.container.innerHTML = "";
  }
}
