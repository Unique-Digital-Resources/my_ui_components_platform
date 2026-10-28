# AGENT.md — Gantt Timeline

Contribution guide for the GanttTimeline component. For usage, see
[SKILL.md](./SKILL.md).

## Architecture

Single-file `gantt.ts` with a DOM-based renderer and scoped CSS (`.gantt-`
prefix) injected once into `<head>`. Time is epoch milliseconds (number)
throughout — the host converts to/from timezones. The time-to-pixel mapping
is linear: `x(t) = W * (t - T0) / (T1 - T0)`.

### Key types
- `GanttItem = { id, start (ms), end (ms), rowId?, title?, color?, progress?, disabled?, ...[key]: unknown }`.
- `GanttRow = { id, title?, color?, collapsed? }`.
- `GanttOptions` — the full configuration surface (items, rows, viewStart, viewEnd, scale, layout, interaction, templateId, etc.).
- `GanttEventPayload` — discriminated payload for all events; `type` field carries the event name.

### Time-to-pixel mapping
`timeToX(t)` converts epoch ms to a pixel x within the grid:
`((t - viewStart) / (viewEnd - viewStart)) * gridWidth`. `xToTime(x)` is the
inverse. A single shared horizontal scale is used for all rows — the same
time always aligns horizontally throughout the visible timeline.

### Rendering lifecycle
`render()` clears the container, builds:
1. An optional time-axis header (`.gantt-axis`) with major-tick labels.
2. A body (`.gantt-body`) with optional row headers (`.gantt-row-headers`)
   and a scrollable grid (`.gantt-scroll` > `.gantt-grid`).
3. Grid lines (`.gantt-grid-line`) at minor and major tick intervals.
4. Rows (`.gantt-row`), each containing bars positioned absolutely.
5. An optional today marker (`.gantt-today`).

Bar elements are tracked in `barEls` (Map by item id) and row elements in
`rowEls` (Map by row id). After layout, `updateGridWidth()` re-positions all
bars and re-renders grid lines / axis labels / today marker to match the
container width.

### Bar rendering (template-driven)
Bar content is laid out by a **registered content template** (see
`src/lib/templates/`). The `templateId` option (default
`"gantt.standard-bar"`) names which template to use. Pass `"none"` (or
`GANTT_TEMPLATE_NONE`) for native rendering — a plain colored bar with an
optional title. The board owns the bar's geometry (position, width, height);
the template only renders content inside the bar.

`renderBar(item, row)` does:
1. Build the `.gantt-bar` wrapper, set `data-item-id`, `role="button"`,
   `tabindex`, aria-label, and state classes.
2. Add a progress overlay if `progressEnabled` and `item.progress > 0`.
3. Iterate the active template's slots (if any) and append renderer output.
4. Add resize handles (left/right) when `resizable && !readOnly && !disabled`.
5. Attach pointerdown (move), click (select), dblclick (activate), and
   keydown handlers.
6. Position the bar via `positionBar(el, item)`.

### Selection
Single selection only. `selectBar(id, source)` updates the
`gantt-selected` class and emits `bar_selected` + `selection_changed` when
the selection actually changes.

### Move / resize validation
A move/resize is rejected (`bar_move_rejected` with `reason`) when:
- `readOnly` → reason `read_only`
- item not found → `invalid_item`
- `end < start` → `invalid_interval`
- duration < `minDuration` → `min_duration`
- row change while `!rowMovable` → `row_movable_disabled`
- target row not found → `invalid_row`

### Drag-and-drop
Pointer-based (Pointer Events API):
1. `pointerdown` on a bar (when `movable && !readOnly && !disabled`) →
   store dragItemId, dragMode="move", originalStart, originalEnd.
   `setPointerCapture` so we track the pointer even outside the bar.
2. `pointermove` → compute dt from pixel delta, snap to `snapInterval`,
   update the item's start/end in real-time (visual preview), emit
   `bar_move_requested` / `bar_resize_requested`.
3. `pointerup` → if the drag actually moved, emit `bar_moved` /
   `bar_resized`; otherwise emit `drag_cancelled`. Reset all drag state.

Resize works the same way but starts from a resize handle and only changes
one endpoint. The opposite endpoint remains fixed. `minDuration` is enforced.

### Keyboard model
Bars are real DOM elements with `tabindex="0"` and `role="button"`:
- `Space` / `Enter` — select or activate.
- `ArrowLeft` / `ArrowRight` — move the bar by one snap interval.
- `Shift+ArrowLeft` / `Shift+ArrowRight` — resize start/end by one snap.
- `ArrowUp` / `ArrowDown` — move to the previous/next row (when `rowMovable`).
- `Home` / `End` — resize start/end to the view boundary.
- `Delete` / `Backspace` — emit `bar_delete_requested`.
- `Escape` — clear selection.

### View range / zoom
- `setViewRange(start, end)` — change the visible time range; re-renders.
- `setScale(scale)` — change the timeline scale; updates `snapInterval`.
- `zoomIn()` / `zoomOut()` — halve / double the visible range around the center.
- `fitToRange(start, end)` — fit a given interval with 5% padding.
- `navigateTo(time)` — center the view on a target time.
- `today()` — center on the current time.

Zooming and scrolling change what is visible, not the stored dates of each
item. The visible time range is distinct from the data's actual time range.

### Template independence
The component is independent of templates — it works with `"none"` or any
registered ID. Templates are looked up by ID at render time. The board owns
the bar's geometry; the template only renders content inside the bar. A long
title must not automatically extend a bar beyond its configured end time.

## Known Issues & TODOs

- **No dependency connectors**: the spec lists dependency connectors as an
  optional extension (§13). Not implemented in the base component.
- **No virtualization**: all rows and bars are rendered. For large datasets
  (1000+ items), a virtualization layer would be needed.
- **No multi-row overlap handling**: overlapping bars in the same row are
  rendered on top of each other (last wins). Subrow splitting is not
  implemented.
- **Scroll syncing**: the axis labels are translated via `transform` on
  scroll. If the axis is very wide, this may cause sub-pixel rendering
  artifacts.
- **Time zone**: all times are epoch ms. The component does not interpret
  time zones — the host is responsible for converting to/from local time.

## Files This Module Touches

- Consumes: `src/lib/templates/` for content templates.
- Init: `registerBuiltinTemplates()` is called at module scope in the Gantt
  playground (mirrors the Kanban pattern).
- The Gantt's `templateId` option accepts any registered template ID; pass
  `"none"` for native rendering.
