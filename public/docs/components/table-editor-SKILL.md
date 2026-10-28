# SKILL.md — Table Editor

A spreadsheet-style table with cell selection, editing, column resize/reorder, sort, freeze, and keyboard navigation.

## Quick Start
```ts
import { TableEditor } from "@workshop/table-editor";
const table = new TableEditor(container, {
  columns: [
    { id: "name", label: "Name", type: "text", width: 140 },
    { id: "age", label: "Age", type: "number", width: 80, align: "right" },
    { id: "active", label: "Active", type: "checkbox", width: 80 },
  ],
  rows: [
    { id: "r1", name: "Ava", age: 28, active: true },
    { id: "r2", name: "Jordan", age: 34, active: false },
  ],
});
table.on("cell_change", ({ rowId, colId, value }) => console.log(`${rowId}.${colId} = ${value}`));
```

## Cell types: text, number, checkbox, select.
## Keyboard: Arrows, Tab, Enter, F2, Delete, Escape.
