# AGENT.md — Table Editor

Contribution guide for `src/lib/components/table-editor/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**TableEditor** — a spreadsheet-style table component with cell selection
(single + range via drag), inline cell editing (double-click, Enter, F2,
or printable key), column resize, column reorder via header drag grip,
click-to-sort (asc -> desc -> none), frozen header row and optional
frozen first column, row numbers, four cell types (text / number /
checkbox / select), full keyboard navigation, and a toolbar for
add/remove row and column. Pure DOM using CSS Grid for layout, scoped
`.te-*` styles, no canvas, no framework.

This is one of the largest components in the library (~1100 lines).

## File Structure

```
src/lib/components/table-editor/
├── AGENT.md            <- this file
├── SKILL.md            <- usage docs
├── table-editor.ts     <- the TableEditor class (DOM + scoped CSS + interactions)
└── index.ts            <- barrel: class, types
```

## Architecture

### DOM structure

```
.te-root
├── .te-toolbar                 (only if showToolbar)
│   ├── button.te-btn           "Add row"
│   ├── button.te-btn           "Add column"
│   ├── button.te-btn.te-danger "Del row"
│   ├── .te-spacer
│   └── .te-info                "N rows x M cols"
└── .te-scroll                  (tabindex=0; receives keyboard)
    └── .te-grid                (display: inline-grid; gridTemplateColumns set inline)
        ├── .te-corner          (sticky TL; only if rowNumbers)
        ├── .te-col-header[s]   (sticky top; per column)
        ├── .te-row-header[s]   (sticky left; per row, only if rowNumbers)
        └── .te-cell[s]         (per row x col)
```

Rows are not wrapped in a `<div>` — the grid uses `display: contents`
on `.te-row` placeholders is NOT used; instead, cells are appended
directly to `.te-grid` in row-major order. The `gridTemplateColumns`
style encodes the column widths (prefixed by a 40px row-number column
when `rowNumbers` is on).

Sticky positioning handles frozen header (`position: sticky; top: 0`)
and frozen first column (`position: sticky; left: 0`). The corner cell
(`.te-corner`) is sticky on both axes with the highest z-index (4).

### Cell types

Each `TableColumn` has an optional `type: "text" | "number" | "checkbox" | "select"`.

- `text` (default) — rendered as plain text. Edited with an
  `<input type="text">`.
- `number` — rendered as plain text. Edited with `<input type="number">`.
  The value is converted via `Number()` on commit.
- `checkbox` — rendered as `<input type="checkbox">`. No edit mode; the
  checkbox toggles directly on click. Respects `editable`.
- `select` — rendered as plain text (the selected option's label is NOT
  shown; only the raw value). Edited with a `<select>` dropdown populated
  from `column.options`. Commits on change.

### Selection model

Selection is a rectangle defined by two corners: `selectedStart` and
`selectedEnd` (both `{ row, col }`). `getSelectedCells()` enumerates
every cell inside the bounding box. Single-cell selection is the special
case where `start === end`.

Selection is mutated by:

- **Click** — sets start = end = clicked cell.
- **Shift+click** — extends `selectedEnd` to the clicked cell (range).
- **Drag** — `pointerdown` on a cell sets start = end, then `pointermove`
  on `window` uses `document.elementFromPoint` to find the cell under the
  cursor and updates `selectedEnd`. `pointerup` removes the window
  listeners.
- **`selectCell(row, col)`** — programmatic single-cell selection.
- **`selectRow(row)` / `selectCol(col)`** — programmatic range covering
  the full row or column.
- **Keyboard** — Arrow keys move `selectedStart` (single-cell). Tab /
  Shift+Tab move horizontally. See "Keyboard model" below.

`updateSelectionDom()` clears the `.te-selected` class from every cell
and row header, then re-applies it to the bounding box. This is O(n) per
selection change but is cheap for typical table sizes (hundreds of cells).

### Editing model

`startEditing(row, col)`:

1. If another cell is being edited, `cancelEditing()` it first.
2. Validate bounds and the column's `editable` flag.
3. Set `editingCell = { row, col }`, add `.te-editing` to the cell,
   clear its innerHTML.
4. For `select` columns, append a `<select>` with `<option>`s from
   `column.options`. Commit on `change` or `Enter`; cancel on `Escape`
   or `blur`.
5. For `text` / `number` columns, append an `<input>`. Commit on `Enter`
   (also moves selection down) or `Tab` (also moves selection right);
   cancel on `Escape` or `blur`.
6. Focus and select the input's contents.

`cancelEditing()` clears the `.te-editing` class and re-renders the
cell's display content from the stored row data.

`setCellValue(row, col, value, source)` writes to `this.rows[row][colId]`,
updates the DOM if not currently editing that cell, and emits `cell_change`
with `{ rowId, colId, value, oldValue, source }`.

### Column resize

A `.te-resize-handle` (5px wide, absolutely positioned on the right edge
of each column header) captures `pointerdown`. The handler:

1. Records the starting X and the column's current width.
2. On `window` `pointermove`, computes `newWidth = max(minColWidth, startWidth + deltaX)`.
3. Updates `colWidths.get(colId)`, calls `updateGridTemplate()` (rewrites
   `gridTemplateColumns` on `.te-grid`), and updates the column header's
   inline width.
4. On `pointerup`, removes the window listeners and emits `column_resize`.

### Column reorder

A `.te-reorder-grip` (10px wide, on the left of each column header when
`reorderable` is on) captures `pointerdown`. The handler:

1. Adds `.te-dragging` to the source header (50% opacity).
2. On `window` `pointermove`, uses `document.elementFromPoint` to find
   the column header under the cursor and adds `.te-drop-target` to it
   (a 2px accent border on the left).
3. On `pointerup`, removes listeners and classes, finds the drop target,
   and calls `moveColumn(fromIdx, toIdx)` if the indices differ.

`moveColumn(fromIdx, toIdx)` splices the `columns` array, calls `render()`
(full rebuild), and emits `column_reorder`.

### Sort model

`toggleSort(colId)` cycles the sort state for a column:
`null -> asc -> desc -> null`. Each click calls `applySort()` then
`render()` and emits `sort_change`.

`applySort()` sorts `this.rows` in place using:
- Numbers compared numerically.
- Other values compared via `String().localeCompare()`.
- `undefined` / `null` sorts last regardless of direction.

The sort is **destructive** — `this.rows` is reordered. The original
order is not preserved. Sort indicators are rendered in `renderColHeader`
via `.te-sort-asc` / `.te-sort-desc` classes.

### Keyboard model

Attached to `.te-scroll` (which has `tabindex=0`). The handler no-ops
while a cell is being edited (so the input receives keys normally).

| Key                  | Action                                                       |
|----------------------|--------------------------------------------------------------|
| `ArrowUp/Down/Left/Right` | Move `selectedStart` by one cell (clamped to bounds).   |
| `Tab` / `Shift+Tab`  | Move selection right / left by one column.                   |
| `Enter`              | Start editing the selected cell.                             |
| `F2`                 | Start editing the selected cell.                             |
| `Delete` / `Backspace`| Clear all selected cells (set to `""`).                     |
| `Escape`             | Clear selection.                                              |
| Printable char       | Start editing the selected cell; the input receives the key. |

After Enter/Tab commits an edit, selection moves automatically (down for
Enter, right for Tab).

### Public API surface

```ts
class TableEditor {
  constructor(container: HTMLElement, options?: TableEditorOptions);

  // Selection
  selectCell(row: number, col: number): void;
  selectRow(row: number, source?: "pointer" | "keyboard" | "programmatic"): void;
  selectCol(col: number, source?: "pointer" | "keyboard" | "programmatic"): void;
  clearSelection(): void;
  getSelectedCells(): { row: number; col: number }[];

  // Editing
  startEditing(row: number, col: number): void;
  cancelEditing(): void;
  setCellValue(row: number, col: number, value: unknown, source?: "pointer" | "keyboard" | "programmatic"): void;

  // Column ops
  moveColumn(fromIdx: number, toIdx: number): void;
  toggleSort(colId: string): void;
  addColumn(col?: Partial<TableColumn>): string;
  removeColumn(colId: string): void;

  // Row ops
  addRow(data?: Partial<TableRow>): string;
  removeRow(rowIdx: number): void;

  // Accessors
  getRows(): TableRow[];
  getColumns(): TableColumn[];
  getCellValue(rowIdx: number, colId: string): unknown;
  getSort(): { col: string; direction: "asc" | "desc" } | null;

  // Bulk updates
  setRows(rows: TableRow[]): void;
  setColumns(columns: TableColumn[]): void;

  // Runtime config
  setProperty(name: string, value: unknown): void;

  // Events
  on(event: string, handler: TableEditorHandler): void;
  off(event: string, handler: TableEditorHandler): void;

  // Lifecycle
  destroy(): void;
}

interface TableEditorOptions {
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

interface TableColumn {
  id: string;
  label: string;
  type?: CellType;                              // "text" | "number" | "checkbox" | "select"
  width?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  editable?: boolean;
  options?: { label: string; value: unknown }[];  // for type === "select"
}

interface TableRow {
  id: string;
  [cellId: string]: unknown;   // cell values keyed by column id
}

interface TableEditorEventPayload {
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

type CellType = "text" | "number" | "checkbox" | "select";
type TableEditorHandler = (payload: TableEditorEventPayload) => void;
```

### Internal state

- `container`, `root`, `scrollEl`, `gridEl` — DOM handles.
- `opts: Required<TableEditorOptions>` — resolved options with defaults:
  `frozenHeader: true`, `frozenFirstCol: false`, `rowNumbers: true`,
  `showToolbar: true`, `selectable: true`, `editable: true`,
  `resizable: true`, `reorderable: true`, `sortable: true`,
  `striped: true`, `minColWidth: 60`.
- `columns: TableColumn[]` — shallow-cloned column defs. Source of truth
  for column order, labels, types, and widths.
- `rows: TableRow[]` — shallow-cloned row data. Source of truth for cell
  values. Note: this is the actual array that gets sorted in place by
  `applySort()`; the original order is not preserved.
- `selectedStart`, `selectedEnd: { row, col } | null` — selection range.
- `editingCell: { row, col } | null` — the cell currently being edited,
  or null.
- `sortState: { col, direction } | null` — current sort.
- `colWidths: Map<string, number>` — runtime column widths in pixels.
  Initialized from `column.width ?? DEFAULT_COL_WIDTH` (120) on
  construction and `setColumns()`. Mutated by resize.
- `cellEls: HTMLElement[][]`, `rowHeaderEls: HTMLElement[]`,
  `colHeaderEls: HTMLElement[]` — DOM caches rebuilt on every `render()`.
- `listeners: Map<string, Set<TableEditorHandler>>` — event subscriptions.
- `_destroyed: boolean` — idempotency guard for `destroy()`.

### Events

Emitted via the `Map<string, Set<Handler>>` pattern with try/catch
wrapping per handler (errors are logged with `console.error` and do not
break other handlers). Every payload includes `type` set to the event
name and `source` (`"pointer"`, `"keyboard"`, or `"programmatic"`).

| Event               | Payload                                                                        | When                                                          |
|---------------------|--------------------------------------------------------------------------------|---------------------------------------------------------------|
| `selection_change`  | `{ selectedCells, source }`                                                    | Selection changed (click, drag, shift-click, keyboard, programmatic). |
| `cell_change`       | `{ rowId, colId, value, oldValue, source }`                                    | A cell's value changed (edit commit, checkbox toggle, Delete clear, or `setCellValue`). |
| `column_resize`     | `{ colId, value: number, source: "pointer" }`                                  | User finished dragging a column resize handle.                |
| `column_reorder`    | `{ colId, fromIndex, toIndex, source: "pointer" }`                             | User dropped a column header onto a different position.       |
| `sort_change`       | `{ col, direction: "asc" \| "desc" \| null, source: "pointer" }`              | User clicked a sortable column header (cycle asc -> desc -> none). |
| `row_added`         | `{ rowId, source: "programmatic" }`                                            | `addRow()` succeeded.                                         |
| `row_removed`       | `{ rowId, source: "programmatic" }`                                            | `removeRow()` succeeded.                                      |
| `column_added`      | `{ colId, source: "programmatic" }`                                            | `addColumn()` succeeded.                                      |
| `column_removed`    | `{ colId, source: "programmatic" }`                                            | `removeColumn()` succeeded.                                   |

### CSS custom properties

All declared on `.te-root` in `injectStyles()`:

| Variable            | Default                    | Purpose                                                        |
|---------------------|----------------------------|----------------------------------------------------------------|
| `--te-bg`           | `#101014`                  | Obsidian — root background and default cell background.        |
| `--te-surface`      | `#211A30`                  | Deep Violet — toolbar background, striped cells, frozen cells. |
| `--te-surface-2`    | `#2A2238`                  | Column headers, row headers, buttons.                          |
| `--te-surface-3`    | `#342348`                  | Corner cell, header hover.                                     |
| `--te-border`       | `#383343`                  | All cell / header / root borders; scrollbar thumb.             |
| `--te-text`         | `#F4F1FF`                  | Primary text color.                                            |
| `--te-muted`        | `#B8B2CA`                  | Row header numbers, info text.                                 |
| `--te-accent`       | `#D9FF66`                  | Lemon Signal — selection, sort indicator, focus ring, input border. |
| `--te-accent-dim`   | `rgba(217,255,102,0.12)`   | Selected row header background.                                |
| `--te-selected`     | `rgba(217,255,102,0.18)`   | Selected cell background.                                      |
| `--te-radius`       | `6px`                      | Root border radius.                                            |

The component also reads an external `--font-mono` for the info label
and row headers (falls back to `ui-monospace, monospace`).

## Coding Conventions

- TypeScript strict, named exports (class + types).
- `injectStyles()` is idempotent — guarded by
  `document.getElementById(STYLE_ID)`. No-op if the `<style>` already
  exists. Also no-ops on non-DOM environments for SSR safety.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; clears all
  event listeners and empties the container's innerHTML. Does NOT
  release pointer capture (the component does not use
  `setPointerCapture` — it relies on `window`-level `pointermove` /
  `pointerup` listeners attached and detached per gesture).
- Events are dispatched through `Map<string, Set<Handler>>` with
  try/catch wrapping per handler (errors are logged via
  `console.error` and do not stop other handlers).
- `render()` is the single source of truth for DOM. All public mutators
  (`setRows`, `setColumns`, `moveColumn`, `toggleSort`, `addRow`,
  `removeRow`, `addColumn`, `removeColumn`, and most `setProperty`
  calls) end with a full re-render. The DOM caches (`cellEls`,
  `rowHeaderEls`, `colHeaderEls`) are rebuilt on every render.
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- **Copy/paste is documented in the header comment but NOT implemented.**
  The file header lists "Copy/paste (Ctrl+C / Ctrl+V)" as a feature,
  but there are no `copy` / `paste` / `clipboard` event handlers
  anywhere in the source. Ctrl+C and Ctrl+V currently fall through to
  the browser default (which copies the cell's text content if focused,
  but pastes into the wrong place if a cell input is not focused). To
  implement: add `copy` / `paste` listeners on `.te-scroll`, serialize
  the selected range to TSV on copy, and parse TSV into the selected
  range on paste.
- **`applySort()` is destructive and does not preserve the original
  row order.** `this.rows` is sorted in place. There is no "clear sort"
  that restores the original order — `toggleSort` cycles to `null` but
  the rows remain in their last-sorted order. To preserve the original
  order, the host must keep its own copy and call `setRows()` to
  restore.
- **Selection is by index, not by ID.** After a sort, column reorder,
  or `setRows()` call, the selected row/column indices may point to
  different data than the user expected. `applySort()` and `moveColumn()`
  do not remap the selection. The host should clear or re-anchor the
  selection after these operations if needed.
- **`removeRow(rowIdx)` takes an index; `removeColumn(colId)` takes an
  ID.** Inconsistent API. `getCellValue(rowIdx, colId)` similarly mixes
  index and ID. Be careful when scripting programmatic mutations.
- **`select` cells display the raw value, not the option label.** The
  cell renderer for non-editing `select` cells just calls
  `String(value)`. If the column's `options` use objects or non-string
  values, the display will be `[object Object]` or similar. The
  dropdown shows labels correctly during edit, but the committed cell
  shows the raw `value`.
- **`setProperty("selectable", false)` does not detach existing cell
  listeners.** Setting `selectable: false` only affects the next
  `render()`; existing cells still have their `pointerdown` / `dblclick`
  listeners until the next render. A `render()` call is triggered, so
  this is actually fine, but if you set `selectable: false` while a drag
  is in progress, the in-flight drag completes.
- **No virtualization.** All rows and cells are in the DOM. For tables
  with thousands of rows, this will be slow. A windowing layer would
  be needed.
- **Full re-render on every state change.** `addRow`, `removeRow`,
  `addColumn`, `removeColumn`, `moveColumn`, `toggleSort`, `setRows`,
  `setColumns`, and most `setProperty` calls trigger `render()`, which
  rebuilds the entire grid. For small tables this is fine; for tables
  with hundreds of rows, frequent edits can cause noticeable lag.
- **The `display: contents` row pattern is NOT used.** Despite the
  stylesheet declaring `.te-row { display: contents; }`, no `.te-row`
  elements are ever created — cells are appended directly to `.te-grid`.
  The `.te-row` rule is dead code.
- **`colId2` field in `TableEditorEventPayload` is never populated.**
  It's declared but no event ever sets it. Probably a vestige of a
  removed range-edit feature.
- **`reason` field in `TableEditorEventPayload` is never populated.**
  Same — declared but unused. (The Gantt component uses `reason` for
  move rejections; the table editor does not have a rejection concept.)
- **`cellId` field in `TableEditorEventPayload` is never populated.**
  Same — declared but unused. Cell changes use `rowId` + `colId`.

## Debugging Tips

- If the table doesn't render, check that `container` has a fixed or
  flex-grown height. `.te-root` is `height: 100%; width: 100%`, so a
  zero-height host produces an invisible table.
- To find a specific cell in DevTools, search for
  `[data-row="3"][data-col="2"]` — `data-row` is the row index, `data-col`
  is the column index (both 0-based). Column headers carry
  `data-col="<colId>"` (the column id, not the index).
- If column resize feels stuck, check `minColWidth` (default 60). The
  handle won't let you shrink below it.
- If `selectCol(0)` doesn't select the first column when
  `frozenFirstCol` is on, it's because the column header has both
  `te-frozen` and `te-col-header` classes — the selection highlight
  uses `.te-selected` which is correctly applied, but the frozen cell
  background overrides it. This is a known visual bug.
- To debug sort order, call `editor.getRows()` after `toggleSort` to
  see the post-sort row order. The selection may now point to
  different data than expected — call `clearSelection()` after sort
  if you don't want stale indices.
- The `cell_change` event fires for every Delete/Backspace clear of
  every selected cell. A range delete of 100 cells emits 100 events.
  If your persistence layer is expensive, debounce it on the host side.
- `setProperty("rows", newRows)` re-applies the current sort. If you
  want to preserve a specific order, clear the sort first
  (`toggleSort` until `getSort()` returns null) before calling
  `setRows`.
