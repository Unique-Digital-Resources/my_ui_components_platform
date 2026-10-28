# SKILL.md — Kanban Board

A reusable Kanban board component for tasks, issues, and workflow stages.

## Installation

```ts
import { KanbanBoard } from "@workshop/kanban";
```

No CSS import required — scoped styles (`.kanban-` prefix) are injected automatically.

## Quick Start

```ts
import { KanbanBoard } from "@workshop/kanban";

const board = new KanbanBoard(container, {
  columns: [
    { id: "todo", title: "To Do" },
    { id: "doing", title: "In Progress" },
    { id: "done", title: "Done" },
  ],
  items: [
    { id: "t1", columnId: "todo", title: "Design login screen", priority: "medium" },
    { id: "t2", columnId: "doing", title: "Build kanban", priority: "high" },
    { id: "t3", columnId: "done", title: "Set up repo", priority: "low" },
  ],
});

board.on("item_moved", ({ itemId, sourceColumnId, targetColumnId, newPosition }) => {
  console.log(`Moved ${itemId} from ${sourceColumnId} to ${targetColumnId} at ${newPosition}`);
});

board.on("item_create_requested", ({ columnId }) => {
  const id = board.createItem(columnId, { title: "New task" });
  console.log("Created", id);
});

board.on("item_delete_requested", ({ itemId }) => {
  board.removeItem(itemId);
});
```

## Options

| Property | Type | Default | Purpose |
|---|---|---|---|
| `items` | `KanbanItem[]` | `[]` | Items displayed on the board. |
| `columns` | `KanbanColumn[]` | `[]` | Workflow columns and their ordering. |
| `mode` | `"editable" \| "read_only"` | `"editable"` | Editable allows moves, adds, deletes; read-only is view + select only. |
| `layout` | `"horizontal" \| "vertical"` | `"horizontal"` | Column arrangement. Horizontal = side-by-side with vertical card lists; vertical = stacked with horizontal card rows. |
| `cardLayout` | `"compact" \| "standard" \| "detailed"` | `"standard"` | Card density. Compact hides description/labels/footer; detailed shows up to 4 lines of description. |
| `dragEnabled` | `boolean` | `true` | Allow moving cards by drag-and-drop. |
| `reorderWithinColumn` | `boolean` | `true` | Allow reordering items within the same column. |
| `moveBetweenColumns` | `boolean` | `true` | Allow moving items across columns. |
| `showCardBorder` | `boolean` | `true` | Display card boundaries. |
| `showItemCount` | `boolean` | `true` | Show the count badge in each column header. |
| `selectable` | `boolean` | `true` | Allow card selection. |
| `columnWidth` | `number` | `280` | Column width in pixels (horizontal layout). |
| `cardGap` | `number` | `8` | Spacing between cards in pixels. |
| `columnGap` | `number` | `12` | Spacing between columns in pixels. |
| `allowEmptyColumns` | `boolean` | `true` | Render empty-state placeholders in empty columns. |
| `showDropPreview` | `boolean` | `true` | Show the lemon drop indicator while dragging. |
| `templateId` | `string` | `"kanban.standard-task"` | ID of a registered content template (see `src/lib/templates/`) used to lay out each card's content. Pass `"none"` to disable templated content entirely (native rendering: title only). Switch at runtime via `setTemplateId()`. |

## Item shape

```ts
interface KanbanItem {
  id: string;          // stable identifier (required)
  columnId: string;    // which column it belongs to (required)
  title: string;       // primary heading (required)
  description?: string;
  labels?: string[];
  priority?: "low" | "medium" | "high";
  assignee?: string;
  [key: string]: unknown; // generic extension fields
}
```

The board does not require a specific card schema. Extension fields are preserved when the board clones items, so applications can store arbitrary metadata (due dates, custom statuses, etc.) alongside the standard fields.

## Column shape

```ts
interface KanbanColumn {
  id: string;          // stable identifier (required)
  title: string;       // header text (required)
  color?: string;      // accent dot color (any CSS color)
  collapsed?: boolean; // initial collapsed state
  itemLimit?: number;  // max items; further moves are rejected with reason "column_limit"
  allowAddItem?: boolean; // show the "Add item" button (default true in editable mode)
}
```

## Methods

| Method | Purpose |
|---|---|
| `setItems(items)` | Replace the entire item collection. |
| `setColumns(columns)` | Replace the column definitions. Items whose column disappears are dropped. |
| `selectItem(id \| null, source?)` | Select a card (or clear). |
| `clearSelection()` | Clear the current selection. |
| `getSelectedItem()` | Returns the selected item id (or null). |
| `moveItem(itemId, targetColumnId, position, source?)` | Move a card. Validates and emits `item_moved` or `item_move_rejected`. |
| `reorderItem(itemId, position, source?)` | Reorder within the current column. |
| `createItem(columnId, partial)` | Add a new item. Returns the new id (or `""` if rejected). |
| `updateItem(itemId, changes)` | Update item fields. |
| `removeItem(itemId)` | Remove an item. |
| `collapseColumn(id)` / `expandColumn(id)` | Collapse or expand a column. |
| `getItems()` / `getColumns()` | Defensive copies of the current data. |
| `getTemplate()` | Returns the currently active content template (or `undefined` if `templateId` is not registered). |
| `getTemplateId()` | Returns the current content template ID. |
| `setTemplateId(id)` | Switch to a different content template. No-op if the ID is not registered; re-renders otherwise. |
| `setProperty(name, value)` | Update any option at runtime (supports `templateId`). |
| `on(event, handler)` / `off(event, handler)` | Subscribe / unsubscribe. |
| `destroy()` | Remove DOM, clear listeners. |

## Events

| Event | Payload | When |
|---|---|---|
| `item_selected` | `{ itemId, previousItemId, source }` | A card is selected. |
| `selection_changed` | `{ itemIds, previousItemIds, source }` | Selection set changes. |
| `item_activated` | `{ itemId, source }` | Card is double-clicked or Enter pressed. |
| `item_create_requested` | `{ columnId, source }` | User clicks an Add-item button. |
| `item_edit_requested` | `{ itemId }` | Reserved for host-driven edit flows. |
| `item_moved` | `{ itemId, sourceColumnId, targetColumnId, oldPosition, newPosition, source }` | A move was accepted and reflected in board state. |
| `item_move_rejected` | `{ itemId, targetColumnId, position, reason, source }` | A move was rejected. `reason` is one of `read_only`, `invalid_item`, `invalid_target`, `cross_column_disabled`, `reorder_disabled`, `column_limit`. |
| `item_reordered` | `{ itemId, columnId, oldPosition, newPosition, source }` | An item's position changed (within or across columns). |
| `item_delete_requested` | `{ itemId, source }` | User pressed Delete/Backspace or chose "Request delete" in the Move popover. The host owns the actual delete. |
| `drag_started` | `{ itemId, sourceColumnId, source }` | A drag operation begins. |
| `drag_cancelled` | `{ itemId, sourceColumnId, source }` | A drag was canceled (no drop). |
| `drop_target_changed` | `{ itemId, targetColumnId, targetPosition, source }` | The active drop target changed. |
| `column_selected` | `{ columnId, previousColumnId, source }` | A column header was clicked. |
| `column_create_requested` | `{}` | Reserved for future column-add UI. |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move focus between cards. |
| `Space` | Select the focused card. |
| `Enter` | Activate the focused card (emits `item_activated`). |
| `ArrowUp` / `ArrowDown` | Reorder within the current column (when enabled). |
| `ArrowLeft` / `ArrowRight` | Move to the previous / next column (when enabled). |
| `M` | Open the Move-to popover. |
| `Delete` / `Backspace` | Emit `item_delete_requested`. |
| `Escape` | Close popover / clear selection. |

## React example

```tsx
import { useEffect, useRef } from "react";
import { KanbanBoard } from "@workshop/kanban";

function Kanban({ items, columns, onMoved }) {
  const ref = useRef<HTMLDivElement>(null);
  const instRef = useRef<KanbanBoard | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const board = new KanbanBoard(ref.current, { items, columns });
    instRef.current = board;
    board.on("item_moved", onMoved);
    return () => board.destroy();
  }, []);

  useEffect(() => { instRef.current?.setItems(items); }, [items]);
  useEffect(() => { instRef.current?.setColumns(columns); }, [columns]);

  return <div ref={ref} className="h-[600px]" />;
}
```

## Content templates

Card content is laid out by a registered content template (see
`src/lib/templates/`). The board is **independent of templates** — it looks
them up by ID in the singleton registry at render time and works with zero
templates registered. Pass `"none"` (or the exported `KANBAN_TEMPLATE_NONE`
constant) as the `templateId` to disable templated content entirely; the
board falls back to its native rendering (a bare title per card).

The default `kanban.standard-task` template renders the card pattern this
component shipped with: priority row, title, two-line description, label
chips, and an assignee avatar. Three more built-in templates demonstrate
how the same data can be rendered differently without changing the board:

| Template ID              | Name           | Slots                                          |
|--------------------------|----------------|------------------------------------------------|
| `none`                   | None           | — (native rendering: title only)               |
| `kanban.standard-task`   | Standard Task  | priority, title, description, labels, assignee |
| `kanban.minimal`         | Minimal        | title only                                     |
| `kanban.bug-report`      | Bug Report     | severity, title, description, reporter, id     |
| `kanban.milestone`       | Milestone      | title, dueDate, progress                       |

Switch templates at runtime — the data is untouched:

```ts
import { registerBuiltinTemplates, templateRegistry } from "@workshop/templates";
import { KANBAN_TEMPLATE_NONE } from "@workshop/kanban";

registerBuiltinTemplates();

// Switch to the bug-report template:
board.setTemplateId("kanban.bug-report");

// Go template-free (native rendering):
board.setTemplateId(KANBAN_TEMPLATE_NONE);  // or just "none"

// List all available Kanban templates:
const templates = templateRegistry.byCategory("Kanban");
```

The board's Move button is a **board-level control**, not part of the
template. It is appended after the templated content when `mode` is
`editable` and `moveBetweenColumns` is `true` (and the density is not
`compact`). This keeps templates focused on content layout while the board
owns its own controls.

### Creating a custom template

The component does not know which templates exist — it looks them up by ID
at render time. To add a custom template:

**1. Register a slot renderer** (a pure function from
`{ item, slot, density, host }` to `HTMLElement | null`), or reuse one of
the 12 built-in renderers (`title`, `priority-row`, `label-chips`,
`assignee-avatar`, `meta-line`, `id-badge`, `progress-bar`, etc.):

```ts
import { defineRenderer } from "@workshop/templates";

defineRenderer("my-prefix", (ctx) => {
  const v = ctx.item[ctx.slot.field];
  if (!v) return null;
  const el = document.createElement("div");
  el.className = "ctpl-meta-line";
  el.textContent = String(v);
  return el;
});
```

**2. Register a template** that references renderers by name, with per-slot
`visibleIn` density filters and optional `props`:

```ts
import { defineTemplate } from "@workshop/templates";

defineTemplate({
  id: "kanban.my-card",
  name: "My Card",
  category: "Kanban",
  description: "Title + custom prefix line.",
  slots: [
    { field: "title",   renderer: "title",     visibleIn: ["compact", "standard", "detailed"] },
    { field: "myField", renderer: "my-prefix", visibleIn: ["standard", "detailed"], props: { prefix: "MY" } },
  ],
});
```

**3. Pass the template ID to the board** (constructor option or
`setTemplateId()`). Switch at any time — the data is untouched:

```ts
const board = new KanbanBoard(el, { templateId: "kanban.my-card", ... });
// or switch at runtime:
board.setTemplateId("kanban.my-card");
// or go template-free:
board.setTemplateId("none");
```

The renderer contract is `(ctx: { item, slot, density, host }) => HTMLElement | null`.
Return `null` to skip the slot. The `host` object carries board-level state
(`mode`, `moveBetweenColumns`, `dragEnabled`, `showCardBorder`, `cardLayout`)
so renderers can branch without depending on the Kanban's internal API.

For the full renderer registry API and the complete list of built-in
renderers, see [Content Templates SKILL.md](../../templates/SKILL.md).

## Integration notes

- The board owns a local copy of items and columns. After each move, the host receives an `item_moved` event and may call `board.getItems()` to persist the new state. For a controlled-board integration (host owns the data), ignore the local mutations and call `setItems` after each event.
- Drag-and-drop uses the HTML5 Drag-and-Drop API. On touch devices, fall back to the Move-to popover (`M` key or the Move button on each card).
- The board injects scoped CSS once (id `kanban-styles`). Multiple instances share the same stylesheet.
- All colors derive from the board's CSS custom properties (`--kb-*`). Override them on the `.kanban-board` element to retheme.
