# SKILL.md — Gantt Timeline

A Gantt Chart Timeline Bars component for project schedules, resource
timelines, and time-based visualizations. Displays items as horizontal bars
positioned along a shared time axis.

## Installation

```ts
import { GanttTimeline } from "@workshop/gantt";
```

No CSS import required — scoped styles (`.gantt-` prefix) are injected
automatically.

## Quick Start

```ts
import { GanttTimeline } from "@workshop/gantt";

const now = Date.now();
const DAY = 86_400_000;

const timeline = new GanttTimeline(container, {
  viewStart: now - 7 * DAY,
  viewEnd: now + 21 * DAY,
  scale: "day",
  rows: [
    { id: "dev", title: "Development" },
    { id: "design", title: "Design" },
    { id: "qa", title: "QA" },
  ],
  items: [
    { id: "t1", rowId: "dev", title: "Build API", start: now, end: now + 5 * DAY, progress: 40 },
    { id: "t2", rowId: "design", title: "Wireframes", start: now - 2 * DAY, end: now + 3 * DAY, progress: 80 },
    { id: "t3", rowId: "qa", title: "Test pass", start: now + 6 * DAY, end: now + 10 * DAY },
  ],
});

timeline.on("bar_moved", ({ itemId, oldStart, newStart }) => {
  console.log(`Moved ${itemId}: ${new Date(oldStart).toDateString()} → ${new Date(newStart).toDateString()}`);
});

timeline.on("bar_resized", ({ itemId, endpoint, oldEnd, newEnd }) => {
  console.log(`Resized ${itemId} ${endpoint}: ${new Date(oldEnd).toDateString()} → ${new Date(newEnd).toDateString()}`);
});
```

## Options

| Property | Type | Default | Purpose |
|---|---|---|---|
| `items` | `GanttItem[]` | `[]` | Items displayed as bars. |
| `rows` | `GanttRow[]` | `[{ id: "default" }]` | Rows for grouping. If omitted, a single default row is used. |
| `viewStart` | `number` (ms) | now - 15 days | Beginning of the visible time range. |
| `viewEnd` | `number` (ms) | now + 15 days | End of the visible time range. |
| `scale` | `"hour" \| "day" \| "week" \| "month" \| "quarter" \| "year"` | `"day"` | Timeline scale (controls labels, grid ticks, and default snap). |
| `showRowHeaders` | `boolean` | `true` | Show the row-label region on the left. |
| `rowHeaderWidth` | `number` | `160` | Width of the row-label region in pixels. |
| `rowHeight` | `number` | `48` | Height of each row in pixels. |
| `barHeight` | `number` | `28` | Height of bars within rows. |
| `barMinWidth` | `number` | `12` | Minimum visible/interactive width for short bars. |
| `selectable` | `boolean` | `true` | Allow bar selection. |
| `selectionMode` | `"none" \| "single"` | `"single"` | Selection mode. |
| `movable` | `boolean` | `true` | Allow moving bars by dragging. |
| `resizable` | `boolean` | `true` | Allow resizing bars via handles. |
| `rowMovable` | `boolean` | `false` | Allow moving bars between rows (ArrowUp/Down). |
| `snapInterval` | `number` (ms) | scale-dependent | Time increment for snapping during move/resize. |
| `showGrid` | `boolean` | `true` | Show time-grid lines. |
| `showToday` | `boolean` | `true` | Show a marker for the current date/time. |
| `showAxis` | `boolean` | `true` | Show the time-axis header. |
| `axisPosition` | `"top" \| "bottom"` | `"top"` | Position of the time axis. |
| `readOnly` | `boolean` | `false` | Prevents editing while allowing viewing. |
| `disabled` | `boolean` | `false` | Disables all interactions. |
| `progressEnabled` | `boolean` | `true` | Show progress overlays when items have `progress`. |
| `minDuration` | `number` (ms) | `0` | Minimum bar duration; shorter moves/resizes are rejected. |
| `templateId` | `string` | `"gantt.standard-bar"` | Content template ID (see `src/lib/templates/`). Pass `"none"` for native rendering. |

## Item shape

```ts
interface GanttItem {
  id: string;          // stable identifier (required)
  start: number;       // epoch ms (required)
  end: number;         // epoch ms (required, must be >= start)
  rowId?: string;      // row assignment (defaults to "default")
  title?: string;      // bar label for the default template and aria-label
  color?: string;      // bar background color (any CSS color)
  progress?: number;   // 0-100, renders a progress overlay when progressEnabled
  disabled?: boolean;  // disable interactions on this specific bar
  [key: string]: unknown; // generic extension fields for templates
}
```

The timeline does not require a specific item schema. Extension fields are
preserved when the component clones items, so applications can store arbitrary
metadata alongside the standard fields.

## Row shape

```ts
interface GanttRow {
  id: string;          // stable identifier (required)
  title?: string;      // row-label text
  color?: string;      // accent dot color
  collapsed?: boolean; // reserved for future collapse support
}
```

## Methods

| Method | Purpose |
|---|---|
| `setItems(items)` | Replace the entire item collection. |
| `setRows(rows)` | Replace the row definitions. |
| `selectBar(id \| null, source?)` | Select a bar (or clear). |
| `clearSelection()` | Clear the current selection. |
| `getSelectedBar()` | Returns the selected item id (or null). |
| `moveBar(id, start, end, source?)` | Request a bar interval change. |
| `resizeBar(id, endpoint, time, source?)` | Request changing one endpoint. |
| `moveBarToRow(id, rowId, source?)` | Request a row assignment change. |
| `setViewRange(start, end, source?)` | Change the visible time range. |
| `setScale(scale)` | Change the timeline scale. |
| `zoomIn()` / `zoomOut()` | Halve / double the visible range. |
| `fitToRange(start, end)` | Fit a given interval with 5% padding. |
| `navigateTo(time)` | Center the view on a target time. |
| `today()` | Center on the current time. |
| `getTemplate()` / `getTemplateId()` / `setTemplateId(id)` | Content template accessors. Pass `"none"` for native rendering. |
| `getItems()` / `getRows()` / `getViewRange()` | Defensive copies of current state. |
| `setProperty(name, value)` | Update any option at runtime (supports `templateId`). |
| `on(event, handler)` / `off(event, handler)` | Subscribe / unsubscribe. |
| `destroy()` | Remove DOM, clear listeners. |

## Events

| Event | Payload | When |
|---|---|---|
| `bar_selected` | `{ itemId, previousItemId, source }` | A bar is selected. |
| `selection_changed` | `{ itemIds, previousItemIds, source }` | Selection set changes. |
| `bar_activated` | `{ itemId, source }` | Bar is double-clicked or Enter pressed. |
| `bar_moved` | `{ itemId, oldStart, oldEnd, newStart, newEnd, source }` | A move was accepted. |
| `bar_resized` | `{ itemId, oldStart, oldEnd, newStart, newEnd, endpoint, source }` | A resize was accepted. |
| `bar_move_requested` | `{ itemId, oldStart, oldEnd, start, end, source }` | A move is proposed (live preview). |
| `bar_resize_requested` | `{ itemId, endpoint, oldStart/oldEnd, start/end, source }` | A resize is proposed (live preview). |
| `bar_move_rejected` | `{ itemId, reason, source }` | A move/resize was rejected. `reason`: `read_only`, `invalid_item`, `invalid_interval`, `min_duration`, `row_movable_disabled`, `invalid_row`. |
| `bar_row_changed` | `{ itemId, previousRowId, rowId, source }` | A row change was accepted. |
| `bar_delete_requested` | `{ itemId, source }` | User pressed Delete/Backspace. The host owns the actual delete. |
| `view_range_changed` | `{ viewStart, viewEnd, source }` | The visible time range changes. |
| `scale_changed` | `{ scale }` | Timeline scale changes. |
| `drag_started` | `{ itemId, operation, source }` | A drag interaction begins. `operation`: `move`, `resize-start`, `resize-end`. |
| `drag_cancelled` | `{ itemId, operation, source }` | A drag was canceled (no move). |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move focus between bars. |
| `Space` / `Enter` | Select or activate the focused bar. |
| `ArrowLeft` / `ArrowRight` | Move the bar by one snap interval. |
| `Shift+ArrowLeft` / `Shift+ArrowRight` | Resize start / end by one snap interval. |
| `ArrowUp` / `ArrowDown` | Move to the previous / next row (when `rowMovable`). |
| `Home` / `End` | Resize start / end to the view boundary. |
| `Delete` / `Backspace` | Emit `bar_delete_requested`. |
| `Escape` | Clear selection. |

## Content templates

Bar content is laid out by a registered content template (see
`src/lib/templates/`). The board is **independent of templates** — pass
`"none"` (or `GANTT_TEMPLATE_NONE`) as the `templateId` to disable templated
content entirely; the bar shows a plain colored fill with no content inside.

| Template ID            | Name           | Slots                    |
|------------------------|----------------|--------------------------|
| `none`                 | None           | — (native rendering)     |
| `gantt.standard-bar`   | Standard Bar   | title                    |
| `gantt.minimal-bar`    | Minimal Bar    | (no slots — plain fill)  |
| `gantt.detailed-bar`   | Detailed Bar   | title, assignee, id      |

Switch templates at runtime — the data is untouched:

```ts
import { registerBuiltinTemplates, templateRegistry } from "@workshop/templates";
import { GANTT_TEMPLATE_NONE } from "@workshop/gantt";

registerBuiltinTemplates();

timeline.setTemplateId("gantt.detailed-bar");
timeline.setTemplateId(GANTT_TEMPLATE_NONE);  // native rendering
```

Bar geometry (position, width, height) is always owned by the timeline
component. A template only renders content inside the bar; a long title must
not automatically extend a bar beyond its configured end time.

### Creating a custom template

See the Kanban SKILL.md or the Templates SKILL.md for the full 3-step guide.
The renderer contract is the same: `(ctx: { item, slot, density, host }) => HTMLElement | null`.

## Integration notes

- The timeline owns a local copy of items and rows. After each move/resize,
  the host receives a `bar_moved` / `bar_resized` event and may call
  `getItems()` to persist the new state.
- All times are epoch milliseconds. The host converts to/from timezones.
- The visible time range (`viewStart` / `viewEnd`) is distinct from the data's
  actual time range. Zooming and scrolling change what is visible, not the
  stored dates.
- The component injects scoped CSS once (id `gantt-styles`). Multiple
  instances share the same stylesheet.
- All colors derive from the component's CSS custom properties (`--gt-*`).
  Override them on the `.gantt-timeline` element to retheme.
- The component is **not a scheduling engine**: dependency resolution,
  resource optimization, and project planning rules remain outside the base
  component.
