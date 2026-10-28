# AGENT.md — Table Editor

A spreadsheet-style table editor with cell selection, inline editing, column resize/reorder, sort, freeze, and keyboard navigation.

## Architecture
- `table-editor.ts` — `TableEditor` class. CSS Grid layout with sticky header + sticky first column. DOM-based cells (divs), not canvas.
- Selection: single cell + range (drag). Shift+click extends. Row/column header click selects full row/column.
- Editing: double-click or Enter/F2. Input types match column type (text, number, select). Checkbox cells toggle inline.
- Column resize: drag handle on header right edge. Updates grid template + header width.
- Column reorder: drag grip icon. Visual drop target indicator. Reorders columns array + re-renders.
- Sort: click header cycles asc → desc → none. Sorts rows array.
- Keyboard: Arrows navigate, Tab moves right, Enter edits + moves down, Delete clears, Escape cancels/clears.
