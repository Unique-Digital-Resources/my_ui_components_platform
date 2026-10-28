# AGENT.md — Toggle Group

Contribution guide for `src/lib/components/toggle-group/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ToggleGroup** — a group of toggle buttons with selectable state, closable
buttons, drag-to-reorder, and dynamic add/remove. DOM-based (no canvas).
Each item is a real `<button>` with `aria-pressed`. Buttons mimic the
CustomButton look (primary / secondary / outline variants, icon + text
support) but ToggleGroup does NOT import CustomButton — it's self-contained.

## File Structure

```
src/lib/components/toggle-group/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── toggle-group.ts     ← the ToggleGroup class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types
```

## Architecture

The class creates a root `<div class="toggle-group" role="group">` and
populates it with `<button class="toggle-group__item">` elements. Each item
has up to three children: an optional icon (`<svg class="toggle-group__icon">`
or `<img class="toggle-group__icon">`), a label span, and an optional close
button (`<button class="toggle-group__close">`).

### Internal item model

```ts
interface InternalItem {
  id: string;          // user-provided or auto-generated
  label: string;
  icon?: string;       // built-in name | data URI | raw <svg> string
  selected: boolean;
  el: HTMLElement;     // the <button>
  closeEl: HTMLElement | null;
  labelEl: HTMLElement;
  iconEl: HTMLElement | null;
}
```

Items are kept in an array; the DOM order matches the array order. Adding,
removing, and reordering all mutate the array and then re-append the
elements in array order (cheap — the elements themselves are preserved,
only their position changes).

### Selection model

- `multiselect: false` (default) — single-select. Clicking an item selects
  it and deselects all others. Clicking the selected item deselects it
  (optional toggle-off behavior).
- `multiselect: true` — multi-select. Each item toggles independently.

`setSelected(ids)` accepts an array of IDs and sets the selection
accordingly. `getSelected()` returns the array of selected IDs.

### Closable items

When `closable: true`, each item renders a small close button (X icon) on
the right. Clicking the close button fires the `close` event with the
item's ID and removes the item from the group. The close button stops
event propagation so the item itself doesn't toggle when the close button
is clicked.

### Drag-to-reorder

When `reorderable: true`:

1. `pointerdown` on an item starts a potential drag — `dragState` is
   initialized with `started: false`.
2. `pointermove` beyond a 4px threshold sets `started: true` and adds the
   `--dragging` class (item becomes semi-transparent with a drop shadow).
3. While dragging, the item's position is swapped with adjacent items as
   the pointer crosses their midpoints.
4. `pointerup` commits the new order, fires the `reorder` event with the
   new item array, and sets `suppressClickUntil` to suppress the synthetic
   click that follows the pointerup.
5. If the pointer never moved beyond the threshold, no drag is started and
   the click proceeds normally (toggling the item).

The `pointermove` and `pointerup` listeners are attached to `window` (not
the item) so drags continue outside the group.

### Built-in icons

`BUILTIN_ICONS` is a `Record<string, string>` of full `<svg>` markup (not
just inner content — the wrapper is included). Curated set: `check`, `x`,
`plus`, `star`, `circle`, `square`, `heart`, `bolt`, `dot`, `arrow-right`,
`settings`, `folder`, `file`, `user`, `tag`, `eye`, `bell`, `search`,
`home`, `bold`, `italic`, `underline`.

`renderIcon(icon)` accepts:
- a built-in name → returns the cached `<svg>`
- a `data:...` URI → returns an `<img>`
- a raw `<svg...>` string → returns it with the `toggle-group__icon` class
  injected

### Events

The class emits four events:

| Event      | Payload                                  | When                                          |
|------------|------------------------------------------|-----------------------------------------------|
| `change`   | `{ items, selected }`                    | Selection changed (click or `setSelected`).   |
| `select`   | `{ id, selected }`                       | A single item's selection toggled.            |
| `reorder`  | `{ items }`                              | Items reordered via drag.                     |
| `close`    | `{ id }`                                 | An item's close button clicked.               |

## How to Extend / Modify

- **Add a built-in icon**: add an entry to `BUILTIN_ICONS` (full `<svg>`
  markup with `class="toggle-group__icon"`).
- **Add a variant**: add a `.toggle-group__item[data-variant="..."]` block
  in `injectStyles`. Extend the `ToggleGroupVariant` type.
- **Add a size**: add a `.toggle-group__item[data-size="..."]` block.
  Extend the `ToggleGroupSize` type.
- **Change the drag threshold**: edit the `4` in the `pointermove` handler.
  Higher = less sensitive (fewer accidental drags); lower = more sensitive.
- **Add a "add" button**: not built-in. The host can render a separate
  CustomButton next to the group and call `addItem(...)` on click.

## Known Issues & TODOs

- The drag reorder uses pointer midpoint hit-testing, which can feel "jumpy"
  on items of very different widths. A smoother animation would require
  FLIP-style transitions.
- The `suppressClickUntil` mechanism uses a timestamp; if the system clock
  jumps backward (rare), the suppression could fail and a drag could end
  with an unwanted toggle.
- The close button's `X` icon is hardcoded; there's no option to customize
  it. A `closeIcon` option could be added.
- The `change` event fires on every selection change, including programmatic
  `setSelected`. Some hosts may want to distinguish user-initiated vs
  programmatic changes; the event payload doesn't currently include a
  `source` field.
- No max-items limit — the group will grow indefinitely as items are added.
- The default items are `Bold` / `Italic` / `Underline` (text formatting
  toggles). Override with `items: [...]` in the constructor.

## Files This Component Touches

- React wrapper: `src/components/toggle-group/toggle-group-react.tsx`
- Playground: `src/components/toggle-group/toggle-group-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"toggle-group"`)
- No built-in commands (the toggle group doesn't register keyboard
  shortcuts).
