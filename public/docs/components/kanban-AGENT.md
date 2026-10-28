# AGENT.md — Kanban Board

Contribution guide for the KanbanBoard component.

## Architecture

Single-file `kanban.ts` with a DOM-based renderer and scoped CSS (`.kanban-` prefix) injected once into `<head>`. The board owns local copies of `items` and `columns` (defensively cloned on the way in) and emits change events; the host application may persist the resulting data after each event.

### Key types
- `KanbanItem = { id, columnId, title, description?, labels?, priority?, assignee?, ...[key]: unknown }` — generic record with stable identifier.
- `KanbanColumn = { id, title, color?, collapsed?, itemLimit?, allowAddItem? }`.
- `KanbanOptions` — the full configuration surface (mode, layout, cardLayout, dragEnabled, reorderWithinColumn, moveBetweenColumns, showCardBorder, showItemCount, selectable, columnWidth, cardGap, columnGap, allowEmptyColumns, showDropPreview, **templateId**).
- `KanbanEventPayload` — discriminated payload for all events; `type` field carries the event name.

### Ordering model
Items are stored in a single flat array (`this.items`) and the per-column display order is the array order filtered by `columnId`. Moving an item removes it from the array and re-inserts it at a position derived from the target column's current list (computed after removal). This means:
- Within-column reorder = remove + re-insert before the chosen index.
- Cross-column move = remove + re-insert before the chosen index in the new column.
- Position is always expressed as an index within the target column's item list; out-of-range values are clamped to `[0, column.length]`.

### Rendering lifecycle
`render()` clears the container, builds a `.kanban-board` root, iterates `columns` to build `.kanban-column` sections, each with a header (color dot, title, count, collapse button), a body of cards, and an optional footer with an Add-item button. Card elements are tracked in `cardEls` (Map by item id) and column elements in `columnEls` (Map by column id) so the keyboard handler and drag handler can look up DOM nodes by id without re-querying.

### Card rendering (template-driven)
Card content is laid out by a **registered content template** (see `src/lib/templates/`). The `templateId` option (default `"kanban.standard-task"`) names which template to use; `getTemplate()` / `getTemplateId()` / `setTemplateId(id)` expose the selection at runtime. `setProperty("templateId", id)` is also supported.

`renderCard(item, col)` does:
1. Build the `.kanban-card` wrapper, set `data-item-id`, `role="button"`, `tabindex="0"`, the aria-label (built from `title` + `priority` + `assignee` by `buildCardAriaLabel`), and the `kanban-selected` / `kanban-readonly-card` classes.
2. Look up the active template via `templateRegistry.get(templateId)`. If found, iterate `template.slots` in order:
   - Skip slots whose `visibleIn` doesn't include the current `cardLayout` density (`slotVisible` helper).
   - Look up the slot's renderer via `rendererRegistry.get(slot.renderer)`.
   - Call the renderer with `{ item, slot, density, host }`. The `host` object carries board-level state (`mode`, `moveBetweenColumns`, `dragEnabled`, `showCardBorder`, `cardLayout`) so renderers can branch without depending on the Kanban's internal API.
   - If the renderer returns a non-null element, append it to the card.
3. If no template is registered (e.g. `registerBuiltinTemplates()` was not called), fall back to a bare `<div class="kanban-card-title">` so the card is never empty.
4. Append the board-level Move button (a Kanban control, NOT part of the template) in a `.kanban-card-footer` wrapper when `mode === "editable" && moveBetweenColumns && cardLayout !== "compact"`. A flex spacer pushes the button to the right edge.
5. Attach dragstart/dragend (when `dragEnabled && mode === "editable"`), click (select), dblclick (activate), and keydown (keyboard model) handlers.

This separation lets the same data render differently by switching `templateId` — no data changes, no board re-instantiation. The board owns its own controls (Move button, drop indicator, popover); templates own only the content layout.

### Selection
Single selection only (no multi-select in the base spec). `selectItem(id, source)` updates the `kanban-selected` class on the matching card and emits `item_selected` + `selection_changed` when the selection actually changes. `clearSelection()` is `selectItem(null)`.

### Move validation (moveItem + drop validator)
A move is rejected (`item_move_rejected` with `reason`) when:
- `mode === "read_only"` → reason `read_only`
- item id not found → `invalid_item`
- target column not found, or target collapsed → `invalid_target`
- cross-column move while `moveBetweenColumns === false` → `cross_column_disabled`
- within-column reorder while `reorderWithinColumn === false` and `position !== current` → `reorder_disabled`
- target column's `itemLimit` would be exceeded (counting the dragged item only if it's entering from another column) → `column_limit`

When all checks pass, the item is moved, the board re-renders, and `item_moved` fires (plus `item_reordered` if the column changed).

### Drag-and-drop
HTML5 Drag-and-Drop API:
1. `dragstart` on a card (only when `dragEnabled && mode === "editable"`) → store `dragItemId`, `dragSourceColumnId`, add `kanban-dragging` class, emit `drag_started`.
2. `dragenter` / `dragover` on a column body → `preventDefault` to allow drop, compute target column + position via `computeDropPosition` (midpoint of each card relative to cursor Y, or X in vertical layout), highlight target column (`kanban-drop-target` or `kanban-drop-invalid`), render the lemon drop indicator, emit `drop_target_changed`.
3. `dragleave` on a column body → only clears if the cursor actually left the column (not when entering a child).
4. `drop` → mark `dragHappened = true`, validate, call `moveItem`, reset drag state. If validation fails, emit `item_move_rejected` and reset.
5. `dragend` on the card → if no drop happened, emit `drag_cancelled`. Reset all drag state and clear indicators.

The drop indicator is a 3px-tall lemon bar inserted at the computed position; in vertical layout it becomes a 3px-wide vertical bar. `prefers-reduced-motion` disables the pulse animation.

### Keyboard model (§11)
Cards are real DOM elements with `tabindex="0"` and `role="button"` so they participate in tab order and screen-reader navigation:
- `Tab` / `Shift+Tab` — move focus between cards (and out of the board).
- `Space` — select the focused card (emits `item_selected` + `selection_changed`).
- `Enter` — activate the focused card (emits `item_activated`; the host decides whether to open details).
- `ArrowUp` / `ArrowDown` — reorder within the current column (when `reorderWithinColumn`). Focus is preserved on the moved card.
- `ArrowLeft` / `ArrowRight` — move to the previous / next non-collapsed column (when `moveBetweenColumns`). Focus preserved.
- `M` — open the Move-to popover (accessible alternative to drag). The popover lists every column with its color dot; the current column is disabled and marked "(current)". A "Request delete" entry is also provided. Click-outside and `Escape` close the popover and restore focus to the card.
- `Delete` / `Backspace` — emit `item_delete_requested` (the host owns the actual delete).
- `Escape` — close any open popover and clear selection.

### Move-to popover
A small fixed-position menu appended to `document.body`. Positioned below the anchor (the Move button or the focused card), clamped to the viewport. Click-outside and `Escape` close it; after closing, focus is returned to the originating card so keyboard users don't lose their place.

### Read-only behavior
When `mode === "read_only"`:
- The board gets the `kanban-readonly` class; card cursors become `default`.
- Cards are not `draggable`; the Move button is hidden.
- The Add-item button is hidden.
- The collapse button is hidden.
- Selection is still allowed (so the host can inspect an item), but `moveItem` rejects with `read_only`.
- `item_delete_requested` is not emitted (Delete/Backspace are no-ops).

### Empty columns
If `allowEmptyColumns === true`, an empty column shows a `.kanban-empty` placeholder ("Drop cards here" in editable mode, "No items" in read-only). If `allowEmptyColumns === false`, empty columns render with no body content (just the header). During a drag, the placeholder is removed so the drop indicator has a clean spot to render.

### Public API (final)
- `new KanbanBoard(container, options)`
- `setItems(items)` / `setColumns(columns)` — replace the data (defensive clone).
- `selectItem(id | null, source?)` / `clearSelection()` / `getSelectedItem()`
- `moveItem(itemId, targetColumnId, position, source?)` — validates + emits.
- `reorderItem(itemId, position, source?)` — move within the same column.
- `createItem(columnId, partial)` → returns the new id (or empty string if rejected).
- `updateItem(itemId, changes)` / `removeItem(itemId)`
- `collapseColumn(id)` / `expandColumn(id)`
- `getItems()` / `getColumns()` — defensive copies.
- `setProperty(name, value)` — update any option; re-renders.
- `on(event, handler)` / `off(event, handler)`
- `destroy()` — removes DOM, clears listeners, marks destroyed.

### Events emitted
`item_selected`, `selection_changed`, `item_activated`, `item_create_requested`, `item_edit_requested` (reserved — the host's Move popover may emit it in the future), `item_moved`, `item_move_rejected`, `item_reordered`, `item_delete_requested`, `drag_started`, `drag_cancelled`, `drop_target_changed`, `column_selected`, `column_create_requested` (reserved for future column-add UI).

### Known issues
- Item ordering is by array index, not by an explicit rank field. For a small local board this is sufficient; a backend-backed board with concurrent edits would need explicit ranks and conflict resolution (out of scope — see §10 of the spec).
- Multi-selection is not implemented (base spec calls for single selection; `selection_mode: multiple` is listed as an optional extension in §12).
- Column reordering is not implemented (the `column_reorder_requested` event is reserved).
- `auto_scroll_on_drag` is not implemented (dragging near a column's vertical edge does not auto-scroll). The user can scroll manually with the mouse wheel.
