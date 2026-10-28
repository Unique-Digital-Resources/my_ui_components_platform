# SKILL.md — Board

A vanilla JavaScript infinite canvas component. Pan/zoom, grid system with
sub-divisions, snap to grid and items, items (circle / rectangle / triangle),
single + multi (rubber-band) selection, per-item pivot with 9 selection
pivot positions, global / local transform modes, rotation + 8 resize
handles, align / distribute / fit commands. Canvas-based, pointer + wheel +
keyboard interaction, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Board,
  type BoardOptions,
  type BoardItem,
  type BoardView,
  type ShapeType,
  type GridMode,
  type AlignType,
  type DistributeType,
  type PivotPosition,
  type TransformMode,
  type LatticeDisplay,
} from "@/lib/components/board";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const board = new Board(document.getElementById("canvas-host")!, {
  gridMode: "dots",
  gridSize: 40,
  snapToGrid: false,
});

const id1 = board.addItem("rect", 0, 0, 120, 80, 0, "#D9FF66");
const id2 = board.addItem("circle", 200, 100, 80, 80, 0, "#4287f5");

board.on("selection", (ids) => console.log("selected:", ids));
board.on("change", (e) => console.log("change:", e.type));

// later
board.destroy();
```

---

## Constructor

```ts
new Board(container: HTMLElement, options?: BoardOptions)
```

The container must have a fixed size (the canvas fills it). A
`ResizeObserver` watches the container and refreshes the canvas on resize.

### Options

| Option              | Type                                  | Default       | Description                                                       |
|---------------------|---------------------------------------|---------------|-------------------------------------------------------------------|
| `gridMode`          | `"dots" \| "lines" \| "none"`         | `"dots"`      | Grid visualization.                                               |
| `gridSize`          | `number`                              | `40`          | Base grid size in board units. Min 4.                             |
| `subGridDivisions`  | `number`                              | `4`           | Sub-divisions per grid cell. Min 1.                               |
| `snapToGrid`        | `boolean`                             | `false`       | Snap item moves to grid intersections.                            |
| `snapToItems`       | `boolean`                             | `false`       | Snap to other items' edges / centers.                             |
| `background`        | `string`                              | `"#15151a"`   | Canvas background color.                                          |
| `transformMode`     | `"global" \| "local"`                 | `"global"`    | Whether resize handles use the AABB (global) or the rotated bbox (local). |
| `selectionPivot`    | `PivotPosition`                       | `"center"`    | One of 9 pivot positions.                                         |
| `latticeDisplay`    | `"local" \| "global" \| "both"`       | `"local"`     | Which lattice to draw around the selection.                       |

### PivotPosition

`"center"` | `"top-left"` | `"top-center"` | `"top-right"` |
`"middle-left"` | `"middle-right"` | `"bottom-left"` | `"bottom-center"` |
`"bottom-right"`.

---

## Public Methods

### Items

| Method                          | Returns       | Description                                                       |
|---------------------------------|---------------|-------------------------------------------------------------------|
| `addItem(type, x, y, w, h, rotation?, color?)` | `string` | Add a new item. Returns the new item's ID.                |
| `removeItem(id)`                | `void`        | Remove an item by ID.                                             |
| `getItems()`                    | `BoardItem[]` | All items (clones).                                               |
| `getSelectedIds()`              | `string[]`    | IDs of selected items.                                            |

### View

| Method                          | Returns       | Description                                                       |
|---------------------------------|---------------|-------------------------------------------------------------------|
| `setGridMode(mode)`             | `void`        | Change the grid visualization.                                    |
| `setGridSize(n)`                | `void`        | Change the base grid size.                                        |
| `setSubGridDivisions(n)`        | `void`        | Change the sub-grid divisions.                                    |
| `setSnapToGrid(on)`             | `void`        | Toggle snap-to-grid.                                              |
| `setSnapToItems(on)`            | `void`        | Toggle snap-to-items.                                             |
| `zoomToFit()`                   | `void`        | Fit the view to all items.                                        |
| `zoomToFitSelection()`          | `void`        | Fit the view to the current selection.                            |

### Commands

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `align(type)`                   | `void`  | Align selected items: `left`/`center-h`/`right`/`top`/`center-v`/`bottom`. |
| `distribute(type)`              | `void`  | Distribute selected items: `horizontal`/`vertical`.               |

### Transform

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `setTransformMode(mode)`        | `void`  | Set `"global"` or `"local"`.                                      |
| `setLatticeDisplay(mode)`       | `void`  | Set `"local"`, `"global"`, or `"both"`.                           |
| `setSelectionPivot(pivot)`      | `void`  | Set one of 9 pivot positions.                                     |
| `rotateSelected(degrees)`       | `void`  | Rotate selected items by `degrees` around the pivot.              |
| `resizeSelected(scaleX, scaleY)`| `void`  | Scale selected items by `scaleX`/`scaleY` from the pivot.         |

### Events

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `on(event, handler)`            | `void`  | Subscribe to `selection`, `change`, or `view`.                    |
| `off(event, handler)`           | `void`  | Unsubscribe.                                                       |
| `destroy()`                     | `void`  | Tear down. Idempotent.                                            |

### Item shape

```ts
interface BoardItem {
  id: string;
  type: "circle" | "rect" | "triangle";
  x: number; y: number;         // center in board coords
  width: number; height: number;  // can be negative (flipped)
  rotation: number;             // degrees
  color: string;
  selected: boolean;
  pivotX: number; pivotY: number;  // 0-1, relative to bounding box
  minWidth?: number; minHeight?: number;
  maxWidth?: number; maxHeight?: number;
}
```

---

## Events

| Event        | Payload                                          | When                                                       |
|--------------|--------------------------------------------------|------------------------------------------------------------|
| `selection`  | `string[]` (selected IDs)                        | Selection changed (click, rubber-band, or programmatic).  |
| `change`     | `{ type: "drag" \| "rotate" \| "resize" \| ... }`| Items changed (drag, rotate, resize, add, remove, align, distribute). |
| `view`       | `BoardView` (`{ panX, panY, zoom }`)             | Pan or zoom changed.                                       |

```ts
board.on("selection", (ids) => updateInspector(ids));
board.on("change", (e) => {
  if (e.type === "drag") persistItemPositions();
});
board.on("view", (v) => updateZoomIndicator(v.zoom));
```

---

## Code Examples

### Basic board with items

```ts
const board = new Board(container, { gridMode: "lines", gridSize: 50 });
board.addItem("rect", 0, 0, 160, 100, 0, "#D9FF66");
board.addItem("circle", 240, 0, 100, 100, 0, "#4287f5");
board.addItem("triangle", -200, 0, 120, 120, 0, "#ff6600");
```

### Snap to grid

```ts
board.setSnapToGrid(true);
board.setGridSize(20);
board.setSubGridDivisions(5);
```

### Programmatic selection and alignment

```ts
board.setSelected(["item-1", "item-2", "item-3"]);
board.align("left");
board.distribute("vertical");
board.zoomToFitSelection();
```

### Rotation and resize

```ts
board.setSelectionPivot("bottom-left");
board.rotateSelected(45);          // 45° around the bottom-left of the selection
board.resizeSelected(1.5, 1.0);    // 1.5× wider, same height
```

### Transform modes

```ts
board.setTransformMode("local");   // resize handles on the rotated bbox
board.setLatticeDisplay("both");   // draw both local and global lattices
```

### React wrapper

```tsx
"use client";
import { BoardReact } from "@/components/board/board-react";

export function Demo() {
  return (
    <BoardReact
      gridMode="dots"
      gridSize={40}
      onSelection={(ids) => console.log(ids)}
    />
  );
}
```

### Pointer + wheel + keyboard interaction

| Action                       | Effect                                                       |
|------------------------------|--------------------------------------------------------------|
| Click an item                | Select it (replaces previous selection).                     |
| Shift+click an item          | Toggle its selection (multi-select).                         |
| Click empty space + drag     | Rubber-band selection.                                       |
| Drag a selected item         | Move all selected items.                                     |
| Drag a resize handle         | Resize the selection (opposite edge/corner stays fixed).    |
| Drag the rotation handle     | Rotate the selection around the pivot.                      |
| Scroll                       | Pan vertically (Shift = horizontal).                         |
| Ctrl/Cmd + scroll            | Zoom toward the cursor.                                      |
| Space + drag, or middle-click drag | Pan.                                                  |
| `Delete`                     | Remove selected items.                                       |
| Arrow keys                   | Nudge selected items by 1 board unit (Shift = 10).           |

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module.
- **React**: use the wrapper at `src/components/board/board-react.tsx`.
- **Container size**: the container must have a fixed size (the canvas fills
  it). A `ResizeObserver` handles resize.
- **Performance**: the grid is re-rendered every frame (it depends on
  pan/zoom). For very large boards at low zoom, this can be slow. Consider
  limiting the visible grid area.
- **Resize at non-0 rotation**: there is a known drift issue when resizing
  rotated items — see AGENT.md "Known Issues". The drift is small but
  visible during continuous drag. For now, prefer to rotate-then-resize
  rather than resize-while-rotated.
- **Keyboard shortcuts**: the board registers many commands in the registry
  (`board.align-left`, `board.distribute-h`, `board.fit-all`,
  `board.add-circle`, `board.delete-selected`, etc.). Use a `ShortcutHandler`
  from `@/lib/commands` to wire them to keyboard.
- **Accessibility**: the canvas has `role="application"` and an `aria-label`
  describing the interaction model. Individual items are not keyboard-
  focusable as separate elements; use arrow keys to nudge the selection.
- **Theming**: override `--board-focus-ring` (the canvas `:focus-visible`
  inset shadow color).

---

## Related Components

- [Smart Context Menu](../smart-context-menu/SKILL.md) — for right-click
  menus on board items (align, distribute, delete, etc.).
- [Smart Tooltip](../smart-tooltip/SKILL.md) — for tooltips on toolbar
  buttons that control the board.
- [Commands](../../commands/SKILL.md) — the command registry that the board
  registers its commands with.
