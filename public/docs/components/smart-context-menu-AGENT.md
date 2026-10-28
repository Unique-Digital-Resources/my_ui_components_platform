# AGENT.md — Smart Context Menu

Contribution guide for `src/lib/components/smart-context-menu/`. For usage,
see [SKILL.md](./SKILL.md).

---

## Component

**SmartContextMenu** — a context menu overlay that renders command items
from the command registry, with smart positioning bounded by a container
element. Each menu item renders a command's label, optional icon, and
optional keyboard shortcut (as `<kbd>` elements). The menu auto-positions
on show to stay within a bounds element: if it would overflow right, it
flips left; if it would overflow bottom, it flips up. Disabled commands are
visually muted and not clickable.

This component depends on the command registry at
`@/lib/commands` — it does not accept item arrays directly. You pass it
command IDs and it looks up the metadata.

## File Structure

```
src/lib/components/smart-context-menu/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── smart-context-menu.ts  ← the SmartContextMenu class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types
```

## Architecture

DOM-based overlay. The menu is a `<div class="smart-context-menu" role="menu">`
appended to the container. It's positioned absolutely within the container
(which is forced to `position: relative` if it was `static`; the original
value is restored on `destroy()`).

The menu contains an optional header (title) and a `<ul>` of items. Each
item is a `<li role="menuitem">` with an optional icon, a label, and an
optional shortcut (`<kbd>` badges).

### Command lookup

On `show(x, y)` and on `setCommandIds(ids)`, the menu queries
`commandRegistry.byIds(this.commandIds)` to resolve the command metadata.
Each command becomes a menu item:

- `label` → the item's text.
- `icon` → looked up in `BUILTIN_ICONS` (Lucide-style inner SVG); rendered
  as a full `<svg>` with `stroke="currentColor"`.
- `shortcut` → `shortcutParts(shortcut)` returns an array of modifier
  symbols + the key; each part becomes a `<kbd>`.
- `disabled` → the item gets `aria-disabled="true"` and a `--disabled` class;
  clicks are suppressed.

A command ID that's not in the registry is silently skipped (no menu item
rendered).

### Smart positioning

`show(x, y)` places the menu's top-left at `(x, y)` relative to the
container, then flips if it would overflow the `bounds` element:

1. Measure the menu's bounding rect and the bounds' bounding rect.
2. If `x + menuW > bounds.right - MENU_GAP`, flip horizontally:
   `x = bounds.right - menuW - MENU_GAP` (clamped to `bounds.left + MENU_GAP`).
3. If `y + menuH > bounds.bottom - MENU_GAP`, flip vertically:
   `y = bounds.bottom - menuH - MENU_GAP` (clamped to `bounds.top + MENU_GAP`).
4. Also clamp `x >= bounds.left + MENU_GAP` and `y >= bounds.top + MENU_GAP`
   so the menu never escapes the bounds on the near side either.

`MENU_GAP = 4` px.

### Keyboard navigation

- `ArrowDown` / `ArrowUp` — move the active item (skipping disabled items).
- `Enter` / `Space` — invoke the active item.
- `Escape` — hide the menu (fires `hide` event).
- `Home` / `End` — jump to the first / last enabled item.

The active item is tracked by `activeIndex`; the `--active` class applies
the lemon accent and a subtle background.

### Document pointerdown (outside click)

A `pointerdown` listener on `document` hides the menu if the click is
outside the menu element. The listener is added on `show()` and removed on
`hide()`.

### Container position override

If the container has `position: static`, the menu (which is
`position: absolute`) would resolve against the wrong ancestor. The
constructor saves the original `position` value and sets it to `relative`;
`destroy()` restores it. The `didOverrideContainerPosition` flag tracks
whether the override happened.

## How to Extend / Modify

- **Add an icon**: add an entry to `BUILTIN_ICONS` (inner SVG markup; the
  `<svg>` wrapper is added by `getIconSvg`).
- **Add a submenu**: not currently supported. A future enhancement could
  nest a `SmartContextMenu` inside an item with `aria-haspopup="menu"`.
- **Custom item rendering**: the items are built in `renderItems`. To
  support non-command items (e.g. a "separator" or a custom action), extend
  the command registry or add a parallel `items` option.
- **Animation**: the menu appears/disappears instantly. CSS transitions on
  `opacity` / `transform` could be added in `injectStyles`.
- **Position strategy**: the current strategy is "flip and clamp within
  bounds". An alternative would be "anchor to a target element" (like
  SmartTooltip). Could be added as an option.

## Known Issues & TODOs

- The menu is appended to the container, not to `document.body`. If the
  container has `overflow: hidden`, the menu may be clipped. Hosts should
  ensure the container can display overflow, or move the menu to `body`
  (would require recomputing positions relative to the viewport).
- The `document` `pointerdown` listener is added on every `show()` and
  removed on every `hide()`. If `show()` is called while already visible,
  the listener is added twice (mitigated by the `visible` guard, but worth
  noting).
- No submenu support. Items with children must be modeled as separate
  menus shown on hover/click.
- The `title` header is rendered but doesn't have a close button. Users
  press Escape or click outside to close.
- The menu doesn't reposition on window resize or scroll while visible.
  A future enhancement could re-position (or hide) on those events.

## Files This Component Touches

- React wrapper: `src/components/smart-context-menu/smart-context-menu-react.tsx`
- Playground: `src/components/smart-context-menu/smart-context-menu-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"smart-context-menu"`)
- Depends on: `@/lib/commands` (registry + shortcuts utilities).
- No built-in commands of its own (it renders commands registered by other
  components).
