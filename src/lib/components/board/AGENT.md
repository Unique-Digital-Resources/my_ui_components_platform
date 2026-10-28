# AGENT.md — Board

Contribution guide for `src/lib/components/board/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Board** — an infinite canvas component for apps like Excalidraw, node
graphs, and vector art. Features: infinite pan/zoom, grid system (dots /
lines / none) with sub-grid divisions, snap to grid and snap to items,
board items (circle / rectangle / triangle), single + multi (rubber-band)
selection, per-item local lattice (rotated bounding box) and global lattice
(AABB), align / distribute / fit commands, per-item pivot with 9 selection
pivot positions, global / local transform modes, rotation + 8 resize
handles, lattice display modes (local / global / both).

This is the largest and most complex component in the library.

## File Structure

```
src/lib/components/board/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── board.ts            ← the Board class (canvas + interaction + commands)
└── index.ts            ← barrel: class, types
```

## Architecture

Single `<canvas>` renderer. The canvas fills the container; the container
must have a fixed size. The board renders:

1. **Background** — solid fill (`options.background`, default `"#15151a"`).
2. **Grid** — dots (small filled circles at each grid intersection) or lines
   (vertical + horizontal lines per grid cell), with optional sub-grid
   divisions (lighter lines/dots between major grid lines). Rendered in
   screen space (not cached — re-rendered every frame because pan/zoom
   changes the visible grid).
3. **Items** — each item is filled with its `color` and outlined with a
   selection-color border if selected. Items are drawn in board space
   (translated by `view.panX/panY`, scaled by `view.zoom`).
4. **Selection lattice** — the selection's bounding box (local for single
   items, AABB for multi), drawn as a dashed rectangle.
5. **Handles** — 8 resize handles (one per corner + one per edge midpoint)
   on the global AABB, plus a rotation handle offset above the top edge.
   Drawn in screen space (constant on-screen size regardless of zoom).
6. **Pivot crosshair** — the selection pivot position (one of 9 positions),
   drawn as a small crosshair.

### View model

```ts
interface BoardView {
  panX: number;    // board units; screen_x = (board_x - panX) * zoom + canvas_w/2
  panY: number;
  zoom: number;    // 1 = 100%
}
```

Pan/zoom is via the wheel: scroll = pan (Shift = horizontal), Ctrl/Cmd+scroll
= zoom toward the cursor. Space+drag or middle-click = pan. The view is
clamped to a reasonable zoom range (`[0.05, 8]`).

### Item model

```ts
interface BoardItem {
  id: string;
  type: "circle" | "rect" | "triangle";
  x: number; y: number;       // center in board coords
  width: number; height: number;  // can be negative (flipped)
  rotation: number;           // degrees
  color: string;
  selected: boolean;
  pivotX: number; pivotY: number;  // 0-1, relative to bounding box
  minWidth?; minHeight?; maxWidth?; maxHeight?: number;
}
```

Items are stored in a `Map<string, BoardItem>`. Selection is a
`Set<string>` (`selectedIds`). The `selected` boolean on the item is a
cached mirror of `selectedIds.has(id)` — kept in sync but the `Set` is the
source of truth.

### Lattices

Two lattice concepts per item:

- **Local lattice** — the item's rotated bounding box. `rotation` matches
  the item. Center = `(item.x, item.y)`, dimensions = `|width| × |height|`.
- **Global lattice** — the axis-aligned bounding box (AABB) of the rotated
  rect. `rotation = 0`. For unrotated items, this is the same as local.
  Computed as:
  ```
  aw = |width|, ah = |height|
  rad = rotation * π / 180
  w = aw * |cos(rad)| + ah * |sin(rad)|
  h = aw * |sin(rad)| + ah * |cos(rad)|
  ```

The selection lattice is:
- **Single item** — that item's local lattice (rotated).
- **Multi-selection** — the AABB enclosing all selected items' global
  lattices (rotation 0).

The global AABB is used for resize handles and resize math. The local
lattice is used for the rotation handle and for the `local` transform mode.

### Pivot

Each item has a `pivotX`/`pivotY` (0-1, relative to its bounding box). The
selection pivot is one of 9 named positions (`center`, `top-left`,
`top-center`, etc.) that maps to a `(pivotX, pivotY)` pair on the selection
lattice. The pivot is the fixed point during rotate/resize.

### Pointer state machine

`pointerState.mode` is one of `"pan" | "select" | "drag" | "rotate" | "resize" | "none"`.

- `pan` — Space+drag or middle-click drag.
- `select` — Rubber-band selection (click empty space and drag).
- `drag` — Move selected items.
- `rotate` — Rotation handle drag.
- `resize` — Resize handle drag.

`startItems` is a `Map<id, BoardItem>` snapshot at gesture start; resize and
rotate operations apply transforms relative to this snapshot (not the live
item), so dragging is smooth and reversible.

### Align / distribute / fit commands

- `align(type)` — aligns all selected items' global lattices to one edge
  (left/center-h/right/top/center-v/bottom) of the selection AABB.
- `distribute(type)` — distributes selected items evenly along the
  horizontal or vertical axis, based on their global lattice centers.
- `zoomToFit()` / `zoomToFitSelection()` — fits the view to all items or to
  the selection.

These are exposed as methods (so the host can wire them to buttons) AND as
commands in the registry (`board.align-left`, `board.distribute-h`,
`board.fit-all`, etc.) so they can be invoked via keyboard shortcuts.

### Transform modes

- `global` (default) — resize handles are on the global AABB. Rotating an
  item still uses the AABB for resize math, which is what causes the known
  drift issue (see below).
- `local` — resize handles are on the local lattice (rotated bounding box).
  Resize happens in the item's local frame.

`latticeDisplay` controls which lattice is drawn: `local`, `global`, or
`both`.

## Key Algorithms & Math

### Coordinate transforms

```
screen_x = (board_x - view.panX) * view.zoom + canvas.width / 2
screen_y = (board_y - view.panY) * view.zoom + canvas.height / 2
```

Inverse:
```
board_x = (screen_x - canvas.width / 2) / view.zoom + view.panX
board_y = (screen_y - canvas.height / 2) / view.zoom + view.panY
```

### Rotation around a pivot

To rotate a point `P` around a pivot `C` by `angle` (degrees):

```
dx = P.x - C.x
dy = P.y - C.y
rad = angle * π / 180
P'.x = C.x + dx * cos(rad) - dy * sin(rad)
P'.y = C.y + dx * sin(rad) + dy * cos(rad)
```

`rotateSelected(degrees)` rotates each selected item's center around the
selection pivot by `degrees`, and adds `degrees` to each item's `rotation`.

### Resize math (the known issue)

Resize handles are on the **global AABB** (rotation=0), so the math is
"straightforward — no rotation conversion needed" for the AABB itself. The
opposite edge of the AABB stays fixed while the dragged handle moves. Scale
factors are computed from the AABB:

```
sx = newW / aabb.w
sy = newH / aabb.h
```

These scale factors are then applied to each selected item. For unrotated
items, this works perfectly. For rotated items, the item's AABB width is
`|w·cos(θ)| + |h·sin(θ)|` — NOT proportional to `w` alone. So scaling the
item's position by `sx` and then scaling the item's width by `sx` produces
an item whose new AABB doesn't match the handle position → the item drifts.

The current fix:
1. Compute the new item dimensions: `newItemW = |start.width| * sx`,
   `newItemH = |start.height| * sy`.
2. Compute the new AABB dimensions for that item (with new w/h, same
   rotation): `newItemAabbW = newItemW * cos + newItemH * sin`, etc.
3. Compute the start AABB dimensions and edges for the item.
4. The item's AABB offset from the fixed selection edge at start; scale
   this offset by `sx` to get the new offset; position the item center so
   the item's AABB edge maintains its proportional offset from the fixed
   selection edge.

This works for the AABB edges but small drift can still occur during
continuous drag because the AABB-to-item-center mapping is non-linear in
rotation. See "Known Issues" below.

## How to Extend / Modify

- **Add a shape type**: extend `ShapeType`, add a `drawItem<Shape>` method,
  add the shape to the `addItem` switch and the hit-test switch.
- **Add an align mode**: extend `AlignType`, add a branch in `align()`.
- **Add a transform mode**: extend `TransformMode`, add a branch in
  `applyResize` / `rotateSelected`.
- **Add a lattice display mode**: extend `LatticeDisplay`, add a branch in
  `renderLattice`.
- **Change the grid**: edit `renderGridDots` / `renderGridLines`. The grid
  is in board space (so it scales with zoom); sub-grid divisions are drawn
  at `gridSize / subGridDivisions` intervals.
- **Change the snap behavior**: edit `snapPoint`. Currently snap-to-grid
  snaps to the nearest grid intersection; snap-to-items snaps to the
  nearest item edge / center.
- **Fix the resize drift**: see Known Issues below. The most robust fix is
  to track the item's corner positions in board space directly (rather than
  computing the AABB and back-mapping), so the resize math is exact for any
  rotation.

## Known Issues & TODOs

- **Board's items resizing displacement at non-0 rotation** — the AABB-based
  resize math doesn't perfectly maintain item position when items are
  rotated. The current approach computes new AABB dimensions and positions
  the item center from the new AABB, but small drift can still occur during
  continuous drag. Needs a more robust approach, possibly tracking the
  item's corner positions in board space directly. The `applyResize` method
  (around line 1030 in `board.ts`) is where the fix would go. The key
  insight in the current code's comments: "when an item is rotated, its
  AABB width is `|w·cos(θ)| + |h·sin(θ)|` — NOT proportional to `w` alone."
  A robust fix would track each item's four corners in board space at
  gesture start, apply the scale factor to the dragged corner relative to
  the fixed corner, and recompute the item's center / width / height /
  rotation from the new corner positions.
- The `select` (rubber-band) mode only selects items whose center is inside
  the rubber-band rect. An "intersect" mode (select items that touch the
  rect) would be more familiar to Figma/Excalidraw users.
- The grid is re-rendered every frame because it depends on pan/zoom. For
  very large grids at low zoom, this can be slow. A tile-based grid cache
  would help.
- `zoomToFit` and `zoomToFitSelection` compute the bounding box of items
  but don't add padding — the items can touch the canvas edge. A 10% padding
  would be more comfortable.
- The rotation handle is always above the top edge of the AABB. For rotated
  items, "above the top edge" is in screen space, which can be confusing.
- Keyboard shortcuts (Delete to remove, arrow keys to nudge) are handled in
  `onKeyDown` but not all are documented. The command registry has the full
  list.

## Files This Component Touches

- React wrapper: `src/components/board/board-react.tsx`
- Playground: `src/components/board/board-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"board"`)
- Commands: `board.align-left`, `board.align-center-h`, `board.align-right`,
  `board.align-top`, `board.align-center-v`, `board.align-bottom`,
  `board.distribute-h`, `board.distribute-v`, `board.fit-all`,
  `board.fit-selection`, `board.add-circle`, `board.add-rect`,
  `board.add-triangle`, `board.delete-selected` in
  `src/lib/commands/index.ts`.
