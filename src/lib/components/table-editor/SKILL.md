# SKILL.md — Table Editor

A vanilla JavaScript spreadsheet-style table component. Cell selection
(single + range via drag), inline editing (double-click, Enter, F2, or
any printable key), column resize via header edge drag, column reorder
via header grip drag, click-to-sort (asc -> desc -> none), frozen header
row and optional frozen first column, row numbers, four cell types
(text / number / checkbox / select), full keyboard navigation, and a
toolbar for add/remove row and column. DOM-based with CSS Grid,
framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  TableEditor,
  type CellType,
  type TableColumn,
  type TableRow,
  type TableEditorOptions,
  type TableEditorEventPayload,
  type TableEditorHandler,
} from "@/lib/components/table-editor";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const table = new TableEditor(document.getElementById("host")!, {
  columns: [
    { id: "name", label: "Name", type: "text", width: 160 },
    { id: "age", label: "Age", type: "number", align: "right" },
    { id: "active", label: "Active", type: "checkbox" },
    { id: "role", label: "Role", type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
      ] },
  ],
  rows: [
    { id: "r1", name: "Ada", age: 36, active: true, role: "admin" },
    { id: "r2", name: "Grace", age: 85, active: false, role: "user" },
  ],
});

table.on("cell_change", ({ rowId, colId, value }) => {
  console.log(`${rowId}.${colId} =`, value);
});

table.on("sort_change", ({ col, direction }) => {
  console.log(`sorted by ${col} ${direction ?? "none"}`);
});

// later
table.destroy();
```

---

## Constructor

```ts
new TableEditor(container: HTMLElement, options?: TableEditorOptions)
```

The container must have a fixed or flex-grown height — `.te-root` is
`height: 100%; width: 100%`, so a zero-height host produces an invisible
table. No `ResizeObserver` is attached; the table does not re-render on
container resize (column widths are fixed pixel values, so resize is
usually not needed).

### Options

| Option            | Type                          | Default | Description                                                       |
|-------------------|-------------------------------|---------|-------------------------------------------------------------------|
| `columns`         | `TableColumn[]`               | `[]`    | Column definitions.                                               |
| `rows`            | `TableRow[]`                  | `[]`    | Row data.                                                         |
| `frozenHeader`    | `boolean`                     | `true`  | Keep the header row sticky at the top when scrolling vertically.  |
| `frozenFirstCol`  | `boolean`                     | `false` | Keep the first column sticky at the left when scrolling horizontally. |
| `rowNumbers`      | `boolean`                     | `true`  | Show a row-number column (and the corner `#` cell).               |
| `showToolbar`     | `boolean`                     | `true`  | Show the add-row / add-column / del-row toolbar.                  |
| `selectable`      | `boolean`                     | `true`  | Allow cell selection (click, drag, keyboard).                     |
| `editable`        | `boolean`                     | `true`  | Allow inline cell editing.                                        |
| `resizable`       | `boolean`                     | `true`  | Show column resize handles.                                       |
| `reorderable`     | `boolean`                     | `true`  | Show column reorder grips.                                        |
| `sortable`        | `boolean`                     | `true`  | Click column headers to sort.                                     |
| `striped`         | `boolean`                     | `true`  | Alternate row background for readability.                         |
| `minColWidth`     | `number`                      | `60`    | Minimum column width in pixels (enforced during resize).          |

### Column shape

```ts
interface TableColumn {
  id: string;            // unique; used as the row cell key
  label: string;         // header text
  type?: CellType;       // "text" | "number" | "checkbox" | "select" (default "text")
  width?: number;        // initial width in pixels (default 120)
  align?: "left" | "center" | "right";  // default "left"
  sortable?: boolean;    // per-column override (global `sortable` must also be true)
  editable?: boolean;    // per-column override (global `editable` must also be true)
  options?: { label: string; value: unknown }[];  // required for type === "select"
}
```

### Row shape

```ts
interface TableRow {
  id: string;            // unique row id
  [cellId: string]: unknown;  // cell values keyed by column id
}
```

Cell values can be any type. `text` and `select` cells render via
`String(value)`; `number` cells render via `String(value)` and commit
via `Number(input.value)`; `checkbox` cells render via `input.checked`
and commit a boolean.

---

## Methods

### Selection

| Method                                   | Returns                              | Description                                                       |
|------------------------------------------|--------------------------------------|-------------------------------------------------------------------|
| `selectCell(row, col)`                   | `void`                               | Select a single cell. Emits `selection_change` with `source: "programmatic"`. |
| `selectRow(row, source?)`                | `void`                               | Select every cell in a row. `source` defaults to `"programmatic"`. |
| `selectCol(col, source?)`                | `void`                               | Select every cell in a column. `source` defaults to `"programmatic"`. |
| `clearSelection()`                       | `void`                               | Clear the selection. Emits `selection_change` with `selectedCells: []`. |
| `getSelectedCells()`                     | `{ row, col }[]`                     | Enumerate every cell in the selection's bounding box.            |

### Editing

| Method                                   | Returns | Description                                                       |
|------------------------------------------|---------|-------------------------------------------------------------------|
| `startEditing(row, col)`                 | `void`  | Open the inline editor on a cell. No-op if `editable` is false or the column is not editable. |
| `cancelEditing()`                        | `void`  | Close the inline editor without committing (blur also cancels).  |
| `setCellValue(row, col, value, source?)` | `void`  | Write a value to a cell. Emits `cell_change`. `source` defaults to `"programmatic"`. |

### Column operations

| Method                       | Returns   | Description                                                       |
|------------------------------|-----------|-------------------------------------------------------------------|
| `moveColumn(fromIdx, toIdx)` | `void`    | Reorder a column. Triggers a full re-render. Emits `column_reorder`. |
| `toggleSort(colId)`          | `void`    | Cycle sort: `null -> asc -> desc -> null`. Emits `sort_change`.   |
| `addColumn(col?)`            | `string`  | Append a column. Returns the new column id (auto-generated if not provided). Emits `column_added`. |
| `removeColumn(colId)`        | `void`    | Remove a column by id. Emits `column_removed`.                    |

### Row operations

| Method                  | Returns | Description                                                       |
|-------------------------|---------|-------------------------------------------------------------------|
| `addRow(data?)`         | `string`| Append a row. Returns the new row id (auto-generated if not provided). Missing columns are filled with `""`. Emits `row_added`. |
| `removeRow(rowIdx)`     | `void`  | Remove a row by **index** (not id — see AGENT.md Known Issues). Emits `row_removed`. |

### Accessors

| Method                       | Returns                                | Description                                                       |
|------------------------------|----------------------------------------|-------------------------------------------------------------------|
| `getRows()`                  | `TableRow[]`                           | Shallow clones of all rows (in current display order).            |
| `getColumns()`               | `TableColumn[]`                        | Shallow clones of all columns (in current display order).         |
| `getCellValue(rowIdx, colId)`| `unknown`                              | Read a cell value. Note: row is by index, column is by id.        |
| `getSort()`                  | `{ col, direction } \| null`           | Current sort state (or null if unsorted).                         |

### Bulk updates

| Method                       | Returns | Description                                                       |
|------------------------------|---------|-------------------------------------------------------------------|
| `setRows(rows)`              | `void`  | Replace all rows. Re-applies the current sort.                    |
| `setColumns(columns)`        | `void`  | Replace all columns. Resets column widths.                        |

### Runtime configuration

| Method                       | Returns | Description                                                       |
|------------------------------|---------|-------------------------------------------------------------------|
| `setProperty(name, value)`   | `void`  | Update one option at runtime. Supported `name`s: `frozenHeader`, `frozenFirstCol`, `rowNumbers`, `striped`, `editable`, `selectable`, `resizable`, `reorderable`, `sortable`, `rows`, `columns`. Triggers a re-render. |
| `on(event, handler)`         | `void`  | Subscribe to an event (see below).                                |
| `off(event, handler)`        | `void`  | Unsubscribe.                                                      |
| `destroy()`                  | `void`  | Tear down. Idempotent. Clears listeners and DOM.                  |

---

## Events

All payloads include `type` (the event name) and `source`
(`"pointer"`, `"keyboard"`, or `"programmatic"`).

| Event               | Payload                                                                        | When                                                          |
|---------------------|--------------------------------------------------------------------------------|---------------------------------------------------------------|
| `selection_change`  | `{ selectedCells: {row,col}[], source }`                                       | Selection changed (click, drag, shift-click, keyboard, programmatic). |
| `cell_change`       | `{ rowId, colId, value, oldValue, source }`                                    | A cell's value changed (edit commit, checkbox toggle, Delete clear, or `setCellValue`). |
| `column_resize`     | `{ colId, value: number, source: "pointer" }`                                  | User finished dragging a column resize handle.                |
| `column_reorder`    | `{ colId, fromIndex, toIndex, source: "pointer" }`                             | User dropped a column header onto a different position.       |
| `sort_change`       | `{ col, direction: "asc" \| "desc" \| null, source: "pointer" }`              | User clicked a sortable column header (cycle asc -> desc -> none). |
| `row_added`         | `{ rowId, source: "programmatic" }`                                            | `addRow()` succeeded.                                         |
| `row_removed`       | `{ rowId, source: "programmatic" }`                                            | `removeRow()` succeeded.                                      |
| `column_added`      | `{ colId, source: "programmatic" }`                                            | `addColumn()` succeeded.                                      |
| `column_removed`    | `{ colId, source: "programmatic" }`                                            | `removeColumn()` succeeded.                                   |

```ts
table.on("cell_change", ({ rowId, colId, value, oldValue }) => {
  saveCell(rowId, colId, value);
});
table.on("selection_change", ({ selectedCells }) => {
  updateInspector(selectedCells);
});
table.on("sort_change", ({ col, direction }) => {
  // Note: rows are already re-sorted in table.getRows()
});
```

---

## CSS Custom Properties

All declared on `.te-root` and cascade to children. Override on the host
element or any ancestor to retheme.

| Variable            | Default                    | Description                                                        |
|---------------------|----------------------------|--------------------------------------------------------------------|
| `--te-bg`           | `#101014`                  | Obsidian — root background and default cell background.            |
| `--te-surface`      | `#211A30`                  | Deep Violet — toolbar background, striped cells, frozen cells.     |
| `--te-surface-2`    | `#2A2238`                  | Column headers, row headers, buttons.                              |
| `--te-surface-3`    | `#342348`                  | Corner cell, header hover.                                         |
| `--te-border`       | `#383343`                  | All cell / header / root borders; scrollbar thumb.                 |
| `--te-text`         | `#F4F1FF`                  | Primary text color.                                                |
| `--te-muted`        | `#B8B2CA`                  | Row header numbers, info text.                                     |
| `--te-accent`       | `#D9FF66`                  | Lemon Signal — selection, sort indicator, focus ring, input border.|
| `--te-accent-dim`   | `rgba(217,255,102,0.12)`   | Selected row header background.                                    |
| `--te-selected`     | `rgba(217,255,102,0.18)`   | Selected cell background.                                          |
| `--te-radius`       | `6px`                      | Root border radius.                                                |

The component also reads `--font-mono` for the info label and row headers
(falls back to `ui-monospace, monospace`).

---

## Keyboard Shortcuts

The `.te-scroll` element has `tabindex=0` and receives keyboard events
when focused. Shortcuts are disabled while a cell is being edited (so
the input receives keys normally).

| Key                  | Action                                                       |
|----------------------|--------------------------------------------------------------|
| `ArrowUp/Down/Left/Right` | Move the selection by one cell (clamped to bounds).      |
| `Tab` / `Shift+Tab`  | Move selection right / left by one column.                   |
| `Enter`              | Start editing the selected cell. After edit, moves down.     |
| `F2`                 | Start editing the selected cell.                             |
| `Delete` / `Backspace`| Clear all selected cells (set to `""`).                     |
| `Escape`             | Clear selection.                                              |
| Printable char       | Start editing the selected cell; the input receives the key. |

---

## Examples

### Minimal table

```ts
const table = new TableEditor(host, {
  columns: [
    { id: "name", label: "Name" },
    { id: "email", label: "Email", width: 200 },
  ],
  rows: [
    { id: "1", name: "Ada", email: "ada@example.com" },
    { id: "2", name: "Grace", email: "grace@example.com" },
  ],
});
```

### All four cell types

```ts
const table = new TableEditor(host, {
  columns: [
    { id: "name", label: "Name", type: "text", width: 160 },
    { id: "age", label: "Age", type: "number", align: "right" },
    { id: "active", label: "Active", type: "checkbox", align: "center" },
    { id: "role", label: "Role", type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
        { label: "Viewer", value: "viewer" },
      ] },
  ],
  rows: [
    { id: "r1", name: "Ada", age: 36, active: true, role: "admin" },
    { id: "r2", name: "Grace", age: 85, active: false, role: "viewer" },
  ],
});
```

### Frozen first column + striped rows

```ts
const table = new TableEditor(host, {
  frozenFirstCol: true,
  striped: true,
  columns: [
    { id: "id", label: "ID", width: 80, editable: false },
    { id: "title", label: "Title", width: 240 },
    { id: "owner", label: "Owner" },
    { id: "status", label: "Status" },
  ],
  rows: data,
});
```

### Programmatic add / remove

```ts
const newRowId = table.addRow({ name: "New", age: 0, active: true, role: "user" });
table.addRow();  // empty row with auto-generated id

table.removeRow(0);  // remove by index
table.removeColumn("age");
```

### Programmatic selection and editing

```ts
table.selectCell(0, 0);
table.selectRow(2);
table.selectCol(1);
table.clearSelection();

table.startEditing(0, 1);
// ...or
table.setCellValue(0, 1, "new value", "programmatic");
```

### React to cell changes and persist

```ts
table.on("cell_change", async ({ rowId, colId, value }) => {
  await api.updateCell(rowId, colId, value);
});
```

### Sort and read back

```ts
table.toggleSort("age");          // asc
table.toggleSort("age");          // desc
table.toggleSort("age");          // null (rows remain in last-sorted order)

const sortedRows = table.getRows();  // returns rows in current display order
const sortState = table.getSort();   // { col: "age", direction: "asc" } | null
```

### Move a column programmatically

```ts
table.moveColumn(0, 2);  // move column at index 0 to index 2
```

### Toggle options at runtime

```ts
table.setProperty("editable", false);   // make read-only
table.setProperty("striped", false);
table.setProperty("frozenFirstCol", true);
table.setProperty("selectable", false);
```

### Retheme via CSS variables

```css
.my-table-host {
  --te-accent: #FF6B9D;          /* pink selection instead of lemon */
  --te-selected: rgba(255,107,157,0.18);
  --te-surface: #1A1A24;
}
```

```ts
const table = new TableEditor(hostEl, {});
// hostEl has class "my-table-host"
```

---

## Integration Notes

**When to use:** Editing tabular data with inline cell editing, column
resize / reorder, and click-to-sort. Good for admin panels, data
explorers, configuration tables, and lightweight spreadsheet UIs.

**When not to use:** When you need copy/paste (the header comment claims
it but it is NOT implemented — see AGENT.md Known Issues), multi-cell
range edit / fill, virtualized rendering for thousands of rows, or
formula support. For a presentational-only table (no editing), a plain
HTML table may be simpler.

**When not to use:** When you need to preserve the original row order
through sorts. `applySort()` is destructive and does not remember the
pre-sort order. Keep your own copy of the rows if you need to restore.

**Alternatives:**
- For a presentational timeline of dated entries, see
  [Timeline](../timeline/SKILL.md).
- For document editing with rich text, see
  [Rich Text Editor](../rich-text-editor/SKILL.md).
- For a scrollable container, see [Scroll Layout](../scroll-layout/SKILL.md).

**Container sizing:** The container must have a fixed or flex-grown
height. `.te-root` is `height: 100%; width: 100%`. A zero-height host
produces an invisible table. The component does not attach a
`ResizeObserver` — column widths are fixed pixel values, so container
resize is generally a non-issue, but if the host shrinks horizontally,
the table will overflow horizontally and the user can scroll.

**Selection after sort/reorder:** Selection is by index, not by ID. After
a `toggleSort`, `moveColumn`, or `setRows` call, the selected indices may
point to different data. Call `clearSelection()` after these operations
if you don't want stale indices.

**`removeRow` takes an index; `removeColumn` takes an ID.** This
inconsistency is documented in AGENT.md Known Issues. Be careful when
scripting programmatic mutations.

**`select` cells display the raw value, not the option label.** If your
`options` use non-string values or objects, the committed cell will show
`[object Object]` or similar. Map option values to display strings if
needed, or post-process via `setCellValue` with the label.

**Accessibility:** The `.te-scroll` element has `tabindex=0` so it
receives keyboard focus. Cells are plain `<div>`s with `data-row` /
`data-col` attributes; they are not individually focusable. The
component does not apply ARIA grid roles. For a screen-reader-accessible
table, wrap with `role="grid"` / `role="row"` / `role="gridcell"` or
use a native `<table>`.

**Retheming:** All colors come from `--te-*` CSS variables. Override on
the host element or any ancestor. The lemon accent (`#D9FF66`) is the
default for selection, sort indicator, focus ring, and inline edit
input border.
